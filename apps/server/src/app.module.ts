import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SERVER_ENV, type ServerEnv } from './config/env.js';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';

@Module({})
export class AppModule {
  /** The environment is validated before Nest starts and handed in here, so DI never sees raw process.env. */
  static forRoot(env: ServerEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        // HTTP rate limit per IP (spec 12.2). Socket limits are added with the gateway in M2.
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
      ],
      controllers: [HealthController],
      providers: [
        { provide: SERVER_ENV, useValue: env },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        HealthService,
      ],
    };
  }
}
