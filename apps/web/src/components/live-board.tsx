'use client';

import { formatRupees } from '@stock-ex/shared';
import { useMarket, type Quote } from './market-context';

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
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        className={rising ? 'stroke-bull-400' : 'stroke-bear-400'}
      />
    </svg>
  );
}

function Tile({ quote }: { quote: Quote }) {
  const first = quote.history.at(0) ?? quote.price;
  const up = quote.change > 0;
  const down = quote.change < 0;
  return (
    <li className="min-w-0 rounded-card border border-ink-700 bg-ink-900/80 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-ink-300">{quote.ticker}</span>
        <span
          className={`font-mono text-xs ${up ? 'text-bull-400' : down ? 'text-bear-400' : 'text-ink-300'}`}
        >
          {up ? '▲ +' : down ? '▼ −' : '• '}
          {Math.abs(quote.change)}
        </span>
      </div>
      <p
        key={quote.tick}
        className={`mt-1 rounded font-mono text-xl font-bold text-ink-100 ${up ? 'flash-up' : down ? 'flash-down' : ''}`}
      >
        {formatRupees(quote.price)}
      </p>
      <p className="truncate text-xs text-ink-300">{quote.name}</p>
      <Sparkline values={quote.history} rising={quote.price >= first} />
    </li>
  );
}

export function LiveBoard() {
  const { quotes } = useMarket();
  return (
    <figure>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {quotes.map((quote) => (
          <Tile key={quote.id} quote={quote} />
        ))}
      </ul>
      <figcaption className="mt-3 text-xs text-ink-300">
        Made-up demo prices. In the real game, prices move only at the big reveal.
      </figcaption>
    </figure>
  );
}
