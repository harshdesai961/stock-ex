'use client';

import { formatNumber, formatRupees, formatSignedRupees } from '@stock-ex/shared';
import { useEffect, useRef, useState } from 'react';
import {
  dealRound,
  LOTS,
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

function PriceCard({ value, mine }: { value: number; mine: boolean }) {
  const up = value > 0;
  return (
    <li
      className={`card-flip flex h-24 w-16 flex-col items-center justify-center rounded-xl border-2 bg-ink-100 font-mono sm:h-28 sm:w-20 ${up ? 'border-bull-500' : 'border-bear-500'}`}
    >
      <span aria-hidden="true" className={up ? 'text-emerald-800' : 'text-red-800'}>
        {up ? '▲' : '▼'}
      </span>
      <span className={`text-xl font-bold ${up ? 'text-emerald-800' : 'text-red-800'}`}>
        {formatSignedRupees(value)}
      </span>
      {mine ? <span className="sr-only">(your card)</span> : null}
    </li>
  );
}

function HiddenCard() {
  return (
    <li className="grid-lines flex h-24 w-16 items-center justify-center rounded-xl border-2 border-windfall-400 bg-ink-800 sm:h-28 sm:w-20">
      <span aria-hidden="true" className="text-2xl font-bold text-windfall-400">
        ?
      </span>
      <span className="sr-only">Hidden card</span>
    </li>
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
    <div className="rounded-card border border-ink-700 bg-ink-900 p-4 sm:p-6">
      <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <div className="rounded-lg bg-ink-800 p-2">
          <dt className="text-xs text-ink-300">Practice bank</dt>
          <dd className="font-mono font-bold text-accent-400">{formatRupees(stats.bank)}</dd>
        </div>
        <div className="rounded-lg bg-ink-800 p-2">
          <dt className="text-xs text-ink-300">Rank</dt>
          <dd className="font-bold">{titleFor(stats.bank)}</dd>
        </div>
        <div className="rounded-lg bg-ink-800 p-2">
          <dt className="text-xs text-ink-300">Streak</dt>
          <dd className="font-mono font-bold">
            {stats.streak >= 3 ? <span aria-hidden="true">🔥 </span> : null}
            {stats.streak}
          </dd>
        </div>
        <div className="rounded-lg bg-ink-800 p-2">
          <dt className="text-xs text-ink-300">Best streak</dt>
          <dd className="font-mono font-bold">{stats.best}</dd>
        </div>
      </dl>

      {phase === 'idle' || !round ? (
        <div className="py-10 text-center">
          <p className="mx-auto max-w-md text-ink-300">
            You get three cards for one company. Three more are hidden with other traders. Add up
            what you can see, then call it: will the price rise or fall?
          </p>
          <button
            type="button"
            onClick={deal}
            className="mt-5 cursor-pointer rounded-lg bg-accent-400 px-8 py-3 text-lg font-bold text-ink-950 hover:bg-windfall-400"
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
                  <PriceCard key={index} value={value} mine />
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-ink-300">Other traders&apos; cards</h4>
              <ul className="flex gap-2">
                {round.table.map((value, index) =>
                  index < revealed ? (
                    <PriceCard key={index} value={value} mine={false} />
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
                  className="cursor-pointer rounded-lg bg-bull-500 py-3 font-bold text-ink-950 hover:bg-bull-400"
                >
                  ▲ Bull: it will rise
                </button>
                <button
                  type="button"
                  onClick={() => {
                    makeCall('bear');
                  }}
                  className="cursor-pointer rounded-lg bg-bear-500 py-3 font-bold text-ink-950 hover:bg-bear-400"
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
              <div className="pop-in mt-5 rounded-lg border border-ink-700 bg-ink-800 p-4 text-center">
                <p className="text-lg font-bold">
                  {result.outcome === 'win' ? '✔ Good call! ' : null}
                  {result.outcome === 'lose' ? '✘ Wrong way. ' : null}
                  {result.outcome === 'flat' ? '• No change. ' : null}
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
                      className="cursor-pointer rounded-lg bg-accent-400 px-6 py-2 font-bold text-ink-950 hover:bg-windfall-400"
                    >
                      Next round
                    </button>
                  ) : null}
                  <button
                    ref={bankrupt ? firstAction : undefined}
                    type="button"
                    onClick={restart}
                    className="cursor-pointer rounded-lg border border-ink-700 bg-ink-900 px-6 py-2 font-semibold hover:bg-ink-700"
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
