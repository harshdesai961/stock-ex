// Turns the ?error= codes Better Auth adds to redirects into messages for people.
// Only known codes are shown; anything else gets a generic line, so the URL can't inject text.

const RETRY_SOCIAL = 'That sign-in timed out or was opened in another tab. Please try again.';
const LINK_FIRST =
  'That email already has a stock-ex account. Log in with your password and confirm your email first; after that, Continue with Google works for it too.';

const NOTICES = new Map<string, string>(
  Object.entries({
    invalid_token: 'That link has expired or was already used. Log in and we’ll send a fresh one.',
    token_expired: 'That link has expired. Log in and we’ll send a fresh one.',
    email_not_verified: 'Confirm your email first: we’ve sent you a link.',
    reset_done: 'Your password is changed. Log in with the new one.',
    signed_out: 'You’re signed out. See you at the table.',
    // Social sign-in (Better Auth's OAuth callback, plus codes the provider itself sends back).
    access_denied: 'Sign-in was cancelled. You can try again or use email.',
    email_not_found:
      'That provider didn’t share an email address, which we need. Try email instead.',
    account_not_linked: LINK_FIRST,
    unable_to_link_account: LINK_FIRST,
    account_already_linked_to_different_user:
      'That Google account is already used by a different stock-ex account.',
    state_not_found: RETRY_SOCIAL,
    state_mismatch: RETRY_SOCIAL,
    please_restart_the_process: RETRY_SOCIAL,
    invalid_callback_request: RETRY_SOCIAL,
    invalid_code: RETRY_SOCIAL,
    no_code: RETRY_SOCIAL,
  }),
);

export function noticeFor(code: string | string[] | undefined): string | undefined {
  const value = Array.isArray(code) ? code[0] : code;
  if (!value) return undefined;
  return NOTICES.get(value) ?? 'Something went wrong signing you in. Please try again.';
}
