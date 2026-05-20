/* ── Server-safe financial calculations ──
 * Pure functions used by the dashboard. Never trust client math for
 * tax figures (per spec). All rounding to 2 dp at boundaries.
 */

import type { InvoiceIssued, Expense } from "./types";
import { calculateVatBreakdown } from "./vat";

/* ── GBP-normalised totals for an invoice ──
 *
 * Used by dashboard / VAT return / threshold rollups so multi-currency
 * data (USD/EUR via Stripe/Wise) folds correctly into a single GBP
 * picture. Stored snapshot fields take precedence over re-deriving from
 * line items, because for non-GBP rows the snapshot fields are in GBP
 * (HMRC convention) while line items are in native currency.
 *
 * For invoices created in-app (always GBP), the snapshot fields are
 * populated from calculateVatBreakdown at save time, so this stays
 * consistent.
 */
function invoiceTotalsGbp(inv: InvoiceIssued): {
  netGbp: number;
  vatGbp: number;
  grossGbp: number;
} {
  // Snapshot fields are populated on save (in-app) or by the CSV
  // importer (which records GBP for non-GBP invoices). Fall back to
  // calc for older invoices that pre-date the snapshot fields.
  if (
    typeof inv.gbp_equivalent === "number" &&
    typeof inv.vat_amount === "number" &&
    typeof inv.net_amount === "number"
  ) {
    return {
      netGbp: inv.net_amount,
      vatGbp: inv.vat_amount,
      grossGbp: inv.gbp_equivalent,
    };
  }
  const b = calculateVatBreakdown(inv.items, inv.vat_treatment, inv.vat_amount_override);
  return { netGbp: b.subtotal, vatGbp: b.vatAmount, grossGbp: b.total };
}

export interface DateRange {
  start: string; // YYYY-MM-DD inclusive
  end: string;   // YYYY-MM-DD inclusive
}

/* ── Period helpers ── */

export function currentMonth(today = new Date()): DateRange {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  return {
    start: iso(new Date(Date.UTC(y, m, 1))),
    end: iso(new Date(Date.UTC(y, m + 1, 0))),
  };
}

export function currentQuarter(today = new Date()): DateRange {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const qStart = Math.floor(m / 3) * 3;
  return {
    start: iso(new Date(Date.UTC(y, qStart, 1))),
    end: iso(new Date(Date.UTC(y, qStart + 3, 0))),
  };
}

/* UK tax year: 6 April → 5 April. If today is before 6 April, the
 * current tax year started last calendar year. */
