import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only rounded bg-accent-400 px-3 py-2 font-semibold text-ink-950 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3"
      >
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          stock<span className="text-windfall-400">-ex</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium sm:gap-5">
          <Link href="/#practice" className="hidden hover:text-accent-400 sm:inline">
            Practice
          </Link>
          <Link href="/#get-started" className="hidden hover:text-accent-400 sm:inline">
            Get started
          </Link>
          <Link href="/how-to-play" className="hover:text-accent-400">
            Manual
          </Link>
          <span className="rounded-lg border border-ink-700 px-3 py-1 text-ink-300">
            Log in · soon
          </span>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-700 px-4 py-8 text-center text-sm text-ink-300">
      <p className="mx-auto max-w-2xl">
        stock-ex is a game. All companies are fictional, in-game rupees are play money only and can
        never be bought or cashed out, and nothing here is investment advice.
      </p>
      <p className="mt-2">
        <Link href="/how-to-play" className="underline hover:text-accent-400">
          Read the manual
        </Link>
      </p>
    </footer>
  );
}
