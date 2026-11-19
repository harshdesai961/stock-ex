import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { SERVER_ENV, type ServerEnv } from '../config/env.js';

export interface Limit {
  max: number;
  windowSeconds: number;
}

/** Starting points from spec 12.2. Chat, room and bot limits arrive with those slices. */
export const LIMITS = {
  /** New socket connections per IP. Shared across servers (Redis). */
  connectionsPerIp: { max: 40, windowSeconds: 60 },
  /** Events from one socket. Kept in memory: a socket lives on one server. */
  eventsPerSocket: { max: 60, windowSeconds: 10 },
  /** Events from one person across all their tabs and servers (Redis). */
  eventsPerUser: { max: 120, windowSeconds: 10 },
} as const satisfies Record<string, Limit>;

/** A socket sending this many times its limit in one window is disconnected. */
export const ABUSE_MULTIPLIER = 2;

/** Fixed-window counter for one socket; no Redis round trip on the hot path. */
export class WindowCounter {
  private windowStart = 0;
  private count = 0;

  constructor(
    private readonly limit: Limit,
    private readonly now: () => number = Date.now,
  ) {}

  /** Counts one event and returns how many have arrived in the current window. */
  hit(): number {
    const time = this.now();
    if (time - this.windowStart >= this.limit.windowSeconds * 1000) {
      this.windowStart = time;
      this.count = 0;
    }
    this.count += 1;
    return this.count;
  }
}

/** Fixed-window counters in Redis, so limits hold across every game-server instance. */
@Injectable()
export class RateLimitService implements OnApplicationShutdown {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly redis: Redis;

  constructor(@Inject(SERVER_ENV) env: ServerEnv) {
    this.redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
    this.redis.on('error', () => {
      // Logged per failed call below; this handler just stops ioredis printing every retry.
    });
  }

  /**
   * Counts one hit for `key` and says whether it is within the limit. If Redis is unreachable
   * the hit is allowed (the per-socket limit still applies) rather than locking everyone out.
   */
  async allow(key: string, limit: Limit): Promise<boolean> {
    const redisKey = `stockex:rl:${key}`;
    try {
      const results = await this.redis
        .multi()
        .incr(redisKey)
        .expire(redisKey, limit.windowSeconds, 'NX')
        .exec();
      const count = Number(results?.[0]?.[1] ?? 0);
      return count <= limit.max;
    } catch {
      this.logger.warn('rate limit store unavailable; allowing request');
      return true;
    }
  }

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => undefined);
  }
}
