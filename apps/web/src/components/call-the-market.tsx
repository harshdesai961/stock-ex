'use client';

import { formatNumber, formatRupees, formatSignedRupees } from '@stock-ex/shared';
import { Check, Flame, Minus, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  dealRound,
  LOTS,
  nextRank,
  settleCall,
  STARTING_BANK,
  sum,
  titleFor,
  type Call,
  type PracticeRound,
  type Settlement,
} from '@/lib/practice';

const REVEAL_MS = 500;
const BEST_KEY = 'stock-ex.practice.best-streak';

// Only a display convenience, so losing it (private window, blocked storage) is harmless.
function readBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(best: number): void {
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Nothing to do: the best streak just won't be remembered.
  }
}

function PriceCard({
  value,
  mine,
  ticker,
  dealt = false,
}: {
  value: number;
  mine: boolean;
  ticker: string;
  dealt?: boolean;
}) {
  const up = value > 0;
  const Arrow = up ? TrendingUp : TrendingDown;
  const tone = up ? 'text-bull-700' : 'text-bear-500';
  return (
    <li
      className={`${dealt ? 'deal-in' : 'card-flip'} lift relative flex h-28 w-20 flex-col overflow-hidden rounded-xl border-2 border-ink-100 bg-ink-100 shadow-[0_5px_0_rgb(0_0_0/0.25)] sm:h-32 sm:w-24`}
    >
      <span
        className={`font-display px-1.5 py-0.5 text-center text-[11px] tracking-wider ${up ? 'bg-bull-500 text-ink-950' : 'bg-bear-500 text-ink-100'}`}
      >
        {ticker}
      </span>
      <span
        aria-hidden="true"
        className={`font-display absolute top-6 left-1.5 text-[11px] leading-none ${tone}`}
      >
        {up ? '▲' : '▼'}
      </span>
      <span className="flex flex-1 flex-col items-center justify-center gap-0.5">
        <Arrow className={`h-6 w-6 ${tone}`} strokeWidth={2.5} aria-hidden="true" />
        <span className={`font-display text-xl ${tone}`}>{formatSignedRupees(value)}</span>
      </span>
      <span
        aria-hidden="true"
        className={`font-display absolute right-1.5 bottom-1 rotate-180 text-[11px] leading-none ${tone}`}
      >
        {up ? '▲' : '▼'}
      </span>
      {mine ? <span className="sr-only">(your card)</span> : null}
    </li>
  );
}

function HiddenCard() {
  return (
    <li className="card-back lift flex h-28 w-20 items-center justify-center rounded-xl border-2 border-ink-100 shadow-[0_5px_0_rgb(0_0_0/0.25)] sm:h-32 sm:w-24">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink-100 bg-tile-yellow text-ink-950"
      >
        <TrendingUp className="h-5 w-5" strokeWidth={3} />
      </span>
      <span className="sr-only">Hidden card</span>
    </li>
  );
}

function LevelBar({ bank }: { bank: number }) {
  const next = nextRank(Math.max(0, bank));
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-ink-300">
        <span className="font-display tracking-wider uppercase">
          {next ? `Next rank: ${next.title}` : 'Top rank reached'}
        </span>
        {next ? <span className="font-mono">{formatRupees(next.atLeast)}</span> : null}
      </div>
      <progress
        className="xp-bar mt-1"
        value={next ? Math.max(0, bank) : 1}
        max={next ? next.atLeast : 1}
        aria-label={next ? `Progress to ${next.title}` : 'Top rank reached'}
      />
    </div>
  );
}

type Phase = 'idle' | 'dealt' | 'revealing' | 'settled';

interface Stats {
  bank: number;
  streak: number;
  best: number;
  wins: number;
  plays: number;
}

const FRESH_STATS: Stats = { bank: STARTING_BANK, streak: 0, best: 0, wins: 0, plays: 0 };

function lessonFor(round: PracticeRound): string {
  const hand = sum(round.yours);
  const table = sum(round.table);
  if (hand === 0) {
    return `Your hand cancelled out, so everything came down to the ${formatSignedRupees(table)} on the table.`;
  }
  if (hand > 0 === table > 0 || table === 0) {
    return `Your hand (${formatSignedRupees(hand)}) pointed the right way and the table (${formatSignedRupees(table)}) agreed.`;
  }
  return `Your hand said ${formatSignedRupees(hand)} but the table held ${formatSignedRupees(table)}. In a real game, other traders' buys and sells are your clue to what they hold.`;
}

