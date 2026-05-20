/* ── UK VAT return calculation ──
 * Computes the standard 9-box HMRC VAT return summary plus line-level
 * detail for sales and purchases in the period.
 *
 * Tax-point convention used:
 *   - Sales:     invoice_date (the invoice is the tax point under the
 *                standard scheme)
 *   - Purchases: date_due as a proxy for the supplier's invoice date.
 *                We don't capture supplier invoice dates separately; if
 *                the accountant cares, switch to cash basis instead
 *                (use date_paid) via the basis option.
 *
 * Draft invoices are excluded. Expenses with no date are excluded.
 */

import type { InvoiceIssued, Expense } from "./types";
import { calculateVatBreakdown } from "./vat";
import type { DateRange } from "./calc";

export type VatBasis = "accruals" | "cash";

export interface SalesRow {
  invoice_number: string;
  date: string;          // tax point
  client_name: string;
  client_country: string;
  treatment: string;     // human label
  net: number;
  vat: number;
  gross: number;
  is_reverse_charge: boolean;
}

export interface PurchaseRow {
  date: string;          // tax point used (date_due or date_paid)
  supplier_name: string;
  category: string;
  description: string;
  net: number;           // amount excl VAT
  vat: number;           // reclaimable input VAT (0 if not VAT-included)
  gross: number;         // total paid/owed
}

export interface VatReturn {
  period: DateRange;
  basis: VatBasis;
  box1_vatOnSales: number;            // Output VAT
  box2_vatOnAcquisitions: number;     // NI from EU — almost always 0
  box3_totalVatDue: number;           // 1 + 2
  box4_vatReclaimed: number;          // Input VAT
  box5_netVatToHmrc: number;          // 3 - 4 (negative means refund)
  box6_totalSalesExVat: number;       // includes zero-rated / reverse charge
  box7_totalPurchasesExVat: number;
  box8_suppliesToEuFromNi: number;    // NI Protocol — 0 for GB-only
  box9_acquisitionsFromEuToNi: number;
  sales: SalesRow[];
  purchases: PurchaseRow[];
  reverseChargeTotal: number;         // For accountant info; goes in narrative
  noteForAccountant: string;
}

const TREATMENT_LABELS: Record<string, string> = {
  uk_standard: "UK standard (20%)",
  reverse_charge: "Reverse charge",
  zero_rated: "Zero-rated",
  not_registered: "Not VAT registered",
  manual: "Manual VAT override",
};

