"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { MOCK_ENGAGEMENTS, type MockEngagement } from "@/lib/engagement-mocks";
import { loadEngagementsFromPods } from "@/lib/engagement-from-pods";
import { loadLocalEngagements } from "@/lib/engagement-storage";
import {
  bootstrapEngagementTrash,
  getTrashedIds,
} from "@/lib/engagement-trash";
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
  // (kind-aware, buckets have a smaller category set)
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

/** The next thing due on an engagement: the soonest not-done deliverable.
 * dueInDays is relative to the engagement's currentDay (negative = overdue). */
function nextUp(eng: MockEngagement): { name: string; dueInDays: number } | null {
  const stateById = new Map(eng.deliverables.map((d) => [d.templateId, d]));
  const open = eng.customDeliverables
    .filter((d) => (stateById.get(d.id)?.status ?? "todo") !== "done")
    .filter((d) => typeof d.dueDay === "number")
    .sort((a, b) => a.dueDay - b.dueDay);
  if (open.length === 0) return null;
  const d = open[0];
  return { name: d.name, dueInDays: d.dueDay - eng.currentDay };
}

function dueLabel(dueInDays: number): string {
  if (dueInDays < 0) return `${Math.abs(dueInDays)}d overdue`;
  if (dueInDays === 0) return "due today";
  if (dueInDays === 1) return "due tomorrow";
  return `due in ${dueInDays}d`;
}

function toneDot(t: Tone): string {
  return t === "red" ? "bg-[#C62828]" : t === "amber" ? "bg-[#FFB300]" : "bg-[#00C853]";
}

