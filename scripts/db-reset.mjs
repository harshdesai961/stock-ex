#!/usr/bin/env node
// pnpm db:reset: wipe the LOCAL database, then re-create roles, migrate and seed.
// Refuses unless both database URLs point at this machine.
import { envExists, readEnv } from './lib/env-file.mjs';
import { fail, ok, step } from './lib/log.mjs';
import { runOrExit } from './lib/run.mjs';

const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const isLocal = (url) => {
  try {
    return LOCAL.has(new URL(url).hostname);
  } catch {
    return false;
  }
};

if (!envExists()) {
  fail('No .env found. Run `pnpm bootstrap` first.');
  process.exit(1);
}
const env = { ...readEnv(), ...process.env };
for (const name of ['DATABASE_URL', 'DATABASE_MIGRATION_URL']) {
  if (!isLocal(env[name])) {
    fail(
      `Refusing to reset: ${name} does not point at localhost. db:reset is for local databases only.`,
    );
    process.exit(1);
  }
}

step('Resetting the local database');
runOrExit('pnpm', ['--filter', '@stock-ex/db', 'db:wipe'], 'wipe');
runOrExit('pnpm', ['--filter', '@stock-ex/db', 'db:roles'], 'roles');
runOrExit('pnpm', ['--filter', '@stock-ex/db', 'db:migrate'], 'migrate');
runOrExit('pnpm', ['--filter', '@stock-ex/db', 'db:seed'], 'seed');
ok('Local database reset.');
