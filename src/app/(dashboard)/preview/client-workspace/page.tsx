"use client";

/* PREVIEW PAGE - Strategy on the engagement page (v4, simple).
 *
 * User's spec, exactly:
 *   1. Today the engagement page has design + dev deliverable lists in
 *      the cycle view. Add Strategy as a third list, same pattern.
 *   2. Add one Strategy sandbox section per client = drop links / Looms
 *      / docs + notes textarea. Uploaded docs get a "Generate branded
 *      version" button. That's the strategist's localised space.
 *
 * No roadmap section, no hypotheses pool, no decisions log, no five-
 * gate strip on projects.
 *
 * Mock data, not wired up.
 */

import { useState } from "react";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  LinkIcon,
  PaperClipIcon,
  PlayCircleIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// ─── Mock data ───────────────────────────────────────────────────────

const ENGAGEMENT = {
  name: "Hydrant",
  retainer: "£8,000",
  pod_number: 2,
  strategist: "Maya Lin",
  cycle_day: 38,
  cycle_total: 90,
  cycle_week: 2,
  pct: 64,
  done: 16,
  total: 25,
  blocked: 1,
  cvr: { baseline: 2.4, current: 3.1, updated: "12 May" },
  aov: { baseline: 42, current: 47 },
};

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assigned: string;
  due: string;
}

const STRATEGY_TASKS: Task[] = [
  { id: "s1", title: "Brief: whitening strips PDP variant", status: "done", assigned: "Maya Lin", due: "Done Fri" },
  { id: "s2", title: "Brief: welcome email sequence", status: "in_progress", assigned: "Maya Lin", due: "Wed 27" },
  { id: "s3", title: "Results readout: free shipping floor test", status: "todo", assigned: "Maya Lin", due: "Tomorrow" },
];

const DESIGN_TASKS: Task[] = [
  { id: "d1", title: "PDP variant v1", status: "in_progress", assigned: "Sarah Chen", due: "Fri 24" },
  { id: "d2", title: "Welcome email 1 of 5", status: "todo", assigned: "Sarah Chen", due: "Mon 27" },
  { id: "d3", title: "Bundle PDP refresh", status: "done", assigned: "Sarah Chen", due: "Done Wed" },
];

const DEV_TASKS: Task[] = [
  { id: "v1", title: "PDP variant Liquid section", status: "todo", assigned: "Ben Adams", due: "Mon 27" },
  { id: "v2", title: "Free shipping floor variant", status: "done", assigned: "Ben Adams", due: "Done last week" },
];

interface Resource {
  id: string;
  title: string;
  kind: "doc" | "loom" | "link" | "file";
  added: string;
  added_by: string;
  has_branded?: boolean;
}

const RESOURCES: Resource[] = [
  {
    id: "r1",
    title: "Hydrant positioning brief Q2",
    kind: "file",
    added: "12 May",
    added_by: "Maya Lin",
    has_branded: true,
  },
  {
    id: "r2",
    title: "VOC interview notes (Google Doc)",
    kind: "doc",
    added: "8 May",
    added_by: "Maya Lin",
  },
  {
    id: "r3",
    title: "Walkthrough: why we're shifting positioning",
    kind: "loom",
    added: "Today",
    added_by: "Maya Lin",
  },
  {
    id: "r4",
    title: "Competitor teardown — Liquid IV pricing page",
    kind: "link",
    added: "3d ago",
    added_by: "Maya Lin",
  },
];

const NOTES_PLACEHOLDER = `Quick notes go here. Anything: half-formed hypotheses, things to revisit on next review, observations from client calls, ideas to put in front of Dan.

This is your space for this client. Not formatted, not tracked, just yours.`;

const NOTES_SEED = `Mon 25 May
- Dan agreed homepage positioning shift, want to test 'results in 14 days' angle hard
- VOC consistent on this: customers compare outcome, not formula
- Welcome email sequence: lean into the same frame, repeat the 14-day message

Wed 20 May
- Subscription tier work parked to Q3, email sequence is the bigger near-term lever
- Worth revisiting once we have welcome-flow lift data`;

// ─── Page ────────────────────────────────────────────────────────────

