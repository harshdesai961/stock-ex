import { randomBytes, randomInt } from 'node:crypto';
import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@stock-ex/shared';
import { Redis } from 'ioredis';
import { SERVER_ENV, type ServerEnv } from '../config/env.js';
import type { Outcome, RoomState } from './room-rules.js';

/** Compare-and-set: write (or delete, if ARGV[2] is empty) only if nobody changed the room. */
const CAS = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if ARGV[2] == '' then redis.call('DEL', KEYS[1]) else redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]) end
return 1`;
const MAX_ATTEMPTS = 5;

/** 5 characters from a 29-letter alphabet: about 20 million codes, picked with crypto. */
export function newRoomCode(): string {
  return Array.from({ length: ROOM_CODE_LENGTH }, () =>
    ROOM_CODE_ALPHABET.charAt(randomInt(ROOM_CODE_ALPHABET.length)),
  ).join('');
}

export function newMemberId(): string {
  return `m_${randomBytes(9).toString('base64url')}`;
}

/**
 * Live rooms in Redis (spec 6). Every change runs through `update`, which applies one rule at a
 * time per room: queued in this process, and compare-and-set across processes, so two clicks
 * on two servers can never both take the last seat. Keys expire after ROOM_TTL_SECONDS without
 * activity; every write renews them.
 */
@Injectable()
export class RoomStore implements OnApplicationShutdown {
  private readonly redis: Redis;
  private readonly ttl: number;
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(@Inject(SERVER_ENV) env: ServerEnv) {
    this.redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
    this.ttl = env.ROOM_TTL_SECONDS;
  }

  private key(code: string) {
    return `stockex:room:${code}`;
  }

  /** Saves a brand-new room; false if the code is already in use. */
  async create(room: RoomState): Promise<boolean> {
    const result = await this.redis.set(
      this.key(room.code),
      JSON.stringify(room),
      'EX',
      this.ttl,
      'NX',
    );
    return result === 'OK';
  }

  async get(code: string): Promise<RoomState | null> {
    const raw = await this.redis.get(this.key(code));
    return raw ? (JSON.parse(raw) as RoomState) : null;
  }

  /** Applies `rule` to the current room and saves the result, retrying if another server won. */
  update(code: string, rule: (room: RoomState) => Outcome): Promise<Outcome> {
    const previous = this.queues.get(code) ?? Promise.resolve();
    const next = previous.then(() => this.apply(code, rule));
    const tail = next.catch(() => undefined);
    this.queues.set(code, tail);
    void tail.then(() => {
      if (this.queues.get(code) === tail) this.queues.delete(code);
    });
    return next;
  }

  private async apply(code: string, rule: (room: RoomState) => Outcome): Promise<Outcome> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const raw = await this.redis.get(this.key(code));
      if (!raw)
        return {
          ok: false,
          error: { code: 'not_found', message: 'That room doesn’t exist or has closed.' },
        };
      const outcome = rule(JSON.parse(raw) as RoomState);
      if (!outcome.ok) return outcome;
      const written = outcome.room ? JSON.stringify(outcome.room) : '';
      if ((await this.redis.eval(CAS, 1, this.key(code), raw, written, this.ttl)) === 1)
        return outcome;
    }
    return {
      ok: false,
      error: { code: 'internal', message: 'The room is busy. Please try again.' },
    };
  }

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => undefined);
  }
}
