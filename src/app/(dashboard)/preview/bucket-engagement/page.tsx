"use client";

/* PREVIEW PAGE - Strategy on a bucket (non-CE) engagement.
 *
 * A normal project, not a 90-day retainer. No cycles, no recurring
 * tests, just a fixed set of deliverables over working days.
 *
 * The strategy pattern is the same:
 *   - Strategy as a third deliverable list alongside Design + Dev
 *   - One Sandbox section: resources + notes + generate branded button
 *
 * What's different from the CE retainer view:
 *   - No cycle tabs (single flat deliverable view)
 *   - Header shows "Bucket B · 15 wd" instead of "Day X/90 · W2"
 *   - Strategy work is front-loaded: one big brief upfront, then
 *     design reviews and QAs per deliverable. Less ongoing roadmap
 *     thinking because the engagement is bounded.
 *   - Sandbox content density is lower because the engagement is
 *     shorter. Same shape, fewer entries.
 *
 * Mock data, not wired up.
 */

import { useState } from "react";
import {
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
  name: "Olipop",
  bucket: "B",
  bucket_wd: 15,
  pod_number: 3,
  strategist: "Maya Lin",
  current_wd: 6,
  pct: 28,
  done: 7,
  total: 25,
};

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assigned: string;
  due: string;
}

const STRATEGY_TASKS: Task[] = [
  { id: "s1", title: "Brief: Olipop sparkling tonics project", status: "done", assigned: "Maya Lin", due: "Done Mon" },
  { id: "s2", title: "Results readout: post-launch performance", status: "todo", assigned: "Maya Lin", due: "After ship" },
];

const DESIGN_TASKS: Task[] = [
  { id: "d1", title: "PDP — Vintage Cola", status: "in_progress", assigned: "Tom Park", due: "Wed 27" },
  { id: "d2", title: "PDP — Strawberry Vanilla", status: "todo", assigned: "Tom Park", due: "Fri 29" },
  { id: "d3", title: "PDP — Classic Root Beer", status: "todo", assigned: "Tom Park", due: "Mon 1 Jun" },
  { id: "d4", title: "Homepage", status: "todo", assigned: "Tom Park", due: "Tue 2 Jun" },
  { id: "d5", title: "Collection: Fan Favourites", status: "todo", assigned: "Tom Park", due: "Wed 3 Jun" },
];

const DEV_TASKS: Task[] = [
  { id: "v1", title: "PDP Liquid sections", status: "todo", assigned: "Lily Rao", due: "Mon 8 Jun" },
  { id: "v2", title: "Homepage build", status: "todo", assigned: "Lily Rao", due: "Wed 10 Jun" },
  { id: "v3", title: "Collection template", status: "todo", assigned: "Lily Rao", due: "Thu 11 Jun" },
];

const MUST_DOS = [
  { key: "cro_brief", label: "Design brief", complete: true },
  { key: "design_handoff", label: "Dev handover", complete: false, active: true },
  { key: "dev_handoff", label: "Dev QA", complete: false },
  { key: "launch_prep", label: "Handoff / Testing", complete: false },
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
    title: "Olipop project brief + positioning",
    kind: "file",
    added: "Mon 19 May",
    added_by: "Maya Lin",
    has_branded: true,
  },
  {
    id: "r2",
    title: "Brand guidelines (shared by client)",
    kind: "doc",
    added: "Mon 19 May",
    added_by: "Maya Lin",
  },
  {
    id: "r3",
    title: "Kickoff call recording",
    kind: "loom",
    added: "Mon 19 May",
    added_by: "Maya Lin",
  },
];

const NOTES_SEED = `Mon 19 May — Kickoff
- Olipop wants 3 PDPs, homepage, 1 collection page in 15 wd
- Brand voice: playful, irreverent, but science-backed
- They're worried about taste-skepticism, lean into reviews + ingredients

Wed 21 May — Brief drafted
- Vintage Cola is hero product (best-selling SKU), lean PDP into nostalgia angle
- Strawberry Vanilla is conversion-driver in DTC, lean into pairing/recipe content
- Homepage: bundle-first, no flagship hero (we tested, didn't move needle for this category)`;

