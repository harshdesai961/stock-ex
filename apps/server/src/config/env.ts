import type { ServerEnv } from '@stock-ex/shared/env';

/** DI token for the validated environment (parsed once in main.ts, before Nest starts). */
export const SERVER_ENV = Symbol('SERVER_ENV');

export type { ServerEnv };
