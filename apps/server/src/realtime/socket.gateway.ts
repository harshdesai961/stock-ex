import { Inject, Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  presencePingSchema,
  type Ack,
  type ClientToServerEvents,
  type ConnectRefusal,
  type PresencePong,
  type ServerToClientEvents,
  type SocketError,
} from '@stock-ex/shared';
import type { SocketIdentity } from '@stock-ex/shared/socket-token';
import type { Server, Socket } from 'socket.io';
import { SERVER_ENV, type ServerEnv } from '../config/env.js';
import { clientIp } from './client-ip.js';
import { ABUSE_MULTIPLIER, LIMITS, RateLimitService, WindowCounter } from './rate-limit.js';
import { SocketAuthError, SocketAuthService } from './socket-auth.service.js';

export interface SocketData {
  /** Set once by the auth middleware; the only identity any handler may use. */
  identity: SocketIdentity;
  /** The room this socket is in, if any. One room per socket. */
  roomCode?: string | undefined;
}

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, never, SocketData>;

const RATE_LIMITED: SocketError = {
  code: 'rate_limited',
  message: 'You’re sending too fast. Wait a few seconds and try again.',
};

function refuse(code: ConnectRefusal): Error {
  // Socket.IO sends `message` and `data` to the client as connect_error; nothing else leaks.
  return Object.assign(new Error('connection refused'), { data: { code } });
}

export function badRequest(message: string): Ack<never> {
  return { ok: false, error: { code: 'bad_request', message } };
}

/**
 * The one door into the real-time server (spec 6, 12.2). Every connection proves who it is
 * with a socket token; every event passes per-socket and per-user rate limits before any
 * handler sees it; every payload is Zod-checked inside its handler.
 */
@WebSocketGateway()
export class SocketGateway implements OnGatewayInit<GameServer>, OnGatewayConnection<GameSocket> {
  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    @Inject(SERVER_ENV) private readonly env: ServerEnv,
    @Inject(SocketAuthService) private readonly auth: SocketAuthService,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}

  afterInit(server: GameServer) {
    server.use((socket, next) => {
      void this.admit(socket).then(
        () => {
          next();
        },
        (error: unknown) => {
          const code = error instanceof SocketAuthError ? error.code : 'invalid';
          this.logger.warn(`socket refused: ${code}`);
          next(refuse(code));
        },
      );
    });
  }

  private async admit(socket: GameSocket): Promise<void> {
    const ip = clientIp(socket.handshake, this.env.TRUST_PROXY);
    if (!(await this.limits.allow(`conn:ip:${ip}`, LIMITS.connectionsPerIp))) {
      throw new SocketAuthError('rate_limited');
    }
    socket.data.identity = await this.auth.authenticate({
      origin: socket.handshake.headers.origin,
      token: (socket.handshake.auth as Record<string, unknown>).token,
    });
  }

  handleConnection(socket: GameSocket) {
    const counter = new WindowCounter(LIMITS.eventsPerSocket);
    const { id } = socket.data.identity;

    socket.use((packet, next) => {
      const count = counter.hit();
      if (count > LIMITS.eventsPerSocket.max * ABUSE_MULTIPLIER) {
        this.logger.warn('socket disconnected for flooding');
        socket.disconnect(true);
        return;
      }
      const ack: unknown = packet.at(-1);
      const reject = () => {
        if (typeof ack === 'function')
          (ack as (reply: Ack<never>) => void)({ ok: false, error: RATE_LIMITED });
        else socket.emit('error', RATE_LIMITED);
      };
      if (count > LIMITS.eventsPerSocket.max) {
        reject();
        return;
      }
      void this.limits.allow(`evt:user:${id}`, LIMITS.eventsPerUser).then((allowed) => {
        if (allowed) next();
        else reject();
      });
    });
  }

  @SubscribeMessage('presence:ping')
  ping(_socket: GameSocket, payload: unknown): Ack<PresencePong> {
    if (!presencePingSchema.safeParse(payload ?? {}).success) {
      return badRequest('That message wasn’t in the expected format.');
    }
    return { ok: true, data: { serverTime: Date.now() } };
  }
}
