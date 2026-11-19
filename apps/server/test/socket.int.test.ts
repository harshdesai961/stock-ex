import type { INestApplication } from '@nestjs/common';
import type { Ack, PresencePong } from '@stock-ex/shared';
import { loadRootEnv, parseEnv, serverEnvSchema, type ServerEnv } from '@stock-ex/shared/env';
import { newGuestId, signSocketToken } from '@stock-ex/shared/socket-token';
import { Redis } from 'ioredis';
import { pino } from 'pino';
import { io, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { LIMITS } from '../src/realtime/rate-limit.js';

// Runs the real gateway against Postgres and Redis (local Docker or CI) with a real client.
describe('socket gateway', () => {
  let app: INestApplication;
  let env: ServerEnv;
  let baseUrl: string;
  let webOrigin: string;
  const open: Socket[] = [];

  beforeAll(async () => {
    loadRootEnv();
    env = parseEnv('server-test', serverEnvSchema);
    webOrigin = new URL(env.WEB_URL).origin;
    // Start from clean counters so reruns within a minute don't trip the per-IP limit.
    const redis = new Redis(env.REDIS_URL);
    const keys = await redis.keys('stockex:rl:*');
    if (keys.length > 0) await redis.del(...keys);
    await redis.quit();

    app = await createApp(env, pino({ level: 'silent' }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterEach(() => {
    for (const socket of open.splice(0)) socket.disconnect();
  });

  afterAll(async () => {
    await app.close();
  });

  const guestToken = (name = 'Tester') =>
    signSocketToken({ kind: 'guest', id: newGuestId(), name }, env.SOCKET_TOKEN_SECRET);

  function connect(auth: Record<string, unknown>, origin = webOrigin): Socket {
    const socket = io(baseUrl, {
      transports: ['websocket'],
      auth,
      extraHeaders: { origin },
      reconnection: false,
      forceNew: true,
    });
    open.push(socket);
    return socket;
  }

  /** Resolves "connected", or the refusal code the server sent (undefined if none). */
  function outcome(socket: Socket): Promise<string | undefined> {
    return new Promise((resolve) => {
      socket.once('connect', () => {
        resolve('connected');
      });
      socket.once('connect_error', (error: Error & { data?: { code?: string } }) => {
        resolve(error.data?.code);
      });
    });
  }

  const ping = (socket: Socket, payload: unknown = {}) =>
    socket.timeout(2000).emitWithAck('presence:ping', payload) as Promise<Ack<PresencePong>>;

  it('lets in a valid token from the web origin and answers a ping', async () => {
    const socket = connect({ token: await guestToken() });
    expect(await outcome(socket)).toBe('connected');
    const reply = await ping(socket);
    expect(reply.ok).toBe(true);
    if (reply.ok) expect(Math.abs(reply.data.serverTime - Date.now())).toBeLessThan(5000);
  });

  it('refuses a missing, forged or expired token', async () => {
    expect(await outcome(connect({}))).toBe('invalid');
    expect(await outcome(connect({ token: 'not-a-token' }))).toBe('invalid');
    const forged = await signSocketToken(
      { kind: 'guest', id: newGuestId(), name: 'Forger' },
      'some-other-secret-that-is-long-enough-to-sign-with-xx',
    );
    expect(await outcome(connect({ token: forged }))).toBe('invalid');
    const old = await signSocketToken(
      { kind: 'guest', id: newGuestId(), name: 'Late' },
      env.SOCKET_TOKEN_SECRET,
      new Date(Date.now() - 10 * 60 * 1000),
    );
    expect(await outcome(connect({ token: old }))).toBe('expired');
  });

  it('refuses another origin before the WebSocket upgrade', async () => {
    const socket = connect({ token: await guestToken() }, 'https://evil.example');
    expect(await outcome(socket)).not.toBe('connected');
  });

  it('rejects a malformed payload with a typed error', async () => {
    const socket = connect({ token: await guestToken() });
    await outcome(socket);
    const reply = await ping(socket, { sneaky: true });
    expect(reply).toMatchObject({ ok: false, error: { code: 'bad_request' } });
  });

  it('slows a busy socket down, then disconnects a flooding one', async () => {
    const socket = connect({ token: await guestToken() });
    await outcome(socket);
    const disconnected = new Promise<string>((resolve) => {
      socket.once('disconnect', resolve);
    });

    const replies = await Promise.all(
      Array.from({ length: LIMITS.eventsPerSocket.max + 5 }, () => ping(socket)),
    );
    expect(replies.filter((reply) => reply.ok)).toHaveLength(LIMITS.eventsPerSocket.max);
    expect(replies.at(-1)).toMatchObject({ ok: false, error: { code: 'rate_limited' } });

    for (let i = 0; i < LIMITS.eventsPerSocket.max; i++) socket.emit('presence:ping', {});
    expect(await disconnected).toBe('io server disconnect');
  });
});
