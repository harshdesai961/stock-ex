import { z } from 'zod';

// Account form rules, shared by the browser (instant feedback) and, from M4, the server
// (the check that actually counts). Spec section 8: accounts are 18+, passwords 8+ characters.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 20;

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .max(254, 'That email address is too long.')
  .pipe(z.email('Enter a valid email address, like name@example.com.'));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`);

export const displayNameSchema = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN, `Use at least ${DISPLAY_NAME_MIN} characters.`)
  .max(DISPLAY_NAME_MAX, `Use at most ${DISPLAY_NAME_MAX} characters.`)
  .regex(/^[\p{L}\p{N} _.-]+$/u, 'Use letters, numbers, spaces, dots, dashes or underscores.');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  ageConfirmed: z.literal(true, 'You must be 18 or older to create an account.'),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

/** First error message for each field, for showing next to the inputs. */
export function fieldErrors(error: z.ZodError): Partial<Record<string, string>> {
  // A Map keeps the first message per field without indexing an object by a dynamic key.
  const first = new Map<string, string>();
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    if (!first.has(field)) first.set(field, issue.message);
  }
  return Object.fromEntries(first);
}

/** A rough 0–4 strength score for the sign-up meter. Length counts most. */
export function passwordStrength(password: string): number {
  if (password.length < PASSWORD_MIN) return password.length === 0 ? 0 : 1;
  let score = 1;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

/**
 * The sign-up body as the auth server receives it (Better Auth calls the display name
 * `name`). Extra keys such as `callbackURL` pass through; the auth library checks those.
 */
export const signUpRequestSchema = z.looseObject({
  name: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  ageConfirmed: z.literal(true, 'You must be 18 or older to create an account.'),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'The two passwords don’t match.',
  });

/**
 * Turns a name from Google, Discord and so on into a valid display name: drops characters
 * the rules don't allow, trims to the maximum length, and falls back to "Player".
 */
export function cleanDisplayName(raw: string | null | undefined): string {
  const cleaned = (raw ?? '')
    .replace(/[^\p{L}\p{N} _.-]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DISPLAY_NAME_MAX)
    .trim();
  return cleaned.length >= DISPLAY_NAME_MIN ? cleaned : 'Player';
}
