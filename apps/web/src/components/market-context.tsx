'use client';

import { COMPANIES, type CompanyId } from '@stock-ex/engine';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// A decorative demo tape for the landing page. These prices are not from any game: in the real
// game prices only move when the cards are revealed at the end of a Bargain Period.

export interface Quote {
  id: CompanyId;
  ticker: string;
  name: string;
  price: number;
  change: number;
  history: number[];
  /** Counts updates, so a price can re-trigger its flash animation. */
  tick: number;
}

const HISTORY_LENGTH = 24;
const TICK_MS = 1500;
const STEPS = [-10, -5, -5, 5, 5, 10];

/** Fixed starting data, so server and browser render exactly the same first frame. */
function initialQuotes(): Quote[] {
  return COMPANIES.map((company, index) => ({
    id: company.id,
    ticker: company.ticker,
    name: company.name,
    price: company.openingPrice,
    change: 0,
    tick: 0,
    history: Array.from({ length: HISTORY_LENGTH }, (_, i) => {
      const wave = Math.round(Math.sin((i + index * 3) / 2.5) * 3) * 5;
      return Math.max(5, company.openingPrice + wave);
    }),
  }));
}

function moveOne(quote: Quote, step: number): Quote {
  const company = COMPANIES.find((c) => c.id === quote.id);
  const opening = company?.openingPrice ?? quote.price;
  // Drift back towards the opening price so the tape never runs away.
  const tooHigh = quote.price > opening * 1.6;
  const tooLow = quote.price <= Math.max(5, opening * 0.5);
  const direction = tooHigh ? -Math.abs(step) : tooLow ? Math.abs(step) : step;
  const price = Math.max(5, quote.price + direction);
  return {
    ...quote,
    price,
    change: price - quote.price,
    tick: quote.tick + 1,
    history: [...quote.history.slice(1), price],
  };
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface MarketValue {
  quotes: Quote[];
  paused: boolean;
  togglePaused: () => void;
}

const MarketContext = createContext<MarketValue | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      if (document.hidden || prefersReducedMotion()) return;
      const target = Math.floor(Math.random() * COMPANIES.length);
      const step = STEPS.at(Math.floor(Math.random() * STEPS.length)) ?? 5;
      setQuotes((current) =>
        current.map((quote, index) => (index === target ? moveOne(quote, step) : quote)),
      );
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [paused]);

  const togglePaused = useCallback(() => {
    const next = !paused;
    document.documentElement.dataset.motion = next ? 'off' : 'on';
    setPaused(next);
  }, [paused]);

  const value = useMemo(() => ({ quotes, paused, togglePaused }), [quotes, paused, togglePaused]);
  return <MarketContext value={value}>{children}</MarketContext>;
}

export function useMarket(): MarketValue {
  const value = use(MarketContext);
  if (!value) throw new Error('useMarket must be used inside MarketProvider');
  return value;
}
