import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { SOCKET_MAX_MESSAGE_BYTES, SOCKET_TRANSPORTS } from '@stock-ex/shared';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';
import type { ServerEnv } from '../config/env.js';

/**
 * Socket.IO with hardened options and the Redis adapter (spec 6, 12.2), so a broadcast from one
 * game-server instance reaches sockets connected to the others.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly pub: Redis;
  private readonly sub: Redis;
  private readonly webOrigin: string;

  constructor(app: INestApplicationContext, env: ServerEnv) {
    super(app);
    this.webOrigin = new URL(env.WEB_URL).origin;
    this.pub = new Redis(env.REDIS_URL, { lazyConnect: true });
    this.sub = this.pub.duplicate();
  }

  /** Call once before app.listen(), so a Redis outage stops start-up instead of failing later. */
  async connect(): Promise<void> {
    await Promise.all([this.pub.connect(), this.sub.connect()]);
  }

  override createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    // Nest types this as a full ServerOptions; Socket.IO fills in defaults for anything omitted.
    const hardened = {
      ...options,
      transports: [...SOCKET_TRANSPORTS],
      maxHttpBufferSize: SOCKET_MAX_MESSAGE_BYTES,
      serveClient: false,
      cors: { origin: [this.webOrigin], credentials: true },
      // Cheap first gate before the WebSocket upgrade; the auth middleware checks again.
      allowRequest: (request, callback) => {
        callback(null, request.headers.origin === this.webOrigin);
      },
    } as ServerOptions;
    const server: Server = super.createIOServer(port, hardened);
    server.adapter(createAdapter(this.pub, this.sub));
    return server;
  }

  override async dispose(): Promise<void> {
    await super.dispose();
    await Promise.all([this.pub.quit(), this.sub.quit()]).catch(() => undefined);
  }
}