export default function EngagementWithStrategyPreview() {
  const [notes, setNotes] = useState(NOTES_SEED);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
        <SparklesIcon className="h-3.5 w-3.5" />
        Preview, mock data
      </div>

      {/* Header (existing chrome) */}
      <header className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <button className="inline-flex items-center gap-1 text-[12px] font-medium text-[#9CA3AF]">
            <ChevronRightIcon className="h-3 w-3 rotate-180" />
            Back to engagements
          </button>
        </div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-3xl font-medium text-[#E5E5EA]">
              {ENGAGEMENT.name}
            </h1>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded text-[#0C0C0C] bg-white">
                CE retainer
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-3 text-[12px] text-[#9CA3AF] flex-wrap">
            <span>Day <span className="font-semibold text-[#E5E5EA] tabular-nums">{ENGAGEMENT.cycle_day}</span>/{ENGAGEMENT.cycle_total} · W{ENGAGEMENT.cycle_week}</span>
            <span className="text-[#E5E5EA]">·</span>
            <span><span className="font-semibold text-[#E5E5EA] tabular-nums">{ENGAGEMENT.retainer}</span>/mo</span>
            <span className="text-[#E5E5EA]">·</span>
            <span>Pod <span className="font-semibold text-[#E5E5EA] tabular-nums">{ENGAGEMENT.pod_number}</span></span>
            <span className="text-[#E5E5EA]">·</span>
            <span className="font-semibold tabular-nums">{ENGAGEMENT.done}/{ENGAGEMENT.total} · {ENGAGEMENT.pct}%</span>
          </div>
        </div>
      </header>

      {/* Metrics strip (existing) */}
      <section className="mb-5 rounded-lg border border-[#2A2A2A] bg-[#181818] divide-y divide-[#2A2A2A]">
        <MetricRow label="Conversion rate" unit="%" baseline={ENGAGEMENT.cvr.baseline} current={ENGAGEMENT.cvr.current} />
        <MetricRow label="Average order value" unit="£" unitPosition="prefix" baseline={ENGAGEMENT.aov.baseline} current={ENGAGEMENT.aov.current} />
      </section>

      {/* Cycle tabs (existing) */}
      <section className="mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[1, 2, 3].map((c) => (
            <button
              key={c}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] ${
                c === 2 ? "border-white bg-white text-[#0C0C0C]" : "border-[#2A2A2A] bg-[#181818] text-[#E5E5EA]"
              }`}
            >
              <span className={`size-1.5 rounded-full ${c === 1 ? "bg-[#9E9E9E]" : c === 2 ? "bg-[#00C853]" : "bg-[#2A2A2A]"}`} />
              Cycle {c}
            </button>
          ))}
        </div>
      </section>

      {/* THREE deliverable lists side by side: Strategy / Design / Dev */}
      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <DeliverableList
          label="Strategy"
          owner={ENGAGEMENT.strategist}
          tasks={STRATEGY_TASKS}
          tone="strategy"
        />
        <DeliverableList
          label="Design"
          owner="Sarah Chen"
          tasks={DESIGN_TASKS}
        />
        <DeliverableList
          label="Development"
          owner="Ben Adams"
          tasks={DEV_TASKS}
        />
      </section>

      {/* Strategy sandbox: resources + notes per client */}
      <section className="mb-5 rounded-lg border border-[#2A2A2A] bg-[#181818]">
        <div className="flex items-baseline justify-between border-b border-[#2A2A2A] px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
              Strategy
            </span>
            <span className="text-[13px] font-semibold text-[#E5E5EA]">
              Sandbox
            </span>
            <span className="text-[10px] text-[#71757D]">
              · Resources and notes for {ENGAGEMENT.name} · {ENGAGEMENT.strategist}
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-5">
          {/* Resources (left) */}
          <div className="md:col-span-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                Resources
              </span>
              <span className="text-[10px] text-[#71757D]">{RESOURCES.length}</span>
            </div>

            {/* Drop area */}
            <div className="mb-3 rounded-md border border-dashed border-[#C5C5C5] bg-[#0C0C0C] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-[#9CA3AF]">
                  Paste a Google Doc / Loom / link, or drop a file
                </span>
                <button className="inline-flex items-center gap-1 rounded-md bg-[#1B1B1B] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#F3F4F6]">
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Resource list */}
            <div className="space-y-1.5">
              {RESOURCES.map((r) => (
                <ResourceRow key={r.id} resource={r} />
              ))}
            </div>
          </div>

          {/* Notes (right) */}
          <div className="md:col-span-2">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                Notes
              </span>
              <span className="text-[10px] text-[#71757D]">Autosaves</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={NOTES_PLACEHOLDER}
              className="h-[260px] w-full resize-none rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 py-2 text-[12px] leading-relaxed text-[#E5E5EA] focus:border-white focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* What's wired note */}
      <div className="mt-6 rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] p-4 text-xs text-[#71757D]">
        <p className="font-semibold uppercase tracking-wider text-[#E5E5EA]">
          What's wired in
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            <span className="font-medium text-[#E5E5EA]">Strategy is a third deliverable list</span> alongside Design and Development. Same task shape, same renderer.
          </li>
          <li>
            <span className="font-medium text-[#E5E5EA]">One Sandbox section</span> per client: resources (links, Looms, Docs, uploaded files) on the left, notes textarea on the right.
          </li>
          <li>
            <span className="font-medium text-[#E5E5EA]">Uploaded docs get a "Generate branded version" button</span> inline. One click renders a client-facing PDF/page using Ecom Landers branding.
          </li>
          <li>
            Notes autosave. No structure, no tags, just her scratchpad for this client.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function MetricRow({
  label, unit, unitPosition = "suffix", baseline, current,
}: {
  label: string; unit: string; unitPosition?: "prefix" | "suffix"; baseline: number; current: number;
}) {
  const delta = ((current - baseline) / baseline) * 100;
  const fmt = (v: number) => (unitPosition === "prefix" ? `${unit}${v}` : `${v}${unit}`);
  return (
    <div className="grid grid-cols-4 items-baseline gap-3 px-4 py-2.5 text-[12px]">
      <span className="text-[#9CA3AF]">{label}</span>
      <span className="tabular-nums text-[#9CA3AF]">Baseline {fmt(baseline)}</span>
      <span className="tabular-nums font-semibold text-[#E5E5EA]">Now {fmt(current)}</span>
      <span className="text-right tabular-nums font-semibold text-emerald-700">+{delta.toFixed(1)}%</span>
    </div>
  );
}

function DeliverableList({
  label, owner, tasks, tone,
}: {
  label: string; owner: string; tasks: Task[]; tone?: "strategy";
}) {
  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#181818]">
      <div className="flex items-baseline justify-between border-b border-[#2A2A2A] px-3 py-2.5">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              tone === "strategy" ? "text-violet-700" : "text-[#71757D]"
            }`}
          >
            {label}
          </span>
          <span className="text-[10px] text-[#71757D]">· {owner}</span>
        </div>
        <span className="text-[10px] text-[#71757D] tabular-nums">{tasks.length}</span>
      </div>
      <div className="divide-y divide-[#2A2A2A]">
        {tasks.map((t) => (
          <div key={t.id} className="px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-[12px] leading-snug ${
                  t.status === "done" ? "text-[#71757D] line-through" : "font-medium text-[#E5E5EA]"
                }`}
              >
                {t.title}
              </span>
              <span
                className={`shrink-0 inline-flex items-center gap-1 text-[10px] tabular-nums ${
                  t.status === "done"
                    ? "text-emerald-700"
                    : t.status === "in_progress"
                      ? "text-[#E5E5EA] font-semibold"
                      : "text-[#71757D]"
                }`}
              >
                {t.status === "done" ? "✓" : t.status === "in_progress" ? "●" : "○"}
                {t.due}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceRow({ resource }: { resource: Resource }) {
  const icon =
    resource.kind === "doc" ? <DocumentTextIcon className="h-4 w-4" /> :
    resource.kind === "loom" ? <PlayCircleIcon className="h-4 w-4" /> :
    resource.kind === "link" ? <LinkIcon className="h-4 w-4" /> :
    <PaperClipIcon className="h-4 w-4" />;
  const tone =
    resource.kind === "doc" ? "text-blue-700 bg-blue-50 border-blue-200" :
    resource.kind === "loom" ? "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200" :
    resource.kind === "link" ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
    "text-[#4A4A4A] bg-[#222222] border-[#2A2A2A]";

  return (
    <div className="flex items-center gap-2.5 rounded-md border border-[#2A2A2A] bg-[#181818] px-2.5 py-2">
      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded border ${tone}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-[#E5E5EA]">
          {resource.title}
        </div>
        <div className="text-[10px] text-[#71757D]">
          {resource.added} · by {resource.added_by}
        </div>
      </div>
      {resource.has_branded && (
        <button className="inline-flex items-center gap-1 rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[10px] font-medium text-[#E5E5EA] hover:border-white">
          <SparklesIcon className="h-3 w-3" />
          Generate branded version
        </button>
      )}
      <button className="rounded p-1 text-[#71757D] hover:bg-[#222222] hover:text-[#E5E5EA]">
        <EllipsisHorizontalIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
