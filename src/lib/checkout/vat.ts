/* ── Agreement Checkout: VAT ──
 *
 * Config-driven so it is a no-op until we register, then a one-line switch.
 * Prices are VAT-INCLUSIVE, so for a UK client the 20% is extracted from within
 * the headline price; the client always pays the same headline amount.
 *
 * When we register for VAT:  set VAT_REGISTERED = true and fill VAT_NUMBER.
 */

import type { VatStatus } from "./types";

export const VAT_REGISTERED = false; // <-- flip to true once registered
export const VAT_NUMBER = ""; // <-- fill in the VAT number when registered
export const VAT_RATE = 0.2; // UK standard rate

export interface VatBreakdown {
  status: VatStatus;
  gross: number;
  net: number;
  vat: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Break a VAT-inclusive gross price into net + VAT for a given billing country.
 *  - Not registered: no VAT anywhere (status "none").
 *  - Registered + UK (GB): extract 20% from the inclusive price.
 *  - Registered + non-UK: no VAT, "Outside of UK VAT". */
export function computeVat(gross: number, billingCountry?: string): VatBreakdown {
  if (!VAT_REGISTERED) return { status: "none", gross, net: gross, vat: 0 };
  const isUK = (billingCountry ?? "").trim().toUpperCase() === "GB";
  if (!isUK) return { status: "outside", gross, net: gross, vat: 0 };
  const vat = round2((gross * VAT_RATE) / (1 + VAT_RATE));
  return { status: "uk", gross, net: round2(gross - vat), vat };
}

export function vatStatusLabel(status: VatStatus): string {
  if (status === "uk") return "UK VAT (20%, inclusive)";
  if (status === "outside") return "Outside of UK VAT";
  return "No VAT";
}
