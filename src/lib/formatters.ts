// Shared formatters used across tool pages.

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

/** Format a number as GBP currency (e.g. £1,234.56) */
export function formatGBP(amount: number): string {
  return gbpFormatter.format(amount);
}

const gbpDetailedFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format GBP with exactly 2 decimal places */
export function formatGBPDetailed(amount: number): string {
  return gbpDetailedFormatter.format(amount);
}
