import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip.js';
import { WindowCounter } from './rate-limit.js';

describe('WindowCounter', () => {
  it('counts within a window and starts again after it', () => {
    let now = 1_000_000;
    const counter = new WindowCounter({ max: 3, windowSeconds: 10 }, () => now);
    expect([counter.hit(), counter.hit(), counter.hit(), counter.hit()]).toEqual([1, 2, 3, 4]);
    now += 9_999;
    expect(counter.hit()).toBe(5);
    now += 1;
    expect(counter.hit()).toBe(1);
  });
});

describe('clientIp', () => {
  const handshake = (forwarded?: string | string[]) => ({
    address: '10.0.0.9',
    headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
  });

  it('ignores X-Forwarded-For unless TRUST_PROXY is on', () => {
    expect(clientIp(handshake('1.2.3.4'), false)).toBe('10.0.0.9');
  });

  it('trusts only the entry our proxy appended (the last one)', () => {
    expect(clientIp(handshake('6.6.6.6, 203.0.113.7'), true)).toBe('203.0.113.7');
    expect(clientIp(handshake(['6.6.6.6', '203.0.113.8']), true)).toBe('203.0.113.8');
  });

  it('falls back to the socket address when the header is missing or empty', () => {
    expect(clientIp(handshake(), true)).toBe('10.0.0.9');
    expect(clientIp(handshake(''), true)).toBe('10.0.0.9');
  });
});
