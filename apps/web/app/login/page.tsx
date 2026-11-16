import { ChartLine, History, Trophy, UserRound, type LucideIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth-card';
import { BoardPath } from '@/components/board-art';
import { SlideText } from '@/components/motion';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { enabledSocialProviders } from '@/lib/auth';
import { noticeFor } from '@/lib/auth-notices';
import { serverEnv } from '@/lib/env';
import { getSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Log in · stock-ex',
  description: 'Log in or create a free stock-ex account to keep your stats and match history.',
};

const PERKS: readonly { icon: LucideIcon; tile: string; text: string }[] = [
  { icon: ChartLine, tile: 'bg-tile-blue text-ink-100', text: 'Career stats and best net worth' },
  { icon: History, tile: 'bg-bear-500 text-ink-100', text: 'Match history and replays' },
  { icon: Trophy, tile: 'bg-tile-yellow text-ink-950', text: 'Leaderboards' },
  { icon: UserRound, tile: 'bg-bull-500 text-ink-950', text: 'Your avatar, saved' },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (session) redirect('/account');

  return (
    <>
      <SiteHeader />
      <main id="main" className="page-enter hill relative">
        <div className="relative mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-14">
          <div className="min-w-0">
            <p className="label text-sm uppercase">Player profile</p>
            <h1 className="mt-1 text-4xl uppercase sm:text-5xl">
              <SlideText text="Take your seat at the table" />
            </h1>
            <p className="mt-3 text-ink-100">
              Guests can play straight away. An account adds progress that sticks:
            </p>
            <ul className="stagger mt-4 grid gap-2 sm:grid-cols-2">
              {PERKS.map((perk) => {
                const Icon = perk.icon;
                return (
                  <li
                    key={perk.text}
                    className="flex items-center gap-3 rounded-xl border-2 border-ink-100/70 bg-ink-950/60 px-3 py-2 text-sm"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${perk.tile}`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    {perk.text}
                  </li>
                );
              })}
            </ul>
            <div className="panel mt-6 hidden p-3 md:block">
              <BoardPath className="h-auto w-full" />
            </div>
          </div>
          {/* On phones the form comes first, so nobody has to scroll to log in. */}
          <div className="order-first min-w-0 md:order-none">
            <AuthCard
              socialEnabled={enabledSocialProviders()}
              turnstileSiteKey={serverEnv().TURNSTILE_SITE_KEY}
              notice={noticeFor(params.error ?? params.notice)}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
