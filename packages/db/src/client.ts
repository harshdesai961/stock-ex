import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export interface DbOptions {
  /** Max pooled connections. Keep small: managed Postgres plans have low limits. */
  max?: number;
}

/**
 * Creates a Drizzle client. Apps connect with DATABASE_URL (the app role:
 * read/write data, no DDL); only migration scripts use DATABASE_MIGRATION_URL.
 * All queries go through Drizzle's query builder, which always parameterises values.
 */
export function createDb(url: string, options: DbOptions = {}) {
  const sql = postgres(url, {
    max: options.max ?? 10,
    connect_timeout: 5,
    idle_timeout: 30,
    onnotice: () => undefined,
  });
  return { db: drizzle(sql, { schema }), sql };
}

export type Db = ReturnType<typeof createDb>['db'];
