import { LogIn, UserRound } from 'lucide-react';
import Link from 'next/link';
import { signedInName } from '@/lib/session';
import { LogoMark } from './board-art';

export async function SiteHeader() {
  const name = await signedInName();
  return (
    <header className="sticky top-0 z-20 border-b-2 border-ink-100/15 bg-ink-900/95 backdrop-blur">
      <a
        href="#main"
        className="btn-game btn-primary sr-only px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3"
      >
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-xl tracking-wide text-sand-300 normal-case">
            stock-ex
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm sm:gap-5">
          <Link href="/#practice" className="hidden hover:text-accent-400 sm:inline">
            Practice
          </Link>
          <Link href="/#get-started" className="hidden hover:text-accent-400 sm:inline">
            Get started
          </Link>
          <Link href="/how-to-play" className="hover:text-accent-400">
            Manual
          </Link>
          {name ? (
            <Link href="/account" className="btn-game btn-ghost max-w-40 px-3 py-1.5 text-sm">
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{name}</span>
            </Link>
          ) : (
            <Link href="/login" className="btn-game btn-ghost px-3 py-1.5 text-sm">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

/** The year the project started; the copyright range runs from here to the current year. */
const FIRST_YEAR = 2026;

export function SiteFooter() {
  const year = new Date().getFullYear();
  const years = year > FIRST_YEAR ? `${FIRST_YEAR}–${year}` : String(FIRST_YEAR);
  return (
    <footer className="border-t-2 border-ink-100/15 bg-ink-950/40 px-4 pt-10 pb-8 text-sm text-ink-300">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-xl text-sand-300">stock-ex</span>
          </Link>
          <p className="mt-3 max-w-sm">
            A multiplayer trading board game. All companies are fictional, in-game rupees are play
            money only and can never be bought or cashed out, and nothing here is investment advice.
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="label uppercase">Play</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/#practice" className="hover:text-accent-400">
                Practice round
              </Link>
            </li>
            <li>
              <Link href="/how-to-play" className="hover:text-accent-400">
                How to play
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-accent-400">
                Log in
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="label uppercase">Credits</p>
          <p className="mt-2">
            Fonts: Fredoka and Nunito (SIL Open Font License). Icons: Lucide (ISC) and Simple Icons
            (CC0). Brand logos are trademarks of their owners and are used only to identify sign-in
            options.
          </p>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-2 border-t border-ink-100/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p>© {years} The stock-ex developers. All rights reserved.</p>
        <p className="text-xs">
          Original game design, artwork and rules text. Not affiliated with any real company or
          board game.
        </p>
      </div>
    </footer>
  );
}
