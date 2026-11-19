// POST /api/socket-token: a five-minute token the browser hands to the game server when it
// connects (spec 2, 6). Accounts are identified by their session cookie; guests send only a
// nickname and get an unguessable guest id kept in an httpOnly cookie, so a refresh or a
// reconnect gets the same seat back. The token goes in the response body, never in storage.
import { cleanDisplayName, GUEST_ID_PATTERN, guestTokenRequestSchema } from '@stock-ex/shared';
import {
  newGuestId,
  signSocketToken,
  SOCKET_TOKEN_TTL_SECONDS,
  type SocketIdentity,
} from '@stock-ex/shared/socket-token';
import { cookies } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { serverEnv } from '@/lib/env';

/** The request body is one short nickname; refuse anything bigger before parsing it. */
const MAX_BODY_BYTES = 256;
const GUEST_COOKIE_SECONDS = 24 * 60 * 60;
const NO_STORE = { 'Cache-Control': 'no-store' };

function fail(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

async function guestIdentity(request: Request, isProduction: boolean) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return fail(413, 'That request is too large.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail(400, 'Send a JSON body with a nickname.');
  }
  const parsed = guestTokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? 'Pick a valid nickname.');
  }

  // __Host- makes the browser refuse the cookie unless it is Secure, host-only and path=/.
  const name = isProduction ? '__Host-stock-ex.guest' : 'stock-ex.guest';
  const jar = await cookies();
  const existing = jar.get(name)?.value;
  const id = existing && GUEST_ID_PATTERN.test(existing) ? existing : newGuestId();
  jar.set(name, id, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: GUEST_COOKIE_SECONDS,
  });
  return { kind: 'guest', id, name: parsed.data.nickname } satisfies SocketIdentity;
}

export async function POST(request: Request) {
  const env = serverEnv();
  // Same check Better Auth makes on its POSTs: only our own pages may ask for a token.
  if (request.headers.get('origin') !== new URL(env.WEB_URL).origin) {
    return fail(403, 'Requests must come from the stock-ex site.');
  }

  const session = await getAuth().api.getSession({ headers: request.headers });
  const identity: SocketIdentity | Response = session
    ? { kind: 'user', id: session.user.id, name: cleanDisplayName(session.user.name) }
    : await guestIdentity(request, env.NODE_ENV === 'production');
  if (identity instanceof Response) return identity;

  const token = await signSocketToken(identity, env.SOCKET_TOKEN_SECRET);
  return Response.json(
    {
      token,
      expiresIn: SOCKET_TOKEN_TTL_SECONDS,
      identity: { kind: identity.kind, name: identity.name },
    },
    { headers: NO_STORE },
  );
}
