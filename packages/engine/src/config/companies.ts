// The six fictional companies. This is the one file to edit to rename a company or
// change its prices; the web app and (from M1) the rules engine both read it.

export type CompanyId = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

export interface CompanyConfig {
  readonly id: CompanyId;
  readonly name: string;
  readonly ticker: string;
  /** Opening price in integer rupees. */
  readonly openingPrice: number;
  /** Distinct price-card values. Each one appears twice in the deck, and they sum to zero. */
  readonly cardValues: readonly number[];
}

const plusMinus = (...steps: number[]): readonly number[] => [
  ...steps,
  ...steps.map((step) => -step),
];

export const COMPANIES = [
  {
    id: 'C1',
    name: 'Sanjeevani Pharma',
    ticker: 'SANJ',
    openingPrice: 20,
    cardValues: plusMinus(10, 5),
  },
  {
    id: 'C2',
    name: 'Kuber Bank',
    ticker: 'KUBR',
    openingPrice: 25,
    cardValues: plusMinus(15, 10, 5),
  },
  {
    id: 'C3',
    name: 'Vajra Motors',
    ticker: 'VAJR',
    openingPrice: 40,
    cardValues: plusMinus(15, 10, 5),
  },
  {
    id: 'C4',
    name: 'Agni Energy',
    ticker: 'AGNI',
    openingPrice: 55,
    cardValues: plusMinus(20, 15, 10, 5),
  },
  {
    id: 'C5',
    name: 'Sagar Industries',
    ticker: 'SAGR',
    openingPrice: 75,
    cardValues: plusMinus(25, 20, 15, 10, 5),
  },
  {
    id: 'C6',
    name: 'Vidya Infotech',
    ticker: 'VIDY',
    openingPrice: 80,
    cardValues: plusMinus(30, 25, 20, 15, 10, 5),
  },
] as const satisfies readonly CompanyConfig[];

/** Shares of each company in existence; the bank holds whatever players don't. */
export const SHARES_PER_COMPANY = 200_000;
/** Default starting cash per player, in rupees (the lobby allows 6 to 10 lakh). */
export const DEFAULT_STARTING_CASH = 600_000;
/** Shares always trade in multiples of this. */
export const LOT_SIZE = 1_000;
