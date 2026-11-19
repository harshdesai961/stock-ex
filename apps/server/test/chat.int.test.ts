import type { INestApplication } from '@nestjs/common';
import type { Ack, ChatMessage, RoomJoined } from '@stock-ex/shared';
import { loadRootEnv, parseEnv, serverEnvSchema, type ServerEnv } from '@stock-ex/shared/env';
import { newGuestId, signSocketToken, type SocketIdentity } from '@stock-ex/shared/socket-token';
import { Redis } from 'ioredis';
import { pino } from 'pino';
import { io, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';

// Table chat end to end: real server, real Redis, real clients.
describe('room chat', () => {
  let app: INestApplication;
  let env: ServerEnv;
  let baseUrl: string;
  let redis: Redis;
  const open: Socket[] = [];
  let names = 0;

  beforeAll(async () => {
    loadRootEnv();
    env = parseEnv('server-test', serverEnvSchema);
    redis = new Redis(env.REDIS_URL);
    const keys = await redis.keys('stockex:rl:*');
    if (keys.length > 0) await redis.del(...keys);
    // As in production behind a proxy, so each test client can have its own address and the
    // 40-connections-a-minute limit (tested in socket.int.test.ts) never trips across tests.
    app = await createApp({ ...env, TRUST_PROXY: true }, pino({ level: 'silent' }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterEach(() => {
    for (const socket of open.splice(0)) socket.disconnect();
  });

  afterAll(async () => {
    await app.close();
    await redis.quit();
  });

  const guest = (): SocketIdentity => ({ kind: 'guest', id: newGuestId(), name: `C${++names}` });

  async function client(who: SocketIdentity = guest()): Promise<Socket> {
    const token = await signSocketToken(who, env.SOCKET_TOKEN_SECRET);
    const socket = io(baseUrl, {
      transports: ['websocket'],
      auth: { token },
      // 203.0.113.0/24 is reserved for documentation (RFC 5737).
      extraHeaders: {
        origin: new URL(env.WEB_URL).origin,
        'x-forwarded-for': `203.0.113.${(names % 250) + 1}`,
      },
      reconnection: false,
      forceNew: true,
    });
    open.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    return socket;
  }

  const send = <T>(socket: Socket, event: string, payload: unknown = {}) =>
    socket.timeout(3000).emitWithAck(event, payload) as Promise<Ack<T>>;

  function data<T>(reply: Ack<T>): T {
    if (!reply.ok) throw new Error(`${reply.error.code}: ${reply.error.message}`);
    return reply.data;
  }

  const nextMessage = (socket: Socket) =>
    new Promise<ChatMessage>((resolve) => {
      socket.once('chat:message', resolve);
    });

  /** A room with a host and one other player, both connected. */
  async function table() {
    const host = await client();
    const created = data(await send<RoomJoined>(host, 'room:create'));
    const code = created.room.code;
    const other = await client();
    const joined = data(await send<RoomJoined>(other, 'room:join', { code }));
    return { host, other, code, hostId: created.you.memberId, otherId: joined.you.memberId };
  }

  it('delivers a message to the room with the name the server knows', async () => {
    const { host, other, hostId } = await table();
    const heard = nextMessage(other);
    const sent = data(await send<ChatMessage>(host, 'chat:send', { text: '  buy  Kuber! ' }));
    const received = await heard;
    expect(received).toEqual(sent);
    expect(received).toMatchObject({ memberId: hostId, text: 'buy Kuber!' });
    expect(received.name).toMatch(/^C\d+$/);
  });

  it('refuses a made-up sender name, over-long text and people outside the room', async () => {
    const { host } = await table();
    expect(await send(host, 'chat:send', { text: 'hi', name: 'Admin' })).toMatchObject({
      error: { code: 'bad_request' },
    });
    expect(await send(host, 'chat:send', { text: 'x'.repeat(201) })).toMatchObject({
      error: { code: 'bad_request', message: 'Keep messages to 200 characters.' },
    });
    expect(await send(await client(), 'chat:send', { text: 'hello?' })).toMatchObject({
      error: { code: 'not_found' },
    });
  });

  it('masks profanity before anyone sees it', async () => {
    const { host, other } = await table();
    const heard = nextMessage(other);
    await send(host, 'chat:send', { text: 'what the fuck' });
    expect((await heard).text).toBe('what the ****');
  });

  it('allows 8 messages per 10 seconds, then slows the sender down', async () => {
    const { host } = await table();
    const replies = [];
    for (let i = 0; i < 9; i++) replies.push(await send(host, 'chat:send', { text: `m${i}` }));
    expect(replies.filter((r) => r.ok)).toHaveLength(8);
    expect(replies.at(-1)).toMatchObject({ error: { code: 'rate_limited' } });
  });

  it('shows recent chat to someone who joins later', async () => {
    const { host, code } = await table();
    await send(host, 'chat:send', { text: 'first' });
    await send(host, 'chat:send', { text: 'second' });
    const late = data(await send<RoomJoined>(await client(), 'room:join', { code }));
    expect(late.chat.map((m) => m.text)).toEqual(['first', 'second']);
  });

  it('records a report for moderators, but not of your own or unknown messages', async () => {
    const { host, other, code } = await table();
    const sent = data(await send<ChatMessage>(host, 'chat:send', { text: 'rude thing' }));
    expect(data(await send(other, 'chat:report', { messageId: sent.id }))).toBeNull();
    const reports = (await redis.lrange('stockex:chat:reports', 0, 20)).map(
      (r) => JSON.parse(r) as { roomCode: string; message: ChatMessage },
    );
    expect(reports.some((r) => r.roomCode === code && r.message.id === sent.id)).toBe(true);

    expect(await send(host, 'chat:report', { messageId: sent.id })).toMatchObject({
      error: { code: 'bad_request' },
    });
    expect(await send(other, 'chat:report', { messageId: 'c_000000000000' })).toMatchObject({
      error: { code: 'not_found' },
    });
  });

  it('deletes the chat when the room closes', async () => {
    const host = await client();
    const { room } = data(await send<RoomJoined>(host, 'room:create'));
    await send(host, 'chat:send', { text: 'anyone?' });
    expect(await redis.exists(`stockex:room:${room.code}:chat`)).toBe(1);
    await send(host, 'room:leave');
    await expect.poll(() => redis.exists(`stockex:room:${room.code}:chat`)).toBe(0);
  });
});
