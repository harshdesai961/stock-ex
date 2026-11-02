import { describe, expect, it } from 'vitest';
import { COMPANIES } from './companies.js';

describe('company config', () => {
  it('matches the spec: opening prices and distinct card counts', () => {
    expect(COMPANIES.map((c) => c.openingPrice)).toEqual([20, 25, 40, 55, 75, 80]);
    expect(COMPANIES.map((c) => c.cardValues.length)).toEqual([4, 6, 6, 8, 10, 12]);
  });

  it('has 46 distinct values, so 92 price cards in the deck', () => {
    const distinct = COMPANIES.reduce((total, c) => total + c.cardValues.length, 0);
    expect(distinct).toBe(46);
    expect(distinct * 2).toBe(92);
  });

  it("has each company's cards summing to zero", () => {
    for (const company of COMPANIES) {
      expect(company.cardValues.reduce((sum, value) => sum + value, 0)).toBe(0);
    }
  });
});
