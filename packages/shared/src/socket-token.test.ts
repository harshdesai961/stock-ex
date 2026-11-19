import { SignJWT, UnsecuredJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { guestTokenRequestSchema } from './guest.js';
import {
  newGuestId,
  signSocketToken,
  SOCKET_TOKEN_TTL_SECONDS,
  SocketTokenError,
  verifySocketToken,
  type SocketIdentity,
} from './socket-token.js';

const SECRET = 'test-secret-that-is-at-least-thirty-two-bytes-long-xyz';
const OTHER_SECRET = 'another-secret-that-is-at-least-thirty-two-bytes-long';
const NOW = new Date('2026-11-19T12:00:00Z');
const user: SocketIdentity = { kind: 'user', id: 'usr_123', name: 'Asha' };

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(SocketTokenError);
  return (error as SocketTokenError).code;
}

describe('socket tokens', () => {
  it('round-trips an account and a guest', async () => {
    const guest: SocketIdentity = { kind: 'guest', id: newGuestId(), name: 'Bulls 7' };
    for (const identity of [user, guest]) {
      const token = await signSocketToken(identity, SECRET, NOW);
      await expect(verifySocketToken(token, SECRET, NOW)).resolves.toEqual(identity);
    }
  });

  it('expires after five minutes', async () => {
    const token = await signSocketToken(user, SECRET, NOW);
    const later = new Date(NOW.getTime() + (SOCKET_TOKEN_TTL_SECONDS + 10) * 1000);
    expect(await rejection(verifySocketToken(token, SECRET, later))).toBe('expired');
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signSocketToken(user, OTHER_SECRET, NOW);
    expect(await rejection(verifySocketToken(token, SECRET, NOW))).toBe('invalid');
  });

  it('rejects an edited payload', async () => {
    const token = await signSocketToken(user, SECRET, NOW);
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'usr_admin', kind: 'user', name: 'Asha' }),
    ).toString('base64url');
    expect(
      await rejection(verifySocketToken(`${header}.${forged}.${signature}`, SECRET, NOW)),
    ).toBe('invalid');
  });

  it('rejects unsigned "alg: none" tokens', async () => {
    const token = new UnsecuredJWT({ kind: 'user', name: 'Asha' })
      .setSubject('usr_123')
      .setIssuer('stock-ex/web')
      .setAudience('stock-ex/server')
      .setIssuedAt(Math.floor(NOW.getTime() / 1000))
      .setExpirationTime('5m')
      .encode();
    expect(await rejection(verifySocketToken(token, SECRET, NOW))).toBe('invalid');
  });

  it('rejects a token meant for another audience', async () => {
    const iat = Math.floor(NOW.getTime() / 1000);
    const token = await new SignJWT({ kind: 'user', name: 'Asha' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('usr_123')
      .setIssuer('stock-ex/web')
      .setAudience('someone-else')
      .setIssuedAt(iat)
      .setExpirationTime(iat + 60)
      .sign(new TextEncoder().encode(SECRET));
    expect(await rejection(verifySocketToken(token, SECRET, NOW))).toBe('invalid');
  });

  it('treats a token issued over five minutes ago as expired, whatever its exp says', async () => {
    const iat = Math.floor(NOW.getTime() / 1000);
    const token = await new SignJWT({ kind: 'user', name: 'Asha' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('usr_123')
      .setIssuer('stock-ex/web')
      .setAudience('stock-ex/server')
      .setIssuedAt(iat - 3600)
      .setExpirationTime(iat + 3600)
      .sign(new TextEncoder().encode(SECRET));
    expect(await rejection(verifySocketToken(token, SECRET, NOW))).toBe('expired');
  });

  it('keeps guest and account ids apart', async () => {
    await expect(
      signSocketToken({ kind: 'user', id: 'g_pretending', name: 'Asha' }, SECRET, NOW),
    ).rejects.toThrow();
    await expect(
      signSocketToken({ kind: 'guest', id: 'usr_123', name: 'Asha' }, SECRET, NOW),
    ).rejects.toThrow();
  });

  it('rejects junk without parsing it', async () => {
    expect(await rejection(verifySocketToken('x'.repeat(5000), SECRET, NOW))).toBe('invalid');
    expect(await rejection(verifySocketToken('not-a-jwt', SECRET, NOW))).toBe('invalid');
  });

  it('makes distinct, well-formed guest ids', () => {
    const ids = new Set(Array.from({ length: 50 }, newGuestId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^g_[A-Za-z0-9_-]{22}$/);
  });
});

describe('guest token request', () => {
  it('accepts a trimmed nickname up to 10 characters', () => {
    expect(guestTokenRequestSchema.parse({ nickname: '  Bull Run ' })).toEqual({
      nickname: 'Bull Run',
    });
  });

  it('rejects empty, long, odd-character or extra fields', () => {
    for (const body of [
      { nickname: '   ' },
      { nickname: 'ElevenChars' },
      { nickname: '<b>hi</b>' },
      { nickname: 'Asha', kind: 'user' },
    ]) {
      expect(guestTokenRequestSchema.safeParse(body).success).toBe(false);
    }
  });
});
