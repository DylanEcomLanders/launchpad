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
import {
  TREND_WEEKS,
  RATE_GOOD,
  RATE_WARN,
  LATE_WARN_DAYS,
  LATE_BAD_DAYS,
} from "@/lib/kpi/config";
import type { KpiPeriod, OverdueRow, BreakdownRow } from "@/lib/kpi/types";
import {
  PageHeader,
  Segmented,
  StatTile,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Num,
  Badge,
  Avatar,
} from "@/components/ui";

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
/* Threshold signal as semantic tokens (success/warning/danger), not raw hues. */
function rateColor(r: number | null): string {
  if (r === null) return "text-subtle";
  if (r >= RATE_GOOD) return "text-success";
  if (r >= RATE_WARN) return "text-warning";
  return "text-danger";
}
function lateColor(days: number): string {
  if (days > LATE_BAD_DAYS) return "text-danger";
  if (days >= LATE_WARN_DAYS) return "text-warning";
  return "text-foreground";
}
/* Two-letter mono initials for the Avatar primitive. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
/* Map a delivery phase onto a Badge category tone. */
type BadgeTone = "neutral" | "dev" | "design" | "copy" | "strategy";
function phaseTone(phase: string): BadgeTone {
  const p = phase.toLowerCase();
  if (p.includes("design")) return "design";
  if (p.includes("copy")) return "copy";
  if (p.includes("dev") || p.includes("build")) return "dev";
  if (p.includes("strateg")) return "strategy";
  return "neutral";
}
function humanizePhase(phase: string): string {
  return phase.replace(/-/g, " ");
}

/* ── Page ── */

