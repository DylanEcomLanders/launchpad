/* ── VAT logic for invoices issued ──
 * Pure functions. Server-safe (no DOM, no Supabase).
 *
 * Rules of thumb (UK Ltd company):
 *  - If we're not VAT registered → no VAT on anything (current state of
 *    Ecomlanders Ltd until we cross the threshold).
 *  - Once VAT registered:
 *      - UK client → 20% standard rate.
 *      - Non-UK client (B2B) → reverse charge, 0 VAT, note added.
 *      - Non-UK client (B2C) → out of scope for now, zero-rated.
 *  - Manual override available for edge cases.
 */

import type { VatTreatment, InvoiceLineItem } from "./types";

export const UK_VAT_RATE = 0.2;

export function suggestVatTreatment(
  clientCountry: string,
  vatRegistered: boolean,
): VatTreatment {
  if (!vatRegistered) return "not_registered";
  if (clientCountry === "GB" || clientCountry === "UK") return "uk_standard";
  return "reverse_charge";
}

export interface VatBreakdown {
  subtotal: number;
  vatRate: number;        // 0 or 0.2
  vatAmount: number;      // £ amount of VAT
  total: number;
  noteForInvoice: string | null; // line to print on the PDF when not standard
}

export function calculateLineSubtotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

export function calculateVatBreakdown(
  items: InvoiceLineItem[],
  treatment: VatTreatment,
  manualOverride?: number,
): VatBreakdown {
  const subtotal = round2(calculateLineSubtotal(items));

  switch (treatment) {
    case "uk_standard": {
      const vatAmount = round2(subtotal * UK_VAT_RATE);
      return {
        subtotal,
        vatRate: UK_VAT_RATE,
        vatAmount,
        total: round2(subtotal + vatAmount),
        noteForInvoice: null,
      };
    }
    case "reverse_charge":
      return {
        subtotal,
        vatRate: 0,
        vatAmount: 0,
        total: subtotal,
        noteForInvoice:
          "Reverse charge: customer to account for VAT to HMRC (Article 196 VAT Directive 2006/112/EC).",
      };
    case "zero_rated":
      return {
        subtotal,
        vatRate: 0,
        vatAmount: 0,
        total: subtotal,
        noteForInvoice: "Zero-rated for VAT (outside the scope of UK VAT).",
      };
    case "not_registered":
      return {
        subtotal,
        vatRate: 0,
        vatAmount: 0,
        total: subtotal,
        noteForInvoice: null,
      };
    case "manual": {
      const vatAmount = round2(manualOverride ?? 0);
      return {
        subtotal,
        vatRate: subtotal > 0 ? vatAmount / subtotal : 0,
        vatAmount,
        total: round2(subtotal + vatAmount),
        noteForInvoice: null,
      };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
