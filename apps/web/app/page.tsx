import { COMPANIES } from '@stock-ex/engine';
import { formatRupees } from '@stock-ex/shared';
import Link from 'next/link';
import { CallTheMarket } from '@/components/call-the-market';
import { LiveBoard } from '@/components/live-board';
import { MarketProvider } from '@/components/market-context';
import { RoomPanel } from '@/components/room-panel';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { TickerTape } from '@/components/ticker-tape';

const HOST_STEPS = [
  { title: 'Pick a nickname', text: 'Up to 10 characters, or roll the 🎲. No sign-up needed.' },
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

const PERIOD_STEPS = [
  {
    icon: '🃏',
    title: 'Deal',
    text: 'Everyone secretly gets 10 cards. Most of them hint at how a company’s price will move.',
  },
  {
    icon: '🤝',
    title: 'Trade',
    text: 'Take turns around the table. Each player gets 3 turns: buy, sell, play a windfall card, or pass.',
  },
  {
    icon: '🎭',
    title: 'Reveal',
    text: 'All cards go face up. Chairmen and Directors can cancel a card, and Share Suspended can freeze a price.',
  },
  {
    icon: '📈',
    title: 'Settle',
    text: 'Each company moves by the total of its cards. Then a new period starts with fresh cards.',
  },
];

function Steps({ steps }: { steps: readonly { title: string; text: string }[] }) {
  return (
    <ol className="mt-4 space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-700 font-mono font-bold text-accent-400"
          >
            {index + 1}
          </span>
          <div>
            <h4 className="font-semibold">{step.title}</h4>
            <p className="text-sm text-ink-300">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FloatingIcons() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="float-slow absolute top-[12%] left-[4%] text-5xl opacity-20">🐂</span>
      <span className="float-slower absolute top-[70%] left-[10%] text-4xl opacity-20">🪙</span>
      <span className="float-slower absolute top-[8%] right-[6%] text-5xl opacity-20">🐻</span>
      <span className="float-slow absolute top-[60%] right-[3%] text-4xl opacity-20">📊</span>
      <span className="float-slow absolute top-[40%] left-[46%] text-3xl opacity-10">🕯️</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <MarketProvider>
      <SiteHeader />
      <main id="main" className="pb-12">
        <section className="hero-glow relative">
          <div className="grid-lines absolute inset-0" aria-hidden="true" />
          <FloatingIcons />
          <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
            <div>
              <p className="text-sm font-semibold tracking-wide text-accent-400 uppercase">
                The multiplayer trading card table
              </p>
              <h1 className="mt-2 text-6xl font-extrabold tracking-tight sm:text-7xl">
                stock<span className="text-windfall-400">-ex</span>
              </h1>
              <p className="mt-4 max-w-lg text-xl text-ink-300">
                Six companies. Ten secret cards. Read your hand, watch your rivals, and make your
                move before the big reveal.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2 text-sm">
                <li className="rounded-full border border-ink-700 px-3 py-1">2–6 players</li>
                <li className="rounded-full border border-ink-700 px-3 py-1">No dice</li>
                <li className="rounded-full border border-ink-700 px-3 py-1">No sign-up to play</li>
                <li className="rounded-full border border-ink-700 px-3 py-1">Play money only</li>
              </ul>
              <div className="mt-6 max-w-md">
                <RoomPanel />
              </div>
            </div>
            <div className="md:pt-8">
              <h2 className="mb-3 text-lg font-bold">
                The Big Board <span className="font-normal text-ink-300">· live demo</span>
              </h2>
              <LiveBoard />
            </div>
          </div>
        </section>

        <section id="practice" className="mx-auto max-w-4xl px-4 py-12">
          <h2 className="text-3xl font-bold">Call the Market</h2>
          <p className="mt-2 mb-5 text-ink-300">
            One quick round teaches the whole game. How long can you keep your streak going?
          </p>
          <CallTheMarket />
          <p className="mt-3 text-xs text-ink-300">
            A practice toy with play money. The real game has more to it: you buy and sell actual
            holdings over 3 turns, and you can only sell shares you own.
          </p>
        </section>

        <section id="get-started" className="border-y border-ink-700 bg-ink-900/50">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="text-3xl font-bold">Your first game</h2>
            <p className="mt-2 text-ink-300">Two ways in. Both take under a minute.</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-card border border-ink-700 bg-ink-900 p-5">
                <h3 className="text-xl font-bold">Host a room</h3>
                <Steps steps={HOST_STEPS} />
              </div>
              <div className="rounded-card border border-ink-700 bg-ink-900 p-5">
                <h3 className="text-xl font-bold">Join a friend’s room</h3>
                <Steps steps={JOIN_STEPS} />
              </div>
            </div>
          </div>
        </section>

        <section id="basics" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-3xl font-bold">The game in 60 seconds</h2>
          <p className="mt-2 max-w-2xl text-ink-300">
            Everyone starts with {formatRupees(600_000)} of play money. Agree how many Bargain
            Periods to play. Whoever ends with the most cash plus share value wins.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PERIOD_STEPS.map((step, index) => (
              <li key={step.title} className="rounded-card border border-ink-700 bg-ink-900 p-4">
                <p aria-hidden="true" className="text-3xl">
                  {step.icon}
                </p>
                <h3 className="mt-2 font-bold">
                  {index + 1}. {step.title}
                </h3>
                <p className="mt-1 text-sm text-ink-300">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-card border border-windfall-500 bg-ink-900 p-5">
            <h3 className="font-bold text-windfall-400">The trick that wins games</h3>
            <p className="mt-1 text-ink-300">
              Every company’s full set of cards adds up to exactly zero. So if your hand is packed
              with plus cards for Kuber Bank, the minus cards are more likely to be elsewhere. Your
              hand is a clue, not a promise, and other players’ trades are clues too.
            </p>
          </div>

          <h3 className="mt-8 text-xl font-bold">Meet the companies</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPANIES.map((company) => (
              <li
                key={company.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink-700 bg-ink-900 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{company.name}</p>
                  <p className="text-xs text-ink-300">
                    Biggest card ±₹{Math.max(...company.cardValues)}
                  </p>
                </div>
                <p className="font-mono font-bold text-accent-400">
                  {formatRupees(company.openingPrice)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-center gap-3 rounded-card border border-ink-700 bg-ink-800 p-6 text-center">
            <h3 className="text-xl font-bold">Want every rule, with examples?</h3>
            <p className="text-ink-300">
              Chairmen, Directors, windfall cards, insolvency and more, in plain language.
            </p>
            <Link
              href="/how-to-play"
              className="rounded-lg bg-accent-400 px-6 py-3 font-bold text-ink-950 hover:bg-windfall-400"
            >
              Read the full manual
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
