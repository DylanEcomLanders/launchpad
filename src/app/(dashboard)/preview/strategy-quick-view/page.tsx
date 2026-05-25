"use client";

/* PREVIEW PAGE - Just the strategy table that drops into the pod page.
 *
 * Previous version showed full pod chrome (header, capacity, members)
 * which is redundant because that's already on the real pod page.
 * Now this preview is just the new component itself, in isolation.
 *
 * What's actually being added to the pod detail page:
 *   - One simple table section, "Strategy · In flight on this pod"
 *   - One extra card in the members grid (strategist), shown small
 *     for reference but the real change is just adding "strategist"
 *     to the role enum
 *
 * Mock data, not wired up.
 */

import { SparklesIcon } from "@heroicons/react/24/outline";

interface StrategyDeliverable {
  id: string;
  client: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  status_hint: string;
  due: string;
}

const STRATEGY_DELIVERABLES: StrategyDeliverable[] = [
  {
    id: "sd1",
    client: "Hydrant",
    title: "Design review: PDP whitening strips",
    status: "in_progress",
    status_hint: "Reviewing now",
    due: "Today",
  },
  {
    id: "sd2",
    client: "Hydrant",
    title: "Brief: welcome email sequence",
    status: "in_progress",
    status_hint: "Drafting",
    due: "Wed 27",
  },
  {
    id: "sd3",
    client: "Hydrant",
    title: "Results readout: free shipping floor test",
    status: "todo",
    status_hint: "Ready to read",
    due: "Tomorrow",
  },
  {
    id: "sd4",
    client: "Hydrant",
    title: "Post-launch QA: bundle PDP refresh",
    status: "blocked",
    status_hint: "Overdue 1d",
    due: "Fri 22 (overdue)",
  },
  {
    id: "sd5",
    client: "Loop Earplugs",
    title: "Brief: bundle PDP angles",
    status: "blocked",
    status_hint: "Overdue 3d",
    due: "Fri 22 (overdue)",
  },
  {
    id: "sd6",
    client: "Loop Earplugs",
    title: "Results readout: bundle angle B",
    status: "blocked",
    status_hint: "Overdue 2d",
    due: "Sat 23 (overdue)",
  },
];

// Sort: blocked > in_progress > todo > done
const order: Record<StrategyDeliverable["status"], number> = {
  blocked: 0,
  in_progress: 1,
  todo: 2,
  done: 3,
};
const sorted = [...STRATEGY_DELIVERABLES].sort(
  (a, b) => order[a.status] - order[b.status],
);

// ─── Page ────────────────────────────────────────────────────────────

export default function StrategyTablePreview() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
        <SparklesIcon className="h-3.5 w-3.5" />
        Preview, mock data
      </div>

      <div className="mb-3 text-[11px] uppercase tracking-wider text-[#A0A0A0]">
        What drops into the existing pod detail page
      </div>

      {/* Just the strategy table, on its own */}
      <section className="rounded-lg border border-[#E5E5EA] bg-white">
        <div className="flex items-baseline justify-between border-b border-[#F0F0F0] px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
              Strategy
            </span>
            <span className="text-[13px] font-semibold text-[#1B1B1B]">
              In flight on this pod
            </span>
            <span className="text-[10px] text-[#A0A0A0]">
              · Maya Lin · {STRATEGY_DELIVERABLES.length} deliverables
            </span>
          </div>
        </div>

        <div className="divide-y divide-[#F0F0F0]">
          {sorted.map((d) => (
            <DeliverableRow key={d.id} deliverable={d} />
          ))}
        </div>
      </section>

      {/* What's wired note */}
      <div className="mt-6 rounded-lg border border-[#E5E5EA] bg-[#FAFAFB] p-4 text-xs text-[#7A7A7A]">
        <p className="font-semibold uppercase tracking-wider text-[#1B1B1B]">
          The full pod page change is two things
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            <span className="font-medium text-[#1B1B1B]">"strategist" added to the PodMemberRole enum.</span> Maya then appears in the existing members grid using the existing MemberRow component. No new visual treatment needed.
          </li>
          <li>
            <span className="font-medium text-[#1B1B1B]">This table section</span>, added once to the pod detail page somewhere below the existing members + capacity row. Above-the-fold for the strategist, scannable for the pod.
          </li>
        </ul>
        <p className="mt-3">
          Everything else on the pod page (capacity meter, members panel, project list, blockers, etc) stays untouched.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function DeliverableRow({ deliverable: d }: { deliverable: StrategyDeliverable }) {
  const tone =
    d.status === "blocked" ? "text-rose-700"
      : d.status === "in_progress" ? "text-[#1B1B1B] font-semibold"
      : d.status === "done" ? "text-emerald-700"
      : "text-[#7A7A7A]";
  const dot =
    d.status === "blocked" ? "bg-rose-500 ring-2 ring-rose-200"
      : d.status === "in_progress" ? "bg-[#1B1B1B] ring-2 ring-[#1B1B1B]/20"
      : d.status === "done" ? "bg-emerald-500"
      : "bg-[#D5D5D8]";

  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-[#FAFAFB]">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] shrink-0 w-20">
          {d.client}
        </span>
        <span className="text-[12px] font-medium text-[#1B1B1B] truncate">
          {d.title}
        </span>
      </div>
      <div className="flex items-baseline gap-3 shrink-0">
        <span className={`inline-flex items-center gap-1.5 text-[11px] ${tone}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {d.status_hint}
        </span>
        <span className="text-[11px] text-[#7A7A7A] tabular-nums w-28 text-right">
          {d.due}
        </span>
      </div>
    </div>
  );
}