export function currentUkTaxYear(today = new Date()): DateRange {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();
  const beforeApril6 = m < 3 || (m === 3 && d < 6);
  const startYear = beforeApril6 ? y - 1 : y;
  return {
    start: iso(new Date(Date.UTC(startYear, 3, 6))),
    end: iso(new Date(Date.UTC(startYear + 1, 3, 5))),
  };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function inRange(date: string | undefined, range: DateRange): boolean {
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

/* ── Period totals ── */

export interface PeriodTotals {
  revenueGross: number;
  revenueNet: number;
  vatCollected: number;
  vatPaidInput: number;
  vatOwed: number;            // collected - reclaimable input
  expensesGross: number;
  expensesNet: number;        // expenses minus reclaimable VAT
  expensesByCategory: Record<string, number>;
  grossProfit: number;        // revenueNet - expensesNet
  corporationTax: number;
  netProfitAfterTax: number;
  invoiceCount: number;
  expenseCount: number;
}

/**
 * Receivables count toward revenue when sent OR paid in the period.
 * We pick invoice_date (when we billed) as the recognition point — that
 * matches accruals accounting which is what HMRC expects from a Ltd.
 * Drafts are excluded.
 */
export function computePeriodTotals(
  invoices: InvoiceIssued[],
  expenses: Expense[],
  range: DateRange,
  options: { vatRegistered: boolean } = { vatRegistered: false },
): PeriodTotals {
  // Exclude draft (not yet billed) and disputed (parked, awaiting correction).
  const recognised = invoices.filter(
    (i) =>
      i.status !== "draft" &&
      i.status !== "disputed" &&
      inRange(i.invoice_date, range),
  );

  let revenueNet = 0;
  let vatCollected = 0;
  for (const inv of recognised) {
    const t = invoiceTotalsGbp(inv);
    revenueNet += t.netGbp;
    vatCollected += t.vatGbp;
  }
  const revenueGross = round2(revenueNet + vatCollected);

  // Exclude disputed expenses from totals — they're parked pending resolution.
  const paidExpenses = expenses.filter(
    (e) => e.status !== "disputed" && inRange(e.date_paid, range),
  );

  let expensesGross = 0;
  let vatPaidInput = 0;
  const expensesByCategory: Record<string, number> = {};

  for (const exp of paidExpenses) {
    expensesGross += exp.amount;
    const reclaimableVat = options.vatRegistered && exp.vat_included
      ? (exp.vat_amount ?? exp.amount - exp.amount / (1 + 0.2))
      : 0;
    vatPaidInput += reclaimableVat;

    const netCost = exp.amount - reclaimableVat;
    expensesByCategory[exp.category] =
      (expensesByCategory[exp.category] ?? 0) + netCost;
  }

  expensesGross = round2(expensesGross);
  vatPaidInput = round2(vatPaidInput);
  for (const k of Object.keys(expensesByCategory)) {
    expensesByCategory[k] = round2(expensesByCategory[k]);
  }
  const expensesNet = round2(expensesGross - vatPaidInput);

  const vatOwed = round2(Math.max(0, vatCollected - vatPaidInput));

  const grossProfit = round2(round2(revenueNet) - expensesNet);
  const corporationTax = round2(estimateCorporationTax(grossProfit));
  const netProfitAfterTax = round2(grossProfit - corporationTax);

  return {
    revenueGross,
    revenueNet: round2(revenueNet),
    vatCollected: round2(vatCollected),
    vatPaidInput,
    vatOwed,
    expensesGross,
    expensesNet,
    expensesByCategory,
    grossProfit,
    corporationTax,
    netProfitAfterTax,
    invoiceCount: recognised.length,
    expenseCount: paidExpenses.length,
  };
}

/**
 * UK Corporation Tax estimate (FY 2023+ rates).
 *  - 19% small profits rate on profits ≤ £50,000
 *  - 25% main rate on profits ≥ £250,000
 *  - Marginal relief in the £50,000–£250,000 band (effective ~26.5%
 *    on profits within the band)
 *
 * Formula for marginal relief:
 *   MR = (Upper - Profits) × (Profits / Profits) × (3/200)
 *   Tax = Profits × 25% - MR
 *
 * This is an *estimate*. Quarterly instalments, group relief, R&D
 * claims etc. are out of scope. Display with a disclaimer.
 */
export function estimateCorporationTax(profit: number): number {
  if (profit <= 0) return 0;
  if (profit <= 50_000) return profit * 0.19;
  if (profit >= 250_000) return profit * 0.25;
  const marginalRelief = (250_000 - profit) * (3 / 200);
  return profit * 0.25 - marginalRelief;
}

/* ── Monthly time series for charts ── */

export interface MonthlyDatum {
  month: string;  // YYYY-MM
  label: string;  // e.g. "Apr 26"
  revenue: number;
  expenses: number;
  profit: number;
}

export function computeMonthlySeries(
  invoices: InvoiceIssued[],
  expenses: Expense[],
  range: DateRange,
): MonthlyDatum[] {
  const months = monthsBetween(range.start, range.end);
  const series: MonthlyDatum[] = months.map((m) => ({
    month: m,
    label: monthLabel(m),
    revenue: 0,
    expenses: 0,
    profit: 0,
  }));

  const byMonth: Record<string, MonthlyDatum> = Object.fromEntries(
    series.map((d) => [d.month, d]),
  );

  for (const inv of invoices) {
    if (inv.status === "draft" || inv.status === "disputed") continue;
    const m = inv.invoice_date?.slice(0, 7);
    if (!m || !byMonth[m]) continue;
    const t = invoiceTotalsGbp(inv);
    byMonth[m].revenue = round2(byMonth[m].revenue + t.netGbp);
  }

  for (const exp of expenses) {
    if (exp.status === "disputed") continue;
    if (!exp.date_paid) continue;
    const m = exp.date_paid.slice(0, 7);
    if (!byMonth[m]) continue;
    byMonth[m].expenses = round2(byMonth[m].expenses + exp.amount);
  }

  for (const d of series) {
    d.profit = round2(d.revenue - d.expenses);
  }

  return series;
}

function monthsBetween(start: string, end: string): string[] {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const out: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ── Rolling 12-month revenue for VAT threshold detection ──
 *
 * HMRC's VAT registration test: if taxable turnover in any rolling
 * 12-month period exceeds the threshold (£90,000 from April 2024),
 * registration becomes mandatory within 30 days.
 *
 * Recognised the same way as PeriodTotals: invoice_date when status
 * is not draft.
 */
export const VAT_REGISTRATION_THRESHOLD_GBP = 90_000;
export const VAT_WARNING_BUFFER_GBP = 5_000; // surface at £85k

export interface VatThresholdStatus {
  rolling12mNet: number;
  threshold: number;
  warningTrigger: number;
  status: "ok" | "approaching" | "exceeded";
  monthsCovered: number;
}

export function computeVatThresholdStatus(
  invoices: InvoiceIssued[],
  today = new Date(),
): VatThresholdStatus {
  const cutoff = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 12, today.getUTCDate()),
  );
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const todayISO = today.toISOString().slice(0, 10);

  let total = 0;
  for (const inv of invoices) {
    if (inv.status === "draft" || inv.status === "disputed") continue;
    if (!inv.invoice_date) continue;
    if (inv.invoice_date < cutoffISO || inv.invoice_date > todayISO) continue;
    total += invoiceTotalsGbp(inv).netGbp;
  }
  total = round2(total);

  const warningTrigger = VAT_REGISTRATION_THRESHOLD_GBP - VAT_WARNING_BUFFER_GBP;
  const status: VatThresholdStatus["status"] =
    total >= VAT_REGISTRATION_THRESHOLD_GBP
      ? "exceeded"
      : total >= warningTrigger
        ? "approaching"
        : "ok";

  return {
    rolling12mNet: total,
    threshold: VAT_REGISTRATION_THRESHOLD_GBP,
    warningTrigger,
    status,
    monthsCovered: 12,
  };
}

/* ── Committed recurring outflow ──
 *
 * Sum of recurring expenses normalised to a monthly cost, then
 * projected over N months. Lets the dashboard show "committed outflow
 * over the next 3 months" without us having to write forward-dated
 * rows.
 */
export interface CommittedOutflow {
  monthlyTotal: number;
  projectedTotal: number;
  monthsProjected: number;
  byFrequency: Record<string, number>;
}

export function computeCommittedOutflow(
  expenses: Expense[],
  monthsAhead = 3,
): CommittedOutflow {
  let monthly = 0;
  const byFrequency: Record<string, number> = { monthly: 0, quarterly: 0, annual: 0 };
  for (const exp of expenses) {
    if (!exp.recurring) continue;
    if (exp.status === "disputed") continue;
    let monthlyEquivalent = 0;
    if (exp.recurring === "monthly") monthlyEquivalent = exp.amount;
    else if (exp.recurring === "quarterly") monthlyEquivalent = exp.amount / 3;
    else if (exp.recurring === "annual") monthlyEquivalent = exp.amount / 12;
    monthly += monthlyEquivalent;
    byFrequency[exp.recurring] = round2((byFrequency[exp.recurring] ?? 0) + monthlyEquivalent);
  }
  monthly = round2(monthly);
  return {
    monthlyTotal: monthly,
    projectedTotal: round2(monthly * monthsAhead),
    monthsProjected: monthsAhead,
    byFrequency,
  };
}
