// Prints {"onDisk":N,"applied":M} so `pnpm healthcheck` can tell whether migrations are pending.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import { dbEnv, MIGRATIONS_DIR, run } from './_env.js';

interface Journal {
  entries: unknown[];
}

run('db:status', async () => {
  const env = dbEnv();
  const journalPath = join(MIGRATIONS_DIR, 'meta', '_journal.json');
  const onDisk = existsSync(journalPath)
    ? (JSON.parse(readFileSync(journalPath, 'utf8')) as Journal).entries.length
    : 0;

  const sql = postgres(env.DATABASE_MIGRATION_URL, { max: 1, onnotice: () => undefined });
  try {
    const [{ present } = { present: false }] = await sql<{ present: boolean }[]>`
      SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`;
    const applied = present
      ? Number(
          (await sql<{ n: string }[]>`SELECT count(*) AS n FROM drizzle.__drizzle_migrations`)[0]
            ?.n ?? 0,
        )
      : 0;
    console.log(JSON.stringify({ onDisk, applied }));
  } finally {
    await sql.end();
  }
});
