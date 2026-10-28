import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { createDb } from '@stock-ex/db';
import { Redis } from 'ioredis';
import { withTimeout } from '../common/with-timeout.js';
import { SERVER_ENV, type ServerEnv } from '../config/env.js';

export type CheckStatus = 'up' | 'down';
export interface HealthReport {
  status: 'ok' | 'degraded';
  checks: { postgres: CheckStatus; redis: CheckStatus };
}

const CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService implements OnApplicationShutdown {
  private readonly sql;
  private readonly redis;

  constructor(@Inject(SERVER_ENV) env: ServerEnv) {
    this.sql = createDb(env.DATABASE_URL, { max: 1 }).sql;
    this.redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: CHECK_TIMEOUT_MS,
    });
  }

  async check(): Promise<HealthReport> {
    const [postgres, redis] = await Promise.all([
      this.probe(async () => {
        await this.sql`SELECT 1`;
      }, 'postgres'),
      this.probe(async () => {
        if (this.redis.status === 'wait') await this.redis.connect();
        await this.redis.ping();
      }, 'redis'),
    ]);
    return {
      status: postgres === 'up' && redis === 'up' ? 'ok' : 'degraded',
      checks: { postgres, redis },
    };
  }

  private async probe(fn: () => Promise<void>, label: string): Promise<CheckStatus> {
    try {
      await withTimeout(fn(), CHECK_TIMEOUT_MS, label);
      return 'up';
    } catch {
      return 'down';
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.sql.end({ timeout: 2 }), this.redis.quit()]);
  }
}
