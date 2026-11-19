import { COMPANIES } from '@stock-ex/engine';
import { formatRupees } from '@stock-ex/shared';
import {
  ArrowRight,
  BookOpen,
  ChartCandlestick,
  Coins,
  Handshake,
  Layers,
  Lightbulb,
  Scale,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { BoardPath, GameToken } from '@/components/board-art';
import { CallTheMarket } from '@/components/call-the-market';
import { LiveBoard } from '@/components/live-board';
import { MarketProvider } from '@/components/market-context';
import { SlideText } from '@/components/motion';
import { RoomPanel } from '@/components/room-panel';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { TickerTape } from '@/components/ticker-tape';
import { signedInName } from '@/lib/session';

const HOST_STEPS = [
  {
    title: 'Pick a nickname',
    text: 'Up to 10 characters, or roll the dice for one. No sign-up needed.',
  },
  {
    title: 'Create a private game',
    text: 'You become the host and get a 5-character room code and an invite link.',
  },
  {
    title: 'Invite your table',
    text: 'Share the code or link. Short of people? Add bots to fill the seats.',
  },
  {
    title: 'Open the Market',
    text: 'Choose how many Bargain Periods to play, then press Open the Market. A short countdown starts the game.',
  },
];

const JOIN_STEPS = [
  { title: 'Pick a nickname', text: 'It must be different from everyone else at that table.' },
  {
    title: 'Enter the room code',
    text: 'Type the 5-character code and press Join, or just open the invite link.',
  },
  {
    title: 'Take your seat',
    text: 'You appear in the lobby. Rather watch? Spectators can see the public table too.',
  },
  {
    title: 'Wait for the host',
    text: 'The game begins when your host opens the market. Your 10 cards arrive straight away.',
  },
];

const PERIOD_STEPS: readonly { icon: LucideIcon; tile: string; title: string; text: string }[] = [
  {
    icon: Layers,
    tile: 'bg-tile-blue text-ink-100',
    title: 'Deal',
    text: 'Everyone secretly gets 10 cards. Most of them hint at how a company’s price will move.',
  },
  {
    icon: Handshake,
    tile: 'bg-bear-500 text-ink-100',
    title: 'Trade',
    text: 'Take turns around the table. Each player gets 3 turns: buy, sell, play a windfall card, or pass.',
  },
  {
    icon: Scale,
    tile: 'bg-tile-orange text-ink-950',
    title: 'Reveal',
    text: 'All cards go face up. Chairmen and Directors can cancel a card, and Share Suspended can freeze a price.',
  },
  {
    icon: TrendingUp,
    tile: 'bg-bull-500 text-ink-950',
    title: 'Settle',
    text: 'Each company moves by the total of its cards. Then a new period starts with fresh cards.',
  },
];

/** Board-tile colours for numbered steps and company tiles, cycled in order. */
const TILES = [
  'bg-tile-blue text-ink-100',
  'bg-bear-500 text-ink-100',
  'bg-tile-orange text-ink-950',
  'bg-tile-yellow text-ink-950',
  'bg-bull-500 text-ink-950',
  'bg-ink-100 text-ink-950',
] as const;
const tileAt = (index: number) => TILES.at(index % TILES.length) ?? TILES[0];

function Steps({ steps }: { steps: readonly { title: string; text: string }[] }) {
  return (
    <ol className="mt-4 space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span
            aria-hidden="true"
            className={`font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink-100 text-lg ${tileAt(index)}`}
          >
            {index + 1}
          </span>
          <div>
            <h4 className="font-display text-lg">{step.title}</h4>
            <p className="text-sm text-ink-300">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FloatingIcons() {
  const icon = 'absolute h-12 w-12 text-ink-100 opacity-[0.07]';
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <TrendingUp className={`float-slow top-[10%] left-[3%] ${icon}`} />
      <Coins className={`float-slower top-[72%] left-[8%] ${icon}`} />
      <TrendingDown className={`float-slower top-[6%] right-[5%] ${icon}`} />
      <ChartCandlestick className={`float-slow top-[62%] right-[2%] ${icon}`} />
    </div>
  );
}

function Kicker({ children }: { children: string }) {
  return <p className="label text-sm uppercase">{children}</p>;
}

export default async function HomePage() {
  return (
    <MarketProvider>
      <SiteHeader />
      <main id="main" className="page-enter pb-12">
        <section className="hill relative">
          <FloatingIcons />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 md:grid-cols-2 md:py-14">
            <div className="min-w-0">
              <Kicker>The multiplayer trading board game</Kicker>
              <h1 className="mt-2 text-6xl font-bold normal-case sm:text-7xl">
                <SlideText text="stock-ex" />
              </h1>
              <p className="mt-4 max-w-lg text-xl text-ink-100">
                Six companies. Ten secret cards. Read your hand, watch your rivals, and make your
                move before the big reveal.
              </p>
              <ul className="stagger mt-5 flex flex-wrap gap-2">
                {['2–6 players', 'No dice', 'No sign-up to play', 'Play money only'].map(
                  (chip, index) => (
                    <li
                      key={chip}
                      className={`font-display rounded-lg border-2 border-ink-100 px-3 py-0.5 text-sm ${tileAt(index)}`}
                    >
                      {chip}
                    </li>
                  ),
                )}
              </ul>
              <div className="mt-6 max-w-md">
                <RoomPanel signedInAs={await signedInName()} />
              </div>
            </div>
            <div className="min-w-0">
              <div className="panel p-3">
                <BoardPath className="h-auto w-full" />
              </div>
              <div className="panel mt-6 p-4">
                <h2 className="mb-3 flex items-baseline justify-between gap-2 text-lg uppercase">
                  The Big Board
                  <span className="font-body text-xs font-semibold tracking-normal text-ink-300 normal-case">
                    live demo
                  </span>
                </h2>
                <LiveBoard />
              </div>
            </div>
          </div>
        </section>

        <section id="practice" className="mx-auto max-w-4xl px-4 py-12">
          <Kicker>Mini-game · Level 1</Kicker>
          <h2 className="text-3xl uppercase">Call the Market</h2>
          <p className="mt-2 mb-5 text-ink-300">
            One quick round teaches the whole game. How long can you keep your streak going?
          </p>
          <div data-reveal>
            <CallTheMarket />
          </div>
          <p className="mt-3 text-xs text-ink-300">
            A practice toy with play money. The real game has more to it: you buy and sell actual
            holdings over 3 turns, and you can only sell shares you own.
          </p>
        </section>

        <section id="get-started" className="border-y-2 border-ink-100/15 bg-ink-950/40">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <Kicker>Tutorial</Kicker>
            <h2 className="text-3xl uppercase">Your first game</h2>
            <p className="mt-2 text-ink-300">Two ways in. Both take under a minute.</p>
            <div data-reveal className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="panel p-5">
                <h3 className="text-2xl text-sand-300">Host a room</h3>
                <Steps steps={HOST_STEPS} />
              </div>
              <div className="panel p-5">
                <h3 className="text-2xl text-sand-300">Join a friend’s room</h3>
                <Steps steps={JOIN_STEPS} />
              </div>
            </div>
          </div>
        </section>

        <section id="basics" className="mx-auto max-w-6xl px-4 py-12">
          <Kicker>How it works</Kicker>
          <h2 className="text-3xl uppercase">The game in 60 seconds</h2>
          <p className="mt-2 max-w-2xl text-ink-300">
            Everyone starts with {formatRupees(600_000)} of play money. Agree how many Bargain
            Periods to play. Whoever ends with the most cash plus share value wins.
          </p>
          <ol data-reveal className="stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PERIOD_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="panel p-4">
                  <span
                    aria-hidden="true"
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink-100 ${step.tile}`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </span>
                  <h3 className="mt-3 text-xl text-sand-300">
                    {index + 1}. {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink-300">{step.text}</p>
                </li>
              );
            })}
          </ol>

          <div data-reveal className="card-white lift mt-6 flex gap-4 p-5">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tile-yellow"
            >
              <Lightbulb className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <div>
              <h3 className="text-xl">The trick that wins games</h3>
              <p className="mt-1 text-ink-950/80">
                Every company’s full set of cards adds up to exactly zero. So if your hand is packed
                with plus cards for Kuber Bank, the minus cards are more likely to be elsewhere.
                Your hand is a clue, not a promise, and other players’ trades are clues too.
              </p>
            </div>
          </div>

          <h3 className="mt-10 text-2xl text-sand-300">Meet the companies</h3>
          <ul data-reveal className="stagger mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPANIES.map((company, index) => (
              <li
                key={company.id}
                className="flex items-stretch overflow-hidden rounded-xl border-2 border-ink-100/80 bg-ink-950/70"
              >
                <span aria-hidden="true" className={`w-3 shrink-0 ${tileAt(index)}`} />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg">{company.name}</p>
                    <p className="text-xs text-ink-300">
                      Biggest card ±₹{Math.max(...company.cardValues)}
                    </p>
                  </div>
                  <p className="font-display text-xl text-accent-400">
                    {formatRupees(company.openingPrice)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div
            data-reveal
            className="panel panel-accent mt-10 flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-left"
          >
            <GameToken className="h-16 w-12 shrink-0" />
            <div className="flex-1">
              <h3 className="text-2xl text-sand-300">Want every rule, with examples?</h3>
              <p className="text-ink-300">
                Chairmen, Directors, windfall cards, insolvency and more, in plain language.
              </p>
            </div>
            <Link href="/how-to-play" className="btn-game btn-primary px-6 py-3">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              Read the full manual
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
      <div className="h-10" aria-hidden="true" />
      <TickerTape />
    </MarketProvider>
  );
}
