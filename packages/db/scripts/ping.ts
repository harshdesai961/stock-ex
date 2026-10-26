// Connects as the app role (DATABASE_URL) and checks it is least-privilege.
// Prints {"connected":true,"canCreate":false} for `pnpm healthcheck`.
import postgres from 'postgres';
import { dbEnv, run } from './_env.js';

run('db:ping', async () => {
  const env = dbEnv();
  const sql = postgres(env.DATABASE_URL, { max: 1, connect_timeout: 5, onnotice: () => undefined });
  try {
    await sql`SELECT 1`;
    const [row] = await sql<{ canCreate: boolean }[]>`
      SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS "canCreate"`;
    // No row would be unexpected; report it as "can create" so the healthcheck fails loudly.
    console.log(JSON.stringify({ connected: true, canCreate: row?.canCreate ?? true }));
  } finally {
    await sql.end();
  }
});