// ─── Page ────────────────────────────────────────────────────────────

export default function BucketEngagementPreview() {
  const [notes, setNotes] = useState(NOTES_SEED);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
        <SparklesIcon className="h-3.5 w-3.5" />
        Preview, mock data · Bucket project (non-CE)
      </div>

      {/* Header (existing chrome, bucket variant) */}
      <header className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <button className="inline-flex items-center gap-1 text-[12px] font-medium text-[#666]">
            <ChevronRightIcon className="h-3 w-3 rotate-180" />
            Back to engagements
          </button>
        </div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-3xl font-medium tracking-tight text-[#1B1B1B]">
              {ENGAGEMENT.name}
            </h1>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded text-[#1976D2] bg-[#E3F2FD]">
                Bucket {ENGAGEMENT.bucket}
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-3 text-[12px] text-[#666] flex-wrap">
            <span>
              Day{" "}
              <span className="font-semibold text-[#1B1B1B] tabular-nums">
                {ENGAGEMENT.current_wd}
              </span>
              /{ENGAGEMENT.bucket_wd} wd
            </span>
            <span className="text-[#E5E5EA]">·</span>
            <span>
              Pod{" "}
              <span className="font-semibold text-[#1B1B1B] tabular-nums">
                {ENGAGEMENT.pod_number}
              </span>
            </span>
            <span className="text-[#E5E5EA]">·</span>
            <span className="font-semibold tabular-nums">
              {ENGAGEMENT.done}/{ENGAGEMENT.total} · {ENGAGEMENT.pct}%
            </span>
          </div>
        </div>
      </header>

      {/* Must-dos */}
      <section className="mb-5 rounded-lg border border-[#E5E5EA] bg-white px-4 py-3">
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
            Must dos
          </span>
          <span className="text-[10px] text-[#999]">
            {MUST_DOS.filter((m) => m.complete).length}/{MUST_DOS.length} complete
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {MUST_DOS.map((m) => (
            <div
              key={m.key}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium ${
                m.complete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : m.active
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-[#E5E5EA] bg-[#FAFAFA] text-[#666]"
              }`}
            >
              {m.complete ? "✓" : m.active ? "●" : "○"} {m.label}
            </div>
          ))}
        </div>
      </section>

      {/* NO cycle tabs (this is a bucket, single flat view) */}

      {/* Three deliverable lists, no cycle wrapper, just project-wide */}
      <section className="mb-5">
        <div className="mb-2 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
            Project deliverables
          </span>
          <span className="ml-2 text-[10px] text-[#A0A0A0]">
            Single bucket, no cycles · ships by day {ENGAGEMENT.bucket_wd}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <DeliverableList
            label="Strategy"
            owner={ENGAGEMENT.strategist}
            tasks={STRATEGY_TASKS}
            tone="strategy"
          />
          <DeliverableList
            label="Design"
            owner="Tom Park"
            tasks={DESIGN_TASKS}
          />
          <DeliverableList
            label="Development"
            owner="Lily Rao"
            tasks={DEV_TASKS}
          />
        </div>
      </section>

      {/* Strategy sandbox: same component, lighter content for shorter engagement */}
      <section className="mb-5 rounded-lg border border-[#E5E5EA] bg-white">
        <div className="flex items-baseline justify-between border-b border-[#F0F0F0] px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
              Strategy
            </span>
            <span className="text-[13px] font-semibold text-[#1B1B1B]">
              Sandbox
            </span>
            <span className="text-[10px] text-[#A0A0A0]">
              · Resources and notes for {ENGAGEMENT.name} · {ENGAGEMENT.strategist}
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-5">
          {/* Resources (left) */}
          <div className="md:col-span-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
                Resources
              </span>
              <span className="text-[10px] text-[#A0A0A0]">{RESOURCES.length}</span>
            </div>

            <div className="mb-3 rounded-md border border-dashed border-[#C5C5C5] bg-[#FAFAFB] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-[#666]">
                  Paste a Google Doc / Loom / link, or drop a file
                </span>
                <button className="inline-flex items-center gap-1 rounded-md bg-[#1B1B1B] px-2 py-1 text-[11px] font-medium text-white hover:bg-black">
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {RESOURCES.map((r) => (
                <ResourceRow key={r.id} resource={r} />
              ))}
            </div>
          </div>

          {/* Notes (right) */}
          <div className="md:col-span-2">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
                Notes
              </span>
              <span className="text-[10px] text-[#A0A0A0]">Autosaves</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-[200px] w-full resize-none rounded-md border border-[#E5E5EA] bg-[#FAFAFB] px-3 py-2 text-[12px] leading-relaxed text-[#1B1B1B] focus:border-[#1B1B1B] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* What's wired note */}
      <div className="mt-6 rounded-lg border border-[#E5E5EA] bg-[#FAFAFB] p-4 text-xs text-[#7A7A7A]">
        <p className="font-semibold uppercase tracking-wider text-[#1B1B1B]">
          What's different on a bucket project
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            <span className="font-medium text-[#1B1B1B]">No cycle tabs.</span> Single flat deliverable view. Bucket runs end-to-end, ships by day 15.
          </li>
          <li>
            <span className="font-medium text-[#1B1B1B]">Strategy is front-loaded.</span> One big brief upfront (already done), then design reviews and QAs per deliverable. No recurring monthly reviews, no roadmap thinking.
          </li>
          <li>
            <span className="font-medium text-[#1B1B1B]">Sandbox is lighter</span> by nature, fewer resources accumulate over 15 working days than 90. Same shape, less content.
          </li>
          <li>
            <span className="font-medium text-[#1B1B1B]">Pattern is identical to CE.</span> Strategy/Design/Dev deliverable lists, sandbox section, generate branded button. The strategist doesn't have to learn two surfaces.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function DeliverableList({
  label,
  owner,
  tasks,
  tone,
}: {
  label: string;
  owner: string;
  tasks: Task[];
  tone?: "strategy";
}) {
  return (
    <div className="rounded-lg border border-[#E5E5EA] bg-white">
      <div className="flex items-baseline justify-between border-b border-[#F0F0F0] px-3 py-2.5">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              tone === "strategy" ? "text-violet-700" : "text-[#999]"
            }`}
          >
            {label}
          </span>
          <span className="text-[10px] text-[#A0A0A0]">· {owner}</span>
        </div>
        <span className="text-[10px] text-[#A0A0A0] tabular-nums">{tasks.length}</span>
      </div>
      <div className="divide-y divide-[#F5F5F5]">
        {tasks.map((t) => (
          <div key={t.id} className="px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-[12px] leading-snug ${
                  t.status === "done" ? "text-[#A0A0A0] line-through" : "font-medium text-[#1B1B1B]"
                }`}
              >
                {t.title}
              </span>
              <span
                className={`shrink-0 inline-flex items-center gap-1 text-[10px] tabular-nums ${
                  t.status === "done"
                    ? "text-emerald-700"
                    : t.status === "in_progress"
                      ? "text-[#1B1B1B] font-semibold"
                      : "text-[#7A7A7A]"
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
    "text-[#4A4A4A] bg-[#F3F3F5] border-[#E5E5EA]";

  return (
    <div className="flex items-center gap-2.5 rounded-md border border-[#EDEDEF] bg-white px-2.5 py-2">
      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded border ${tone}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-[#1B1B1B]">
          {resource.title}
        </div>
        <div className="text-[10px] text-[#A0A0A0]">
          {resource.added} · by {resource.added_by}
        </div>
      </div>
      {resource.has_branded && (
        <button className="inline-flex items-center gap-1 rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[10px] font-medium text-[#1B1B1B] hover:border-[#1B1B1B]">
          <SparklesIcon className="h-3 w-3" />
          Generate branded version
        </button>
      )}
      <button className="rounded p-1 text-[#7A7A7A] hover:bg-[#F3F3F5] hover:text-[#1B1B1B]">
        <EllipsisHorizontalIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