function inRange(date: string | undefined, range: DateRange): boolean {
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* HMRC accepts pence; we keep 2dp on the return summary and the
 * detail files. No rounding to whole £ here (that's an old rule). */
export function computeVatReturn(
  invoices: InvoiceIssued[],
  expenses: Expense[],
  range: DateRange,
  options: { vatRegistered: boolean; basis?: VatBasis } = { vatRegistered: false },
): VatReturn {
  const basis: VatBasis = options.basis ?? "accruals";

  /* ── Sales side ──
   * Exclude draft (not billed) and disputed (parked). Disputed
   * invoices reappear in calculations once their status is changed
   * back to due / paid after the dispute is resolved. */
  const recognisedSales = invoices.filter(
    (i) =>
      i.status !== "draft" &&
      i.status !== "disputed" &&
      inRange(i.invoice_date, range),
  );

  let box1 = 0;
  let box6 = 0;
  let reverseChargeTotal = 0;
  const sales: SalesRow[] = [];

  for (const inv of recognisedSales) {
    const b = calculateVatBreakdown(inv.items, inv.vat_treatment, inv.vat_amount_override);
    box1 += b.vatAmount;
    box6 += b.subtotal;
    if (inv.vat_treatment === "reverse_charge") {
      reverseChargeTotal += b.subtotal;
    }
    sales.push({
      invoice_number: inv.invoice_number,
      date: inv.invoice_date,
      client_name: inv.client_name,
      client_country: inv.client_country,
      treatment: TREATMENT_LABELS[inv.vat_treatment] ?? inv.vat_treatment,
      net: round2(b.subtotal),
      vat: round2(b.vatAmount),
      gross: round2(b.total),
      is_reverse_charge: inv.vat_treatment === "reverse_charge",
    });
  }

  /* ── Purchases side ──
   * Exclude disputed expenses from purchases (and therefore from
   * Boxes 4 / 7 of the VAT return). They re-enter once resolved. */
  const recognisedPurchases = expenses.filter((e) => {
    if (e.status === "disputed") return false;
    const date = basis === "cash" ? e.date_paid : e.date_due;
    return inRange(date, range);
  });

  let box4 = 0;
  let box7 = 0;
  const purchases: PurchaseRow[] = [];

  for (const exp of recognisedPurchases) {
    const taxPoint = (basis === "cash" ? exp.date_paid : exp.date_due) ?? exp.date_due;
    const reclaimable = options.vatRegistered && exp.vat_included
      ? (exp.vat_amount ?? exp.amount - exp.amount / 1.2)
      : 0;
    const net = exp.amount - reclaimable;
    box4 += reclaimable;
    box7 += net;
    purchases.push({
      date: taxPoint,
      supplier_name: exp.supplier_name,
      category: exp.category,
      description: exp.description ?? "",
      net: round2(net),
      vat: round2(reclaimable),
      gross: round2(exp.amount),
    });
  }

  box1 = round2(box1);
  box4 = round2(box4);
  box6 = round2(box6);
  box7 = round2(box7);

  const box3 = round2(box1 /* + box2 */);
  const box5 = round2(box3 - box4);

  const notes: string[] = [];
  if (!options.vatRegistered) {
    notes.push(
      "Company is currently marked as NOT VAT registered in Finance > Settings. Box 1 and Box 4 are computed as if registered for reference only — do not file these figures.",
    );
  }
  if (reverseChargeTotal > 0) {
    notes.push(
      `Reverse-charge sales total £${reverseChargeTotal.toFixed(2)} are included in Box 6 (total sales) but Box 1 (output VAT) is zero on those supplies. Customer accounts for VAT.`,
    );
  }
  notes.push(
    `Tax-point basis: ${basis === "cash" ? "cash (date paid)" : "accruals (invoice/due date)"}.`,
  );

  return {
    period: range,
    basis,
    box1_vatOnSales: box1,
    box2_vatOnAcquisitions: 0,
    box3_totalVatDue: box3,
    box4_vatReclaimed: box4,
    box5_netVatToHmrc: box5,
    box6_totalSalesExVat: box6,
    box7_totalPurchasesExVat: box7,
    box8_suppliesToEuFromNi: 0,
    box9_acquisitionsFromEuToNi: 0,
    sales: sales.sort((a, b) => (a.date > b.date ? 1 : -1)),
    purchases: purchases.sort((a, b) => (a.date > b.date ? 1 : -1)),
    reverseChargeTotal: round2(reverseChargeTotal),
    noteForAccountant: notes.join(" "),
  };
}

/* ── Quarter helpers ── */

/** UK VAT quarters are typically aligned to the company's VAT-registration
 * date but the standard stagger is calendar quarters. We expose three
 * pickers covering the common cases. */
export function previousQuarter(today = new Date()): DateRange {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const qStart = Math.floor(m / 3) * 3 - 3;
  if (qStart < 0) {
    return {
      start: toISO(Date.UTC(y - 1, 9, 1)),
      end: toISO(Date.UTC(y - 1, 12, 0)),
    };
  }
  return {
    start: toISO(Date.UTC(y, qStart, 1)),
    end: toISO(Date.UTC(y, qStart + 3, 0)),
  };
}

function toISO(utc: number): string {
  return new Date(utc).toISOString().slice(0, 10);
}

/* ── CSV serialisation ── */

function escapeCsv(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toSummaryCsv(r: VatReturn): string {
  const rows: (string | number)[][] = [
    ["UK VAT Return summary"],
    [`Period`, `${r.period.start} → ${r.period.end}`],
    [`Basis`, r.basis],
    [],
    ["Box", "Description", "Amount (£)"],
    ["1", "VAT due on sales and other outputs", r.box1_vatOnSales.toFixed(2)],
    ["2", "VAT due on acquisitions from EU (NI only)", r.box2_vatOnAcquisitions.toFixed(2)],
    ["3", "Total VAT due (1 + 2)", r.box3_totalVatDue.toFixed(2)],
    ["4", "VAT reclaimed on purchases and other inputs", r.box4_vatReclaimed.toFixed(2)],
    ["5", "Net VAT to pay HMRC (3 − 4)", r.box5_netVatToHmrc.toFixed(2)],
    ["6", "Total value of sales and all other outputs (ex VAT)", r.box6_totalSalesExVat.toFixed(2)],
    ["7", "Total value of purchases and all other inputs (ex VAT)", r.box7_totalPurchasesExVat.toFixed(2)],
    ["8", "Supplies of goods to EU from NI", r.box8_suppliesToEuFromNi.toFixed(2)],
    ["9", "Acquisitions of goods from EU into NI", r.box9_acquisitionsFromEuToNi.toFixed(2)],
    [],
    ["Reverse-charge sales total (informational)", r.reverseChargeTotal.toFixed(2)],
    [],
    ["Notes for accountant"],
    [r.noteForAccountant],
  ];
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function toSalesCsv(r: VatReturn): string {
  const rows: (string | number)[][] = [
    ["invoice_number", "date", "client_name", "client_country", "vat_treatment", "net", "vat", "gross", "reverse_charge"],
    ...r.sales.map((s) => [
      s.invoice_number,
      s.date,
      s.client_name,
      s.client_country,
      s.treatment,
      s.net.toFixed(2),
      s.vat.toFixed(2),
      s.gross.toFixed(2),
      s.is_reverse_charge ? "yes" : "no",
    ]),
    [],
    ["", "", "", "", "TOTAL", r.box6_totalSalesExVat.toFixed(2), r.box1_vatOnSales.toFixed(2), (r.box6_totalSalesExVat + r.box1_vatOnSales).toFixed(2), ""],
  ];
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function toPurchasesCsv(r: VatReturn): string {
  const rows: (string | number)[][] = [
    ["date", "supplier_name", "category", "description", "net", "vat", "gross"],
    ...r.purchases.map((p) => [
      p.date,
      p.supplier_name,
      p.category,
      p.description,
      p.net.toFixed(2),
      p.vat.toFixed(2),
      p.gross.toFixed(2),
    ]),
    [],
    ["", "", "", "TOTAL", r.box7_totalPurchasesExVat.toFixed(2), r.box4_vatReclaimed.toFixed(2), (r.box7_totalPurchasesExVat + r.box4_vatReclaimed).toFixed(2)],
  ];
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}
