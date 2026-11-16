'use client';

import { formatRupees } from '@stock-ex/shared';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useMarket, type Quote } from './market-context';

/** Header colours for the six company cards, in board-tile order. */
const BANDS = [
  'bg-tile-blue text-ink-100',
  'bg-bear-500 text-ink-100',
  'bg-tile-orange text-ink-950',
  'bg-tile-yellow text-ink-950',
  'bg-bull-500 text-ink-950',
  'bg-ink-700 text-ink-100',
] as const;

function Sparkline({ values, rising }: { values: number[]; rising: boolean }) {
  const low = Math.min(...values);
  const range = Math.max(...values) - low || 1;
  const stepX = 100 / Math.max(1, values.length - 1);
  const points = values
    .map(
      (value, i) => `${(i * stepX).toFixed(1)},${(30 - ((value - low) / range) * 28).toFixed(1)}`,
    )
    .join(' ');
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" className="h-8 w-full">
      <polyline
        points={points}
        fill="none"
        strokeWidth="2.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className={rising ? 'stroke-bull-400' : 'stroke-bear-400'}
      />
    </svg>
  );
}

function CompanyCard({ quote, band }: { quote: Quote; band: string }) {
  const first = quote.history.at(0) ?? quote.price;
  const up = quote.change > 0;
  const down = quote.change < 0;
  return (
    <li className="lift min-w-0 overflow-hidden rounded-xl border-2 border-ink-100/80 bg-ink-950/70 text-ink-100 shadow-[0_5px_0_rgb(0_0_0/0.25)]">
      <div className={`flex items-center justify-between gap-2 px-3 py-1.5 ${band}`}>
        <span className="font-display text-sm tracking-wider">{quote.ticker}</span>
        {up ? <TrendingUp className="h-4 w-4" aria-hidden="true" /> : null}
        {down ? <TrendingDown className="h-4 w-4" aria-hidden="true" /> : null}
      </div>
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            key={quote.tick}
            className={`font-display rounded px-1 text-2xl ${up ? 'flash-up' : down ? 'flash-down' : ''}`}
          >
            {formatRupees(quote.price)}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-xs font-bold ${
              up
                ? 'bg-bull-500/20 text-bull-400'
                : down
                  ? 'bg-bear-500/25 text-bear-400'
                  : 'bg-ink-100/10 text-ink-300'
            }`}
          >
            {up ? '▲ +' : down ? '▼ −' : '• '}
            {Math.abs(quote.change)}
          </span>
        </div>
        <p className="truncate text-xs text-ink-300">{quote.name}</p>
        <Sparkline values={quote.history} rising={quote.price >= first} />
      </div>
    </li>
  );
}

export function LiveBoard() {
  const { quotes } = useMarket();
  return (
    <figure>
      <ul className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3">
        {quotes.map((quote, index) => (
          <CompanyCard key={quote.id} quote={quote} band={BANDS.at(index) ?? BANDS[0]} />
        ))}
      </ul>
      <figcaption className="mt-3 text-xs text-ink-300">
        Made-up demo prices. In the real game, prices move only at the big reveal.
      </figcaption>
    </figure>
  );
}
