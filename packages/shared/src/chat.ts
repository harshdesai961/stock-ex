import { z } from 'zod';

// Table chat contracts (spec 6): the server sets the sender, limits length and rate, filters
// profanity, and keeps a short history. Browsers render messages as plain text only.

export const CHAT_MAX_LENGTH = 200;
/** How many recent messages a room keeps, so someone joining sees the conversation. */
export const CHAT_HISTORY = 50;

/**
 * Code-point ranges replaced with a space: control characters, zero-width characters and the
 * bidirectional overrides that can make text display differently from what was sent.
 * Written as numbers so this file itself contains no invisible characters.
 */
const HIDDEN_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0xfeff, 0xfeff],
];

function isHidden(character: string): boolean {
  const point = character.codePointAt(0) ?? 0;
  return HIDDEN_RANGES.some(([low, high]) => point >= low && point <= high);
}

/** Replaces hidden characters with spaces, squashes whitespace and trims. */
export function cleanChatText(text: string): string {
  return Array.from(text, (character) => (isHidden(character) ? ' ' : character))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export const chatSendSchema = z
  .object({
    text: z
      .string()
      .max(CHAT_MAX_LENGTH * 2, 'That message is too long.')
      .transform(cleanChatText)
      .pipe(
        z
          .string()
          .min(1, 'Type a message first.')
          .max(CHAT_MAX_LENGTH, `Keep messages to ${CHAT_MAX_LENGTH} characters.`),
      ),
  })
  .strict();

export const chatMessageIdSchema = z.string().regex(/^c_[A-Za-z0-9_-]{12}$/);
export const chatReportSchema = z.object({ messageId: chatMessageIdSchema }).strict();

export interface ChatMessage {
  id: string;
  /** The sender's per-room member id, so others can mute them. */
  memberId: string;
  /** Set by the server from the room, never by the sender. */
  name: string;
  text: string;
  /** Server time in ms. */
  sentAt: number;
}
