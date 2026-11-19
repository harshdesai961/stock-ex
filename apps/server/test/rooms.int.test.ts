import type { INestApplication } from '@nestjs/common';
import type { Ack, RoomJoined, RoomView } from '@stock-ex/shared';
import { loadRootEnv, parseEnv, serverEnvSchema, type ServerEnv } from '@stock-ex/shared/env';
import { newGuestId, signSocketToken, type SocketIdentity } from '@stock-ex/shared/socket-token';
import { Redis } from 'ioredis';
import { pino } from 'pino';
import { io, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';

// Room lobby end to end: real server, real Redis, several real clients.
describe('rooms', () => {
  let app: INestApplication;
  /** A second game-server instance sharing the same Redis, like a scaled-out deployment. */
  let app2: INestApplication;
  let env: ServerEnv;
  let baseUrl: string;
  let baseUrl2: string;
  const open: Socket[] = [];
  let names = 0;

  beforeAll(async () => {
    loadRootEnv();
    env = parseEnv('server-test', serverEnvSchema);
    const redis = new Redis(env.REDIS_URL);
    const keys = await redis.keys('stockex:rl:*');
    if (keys.length > 0) await redis.del(...keys);
    await redis.quit();
    // As in production behind a proxy, so each test client can have its own address and the
    // 40-connections-a-minute limit (tested in socket.int.test.ts) never trips across tests.
    const behindProxy = { ...env, TRUST_PROXY: true };
    app = await createApp(behindProxy, pino({ level: 'silent' }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
    app2 = await createApp(behindProxy, pino({ level: 'silent' }));
    await app2.listen(0, '127.0.0.1');
    baseUrl2 = await app2.getUrl();
  });

  afterEach(() => {
    for (const socket of open.splice(0)) socket.disconnect();
  });

  afterAll(async () => {
    await Promise.all([app.close(), app2.close()]);
  });

  const guest = (): SocketIdentity => ({ kind: 'guest', id: newGuestId(), name: `P${++names}` });

  /** Connects as `who` and waits until the server has let the socket in. */
  async function client(who: SocketIdentity = guest(), url = baseUrl): Promise<Socket> {
    const token = await signSocketToken(who, env.SOCKET_TOKEN_SECRET);
    const socket = io(url, {
      transports: ['websocket'],
      auth: { token },
      // 198.51.100.0/24 is reserved for documentation (RFC 5737).
      extraHeaders: {
        origin: new URL(env.WEB_URL).origin,
        'x-forwarded-for': `198.51.100.${(names % 250) + 1}`,
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

  const nextState = (socket: Socket) =>
    new Promise<RoomView>((resolve) => {
      socket.once('room:state', resolve);
    });

  async function openRoom(maxSeats = 2) {
    const host = await client();
    const created = data(await send<RoomJoined>(host, 'room:create', { settings: { maxSeats } }));
    return { host, code: created.room.code, created };
  }

  it('creates a room with an unambiguous code and the creator as host', async () => {
    const { created } = await openRoom();
    expect(created.room.code).toMatch(/^[ABCDEFGHJKMNPQRSTWXYZ2-9]{5}$/);
    expect(created.you.role).toBe('player');
    expect(created.room.seats[0]).toMatchObject({ isHost: true, connected: true });
    expect(created.room.seats).toHaveLength(2);
  });

  it('joins by code (any case) and tells everyone in the room', async () => {
    const { host, code } = await openRoom();
    const update = nextState(host);
    const joined = data(
      await send<RoomJoined>(await client(), 'room:join', { code: code.toLowerCase() }),
    );
    expect(joined.you.role).toBe('player');
    expect((await update).seats.filter(Boolean)).toHaveLength(2);
  });

  it('answers unknown and malformed codes with typed errors', async () => {
    const socket = await client();
    expect(await send(socket, 'room:join', { code: 'ZZZZZ' })).toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    expect(await send(socket, 'room:join', { code: 'AB0' })).toMatchObject({
      ok: false,
      error: { code: 'bad_request' },
    });
  });

  it('offers a full table to watch, and lets exactly one of two racers take the last seat', async () => {
    const { code } = await openRoom(2);
    const [a, b] = await Promise.all([client(), client()]);
    const replies = await Promise.all([
      send<RoomJoined>(a, 'room:join', { code }),
      send<RoomJoined>(b, 'room:join', { code }),
    ]);
    expect(replies.filter((r) => r.ok)).toHaveLength(1);
    const loser = replies[0].ok ? b : a;
    expect(replies.find((r) => !r.ok)).toMatchObject({ error: { code: 'conflict' } });
    const watching = data(await send<RoomJoined>(loser, 'room:join', { code, as: 'spectator' }));
    expect(watching.room.spectators).toHaveLength(1);
  });

  it('lets the host kick someone, who is told and removed', async () => {
    const { host, code } = await openRoom();
    const guestSocket = await client();
    const joined = data(await send<RoomJoined>(guestSocket, 'room:join', { code }));
    const removed = new Promise((resolve) => {
      guestSocket.once('room:removed', resolve);
    });
    expect(data(await send(host, 'room:kick', { memberId: joined.you.memberId }))).toBeNull();
    expect(await removed).toEqual({ reason: 'kicked' });
    expect(await send(guestSocket, 'room:takeSeat')).toMatchObject({
      error: { code: 'not_found' },
    });
  });

  it('refuses a kick from anyone but the host', async () => {
    const { created, code } = await openRoom();
    const other = await client();
    await send(other, 'room:join', { code });
    const hostId = created.you.memberId;
    expect(await send(other, 'room:kick', { memberId: hostId })).toMatchObject({
      error: { code: 'forbidden' },
    });
  });

  it('keeps a seat for a player who drops and gives it back when they return', async () => {
    const { host, code } = await openRoom();
    const who = guest();
    const first = await client(who);
    data(await send(first, 'room:join', { code }));
    const dropped = nextState(host);
    first.disconnect();
    expect((await dropped).seats[1]).toMatchObject({ name: who.name, connected: false });

    const back = data(await send<RoomJoined>(await client(who), 'room:join', { code }));
    expect(back.you.role).toBe('player');
    expect(back.room.seats[1]).toMatchObject({ name: who.name, connected: true });
  });

  it('works across two server instances: shared state, broadcasts and the last-seat race', async () => {
    const { host, code } = await openRoom(2);
    const [a, b] = await Promise.all([client(guest(), baseUrl), client(guest(), baseUrl2)]);
    const hostSees = nextState(host);
    // a is on the host's instance, b on the other: only Redis compare-and-set can settle this.
    const replies = await Promise.all([
      send<RoomJoined>(a, 'room:join', { code }),
      send<RoomJoined>(b, 'room:join', { code }),
    ]);
    expect(replies.filter((r) => r.ok)).toHaveLength(1);
    expect(replies.find((r) => !r.ok)).toMatchObject({ error: { code: 'conflict' } });
    expect((await hostSees).seats.filter(Boolean)).toHaveLength(2);

    // A spectator on instance 2 hears a change made on instance 1.
    const watcher = await client(guest(), baseUrl2);
    data(await send(watcher, 'room:join', { code, as: 'spectator' }));
    const watcherSees = nextState(watcher);
    data(await send(host, 'room:spectate'));
    expect((await watcherSees).spectators).toHaveLength(2);
  });

  it('closes the room when the last person leaves', async () => {
    const { host, code } = await openRoom();
    expect(data(await send(host, 'room:leave'))).toBeNull();
    expect(await send(await client(), 'room:join', { code })).toMatchObject({
      error: { code: 'not_found' },
    });
  });
});
