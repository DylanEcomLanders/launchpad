"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { MOCK_ENGAGEMENTS, type MockEngagement } from "@/lib/engagement-mocks";
import { loadEngagementsFromPods } from "@/lib/engagement-from-pods";
import { loadLocalEngagements } from "@/lib/engagement-storage";
import {
  BUCKETS,
  ENGAGEMENT_DELIVERABLES,
  assetCategoriesForKind,
  cycleForDay,
  weekInCycleForDay,
} from "@/lib/engagement-template";

type Tone = "green" | "amber" | "red";

function worseTone(a: Tone, b: Tone): Tone {
  if (a === "red" || b === "red") return "red";
  if (a === "amber" || b === "amber") return "amber";
  return "green";
}

interface EngagementHealth {
  overall: Tone;
  label: string;
  pct: number;
  done: number;
  total: number;
  overdue: number;
  blocked: number;
  missingResources: number;
}

function computeHealth(eng: MockEngagement): EngagementHealth {
  const currentCycle = cycleForDay(eng.currentDay);
  const isRetainer = eng.kind === "retainer";

  // For retainers, audit deliverables come from the template + custom build/test.
  // For buckets, only custom deliverables count (no audit stack).
  const auditIds = isRetainer ? ENGAGEMENT_DELIVERABLES.map((d) => d.id) : [];
  const customIds = eng.customDeliverables.map((d) => d.id);
  const allIds = [...auditIds, ...customIds];
  const total = allIds.length;
  const stateById = new Map(eng.deliverables.map((d) => [d.templateId, d]));

  const done = allIds.filter((id) => stateById.get(id)?.status === "done").length;
  const blocked = allIds.filter((id) => stateById.get(id)?.status === "blocked").length;

  // Overdue = anything not done whose dueDay < currentDay
  const dueDayById = new Map<string, number>([
    ...(isRetainer
      ? ENGAGEMENT_DELIVERABLES.map<[string, number]>((d) => [d.id, d.dueDay])
      : []),
    ...eng.customDeliverables.map<[string, number]>((d) => [d.id, d.dueDay]),
  ]);
  const overdue = allIds.filter((id) => {
    const status = stateById.get(id)?.status ?? "todo";
    if (status === "done") return false;
    const dueDay = dueDayById.get(id);
    return dueDay !== undefined && dueDay < eng.currentDay;
  }).length;

  // Missing resources = asset categories with zero entries in the current cycle
  // (kind-aware — buckets have a smaller category set)
  const categories = assetCategoriesForKind(eng.kind);
  const missingResources = categories.filter((cat) => {
    const hits = eng.assets.filter((a) => a.category === cat.id && a.cycle === currentCycle);
    return hits.length === 0;
  }).length;

  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  let overall: Tone = "green";
  if (blocked > 0 || overdue >= 3) overall = "red";
  else if (overdue > 0 || missingResources >= 4) overall = "amber";

  const label = overall === "red" ? "Action needed" : overall === "amber" ? "Watch" : "Healthy";

  return { overall, label, pct, done, total, overdue, blocked, missingResources };
}

function toneDot(t: Tone): string {
  return t === "red" ? "bg-[#C62828]" : t === "amber" ? "bg-[#FFB300]" : "bg-[#00C853]";
}

function toneText(t: Tone): string {
  return t === "red" ? "text-[#C62828]" : t === "amber" ? "text-[#E65100]" : "text-[#1B5E20]";
}

function toneTile(t: Tone): string {
  return t === "red"
    ? "bg-[#FFEBEE] text-[#C62828]"
    : t === "amber"
      ? "bg-[#FFF8E1] text-[#E65100]"
      : "bg-[#F5F5F5] text-[#666]";
}

function HealthStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: Tone;
}) {
  return (
    <div className={`rounded px-1.5 py-1 ${toneTile(tone)}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-[13px] font-semibold tabular-nums leading-none mt-0.5">{value}</p>
    </div>
  );
}

export default function EngagementsPage() {
  const [localEngagements, setLocalEngagements] = useState<MockEngagement[]>([]);
  const [podsEngagements, setPodsEngagements] = useState<MockEngagement[]>([]);
  useEffect(() => {
    setLocalEngagements(loadLocalEngagements());
    setPodsEngagements(loadEngagementsFromPods());
    /* Pods-v2 hydrates from Supabase on /pods-v2 mount; if a user lands
     * on /engagements first their cache may be cold. Re-read shortly
     * after to pick up any late hydration. Cheap and harmless. */
    const t = setTimeout(() => setPodsEngagements(loadEngagementsFromPods()), 1500);
    return () => clearTimeout(t);
  }, []);
  /* Order: local-created (most recent) → pods-v2 Clients (real ops data)
   * → static MOCK_ENGAGEMENTS (reference bucket examples). Dedupe by id so
   * a pods-v2 Client that also has a localStorage override wins from
   * local. */
  const combined = [...localEngagements, ...podsEngagements, ...MOCK_ENGAGEMENTS];
  const seen = new Set<string>();
  const allEngagements: MockEngagement[] = [];
  for (const e of combined) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    allEngagements.push(e);
  }
  const healths = allEngagements.map((eng) => ({ eng, health: computeHealth(eng) }));
  const retainerHealths = healths.filter(({ eng }) => eng.kind === "retainer");
  const bucketHealths = healths.filter(({ eng }) => eng.kind === "bucket");
  const overallTone = healths.reduce<Tone>((acc, h) => worseTone(acc, h.health.overall), "green");
  const totalOverdue = healths.reduce((sum, h) => sum + h.health.overdue, 0);
  const totalBlocked = healths.reduce((sum, h) => sum + h.health.blocked, 0);
  const totalMissing = healths.reduce((sum, h) => sum + h.health.missingResources, 0);
  const overallLabel =
    overallTone === "red" ? "Action needed" : overallTone === "amber" ? "Watch" : "Healthy";

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <header className="mb-6 border-b border-[#E5E5EA] pb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
            Internal · Delivery
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B] mt-1">
            Clients
          </h1>
          <p className="text-sm text-[#666] mt-1">
            Active clients and one-off projects. Click in to open the delivery dashboard.
          </p>
        </div>
        <Link
          href="/engagements/new"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#1B1B1B] hover:bg-black px-3 py-2 rounded shrink-0"
        >
          <PlusIcon className="size-3.5" />
          New client
        </Link>
      </header>

      {allEngagements.length === 0 ? (
        <section className="rounded-lg border border-dashed border-[#E5E5EA] bg-[#FAFAFA] p-12 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">
            No clients yet
          </p>
          <p className="text-[14px] text-[#1B1B1B] font-medium mb-1">
            Clients appear here once they sign.
          </p>
          <p className="text-[12px] text-[#666] max-w-md mx-auto mb-4">
            CE retainers spawn from the offer flow. One-off bucket projects spawn from Alister&apos;s PM onboarding form.
          </p>
          <Link
            href="/engagements/new"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#1B1B1B] hover:bg-black px-3 py-2 rounded"
          >
            <PlusIcon className="size-3.5" />
            New client
          </Link>
        </section>
      ) : (
      <>
      {/* Agency Engagements Health */}
      <section className="mb-6 rounded-lg border border-[#E5E5EA] bg-white p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${toneDot(overallTone)}`} />
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
              Client health
            </h2>
            <span className={`text-[11px] font-semibold ${toneText(overallTone)}`}>
              {overallLabel}
            </span>
          </div>
          <span className="text-[10px] text-[#999]">
            Active · Overdue · Blocked · Missing resources
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <HealthStat label="Active" value={allEngagements.length} tone="green" />
          <HealthStat
            label="Overdue"
            value={totalOverdue}
            tone={totalOverdue >= 3 ? "red" : totalOverdue > 0 ? "amber" : "green"}
          />
          <HealthStat
            label="Blocked"
            value={totalBlocked}
            tone={totalBlocked > 0 ? "red" : "green"}
          />
          <HealthStat
            label="Missing"
            value={totalMissing}
            tone={totalMissing >= 6 ? "red" : totalMissing > 0 ? "amber" : "green"}
          />
        </div>
      </section>

      {/* Retainers - primary section, full-size cards */}
      <section className="mb-8">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-3">
          Conversion Engine retainers ({retainerHealths.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {retainerHealths.map(({ eng, health }) => {
            const cycle = cycleForDay(eng.currentDay);
            const week = weekInCycleForDay(eng.currentDay);
            return (
              <Link
                key={eng.id}
                href={`/engagements/${eng.id}`}
                className="group block rounded-lg border border-[#E5E5EA] bg-white p-5 hover:border-[#1B1B1B] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
                    Month {cycle} · Week {week} · Day {eng.currentDay} / 90
                  </p>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${toneText(health.overall)}`}>
                    <span className={`inline-block size-1.5 rounded-full mr-1 align-middle ${toneDot(health.overall)}`} />
                    {health.label}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-[#1B1B1B] tracking-tight">
                  {eng.brand}
                </h3>
                <p className="text-[12px] text-[#666] mt-0.5">{eng.vertical}</p>

                <div className="mt-4 mb-2 h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00C853] rounded-full transition-all"
                    style={{ width: `${health.pct}%` }}
                  />
                </div>
                <div className="flex items-baseline justify-between text-[11px] text-[#666] tabular-nums mb-3">
                  <span>{health.done} / {health.total} done</span>
                  <span>{health.pct}%</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <HealthStat
                    label="Overdue"
                    value={health.overdue}
                    tone={health.overdue >= 3 ? "red" : health.overdue > 0 ? "amber" : "green"}
                  />
                  <HealthStat
                    label="Blocked"
                    value={health.blocked}
                    tone={health.blocked > 0 ? "red" : "green"}
                  />
                  <HealthStat
                    label="Missing"
                    value={health.missingResources}
                    tone={health.missingResources >= 4 ? "red" : health.missingResources > 0 ? "amber" : "green"}
                  />
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E5EA] flex items-center justify-between">
                  <p className="text-[11px] text-[#999]">
                    {eng.retainer}/mo · started {new Date(eng.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · Pod {eng.podNumber}
                  </p>
                  <ArrowRightIcon className="size-3.5 text-[#999] group-hover:text-[#1B1B1B] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Single projects - compact secondary section */}
      {bucketHealths.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-3">
            Single projects ({bucketHealths.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {bucketHealths.map(({ eng, health }) => {
              const week = weekInCycleForDay(eng.currentDay);
              const bucketDef = eng.bucket ? BUCKETS.find((b) => b.size === eng.bucket) : null;
              const totalDays = bucketDef?.workingDays ?? 0;
              return (
                <Link
                  key={eng.id}
                  href={`/engagements/${eng.id}`}
                  className="group block rounded-lg border border-[#E5E5EA] bg-white p-3 hover:border-[#1B1B1B] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all"
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1976D2] bg-[#E3F2FD] px-1.5 py-0.5 rounded">
                      {bucketDef?.label ?? "Bucket"}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${toneText(health.overall)}`}>
                      <span className={`inline-block size-1.5 rounded-full mr-1 align-middle ${toneDot(health.overall)}`} />
                      {health.label}
                    </span>
                  </div>
                  <h3 className="text-[13px] font-semibold text-[#1B1B1B] tracking-tight mt-2">
                    {eng.brand}
                  </h3>
                  <p className="text-[11px] text-[#666] mt-0.5 truncate">{eng.vertical}</p>

                  <div className="mt-2.5 h-1 bg-[#F5F5F5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00C853] rounded-full transition-all"
                      style={{ width: `${health.pct}%` }}
                    />
                  </div>
                  <div className="flex items-baseline justify-between text-[10px] text-[#666] tabular-nums mt-1">
                    <span>Day {eng.currentDay}/{totalDays} · W{week}</span>
                    <span>{health.done}/{health.total}</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#E5E5EA] flex items-baseline justify-between text-[10px] text-[#999]">
                    <span>Pod {eng.podNumber}</span>
                    <div className="flex items-center gap-1.5">
                      {health.overdue > 0 && <span className="text-[#C62828] font-semibold">{health.overdue} overdue</span>}
                      {health.blocked > 0 && <span className="text-[#C62828] font-semibold">{health.blocked} blocked</span>}
                      {health.overdue === 0 && health.blocked === 0 && <span className="text-[#666]">{health.missingResources} missing</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      </>
      )}
    </div>
  );
}
