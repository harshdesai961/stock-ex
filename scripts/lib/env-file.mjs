// Creates and upgrades the root .env without ever printing a value.
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { ROOT } from './run.mjs';

export const ENV_PATH = join(ROOT, '.env');
export const EXAMPLE_PATH = join(ROOT, '.env.example');

/** 32 random bytes (spec 12.1 A04), URL-safe so it can sit inside connection strings. */
const secret = () => randomBytes(32).toString('base64url');
/** Passwords go inside URLs too; hex avoids characters that need escaping. */
const password = () => randomBytes(24).toString('hex');

const GENERATED = {
  POSTGRES_PASSWORD: password,
  APP_DB_PASSWORD: password,
  REDIS_PASSWORD: password,
  BETTER_AUTH_SECRET: secret,
  SOCKET_TOKEN_SECRET: secret,
};

/** Connection strings are built from the parts above so they always agree. */
// Host and port are kept from an existing URL (a teammate may have moved Postgres to 5433).
const DERIVED = {
  DATABASE_URL: (v) =>
    `postgresql://${v.APP_DB_USER}:${v.APP_DB_PASSWORD}@${hostOf(v.DATABASE_URL, 'localhost:5432')}/${v.POSTGRES_DB}`,
  DATABASE_MIGRATION_URL: (v) =>
    `postgresql://${v.POSTGRES_USER}:${v.POSTGRES_PASSWORD}@${hostOf(v.DATABASE_URL, 'localhost:5432')}/${v.POSTGRES_DB}`,
  REDIS_URL: (v) => `redis://:${v.REDIS_PASSWORD}@${hostOf(v.REDIS_URL, 'localhost:6379')}`,
};

function hostOf(url, fallback) {
  try {
    return new URL(url).host || fallback;
  } catch {
    return fallback;
  }
}

/** Keys in file order, so new keys are appended in the same order as .env.example. */
function exampleKeys() {
  return readFileSync(EXAMPLE_PATH, 'utf8')
    .split(/\r?\n/)
    .map((line) => /^([A-Z0-9_]+)=/.exec(line)?.[1])
    .filter(Boolean);
}

function valueFor(key, values, example) {
  if (GENERATED[key]) return GENERATED[key]();
  if (DERIVED[key]) return DERIVED[key](values);
  return example[key] ?? '';
}

/** First run: copy .env.example, replacing every CHANGE-ME with fresh random values. */
export function createEnvFile() {
  const template = readFileSync(EXAMPLE_PATH, 'utf8');
  const example = parseEnv(template);
  const values = { ...example };
  for (const key of Object.keys(GENERATED)) values[key] = GENERATED[key]();
  for (const key of Object.keys(DERIVED)) values[key] = DERIVED[key](values);

  const output = template
    .split(/\r?\n/)
    .map((line) => {
      const key = /^([A-Z0-9_]+)=/.exec(line)?.[1];
      return key && key in values ? `${key}=${values[key]}` : line;
    })
    .join('\n');
  writeFileSync(ENV_PATH, output, { encoding: 'utf8', mode: 0o600 });
}

/**
 * Existing .env: append keys a teammate added to .env.example, and move DATABASE_URL
 * from the owner role to the least-privilege app role (M0 change). A timestamped
 * backup (.env.backup-*, git-ignored) is written before any change.
 * Returns the list of keys that changed (names only).
 */
export function upgradeEnvFile() {
  const current = parseEnv(readFileSync(ENV_PATH, 'utf8'));
  const example = parseEnv(readFileSync(EXAMPLE_PATH, 'utf8'));
  const values = { ...example, ...current };
  const added = [];
  for (const key of exampleKeys()) {
    if (key in current) continue;
    values[key] = valueFor(key, values, example);
    added.push(key);
  }

  const replaced = [];
  const dbUser = safeUser(values.DATABASE_URL);
  if (dbUser && dbUser === values.POSTGRES_USER && values.APP_DB_USER && values.APP_DB_PASSWORD) {
    values.DATABASE_URL = DERIVED.DATABASE_URL(values);
    replaced.push('DATABASE_URL');
  }

  if (added.length === 0 && replaced.length === 0) return [];

  copyFileSync(ENV_PATH, `${ENV_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  let text = readFileSync(ENV_PATH, 'utf8');
  for (const key of replaced) {
    text = text.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${values[key]}`);
  }
  if (added.length > 0) {
    if (!text.endsWith('\n')) text += '\n';
    text += `\n# Added by pnpm bootstrap on ${new Date().toISOString().slice(0, 10)} (see .env.example)\n`;
    text += added.map((key) => `${key}=${values[key]}`).join('\n') + '\n';
  }
  writeFileSync(ENV_PATH, text, 'utf8');
  return [
    ...added.map((k) => `${k} (added)`),
    ...replaced.map((k) => `${k} (now uses the app role)`),
  ];
}

function safeUser(url) {
  try {
    return decodeURIComponent(new URL(url).username);
  } catch {
    return undefined;
  }
}

export const envExists = () => existsSync(ENV_PATH);

/** Reads .env for scripts that need the values in memory (never printed). */
export function readEnv() {
  return parseEnv(readFileSync(ENV_PATH, 'utf8'));
}
