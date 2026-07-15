"use client";

import { useEffect, useMemo, useState } from "react";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { getDeliveryItems } from "@/lib/kpi/source";
import { testsStore } from "@/lib/tests/data";
import type { AbTest } from "@/lib/tests/types";
import {
  computeSummary,
  computeOverdue,
  computePodBreakdown,
  computeMemberBreakdown,
  computeTrend,
  periodWindow,
} from "@/lib/kpi/metrics";
import { TREND_WEEKS, RATE_GOOD, RATE_WARN, LATE_WARN_DAYS, LATE_BAD_DAYS } from "@/lib/kpi/config";
import type { KpiPeriod, OverdueRow, BreakdownRow } from "@/lib/kpi/types";
import { Table, THead, TBody, TR, TH, TD, Num, Badge, Avatar, StatCard } from "@/components/ui";

/* ── Delivery KPIs ──
 * Delivery reporting off the Project Delivery data (same live board /kanban
 * renders). Design-craft rebuild: full-width, tokens only, 4px rounding,
 * border-border-faint cards, muted-status value colours, on-time trend on the
 * shared LineChart. Data + logic unchanged from the prior page.
 */

const PERIODS: { value: KpiPeriod; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
];

function fmtRate(r: number | null) {
  return r === null ? "–" : `${r}%`;
}
function fmtDays(d: number | null) {
  return d === null ? "–" : `${d}d`;
}
function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
/* Threshold signal as muted-status tokens, not loud hues. */
function rateColor(r: number | null) {
  if (r === null) return "text-subtle";
  if (r >= RATE_GOOD) return "text-status-ontrack";
  if (r >= RATE_WARN) return "text-status-approaching";
  return "text-status-late";
}
function lateColor(days: number) {
  if (days > LATE_BAD_DAYS) return "text-status-late";
  if (days >= LATE_WARN_DAYS) return "text-status-approaching";
  return "text-foreground";
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
type BadgeTone = "neutral" | "dev" | "design" | "copy" | "strategy";
function phaseTone(phase: string): BadgeTone {
  const p = phase.toLowerCase();
  if (p.includes("design")) return "design";
  if (p.includes("copy")) return "copy";
  if (p.includes("dev") || p.includes("build")) return "dev";
  if (p.includes("strateg")) return "strategy";
  return "neutral";
}
function humanizePhase(phase: string) {
  return phase.replace(/-/g, " ");
}

/* ── Page ── */

export default function KpiPage() {
  const [period, setPeriod] = useState<KpiPeriod>("month");
  // 0 = current period, 1 = previous, 2 = two ago … steps back through history.
  const [offset, setOffset] = useState(0);

  const { clients, pods: rosterPods, loading, source } = useKanbanData();

  const items = useMemo(() => getDeliveryItems(clients, rosterPods), [clients, rosterPods]);
  const win = useMemo(() => periodWindow(period, offset), [period, offset]);
  const summary = useMemo(() => computeSummary(items, period, offset), [items, period, offset]);
  const prevSummary = useMemo(() => computeSummary(items, period, offset + 1), [items, period, offset]);
  const overdue = useMemo(() => computeOverdue(items, period, offset), [items, period, offset]);
  const pods = useMemo(() => computePodBreakdown(items, period, offset), [items, period, offset]);
  const members = useMemo(() => computeMemberBreakdown(items, period, offset), [items, period, offset]);
  const trend = useMemo(() => computeTrend(items, TREND_WEEKS), [items]);

  const asOfLabel = fmtDate(new Date(win.asOfMs).toISOString().slice(0, 10));
  const sourceLabel = loading ? "syncing…" : source === "supabase" ? "live" : "sample data";

  // Deltas vs the previous period + recent-week sparklines for the summary cards.
  const diff = (a: number | null, b: number | null) =>
    a === null || b === null ? null : Math.round((a - b) * 10) / 10;
  const vsLast = `vs last ${period}`;
  const otSeries = trend.map((p) => p.onTimeRate).filter((n): n is number => n !== null);
  const delSeries = trend.map((p) => p.delivered);
  const turnSeries = trend.map((p) => p.avgTurnaround).filter((n): n is number => n !== null);

  return (
    <div className="px-6 pb-20 pt-10 md:px-10">
      {/* ── Header ── title + period controls ── */}
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
            Project Delivery · {sourceLabel}
          </p>
          <h1 className="mt-2 text-[26px] font-bold leading-tight text-foreground">Delivery KPIs</h1>
          <p className="mt-1 text-sm text-muted">
            {win.label}
            {win.isCurrent ? " · in progress" : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Segmented value={period} onChange={(p) => { setPeriod(p); setOffset(0); }} options={PERIODS} />
          <PeriodStepper label={win.label} offset={offset} onBack={() => setOffset((o) => o + 1)} onForward={() => setOffset((o) => Math.max(0, o - 1))} />
        </div>
      </header>

      {/* ── Delivery summary ── */}
      <Section label={`Delivery · ${win.label}`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="On-time rate"
            value={fmtRate(summary.onTimeRate)}
            delta={diff(summary.onTimeRate, prevSummary.onTimeRate)}
            deltaUnit=" pts"
            deltaCaption={vsLast}
            series={otSeries}
          />
          <StatCard
            label="Delivered"
            value={String(summary.delivered)}
            delta={summary.delivered - prevSummary.delivered}
            deltaCaption={vsLast}
            series={delSeries}
          />
          <StatCard
            label={win.isCurrent ? "Currently overdue" : "Overdue at close"}
            value={String(summary.currentlyOverdue)}
            delta={summary.currentlyOverdue - prevSummary.currentlyOverdue}
            deltaCaption={vsLast}
            lowerIsBetter
          />
          <StatCard
            label="Avg turnaround"
            value={fmtDays(summary.avgTurnaroundDays)}
            delta={diff(summary.avgTurnaroundDays, prevSummary.avgTurnaroundDays)}
            deltaUnit="d"
            deltaCaption={vsLast}
            lowerIsBetter
            series={turnSeries}
          />
        </div>
      </Section>

      {/* ── Testing engine ── */}
      <TestStrip win={win} />

      {/* ── Overdue + breakdowns ── */}
      <div className="space-y-8">
        <OverdueList
          rows={overdue}
          heading={win.isCurrent ? "Overdue right now" : `Overdue at ${win.label} close`}
          note={win.isCurrent ? "open · past due now" : `open · as of ${asOfLabel}`}
        />
        <BreakdownTable title="Pods" keyHeader="Pod" rows={pods} />
        <BreakdownTable title="Team members" keyHeader="Owner" rows={members} />
      </div>
    </div>
  );
}

/* ── craft pieces ── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">{label}</p>
      {children}
    </section>
  );
}

function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded border border-border-faint bg-surface p-5">
      <div className="text-2xs font-medium uppercase tracking-wider text-subtle">{label}</div>
      <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">{value}</div>
      {hint && <div className="mt-1 text-2xs text-subtle">{hint}</div>}
    </div>
  );
}

function Card({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border-faint bg-surface">
      <div className="flex items-baseline justify-between border-b border-border-faint px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">{label}</p>
        {note && <span className="text-2xs tabular-nums text-subtle">{note}</span>}
      </div>
      {children}
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: KpiPeriod; onChange: (v: KpiPeriod) => void; options: { value: KpiPeriod; label: string }[] }) {
  return (
    <div className="inline-flex rounded border border-border-faint p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-sm px-2.5 py-1 text-2xs font-medium transition-colors ${
            value === o.value ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PeriodStepper({ label, offset, onBack, onForward }: { label: string; offset: number; onBack: () => void; onForward: () => void }) {
  const btn = "size-6 inline-flex items-center justify-center rounded border border-border-faint text-muted hover:text-foreground disabled:opacity-30 disabled:hover:text-muted transition-colors";
  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={onBack} className={btn} aria-label="Previous period" title="Previous period">←</button>
      <span className="min-w-[96px] text-center text-2xs font-medium tabular-nums text-muted">{label}</span>
      <button onClick={onForward} disabled={offset === 0} className={btn} aria-label="Next period" title={offset === 0 ? "Already at the current period" : "Next period"}>→</button>
    </div>
  );
}

/* ── Test programme stats ── */

function TestStrip({ win }: { win: { startMs: number; asOfMs: number; isCurrent: boolean } }) {
  const [tests, setTests] = useState<AbTest[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    testsStore.getAll().then((all) => {
      if (cancelled) return;
      setTests(all);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const live = tests.filter((t) => t.status === "live").length;
    const inPeriod = tests.filter((t) => {
      if (!t.outcome || !t.ended_at) return false;
      const ts = new Date(t.ended_at).getTime();
      return ts >= win.startMs && ts <= win.asOfMs;
    });
    const won = inPeriod.filter((t) => t.outcome === "winner").length;
    const lost = inPeriod.filter((t) => t.outcome === "loser").length;
    const inc = inPeriod.filter((t) => t.outcome === "inconclusive").length;
    const concluded = tests.filter((t) => t.outcome);
    const allWon = concluded.filter((t) => t.outcome === "winner").length;
    const winRate = concluded.length === 0 ? null : Math.round((allWon / concluded.length) * 100);
    return { live, won, lost, inc, winRate };
  }, [tests, win.startMs, win.asOfMs]);

  if (!hydrated) {
    return (
      <Section label="Testing">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[86px] animate-pulse rounded border border-border-faint bg-surface-raised" />
          ))}
        </div>
      </Section>
    );
  }
  if (tests.length === 0) return null;

  return (
    <Section label="Testing">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tests live now" value={String(stats.live)} hint={stats.live > 0 ? "in flight" : "—"} />
        <StatTile label="Called this period" value={String(stats.won + stats.lost + stats.inc)} hint={`${stats.won}W · ${stats.lost}L · ${stats.inc}I`} />
        <StatTile label="Period winners" value={<span className={stats.won > 0 ? "text-status-ontrack" : "text-foreground"}>{stats.won}</span>} hint="proof deck candidates" />
        <StatTile label="Cumulative win rate" value={<span className={stats.winRate !== null ? rateColor(stats.winRate) : "text-subtle"}>{stats.winRate === null ? "–" : `${stats.winRate}%`}</span>} hint="all concluded tests" />
      </div>
    </Section>
  );
}

/* ── Overdue list (sortable) ── */

type OverdueSort = "daysLate" | "dueDate" | "title" | "pod" | "owner" | "clientName" | "phase";

function OverdueList({ rows, heading, note }: { rows: OverdueRow[]; heading: string; note: string }) {
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

  const SortTH = ({ col, label, align = "left" }: { col: OverdueSort; label: string; align?: "left" | "right" }) => (
    <TH align={align} onClick={() => toggle(col)} className="cursor-pointer select-none hover:text-foreground">
      {label}
      {sort === col ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </TH>
  );

  return (
    <Card label={heading} note={`${rows.length} ${note}`}>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-subtle">Nothing overdue.</p>
      ) : (
        <Table>
          <THead>
            <TR hover={false}>
              <SortTH col="title" label="Deliverable" />
              <SortTH col="clientName" label="Client" />
              <SortTH col="pod" label="Pod" />
              <SortTH col="owner" label="Owner" />
              <SortTH col="phase" label="Phase" />
              <SortTH col="dueDate" label="Due" align="right" />
              <SortTH col="daysLate" label="Days late" align="right" />
            </TR>
          </THead>
          <TBody>
            {sorted.map((r) => (
              <TR key={r.id}>
                <TD>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.title}</a>
                  ) : (
                    r.title
                  )}
                </TD>
                <TD className="text-muted">
                  <div className="flex items-center gap-2">
                    <Avatar initials={initials(r.clientName)} size={22} />
                    {r.clientName}
                  </div>
                </TD>
                <TD className="text-muted">{r.pod ?? "–"}</TD>
                <TD className="text-muted">{r.owner ?? "–"}</TD>
                <TD>
                  <Badge tone={phaseTone(r.phase)} className="capitalize">{humanizePhase(r.phase)}</Badge>
                </TD>
                <TD align="right">
                  <Num className="text-muted">{fmtDate(r.dueDate)}</Num>
                </TD>
                <TD align="right">
                  <Num className={`font-semibold ${lateColor(r.daysLate)}`}>{r.daysLate}</Num>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

/* ── Breakdown table (pod + member share one shape) ── */

function BreakdownTable({ title, keyHeader, rows }: { title: string; keyHeader: string; rows: BreakdownRow[] }) {
  return (
    <Card label={title}>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-subtle">No data.</p>
      ) : (
        <Table>
          <THead>
            <TR hover={false}>
              <TH>{keyHeader}</TH>
              <TH align="right">Delivered</TH>
              <TH align="right">On-time</TH>
              <TH align="right">Overdue</TH>
              <TH align="right">Avg turnaround</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.key}>
                <TD>{r.key}</TD>
                <TD align="right"><Num className="text-muted">{r.delivered}</Num></TD>
                <TD align="right"><Num className={`font-semibold ${rateColor(r.onTimeRate)}`}>{fmtRate(r.onTimeRate)}</Num></TD>
                <TD align="right"><Num className={r.currentlyOverdue > 0 ? "text-status-late" : "text-muted"}>{r.currentlyOverdue}</Num></TD>
                <TD align="right"><Num className="text-muted">{fmtDays(r.avgTurnaroundDays)}</Num></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
