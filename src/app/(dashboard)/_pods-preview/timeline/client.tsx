"use client";

import { useMemo, useState } from "react";
import {
  TASKS,
  PODS,
  CLIENT_BY_ID,
  PHASE_LABEL,
  PHASE_ORDER,
  type Phase,
  type Task,
} from "../mock-data";
import {
  AnnotationStrip,
  PhaseTimeline,
  SectionHeader,
  Card,
  phaseRamp,
  CLIENT_HATCH,
} from "../components";

export default function TimelineClient() {
  const [scope, setScope] = useState<string>("all"); // "all" | podId

  const tasks = useMemo(
    () => TASKS.filter((t) => t.spans && (scope === "all" || t.podId === scope)),
    [scope],
  );

  // aggregate per-phase across all visits (revisits counted separately)
  const perPhase = useMemo(() => {
    const map = new Map<Phase, { days: number; clientDays: number; visits: number }>();
    for (const t of tasks)
      for (const sp of t.spans ?? []) {
        const e = map.get(sp.phase) ?? { days: 0, clientDays: 0, visits: 0 };
        e.days += sp.days;
        e.clientDays += sp.clientDays;
        e.visits += 1;
        map.set(sp.phase, e);
      }
    return PHASE_ORDER.filter((p) => map.has(p)).map((p) => ({ phase: p, ...map.get(p)! }));
  }, [tasks]);

  const totals = useMemo(() => {
    let days = 0;
    let clientDays = 0;
    let revisionLoops = 0;
    const cycleLengths: number[] = [];
    for (const t of tasks) {
      const td = (t.spans ?? []).reduce((s, sp) => s + sp.days, 0);
      const tc = (t.spans ?? []).reduce((s, sp) => s + sp.clientDays, 0);
      days += td;
      clientDays += tc;
      cycleLengths.push(td);
      // revisit = a phase appearing more than once in this task's history
      const seen = new Set<Phase>();
      for (const sp of t.spans ?? []) {
        if (seen.has(sp.phase)) revisionLoops += 1;
        seen.add(sp.phase);
      }
    }
    const avgCycle = cycleLengths.length
      ? Math.round((cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) * 10) / 10
      : 0;
    const pctClient = days > 0 ? Math.round((clientDays / days) * 100) : 0;
    return { days, clientDays, pctClient, avgCycle, revisionLoops };
  }, [tasks]);

  const bottleneck = useMemo(
    () => [...perPhase].sort((a, b) => b.days - a.days)[0],
    [perPhase],
  );
  const maxPhaseDays = Math.max(1, ...perPhase.map((p) => p.days));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <AnnotationStrip title="What changed — Timeline & KPIs">
        <p>
          <strong>Brings back time-in-stage.</strong> The data already records a per-visit phase
          history (it was never surfaced). This reads it directly: each bar is a task&apos;s journey
          through the 12 phases, segment width ∝ days in phase.
        </p>
        <p>
          <strong>Delay attribution feeds straight in.</strong> Hatched = days spent waiting on the
          client, split out of the pod&apos;s time so bottlenecks read honestly. Revisits stay as
          separate segments, so revision loops are visible.
        </p>
      </AnnotationStrip>

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Timeline &amp; KPIs</h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScope("all")}
            className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${
              scope === "all" ? "bg-white text-background" : "text-subtle hover:bg-surface-raised"
            }`}
          >
            All pods
          </button>
          {PODS.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setScope(p.id)}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${
                scope === p.id ? "bg-white text-background" : "text-subtle hover:bg-surface-raised"
              }`}
            >
              P{i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Avg cycle time" value={`${totals.avgCycle}d`} hint="kickoff → launch, per task" />
        <Kpi
          label="Client-attributed delay"
          value={`${totals.pctClient}%`}
          hint={`${totals.clientDays}d of ${totals.days}d total`}
          tone={totals.pctClient >= 25 ? "amber" : "default"}
        />
        <Kpi
          label="Bottleneck stage"
          value={bottleneck ? PHASE_LABEL[bottleneck.phase] : "—"}
          hint={bottleneck ? `${bottleneck.days}d total · ${bottleneck.clientDays}d client-side` : ""}
          tone="rose"
        />
        <Kpi
          label="Revision loops"
          value={`${totals.revisionLoops}`}
          hint="phases re-entered"
          tone={totals.revisionLoops > 0 ? "amber" : "default"}
        />
      </div>

      {/* Time-in-stage breakdown */}
      <Card className="mb-7">
        <SectionHeader>Time in stage · rolled up</SectionHeader>
        <div className="space-y-2">
          {perPhase.map((p) => {
            const ramp = phaseRamp(p.phase);
            const widthPct = (p.days / maxPhaseDays) * 100;
            const clientPct = p.days > 0 ? (p.clientDays / p.days) * 100 : 0;
            const isBottleneck = bottleneck?.phase === p.phase;
            return (
              <div key={p.phase} className="flex items-center gap-3">
                <div className="flex w-48 shrink-0 items-center justify-end gap-1.5 text-[12px] text-subtle">
                  {p.visits > 1 && <span className="text-[10px] text-subtle">×{p.visits}</span>}
                  <span className={isBottleneck ? "font-semibold text-foreground" : ""}>
                    {PHASE_LABEL[p.phase]}
                  </span>
                  {isBottleneck && (
                    <span className="rounded border border-rose-200 bg-rose-50 px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-rose-700">
                      Bottleneck
                    </span>
                  )}
                </div>
                <div className="h-5 flex-1 overflow-hidden rounded-md bg-surface-raised">
                  <div className="relative h-full" style={{ width: `${widthPct}%`, backgroundColor: ramp.bg }}>
                    {clientPct > 0 && (
                      <span
                        className="absolute bottom-0 right-0 top-0"
                        style={{ width: `${clientPct}%`, backgroundImage: CLIENT_HATCH }}
                      />
                    )}
                  </div>
                </div>
                <div className="w-20 text-right text-[12px] tabular-nums text-foreground">
                  {p.days}d
                  {p.clientDays > 0 && (
                    <span className="text-[10px] text-blue-600"> · {p.clientDays}d</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-surface-raised pt-3 text-[10px] text-subtle">
          <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundImage: CLIENT_HATCH }} />
          Hatched / blue figure = client-side time
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-subtle">
          <span className="inline-block h-2.5 w-12 rounded-sm bg-gradient-to-r from-[hsl(222_13%_93%)] to-[hsl(222_13%_70%)]" />
          Greyscale = phase order (onboarding → launch)
        </div>
      </Card>

      {/* Per-task timelines, grouped by pod */}
      <SectionHeader>Per-task journeys</SectionHeader>
      <div className="space-y-5">
        {(scope === "all" ? PODS : PODS.filter((p) => p.id === scope)).map((pod) => {
          const podTasks = tasks.filter((t) => t.podId === pod.id);
          if (!podTasks.length) return null;
          return (
            <div key={pod.id}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                {pod.name} · {pod.tagline}
              </div>
              <div className="space-y-3">
                {podTasks.map((t) => (
                  <TaskTimelineRow key={t.id} task={t} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "amber" | "rose";
}) {
  const valueTone =
    tone === "rose" ? "text-rose-700" : tone === "amber" ? "text-amber-700" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${valueTone}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-subtle">{hint}</div>}
    </div>
  );
}

function TaskTimelineRow({ task }: { task: Task }) {
  const client = CLIENT_BY_ID[task.clientId];
  const total = (task.spans ?? []).reduce((s, sp) => s + sp.days, 0);
  const clientDays = (task.spans ?? []).reduce((s, sp) => s + sp.clientDays, 0);
  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-[var(--shadow-soft)]">
      <div className="mb-2 flex items-center justify-between">
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground">{task.title}</span>
          <span className="ml-2 text-[11px] text-subtle">{client?.name}</span>
        </div>
        <div className="shrink-0 text-[12px] tabular-nums text-subtle">
          {total}d total
          {clientDays > 0 && <span className="text-blue-600"> · {clientDays}d client</span>}
        </div>
      </div>
      <PhaseTimeline spans={task.spans ?? []} />
    </div>
  );
}
