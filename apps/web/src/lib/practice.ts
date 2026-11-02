// Logic for "Call the Market", the landing page's practice round. It's a teaching toy, not
// the real game: the real rules live in packages/engine and run only on the server.
import { COMPANIES, DEFAULT_STARTING_CASH, type CompanyConfig } from '@stock-ex/engine';

export type Call = 'bull' | 'bear';
export type Outcome = 'win' | 'lose' | 'flat';
export type Rng = () => number;

export const LOTS = [1_000, 5_000, 10_000] as const;
export const STARTING_BANK = DEFAULT_STARTING_CASH;

const CARDS_IN_YOUR_HAND = 3;
const CARDS_ON_THE_TABLE = 3;

export interface PracticeRound {
  company: CompanyConfig;
  /** The cards you can see. */
  yours: number[];
  /** The other traders' cards, hidden until you call. */
  table: number[];
  /** Sum of every card in play: what the price will move by. */
  movement: number;
}

export const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/** Each value appears twice in the deck, as in the real game. */
function shuffledDeck(company: CompanyConfig, rng: Rng): number[] {
  return [...company.cardValues, ...company.cardValues]
    .map((value) => ({ value, order: rng() }))
    .sort((a, b) => a.order - b.order)
    .map(({ value }) => value);
}

/** Deals a round for a random company. Companies priced at zero are insolvent, so they sit out. */
export function dealRound(
  rng: Rng,
  isTradable: (company: CompanyConfig) => boolean,
): PracticeRound {
  const open = COMPANIES.filter(isTradable);
  const pool: readonly CompanyConfig[] = open.length > 0 ? open : COMPANIES;
  const company = pool.at(Math.floor(rng() * pool.length)) ?? COMPANIES[0];
  const deck = shuffledDeck(company, rng);
  const yours = deck.slice(0, CARDS_IN_YOUR_HAND);
  const table = deck.slice(CARDS_IN_YOUR_HAND, CARDS_IN_YOUR_HAND + CARDS_ON_THE_TABLE);
  return { company, yours, table, movement: sum(yours) + sum(table) };
}

export interface Settlement {
  newPrice: number;
  /** How far the price actually moved (it can't fall below zero). */
  change: number;
  profit: number;
  outcome: Outcome;
}

export function settleCall(
  price: number,
  movement: number,
  call: Call,
  shares: number,
): Settlement {
  const newPrice = Math.max(0, price + movement);
  const change = newPrice - price;
  const outcome: Outcome =
    change === 0 ? 'flat' : change > 0 === (call === 'bull') ? 'win' : 'lose';
  const perShare = call === 'bull' ? change : -change;
  return { newPrice, change, profit: change === 0 ? 0 : perShare * shares, outcome };
}

const TITLES = [
  { atLeast: 1_500_000, title: 'Market Legend' },
  { atLeast: 1_000_000, title: 'Tycoon' },
  { atLeast: 800_000, title: 'Broker' },
  { atLeast: 600_000, title: 'Trader' },
] as const;

/** A title based on the practice bank, for a little sense of progress. */
export function titleFor(bank: number): string {
  return TITLES.find((tier) => bank >= tier.atLeast)?.title ?? 'Intern';
}
