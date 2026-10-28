// Applies committed migrations as the migration role. Never edit a merged migration.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { dbEnv, MIGRATIONS_DIR, run } from './_env.js';

run('db:migrate', async () => {
  const env = dbEnv();
  if (!existsSync(join(MIGRATIONS_DIR, 'meta', '_journal.json'))) {
    console.log('[db:migrate] no migrations yet; nothing to apply.');
    return;
  }
  const sql = postgres(env.DATABASE_MIGRATION_URL, { max: 1, onnotice: () => undefined });
  try {
    await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_DIR });
    console.log('[db:migrate] database is up to date.');
  } finally {
    await sql.end();
  }
});
