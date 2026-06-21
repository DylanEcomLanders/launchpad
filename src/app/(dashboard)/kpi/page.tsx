"use client";

import { useMemo, useState } from "react";
import { getDeliveryItems } from "@/lib/kpi/source";
import {
  computeSummary,
  computeOverdue,
  computePodBreakdown,
  computeMemberBreakdown,
  computeTrend,
  periodWindow,
} from "@/lib/kpi/metrics";
import {
  TREND_WEEKS,
  RATE_GOOD,
  RATE_WARN,
  LATE_WARN_DAYS,
  LATE_BAD_DAYS,
} from "@/lib/kpi/config";
import type { KpiPeriod, OverdueRow, BreakdownRow } from "@/lib/kpi/types";

/* ── Helpers ── */

const PERIODS: { value: KpiPeriod; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
];

function fmtRate(r: number | null): string {
  return r === null ? "–" : `${r}%`;
}
function fmtDays(d: number | null): string {
  return d === null ? "–" : `${d}d`;
}
function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
function rateColor(r: number | null): string {
  if (r === null) return "text-[#71757D]";
  if (r >= RATE_GOOD) return "text-emerald-400";
  if (r >= RATE_WARN) return "text-amber-400";
  return "text-red-400";
}
function lateColor(days: number): string {
  if (days > LATE_BAD_DAYS) return "text-red-400";
  if (days >= LATE_WARN_DAYS) return "text-amber-400";
  return "text-[#E5E5EA]";
}

/* ── Page ── */

