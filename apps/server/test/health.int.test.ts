import type { INestApplication } from '@nestjs/common';
import { loadRootEnv, parseEnv, serverEnvSchema } from '@stock-ex/shared/env';
import { pino } from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';

// Runs against the real Postgres and Redis (local Docker or CI service containers).
describe('GET /health', () => {
  let app: INestApplication;
  let baseUrl: string;
  let webOrigin: string;

  beforeAll(async () => {
    loadRootEnv();
    const env = parseEnv('server-test', serverEnvSchema);
    webOrigin = new URL(env.WEB_URL).origin;
    app = await createApp(env, pino({ level: 'silent' }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports Postgres and Redis as up', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', checks: { postgres: 'up', redis: 'up' } });
  });

  it('sends hardening headers and hides the framework', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
  });

  it('allows CORS only for the web origin', async () => {
    const allowed = await fetch(`${baseUrl}/health`, { headers: { origin: webOrigin } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe(webOrigin);
    const denied = await fetch(`${baseUrl}/health`, {
      headers: { origin: 'https://evil.example' },
    });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns a generic body for unknown routes', async () => {
    const res = await fetch(`${baseUrl}/does-not-exist`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('NOT_FOUND');
    expect(JSON.stringify(body)).not.toMatch(/stack|at .*\.js/);
  });
});
