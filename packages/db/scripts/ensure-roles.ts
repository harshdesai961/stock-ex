// Creates (or updates) the least-privilege app role. Idempotent; safe to run any time.
//
// Two roles (spec section 7, OWASP A02/A08):
//   migration role = the Compose superuser in local dev; owns the schema and runs DDL.
//   app role       = what the web app and game server connect as: read/write rows, no DDL.
import postgres from 'postgres';
import { dbEnv, run } from './_env.js';

run('db:roles', async () => {
  const env = dbEnv();
  const sql = postgres(env.DATABASE_MIGRATION_URL, { max: 1, onnotice: () => undefined });
  try {
    const role = env.APP_DB_USER;
    const [{ exists } = { exists: false }] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${role}) AS exists`;

    // Role names and passwords can't be bound as query parameters in DDL, so we let
    // Postgres quote them with format(%I identifier, %L literal) instead of concatenating.
    const [{ stmt } = { stmt: '' }] = await sql<{ stmt: string }[]>`
      SELECT format(${exists ? 'ALTER ROLE %I WITH LOGIN PASSWORD %L' : 'CREATE ROLE %I WITH LOGIN PASSWORD %L'},
                    ${role}::text, ${env.APP_DB_PASSWORD}::text) AS stmt`;
    await sql.unsafe(stmt);

    const [who] = await sql<{ db: string; owner: string }[]>`
      SELECT current_database() AS db, current_user AS owner`;
    if (!who) throw new Error('could not read the current database and user');
    const { db, owner } = who;
    const grants = await sql<{ s: string }[]>`
      SELECT unnest(ARRAY[
        format('ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', ${role}::text),
        format('GRANT CONNECT ON DATABASE %I TO %I', ${db}::text, ${role}::text),
        format('REVOKE CREATE ON SCHEMA public FROM PUBLIC'),
        format('GRANT USAGE ON SCHEMA public TO %I', ${role}::text),
        format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', ${role}::text),
        format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', ${role}::text),
        format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', ${owner}::text, ${role}::text),
        format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', ${owner}::text, ${role}::text)
      ]) AS s`;
    for (const { s } of grants) await sql.unsafe(s);

    console.log(
      `[db:roles] app role "${role}" ${exists ? 'updated' : 'created'} with data-only privileges.`,
    );
  } finally {
    await sql.end();
  }
});
