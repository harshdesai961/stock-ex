#!/usr/bin/env node
// pnpm bootstrap: one-command, repeatable local setup (docs/DEVELOPMENT.md section 4.4).
// Uses only Node built-ins so it runs before `pnpm install`. Safe to run any time.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createEnvFile, envExists, upgradeEnvFile } from './lib/env-file.mjs';
import { fail, hint, ok, step, warn } from './lib/log.mjs';
import { nodeMajor, requiredNodeMajor, requiredPnpm, ROOT, run, runOrExit } from './lib/run.mjs';

step('Checking tools');
if (nodeMajor() !== requiredNodeMajor()) {
  fail(
    `Node ${process.versions.node} is running, but .nvmrc asks for Node ${requiredNodeMajor()}.`,
  );
  hint(`Run: fnm install ${requiredNodeMajor()}; fnm use ${requiredNodeMajor()}`);
  process.exit(1);
}
ok(`Node ${process.versions.node}`);

const pnpm = run('pnpm', ['--version']);
if (pnpm.status !== 0 || pnpm.stdout !== requiredPnpm()) {
  fail(`pnpm ${pnpm.stdout || '(not found)'}; this repo pins pnpm ${requiredPnpm()}.`);
  hint(`Run: npm install -g pnpm@${requiredPnpm()}`);
  process.exit(1);
}
ok(`pnpm ${pnpm.stdout}`);

if (run('docker', ['info'], { timeout: 20_000 }).status !== 0) {
  fail('Docker is not running.');
  hint('Open Docker Desktop and wait for "Engine running", then run pnpm bootstrap again.');
  process.exit(1);
}
ok('Docker is running');

step('Environment file');
if (!envExists()) {
  createEnvFile();
  ok('Created .env from .env.example with fresh random secrets (values not shown).');
} else {
  const changed = upgradeEnvFile();
  if (changed.length === 0) {
    ok('.env already has every variable from .env.example.');
  } else {
    ok(`Updated .env (backup saved as .env.backup-*): ${changed.join(', ')}`);
  }
}

step('Starting Postgres and Redis');
runOrExit(
  'docker',
  ['compose', 'up', '-d', '--wait', '--wait-timeout', '120'],
  'docker compose up',
);
ok('Postgres and Redis are healthy');

step('Installing dependencies');
const frozen = existsSync(join(ROOT, 'pnpm-lock.yaml')) ? ['--frozen-lockfile'] : [];
runOrExit('pnpm', ['install', ...frozen], 'pnpm install');

step('Building shared packages');
runOrExit('pnpm', ['turbo', 'run', 'build', '--filter=./packages/*'], 'package build');

step('Preparing the database');
runOrExit('pnpm', ['--filter', '@stock-ex/db', 'db:roles'], 'creating the app database role');
runOrExit('pnpm', ['--filter', '@stock-ex/db', 'db:migrate'], 'migrations');
runOrExit('pnpm', ['--filter', '@stock-ex/db', 'db:seed'], 'seed');

step('Done');
ok('Run `pnpm dev`, then open http://localhost:3000');
warn('If anything looks wrong, run `pnpm healthcheck`.');