export default function EngagementsPage() {
  const router = useRouter();
  const [localEngagements, setLocalEngagements] = useState<MockEngagement[]>([]);
  const [podsEngagements, setPodsEngagements] = useState<MockEngagement[]>([]);
  const [trashedIds, setTrashedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    setLocalEngagements(loadLocalEngagements());
    setTrashedIds(getTrashedIds());
    /* Read once synchronously off localStorage so warm caches paint
     * immediately, then bootstrap from Supabase so fresh browsers land
     * with real data. Previously this relied on a /pods-v2 mount to
     * populate localStorage which meant /engagements-first visitors
     * saw only mocks. */
    setPodsEngagements(loadEngagementsFromPods());
    (async () => {
      try {
        const { bootstrapPodsSync } = await import("@/lib/pods-v2/sync");
        await bootstrapPodsSync();
      } catch (err) {
        console.error("[engagements] bootstrap failed:", err);
      }
      /* Pull cloud trash so an engagement deleted on another device
       *  stays hidden here. */
      await bootstrapEngagementTrash();
      if (cancelled) return;
      setPodsEngagements(loadEngagementsFromPods());
      setLocalEngagements(loadLocalEngagements());
      setTrashedIds(getTrashedIds());
    })();
    return () => { cancelled = true; };
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
    if (trashedIds.has(e.id)) continue;
    seen.add(e.id);
    allEngagements.push(e);
  }
  const trashedCount = trashedIds.size;
  const healths = allEngagements.map((eng) => ({ eng, health: computeHealth(eng) }));
  const overallTone = healths.reduce<Tone>((acc, h) => worseTone(acc, h.health.overall), "green");
  const totalOverdue = healths.reduce((sum, h) => sum + h.health.overdue, 0);
  const totalBlocked = healths.reduce((sum, h) => sum + h.health.blocked, 0);

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
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/engagements/trash"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#666] hover:text-[#1B1B1B] hover:bg-[#F5F5F5] px-3 py-2 rounded"
          >
            <TrashIcon className="size-3.5" />
            Trash{trashedCount > 0 ? ` (${trashedCount})` : ""}
          </Link>
          <Link
            href="/engagements/new"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#1B1B1B] hover:bg-black px-3 py-2 rounded"
          >
            <PlusIcon className="size-3.5" />
            New client
          </Link>
        </div>
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
      {/* One-line summary — calm, not a wall of tiles. */}
      <div className="mb-4 flex items-center gap-2 text-[12px] text-[#666]">
        <span className={`size-2 rounded-full ${toneDot(overallTone)}`} />
        <span className="font-medium text-[#1B1B1B]">{allEngagements.length} clients</span>
        {totalOverdue > 0 && <span className="text-[#C62828] font-semibold">· {totalOverdue} overdue</span>}
        {totalBlocked > 0 && <span className="text-[#C62828] font-semibold">· {totalBlocked} blocked</span>}
        {totalOverdue === 0 && totalBlocked === 0 && <span className="text-[#2E7D32]">· on track</span>}
      </div>

      {/* Clients table — Google-Sheets-style: every client, where we are,
          what's next, at a glance. Sorted worst-health first so slipping
          clients surface, not hide. */}
      <div className="overflow-x-auto rounded-lg border border-[#E5E5EA] bg-white">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#E5E5EA] text-[10px] font-semibold uppercase tracking-wider text-[#999]">
              <th className="px-4 py-2.5 font-semibold">Client</th>
              <th className="px-3 py-2.5 font-semibold">Type</th>
              <th className="px-3 py-2.5 font-semibold">Pod</th>
              <th className="px-3 py-2.5 font-semibold">Where we are</th>
              <th className="px-3 py-2.5 font-semibold">Next up</th>
              <th className="px-3 py-2.5 text-right font-semibold">Flags</th>
            </tr>
          </thead>
          <tbody>
            {[...healths]
              .sort((a, b) => b.health.overdue - a.health.overdue || a.eng.brand.localeCompare(b.eng.brand))
              .map(({ eng, health }) => {
                const isRetainer = eng.kind === "retainer";
                const cycle = cycleForDay(eng.currentDay);
                const week = weekInCycleForDay(eng.currentDay);
                const bucketDef = eng.bucket ? BUCKETS.find((b) => b.size === eng.bucket) : null;
                const totalDays = bucketDef?.workingDays ?? 0;
                const next = nextUp(eng);
                const typeLabel = isRetainer ? `Retainer ${eng.retainer}` : bucketDef?.label ?? "Sprint";
                const where = isRetainer
                  ? `Day ${eng.currentDay}/90 · M${cycle} W${week}`
                  : `Day ${eng.currentDay}${totalDays ? `/${totalDays}` : ""} · W${week}`;
                return (
                  <tr
                    key={eng.id}
                    onClick={() => router.push(`/engagements/${eng.id}`)}
                    className="cursor-pointer border-b border-[#F0F0F2] last:border-0 hover:bg-[#FAFAFB]"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className={`size-1.5 rounded-full ${toneDot(health.overall)}`} />
                        <span className="font-semibold text-[#1B1B1B]">{eng.brand}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${
                          isRetainer ? "border-[#1B1B1B]/15 bg-[#F3F3F5] text-[#1B1B1B]" : "border-blue-200 bg-blue-50 text-blue-700"
                        }`}
                      >
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#666] tabular-nums">Pod {eng.podNumber}</td>
                    <td className="px-3 py-3 text-[#666] tabular-nums">
                      {where}
                      <span className="ml-1 text-[#C5C5C5]">· {health.done}/{health.total}</span>
                    </td>
                    <td className="px-3 py-3">
                      {next ? (
                        <span className="text-[#1B1B1B]">
                          <span className="truncate">{next.name}</span>
                          <span className={`ml-1.5 text-[11px] tabular-nums ${next.dueInDays < 0 ? "font-semibold text-[#C62828]" : "text-[#999]"}`}>
                            {dueLabel(next.dueInDays)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#C5C5C5]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center justify-end gap-1.5 text-[11px] tabular-nums">
                        {health.overdue > 0 && <span className="font-semibold text-[#C62828]">{health.overdue} overdue</span>}
                        {health.blocked > 0 && <span className="font-semibold text-[#C62828]">{health.blocked} blocked</span>}
                        {health.overdue === 0 && health.blocked === 0 && <span className="text-[#2E7D32]">on track</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
}
