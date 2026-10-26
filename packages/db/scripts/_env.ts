import { dbEnvSchema, EnvValidationError, loadRootEnv, parseEnv } from '@stock-ex/shared/env';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));

/** Loads and validates the database variables, exiting with a readable list on failure. */
export function dbEnv() {
  loadRootEnv();
  try {
    return parseEnv('db', dbEnvSchema);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

/** Runs a script body, printing a one-line error (no stack, no connection string) on failure. */
export function run(name: string, body: () => Promise<void>): void {
  body().then(
    () => process.exit(0),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${name}] failed: ${message}`);
      process.exit(1);
    },
  );
}
