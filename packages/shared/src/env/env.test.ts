import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseEnv } from './load.js';
import { serverEnvSchema, workerEnvSchema } from './schema.js';

const SECRET = 'a'.repeat(43);

const validServer = {
  DATABASE_URL: 'postgresql://stockex_app:pw@localhost:5432/stockex_dev',
  REDIS_URL: 'redis://:pw@localhost:6379',
  WEB_URL: 'http://localhost:3000',
  SOCKET_TOKEN_SECRET: SECRET,
};

describe('parseEnv', () => {
  it('accepts a valid server environment and applies defaults', () => {
    const env = parseEnv('server', serverEnvSchema, validServer);
    expect(env.SERVER_PORT).toBe(4000);
    expect(env.FEATURE_AI).toBe(false);
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.ROOM_TTL_SECONDS).toBe(21600);
  });

  it('names every missing variable', () => {
    try {
      parseEnv('server', serverEnvSchema, {});
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const message = (error as EnvValidationError).message;
      for (const name of ['DATABASE_URL', 'REDIS_URL', 'WEB_URL', 'SOCKET_TOKEN_SECRET']) {
        expect(message).toContain(`${name}: is missing`);
      }
    }
  });

  it('rejects short secrets and CHANGE-ME placeholders without echoing the value', () => {
    const run = (value: string) =>
      parseEnv('server', serverEnvSchema, { ...validServer, SOCKET_TOKEN_SECRET: value });
    expect(() => run('short')).toThrow(/SOCKET_TOKEN_SECRET: must be at least 32 random bytes/);
    const placeholder = `CHANGE-ME-${'x'.repeat(40)}`;
    try {
      run(placeholder);
      expect.unreachable();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('CHANGE-ME placeholder');
      expect(message).not.toContain(placeholder);
    }
  });

  it('treats feature flags strictly', () => {
    expect(
      parseEnv('worker', workerEnvSchema, { REDIS_URL: validServer.REDIS_URL, FEATURE_AI: 'true' })
        .FEATURE_AI,
    ).toBe(true);
    expect(() =>
      parseEnv('worker', workerEnvSchema, { REDIS_URL: validServer.REDIS_URL, FEATURE_AI: 'yes' }),
    ).toThrow(/FEATURE_AI/);
  });

  it('treats an empty optional value as unset', () => {
    const env = parseEnv('server', serverEnvSchema, { ...validServer, SENTRY_DSN: '' });
    expect(env.SENTRY_DSN).toBeUndefined();
  });
});
