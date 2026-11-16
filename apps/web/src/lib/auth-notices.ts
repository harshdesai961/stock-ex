// Turns the ?error= codes Better Auth adds to redirects into messages for people.
// Only known codes are shown; anything else gets a generic line, so the URL can't inject text.
const NOTICES = new Map<string, string>(
  Object.entries({
    invalid_token: 'That link has expired or was already used. Log in and we’ll send a fresh one.',
    token_expired: 'That link has expired. Log in and we’ll send a fresh one.',
    email_not_verified: 'Confirm your email first: we’ve sent you a link.',
    access_denied: 'Sign-in was cancelled. You can try again or use email.',
    email_not_found:
      'That provider didn’t share an email address, which we need. Try email instead.',
    account_not_linked:
      'That email already has an account. Log in with your password first, then link the provider.',
    reset_done: 'Your password is changed. Log in with the new one.',
    signed_out: 'You’re signed out. See you at the table.',
  }),
);

export function noticeFor(code: string | string[] | undefined): string | undefined {
  const value = Array.isArray(code) ? code[0] : code;
  if (!value) return undefined;
  return NOTICES.get(value) ?? 'Something went wrong signing you in. Please try again.';
}
