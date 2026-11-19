import { Inject, Injectable } from '@nestjs/common';
import type { ConnectRefusal } from '@stock-ex/shared';
import {
  SocketTokenError,
  verifySocketToken,
  type SocketIdentity,
} from '@stock-ex/shared/socket-token';
import { SERVER_ENV, type ServerEnv } from '../config/env.js';

/** What the socket gateway (M2) passes in from each connection's handshake. */
export interface HandshakeInput {
  /** The browser's Origin header. */
  origin: string | undefined;
  /** `socket.handshake.auth.token`: untrusted, so it may be anything. */
  token: unknown;
}

/**
 * Why a connection was refused (the shared `ConnectRefusal` codes). Clients see only this code:
 * "expired" means fetch a fresh token from /api/socket-token and reconnect.
 */
export type SocketAuthErrorCode = ConnectRefusal;

export class SocketAuthError extends Error {
  constructor(readonly code: SocketAuthErrorCode) {
    super(`socket connection refused: ${code}`);
    this.name = 'SocketAuthError';
  }
}

/**
 * Decides who is on the other end of a socket (spec 6, 12.2). Called on every connection and
 * reconnection; the identity it returns is the only identity the game server ever trusts.
 */
@Injectable()
export class SocketAuthService {
  private readonly secret: string;
  private readonly webOrigin: string;

  constructor(@Inject(SERVER_ENV) env: ServerEnv) {
    this.secret = env.SOCKET_TOKEN_SECRET;
    this.webOrigin = new URL(env.WEB_URL).origin;
  }

  /** Browsers always send Origin on a WebSocket handshake, so a missing one is refused too. */
  isAllowedOrigin(origin: string | undefined): boolean {
    return origin === this.webOrigin;
  }

  async authenticate({ origin, token }: HandshakeInput): Promise<SocketIdentity> {
    if (!this.isAllowedOrigin(origin)) throw new SocketAuthError('bad_origin');
    if (typeof token !== 'string' || token.length === 0) throw new SocketAuthError('invalid');
    try {
      return await verifySocketToken(token, this.secret);
    } catch (error) {
      if (error instanceof SocketTokenError) throw new SocketAuthError(error.code);
      throw error;
    }
  }
}
