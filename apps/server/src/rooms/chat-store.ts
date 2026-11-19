import { randomBytes } from 'node:crypto';
import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { CHAT_HISTORY, type ChatMessage } from '@stock-ex/shared';
import { Redis } from 'ioredis';
import { SERVER_ENV, type ServerEnv } from '../config/env.js';

/** What a moderator needs to review a report. Kept apart from rooms, which expire sooner. */
export interface ChatReport {
  reportedAt: number;
  roomCode: string;
  message: ChatMessage;
  /** Account or guest id of the sender; null if they had already left the room. */
  senderIdentityId: string | null;
  reporterIdentityId: string;
}

const REPORTS_KEY = 'stockex:chat:reports';
const MAX_REPORTS = 1000;
const REPORT_TTL_SECONDS = 30 * 24 * 60 * 60;

export function newChatMessageId(): string {
  return `c_${randomBytes(9).toString('base64url')}`;
}

/**
 * Recent chat per room (the last CHAT_HISTORY messages, expiring with the room) and a capped
 * queue of reports for moderation.
 */
@Injectable()
export class ChatStore implements OnApplicationShutdown {
  private readonly redis: Redis;
  private readonly ttl: number;

  constructor(@Inject(SERVER_ENV) env: ServerEnv) {
    this.redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
    this.ttl = env.ROOM_TTL_SECONDS;
  }

  private key(code: string) {
    return `stockex:room:${code}:chat`;
  }

  async append(code: string, message: ChatMessage): Promise<void> {
    await this.redis
      .multi()
      .rpush(this.key(code), JSON.stringify(message))
      .ltrim(this.key(code), -CHAT_HISTORY, -1)
      .expire(this.key(code), this.ttl)
      .exec();
  }

  /** Oldest first. */
  async history(code: string): Promise<ChatMessage[]> {
    const raw = await this.redis.lrange(this.key(code), 0, -1);
    return raw.map((item) => JSON.parse(item) as ChatMessage);
  }

  async find(code: string, messageId: string): Promise<ChatMessage | undefined> {
    return (await this.history(code)).find((message) => message.id === messageId);
  }

  async clear(code: string): Promise<void> {
    await this.redis.del(this.key(code));
  }

  async report(report: ChatReport): Promise<void> {
    await this.redis
      .multi()
      .lpush(REPORTS_KEY, JSON.stringify(report))
      .ltrim(REPORTS_KEY, 0, MAX_REPORTS - 1)
      .expire(REPORTS_KEY, REPORT_TTL_SECONDS)
      .exec();
  }

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => undefined);
  }
}
