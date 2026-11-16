// Every Better Auth endpoint (sign-up, sign-in, verify-email, reset-password, OAuth callbacks...)
// is served from /api/auth/*. Better Auth checks the Origin header on every POST (CSRF).
import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth';

export async function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}
