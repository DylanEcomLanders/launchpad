"use client";

/* ── Client Success OS · PREVIEW (v2) ──
 *
 * Isolated mock. NOT wired. Rebuilt around the dashboard → drill-in
 * pattern Dylan likes elsewhere in the app:
 *
 *   Overview   - simple, scannable list of every engagement: where
 *                they are, the one next thing due, on-track / attention.
 *   Client     - click in: the clear schedule of everything we deliver,
 *                client-facing dates, who owns each, status. Shape
 *                depends on engagement type:
 *                  · Retainer    - runs like an engine (week 1 → day 30
 *                                  → monthly → day 75 refresh → day 90
 *                                  close → rolling)
 *                  · Single build - locked deliverables, each with the
 *                                  date promised to the client.
 *   Add        - new engagement: pick type, set kickoff. (Would also
 *                spin up the delivery kanban.)
 *
 * Bigger type, less chrome than v1. Mock data only.
 */

import { useState } from "react";
import {
  ArrowLeftIcon,
  PlusIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

/* ── Model ──────────────────────────────────────────────────── */

type Status = "done" | "active" | "upcoming";
type EngagementType = "retainer" | "build";

interface Step {
  /* Client-facing date - what the client expects, not internal. */
  date: string;
  title: string;
  detail: string;
  owner: string;
  status: Status;
}

interface Engagement {
  id: string;
  name: string;
  initials: string;
  type: EngagementType;
  tier?: "Entry" | "Core" | "VIP";
  scopeLocked?: boolean;
  progressLabel: string;
  progressPct: number;
  next: { title: string; date: string };
  health: "on-track" | "attention";
  schedule: Step[];
}

const ENGAGEMENTS: Engagement[] = [
  {
    id: "acme",
    name: "Acme Co",
    initials: "AC",
    type: "retainer",
    tier: "Core",
    progressLabel: "Day 47 of 90",
    progressPct: 52,
    next: { title: "Monthly report + review call", date: "Fri 4 Jul" },
    health: "on-track",
    schedule: [
      { date: "Mon 19 May", title: "Kickoff + strategy", detail: "Roadmap, testing plan, first-week expectations set", owner: "Aanchal", status: "done" },
      { date: "Mon 9 Jun", title: "Day 30 results review", detail: "What shipped, early test reads, next 30 days", owner: "Amber", status: "done" },
      { date: "Fri 4 Jul", title: "Monthly report + review call", detail: "CR + revenue deltas, wins, next month plan", owner: "Amber", status: "active" },
      { date: "Tue 22 Jul", title: "Day 75 renewal refresh", detail: "Forward roadmap deck to anchor the renewal", owner: "Aanchal", status: "upcoming" },
      { date: "Wed 6 Aug", title: "Day 90 renewal close", detail: "Renewal conversation, move to rolling contract", owner: "Amber", status: "upcoming" },
    ],
  },
  {
    id: "lumen",
    name: "Lumen Skincare",
    initials: "LU",
    type: "build",
    scopeLocked: true,
    progressLabel: "Build week 2 of 4",
    progressPct: 45,
    next: { title: "Design review · Product page", date: "Tue 8 Jul" },
    health: "on-track",
    schedule: [
      { date: "Mon 23 Jun", title: "Kickoff + strategy doc", detail: "Scope confirmed, references, success criteria", owner: "Aanchal", status: "done" },
      { date: "Thu 3 Jul", title: "Framing page · design", detail: "First page to client for review", owner: "Barnaby", status: "done" },
      { date: "Tue 8 Jul", title: "Product page · design", detail: "Conversion-led PDP to client for review", owner: "Barnaby", status: "active" },
      { date: "Mon 14 Jul", title: "Cart · design + build", detail: "Frictionless cart, AOV mechanics", owner: "Brandon", status: "upcoming" },
      { date: "Thu 17 Jul", title: "Launch + handoff", detail: "QA, go-live, walkthrough call", owner: "Brandon", status: "upcoming" },
      { date: "Thu 24 Jul", title: "Post-launch review", detail: "First-week numbers, what's next", owner: "Amber", status: "upcoming" },
    ],
  },
  {
    id: "vertex",
    name: "Vertex Supplements",
    initials: "VX",
    type: "retainer",
    tier: "VIP",
    progressLabel: "Day 82 of 90",
    progressPct: 91,
    next: { title: "Renewal close", date: "Sat 12 Jul" },
    health: "attention",
    schedule: [
      { date: "Wed 14 May", title: "Day 30 results review", detail: "Delivered, strong early CR lift", owner: "Amber", status: "done" },
      { date: "Fri 13 Jun", title: "Monthly report + review call", detail: "Delivered", owner: "Amber", status: "done" },
      { date: "Fri 27 Jun", title: "Day 75 renewal refresh", detail: "Forward roadmap deck - needs sending", owner: "Aanchal", status: "active" },
      { date: "Sat 12 Jul", title: "Renewal close + expansion", detail: "Renewal + VIP tier upsell conversation", owner: "Amber", status: "active" },
    ],
  },
];

/* ── Status dot ─────────────────────────────────────────────── */

function StatusDot({ status }: { status: Status }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center justify-center size-5 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
        <CheckIcon className="size-3 text-emerald-300" />
      </span>
    );
  }
  if (status === "active") {
    return <span className="size-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/15" />;
  }
  return <span className="size-2.5 rounded-full bg-[#3A3A3A]" />;
}

