#!/usr/bin/env node
// pnpm healthcheck: prints a pass/fail checklist of the local setup (docs/DEVELOPMENT.md 4.5).
// Reports variable NAMES only; never prints a value from .env.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { envExists, readEnv } from './lib/env-file.mjs';
import { fail, hint, ok, step, warn } from './lib/log.mjs';
import { redisPing } from './lib/redis-ping.mjs';
import { nodeMajor, requiredNodeMajor, requiredPnpm, ROOT, run } from './lib/run.mjs';

let failures = 0;
const check = (passed, message, fix) => {
  if (passed) ok(message);
  else {
    failures++;
    fail(message);
    if (fix) hint(fix);
  }
};

step('Tools');
check(
  nodeMajor() === requiredNodeMajor(),
  `Node ${process.versions.node} (need ${requiredNodeMajor()}.x)`,
  `fnm install ${requiredNodeMajor()}; fnm use ${requiredNodeMajor()}`,
);
const pnpm = run('pnpm', ['--version']);
check(
  pnpm.stdout === requiredPnpm(),
  `pnpm ${pnpm.stdout || 'missing'} (need ${requiredPnpm()})`,
  `npm install -g pnpm@${requiredPnpm()}`,
);
const docker = run('docker', ['info'], { timeout: 20_000 }).status === 0;
check(docker, 'Docker is running', 'Open Docker Desktop and wait for "Engine running".');
const gitleaks = run('gitleaks', ['version']).status === 0;
check(
  gitleaks,
  'gitleaks installed (pre-commit secret scan)',
  'winget install --id Gitleaks.Gitleaks  /  brew install gitleaks',
);

step('Environment');
const hasEnv = envExists();
check(hasEnv, '.env exists', 'Run `pnpm bootstrap` to create it.');
const sharedDist = join(ROOT, 'packages', 'shared', 'dist', 'env', 'index.js');
let env = {};
if (hasEnv && existsSync(sharedDist)) {
  env = readEnv();
  const shared = await import(pathToFileURL(sharedDist).href);
  const schemas = {
    'docker-compose': shared.composeEnvSchema,
    database: shared.dbEnvSchema,
    server: shared.serverEnvSchema,
    web: shared.webEnvSchema,
    'ai-worker': shared.workerEnvSchema,
  };
  for (const [name, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(env);
    check(
      result.success,
      `.env is valid for ${name}`,
      result.success ? undefined : shared.describeIssues(result.error).join('; '),
    );
  }
  let dbUser = '';
  try {
    dbUser = decodeURIComponent(new URL(env.DATABASE_URL).username);
  } catch {
    // reported by the schema check above
  }
  check(
    dbUser !== '' && dbUser !== env.POSTGRES_USER,
    'Apps connect as the least-privilege app role (not the owner role)',
    'Run `pnpm bootstrap`; it moves DATABASE_URL to APP_DB_USER.',
  );
} else if (hasEnv) {
  check(false, '.env can be validated', 'Shared packages are not built yet: run `pnpm bootstrap`.');
}

step('Services');
if (docker && hasEnv) {
  const ping = run('pnpm', ['--silent', '--filter', '@stock-ex/db', 'db:ping'], {
    timeout: 30_000,
  });
  let pg = {};
  try {
    pg = JSON.parse(ping.stdout.split('\n').pop() ?? '{}');
  } catch {
    // not JSON: connection failed
  }
  check(
    pg.connected === true,
    'Postgres reachable as the app role',
    ping.stderr || 'Run `docker compose up -d`, then `pnpm bootstrap`.',
  );
  if (pg.connected)
    check(
      pg.canCreate === false,
      'App role cannot change the schema (no DDL)',
      'Run `pnpm --filter @stock-ex/db db:roles`.',
    );

  check(
    await redisPing(env.REDIS_URL ?? ''),
    'Redis answers PING with the configured password',
    'Check REDIS_URL matches REDIS_PASSWORD; run `docker compose up -d`.',
  );

  const status = run('pnpm', ['--silent', '--filter', '@stock-ex/db', 'db:status'], {
    timeout: 30_000,
  });
  try {
    const { onDisk, applied } = JSON.parse(status.stdout.split('\n').pop() ?? '');
    check(
      applied === onDisk,
      `Migrations up to date (${applied}/${onDisk} applied)`,
      'Run `pnpm db:migrate`.',
    );
  } catch {
    check(false, 'Migration status readable', status.stderr || 'Run `pnpm bootstrap`.');
  }
} else {
  warn('Skipping service checks (needs Docker and .env).');
}

console.log('');
if (failures === 0) {
  ok('Everything looks good. Run `pnpm dev`.');
} else {
  fail(
    `${failures} check(s) failed. Fix them from the top down; the first one often causes the rest.`,
  );
  process.exit(1);
}
