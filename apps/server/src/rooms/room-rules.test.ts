import type { SocketIdentity } from '@stock-ex/shared/socket-token';
import { describe, expect, it } from 'vitest';
import {
  disconnect,
  join,
  joinedAs,
  kick,
  leave,
  newRoom,
  spectate,
  takeSeat,
  view,
  type Outcome,
  type RoomState,
} from './room-rules.js';

const SETTINGS = { maxSeats: 2, visibility: 'private', accountsOnly: false } as const;
const asha: SocketIdentity = { kind: 'user', id: 'usr_asha', name: 'Asha' };
const ravi: SocketIdentity = { kind: 'user', id: 'usr_ravi', name: 'Ravi' };
const guest = (n: number, name = `Guest${n}`): SocketIdentity => ({
  kind: 'guest',
  id: `g_${String(n).padStart(22, 'x')}`,
  name,
});

let ids = 0;
const mid = () => `m_${String(++ids).padStart(12, '0')}`;

function ok(outcome: Outcome): RoomState {
  if (!outcome.ok) throw new Error(`expected ok, got ${outcome.error.code}`);
  if (!outcome.room) throw new Error('room closed');
  return outcome.room;
}
const errorCode = (outcome: Outcome) => (outcome.ok ? 'ok' : outcome.error.code);

const fresh = () => newRoom('AB2CD', asha, SETTINGS, mid());

describe('room rules', () => {
  it('seats the creator as host and fills seats in order', () => {
    const room = ok(join(fresh(), ravi, 'player', mid()));
    const seats = view(room).seats;
    expect(seats.map((s) => s?.name)).toEqual(['Asha', 'Ravi']);
    expect(seats[0]?.isHost).toBe(true);
  });

  it('never shows account or guest ids to other clients', () => {
    const room = ok(join(fresh(), guest(1), 'spectator', mid()));
    expect(JSON.stringify(view(room))).not.toMatch(/usr_|g_x/);
  });

  it('offers spectating when the seats are full', () => {
    const room = ok(join(fresh(), ravi, 'player', mid()));
    expect(errorCode(join(room, guest(1), 'player', mid()))).toBe('conflict');
    expect(view(ok(join(room, guest(1), 'spectator', mid()))).spectators).toHaveLength(1);
  });

  it('caps spectators at ten', () => {
    let room = fresh();
    for (let n = 1; n <= 10; n++) room = ok(join(room, guest(n), 'spectator', mid()));
    expect(errorCode(join(room, guest(11), 'spectator', mid()))).toBe('conflict');
  });

  it('keeps names unique at the table, ignoring case', () => {
    expect(errorCode(join(fresh(), guest(1, 'ASHA'), 'spectator', mid()))).toBe('conflict');
  });

  it('lets guests watch but not sit at an accounts-only table', () => {
    const room = newRoom('AB2CD', asha, { ...SETTINGS, accountsOnly: true }, mid());
    expect(errorCode(join(room, guest(1), 'player', mid()))).toBe('forbidden');
    const watching = ok(join(room, guest(1), 'spectator', mid()));
    expect(errorCode(takeSeat(watching, guest(1).id))).toBe('forbidden');
  });

  it('gives a returning identity its old place, marked connected', () => {
    const room = ok(join(fresh(), ravi, 'player', mid()));
    const away = ok(disconnect(room, ravi.id));
    expect(view(away).seats[1]?.connected).toBe(false);
    const back = ok(join(away, ravi, 'spectator', mid()));
    expect(joinedAs(back, ravi.id)?.you.role).toBe('player');
    expect(view(back).seats[1]?.connected).toBe(true);
  });

  it('moves between seat and spectators', () => {
    const room = ok(join(fresh(), ravi, 'player', mid()));
    const watching = ok(spectate(room, ravi.id));
    expect(view(watching).seats[1]).toBeNull();
    expect(view(ok(takeSeat(watching, ravi.id))).seats[1]?.name).toBe('Ravi');
  });

  it('removes a spectator who disconnects', () => {
    const room = ok(join(fresh(), guest(1), 'spectator', mid()));
    expect(view(ok(disconnect(room, guest(1).id))).spectators).toHaveLength(0);
  });

  it('hands the host role to the next connected player, then closes the empty room', () => {
    let room = ok(join(fresh(), guest(1), 'spectator', mid()));
    room = ok(join(room, ravi, 'player', mid()));
    room = ok(leave(room, asha.id));
    expect(view(room).seats[1]).toMatchObject({ name: 'Ravi', isHost: true });
    room = ok(leave(room, ravi.id));
    expect(view(room).spectators[0]?.isHost).toBe(true);
    const last = leave(room, guest(1).id);
    expect(last.ok && last.room).toBeNull();
  });

  it('lets only the host kick, and not themselves', () => {
    const room = ok(join(fresh(), ravi, 'player', mid()));
    const raviId = joinedAs(room, ravi.id)?.you.memberId ?? '';
    const ashaId = joinedAs(room, asha.id)?.you.memberId ?? '';
    expect(errorCode(kick(room, ravi.id, ashaId))).toBe('forbidden');
    expect(errorCode(kick(room, asha.id, ashaId))).toBe('bad_request');
    const kicked = kick(room, asha.id, raviId);
    expect(kicked.ok && kicked.removed?.identityId).toBe(ravi.id);
  });

  it('refuses actions from someone who is not in the room', () => {
    for (const outcome of [
      takeSeat(fresh(), 'usr_x'),
      spectate(fresh(), 'usr_x'),
      leave(fresh(), 'usr_x'),
    ]) {
      expect(errorCode(outcome)).toBe('not_found');
    }
  });
});
