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
} from "@/lib/finance/calc";
import {
  EXPENSE_CATEGORY_LABELS,
  type InvoiceIssued,
  type Expense,
  type CompanyProfile,
  type ExpenseCategory,
} from "@/lib/finance/types";
import { inputClass } from "@/lib/form-styles";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  ComposedChart,
  Line,
  CartesianGrid,
} from "recharts";

type PeriodKey = "month" | "quarter" | "tax_year" | "custom";

const PERIOD_LABEL: Record<PeriodKey, string> = {
  month: "this month",
  quarter: "this quarter",
  tax_year: "this tax year",
  custom: "the selected period",
};

/* Categorical series colours come from the sanctioned chart palette tokens
 * (globals.css --color-chart-N). Slices are coloured by rank, cycled. */
const CHART_TOKENS = [
  "--color-chart-1",
  "--color-chart-2",
  "--color-chart-3",
  "--color-chart-4",
  "--color-chart-5",
  "--color-chart-6",
  "--color-chart-7",
  "--color-chart-8",
] as const;

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

  const vatThreshold = useMemo(() => computeVatThresholdStatus(invoices), [invoices]);
  const committed = useMemo(() => computeCommittedOutflow(expenses, 3), [expenses]);

  const trailingSeries = useMemo(() => {
    const today = new Date();
    const endISO = today.toISOString().slice(0, 10);
    const start = new Date(today);
    start.setUTCFullYear(start.getUTCFullYear() - 2);
    const startISO = start.toISOString().slice(0, 10);
    const all = computeMonthlySeries(invoices, expenses, {
      start: startISO,
      end: endISO,
    });
    return all.slice(-12);
  }, [invoices, expenses]);

  const expenseSlices = useMemo(() => {
    return (Object.entries(totals.expensesByCategory) as [ExpenseCategory, number][])
      .filter(([, v]) => v > 0)
      .map(([cat, v]) => ({
        name: EXPENSE_CATEGORY_LABELS[cat],
        value: Math.round(v * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value)
      .map((s, i) => ({ ...s, colorVar: CHART_TOKENS[i % CHART_TOKENS.length] }));
  }, [totals.expensesByCategory]);

  /* The trend follows the period selector. A range spanning >= 2 months plots
   * that range's monthly series; a single-month range can't draw a line, so it
   * falls back to the rolling 12-month trend for context. */
  const { chartSeries, chartLabel } = useMemo(() => {
    const s = new Date(range.start);
    const e = new Date(range.end);
    const span = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1;
    if (span >= 2) {
      const label =
        periodKey === "quarter"
          ? "This quarter"
          : periodKey === "tax_year"
            ? "This tax year"
            : "Selected period";
      return { chartSeries: computeMonthlySeries(invoices, expenses, range), chartLabel: label };
    }
    return { chartSeries: trailingSeries, chartLabel: "Rolling 12 months" };
  }, [range, periodKey, invoices, expenses, trailingSeries]);

  const net = totals.netProfitAfterTax;
  const showVat =
    profile?.vat_registered || totals.vatCollected > 0 || totals.vatPaidInput > 0;

  const summary = useMemo(() => {
    const gp = totals.grossProfit;
    const gpPhrase =
      gp >= 0
        ? `a gross profit of ${fmtMoney(gp)}`
        : `a gross loss of ${fmtMoney(Math.abs(gp))}`;
    return `${fmtMoney(totals.revenueNet)} in, ${fmtMoney(totals.expensesGross)} out. That's ${gpPhrase}, with ${fmtMoney(totals.corporationTax)} set aside for corporation tax.`;
  }, [totals]);

  if (!hydrated) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-56 bg-surface rounded-lg animate-pulse" />
        <div className="h-72 bg-surface rounded-lg border border-border animate-pulse" />
        <div className="h-48 bg-surface rounded-lg border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <PeriodPills value={periodKey} onChange={setPeriodKey} />
          {periodKey === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className={`${inputClass} h-8`}
              />
              <span className="text-2xs text-subtle">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className={`${inputClass} h-8`}
              />
            </div>
          )}
        </div>
        {!profile?.vat_registered && vatThreshold.status !== "ok" && (
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-2xs border w-fit ${
              vatThreshold.status === "exceeded"
                ? "bg-danger/10 border-danger/20 text-danger"
                : "bg-warning/10 border-warning/20 text-warning"
            }`}
          >
            <span className="size-1.5 rounded-full bg-current shrink-0" />
            <span className="font-medium">
              {vatThreshold.status === "exceeded"
                ? "VAT registration mandatory"
                : "Approaching VAT threshold"}
            </span>
            <span className="opacity-70 tabular-nums">
              {fmtMoney(vatThreshold.rolling12mNet)} / {fmtMoney(vatThreshold.threshold)}
            </span>
          </div>
        )}
      </div>

      {/* HERO: period P&L + trend, one dominant surface */}
      <div className="bg-surface border border-border rounded-lg grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Left: the number + story, with a full-bleed supporting strip */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-dashed border-border">
          <div className="p-5 flex-1">
            <div className="text-2xs uppercase tracking-wider text-subtle font-medium">
              Net profit · {PERIOD_LABEL[periodKey]}
            </div>
            <div
              className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight leading-none ${
                net >= 0 ? "text-foreground" : "text-danger"
              }`}
            >
              {fmtMoney(net)}
            </div>
            <p className="mt-3 text-sm text-muted leading-relaxed max-w-sm">{summary}</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-dashed divide-border border-t border-dashed border-border">
            <MiniStat label="Revenue" value={fmtMoney(totals.revenueNet)} sub={`${fmtMoney(totals.revenueGross)} gross`} />
            <MiniStat label="Expenses" value={fmtMoney(totals.expensesGross)} sub={`${totals.expenseCount} paid`} />
            <MiniStat
              label="Gross"
              value={fmtMoney(totals.grossProfit)}
              accent={totals.grossProfit >= 0 ? "green" : "red"}
            />
          </div>
        </div>

        {/* Right: trend */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">Revenue vs expenses</h3>
              <p className="text-2xs text-subtle mt-0.5">{chartLabel}</p>
            </div>
            <div className="flex items-center gap-4">
              <Legend dotVar="--color-success" label="Revenue" />
              <Legend dotVar="--color-subtle" label="Expenses" />
            </div>
          </div>
          {chartSeries.length === 0 ? (
            <p className="text-sm text-subtle py-20 text-center">No invoice or expense data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={228}>
              <ComposedChart data={chartSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "var(--color-subtle)" }}
                  axisLine={false}
                  tickLine={false}
                  padding={{ left: 8, right: 8 }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--color-subtle)" }}
                  tickFormatter={(v) => (v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`)}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="none"
                  fill="var(--color-success)"
                  fillOpacity={0.08}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-success)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: "var(--color-success)" }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="var(--color-subtle)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: "var(--color-subtle)" }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Expense breakdown</h3>
          {expenseSlices.length === 0 ? (
            <p className="text-sm text-subtle py-12 text-center">No expenses this period</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[168px_1fr] gap-5 items-center">
              <DonutChart slices={expenseSlices} />
              <div className="space-y-2">
                {expenseSlices.slice(0, 6).map((s) => {
                  const total = expenseSlices.reduce((sum, x) => sum + x.value, 0);
                  const pct = total > 0 ? (s.value / total) * 100 : 0;
                  return (
                    <div key={s.name} className="flex items-center gap-2.5 text-xs">
                      <span className="size-2 rounded-full shrink-0" style={{ background: `var(${s.colorVar})` }} />
                      <span className="text-muted flex-1 truncate">{s.name}</span>
                      <div className="w-20 h-1 rounded-full bg-surface-raised overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `var(${s.colorVar})` }} />
                      </div>
                      <span className="tabular-nums text-subtle text-2xs w-8 text-right">{pct.toFixed(0)}%</span>
                      <span className="tabular-nums text-foreground w-[68px] text-right">{fmtMoney(s.value)}</span>
                    </div>
                  );
                })}
                {expenseSlices.length > 6 && (
                  <div className="text-2xs text-subtle pt-0.5">+{expenseSlices.length - 6} more categories</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column: one full-height panel */}
        <div className="bg-surface border border-border rounded-lg p-5 h-full flex flex-col gap-6">
          {showVat && (
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3">
                VAT {profile?.vat_registered ? "" : "(estimate)"}
              </h3>
              <div className="space-y-2.5">
                <KeyRow label="Collected" value={fmtMoney(totals.vatCollected)} />
                <KeyRow label="Paid (reclaimable)" value={fmtMoney(totals.vatPaidInput)} />
                <div className="border-t border-dashed border-border pt-2.5">
                  <KeyRow
                    label="Owed"
                    value={fmtMoney(totals.vatOwed)}
                    accent={totals.vatOwed > 0 ? "amber" : undefined}
                    strong
                  />
                </div>
              </div>
            </section>
          )}
          <section>
            <h3 className="text-sm font-medium text-foreground mb-3">Forecast</h3>
            <div className="space-y-2.5">
              <KeyRow label="Recurring / month" value={fmtMoney(committed.monthlyTotal)} />
              <KeyRow label={`Projected · ${committed.monthsProjected}mo`} value={fmtMoney(committed.projectedTotal)} />
            </div>
          </section>
          <section className="mt-auto pt-4 border-t border-dashed border-border">
            <KeyRow
              label="Rolling 12mo turnover"
              value={fmtMoney(vatThreshold.rolling12mNet)}
              accent={
                vatThreshold.status === "exceeded"
                  ? "red"
                  : vatThreshold.status === "approaching"
                    ? "amber"
                    : undefined
              }
              strong
            />
            <p className="text-2xs text-subtle mt-1.5">VAT threshold {fmtMoney(vatThreshold.threshold)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function PeriodPills({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (k: PeriodKey) => void;
}) {
  const options: { key: PeriodKey; label: string }[] = [
    { key: "month", label: "Month" },
    { key: "quarter", label: "Quarter" },
    { key: "tax_year", label: "Tax year" },
    { key: "custom", label: "Custom" },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 bg-surface-raised rounded-lg border border-border">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`px-3 py-1 rounded-md text-2xs font-medium transition-colors ${
              active ? "bg-surface text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red";
}) {
  const color = accent === "green" ? "text-success" : accent === "red" ? "text-danger" : "text-foreground";
  return (
    <div className="px-5 py-4">
      <div className="text-2xs uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div className={`mt-1.5 text-sm font-semibold tabular-nums tracking-tight leading-none ${color}`}>{value}</div>
      {sub && <div className="text-2xs text-subtle mt-1">{sub}</div>}
    </div>
  );
}

function KeyRow({
  label,
  value,
  accent,
  strong,
}: {
  label: string;
  value: string;
  accent?: "red" | "amber";
  strong?: boolean;
}) {
  const color = accent === "red" ? "text-danger" : accent === "amber" ? "text-warning" : "text-foreground";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-xs ${strong ? "text-foreground" : "text-muted"}`}>{label}</span>
      <span className={`text-sm tabular-nums ${strong ? "font-semibold" : "font-medium"} ${color}`}>{value}</span>
    </div>
  );
}

function DonutChart({
  slices,
}: {
  slices: { name: string; value: number; colorVar: string }[];
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const active = activeIdx !== null ? slices[activeIdx] : null;
  const activePct = active && total > 0 ? (active.value / total) * 100 : 0;
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={168}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={76}
            paddingAngle={2}
            strokeWidth={0}
            cornerRadius={4}
            onMouseEnter={(_, idx) => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            {slices.map((s, i) => (
              <Cell
                key={i}
                fill={`var(${s.colorVar})`}
                opacity={activeIdx === null || activeIdx === i ? 1 : 0.3}
                style={{ transition: "opacity 180ms" }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {active ? (
          <>
            <div className="text-2xs uppercase tracking-wider font-medium mb-0.5" style={{ color: `var(${active.colorVar})` }}>
              {active.name}
            </div>
            <div className="text-sm font-semibold tabular-nums text-foreground leading-none">{fmtMoney(active.value)}</div>
            <div className="text-2xs text-subtle mt-1 tabular-nums">{activePct.toFixed(0)}%</div>
          </>
        ) : (
          <>
            <div className="text-2xs uppercase tracking-wider text-subtle font-medium mb-0.5">Total</div>
            <div className="text-sm font-semibold tabular-nums text-foreground leading-none">{fmtMoney(total)}</div>
            <div className="text-2xs text-subtle mt-1">
              {slices.length} categor{slices.length === 1 ? "y" : "ies"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Legend({ dotVar, label }: { dotVar: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-subtle">
      <span className="size-2 rounded-full" style={{ background: `var(${dotVar})` }} />
      {label}
    </span>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const revenue = Number(payload.find((p) => p.dataKey === "revenue")?.value ?? 0);
  const expenses = Number(payload.find((p) => p.dataKey === "expenses")?.value ?? 0);
  const total = revenue + expenses;
  return (
    <div className="pointer-events-none rounded-md border border-border bg-surface-raised px-3 py-2.5 min-w-[184px]">
      <div className="text-2xs uppercase tracking-wider text-subtle font-medium mb-1">{label}</div>
      <div className="text-sm font-semibold tabular-nums leading-none text-foreground mb-2.5">{fmtMoney(total)}</div>
      <div className="flex items-center gap-2 text-xs mb-1">
        <span className="size-2 rounded-full bg-success" />
        <span className="text-muted">Revenue</span>
        <span className="ml-auto tabular-nums text-foreground">{fmtMoney(revenue)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="size-2 rounded-full bg-subtle" />
        <span className="text-muted">Expenses</span>
        <span className="ml-auto tabular-nums text-foreground">{fmtMoney(expenses)}</span>
      </div>
    </div>
  );
}
