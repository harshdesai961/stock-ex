import { z } from 'zod';

// Every app validates its own slice of the root .env at start-up (spec 11.1, OWASP A02).
// Error messages name the variable and the problem, never the value.

/** Values copied from .env.example that were never replaced. */
const PLACEHOLDER = /CHANGE-ME/i;

/** Optional variables are written as `KEY=` in .env; treat the empty string as "not set". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

/** ≥ 32 random bytes, i.e. ≥ 43 characters of base64url (spec 12.1 A04). */
export const secret = z
  .string()
  .min(43, 'must be at least 32 random bytes (43+ base64url characters)')
  .refine((v) => !PLACEHOLDER.test(v), 'still has the CHANGE-ME placeholder from .env.example');

/** Strict "true" / "false"; anything else is an error rather than silently false. */
export const booleanFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

const url = z.url();

const postgresUrl = z
  .url()
  .refine(
    (v) => v.startsWith('postgres://') || v.startsWith('postgresql://'),
    'must be a postgres:// URL',
  )
  .refine((v) => !PLACEHOLDER.test(v), 'still has the CHANGE-ME placeholder from .env.example');

const redisUrl = z
  .url()
  .refine((v) => v.startsWith('redis://') || v.startsWith('rediss://'), 'must be a redis:// URL')
  .refine((v) => !PLACEHOLDER.test(v), 'still has the CHANGE-ME placeholder from .env.example');

const port = z.coerce.number().int().min(1).max(65535);

export const commonEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export const dbEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_MIGRATION_URL: postgresUrl,
  APP_DB_USER: z
    .string()
    .regex(/^[a-z_][a-z0-9_]{0,62}$/, 'must be a lowercase Postgres role name'),
  APP_DB_PASSWORD: z
    .string()
    .min(16, 'must be at least 16 characters')
    .refine((v) => !PLACEHOLDER.test(v), 'still has the CHANGE-ME placeholder from .env.example'),
});

export const serverEnvSchema = commonEnvSchema.extend({
  DATABASE_URL: postgresUrl,
  REDIS_URL: redisUrl,
  WEB_URL: url,
  SERVER_HOST: z.string().min(1).default('127.0.0.1'),
  SERVER_PORT: port.default(4000),
  SOCKET_TOKEN_SECRET: secret,
  TRUST_PROXY: booleanFlag.default(false),
  ROOM_TTL_SECONDS: z.coerce.number().int().min(60).default(21600),
  SENTRY_DSN: optional(url),
  FEATURE_AI: booleanFlag.default(false),
});

export const webEnvSchema = commonEnvSchema.extend({
  DATABASE_URL: postgresUrl,
  WEB_URL: url,
  SERVER_URL: url,
  NEXT_PUBLIC_SERVER_URL: url,
  BETTER_AUTH_SECRET: secret,
  SOCKET_TOKEN_SECRET: secret,
  GOOGLE_CLIENT_ID: optional(z.string()),
  GOOGLE_CLIENT_SECRET: optional(z.string()),
  RESEND_API_KEY: optional(z.string()),
  TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  SENTRY_DSN: optional(url),
});

export const workerEnvSchema = commonEnvSchema.extend({
  REDIS_URL: redisUrl,
  FEATURE_AI: booleanFlag.default(false),
});

/** Variables docker-compose.yml reads; checked by `pnpm healthcheck`. */
export const composeEnvSchema = z.object({
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z
    .string()
    .min(16, 'must be at least 16 characters')
    .refine((v) => !PLACEHOLDER.test(v), 'still has the CHANGE-ME placeholder from .env.example'),
  POSTGRES_DB: z.string().min(1),
  REDIS_PASSWORD: z
    .string()
    .min(16, 'must be at least 16 characters')
    .refine((v) => !PLACEHOLDER.test(v), 'still has the CHANGE-ME placeholder from .env.example'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;
export type DbEnv = z.infer<typeof dbEnvSchema>;
