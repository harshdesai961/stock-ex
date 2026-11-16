import { EMAIL_SETTINGS } from './config';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Escapes text for an HTML email body. Names come from users, so they are never trusted. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const hours = (seconds: number) => Math.round(seconds / 3600);

/** A plain, table-free layout that reads fine in every mail app and in dark mode. */
function layout(heading: string, intro: string, button: string, url: string, footer: string) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#0e3b24;font-family:Arial,sans-serif;color:#072a19">
<div style="max-width:480px;margin:0 auto;background:#fbf8ef;border:3px solid #072a19;border-radius:16px;padding:28px">
<p style="margin:0 0 8px;font-size:22px;font-weight:bold">${escapeHtml(EMAIL_SETTINGS.productName)}</p>
<h1 style="margin:0 0 12px;font-size:20px">${heading}</h1>
<p style="margin:0 0 20px;line-height:1.5">${intro}</p>
<p style="margin:0 0 20px"><a href="${safeUrl}" style="display:inline-block;background:#f8c12c;color:#072a19;font-weight:bold;text-decoration:none;padding:12px 20px;border:2px solid #072a19;border-radius:10px">${button}</a></p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5">If the button doesn’t work, copy this link into your browser:<br><span style="word-break:break-all">${safeUrl}</span></p>
<p style="margin:16px 0 0;font-size:13px;color:#22653f">${footer}</p>
</div></body></html>`;
}

export function verificationEmail(to: string, name: string, url: string): EmailMessage {
  const valid = hours(EMAIL_SETTINGS.verificationLinkSeconds);
  return {
    to,
    subject: EMAIL_SETTINGS.subjects.verify,
    text: `Hi ${name},\n\nConfirm your email to finish creating your stock-ex account:\n${url}\n\nThe link works for ${valid} hours. If you didn't sign up, ignore this email.`,
    html: layout(
      'Confirm your email',
      `Hi ${escapeHtml(name)}, one click and your seat at the table is ready.`,
      'Confirm my email',
      url,
      `The link works for ${valid} hours. If you didn’t sign up, you can ignore this email.`,
    ),
  };
}

export function resetPasswordEmail(to: string, name: string, url: string): EmailMessage {
  const valid = hours(EMAIL_SETTINGS.resetLinkSeconds);
  return {
    to,
    subject: EMAIL_SETTINGS.subjects.reset,
    text: `Hi ${name},\n\nSomeone asked to reset the password for your stock-ex account. To choose a new one, open:\n${url}\n\nThe link works for ${valid} hour${valid === 1 ? '' : 's'}. If it wasn't you, ignore this email and your password stays the same.`,
    html: layout(
      'Reset your password',
      `Hi ${escapeHtml(name)}, someone asked to reset the password for your account. If that was you, choose a new one below.`,
      'Choose a new password',
      url,
      `The link works for ${valid} hour${valid === 1 ? '' : 's'}. If it wasn’t you, ignore this email and your password stays the same.`,
    ),
  };
}

/** Sent instead of a second account when someone signs up with an address that already has one. */
export function existingAccountEmail(to: string, name: string, loginUrl: string): EmailMessage {
  return {
    to,
    subject: EMAIL_SETTINGS.subjects.existing,
    text: `Hi ${name},\n\nSomeone just tried to create a stock-ex account with this email address, but you already have one. If it was you, log in instead (or reset your password there):\n${loginUrl}\n\nIf it wasn't you, ignore this email. Nothing about your account changed.`,
    html: layout(
      'You already have an account',
      `Hi ${escapeHtml(name)}, someone just tried to sign up with this address. If it was you, log in instead, or use “Forgot your password?” on the login page.`,
      'Go to log in',
      loginUrl,
      'If it wasn’t you, ignore this email. Nothing about your account changed.',
    ),
  };
}