export function CallTheMarket() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState<PracticeRound | null>(null);
  const [call, setCall] = useState<Call>('bull');
  const [result, setResult] = useState<Settlement | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [lot, setLot] = useState<number>(LOTS[0]);
  const [prices, setPrices] = useState<ReadonlyMap<string, number>>(new Map());
  const [stats, setStats] = useState(FRESH_STATS);
  const firstAction = useRef<HTMLButtonElement>(null);

  const priceOf = (id: string, opening: number) => prices.get(id) ?? opening;

  // Turn the table's cards over one at a time, then pay out.
  useEffect(() => {
    if (phase !== 'revealing' || !round || !result) return;
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(
      () => {
        const next = revealed + 1;
        setRevealed(next);
        if (next < round.table.length) return;
        setPrices((current) => new Map(current).set(round.company.id, result.newPrice));
        setStats((current) => {
          const won = result.outcome === 'win';
          const streak = won ? current.streak + 1 : result.outcome === 'flat' ? current.streak : 0;
          const best = Math.max(current.best, streak);
          if (best > current.best) saveBest(best);
          return {
            bank: current.bank + result.profit,
            streak,
            best,
            wins: current.wins + (won ? 1 : 0),
            plays: current.plays + 1,
          };
        });
        setPhase('settled');
      },
      instant ? 0 : REVEAL_MS,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [phase, revealed, round, result]);

  // The button that was just pressed has gone, so move keyboard focus to the next action.
  useEffect(() => {
    if (phase === 'dealt' || phase === 'settled')
      firstAction.current?.focus({ preventScroll: true });
  }, [phase]);

  const deal = () => {
    setRound(dealRound(Math.random, (company) => priceOf(company.id, company.openingPrice) > 0));
    setResult(null);
    setRevealed(0);
    setStats((current) => ({ ...current, best: Math.max(current.best, readBest()) }));
    setPhase('dealt');
  };

  const makeCall = (choice: Call) => {
    if (!round) return;
    const price = priceOf(round.company.id, round.company.openingPrice);
    setCall(choice);
    setResult(settleCall(price, round.movement, choice, lot));
    setRevealed(0);
    setPhase('revealing');
  };

  const restart = () => {
    setPrices(new Map());
    setStats((current) => ({ ...FRESH_STATS, best: current.best }));
    setRound(null);
    setResult(null);
    setPhase('idle');
  };

  const bankrupt = stats.bank <= 0;
  const price = round ? priceOf(round.company.id, round.company.openingPrice) : 0;
  const shownCards = round ? round.table.slice(0, revealed) : [];
  const runningMove = round ? sum(round.yours) + sum(shownCards) : 0;
  const settled = phase === 'settled' && result !== null && round !== null;

  return (
    <div className="panel p-4 sm:p-6">
      <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <div className="rounded-md border border-bull-500/25 bg-ink-950/60 p-2">
          <dt className="font-display text-xs tracking-wider text-ink-300 uppercase">
            Practice bank
          </dt>
          <dd className="font-mono font-bold text-accent-400">{formatRupees(stats.bank)}</dd>
        </div>
        <div className="rounded-md border border-bull-500/25 bg-ink-950/60 p-2">
          <dt className="font-display text-xs tracking-wider text-ink-300 uppercase">Rank</dt>
          <dd className="font-bold">{titleFor(stats.bank)}</dd>
        </div>
        <div className="rounded-md border border-bull-500/25 bg-ink-950/60 p-2">
          <dt className="font-display text-xs tracking-wider text-ink-300 uppercase">Streak</dt>
          <dd className="font-mono font-bold">
            {stats.streak >= 3 ? (
              <Flame className="mr-1 inline h-4 w-4 text-tile-orange" aria-hidden="true" />
            ) : null}
            {stats.streak}
          </dd>
        </div>
        <div className="rounded-md border border-bull-500/25 bg-ink-950/60 p-2">
          <dt className="font-display text-xs tracking-wider text-ink-300 uppercase">
            Best streak
          </dt>
          <dd className="font-mono font-bold">{stats.best}</dd>
        </div>
      </dl>
      <LevelBar bank={stats.bank} />

      {phase === 'idle' || !round ? (
        <div className="py-10 text-center">
          <p className="mx-auto max-w-md text-ink-300">
            You get three cards for one company. Three more are hidden with other traders. Add up
            what you can see, then call it: will the price rise or fall?
          </p>
          <button
            type="button"
            onClick={deal}
            className="btn-game btn-primary mt-5 px-8 py-3 text-lg"
          >
            Deal me in
          </button>
        </div>
      ) : (
        <div className="pop-in mt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xl font-bold">{round.company.name}</h3>
            <p className="font-mono text-ink-300">
              Price now <span className="font-bold text-ink-100">{formatRupees(price)}</span>
            </p>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-ink-300">
                Your cards · signal {formatSignedRupees(sum(round.yours))}
              </h4>
              <ul className="flex gap-2">
                {round.yours.map((value, index) => (
                  <PriceCard key={index} value={value} mine dealt ticker={round.company.ticker} />
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-ink-300">Other traders&apos; cards</h4>
              <ul className="flex gap-2">
                {round.table.map((value, index) =>
                  index < revealed ? (
                    <PriceCard
                      key={index}
                      value={value}
                      mine={false}
                      ticker={round.company.ticker}
                    />
                  ) : (
                    <HiddenCard key={index} />
                  ),
                )}
              </ul>
            </div>
          </div>

          {phase === 'dealt' ? (
            <div className="mt-5">
              <div
                role="group"
                aria-label="How many shares to stake"
                className="flex items-center justify-center gap-2"
              >
                <span className="text-sm text-ink-300">Stake</span>
                {LOTS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={lot === size}
                    onClick={() => {
                      setLot(size);
                    }}
                    className={`cursor-pointer rounded-lg border px-3 py-1 font-mono text-sm ${lot === size ? 'border-accent-400 bg-ink-700 font-bold' : 'border-ink-700 bg-ink-800 hover:bg-ink-700'}`}
                  >
                    {size / 1000}K
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  ref={firstAction}
                  type="button"
                  onClick={() => {
                    makeCall('bull');
                  }}
                  className="btn-game btn-bull py-3"
                >
                  ▲ Bull: it will rise
                </button>
                <button
                  type="button"
                  onClick={() => {
                    makeCall('bear');
                  }}
                  className="btn-game btn-bear py-3"
                >
                  ▼ Bear: it will fall
                </button>
              </div>
            </div>
          ) : null}

          {phase === 'revealing' ? (
            <p className="mt-5 text-center font-mono text-lg">
              Running total {formatSignedRupees(runningMove)}
            </p>
          ) : null}

          <div aria-live="polite">
            {settled ? (
              <div
                className={`pop-in mt-5 rounded-lg border bg-ink-950/70 p-4 text-center ${result.outcome === 'win' ? 'border-bull-500' : result.outcome === 'lose' ? 'border-bear-500' : 'border-ink-700'}`}
              >
                <p
                  className={`bounce-in font-display text-4xl font-bold uppercase ${result.outcome === 'win' ? 'text-leaf-400' : result.outcome === 'lose' ? 'text-bear-400' : 'text-ink-300'}`}
                >
                  {result.outcome === 'win' ? 'Win' : result.outcome === 'lose' ? 'Loss' : 'Flat'}
                  {stats.streak >= 2 && result.outcome === 'win' ? (
                    <span className="ml-3 align-middle text-lg text-accent-400">
                      Combo ×{stats.streak}
                    </span>
                  ) : null}
                </p>
                <p className="text-lg font-bold">
                  {result.outcome === 'win' ? (
                    <>
                      <Check className="mr-1 inline h-5 w-5 text-bull-400" aria-hidden="true" />
                      Good call!{' '}
                    </>
                  ) : null}
                  {result.outcome === 'lose' ? (
                    <>
                      <X className="mr-1 inline h-5 w-5 text-bear-400" aria-hidden="true" />
                      Wrong way.{' '}
                    </>
                  ) : null}
                  {result.outcome === 'flat' ? (
                    <>
                      <Minus className="mr-1 inline h-5 w-5" aria-hidden="true" />
                      No change.{' '}
                    </>
                  ) : null}
                  {round.company.ticker} moved {formatSignedRupees(result.change)} to{' '}
                  {formatRupees(result.newPrice)}
                </p>
                <p className="mt-1 font-mono">
                  You called {call === 'bull' ? '▲ Bull' : '▼ Bear'} on {formatNumber(lot)} shares:{' '}
                  {formatSignedRupees(result.profit)}
                </p>
                <p className="mt-2 text-sm text-ink-300">{lessonFor(round)}</p>
                {result.newPrice === 0 ? (
                  <p className="mt-2 text-sm text-accent-400">
                    {round.company.name} hit ₹0 and is now insolvent, so it sits out until you
                    restart.
                  </p>
                ) : null}
                {bankrupt ? (
                  <p className="mt-2 text-sm font-semibold text-bear-400">
                    Your practice bank is empty. It&apos;s only play money, so start again.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap justify-center gap-3">
                  {!bankrupt ? (
                    <button
                      ref={firstAction}
                      type="button"
                      onClick={deal}
                      className="btn-game btn-primary px-6 py-2"
                    >
                      Next round
                    </button>
                  ) : null}
                  <button
                    ref={bankrupt ? firstAction : undefined}
                    type="button"
                    onClick={restart}
                    className="btn-game btn-ghost px-6 py-2"
                  >
                    Start over
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
