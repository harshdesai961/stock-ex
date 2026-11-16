import { loadRootEnv, parseEnv, webEnvSchema, type WebEnv } from '@stock-ex/shared/env';

let cached: WebEnv | undefined;

/**
 * The validated web environment, for server code only (route handlers, server components,
 * the auth config). Reads the root .env once; real environment variables win.
 */
export function serverEnv(): WebEnv {
  if (!cached) {
    loadRootEnv();
    cached = parseEnv('web', webEnvSchema);
  }
  return cached;
}
