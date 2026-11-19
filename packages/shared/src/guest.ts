import { z } from 'zod';

// Guest play (spec 8): a nickname is all we ask for, and nothing personal is stored.

export const NICKNAME_MAX = 10;

export const nicknameSchema = z
  .string()
  .trim()
  .min(1, 'Pick a nickname first, or roll the dice for one.')
  .max(NICKNAME_MAX, `Use at most ${NICKNAME_MAX} characters.`)
  .regex(/^[\p{L}\p{N} _.-]+$/u, 'Use letters, numbers, spaces, dots, dashes or underscores.');

/** Body of POST /api/socket-token when nobody is signed in. */
export const guestTokenRequestSchema = z.object({ nickname: nicknameSchema }).strict();

/**
 * Guest ids: "g_" + 22 base64url characters (128 random bits). The prefix means a guest id can
 * never equal an account id, so a guest token can't be used to take an account's seat.
 */
export const GUEST_ID_PATTERN = /^g_[A-Za-z0-9_-]{22}$/;
