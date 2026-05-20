"use client";

import { useEffect, useMemo, useState } from "react";
import {
  invoicesIssuedStore,
  expensesStore,
  fmtMoney,
} from "@/lib/finance/data";
import { loadCompanyProfile } from "@/lib/finance/profile";
import {
  computePeriodTotals,
  computeMonthlySeries,
  computeVatThresholdStatus,
  computeCommittedOutflow,
  currentMonth,
  currentQuarter,
  currentUkTaxYear,
  type DateRange,
  type PeriodTotals,
  type MonthlyDatum,
} from "@/lib/finance/calc";
import {
  EXPENSE_CATEGORY_LABELS,
  type InvoiceIssued,
  type Expense,
  type CompanyProfile,
  type ExpenseCategory,
} from "@/lib/finance/types";
import { selectClass, inputClass, labelClass } from "@/lib/form-styles";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type PeriodKey = "month" | "quarter" | "tax_year" | "custom";

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  team_salary: "#1B1B1B",
  contractor: "#7C3AED",
  software: "#0EA5E9",
  office: "#EAB308",
  marketing: "#EC4899",
  advertising: "#F472B6",
  platform_fee: "#0891B2",
  bank_fee: "#0D9488",
  professional_services: "#16A34A",
  travel: "#D97746",
  fuel: "#C2410C",
  food_drink: "#F59E0B",
  entertainment: "#A855F7",
  tax: "#B91C1C",
  other: "#7A7A7A",
};

