import { loadEnvOrExit, serverEnvSchema } from '@stock-ex/shared/env';
import { createApp } from './bootstrap.js';
import { createLogger } from './logger/logger.js';

// Fail fast: refuse to start with a missing or weak setting (spec 11.1, 12.1 A02).
const env = loadEnvOrExit('server', serverEnvSchema);
const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV === 'development' });

const app = await createApp(env, logger);

// Unexpected failures are logged, then the process shuts down cleanly instead of
// limping on in an unknown state (spec 12.1 A10).
const fatal = (kind: string) => (error: unknown) => {
  logger.fatal({ err: error }, kind);
  void app.close().finally(() => process.exit(1));
};
process.on('unhandledRejection', fatal('unhandled promise rejection'));
process.on('uncaughtException', fatal('uncaught exception'));

await app.listen(env.SERVER_PORT, env.SERVER_HOST);
logger.info({ port: env.SERVER_PORT }, 'game server listening');
