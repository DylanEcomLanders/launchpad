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
import { Table, THead, TBody, TR, TH, TD, Num } from "@/components/ui";

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
    return <div className="h-96 bg-surface rounded-md border border-border-faint animate-pulse" />;
  }

  return (
    <div className="space-y-6">
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
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
        >
          <ArrowDownTrayIcon className="size-3.5" /> Download VAT pack (.zip)
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
        <div className="bg-surface border border-border-faint rounded-md px-4 py-3 text-sm text-muted">
          <strong className="text-foreground font-medium">Reverse charge:</strong> {fmtMoney(ret.reverseChargeTotal)} of non-UK B2B sales in
          this period are zero-VAT under reverse charge. The net value is included in Box 6; output
          VAT on those supplies is zero.
        </div>
      )}

      <div className="bg-surface border border-border-faint rounded-md p-4 text-xs text-status-approaching">
        <strong>Estimate only - confirm with accountant before filing.</strong> {ret.noteForAccountant}
      </div>

      {ret.sales.length > 0 && (
        <details className="bg-surface border border-border-faint rounded-md" open>
          <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-foreground flex items-center justify-between">
            <span>Sales detail ({ret.sales.length})</span>
            <span className="text-xs font-normal text-subtle">
              Net {fmtMoney(ret.box6_totalSalesExVat)} · VAT {fmtMoney(ret.box1_vatOnSales)}
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-border">
            <Table>
              <THead>
                <TR hover={false}>
                  <TH>Invoice #</TH>
                  <TH>Date</TH>
                  <TH>Client</TH>
                  <TH>Treatment</TH>
                  <TH align="right">Net</TH>
                  <TH align="right">VAT</TH>
                  <TH align="right">Gross</TH>
                </TR>
              </THead>
              <TBody>
                {ret.sales.map((s, i) => (
                  <TR key={i}>
                    <TD className="text-foreground">{s.invoice_number}</TD>
                    <TD className="text-muted"><Num>{s.date}</Num></TD>
                    <TD className="text-muted">{s.client_name}</TD>
                    <TD className="text-muted">{s.treatment}</TD>
                    <TD align="right" className="text-muted"><Num>{fmtMoney(s.net)}</Num></TD>
                    <TD align="right" className="text-muted"><Num>{fmtMoney(s.vat)}</Num></TD>
                    <TD align="right" className="text-muted"><Num>{fmtMoney(s.gross)}</Num></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </details>
      )}

      {ret.purchases.length > 0 && (
        <details className="bg-surface border border-border-faint rounded-md" open>
          <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-foreground flex items-center justify-between">
            <span>Purchases detail ({ret.purchases.length})</span>
            <span className="text-xs font-normal text-subtle">
              Net {fmtMoney(ret.box7_totalPurchasesExVat)} · VAT {fmtMoney(ret.box4_vatReclaimed)}
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-border">
            <Table>
              <THead>
                <TR hover={false}>
                  <TH>Date</TH>
                  <TH>Supplier</TH>
                  <TH>Category</TH>
                  <TH align="right">Net</TH>
                  <TH align="right">VAT</TH>
                  <TH align="right">Gross</TH>
                </TR>
              </THead>
              <TBody>
                {ret.purchases.map((p, i) => (
                  <TR key={i}>
                    <TD className="text-muted"><Num>{p.date}</Num></TD>
                    <TD className="text-foreground">{p.supplier_name}</TD>
                    <TD className="text-muted">{p.category}</TD>
                    <TD align="right" className="text-muted"><Num>{fmtMoney(p.net)}</Num></TD>
                    <TD align="right" className="text-muted"><Num>{fmtMoney(p.vat)}</Num></TD>
                    <TD align="right" className="text-muted"><Num>{fmtMoney(p.gross)}</Num></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </details>
      )}

      {ret.sales.length === 0 && ret.purchases.length === 0 && (
        <div className="bg-surface border border-border-faint rounded-md py-16 text-center">
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
      ? "text-status-ontrack"
      : accent === "amber"
        ? "text-status-approaching"
        : "text-foreground";
  return (
    <div
      className={`bg-surface border border-border-faint rounded-md p-5 flex items-center justify-between ${
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