export default function KpiPage() {
  const [period, setPeriod] = useState<KpiPeriod>("month");
  // 0 = current period, 1 = previous, 2 = two ago … steps back through history.
  const [offset, setOffset] = useState(0);

  const items = useMemo(() => getDeliveryItems(), []);
  const win = useMemo(() => periodWindow(period, offset), [period, offset]);
  const summary = useMemo(
    () => computeSummary(items, period, offset),
    [items, period, offset],
  );
  const overdue = useMemo(
    () => computeOverdue(items, period, offset),
    [items, period, offset],
  );
  const pods = useMemo(
    () => computePodBreakdown(items, period, offset),
    [items, period, offset],
  );
  const members = useMemo(
    () => computeMemberBreakdown(items, period, offset),
    [items, period, offset],
  );
  const trend = useMemo(() => computeTrend(items, TREND_WEEKS), [items]);

  const asOfLabel = fmtDate(new Date(win.asOfMs).toISOString().slice(0, 10));

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] leading-tight font-bold text-[#E5E5EA]">
            Delivery KPIs
          </h1>
          <p className="text-xs text-[#71757D] mt-0.5">
            From Project Delivery · {win.label}
            {win.isCurrent ? " · in progress" : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <PeriodToggle
            period={period}
            onChange={(p) => {
              setPeriod(p);
              setOffset(0);
            }}
          />
          <PeriodStepper
            label={win.label}
            offset={offset}
            onBack={() => setOffset((o) => o + 1)}
            onForward={() => setOffset((o) => Math.max(0, o - 1))}
          />
        </div>
      </div>

      {/* Top strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat
          label="On-time rate"
          value={fmtRate(summary.onTimeRate)}
          valueClass={rateColor(summary.onTimeRate)}
          sub={`${summary.onTimeCount} on time · ${summary.lateCount} late`}
        />
        <Stat
          label="Delivered"
          value={String(summary.delivered)}
          sub={win.label}
        />
        <Stat
          label={win.isCurrent ? "Currently overdue" : "Overdue at close"}
          value={String(summary.currentlyOverdue)}
          valueClass={summary.currentlyOverdue > 0 ? "text-red-400" : "text-[#E5E5EA]"}
          sub={win.isCurrent ? "open · past due now" : `open · as of ${asOfLabel}`}
        />
        <Stat
          label="Avg turnaround"
          value={fmtDays(summary.avgTurnaroundDays)}
          sub="started → delivered"
        />
      </div>

      <OverdueList
        rows={overdue}
        heading={win.isCurrent ? "Overdue right now" : `Overdue at ${win.label} close`}
        note={win.isCurrent ? "open · past due now" : `open · as of ${asOfLabel}`}
      />
      <BreakdownTable title="Pods" keyHeader="Pod" rows={pods} />
      <BreakdownTable title="Team members" keyHeader="Owner" rows={members} />
      <TrendChart points={trend} />
    </div>
  );
}

/* ── Period toggle ── */

function PeriodToggle({
  period,
  onChange,
}: {
  period: KpiPeriod;
  onChange: (p: KpiPeriod) => void;
}) {
  return (
    <div className="inline-flex p-0.5 rounded-full bg-[#222222] border border-[#2A2A2A] shrink-0">
      {PERIODS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-[11px] font-semibold rounded-full transition-colors ${
            period === o.value
              ? "bg-white text-[#0C0C0C]"
              : "text-[#71757D] hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Period stepper (walk back through history) ── */

function PeriodStepper({
  label,
  offset,
  onBack,
  onForward,
}: {
  label: string;
  offset: number;
  onBack: () => void;
  onForward: () => void;
}) {
  const btn =
    "size-6 inline-flex items-center justify-center rounded-full border border-[#2A2A2A] text-[#9CA3AF] hover:text-white hover:border-[#383838] disabled:opacity-30 disabled:hover:text-[#9CA3AF] disabled:hover:border-[#2A2A2A] transition-colors";
  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={onBack} className={btn} aria-label="Previous period" title="Previous period">
        ←
      </button>
      <span className="min-w-[96px] text-center text-[12px] font-medium text-[#E5E5EA] tabular-nums">
        {label}
      </span>
      <button
        onClick={onForward}
        disabled={offset === 0}
        className={btn}
        aria-label="Next period"
        title={offset === 0 ? "Already at the current period" : "Next period"}
      >
        →
      </button>
    </div>
  );
}

/* ── Stat card ── */

function Stat({
  label,
  value,
  sub,
  valueClass = "text-[#E5E5EA]",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="border border-[#2A2A2A] rounded-lg p-5 bg-[#181818]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
        {label}
      </p>
      <p className={`mt-2 text-[30px] font-bold leading-none tabular-nums ${valueClass}`}>
        {value}
      </p>
      {sub && <p className="mt-2 text-[11px] text-[#71757D]">{sub}</p>}
    </div>
  );
}

/* ── Section header ── */

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#E5E5EA]">
        {title}
      </h2>
      {right}
    </div>
  );
}

/* ── Overdue list (sortable) ── */

type OverdueSort = "daysLate" | "dueDate" | "title" | "pod" | "owner" | "clientName" | "phase";

function OverdueList({
  rows,
  heading,
  note,
}: {
  rows: OverdueRow[];
  heading: string;
  note: string;
}) {
  const [sort, setSort] = useState<OverdueSort>("daysLate");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      let cmp = 0;
      if (sort === "daysLate") cmp = a.daysLate - b.daysLate;
      else if (sort === "dueDate") cmp = a.dueDate.localeCompare(b.dueDate);
      else cmp = (a[sort] ?? "").toString().localeCompare((b[sort] ?? "").toString());
      return dir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, sort, dir]);

  function toggle(col: OverdueSort) {
    if (sort === col) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(col);
      setDir(col === "daysLate" ? "desc" : "asc");
    }
  }

  const Th = ({ col, label, align = "left" }: { col: OverdueSort; label: string; align?: "left" | "right" }) => (
    <th
      onClick={() => toggle(col)}
      className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71757D] cursor-pointer hover:text-[#E5E5EA] select-none text-${align}`}
    >
      {label}
      {sort === col ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <section className="mb-10">
      <SectionHeader
        title={heading}
        right={
          <span className="text-[11px] tabular-nums text-[#71757D]">
            {rows.length} {note}
          </span>
        }
      />
      <div className="border border-[#2A2A2A] rounded-lg overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-[#71757D] text-center py-10">
            Nothing overdue. 🎉
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-[#181818] border-b border-[#2A2A2A]">
              <tr>
                <Th col="title" label="Deliverable" />
                <Th col="clientName" label="Client" />
                <Th col="pod" label="Pod" />
                <Th col="owner" label="Owner" />
                <Th col="phase" label="Phase" />
                <Th col="dueDate" label="Due" align="right" />
                <Th col="daysLate" label="Days late" align="right" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[#1F1F1F] last:border-0 hover:bg-[#161616]"
                >
                  <td className="px-3 py-2.5 text-[13px] text-[#E5E5EA]">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {r.title}
                      </a>
                    ) : (
                      r.title
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#9CA3AF]">{r.clientName}</td>
                  <td className="px-3 py-2.5 text-[12px] text-[#9CA3AF]">{r.pod ?? "–"}</td>
                  <td className="px-3 py-2.5 text-[12px] text-[#9CA3AF]">{r.owner ?? "–"}</td>
                  <td className="px-3 py-2.5 text-[12px] text-[#9CA3AF] capitalize">
                    {r.phase.replace(/-/g, " ")}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#9CA3AF] text-right tabular-nums">
                    {fmtDate(r.dueDate)}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-[13px] font-semibold text-right tabular-nums ${lateColor(r.daysLate)}`}
                  >
                    {r.daysLate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/* ── Breakdown table (pod + member share one shape) ── */

function BreakdownTable({
  title,
  keyHeader,
  rows,
}: {
  title: string;
  keyHeader: string;
  rows: BreakdownRow[];
}) {
  return (
    <section className="mb-10">
      <SectionHeader title={title} />
      <div className="border border-[#2A2A2A] rounded-lg overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-[#71757D] text-center py-10">No data.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-[#181818] border-b border-[#2A2A2A]">
              <tr>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71757D] text-left">
                  {keyHeader}
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71757D] text-right">
                  Delivered
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71757D] text-right">
                  On-time
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71757D] text-right">
                  Overdue
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71757D] text-right">
                  Avg turnaround
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  className="border-b border-[#1F1F1F] last:border-0 hover:bg-[#161616]"
                >
                  <td className="px-3 py-2.5 text-[13px] text-[#E5E5EA]">{r.key}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#9CA3AF] text-right tabular-nums">
                    {r.delivered}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-[13px] font-semibold text-right tabular-nums ${rateColor(r.onTimeRate)}`}
                  >
                    {fmtRate(r.onTimeRate)}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-[13px] text-right tabular-nums ${r.currentlyOverdue > 0 ? "text-red-400" : "text-[#9CA3AF]"}`}
                  >
                    {r.currentlyOverdue}
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-[#9CA3AF] text-right tabular-nums">
                    {fmtDays(r.avgTurnaroundDays)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/* ── On-time trend (hand-rolled bars, no chart lib) ── */

function TrendChart({
  points,
}: {
  points: { weekStart: string; label: string; onTimeRate: number | null; delivered: number }[];
}) {
  return (
    <section className="mb-6">
      <SectionHeader
        title="On-time trend"
        right={<span className="text-[11px] text-[#71757D]">last {points.length} weeks</span>}
      />
      <div className="border border-[#2A2A2A] rounded-lg p-5 bg-[#181818]">
        <div className="flex items-end justify-between gap-2 h-40">
          {points.map((p) => {
            const h = p.onTimeRate === null ? 0 : Math.max(2, p.onTimeRate);
            const color =
              p.onTimeRate === null
                ? "bg-[#2A2A2A]"
                : p.onTimeRate >= RATE_GOOD
                  ? "bg-emerald-500"
                  : p.onTimeRate >= RATE_WARN
                    ? "bg-amber-400"
                    : "bg-red-500";
            return (
              <div
                key={p.weekStart}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
              >
                <span className="text-[10px] tabular-nums text-[#71757D]">
                  {p.onTimeRate === null ? "–" : `${p.onTimeRate}%`}
                </span>
                <div className="w-full flex items-end h-full">
                  <div
                    className={`w-full rounded-t ${color}`}
                    style={{ height: `${h}%` }}
                    title={`${p.label}: ${p.onTimeRate ?? "–"}% on time · ${p.delivered} delivered`}
                  />
                </div>
                <span className="text-[10px] text-[#71757D] whitespace-nowrap">{p.label}</span>
                <span className="text-[10px] tabular-nums text-[#4B4D52]">{p.delivered}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