const TYPE_LABEL: Record<EngagementType, string> = {
  retainer: "Retainer",
  build: "Single build",
};

/* ── Page ───────────────────────────────────────────────────── */

export default function ClientSuccessPreview() {
  const [view, setView] = useState<"overview" | "detail" | "add">("overview");
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = ENGAGEMENTS.find((e) => e.id === activeId) ?? null;

  function open(id: string) {
    setActiveId(id);
    setView("detail");
  }

  return (
    <div className="min-h-full bg-[#080808] text-[#E5E5EA]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Preview banner */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 ring-1 ring-amber-500/30 text-[12px] text-amber-200 mb-6">
          <span className="size-1.5 rounded-full bg-amber-400" />
          Preview · mock data
        </div>

        {view === "overview" && <Overview onOpen={open} onAdd={() => setView("add")} />}
        {view === "detail" && active && (
          <Detail engagement={active} onBack={() => setView("overview")} />
        )}
        {view === "add" && <AddEngagement onBack={() => setView("overview")} />}
      </div>
    </div>
  );
}

/* ── Overview ───────────────────────────────────────────────── */

function Overview({
  onOpen,
  onAdd,
}: {
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Client success</h1>
          <p className="text-[14px] text-[#9CA3AF] mt-1">
            {ENGAGEMENTS.length} active engagements
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold bg-white text-[#0C0C0C] hover:bg-[#E5E5EA]"
        >
          <PlusIcon className="size-4" />
          Add engagement
        </button>
      </div>

      <div className="space-y-2.5">
        {ENGAGEMENTS.map((e) => (
          <button
            key={e.id}
            onClick={() => onOpen(e.id)}
            className="w-full text-left bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.05] hover:ring-white/[0.14] transition-all p-5"
          >
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-sky-500/25 to-blue-600/25 ring-1 ring-sky-500/25 text-[14px] font-semibold text-sky-100 shrink-0">
                {e.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[17px] font-semibold text-[#E5E5EA] truncate">
                    {e.name}
                  </span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-md ring-1 ${
                      e.type === "retainer"
                        ? "bg-sky-500/10 text-sky-200 ring-sky-500/25"
                        : "bg-violet-500/10 text-violet-200 ring-violet-500/25"
                    }`}
                  >
                    {TYPE_LABEL[e.type]}
                    {e.tier ? ` · ${e.tier}` : ""}
                  </span>
                </div>
                <div className="text-[13px] text-[#71757D] mt-1">
                  Next: <span className="text-[#9CA3AF]">{e.next.title}</span> · {e.next.date}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      e.health === "on-track" ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span className="text-[12px] text-[#71757D]">{e.progressLabel}</span>
                </div>
                <div className="w-28 h-1 rounded-full bg-white/[0.06] mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
                    style={{ width: `${e.progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Client detail ──────────────────────────────────────────── */

function Detail({
  engagement: e,
  onBack,
}: {
  engagement: Engagement;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] mb-5"
      >
        <ArrowLeftIcon className="size-4" />
        All clients
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <span className="inline-flex items-center justify-center size-12 rounded-xl bg-gradient-to-br from-sky-500/25 to-blue-600/25 ring-1 ring-sky-500/25 text-[15px] font-semibold text-sky-100 shrink-0">
          {e.initials}
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{e.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] text-[#9CA3AF]">
              {TYPE_LABEL[e.type]}
              {e.tier ? ` · ${e.tier}` : ""} · {e.progressLabel}
            </span>
            {e.scopeLocked && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/25">
                Scope locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="text-[13px] font-medium text-[#71757D] mb-3">
        {e.type === "retainer"
          ? "The engine: what the client gets, and when"
          : "Deliverables: what we ship, and the date promised"}
      </div>

      <div className="relative">
        {/* Timeline spine */}
        <div className="absolute left-[10px] top-2 bottom-2 w-px bg-white/[0.06]" />
        <div className="space-y-1">
          {e.schedule.map((s, i) => (
            <div key={i} className="relative flex gap-4 pl-0 py-3">
              <div className="relative z-10 shrink-0 pt-0.5 w-5 flex justify-center">
                <StatusDot status={s.status} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`text-[15px] font-medium ${
                      s.status === "upcoming" ? "text-[#9CA3AF]" : "text-[#E5E5EA]"
                    }`}
                  >
                    {s.title}
                  </span>
                  <span className="text-[13px] text-[#71757D] tabular-nums shrink-0">
                    {s.date}
                  </span>
                </div>
                <div className="text-[13px] text-[#71757D] mt-0.5">{s.detail}</div>
                <div className="text-[12px] text-[#5A5C61] mt-1">Owner: {s.owner}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Add engagement ─────────────────────────────────────────── */

function AddEngagement({ onBack }: { onBack: () => void }) {
  const [type, setType] = useState<EngagementType>("retainer");

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] mb-5"
      >
        <ArrowLeftIcon className="size-4" />
        Cancel
      </button>

      <h1 className="text-2xl font-semibold mb-1">Add engagement</h1>
      <p className="text-[14px] text-[#9CA3AF] mb-6">
        Sets up the success tracker. Would also spin up the delivery board.
      </p>

      <div className="space-y-5 max-w-lg">
        <Field label="Client name">
          <input
            placeholder="Acme Co"
            className="w-full h-11 px-3.5 bg-[#0F0F10] rounded-lg ring-1 ring-white/[0.06] text-[14px] text-[#E5E5EA] placeholder:text-[#5A5C61] focus:outline-none focus:ring-white/[0.16]"
          />
        </Field>

        <Field label="Engagement type">
          <div className="grid grid-cols-2 gap-2.5">
            {(["retainer", "build"] as EngagementType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-3 rounded-lg text-left ring-1 transition-colors ${
                  type === t
                    ? "bg-white text-[#0C0C0C] ring-white"
                    : "bg-[#0F0F10] text-[#9CA3AF] ring-white/[0.06] hover:text-[#E5E5EA]"
                }`}
              >
                <div className="text-[14px] font-semibold">{TYPE_LABEL[t]}</div>
                <div className={`text-[12px] mt-0.5 ${type === t ? "text-[#0C0C0C]/60" : "text-[#71757D]"}`}>
                  {t === "retainer" ? "Runs the success engine" : "Fixed deliverables + dates"}
                </div>
              </button>
            ))}
          </div>
        </Field>

        {type === "retainer" ? (
          <Field label="Tier">
            <div className="grid grid-cols-3 gap-2.5">
              {["Entry", "Core", "VIP"].map((tier) => (
                <div
                  key={tier}
                  className="px-3 py-2.5 rounded-lg text-center text-[13px] bg-[#0F0F10] ring-1 ring-white/[0.06] text-[#9CA3AF]"
                >
                  {tier}
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[#5A5C61] mt-2">
              Tier sets delivery volume on the board. The success cadence is the same for all three.
            </p>
          </Field>
        ) : (
          <Field label="Deliverables">
            <div className="space-y-2">
              {["Framing page", "Product page", "Cart"].map((d) => (
                <div
                  key={d}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#0F0F10] ring-1 ring-white/[0.06]"
                >
                  <span className="text-[14px] text-[#E5E5EA]">{d}</span>
                  <span className="text-[12px] text-[#5A5C61]">client date</span>
                </div>
              ))}
              <button className="inline-flex items-center gap-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] mt-1">
                <PlusIcon className="size-4" />
                Add deliverable
              </button>
            </div>
          </Field>
        )}

        <Field label="Kickoff date">
          <input
            type="date"
            className="w-full h-11 px-3.5 bg-[#0F0F10] rounded-lg ring-1 ring-white/[0.06] text-[14px] text-[#E5E5EA] focus:outline-none focus:ring-white/[0.16]"
          />
        </Field>

        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold bg-white text-[#0C0C0C] hover:bg-[#E5E5EA]">
          Create engagement
          <ArrowRightIcon className="size-4" />
        </button>
        <p className="text-[12px] text-[#5A5C61]">
          Schedule auto-fills off the kickoff date - same template every time.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium uppercase tracking-wider text-[#71757D] mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
