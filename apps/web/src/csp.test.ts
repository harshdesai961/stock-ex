import { describe, expect, it } from 'vitest';
import { buildCsp } from '../proxy.js';

describe('buildCsp', () => {
  const prod = buildCsp('abc123', { isDev: false, serverUrl: 'https://api.example.com' });

  it('only lets scripts with the per-request nonce run', () => {
    expect(prod).toContain(`script-src 'self' 'nonce-abc123' 'strict-dynamic'`);
    expect(prod).not.toContain('unsafe-inline');
    expect(prod).not.toContain('unsafe-eval');
  });

  it('allows the game server over HTTPS and secure WebSockets only', () => {
    expect(prod).toContain('connect-src ');
    expect(prod).toContain('https://api.example.com');
    expect(prod).toContain('wss://api.example.com');
  });

  it('blocks framing, plugins and base-tag hijacking', () => {
    for (const directive of [`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`]) {
      expect(prod).toContain(directive);
    }
  });

  it('relaxes only what Next.js dev tooling needs in development', () => {
    const dev = buildCsp('n', { isDev: true, serverUrl: 'http://localhost:4000' });
    expect(dev).toContain(`'unsafe-eval'`);
    expect(dev).toContain('ws://localhost:4000');
    expect(dev).not.toContain('upgrade-insecure-requests');
  });
});
