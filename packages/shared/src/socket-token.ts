import { randomBytes } from 'node:crypto';
import { errors, jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { DISPLAY_NAME_MAX } from './auth.js';
import { GUEST_ID_PATTERN } from './guest.js';

// Socket tokens (spec 2, 6): the web app signs a short-lived token for whoever is on the page;
// the game server checks it on every connection and reconnection. It is the only place the
// server learns who someone is, so nothing in a socket message can claim a different identity.
// Server-only module (node:crypto, secrets): import it from "@stock-ex/shared/socket-token".

export const SOCKET_TOKEN_TTL_SECONDS = 5 * 60;
const ISSUER = 'stock-ex/web';
const AUDIENCE = 'stock-ex/server';
const ALGORITHM = 'HS256';
/** Our tokens are ~300 characters; anything far longer is junk and isn't worth parsing. */
const MAX_TOKEN_LENGTH = 2048;
/** Allowance for small clock differences between the web and game servers. */
const CLOCK_TOLERANCE_SECONDS = 5;

export const socketIdentitySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('user'),
    id: z
      .string()
      .min(1)
      .max(64)
      .refine((id) => !id.startsWith('g_'), 'not an account id'),
    name: z.string().min(1).max(DISPLAY_NAME_MAX),
  }),
  z.object({
    kind: z.literal('guest'),
    id: z.string().regex(GUEST_ID_PATTERN),
    name: z.string().min(1).max(DISPLAY_NAME_MAX),
  }),
]);

/** Who is on the other end of a socket: an account, or a guest with a nickname. */
export type SocketIdentity = z.infer<typeof socketIdentitySchema>;

const claimsSchema = z.object({
  sub: z.string(),
  kind: z.enum(['user', 'guest']),
  name: z.string(),
});

export type SocketTokenErrorCode = 'expired' | 'invalid';

/** Thrown for any token the server must not accept. The message never includes the token. */
export class SocketTokenError extends Error {
  constructor(readonly code: SocketTokenErrorCode) {
    super(code === 'expired' ? 'socket token expired' : 'socket token invalid');
    this.name = 'SocketTokenError';
  }
}

function keyFrom(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/** A fresh, unguessable guest id. */
export function newGuestId(): string {
  return `g_${randomBytes(16).toString('base64url')}`;
}

export async function signSocketToken(
  identity: SocketIdentity,
  secret: string,
  now: Date = new Date(),
): Promise<string> {
  const { id, kind, name } = socketIdentitySchema.parse(identity);
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ kind, name })
    .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
    .setSubject(id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SOCKET_TOKEN_TTL_SECONDS)
    .sign(keyFrom(secret));
}

export async function verifySocketToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): Promise<SocketIdentity> {
  if (token.length > MAX_TOKEN_LENGTH) throw new SocketTokenError('invalid');
  let payload: unknown;
  try {
    // Pinning the algorithm stops "alg: none" and algorithm-swap tricks.
    ({ payload } = await jwtVerify(token, keyFrom(secret), {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
      requiredClaims: ['sub', 'iat', 'exp'],
      maxTokenAge: SOCKET_TOKEN_TTL_SECONDS,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
      currentDate: now,
    }));
  } catch (error) {
    throw new SocketTokenError(error instanceof errors.JWTExpired ? 'expired' : 'invalid');
  }
  const claims = claimsSchema.safeParse(payload);
  if (!claims.success) throw new SocketTokenError('invalid');
  const identity = socketIdentitySchema.safeParse({
    kind: claims.data.kind,
    id: claims.data.sub,
    name: claims.data.name,
  });
  if (!identity.success) throw new SocketTokenError('invalid');
  return identity.data;
}
