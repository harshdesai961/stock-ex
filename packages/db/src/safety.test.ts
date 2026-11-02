import { describe, expect, it } from 'vitest';
import { isLocalDatabaseUrl } from './safety.js';

describe('isLocalDatabaseUrl', () => {
  it.each([
    'postgresql://u:p@localhost:5432/db',
    'postgresql://u:p@127.0.0.1:5432/db',
    'postgresql://u:p@[::1]:5432/db',
  ])('accepts %s', (url) => {
    expect(isLocalDatabaseUrl(url)).toBe(true);
  });

  it.each([
    'postgresql://u:p@db.example.com:5432/db',
    'postgresql://u:p@localhost.evil.com:5432/db',
    'postgresql://u:p@10.0.0.5:5432/db',
    'not a url',
  ])('rejects %s', (url) => {
    expect(isLocalDatabaseUrl(url)).toBe(false);
  });
});
