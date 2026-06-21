"use client";

/* PREVIEW PAGE - The new Strategy view that slots into Pod Overview.
 *
 * Just the new view. No mock of the existing Overview / pod cards / etc.
 * Everything else on the Pod Overview page stays as it is today; this
 * shows what gets added when the Strategy toggle is clicked.
 *
 * Mock data, not wired up.
 */

import { useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";

type Touchpoint = "brief" | "design_review" | "pre_launch" | "post_launch" | "results";
type Status = "todo" | "in_progress" | "blocked" | "done";
type PodId = "Pod 1" | "Pod 2" | "Pod 3";

interface Deliverable {
  id: string;
  client: string;
  pod: PodId;
  title: string;
  touchpoint: Touchpoint;
  status: Status;
  status_hint: string;
  due: string;
  live_since?: string;
  live_days?: number;
}

const DELIVERABLES: Deliverable[] = [
  { id: "b1", client: "Loop Earplugs", pod: "Pod 2", title: "Bundle PDP angles", touchpoint: "brief", status: "blocked", status_hint: "Overdue 3d", due: "Fri 22 (overdue)" },
  { id: "b2", client: "Hydrant", pod: "Pod 2", title: "Welcome email sequence", touchpoint: "brief", status: "in_progress", status_hint: "Drafting", due: "Wed 27" },
  { id: "b3", client: "Trip CBD", pod: "Pod 3", title: "Quiz funnel v2", touchpoint: "brief", status: "todo", status_hint: "Kicked off today", due: "Fri 29 May" },

  { id: "dr1", client: "Beam", pod: "Pod 3", title: "Sleep PDP refresh", touchpoint: "design_review", status: "blocked", status_hint: "Overdue 1d", due: "Fri 22 (overdue)" },
  { id: "dr2", client: "Hydrant", pod: "Pod 2", title: "PDP whitening strips", touchpoint: "design_review", status: "in_progress", status_hint: "Reviewing now", due: "Today" },

  { id: "pl1", client: "Three Spirit", pod: "Pod 1", title: "Quiz funnel A/B", touchpoint: "pre_launch", status: "blocked", status_hint: "Overdue 1d", due: "Fri 22 (overdue)" },
  { id: "pl2", client: "Pact Coffee", pod: "Pod 1", title: "Subscription upsell", touchpoint: "pre_launch", status: "todo", status_hint: "Scheduled", due: "Thu 30 May" },

  { id: "pol1", client: "Hydrant", pod: "Pod 2", title: "Bundle PDP refresh", touchpoint: "post_launch", status: "blocked", status_hint: "QA overdue 1d", due: "QA was due Sat", live_since: "Fri 22 May", live_days: 3 },
  { id: "pol2", client: "Trip CBD", pod: "Pod 3", title: "Quiz funnel v1", touchpoint: "post_launch", status: "in_progress", status_hint: "QA window open", due: "Within 24h", live_since: "Today, 06:30", live_days: 0 },

  { id: "r1", client: "Loop Earplugs", pod: "Pod 2", title: "Bundle angle B", touchpoint: "results", status: "blocked", status_hint: "Read overdue 2d", due: "Hit sig Fri", live_since: "Sun 11 May", live_days: 14 },
  { id: "r2", client: "Hydrant", pod: "Pod 2", title: "Free shipping floor test", touchpoint: "results", status: "todo", status_hint: "Ready to read", due: "Hit sig 6h ago", live_since: "Sat 16 May", live_days: 9 },
  { id: "r3", client: "Pact Coffee", pod: "Pod 1", title: "Subscription upsell variant", touchpoint: "results", status: "todo", status_hint: "Running, no sig yet", due: "Expected Thu", live_since: "Wed 20 May", live_days: 5 },
];

const TOUCHPOINTS: { key: Touchpoint; label: string; sub: string }[] = [
  { key: "brief", label: "Briefs", sub: "Brief + wireframe with examples" },
  { key: "design_review", label: "Design reviews", sub: "Does design align with strategy" },
  { key: "pre_launch", label: "Pre-launch QA", sub: "Test set up correctly" },
  { key: "post_launch", label: "Post-launch QA", sub: "Smooth when live" },
  { key: "results", label: "Results", sub: "Read + decide next move" },
];

const STATUS_ORDER: Record<Status, number> = {
  blocked: 0,
  in_progress: 1,
  todo: 2,
  done: 3,
};

type PodFilter = "all" | PodId;

export default function PodOverviewStrategyPreview() {
  const [podFilter, setPodFilter] = useState<PodFilter>("all");

  const filtered =
    podFilter === "all"
      ? DELIVERABLES
      : DELIVERABLES.filter((d) => d.pod === podFilter);

  const grouped = TOUCHPOINTS.map((t) => ({
    ...t,
    items: filtered
      .filter((d) => d.touchpoint === t.key)
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
  }));

  const actCount = filtered.filter(
    (d) => d.status === "blocked" || d.status === "in_progress",
  ).length;

  const podCounts: Record<PodFilter, number> = {
    all: DELIVERABLES.length,
    "Pod 1": DELIVERABLES.filter((d) => d.pod === "Pod 1").length,
    "Pod 2": DELIVERABLES.filter((d) => d.pod === "Pod 2").length,
    "Pod 3": DELIVERABLES.filter((d) => d.pod === "Pod 3").length,
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
        <SparklesIcon className="h-3.5 w-3.5" />
        Preview, mock data
      </div>

      <div className="mb-4 text-[11px] uppercase tracking-wider text-[#71757D]">
        What shows when the Strategy toggle is clicked on Pod Overview
      </div>

      {/* Subtitle line + pod filter */}
      <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
        <p className="text-[12px] text-[#71757D]">
          Maya Lin · {filtered.length} deliverables in flight
          {podFilter !== "all" && ` on ${podFilter}`} ·{" "}
          <span className="font-semibold text-rose-700">{actCount} need her</span>
        </p>
        <div className="inline-flex items-center gap-1 rounded-md bg-[#222222] p-0.5">
          {(["all", "Pod 1", "Pod 2", "Pod 3"] as PodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPodFilter(p)}
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                podFilter === p
                  ? "bg-[#181818] text-[#E5E5EA] shadow-sm"
                  : "text-[#71757D] hover:text-[#E5E5EA]"
              }`}
            >
              {p === "all" ? "All pods" : p}
              <span className="text-[10px] text-[#71757D] tabular-nums">
                {podCounts[p]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Touchpoint sections */}
      <div className="space-y-3">
        {grouped.map((g) => (
          <TouchpointSection key={g.key} group={g} />
        ))}
      </div>

      {/* What's wired note */}
      <div className="mt-6 rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] p-4 text-xs text-[#71757D]">
        <p className="font-semibold uppercase tracking-wider text-[#E5E5EA]">
          What gets added to Pod Overview
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            <span className="font-medium text-[#E5E5EA]">Third toggle option</span> in the existing Overview / Pipeline tab strip, called Strategy. With a small red count when something needs Maya.
          </li>
          <li>
            <span className="font-medium text-[#E5E5EA]">This view</span> renders when the toggle is clicked. Five touchpoint sections, pod filter chips at the top, "Live since X · Day N" on tests.
          </li>
        </ul>
        <p className="mt-3">
          Overview, Pipeline, the Agency Health card, pod cards, action buttons — all stay exactly as they are today.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function TouchpointSection({
  group,
}: {
  group: { key: Touchpoint; label: string; sub: string; items: Deliverable[] };
}) {
  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#181818]">
      <div className="flex items-baseline justify-between border-b border-[#2A2A2A] px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            {group.label}
          </span>
          <span className="text-[10px] text-[#71757D]">· {group.sub}</span>
        </div>
        <span className="text-[10px] text-[#71757D] tabular-nums">
          {group.items.length}
        </span>
      </div>
      {group.items.length === 0 ? (
        <div className="px-4 py-2.5 text-[11px] italic text-[#71757D]">
          Nothing in flight.
        </div>
      ) : (
        <div className="divide-y divide-[#2A2A2A]">
          {group.items.map((d) => (
            <DeliverableRow key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeliverableRow({ d }: { d: Deliverable }) {
  const tone =
    d.status === "blocked" ? "text-rose-700"
      : d.status === "in_progress" ? "text-[#E5E5EA] font-semibold"
      : d.status === "done" ? "text-emerald-700"
      : "text-[#71757D]";
  const dot =
    d.status === "blocked" ? "bg-rose-500 ring-2 ring-rose-200"
      : d.status === "in_progress" ? "bg-[#1B1B1B] ring-2 ring-[#1B1B1B]/20"
      : d.status === "done" ? "bg-emerald-500"
      : "bg-[#D5D5D8]";

  const hasLive = d.live_since != null;

  return (
    <div className="grid grid-cols-[6rem_auto_1fr_auto_auto] items-baseline gap-3 px-4 py-2 hover:bg-[#0C0C0C]">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
        {d.client}
      </span>
      <span className="rounded border border-[#2A2A2A] bg-[#0C0C0C] px-1 py-0 text-[9px] font-medium text-[#71757D]">
        {d.pod}
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-[#E5E5EA] truncate">
          {d.title}
        </div>
        {hasLive && (
          <div className="mt-0.5 text-[10px] text-[#71757D]">
            Live since <span className="font-medium text-[#9CA3AF]">{d.live_since}</span>
            {d.live_days != null && (
              <span>
                {" · Day "}
                <span className="font-semibold text-[#E5E5EA] tabular-nums">
                  {d.live_days}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
      <span className={`inline-flex items-center gap-1.5 text-[11px] ${tone}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {d.status_hint}
      </span>
      <span className="text-[11px] text-[#71757D] tabular-nums w-28 text-right">
        {d.due}
      </span>
    </div>
  );
}
