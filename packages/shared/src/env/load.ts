import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { z } from 'zod';

export class EnvValidationError extends Error {
  constructor(
    readonly appName: string,
    readonly problems: readonly string[],
  ) {
    super(
      `[${appName}] invalid environment:\n${problems.map((p) => `  - ${p}`).join('\n')}\n` +
        'Compare your .env with .env.example (see docs/DEVELOPMENT.md section 4.3).',
    );
    this.name = 'EnvValidationError';
  }
}

/** Walks up from `start` to the folder that holds pnpm-workspace.yaml. */
export function findRepoRoot(start: string = process.cwd()): string | undefined {
  let dir = start;
  for (;;) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- walks our own folder tree, no user input
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Loads the root .env into process.env using Node's built-in loader (no dotenv dependency).
 * Variables already set in the real environment win, so CI and hosting platforms
 * can inject values without a file. Returns whether a file was found.
 */
export function loadRootEnv(start?: string): boolean {
  const root = findRepoRoot(start);
  if (!root) return false;
  const file = join(root, '.env');
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed name in the repo root
  if (!existsSync(file)) return false;
  process.loadEnvFile(file);
  return true;
}

/** Turns Zod issues into "NAME: problem" lines. Values are never included. */
export function describeIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const name = issue.path.join('.') || '(root)';
    const problem =
      issue.code === 'invalid_type' && issue.input === undefined ? 'is missing' : issue.message;
    return `${name}: ${problem}`;
  });
}

/** Validates `source` against `schema`, throwing an EnvValidationError listing every problem. */
export function parseEnv<S extends z.ZodType>(
  appName: string,
  schema: S,
  source: Record<string, string | undefined> = process.env,
): z.infer<S> {
  const result = schema.safeParse(source);
  if (!result.success) throw new EnvValidationError(appName, describeIssues(result.error));
  return result.data;
}

/** Convenience for app entry points: load the root .env, validate, and exit(1) on failure. */
export function loadEnvOrExit<S extends z.ZodType>(appName: string, schema: S): z.infer<S> {
  loadRootEnv();
  try {
    return parseEnv(appName, schema);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}