export default function FinanceDashboardPage() {
  const [invoices, setInvoices] = useState<InvoiceIssued[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [periodKey, setPeriodKey] = useState<PeriodKey>("month");
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
    if (periodKey === "month") return currentMonth();
    if (periodKey === "quarter") return currentQuarter();
    if (periodKey === "tax_year") return currentUkTaxYear();
    return {
      start: customStart || currentMonth().start,
      end: customEnd || currentMonth().end,
    };
  }, [periodKey, customStart, customEnd]);

  const totals: PeriodTotals = useMemo(
    () =>
      computePeriodTotals(invoices, expenses, range, {
        vatRegistered: profile?.vat_registered ?? false,
      }),
    [invoices, expenses, range, profile],
  );

  const monthly: MonthlyDatum[] = useMemo(
    () => computeMonthlySeries(invoices, expenses, range),
    [invoices, expenses, range],
  );

  const vatThreshold = useMemo(() => computeVatThresholdStatus(invoices), [invoices]);
  const committed = useMemo(() => computeCommittedOutflow(expenses, 3), [expenses]);

  const expenseSlices = useMemo(() => {
    return (Object.entries(totals.expensesByCategory) as [ExpenseCategory, number][])
      .filter(([, v]) => v > 0)
      .map(([cat, v]) => ({
        name: EXPENSE_CATEGORY_LABELS[cat],
        value: Math.round(v * 100) / 100,
        color: CATEGORY_COLORS[cat],
      }))
      .sort((a, b) => b.value - a.value);
  }, [totals.expensesByCategory]);

  if (!hydrated) {
    return <div className="h-96 bg-[#F7F8FA] rounded-xl animate-pulse" />;
  }

  return (
    <div>
      {!profile?.vat_registered && vatThreshold.status !== "ok" && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm border ${
            vatThreshold.status === "exceeded"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <strong>
            {vatThreshold.status === "exceeded"
              ? "VAT registration is now mandatory."
              : "You're approaching the VAT registration threshold."}
          </strong>{" "}
          Rolling 12-month taxable turnover is {fmtMoney(vatThreshold.rolling12mNet)}.
          HMRC requires registration when turnover exceeds {fmtMoney(vatThreshold.threshold)} in any rolling 12 months.{" "}
          {vatThreshold.status === "exceeded"
            ? "Register within 30 days of crossing the threshold, then toggle 'VAT registered' on in Settings."
            : `${fmtMoney(vatThreshold.threshold - vatThreshold.rolling12mNet)} of headroom remaining.`}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelClass}>Period</label>
            <select
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value as PeriodKey)}
              className={`${selectClass} w-48`}
            >
              <option value="month">Current month</option>
              <option value="quarter">Current quarter</option>
              <option value="tax_year">Current UK tax year</option>
              <option value="custom">Custom</option>
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
        </div>
        <div className="text-xs text-[#7A7A7A]">
          {range.start} → {range.end}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Tile
          label="Revenue (net)"
          value={fmtMoney(totals.revenueNet)}
          sub={`${fmtMoney(totals.revenueGross)} gross`}
        />
        <Tile
          label="Expenses"
          value={fmtMoney(totals.expensesGross)}
          sub={`${totals.expenseCount} items paid`}
        />
        <Tile
          label="Gross profit"
          value={fmtMoney(totals.grossProfit)}
          accent={totals.grossProfit >= 0 ? "green" : "red"}
        />
        <Tile
          label="Net profit (after tax est.)"
          value={fmtMoney(totals.netProfitAfterTax)}
          sub={`${fmtMoney(totals.corporationTax)} CT estimate`}
          accent={totals.netProfitAfterTax >= 0 ? "green" : "red"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Tile
          label="VAT collected"
          value={fmtMoney(totals.vatCollected)}
          sub={profile?.vat_registered ? "From UK invoices" : "Not VAT registered"}
        />
        <Tile
          label="VAT paid (input)"
          value={fmtMoney(totals.vatPaidInput)}
          sub={profile?.vat_registered ? "Reclaimable from expenses" : "—"}
        />
        <Tile
          label="VAT owed"
          value={fmtMoney(totals.vatOwed)}
          sub="Collected minus reclaimable"
          accent={totals.vatOwed > 0 ? "amber" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <Tile
          label="Committed recurring (monthly)"
          value={fmtMoney(committed.monthlyTotal)}
          sub={`${fmtMoney(committed.byFrequency.monthly || 0)} monthly · ${fmtMoney(committed.byFrequency.quarterly || 0)} qtrly · ${fmtMoney(committed.byFrequency.annual || 0)} ann (normalised)`}
        />
        <Tile
          label={`Projected outflow (next ${committed.monthsProjected}mo)`}
          value={fmtMoney(committed.projectedTotal)}
          sub="From recurring expenses only"
        />
        <Tile
          label="Rolling 12mo turnover"
          value={fmtMoney(vatThreshold.rolling12mNet)}
          sub={
            vatThreshold.status === "exceeded"
              ? `Over VAT threshold (${fmtMoney(vatThreshold.threshold)})`
              : `Headroom ${fmtMoney(vatThreshold.threshold - vatThreshold.rolling12mNet)}`
          }
          accent={
            vatThreshold.status === "exceeded"
              ? "red"
              : vatThreshold.status === "approaching"
                ? "amber"
                : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-[#E5E5EA] rounded-xl p-5 shadow-[var(--shadow-soft)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
            Revenue vs expenses (monthly)
          </h3>
          {monthly.length === 0 ? (
            <p className="text-sm text-[#A0A0A0] py-12 text-center">
              No data in this period
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A7A7A" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#7A7A7A" }}
                  tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #E5E5EA",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => fmtMoney(Number(v) || 0)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" fill="#1B1B1B" name="Revenue" />
                <Bar dataKey="expenses" fill="#EC4899" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-[#E5E5EA] rounded-xl p-5 shadow-[var(--shadow-soft)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
            Expenses by category
          </h3>
          {expenseSlices.length === 0 ? (
            <p className="text-sm text-[#A0A0A0] py-12 text-center">No expenses</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={expenseSlices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {expenseSlices.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "white",
                      border: "1px solid #E5E5EA",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => fmtMoney(Number(v) || 0)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-1.5">
                {expenseSlices.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: s.color }}
                    />
                    <span className="text-[#7A7A7A] flex-1 truncate">{s.name}</span>
                    <span className="tabular-nums">{fmtMoney(s.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
        <strong>Estimate only.</strong> Corporation Tax is calculated using current UK rates
        (19% under £50k, marginal relief £50k–£250k, 25% over £250k). VAT figures assume the
        company {profile?.vat_registered ? "is" : "is not"} VAT registered. Confirm all figures
        with your accountant before submitting to HMRC.
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "amber";
}) {
  const color =
    accent === "green"
      ? "text-[#047857]"
      : accent === "red"
        ? "text-[#B91C1C]"
        : accent === "amber"
          ? "text-[#B45309]"
          : "text-[#1B1B1B]";
  return (
    <div className="bg-white border border-[#E5E5EA] rounded-xl p-4 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] uppercase tracking-wider text-[#7A7A7A] mb-1">{label}</div>
      <div className={`text-xl md:text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-[#A0A0A0] mt-1">{sub}</div>}
    </div>
  );
}
