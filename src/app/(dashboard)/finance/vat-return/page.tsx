"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { invoicesIssuedStore, expensesStore, fmtMoney } from "@/lib/finance/data";
import { loadCompanyProfile } from "@/lib/finance/profile";
import { currentQuarter, currentUkTaxYear, type DateRange } from "@/lib/finance/calc";
import {
  computeVatReturn,
  previousQuarter,
  toSummaryCsv,
  toSalesCsv,
  toPurchasesCsv,
  type VatBasis,
  type VatReturn,
} from "@/lib/finance/vat-return";
import type {
  InvoiceIssued,
  Expense,
  CompanyProfile,
} from "@/lib/finance/types";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";

type PeriodKey = "prev_quarter" | "current_quarter" | "tax_year" | "custom";

export default function VatReturnPage() {
  const [invoices, setInvoices] = useState<InvoiceIssued[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [periodKey, setPeriodKey] = useState<PeriodKey>("prev_quarter");
  const [basis, setBasis] = useState<VatBasis>("accruals");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [inv, exp, p] = await Promise.all([
        invoicesIssuedStore.getAll(),
        expensesStore.getAll(),
        loadCompanyProfile(),
      ]);
      if (cancelled) return;
      setInvoices(inv);
      setExpenses(exp);
      setProfile(p);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const range: DateRange = useMemo(() => {
    if (periodKey === "prev_quarter") return previousQuarter();
    if (periodKey === "current_quarter") return currentQuarter();
    if (periodKey === "tax_year") return currentUkTaxYear();
    return {
      start: customStart || previousQuarter().start,
      end: customEnd || previousQuarter().end,
    };
  }, [periodKey, customStart, customEnd]);

  const ret: VatReturn = useMemo(
    () =>
      computeVatReturn(invoices, expenses, range, {
        vatRegistered: profile?.vat_registered ?? false,
        basis,
      }),
    [invoices, expenses, range, profile, basis],
  );

  async function downloadPack() {
    const zip = new JSZip();
    const periodStr = `${ret.period.start}_to_${ret.period.end}`;
    const legalName = (profile?.legal_name || "company").replace(/[^a-z0-9]/gi, "_");
    zip.file(`vat-return-summary_${periodStr}.csv`, toSummaryCsv(ret));
    zip.file(`sales_${periodStr}.csv`, toSalesCsv(ret));
    zip.file(`purchases_${periodStr}.csv`, toPurchasesCsv(ret));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${legalName}_vat-return_${periodStr}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!hydrated) {
    return <div className="h-96 bg-surface rounded-lg border border-border animate-pulse" />;
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">VAT return</h2>
        <p className="text-sm text-subtle mt-0.5">
          Standard 9-box HMRC summary for any period, plus a CSV pack the accountant can drop straight into filing.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelClass}>Period</label>
            <select
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value as PeriodKey)}
              className={`${selectClass} w-52`}
            >
              <option value="prev_quarter">Last quarter</option>
              <option value="current_quarter">Current quarter</option>
              <option value="tax_year">Current UK tax year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          {periodKey === "custom" && (
            <>
              <div>
                <label className={labelClass}>From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}
          <div>
            <label className={labelClass}>Basis</label>
            <select
              value={basis}
              onChange={(e) => setBasis(e.target.value as VatBasis)}
              className={`${selectClass} w-44`}
            >
              <option value="accruals">Accruals (invoice/due date)</option>
              <option value="cash">Cash (date paid)</option>
            </select>
          </div>
        </div>
        <button
          onClick={downloadPack}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-90"
        >
          <ArrowDownTrayIcon className="size-4" /> Download VAT pack (.zip)
        </button>
      </div>

      <p className="text-2xs text-subtle">
        {ret.period.start} → {ret.period.end} · {ret.sales.length} sales · {ret.purchases.length} purchases
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BoxRow num={1} label="VAT due on sales (output VAT)" value={ret.box1_vatOnSales} primary />
        <BoxRow num={2} label="VAT due on EU acquisitions (NI only)" value={ret.box2_vatOnAcquisitions} muted />
        <BoxRow num={3} label="Total VAT due (1 + 2)" value={ret.box3_totalVatDue} primary />
        <BoxRow num={4} label="VAT reclaimed on purchases (input VAT)" value={ret.box4_vatReclaimed} primary />
        <BoxRow
          num={5}
          label="Net VAT to pay HMRC (3 − 4)"
          value={ret.box5_netVatToHmrc}
          accent={ret.box5_netVatToHmrc > 0 ? "amber" : "green"}
          primary
        />
        <BoxRow num={6} label="Total sales excl VAT" value={ret.box6_totalSalesExVat} primary />
        <BoxRow num={7} label="Total purchases excl VAT" value={ret.box7_totalPurchasesExVat} primary />
        <BoxRow num={8} label="Supplies of goods to EU (NI only)" value={ret.box8_suppliesToEuFromNi} muted />
        <BoxRow num={9} label="Acquisitions of goods from EU (NI only)" value={ret.box9_acquisitionsFromEuToNi} muted />
      </div>

      {ret.reverseChargeTotal > 0 && (
        <div className="bg-info/10 border border-info/20 rounded-lg px-4 py-3 text-sm text-info">
          <strong>Reverse charge:</strong> {fmtMoney(ret.reverseChargeTotal)} of non-UK B2B sales in
          this period are zero-VAT under reverse charge. The net value is included in Box 6; output
          VAT on those supplies is zero.
        </div>
      )}

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-xs text-warning">
        <strong>Estimate only - confirm with accountant before filing.</strong> {ret.noteForAccountant}
      </div>

      {ret.sales.length > 0 && (
        <details className="bg-surface border border-border rounded-lg" open>
          <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-foreground flex items-center justify-between">
            <span>Sales detail ({ret.sales.length})</span>
            <span className="text-xs font-normal text-subtle">
              Net {fmtMoney(ret.box6_totalSalesExVat)} · VAT {fmtMoney(ret.box1_vatOnSales)}
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-dashed border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dashed border-border">
                  <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Invoice #</th>
                  <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Date</th>
                  <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Client</th>
                  <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Treatment</th>
                  <th className="text-right px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Net</th>
                  <th className="text-right px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">VAT</th>
                  <th className="text-right px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Gross</th>
                </tr>
              </thead>
              <tbody>
                {ret.sales.map((s, i) => (
                  <tr key={i} className="border-b border-dashed border-border last:border-0">
                    <td className="px-5 py-3 text-sm text-foreground font-medium">{s.invoice_number}</td>
                    <td className="px-5 py-3 text-xs text-muted tabular-nums">{s.date}</td>
                    <td className="px-5 py-3 text-sm text-foreground">{s.client_name}</td>
                    <td className="px-5 py-3 text-xs text-muted">{s.treatment}</td>
                    <td className="px-5 py-3 text-right text-sm text-foreground tabular-nums">{fmtMoney(s.net)}</td>
                    <td className="px-5 py-3 text-right text-sm text-foreground tabular-nums">{fmtMoney(s.vat)}</td>
                    <td className="px-5 py-3 text-right text-sm text-foreground tabular-nums">{fmtMoney(s.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {ret.purchases.length > 0 && (
        <details className="bg-surface border border-border rounded-lg" open>
          <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-foreground flex items-center justify-between">
            <span>Purchases detail ({ret.purchases.length})</span>
            <span className="text-xs font-normal text-subtle">
              Net {fmtMoney(ret.box7_totalPurchasesExVat)} · VAT {fmtMoney(ret.box4_vatReclaimed)}
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-dashed border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dashed border-border">
                  <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Date</th>
                  <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Supplier</th>
                  <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Category</th>
                  <th className="text-right px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Net</th>
                  <th className="text-right px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">VAT</th>
                  <th className="text-right px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Gross</th>
                </tr>
              </thead>
              <tbody>
                {ret.purchases.map((p, i) => (
                  <tr key={i} className="border-b border-dashed border-border last:border-0">
                    <td className="px-5 py-3 text-xs text-muted tabular-nums">{p.date}</td>
                    <td className="px-5 py-3 text-sm text-foreground font-medium">{p.supplier_name}</td>
                    <td className="px-5 py-3 text-xs text-muted">{p.category}</td>
                    <td className="px-5 py-3 text-right text-sm text-foreground tabular-nums">{fmtMoney(p.net)}</td>
                    <td className="px-5 py-3 text-right text-sm text-foreground tabular-nums">{fmtMoney(p.vat)}</td>
                    <td className="px-5 py-3 text-right text-sm text-foreground tabular-nums">{fmtMoney(p.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {ret.sales.length === 0 && ret.purchases.length === 0 && (
        <div className="bg-surface border border-border rounded-lg p-12 text-center">
          <p className="text-sm text-subtle">No invoices or expenses in this period.</p>
        </div>
      )}
    </div>
  );
}

function BoxRow({
  num,
  label,
  value,
  primary,
  muted,
  accent,
}: {
  num: number;
  label: string;
  value: number;
  primary?: boolean;
  muted?: boolean;
  accent?: "green" | "amber";
}) {
  const color =
    accent === "green"
      ? "text-success"
      : accent === "amber"
        ? "text-warning"
        : "text-foreground";
  return (
    <div
      className={`bg-surface border border-border rounded-lg p-5 flex items-center justify-between ${
        muted ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center size-6 rounded-md bg-surface-raised text-2xs font-medium tabular-nums text-subtle">
          {num}
        </span>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className={`text-lg font-semibold tabular-nums ${color}`}>
        {fmtMoney(value)}
      </span>
    </div>
  );
}
