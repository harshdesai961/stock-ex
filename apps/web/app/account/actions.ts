'use server';

import { confirmAge } from '@stock-ex/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * Records the 18+ confirmation for an account made through Google and friends.
 * The user comes from the session cookie, never from the form (CLAUDE.md: identity).
 */
export async function confirmAgeAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (formData.get('ageConfirmed') !== 'yes') return;
  await confirmAge(getDb(), session.user.id);
  revalidatePath('/account');
}
