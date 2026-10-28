import type { NextConfig } from 'next';
import { loadEnvOrExit, webEnvSchema } from '@stock-ex/shared/env';

// Next.js only reads .env files from apps/web; we keep one root .env for the whole repo
// and validate it here so `next dev` / `next build` fail fast on a bad setting.
const env = loadEnvOrExit('web', webEnvSchema);

// The Content-Security-Policy itself is per-request (it carries a nonce), so it lives in proxy.ts.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: securityHeaders }]);
  },
};

export default nextConfig;
