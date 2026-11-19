import {
  MAX_SPECTATORS,
  type RoomJoined,
  type RoomMemberView,
  type RoomRole,
  type RoomSettings,
  type RoomView,
  type SocketError,
} from '@stock-ex/shared';
import type { SocketIdentity } from '@stock-ex/shared/socket-token';

// Lobby rules as pure functions: no Redis, no sockets, no clock. The room store runs them one
// at a time per room, and the gateway turns their results into replies and broadcasts.

export interface Member {
  memberId: string;
  /** Account or guest id from the socket token. Never sent to other clients. */
  identityId: string;
  kind: SocketIdentity['kind'];
  name: string;
  role: RoomRole;
  /** 0-based seat for players; null for spectators. */
  seat: number | null;
  connected: boolean;
}

export interface RoomState {
  code: string;
  hostMemberId: string;
  settings: RoomSettings;
  members: Member[];
}

/** `room: null` means the last member left and the room should be deleted. */
export type Outcome =
  { ok: true; room: RoomState | null; removed?: Member } | { ok: false; error: SocketError };

const fail = (code: SocketError['code'], message: string): Outcome => ({
  ok: false,
  error: { code, message },
});
export const NOT_A_MEMBER = fail('not_found', 'You aren’t in that room any more.');

const players = (room: RoomState) => room.members.filter((m) => m.role === 'player');
const spectators = (room: RoomState) => room.members.filter((m) => m.role === 'spectator');
const findByIdentity = (room: RoomState, identityId: string) =>
  room.members.find((m) => m.identityId === identityId);

function freeSeat(room: RoomState): number | null {
  const taken = new Set(players(room).map((m) => m.seat));
  for (let seat = 0; seat < room.settings.maxSeats; seat++) if (!taken.has(seat)) return seat;
  return null;
}

/** Why `identity` may not sit down, or null if they may. */
function seatProblem(room: RoomState, kind: Member['kind']): Outcome | null {
  if (kind === 'guest' && room.settings.accountsOnly) {
    return fail('forbidden', 'This table is for logged-in players. Log in to play, or watch.');
  }
  if (freeSeat(room) === null)
    return fail('conflict', 'All seats are taken. You can watch instead.');
  return null;
}

function replace(room: RoomState, member: Member): RoomState {
  return {
    ...room,
    members: room.members.map((m) => (m.memberId === member.memberId ? member : m)),
  };
}

export function newRoom(
  code: string,
  host: SocketIdentity,
  settings: RoomSettings,
  memberId: string,
): RoomState {
  return {
    code,
    hostMemberId: memberId,
    settings,
    members: [
      {
        memberId,
        identityId: host.id,
        kind: host.kind,
        name: host.name,
        role: 'player',
        seat: 0,
        connected: true,
      },
    ],
  };
}

/** Joining again with the same identity (a refresh, a second tab) gets the same place back. */
export function join(
  room: RoomState,
  who: SocketIdentity,
  as: RoomRole,
  memberId: string,
): Outcome {
  const existing = findByIdentity(room, who.id);
  if (existing) return { ok: true, room: replace(room, { ...existing, connected: true }) };

  // Spec 8: names are unique at the table, ignoring case.
  const clash = room.members.some((m) => m.name.toLowerCase() === who.name.toLowerCase());
  if (clash) {
    return fail('conflict', `Someone here is already called ${who.name}. Pick another nickname.`);
  }

  let seat: number | null = null;
  if (as === 'player') {
    const problem = seatProblem(room, who.kind);
    if (problem) return problem;
    seat = freeSeat(room);
  } else if (spectators(room).length >= MAX_SPECTATORS) {
    return fail('conflict', 'This room already has the most spectators it allows.');
  }
  const member: Member = {
    memberId,
    identityId: who.id,
    kind: who.kind,
    name: who.name,
    role: as,
    seat,
    connected: true,
  };
  return { ok: true, room: { ...room, members: [...room.members, member] } };
}

export function takeSeat(room: RoomState, identityId: string): Outcome {
  const member = findByIdentity(room, identityId);
  if (!member) return NOT_A_MEMBER;
  if (member.role === 'player') return { ok: true, room };
  const problem = seatProblem(room, member.kind);
  if (problem) return problem;
  return { ok: true, room: replace(room, { ...member, role: 'player', seat: freeSeat(room) }) };
}

export function spectate(room: RoomState, identityId: string): Outcome {
  const member = findByIdentity(room, identityId);
  if (!member) return NOT_A_MEMBER;
  if (member.role === 'spectator') return { ok: true, room };
  if (spectators(room).length >= MAX_SPECTATORS) {
    return fail('conflict', 'This room already has the most spectators it allows.');
  }
  return { ok: true, room: replace(room, { ...member, role: 'spectator', seat: null }) };
}

/** Removes a member. A departing host hands over to the next connected player, by seat. */
function remove(room: RoomState, member: Member): Outcome {
  const members = room.members.filter((m) => m.memberId !== member.memberId);
  if (members.length === 0) return { ok: true, room: null, removed: member };
  let { hostMemberId } = room;
  if (hostMemberId === member.memberId) {
    const bySeat = [...members].sort(
      (a, b) =>
        Number(b.connected) - Number(a.connected) ||
        Number(b.role === 'player') - Number(a.role === 'player') ||
        (a.seat ?? Infinity) - (b.seat ?? Infinity),
    );
    hostMemberId = bySeat[0]?.memberId ?? hostMemberId;
  }
  return { ok: true, room: { ...room, hostMemberId, members }, removed: member };
}

export function leave(room: RoomState, identityId: string): Outcome {
  const member = findByIdentity(room, identityId);
  return member ? remove(room, member) : NOT_A_MEMBER;
}

export function kick(room: RoomState, byIdentityId: string, memberId: string): Outcome {
  const host = findByIdentity(room, byIdentityId);
  if (host?.memberId !== room.hostMemberId) {
    return fail('forbidden', 'Only the host can remove people from the room.');
  }
  const target = room.members.find((m) => m.memberId === memberId);
  if (!target) return fail('not_found', 'That person has already left.');
  if (target.memberId === host.memberId)
    return fail('bad_request', 'Use Leave to leave your own room.');
  return remove(room, target);
}

/**
 * A dropped connection: a player keeps their seat (so a refresh puts them back), a spectator
 * simply leaves. Taking over idle seats with bots arrives with the game engine.
 */
export function disconnect(room: RoomState, identityId: string): Outcome {
  const member = findByIdentity(room, identityId);
  if (!member) return NOT_A_MEMBER;
  if (member.role === 'spectator') return remove(room, member);
  return { ok: true, room: replace(room, { ...member, connected: false }) };
}

function memberView(room: RoomState, m: Member): RoomMemberView {
  return {
    memberId: m.memberId,
    name: m.name,
    kind: m.kind,
    isHost: m.memberId === room.hostMemberId,
    connected: m.connected,
  };
}

/** The public projection: identity ids stay on the server. */
export function view(room: RoomState): RoomView {
  const seats: RoomView['seats'] = Array.from({ length: room.settings.maxSeats }, () => null);
  for (const m of players(room)) if (m.seat !== null) seats[m.seat] = memberView(room, m);
  return {
    code: room.code,
    settings: room.settings,
    seats,
    spectators: spectators(room).map((m) => memberView(room, m)),
  };
}

/** The caller's place in the room; the gateway adds the chat history. */
export function joinedAs(room: RoomState, identityId: string): Omit<RoomJoined, 'chat'> | null {
  const member = findByIdentity(room, identityId);
  return member
    ? { room: view(room), you: { memberId: member.memberId, role: member.role } }
    : null;
}
