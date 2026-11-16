import { createDb, type Db } from '@stock-ex/db';
import { serverEnv } from './env';

// One small pool per server process. In development Next.js re-evaluates modules on every
// edit, so the pool is parked on globalThis instead of opening a new one each time.
const globalForDb = globalThis as unknown as { stockExDb?: ReturnType<typeof createDb> };

export function getDb(): Db {
  globalForDb.stockExDb ??= createDb(serverEnv().DATABASE_URL, { max: 5 });
  return globalForDb.stockExDb.db;
}
