const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Indian-numbering rupee format: 112000 → "₹1,12,000". */
export function formatINR(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}₹${inr.format(Math.abs(rounded))}`;
}

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}
