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
  if (!vatRegistered) return "pre_vat_registration";
  if (clientCountry === "GB" || clientCountry === "UK") return "standard_20";
  return "reverse_charge";
}

/* UI-facing VAT mode. Maps to a vat_treatment value below depending
 * on the client's country, so the form is a 3-button picker rather
 * than the 8-option enum. */
export type VatMode = "off" | "inclusive" | "exclusive";

export function deriveVatTreatment(mode: VatMode, clientCountry: string): VatTreatment {
  if (mode === "inclusive") return "inclusive_20";
  if (mode === "exclusive") return "standard_20";
  // off — pick the most accurate "no VAT" treatment from context
  if (clientCountry === "GB" || clientCountry === "UK") return "pre_vat_registration";
  return "reverse_charge";
}

/** Reverse — for hydrating the picker when loading an existing invoice. */
export function vatTreatmentToMode(treatment: VatTreatment): VatMode {
  if (treatment === "inclusive_20") return "inclusive";
  if (treatment === "standard_20" || treatment === "manual") return "exclusive";
  return "off";
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
  const lineTotal = round2(calculateLineSubtotal(items));

  switch (treatment) {
    case "standard_20": {
      const vatAmount = round2(lineTotal * UK_VAT_RATE);
      return {
        subtotal: lineTotal,
        vatRate: UK_VAT_RATE,
        vatAmount,
        total: round2(lineTotal + vatAmount),
        noteForInvoice: null,
      };
    }
    case "inclusive_20": {
      // Prices entered are gross. Extract the VAT component so HMRC
      // reporting (Box 1, Box 6) and the customer's reclaim figures
      // stay correct. subtotal = net, vatAmount = VAT, total = gross.
      const net = round2(lineTotal / (1 + UK_VAT_RATE));
      const vatAmount = round2(lineTotal - net);
      return {
        subtotal: net,
        vatRate: UK_VAT_RATE,
        vatAmount,
        total: lineTotal,
        noteForInvoice: "All prices on this invoice include 20% UK VAT.",
      };
    }
    case "reverse_charge":
      return {
        subtotal: lineTotal,
        vatRate: 0,
        vatAmount: 0,
        total: lineTotal,
        noteForInvoice:
          "Reverse charge: customer to account for VAT to HMRC (Article 196 VAT Directive 2006/112/EC).",
      };
    case "zero_rated":
      return {
        subtotal: lineTotal,
        vatRate: 0,
        vatAmount: 0,
        total: lineTotal,
        noteForInvoice: "Zero-rated supply for VAT purposes.",
      };
    case "outside_scope":
      return {
        subtotal: lineTotal,
        vatRate: 0,
        vatAmount: 0,
        total: lineTotal,
        noteForInvoice: "Outside the scope of UK VAT.",
      };
    case "exempt":
      return {
        subtotal: lineTotal,
        vatRate: 0,
        vatAmount: 0,
        total: lineTotal,
        noteForInvoice: "Exempt from VAT.",
      };
    case "pre_vat_registration":
      return {
        subtotal: lineTotal,
        vatRate: 0,
        vatAmount: 0,
        total: lineTotal,
        noteForInvoice: null,
      };
    case "manual": {
      const vatAmount = round2(manualOverride ?? 0);
      return {
        subtotal: lineTotal,
        vatRate: lineTotal > 0 ? vatAmount / lineTotal : 0,
        vatAmount,
        total: round2(lineTotal + vatAmount),
        noteForInvoice: null,
      };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
