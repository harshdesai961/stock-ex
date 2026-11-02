import { describe, expect, it } from 'vitest';
import { formatNumber, formatRupees, formatSignedRupees } from './format.js';

describe('Indian number formatting', () => {
  it('groups in lakhs and crores', () => {
    expect(formatRupees(600_000)).toBe('₹6,00,000');
    expect(formatRupees(12_500_000)).toBe('₹1,25,00,000');
    expect(formatNumber(200_000)).toBe('2,00,000');
  });

  it('puts the minus sign before the rupee symbol', () => {
    expect(formatRupees(-5_000)).toBe('−₹5,000');
  });

  it('always signs changes, so meaning never relies on colour', () => {
    expect(formatSignedRupees(5)).toBe('+₹5');
    expect(formatSignedRupees(-10)).toBe('−₹10');
    expect(formatSignedRupees(0)).toBe('₹0');
  });
});
