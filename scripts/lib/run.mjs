import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = join(import.meta.dirname, '..', '..');

/**
 * Runs a command and returns { status, stdout, stderr }.
 * `shell` is needed on Windows so `pnpm` / `docker` resolve to their .cmd/.exe shims;
 * arguments here are fixed strings from our own scripts, never user input.
 */
export function run(command, args = [], options = {}) {
  const windows = process.platform === 'win32';
  // With a shell, Node wants one command string (DEP0190); safe because args are our own constants.
  const result = spawnSync(windows ? [command, ...args].join(' ') : command, windows ? [] : args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: windows,
    stdio: options.inherit ? 'inherit' : 'pipe',
    env: options.env ?? process.env,
    timeout: options.timeout ?? 0,
  });
  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
}

/** Runs a command with live output; exits the script if it fails. */
export function runOrExit(command, args, label) {
  const { status } = run(command, args, { inherit: true });
  if (status !== 0) {
    console.error(
      `\n${label} failed (exit ${status}). Fix the error above, then run the command again.`,
    );
    process.exit(status);
  }
}

export const nodeMajor = () => Number(process.versions.node.split('.')[0]);
export const requiredNodeMajor = () => Number(readFileSync(join(ROOT, '.nvmrc'), 'utf8').trim());
export const requiredPnpm = () =>
  JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).packageManager.replace(/^pnpm@/, '');
