import { getProfile as readProfile } from '@stock-ex/db';
import { headers } from 'next/headers';
import { getAuth } from './auth';
import { getDb } from './db';

/** The signed-in session for this request, or null. Server components and actions only. */
export async function getSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

export function getProfile(userId: string) {
  return readProfile(getDb(), userId);
}
