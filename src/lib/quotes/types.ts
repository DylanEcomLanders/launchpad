// ── Quote tool types ────────────────────────────────────────────────
// Standalone from the older `proposals` system. A quote is a composed set of
// free-form line items the client views as an HTML page at /quote/<token>.

export type LineCadence = "one_off" | "monthly";

export interface QuoteLine {
  id: string;
  description: string;
  /** Optional one-liner under the item: what it actually delivers. Helps the
   * quote sell rather than just list a price. */
  detail?: string;
  /** Quantity. Defaults to 1. */
  qty: number;
  /** Unit price in GBP (whole pounds, not pence — kept simple for a quote). */
  unitPrice: number;
  /** One-off charge vs recurring monthly. */
  cadence: LineCadence;
}

export interface QuoteData {
  clientName: string;
  /** Optional intro paragraph shown above the line items. */
  intro?: string;
  /** Short "what's included" bullet list — the core things every engagement
   * covers. Kept punchy (e.g. "Strategic CRO", "30 days post-launch support").
   * Pre-filled with sensible defaults, editable per quote. */
  includes?: string[];
  /** Optional closing note (terms). */
  footnote?: string;
  lines: QuoteLine[];
  /** Who built it (for the record). */
  preparedBy?: string;
}

/** Default "what's included" items so most quotes need zero extra typing. */
export const DEFAULT_INCLUDES = [
  "Strategic CRO",
  "Custom code development",
  "Conversion-focused design",
  "30 days of support post-launch",
];

export interface Quote {
  id: string;
  token: string;
  data: QuoteData;
  viewed_at: string | null;
  created_at: string;
  trashed_at: string | null;
}

// ── Totals ──

export interface QuoteTotals {
  oneOff: number;
  monthly: number;
}

export function quoteTotals(lines: QuoteLine[]): QuoteTotals {
  let oneOff = 0;
  let monthly = 0;
  for (const l of lines) {
    const sub = (l.qty || 0) * (l.unitPrice || 0);
    if (l.cadence === "monthly") monthly += sub;
    else oneOff += sub;
  }
  return { oneOff, monthly };
}

export function formatGBP(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n || 0);
}
