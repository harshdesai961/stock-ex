import { Writable } from 'node:stream';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { REDACT_PATHS } from './logger.js';

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const logger = pino({ redact: { paths: REDACT_PATHS, censor: '[redacted]' } }, stream);
  return { logger, lines };
}

describe('log redaction', () => {
  it('never writes passwords, tokens, emails or auth headers', () => {
    const { logger, lines } = capture();
    logger.info(
      {
        req: { headers: { authorization: 'Bearer abc.def', cookie: 'sid=123' } },
        user: { email: 'someone@example.com', password: 'hunter22', token: 'tok_123' },
        email: 'top@example.com',
      },
      'login attempt',
    );
    const output = lines.join('');
    for (const secret of [
      'abc.def',
      'sid=123',
      'someone@example.com',
      'hunter22',
      'tok_123',
      'top@example.com',
    ]) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain('[redacted]');
    expect(output).toContain('login attempt');
  });
});
