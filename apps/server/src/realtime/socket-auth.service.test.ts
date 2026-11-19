import { signSocketToken } from '@stock-ex/shared/socket-token';
import { describe, expect, it } from 'vitest';
import type { ServerEnv } from '../config/env.js';
import { SocketAuthError, SocketAuthService } from './socket-auth.service.js';

const SECRET = 'server-test-secret-that-is-at-least-thirty-two-bytes';
const WEB = 'http://localhost:3000';
const service = new SocketAuthService({
  SOCKET_TOKEN_SECRET: SECRET,
  WEB_URL: `${WEB}/`,
} as ServerEnv);

async function refusal(input: Parameters<SocketAuthService['authenticate']>[0]) {
  const error = await service.authenticate(input).then(
    () => undefined,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(SocketAuthError);
  return (error as SocketAuthError).code;
}

describe('SocketAuthService', () => {
  it('accepts a valid token from the web origin', async () => {
    const token = await signSocketToken({ kind: 'user', id: 'usr_1', name: 'Asha' }, SECRET);
    await expect(service.authenticate({ origin: WEB, token })).resolves.toEqual({
      kind: 'user',
      id: 'usr_1',
      name: 'Asha',
    });
  });

  it('refuses other origins, including a missing one', async () => {
    const token = await signSocketToken({ kind: 'user', id: 'usr_1', name: 'Asha' }, SECRET);
    expect(await refusal({ origin: 'https://evil.example', token })).toBe('bad_origin');
    expect(await refusal({ origin: 'http://localhost:3000.evil.example', token })).toBe(
      'bad_origin',
    );
    expect(await refusal({ origin: undefined, token })).toBe('bad_origin');
  });

  it('refuses missing or non-string tokens', async () => {
    for (const token of [undefined, null, '', 42, { sub: 'usr_1' }]) {
      expect(await refusal({ origin: WEB, token })).toBe('invalid');
    }
  });

  it('tells the client when to fetch a fresh token', async () => {
    const old = new Date(Date.now() - 10 * 60 * 1000);
    const token = await signSocketToken({ kind: 'user', id: 'usr_1', name: 'Asha' }, SECRET, old);
    expect(await refusal({ origin: WEB, token })).toBe('expired');
  });

  it('refuses tokens signed with another secret', async () => {
    const token = await signSocketToken(
      { kind: 'user', id: 'usr_1', name: 'Asha' },
      'a-completely-different-secret-of-enough-length-1234',
    );
    expect(await refusal({ origin: WEB, token })).toBe('invalid');
  });
});
