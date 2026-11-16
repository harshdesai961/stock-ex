import { ShieldCheck, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DisplayNameForm, SignOutButtons } from '@/components/account-controls';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getProfile, getSession } from '@/lib/session';
import { confirmAgeAction } from './actions';

export const metadata: Metadata = {
  title: 'Your account · stock-ex',
  robots: { index: false },
};

const DATE = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' });

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (!session) {
    // An expired verification link lands here with ?error=...; carry it to the login page.
    const error = typeof params.error === 'string' ? params.error : undefined;
    redirect(error ? `/login?${new URLSearchParams({ error }).toString()}` : '/login');
  }
  const { user } = session;
  const profile = await getProfile(user.id);
  const ageConfirmedAt = profile?.ageConfirmedAt ?? null;

  return (
    <>
      <SiteHeader />
      <main id="main" className="page-enter mx-auto max-w-3xl px-4 py-10">
        <p className="label text-sm uppercase">Player profile</p>
        <h1 className="mt-1 text-4xl break-words uppercase">Hello, {user.name}</h1>
        <p className="mt-2 text-ink-300">Member since {DATE.format(user.createdAt)}.</p>

        {ageConfirmedAt ? null : (
          <section aria-labelledby="age-heading" className="panel panel-accent mt-6 p-5">
            <h2 id="age-heading" className="flex items-center gap-2 text-xl text-sand-300">
              <TriangleAlert className="h-5 w-5 text-accent-400" aria-hidden="true" />
              One more step: confirm your age
            </h2>
            <p className="mt-2 text-sm text-ink-300">
              stock-ex accounts are for adults only. We just need your word; we never ask for a
              birth date.
            </p>
            <form action={confirmAgeAction} className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="ageConfirmed"
                  value="yes"
                  required
                  className="mt-0.5 h-5 w-5 shrink-0 accent-bull-500"
                />
                <span>I confirm I am 18 or older.</span>
              </label>
              <button type="submit" className="btn-game btn-primary px-4 py-2">
                Confirm
              </button>
            </form>
          </section>
        )}

        <section aria-labelledby="details-heading" className="panel mt-6 p-5">
          <h2 id="details-heading" className="text-xl text-sand-300">
            Your details
          </h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-ink-300">Email</dt>
            <dd className="flex flex-wrap items-center gap-2 break-all">
              {user.email}
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-bull-500 px-2 py-0.5 text-xs font-bold text-ink-950">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Confirmed
                </span>
              ) : null}
            </dd>
            <dt className="text-ink-300">Age confirmed</dt>
            <dd>{ageConfirmedAt ? DATE.format(ageConfirmedAt) : 'Not yet'}</dd>
          </dl>
          <div className="mt-5 border-t border-ink-700 pt-5">
            <DisplayNameForm current={user.name} />
          </div>
        </section>

        <section aria-labelledby="session-heading" className="panel mt-6 p-5">
          <h2 id="session-heading" className="text-xl text-sand-300">
            Signing out
          </h2>
          <p className="mt-1 mb-4 text-sm text-ink-300">
            Used a shared computer? Signing out on every device ends all your sessions at once.
          </p>
          <SignOutButtons />
        </section>

        <p className="mt-6 text-sm text-ink-300">
          Coming next: download your data, delete your account, stats and match history.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
