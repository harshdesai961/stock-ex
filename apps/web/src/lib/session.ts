import { getProfile as readProfile } from '@stock-ex/db';
import { headers } from 'next/headers';
import { cache } from 'react';
import { getAuth } from './auth';
import { getDb } from './db';

/**
 * The signed-in session for this request, or null. Server components and actions only.
 * Cached per request, so the header and the page can both ask without a second database read.
 */
export const getSession = cache(async () => getAuth().api.getSession({ headers: await headers() }));

/** The signed-in player's name, or undefined. A database hiccup counts as signed out. */
export async function signedInName(): Promise<string | undefined> {
  try {
    return (await getSession())?.user.name;
  } catch {
    return undefined;
  }
}

export function getProfile(userId: string) {
  return readProfile(getDb(), userId);
}
