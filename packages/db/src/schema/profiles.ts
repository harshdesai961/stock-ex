// App-owned data about an account, kept apart from Better Auth's tables (spec section 7).
// The display name lives in users.name (Better Auth requires it), so it isn't copied here.
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth.js';

export const profiles = pgTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /**
   * When the person ticked "I am 18 or older" (spec section 8). Null for an account made
   * through Google and friends until they confirm on their account page.
   */
  ageConfirmedAt: timestamp('age_confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
});
