// Queries on the profiles table, kept here so apps never need their own drizzle-orm import.
import { eq, isNull } from 'drizzle-orm';
import type { Db } from './client.js';
import { profiles } from './schema/profiles.js';

export type Profile = typeof profiles.$inferSelect;

/** Creates the profile for a new account; does nothing if it already exists. */
export async function createProfile(db: Db, userId: string, ageConfirmedAt: Date | null) {
  await db.insert(profiles).values({ userId, ageConfirmedAt }).onConflictDoNothing();
}

export async function getProfile(db: Db, userId: string): Promise<Profile | undefined> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return profile;
}

/** Records the 18+ confirmation (first time only; the original timestamp is kept). */
export async function confirmAge(db: Db, userId: string, at: Date = new Date()) {
  await db
    .insert(profiles)
    .values({ userId, ageConfirmedAt: at })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { ageConfirmedAt: at },
      setWhere: isNull(profiles.ageConfirmedAt),
    });
}

export async function touchProfile(db: Db, userId: string, at: Date = new Date()) {
  await db.update(profiles).set({ lastActiveAt: at }).where(eq(profiles.userId, userId));
}
