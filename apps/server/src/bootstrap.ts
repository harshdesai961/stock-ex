import 'reflect-metadata';
import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import type { ServerEnv } from './config/env.js';
import { PinoNestLogger } from './logger/logger.js';

/** Builds the hardened HTTP app. Shared by main.ts and the integration tests. */
export async function createApp(env: ServerEnv, logger: Logger): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env), {
    logger: new PinoNestLogger(logger),
    bufferLogs: true,
  });

  // Use X-Forwarded-For only behind a known proxy (spec 12.2 TRUST_PROXY).
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);
  app.disable('x-powered-by');
  app.use(helmet());
  // Only the web app's own origin may call the server from a browser (spec 12.1 A02).
  app.enableCors({ origin: [env.WEB_URL], credentials: true });
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  app.enableShutdownHooks();
  return app;
}
