import { z } from 'zod';
import type { ChatMessage } from './chat.js';

// Room lobby contracts (spec 6, 10.4), shared by the game server and the browser.

/** No 0/O, 1/I/L or U/V lookalikes, so a code read aloud or off a screen is typed right. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;
export const MIN_SEATS = 2;
export const MAX_SEATS = 6;
export const MAX_SPECTATORS = 10;

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`), 'That isn’t a room code.');

/** Lobby settings. Game options (periods, turn timer, bots) join this when the engine lands. */
export const roomSettingsSchema = z
  .object({
    maxSeats: z.number().int().min(MIN_SEATS).max(MAX_SEATS).default(4),
    visibility: z.enum(['private', 'public']).default('private'),
    /** Spec 8: "Only logged-in users" – guests may still watch. */
    accountsOnly: z.boolean().default(false),
  })
  .strict();
export type RoomSettings = z.infer<typeof roomSettingsSchema>;

export const roleSchema = z.enum(['player', 'spectator']);
export type RoomRole = z.infer<typeof roleSchema>;

/** Opaque per-room handle for a member. Account and guest ids never leave the server. */
export const memberIdSchema = z.string().regex(/^m_[A-Za-z0-9_-]{12}$/);

export const roomCreateSchema = z.object({ settings: roomSettingsSchema.prefault({}) }).strict();
export const roomJoinSchema = z
  .object({ code: roomCodeSchema, as: roleSchema.default('player') })
  .strict();
export const roomEmptySchema = z.object({}).strict();
export const roomKickSchema = z.object({ memberId: memberIdSchema }).strict();

export interface RoomMemberView {
  memberId: string;
  name: string;
  kind: 'user' | 'guest';
  isHost: boolean;
  connected: boolean;
}

/** What every member and spectator of a room sees. Nothing in it is private to anyone. */
export interface RoomView {
  code: string;
  settings: RoomSettings;
  /** One entry per seat, in seat order; null is an empty seat. */
  seats: (RoomMemberView | null)[];
  spectators: RoomMemberView[];
}

/** Reply to create/join/takeSeat/watch: the room, plus which member is you. */
export interface RoomJoined {
  room: RoomView;
  you: { memberId: string; role: RoomRole };
  /** The room's recent chat, oldest first. */
  chat: ChatMessage[];
}
