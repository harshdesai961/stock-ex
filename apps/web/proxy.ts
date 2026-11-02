import { type NextRequest, NextResponse } from 'next/server';

/**
 * Builds a strict, per-request Content-Security-Policy (spec 12.1 A02/A05).
 * A fresh random nonce lets Next.js's own scripts run while any injected
 * <script> without the nonce is blocked by the browser.
 */
export function buildCsp(nonce: string, options: { isDev: boolean; serverUrl: string }): string {
  const server = new URL(options.serverUrl);
  const socket = `${server.protocol === 'https:' ? 'wss:' : 'ws:'}//${server.host}`;
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.isDev ? ` 'unsafe-eval'` : ''}`,
    // Dev tooling injects inline styles; production styles carry the nonce.
    `style-src 'self' ${options.isDev ? `'unsafe-inline'` : `'nonce-${nonce}'`}`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self' ${server.origin} ${socket}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(options.isDev ? [] : ['upgrade-insecure-requests']),
  ];
  return directives.join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce, {
    isDev: process.env.NODE_ENV === 'development',
    serverUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000',
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
