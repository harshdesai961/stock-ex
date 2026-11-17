import { describe, expect, it } from 'vitest';
import { noticeFor } from './auth-notices';

describe('noticeFor', () => {
  it('returns nothing when there is no code', () => {
    expect(noticeFor(undefined)).toBeUndefined();
    expect(noticeFor('')).toBeUndefined();
  });

  it('maps known OAuth callback codes to plain language', () => {
    expect(noticeFor('access_denied')).toMatch(/cancelled/);
    expect(noticeFor('account_not_linked')).toMatch(/confirm your email first/i);
    expect(noticeFor('state_not_found')).toMatch(/try again/);
  });

  it('uses the first value when the param repeats', () => {
    expect(noticeFor(['signed_out', 'access_denied'])).toMatch(/signed out/);
  });

  it('never echoes an unknown code back into the page', () => {
    const notice = noticeFor('<script>alert(1)</script>');
    expect(notice).toBe('Something went wrong signing you in. Please try again.');
  });
});
