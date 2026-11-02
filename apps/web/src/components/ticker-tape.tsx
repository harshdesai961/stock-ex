'use client';

import { formatRupees } from '@stock-ex/shared';
import { useMarket, type Quote } from './market-context';

function TapeItem({ quote }: { quote: Quote }) {
  const up = quote.change > 0;
  const down = quote.change < 0;
  return (
    <span className="flex shrink-0 items-center gap-2 px-5 font-mono text-sm">
      <span className="font-semibold text-ink-100">{quote.ticker}</span>
      <span className="text-ink-300">{formatRupees(quote.price)}</span>
      <span className={up ? 'text-bull-400' : down ? 'text-bear-400' : 'text-ink-300'}>
        {up ? '▲ +' : down ? '▼ −' : '• '}
        {Math.abs(quote.change)}
      </span>
    </span>
  );
}

export function TickerTape() {
  const { quotes, paused, togglePaused } = useMarket();
  return (
    <aside
      aria-label="Demo ticker tape with made-up prices"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-ink-700 bg-ink-900/95 backdrop-blur"
    >
      <span className="hidden shrink-0 items-center border-r border-ink-700 px-3 text-xs font-semibold tracking-wide text-accent-400 uppercase sm:flex">
        Demo tape
      </span>
      <div className="ticker min-w-0 flex-1 overflow-hidden py-2">
        <div className="ticker-track flex w-max">
          {quotes.map((quote) => (
            <TapeItem key={quote.id} quote={quote} />
          ))}
          {/* Second copy makes the loop seamless; screen readers only need the first. */}
          <div aria-hidden="true" className="flex">
            {quotes.map((quote) => (
              <TapeItem key={quote.id} quote={quote} />
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={togglePaused}
        aria-pressed={paused}
        className="shrink-0 cursor-pointer border-l border-ink-700 px-3 text-xs font-semibold text-ink-100 hover:bg-ink-800"
      >
        {paused ? '▶ Play motion' : '❚❚ Pause motion'}
      </button>
    </aside>
  );
}
