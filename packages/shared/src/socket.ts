import { z } from 'zod';
import { chatReportSchema, chatSendSchema, type ChatMessage } from './chat.js';
import {
  roomCreateSchema,
  roomEmptySchema,
  roomJoinSchema,
  roomKickSchema,
  type RoomJoined,
  type RoomView,
} from './room.js';

// Socket contracts shared by the game server and the browser (spec 6). Every event a client
// sends is Zod-checked on the server; every reply uses the same acknowledgement shape.
// Room, game and chat events are added here slice by slice.

/** WebSocket only: no long-polling fallback, so several servers need no sticky sessions. */
export const SOCKET_TRANSPORTS = ['websocket'] as const;
/** Largest message the server accepts (spec 12.2: small maxHttpBufferSize). */
export const SOCKET_MAX_MESSAGE_BYTES = 16 * 1024;

/**
 * Why the server refused a connection, sent as `connect_error.data.code`.
 * "expired": fetch a new token from /api/socket-token and reconnect.
 * "rate_limited": wait a minute. The others: stop retrying.
 */
export const connectRefusalSchema = z.enum(['bad_origin', 'expired', 'invalid', 'rate_limited']);
export type ConnectRefusal = z.infer<typeof connectRefusalSchema>;

export const socketErrorCodeSchema = z.enum([
  'bad_request',
  'rate_limited',
  'forbidden',
  'not_found',
  /** The request clashes with the room as it is now: seats full, name taken, already there. */
  'conflict',
  'internal',
]);
export type SocketErrorCode = z.infer<typeof socketErrorCodeSchema>;

export interface SocketError {
  code: SocketErrorCode;
  /** Plain-language text that is safe to show to the player. */
  message: string;
}

/** Every acknowledgement: either the result or a typed error, never a thrown exception. */
export type Ack<T> = { ok: true; data: T } | { ok: false; error: SocketError };

export const presencePingSchema = z.object({}).strict();
export interface PresencePong {
  /** Server clock in ms, so the browser can line its countdowns up with the server's timers. */
  serverTime: number;
}

/** Client → server events, each with its payload schema. */
export const clientEvents = {
  'presence:ping': presencePingSchema,
  'room:create': roomCreateSchema,
  'room:join': roomJoinSchema,
  'room:takeSeat': roomEmptySchema,
  'room:spectate': roomEmptySchema,
  'room:leave': roomEmptySchema,
  'room:kick': roomKickSchema,
  'chat:send': chatSendSchema,
  'chat:report': chatReportSchema,
} as const;
export type ClientEvent = keyof typeof clientEvents;

/** Server → client events. `error` reports problems that have no acknowledgement to ride on. */
export interface ServerToClientEvents {
  error: (error: SocketError) => void;
  /** The room changed; sent to everyone in it. */
  'room:state': (room: RoomView) => void;
  /** You are no longer in the room (kicked, or the room closed). */
  'room:removed': (reason: { reason: 'kicked' | 'closed' }) => void;
  /** A new chat message in your room. */
  'chat:message': (message: ChatMessage) => void;
}

type Handler<E extends ClientEvent, R> = (
  payload: z.input<(typeof clientEvents)[E]>,
  ack: (reply: Ack<R>) => void,
) => void;

export interface ClientToServerEvents {
  'presence:ping': Handler<'presence:ping', PresencePong>;
  'room:create': Handler<'room:create', RoomJoined>;
  'room:join': Handler<'room:join', RoomJoined>;
  'room:takeSeat': Handler<'room:takeSeat', RoomJoined>;
  'room:spectate': Handler<'room:spectate', RoomJoined>;
  'room:leave': Handler<'room:leave', null>;
  'room:kick': Handler<'room:kick', null>;
  'chat:send': Handler<'chat:send', ChatMessage>;
  'chat:report': Handler<'chat:report', null>;
}
