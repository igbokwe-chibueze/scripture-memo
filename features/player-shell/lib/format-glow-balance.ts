/**
 * Keep spendable balances compact without ever rounding up to unavailable funds.
 * Truncate before Intl formatting, retaining locale-specific compact unit labels.
 * Values below 1,000 remain exact; the plus denotes a lower-bound abbreviation.
 */
export function formatGlowBalance(value: number, locale: string): string {
  if (value < 1000) return new Intl.NumberFormat(locale).format(value);

  const unit = value >= 1e12 ? 1e12 : value >= 1e9 ? 1e9 : value >= 1e6 ? 1e6 : 1000;
  const truncated = Math.floor(value / (unit / 10)) * (unit / 10);
  const compact = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(truncated);

  return `${compact}+`;
}
