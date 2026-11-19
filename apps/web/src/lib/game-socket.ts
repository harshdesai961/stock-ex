'use client';

import {
  SOCKET_TRANSPORTS,
  type ClientToServerEvents,
  type ConnectRefusal,
  type ServerToClientEvents,
} from '@stock-ex/shared';
import { io, type Socket } from 'socket.io-client';

// One connection to the game server per browser tab, shared by every page (spec 2, 6).
// Each connection attempt fetches a fresh 5-minute token from /api/socket-token; the token
// lives only in memory here and is never written to storage.

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const NICKNAME_KEY = 'stock-ex.nickname';
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

/** A guest's nickname for this tab. Not personal data, and never a token. */
export function savedNickname(): string {
  try {
    return sessionStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function rememberNickname(nickname: string) {
  try {
    sessionStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    // Private mode or blocked storage: the nickname is asked for again on the next page.
  }
}

/** Why the last token request failed, in words the player can act on. */
let tokenProblem = '';

async function fetchToken(): Promise<string | undefined> {
  tokenProblem = '';
  try {
    const response = await fetch('/api/socket-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: savedNickname() }),
    });
    const body = (await response.json()) as { token?: string; error?: string };
    if (!response.ok || !body.token) {
      tokenProblem = body.error ?? 'We couldn’t sign you in to the game server.';
      return undefined;
    }
    return body.token;
  } catch {
    tokenProblem = 'We couldn’t reach stock-ex. Check your connection and try again.';
    return undefined;
  }
}

const REFUSALS = new Map<string, string>([
  ['bad_origin', 'The game server didn’t recognise this site.'],
  ['invalid', 'The game server couldn’t check who you are. Refresh the page and try again.'],
  ['rate_limited', 'Too many connections from your network. Wait a minute, then try again.'],
]);
const UNREACHABLE = 'We couldn’t reach the game server. Try again in a moment.';

let socket: GameSocket | undefined;

export function gameSocket(): GameSocket {
  socket ??= io(SERVER_URL, {
    transports: [...SOCKET_TRANSPORTS],
    autoConnect: false,
    // Called before every connection attempt, so a reconnect always carries a fresh token.
    auth: (send) => {
      void fetchToken().then((token) => {
        send(token ? { token } : {});
      });
    },
  });
  return socket;
}

/** Connects (if needed). Rejects with a message to show the player. */
export function connectGameSocket(): Promise<GameSocket> {
  const client = gameSocket();
  if (client.connected) return Promise.resolve(client);
  return new Promise((resolve, reject) => {
    let retried = false;
    const cleanUp = () => {
      client.off('connect', onConnect);
      client.off('connect_error', onError);
    };
    const onConnect = () => {
      cleanUp();
      resolve(client);
    };
    const onError = (error: Error & { data?: { code?: ConnectRefusal } }) => {
      const code = error.data?.code;
      // An expired pass only needs a fresh token; the auth callback fetches one on retry.
      if (code === 'expired' && !retried) {
        retried = true;
        client.connect();
        return;
      }
      cleanUp();
      client.disconnect();
      const refusal = code ? REFUSALS.get(code) : undefined;
      reject(new Error(tokenProblem || (refusal ?? UNREACHABLE)));
    };
    client.on('connect', onConnect);
    client.on('connect_error', onError);
    client.connect();
  });
}
