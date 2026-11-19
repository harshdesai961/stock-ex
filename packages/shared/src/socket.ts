import { z } from 'zod';

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
} as const;
export type ClientEvent = keyof typeof clientEvents;

/** Server → client events. `error` reports problems that have no acknowledgement to ride on. */
export interface ServerToClientEvents {
  error: (error: SocketError) => void;
}

export interface ClientToServerEvents {
  'presence:ping': (
    payload: z.input<typeof presencePingSchema>,
    ack: (reply: Ack<PresencePong>) => void,
  ) => void;
}
