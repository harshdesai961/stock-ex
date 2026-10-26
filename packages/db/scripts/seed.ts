// Local-development sample data. Refuses to run against anything but localhost.
import { isLocalDatabaseUrl } from '../src/safety.js';
import { dbEnv, run } from './_env.js';

run('db:seed', async () => {
  const env = dbEnv();
  if (!isLocalDatabaseUrl(env.DATABASE_URL)) {
    throw new Error('seed data is for local development only; DATABASE_URL is not localhost.');
  }
  // No tables exist until M2, so there is nothing to seed yet.
  console.log('[db:seed] nothing to seed yet (tables arrive in M2).');
  return Promise.resolve();
});