export default function KpiPage() {
  const [period, setPeriod] = useState<KpiPeriod>("month");
  // 0 = current period, 1 = previous, 2 = two ago … steps back through history.
  const [offset, setOffset] = useState(0);

  // Same live board /kanban renders: localStorage-cached, Supabase-mirrored,
  // mock only as the cold-load seed. The KPI dash reports off this directly.
  const { clients, pods: rosterPods, loading, source } = useKanbanData();

  const items = useMemo(
    () => getDeliveryItems(clients, rosterPods),
    [clients, rosterPods],
  );
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

  const sourceLabel = loading
    ? "syncing…"
    : source === "supabase"
      ? "live"
      : "sample data";

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-12">
      {/* Header */}
      <PageHeader
        className="mb-8"
        title="Delivery KPIs"
        subtitle={`From Project Delivery · ${win.label}${win.isCurrent ? " · in progress" : ""} · ${sourceLabel}`}
        actions={
          <div className="flex flex-col items-end gap-2">
            <Segmented
              value={period}
              onChange={(p) => {
                setPeriod(p);
                setOffset(0);
              }}
              options={PERIODS}
            />
            <PeriodStepper
              label={win.label}
              offset={offset}
              onBack={() => setOffset((o) => o + 1)}
              onForward={() => setOffset((o) => Math.max(0, o - 1))}
            />
          </div>
        }
      />

      {/* Top strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatTile
          label="On-time rate"
          value={<span className={rateColor(summary.onTimeRate)}>{fmtRate(summary.onTimeRate)}</span>}
          context={`${summary.onTimeCount} on time · ${summary.lateCount} late`}
        />
        <StatTile label="Delivered" value={String(summary.delivered)} context={win.label} />
        <StatTile
          label={win.isCurrent ? "Currently overdue" : "Overdue at close"}
          value={
            <span className={summary.currentlyOverdue > 0 ? "text-danger" : "text-foreground"}>
              {String(summary.currentlyOverdue)}
            </span>
          }
          context={win.isCurrent ? "open · past due now" : `open · as of ${asOfLabel}`}
        />
        <StatTile
          label="Avg turnaround"
          value={fmtDays(summary.avgTurnaroundDays)}
          context="started → delivered"
        />
      </div>

      {/* Test programme stats - live tests + win rate over the same
       * period as the delivery stats above. Reads ab_tests directly. */}
      <TestStrip win={win} />

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

/* ── Test programme stats ──
 * Reads ab_tests and shows: live now, called this period (W/L/I)
 * and the cumulative win rate. Sits below the delivery strip in
 * /kpi and gives a one-glance view of the testing engine. */
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
      if (!t.outcome) return false;
      const endIso = t.ended_at;
      if (!endIso) return false;
      const ts = new Date(endIso).getTime();
      return ts >= win.startMs && ts <= win.asOfMs;
    });
    const won = inPeriod.filter((t) => t.outcome === "winner").length;
    const lost = inPeriod.filter((t) => t.outcome === "loser").length;
    const inc = inPeriod.filter((t) => t.outcome === "inconclusive").length;
    /* Cumulative win rate: all concluded ever. */
    const concluded = tests.filter((t) => t.outcome);
    const allWon = concluded.filter((t) => t.outcome === "winner").length;
    const winRate = concluded.length === 0 ? null : Math.round((allWon / concluded.length) * 100);
    return { live, won, lost, inc, winRate };
  }, [tests, win.startMs, win.asOfMs]);

  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-surface-raised animate-pulse" />
        ))}
      </div>
    );
  }
  if (tests.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
      <StatTile label="Tests live now" value={String(stats.live)} context={stats.live > 0 ? "in flight" : "—"} />
      <StatTile
        label="Called this period"
        value={String(stats.won + stats.lost + stats.inc)}
        context={`${stats.won}W · ${stats.lost}L · ${stats.inc}I`}
      />
      <StatTile
        label="Period winners"
        value={<span className={stats.won > 0 ? "text-success" : "text-foreground"}>{String(stats.won)}</span>}
        context="proof deck candidates"
      />
      <StatTile
        label="Cumulative win rate"
        value={
          <span className={stats.winRate !== null ? rateColor(stats.winRate) : "text-subtle"}>
            {stats.winRate === null ? "–" : `${stats.winRate}%`}
          </span>
        }
        context="all concluded tests"
      />
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
    "size-6 inline-flex items-center justify-center rounded-full border border-border text-muted hover:text-foreground disabled:opacity-30 disabled:hover:text-muted transition-colors";
  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={onBack} className={btn} aria-label="Previous period" title="Previous period">
        ←
      </button>
      <span className="min-w-[96px] text-center text-xs font-medium text-foreground tabular-nums">
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

  const SortTH = ({
    col,
    label,
    align = "left",
  }: {
    col: OverdueSort;
    label: string;
    align?: "left" | "right";
  }) => (
    <TH align={align} onClick={() => toggle(col)} className="cursor-pointer select-none hover:text-foreground">
      {label}
      {sort === col ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </TH>
  );

  return (
    <Card className="mb-10">
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        <span className="text-2xs tabular-nums text-subtle">
          {rows.length} {note}
        </span>
      </CardHeader>
      {rows.length === 0 ? (
        <CardBody>
          <p className="text-sm text-subtle text-center py-6">Nothing overdue. 🎉</p>
        </CardBody>
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
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {r.title}
                    </a>
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
                  <Badge tone={phaseTone(r.phase)} className="capitalize">
                    {humanizePhase(r.phase)}
                  </Badge>
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
    <Card className="mb-10">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {rows.length === 0 ? (
        <CardBody>
          <p className="text-sm text-subtle text-center py-6">No data.</p>
        </CardBody>
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
                <TD align="right">
                  <Num className="text-muted">{r.delivered}</Num>
                </TD>
                <TD align="right">
                  <Num className={`font-semibold ${rateColor(r.onTimeRate)}`}>{fmtRate(r.onTimeRate)}</Num>
                </TD>
                <TD align="right">
                  <Num className={r.currentlyOverdue > 0 ? "text-danger" : "text-muted"}>
                    {r.currentlyOverdue}
                  </Num>
                </TD>
                <TD align="right">
                  <Num className="text-muted">{fmtDays(r.avgTurnaroundDays)}</Num>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

/* ── On-time trend (hand-rolled bars, no chart lib) ── */

function TrendChart({
  points,
}: {
  points: { weekStart: string; label: string; onTimeRate: number | null; delivered: number }[];
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>On-time trend</CardTitle>
        <span className="text-2xs text-subtle">last {points.length} weeks</span>
      </CardHeader>
      <CardBody>
        <div className="flex items-end justify-between gap-2 h-40">
          {points.map((p) => {
            const h = p.onTimeRate === null ? 0 : Math.max(2, p.onTimeRate);
            const color =
              p.onTimeRate === null
                ? "bg-border"
                : p.onTimeRate >= RATE_GOOD
                  ? "bg-success"
                  : p.onTimeRate >= RATE_WARN
                    ? "bg-warning"
                    : "bg-danger";
            return (
              <div
                key={p.weekStart}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
              >
                <span className="font-mono text-2xs tabular-nums text-subtle">
                  {p.onTimeRate === null ? "–" : `${p.onTimeRate}%`}
                </span>
                <div className="w-full flex items-end h-full">
                  <div
                    className={`w-full rounded-t ${color}`}
                    style={{ height: `${h}%` }}
                    title={`${p.label}: ${p.onTimeRate ?? "–"}% on time · ${p.delivered} delivered`}
                  />
                </div>
                <span className="text-2xs text-subtle whitespace-nowrap">{p.label}</span>
                <span className="font-mono text-2xs tabular-nums text-muted">{p.delivered}</span>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
