// Drops every table in the local database. Called by `pnpm db:reset`, which then
// re-runs roles, migrations and seeds. Refuses on any non-local database.
import postgres from 'postgres';
import { isLocalDatabaseUrl } from '../src/safety.js';
import { dbEnv, run } from './_env.js';

run('db:wipe', async () => {
  const env = dbEnv();
  for (const [name, url] of [
    ['DATABASE_URL', env.DATABASE_URL],
    ['DATABASE_MIGRATION_URL', env.DATABASE_MIGRATION_URL],
  ] as const) {
    if (!isLocalDatabaseUrl(url))
      throw new Error(`refusing to wipe: ${name} does not point at localhost.`);
  }
  const sql = postgres(env.DATABASE_MIGRATION_URL, { max: 1, onnotice: () => undefined });
  try {
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await sql`DROP SCHEMA IF EXISTS public CASCADE`;
    await sql`CREATE SCHEMA public`;
    console.log('[db:wipe] local database emptied.');
  } finally {
    await sql.end();
  }
});
