// Indian number formatting (₹6,00,000), shared by every screen. Amounts are integer rupees.
const indian = new Intl.NumberFormat('en-IN');

const MINUS = '−';

export function formatNumber(value: number): string {
  return `${value < 0 ? MINUS : ''}${indian.format(Math.abs(value))}`;
}

export function formatRupees(value: number): string {
  return `${value < 0 ? MINUS : ''}₹${indian.format(Math.abs(value))}`;
}

/** Always shows a sign, because colour alone must never carry meaning: +₹5, −₹10, ₹0. */
export function formatSignedRupees(value: number): string {
  if (value === 0) return '₹0';
  return `${value > 0 ? '+' : MINUS}₹${indian.format(Math.abs(value))}`;
}
