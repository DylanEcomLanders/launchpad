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
import { inputClass } from "@/lib/form-styles";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  ComposedChart,
  Line,
} from "recharts";
import {
  BanknotesIcon,
  CreditCardIcon,
  ScaleIcon,
  ChartPieIcon,
  ReceiptPercentIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

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

  /* Last-N-months series, computed once and sliced for the sparklines
   * (last 6) + the main chart (last 12). Always uses the full dataset
   * regardless of the page-level period filter so the chart's purpose
   * stays "trend context" - the KPI tiles above show the filtered value
   * for the selected period, the chart shows the rolling 12mo trend.
   * Same pattern as Stripe / Wise dashboards.
   *
   * IMPORTANT: end the range at today, not at a sentinel like 2099, or
   * `.slice(-12)` will grab 12 months of empty 2099 entries. */
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

  const sparkSeries = useMemo(() => {
    const last6 = trailingSeries.slice(-6);
    return {
      revenue: last6.map((m) => ({ value: m.revenue })),
      expenses: last6.map((m) => ({ value: m.expenses })),
      grossProfit: last6.map((m) => ({ value: m.revenue - m.expenses })),
    };
  }, [trailingSeries]);

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
    return <div className="h-96 bg-background rounded-xl animate-pulse" />;
  }

  return (
    <div>
      {/* Compact VAT threshold chip - keeps the message visible without
       * eating 70+px of vertical space. Full detail (HMRC reg deadline,
       * headroom, etc) lives on the VAT return tab. */}
      {!profile?.vat_registered && vatThreshold.status !== "ok" && (
        <div
          className={`mb-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] border w-fit ${
            vatThreshold.status === "exceeded"
              ? "bg-danger/10 border-danger/20 text-danger"
              : "bg-warning/10 border-warning/20 text-warning"
          }`}
        >
          <span className="size-1.5 rounded-full bg-current shrink-0" />
          <span className="font-semibold">
            {vatThreshold.status === "exceeded"
              ? "VAT registration mandatory"
              : "Approaching VAT threshold"}
          </span>
          <span className="opacity-80">
            Rolling 12mo turnover {fmtMoney(vatThreshold.rolling12mNet)} / {fmtMoney(vatThreshold.threshold)}
          </span>
        </div>
      )}

      {/* Period selector - iOS-style segmented pill bar instead of dropdown */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <PeriodPills value={periodKey} onChange={setPeriodKey} />
        <div className="flex items-center gap-3">
          {periodKey === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className={`${inputClass} h-9`}
              />
              <span className="text-xs text-subtle">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className={`${inputClass} h-9`}
              />
            </div>
          )}
          <div className="text-[11px] text-subtle tabular-nums hidden md:block">
            {range.start} → {range.end}
          </div>
        </div>
      </div>

      {/* Hero row: 4 headline KPIs with icon chips + inline sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <Tile
          label="Revenue (net)"
          value={fmtMoney(totals.revenueNet)}
          sub={`${fmtMoney(totals.revenueGross)} gross`}
          size="hero"
          icon={BanknotesIcon}
          sparkline={sparkSeries.revenue}
          sparklineColor="#1B1B1B"
        />
        <Tile
          label="Expenses"
          value={fmtMoney(totals.expensesGross)}
          sub={`${totals.expenseCount} items paid`}
          size="hero"
          icon={CreditCardIcon}
          sparkline={sparkSeries.expenses}
          sparklineColor="#7A7A7A"
        />
        <Tile
          label="Gross profit"
          value={fmtMoney(totals.grossProfit)}
          accent={totals.grossProfit >= 0 ? "green" : "red"}
          size="hero"
          icon={ScaleIcon}
          sparkline={sparkSeries.grossProfit}
          sparklineColor={totals.grossProfit >= 0 ? "#047857" : "#B91C1C"}
        />
        <Tile
          label="Net profit (after tax est.)"
          value={fmtMoney(totals.netProfitAfterTax)}
          sub={`${fmtMoney(totals.corporationTax)} CT estimate`}
          accent={totals.netProfitAfterTax >= 0 ? "green" : "red"}
          size="hero"
          icon={ChartPieIcon}
        />
      </div>

      {/* VAT row - shown when registered OR when there's any tagged VAT
       * data (pre-registration estimate). Sub-labels switch to clarify
       * which mode we're in. */}
      {(profile?.vat_registered ||
        totals.vatCollected > 0 ||
        totals.vatPaidInput > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Tile
            label="VAT collected"
            value={fmtMoney(totals.vatCollected)}
            sub={profile?.vat_registered ? "From UK invoices" : "Estimate (pre-registration)"}
            icon={ReceiptPercentIcon}
          />
          <Tile
            label="VAT paid (input)"
            value={fmtMoney(totals.vatPaidInput)}
            sub={profile?.vat_registered ? "Reclaimable from expenses" : "Would be reclaimable once registered"}
            icon={ReceiptPercentIcon}
          />
          <Tile
            label={profile?.vat_registered ? "VAT owed" : "VAT owed (estimate)"}
            value={fmtMoney(totals.vatOwed)}
            sub="Collected minus reclaimable"
            accent={totals.vatOwed > 0 ? "amber" : undefined}
            icon={ReceiptPercentIcon}
          />
        </div>
      )}

      {/* Charts: bar + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <CardHeader
            icon={ArrowTrendingUpIcon}
            title="Revenue vs expenses"
            eyebrow="Last 12 months, GBP"
          />
          {/* Inline legend chips, kept above the chart so the plot itself stays uncluttered */}
          <div className="flex items-center gap-5 mb-3 -mt-1">
            <span className="inline-flex items-center gap-2 text-[11px] text-[#5A5A63]">
              <span className="w-2.5 h-2.5 rounded-full bg-success" />
              Revenue
            </span>
            <span className="inline-flex items-center gap-2 text-[11px] text-[#5A5A63]">
              <span className="w-2.5 h-2.5 rounded-full bg-warning" />
              Expenses
            </span>
          </div>
          {trailingSeries.length === 0 ? (
            <p className="text-sm text-subtle py-12 text-center">
              No invoice or expense data yet
            </p>
          ) : (
            <div
              className="relative rounded-xl"
              style={{
                /* Subtle dot-grid background that gives the chart that "premium dashboard" feel.
                 * Pattern: 1px dots on a 14px grid, faded almost out so they only catch the eye
                 * when looking at the chart's negative space. */
                backgroundImage:
                  "radial-gradient(circle, rgba(16,24,40,0.07) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
                backgroundPosition: "8px 8px",
              }}
            >
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={trailingSeries} margin={{ top: 12, right: 12, left: -4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.28} />
                      <stop offset="65%" stopColor="#10B981" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.22} />
                      <stop offset="65%" stopColor="#F59E0B" stopOpacity={0.04} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="transparent" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#9A9AA3" }}
                    axisLine={false}
                    tickLine={false}
                    padding={{ left: 12, right: 12 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9A9AA3" }}
                    tickFormatter={(v) => (v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`)}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    cursor={{
                      stroke: "#1B1B1B",
                      strokeWidth: 1,
                      strokeDasharray: "3 3",
                      opacity: 0.3,
                    }}
                    content={<DateLabelTooltip />}
                  />
                  {/* Filled area underneath each line for the reference's "soft hill" feel */}
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="none"
                    fill="url(#revFill)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="none"
                    fill="url(#expFill)"
                    isAnimationActive={false}
                  />
                  {/* Strokes drawn on top so they sit cleanly above the gradient fills */}
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={2.4}
                    dot={false}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#10B981" }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#F59E0B"
                    strokeWidth={2.4}
                    dot={false}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#F59E0B" }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center size-8 rounded-xl bg-surface-raised text-foreground">
                <ChartPieIcon className="size-4" />
              </span>
              <h3 className="text-[15px] font-semibold text-foreground">
                Expense breakdown
              </h3>
            </div>
            <button
              type="button"
              className="size-7 inline-flex items-center justify-center rounded-lg text-subtle hover:bg-surface-raised transition-colors"
              aria-label="More options"
            >
              <span className="text-lg leading-none tracking-tighter">···</span>
            </button>
          </div>
          {expenseSlices.length === 0 ? (
            <p className="text-sm text-subtle py-8 text-center">No expenses</p>
          ) : (
            <>
              <DonutChart slices={expenseSlices} />
              <div className="mt-3 space-y-1.5">
                {expenseSlices.slice(0, 4).map((s) => {
                  const total = expenseSlices.reduce((sum, x) => sum + x.value, 0);
                  const pct = total > 0 ? (s.value / total) * 100 : 0;
                  return (
                    <div key={s.name} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: s.color }}
                      />
                      <span className="text-foreground flex-1 truncate font-medium">{s.name}</span>
                      <span className="tabular-nums text-subtle font-medium">{pct.toFixed(1)}%</span>
                      <span className="tabular-nums text-foreground font-semibold w-[64px] text-right">{fmtMoney(s.value)}</span>
                    </div>
                  );
                })}
                {expenseSlices.length > 4 && (
                  <div className="text-[10px] text-subtle pt-0.5">
                    +{expenseSlices.length - 4} more
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compact forecast strip - three inline stats in a single card to
       * keep the dashboard at one viewport. The detail (per-frequency
       * breakdown etc) lives on the Expenses page. */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] grid grid-cols-3 divide-x divide-border">
        <ForecastInline
          icon={ArrowPathIcon}
          label="Recurring (monthly)"
          value={fmtMoney(committed.monthlyTotal)}
        />
        <ForecastInline
          icon={CalendarDaysIcon}
          label={`Projected (next ${committed.monthsProjected}mo)`}
          value={fmtMoney(committed.projectedTotal)}
        />
        <ForecastInline
          icon={ChartBarIcon}
          label="Rolling 12mo turnover"
          value={fmtMoney(vatThreshold.rolling12mNet)}
          accent={
            vatThreshold.status === "exceeded"
              ? "red"
              : vatThreshold.status === "approaching"
                ? "amber"
                : undefined
          }
        />
      </div>
    </div>
  );
}

/* Pill-bar segmented control matching the screenshot aesthetic.
 * Sits in a F7F8FA pillow with rounded-full; active pill is a white
 * card with a soft shadow so it pops out of the row. */
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
    <div className="inline-flex items-center gap-1 p-1 bg-surface-raised rounded-full border border-border w-fit">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${
              active
                ? "bg-surface text-foreground shadow-[0_1px_3px_rgba(16,24,40,0.08)]"
                : "text-subtle hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  accent,
  size,
  icon: Icon,
  sparkline,
  sparklineColor = "#1B1B1B",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "amber";
  size?: "hero";
  icon?: React.ComponentType<{ className?: string }>;
  sparkline?: { value: number }[];
  sparklineColor?: string;
}) {
  const color =
    accent === "green"
      ? "text-success"
      : accent === "red"
        ? "text-danger"
        : accent === "amber"
          ? "text-warning"
          : "text-foreground";
  const hero = size === "hero";
  return (
    <div
      className="relative bg-surface border border-border rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_rgba(16,24,40,0.08)] transition-shadow overflow-hidden"
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="inline-flex items-center justify-center size-7 rounded-lg bg-surface-raised text-foreground">
              <Icon className="size-3.5" />
            </span>
          )}
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-subtle font-semibold">
            {label}
          </div>
        </div>
      </div>
      <div
        className={`${
          hero ? "text-[22px] md:text-[26px]" : "text-[20px] md:text-[22px]"
        } font-semibold tabular-nums tracking-[-0.02em] leading-none ${color}`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-subtle mt-1.5 leading-snug">{sub}</div>
      )}
      {sparkline && sparkline.length > 1 && hero && (
        <div className="absolute right-3 bottom-3 w-[88px] h-[32px] opacity-90 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sl-${sparklineColor.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparklineColor}
                strokeWidth={1.5}
                fill={`url(#sl-${sparklineColor.replace("#", "")})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* Premium donut with center content + active-segment glow + per-slice
 * tooltip pill. Bigger and chunkier than the recharts default. */
function DonutChart({
  slices,
}: {
  slices: { name: string; value: number; color: string }[];
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const active = activeIdx !== null ? slices[activeIdx] : null;
  const activePct = active && total > 0 ? (active.value / total) * 100 : 0;
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <defs>
            {slices.map((s, i) => (
              <filter
                key={i}
                id={`glow-${i}`}
                x="-30%"
                y="-30%"
                width="160%"
                height="160%"
              >
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={2}
            strokeWidth={0}
            cornerRadius={5}
            onMouseEnter={(_, idx) => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            {slices.map((s, i) => (
              <Cell
                key={i}
                fill={s.color}
                opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
                style={{
                  filter: activeIdx === i ? `url(#glow-${i})` : "none",
                  transition: "opacity 200ms, filter 200ms",
                }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Center content overlaid on the donut hole */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {active ? (
          <>
            <div
              className="text-[9.5px] uppercase tracking-[0.06em] font-semibold mb-0.5"
              style={{ color: active.color }}
            >
              {active.name}
            </div>
            <div className="text-[17px] font-semibold tabular-nums text-foreground leading-none">
              {fmtMoney(active.value)}
            </div>
            <div className="text-[10px] text-subtle mt-1 tabular-nums">
              {activePct.toFixed(1)}% of total
            </div>
          </>
        ) : (
          <>
            <div className="text-[9.5px] uppercase tracking-[0.06em] text-subtle font-semibold mb-0.5">
              Total
            </div>
            <div className="text-[17px] font-semibold tabular-nums text-foreground leading-none">
              {fmtMoney(total)}
            </div>
            <div className="text-[10px] text-subtle mt-1">
              across {slices.length} categor{slices.length === 1 ? "y" : "ies"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* Premium chart tooltip modelled on the reference design:
 *  - Dark rounded card
 *  - Period label at top (small, muted)
 *  - Total in large white type (revenue + expenses for the month)
 *  - Revenue + expense rows with colored dots and amounts in soft pills
 * Always rendered on a dark background so it works on either theme. */
function DateLabelTooltip({
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
    <div
      className="pointer-events-none rounded-2xl px-4 py-3 min-w-[200px]"
      style={{
        background: "#1B1B1B",
        boxShadow: "0 12px 32px rgba(16,24,40,0.18), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      <div className="text-[10.5px] uppercase tracking-[0.08em] text-white/50 font-medium mb-1">
        {label}
      </div>
      <div className="text-[22px] font-semibold tabular-nums leading-none text-white mb-3">
        {fmtMoney(total)}
      </div>
      <div className="flex items-center gap-2 text-[11px] mb-1.5">
        <span className="w-2 h-2 rounded-full bg-success" />
        <span className="text-white/70">Revenue</span>
        <span className="ml-auto tabular-nums font-medium text-white bg-surface/10 px-2 py-0.5 rounded-md">
          {fmtMoney(revenue)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-2 h-2 rounded-full bg-warning" />
        <span className="text-white/70">Expenses</span>
        <span className="ml-auto tabular-nums font-medium text-white bg-surface/10 px-2 py-0.5 rounded-md">
          {fmtMoney(expenses)}
        </span>
      </div>
    </div>
  );
}

/* Compact inline forecast stat for the bottom strip. One per column in
 * the 3-col compact card, separated by vertical dividers. */
function ForecastInline({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: "red" | "amber";
}) {
  const color =
    accent === "red"
      ? "text-danger"
      : accent === "amber"
        ? "text-warning"
        : "text-foreground";
  return (
    <div className="flex items-center gap-3 px-3 first:pl-0 last:pr-0">
      <span className="inline-flex items-center justify-center size-9 rounded-xl bg-surface-raised text-foreground shrink-0">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] uppercase tracking-[0.06em] text-subtle font-semibold truncate">
          {label}
        </div>
        <div className={`text-[18px] font-semibold tabular-nums leading-tight ${color}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* Shared card header: icon chip on left + title, optional eyebrow text
 * on right (e.g. "Monthly, GBP" or "7 total"). Used by the chart cards
 * to give them a consistent identity. */
function CardHeader({
  icon: Icon,
  title,
  eyebrow,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  eyebrow?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center size-8 rounded-xl bg-surface-raised text-foreground">
          <Icon className="size-4" />
        </span>
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      </div>
      {eyebrow && <span className="text-[11px] text-subtle">{eyebrow}</span>}
    </div>
  );
}
