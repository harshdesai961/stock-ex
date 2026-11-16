// Email settings. The SMTP login itself is secret, so it lives in the root .env
// (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM); this file turns
// those values into a transport config and holds the non-secret wording and timings.
// Step-by-step provider settings: docs/EMAIL.md.
import { serverEnv } from '../env';

export const EMAIL_SETTINGS = {
  productName: 'stock-ex',
  /** How long a verification link works, in seconds (Better Auth's expiresIn). */
  verificationLinkSeconds: 60 * 60 * 24,
  /** How long a password-reset link works, in seconds. */
  resetLinkSeconds: 60 * 60,
  subjects: {
    verify: 'Confirm your email for stock-ex',
    reset: 'Reset your stock-ex password',
    existing: 'Someone tried to sign up with your email',
  },
} as const;

export interface SmtpConfig {
  host: string;
  port: number;
  /** true: TLS from the start (465). false: plain then STARTTLS, which we require (587). */
  secure: boolean;
  auth?: { user: string; pass: string };
  from: string;
}

/** The SMTP settings from .env, or undefined when SMTP_HOST is empty. */
export function smtpConfig(): SmtpConfig | undefined {
  const env = serverEnv();
  if (!env.SMTP_HOST) return undefined;
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
    from: env.EMAIL_FROM,
  };
}
