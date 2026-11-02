import { dbEnvSchema, loadRootEnv, parseEnv } from '@stock-ex/shared/env';
import { defineConfig } from 'drizzle-kit';

loadRootEnv();
// drizzle-kit (generate, studio) connects as the migration role, which owns the schema.
const env = parseEnv('drizzle-kit', dbEnvSchema);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: { url: env.DATABASE_MIGRATION_URL },
  strict: true,
  verbose: true,
});
