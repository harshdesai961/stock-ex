import { Inject, Logger } from '@nestjs/common';
import {
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  roomCreateSchema,
  roomEmptySchema,
  roomJoinSchema,
  roomKickSchema,
  type Ack,
  type RoomJoined,
} from '@stock-ex/shared';
import { LIMITS, RateLimitService } from '../realtime/rate-limit.js';
import { badRequest, type GameServer, type GameSocket } from '../realtime/socket.gateway.js';
import { ChatStore } from './chat-store.js';
import * as rules from './room-rules.js';
import { newMemberId, newRoomCode, RoomStore } from './room-store.js';

/** The Socket.IO room every member of a lobby is in; broadcasts go here. */
export const roomChannel = (code: string) => `room:${code}`;
const BAD_PAYLOAD = 'That message wasn’t in the expected format.';
const NOT_IN_ROOM: Ack<never> = {
  ok: false,
  error: { code: 'not_found', message: 'You aren’t in a room.' },
};

/**
 * Room lobby events (spec 6): create, join by code, take a seat or watch, leave, kick.
 * Identity always comes from `socket.data.identity` (set by the auth middleware); payloads
 * only ever name a room code or an opaque member id.
 */
@WebSocketGateway()
export class RoomGateway implements OnGatewayDisconnect<GameSocket> {
  private readonly logger = new Logger(RoomGateway.name);
  @WebSocketServer() private readonly server!: GameServer;

  constructor(
    @Inject(RoomStore) private readonly store: RoomStore,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
    @Inject(ChatStore) private readonly chat: ChatStore,
  ) {}

  @SubscribeMessage('room:create')
  async create(socket: GameSocket, payload: unknown): Promise<Ack<RoomJoined>> {
    const input = parse(roomCreateSchema, payload);
    if (!input) return badRequest(BAD_PAYLOAD);
    const { identity } = socket.data;
    if (!(await this.limits.allow(`room:create:${identity.id}`, LIMITS.roomsPerUser))) {
      return {
        ok: false,
        error: { code: 'rate_limited', message: 'You’ve made a lot of rooms. Wait a minute.' },
      };
    }
    await this.leaveCurrent(socket);
    for (let attempt = 0; attempt < 5; attempt++) {
      const room = rules.newRoom(newRoomCode(), identity, input.settings, newMemberId());
      if (await this.store.create(room)) return this.enter(socket, room);
    }
    this.logger.error('could not find a free room code');
    return { ok: false, error: { code: 'internal', message: 'Couldn’t open a room. Try again.' } };
  }

  @SubscribeMessage('room:join')
  async join(socket: GameSocket, payload: unknown): Promise<Ack<RoomJoined>> {
    const input = parse(roomJoinSchema, payload);
    if (!input) return badRequest('Check the room code and try again.');
    if (socket.data.roomCode !== input.code) await this.leaveCurrent(socket);
    const outcome = await this.store.update(input.code, (room) =>
      rules.join(room, socket.data.identity, input.as, newMemberId()),
    );
    return outcome.ok && outcome.room ? this.enter(socket, outcome.room) : failure(outcome);
  }

  @SubscribeMessage('room:takeSeat')
  takeSeat(socket: GameSocket, payload: unknown) {
    return this.change(socket, payload, rules.takeSeat);
  }

  @SubscribeMessage('room:spectate')
  spectate(socket: GameSocket, payload: unknown) {
    return this.change(socket, payload, rules.spectate);
  }

  @SubscribeMessage('room:leave')
  async leave(socket: GameSocket, payload: unknown): Promise<Ack<null>> {
    if (!parse(roomEmptySchema, payload)) return badRequest(BAD_PAYLOAD);
    if (!socket.data.roomCode) return NOT_IN_ROOM;
    await this.leaveCurrent(socket);
    return { ok: true, data: null };
  }

  @SubscribeMessage('room:kick')
  async kick(socket: GameSocket, payload: unknown): Promise<Ack<null>> {
    const input = parse(roomKickSchema, payload);
    if (!input) return badRequest(BAD_PAYLOAD);
    const code = socket.data.roomCode;
    if (!code) return NOT_IN_ROOM;
    const outcome = await this.store.update(code, (room) =>
      rules.kick(room, socket.data.identity.id, input.memberId),
    );
    if (!outcome.ok) return failure(outcome);
    if (outcome.removed) await this.evict(code, outcome.removed.identityId);
    this.broadcast(code, outcome.room);
    return { ok: true, data: null };
  }

  async handleDisconnect(socket: GameSocket) {
    const code = socket.data.roomCode;
    if (!code) return;
    // Another tab of the same person may still be connected to this room.
    const others = await this.server.in(roomChannel(code)).fetchSockets();
    if (others.some((s) => s.id !== socket.id && s.data.identity.id === socket.data.identity.id)) {
      return;
    }
    const outcome = await this.store.update(code, (room) =>
      rules.disconnect(room, socket.data.identity.id),
    );
    if (outcome.ok) this.broadcast(code, outcome.room);
  }

  private async change(
    socket: GameSocket,
    payload: unknown,
    rule: (room: rules.RoomState, identityId: string) => rules.Outcome,
  ): Promise<Ack<RoomJoined>> {
    if (!parse(roomEmptySchema, payload)) return badRequest(BAD_PAYLOAD);
    const code = socket.data.roomCode;
    if (!code) return NOT_IN_ROOM;
    const outcome = await this.store.update(code, (room) => rule(room, socket.data.identity.id));
    return outcome.ok && outcome.room ? this.enter(socket, outcome.room) : failure(outcome);
  }

  /** Puts the socket in the room's channel, tells everyone, and replies with the caller's place. */
  private async enter(socket: GameSocket, room: rules.RoomState): Promise<Ack<RoomJoined>> {
    await socket.join(roomChannel(room.code));
    socket.data.roomCode = room.code;
    this.broadcast(room.code, room);
    const joined = rules.joinedAs(room, socket.data.identity.id);
    if (!joined) return NOT_IN_ROOM;
    return { ok: true, data: { ...joined, chat: await this.chat.history(room.code) } };
  }

  private async leaveCurrent(socket: GameSocket) {
    const code = socket.data.roomCode;
    if (!code) return;
    socket.data.roomCode = undefined;
    await socket.leave(roomChannel(code));
    const outcome = await this.store.update(code, (room) =>
      rules.leave(room, socket.data.identity.id),
    );
    if (outcome.ok) this.broadcast(code, outcome.room);
  }

  /** Removes every socket of a kicked person, on any server instance. */
  private async evict(code: string, identityId: string) {
    const sockets = await this.server.in(roomChannel(code)).fetchSockets();
    for (const s of sockets.filter((s) => s.data.identity.id === identityId)) {
      s.emit('room:removed', { reason: 'kicked' });
      s.leave(roomChannel(code));
      s.data.roomCode = undefined;
    }
  }

  /** Tells the room about a change; a closed room (null) also loses its chat history. */
  private broadcast(code: string, room: rules.RoomState | null) {
    if (room) this.server.to(roomChannel(code)).emit('room:state', rules.view(room));
    else void this.chat.clear(code).catch(() => undefined);
  }
}

/** Any Zod schema from @stock-ex/shared; typed structurally so the server needn't depend on zod. */
interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

function parse<T>(schema: Schema<T>, payload: unknown): T | null {
  const result = schema.safeParse(payload ?? {});
  return result.success ? result.data : null;
}

function failure(outcome: rules.Outcome): Ack<never> {
  return outcome.ok ? NOT_IN_ROOM : { ok: false, error: outcome.error };
}
