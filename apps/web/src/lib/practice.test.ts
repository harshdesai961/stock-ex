import { COMPANIES } from '@stock-ex/engine';
import { describe, expect, it } from 'vitest';
import { dealRound, settleCall, sum, titleFor } from './practice';

/** A small seeded generator, so these tests are repeatable. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

describe('dealRound', () => {
  it('only deals real cards, never more copies than the deck holds, and sums correctly', () => {
    const rng = seeded(42);
    for (let i = 0; i < 500; i++) {
      const round = dealRound(rng, () => true);
      const dealt = [...round.yours, ...round.table];
      expect(round.yours).toHaveLength(3);
      expect(round.table).toHaveLength(3);
      expect(round.movement).toBe(sum(dealt));
      for (const card of dealt) {
        expect(round.company.cardValues).toContain(card);
        expect(dealt.filter((c) => c === card).length).toBeLessThanOrEqual(2);
      }
    }
  });

  it('skips companies that are not tradable', () => {
    const rng = seeded(7);
    for (let i = 0; i < 100; i++) {
      expect(dealRound(rng, (c) => c.id === 'C4').company.id).toBe('C4');
    }
  });

  it('still deals if every company is out', () => {
    const round = dealRound(seeded(3), () => false);
    expect(COMPANIES.map((c) => c.id)).toContain(round.company.id);
  });
});

describe('settleCall', () => {
  it('pays a correct bull call', () => {
    expect(settleCall(25, 5, 'bull', 5_000)).toEqual({
      newPrice: 30,
      change: 5,
      profit: 25_000,
      outcome: 'win',
    });
  });

  it('charges a wrong bull call and pays a correct bear call', () => {
    expect(settleCall(40, -10, 'bull', 1_000).profit).toBe(-10_000);
    expect(settleCall(40, -10, 'bear', 1_000)).toMatchObject({ profit: 10_000, outcome: 'win' });
  });

  it('never lets a price go negative, and pays only the real move', () => {
    expect(settleCall(20, -35, 'bear', 1_000)).toMatchObject({
      newPrice: 0,
      change: -20,
      profit: 20_000,
    });
  });

  it('treats no movement as flat with no profit', () => {
    expect(settleCall(55, 0, 'bull', 10_000)).toMatchObject({ outcome: 'flat', profit: 0 });
    expect(settleCall(0, -5, 'bear', 1_000)).toMatchObject({ outcome: 'flat', profit: 0 });
  });
});

describe('titleFor', () => {
  it('rises with the bank', () => {
    expect(titleFor(100_000)).toBe('Intern');
    expect(titleFor(600_000)).toBe('Trader');
    expect(titleFor(1_000_000)).toBe('Tycoon');
    expect(titleFor(2_000_000)).toBe('Market Legend');
  });
});
