import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { findRepoRoot } from '@stock-ex/shared/env';
import nodemailer, { type Transporter } from 'nodemailer';
import { serverEnv } from '../env';
import { smtpConfig } from './config';
import type { EmailMessage } from './templates';

let transporter: Transporter | undefined;

function getTransporter(): Transporter | undefined {
  const config = smtpConfig();
  if (!config) return undefined;
  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    // On 587 refuse to send unless the server upgrades to TLS, so passwords never go in clear.
    requireTLS: !config.secure,
    ...(config.auth ? { auth: config.auth } : {}),
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

/** "twisha@example.com" -> "t***@example.com", so logs don't hold full addresses. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

/**
 * Development only: also saves the email under <repo>/.dev-mail/ (git-ignored), so a link
 * can be opened even when the dev server runs somewhere its output isn't visible, and so
 * end-to-end tests can read it. Each file is named by time and subject, never by address.
 */
async function saveToDevOutbox(message: EmailMessage): Promise<string | undefined> {
  const root = findRepoRoot();
  if (!root) return undefined;
  const dir = join(root, '.dev-mail');
  const slug = message.subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);
  const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${slug}.txt`);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed folder in our own repo
  await mkdir(dir, { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- name built from time + subject only
  await writeFile(
    file,
    `To: ${message.to}
Subject: ${message.subject}

${message.text}
`,
    'utf8',
  );
  return file;
}

/**
 * Sends one email over SMTP. With no SMTP_HOST, development prints the email to the
 * `pnpm dev` terminal and saves it to .dev-mail/ instead (spec 11.1: zero-account local dev);
 * production throws,
 * so a missing setting is noticed instead of links silently going nowhere.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const smtp = getTransporter();
  if (!smtp) {
    if (serverEnv().NODE_ENV === 'production') {
      throw new Error('Email is not configured: set SMTP_HOST and friends (docs/EMAIL.md).');
    }
    const saved = await saveToDevOutbox(message).catch(() => undefined);
    // warn, not info: it should stand out in the dev terminal, and lint allows only warn/error.
    console.warn(
      [
        '',
        '──── stock-ex email (SMTP not configured, printed instead of sent) ────',
        `To:      ${maskEmail(message.to)}`,
        `Subject: ${message.subject}`,
        '',
        message.text,
        ...(saved ? ['', `(Also saved to ${saved})`] : []),
        '──────────────────────────────────────────────────────────────────────',
        '',
      ].join('\n'),
    );
    return;
  }
  const config = smtpConfig();
  await smtp.sendMail({
    from: config?.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
