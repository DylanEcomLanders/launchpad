"use client";

/* ── Client Success OS · PREVIEW (v4) ──
 *
 * Isolated mock. NOT wired. Adds the delivery lifecycle per feedback
 * ("if it's created, how do we know it's been delivered?").
 *
 * Each client-success doc now has three states, not two:
 *   · To create  - doesn't exist yet            → "Create"
 *   · Draft      - built, but NOT sent to client → "Mark sent"
 *   · Delivered  - sent, with a date stamp       → "Sent 4 Jul"
 *
 * The draft state is the one that bites: a finished deck sitting unsent
 * near a renewal. The dashboard counts both gaps (to create / to send),
 * and clicking "Mark sent" stamps a delivered date so the CSM can prove
 * cadence at a glance.
 *
 * Home is the dashboard ("Coming up" across all clients); click a
 * client for its timeline. Mock data only.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PlusIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

const TODAY = "30 Jun";

/* ── Model ──────────────────────────────────────────────────── */

type Status = "done" | "active" | "upcoming";
type EngagementType = "retainer" | "build";
type DocState = "todo" | "draft" | "delivered";

interface Output {
  label: string;
  state: DocState;
  deliveredOn?: string;
  href: string;
}

interface Step {
  id: string;
  iso: string;
  date: string;
  title: string;
  detail: string;
  owner: string;
  status: Status;
  output?: Output;
}

interface Engagement {
  id: string;
  name: string;
  initials: string;
  type: EngagementType;
  tier?: "Entry" | "Core" | "VIP";
  scopeLocked?: boolean;
  progressLabel: string;
  health: "on-track" | "attention";
  schedule: Step[];
}

const KICKOFF = "/hero-offer/execution/kickoff-deck";
const MILESTONE = "/hero-offer/retention/milestone-deck";
const REPORT = "/hero-offer/retention/monthly-report";
const RENEWAL = "/tools/proposals";

const ENGAGEMENTS: Engagement[] = [
  {
    id: "acme",
    name: "Acme Co",
    initials: "AC",
    type: "retainer",
    tier: "Core",
    progressLabel: "Day 47 of 90",
    health: "on-track",
    schedule: [
      { id: "acme-1", iso: "2026-05-19", date: "19 May", title: "Onboarding deck", detail: "Read your brief, here's how it runs from here", owner: "Aanchal", status: "done", output: { label: "Onboarding deck", state: "delivered", deliveredOn: "19 May", href: KICKOFF } },
      { id: "acme-2", iso: "2026-06-09", date: "9 Jun", title: "Day 30 review", detail: "What shipped, early test reads, next 30 days", owner: "Amber", status: "done", output: { label: "Day 30 deck", state: "delivered", deliveredOn: "9 Jun", href: MILESTONE } },
      { id: "acme-3", iso: "2026-06-30", date: "30 Jun", title: "Weekly roundup", detail: "Built Friday, not sent yet", owner: "Amber", status: "active", output: { label: "Weekly roundup", state: "draft", href: REPORT } },
      { id: "acme-4", iso: "2026-07-04", date: "4 Jul", title: "Monthly report + call", detail: "CR + revenue deltas, wins, next month", owner: "Amber", status: "active", output: { label: "Monthly report", state: "todo", href: REPORT } },
      { id: "acme-5", iso: "2026-07-22", date: "22 Jul", title: "Day 75 renewal refresh", detail: "Forward roadmap deck to anchor the renewal", owner: "Aanchal", status: "upcoming", output: { label: "Refresh deck", state: "todo", href: MILESTONE } },
      { id: "acme-6", iso: "2026-08-06", date: "6 Aug", title: "Day 90 renewal close", detail: "Renewal conversation, move to rolling", owner: "Amber", status: "upcoming", output: { label: "Renewal proposal", state: "todo", href: RENEWAL } },
    ],
  },
  {
    id: "lumen",
    name: "Lumen Skincare",
    initials: "LU",
    type: "build",
    scopeLocked: true,
    progressLabel: "Build week 2 of 4",
    health: "on-track",
    schedule: [
      { id: "lumen-1", iso: "2026-06-23", date: "23 Jun", title: "Onboarding deck", detail: "Scope confirmed, expectations aligned", owner: "Aanchal", status: "done", output: { label: "Onboarding deck", state: "delivered", deliveredOn: "23 Jun", href: KICKOFF } },
      { id: "lumen-2", iso: "2026-06-30", date: "30 Jun", title: "Weekly roundup", detail: "Build progress, what's next", owner: "Amber", status: "active", output: { label: "Weekly roundup", state: "todo", href: REPORT } },
      { id: "lumen-3", iso: "2026-07-03", date: "3 Jul", title: "Framing page · design", detail: "First page to client for review", owner: "Barnaby", status: "done" },
      { id: "lumen-4", iso: "2026-07-08", date: "8 Jul", title: "Product page · design", detail: "Conversion-led PDP to client", owner: "Barnaby", status: "active" },
      { id: "lumen-5", iso: "2026-07-17", date: "17 Jul", title: "Launch + handoff", detail: "QA, go-live, walkthrough call", owner: "Brandon", status: "upcoming" },
      { id: "lumen-6", iso: "2026-07-24", date: "24 Jul", title: "Post-launch review", detail: "First-week numbers, what's next", owner: "Amber", status: "upcoming", output: { label: "Post-launch report", state: "todo", href: REPORT } },
    ],
  },
  {
    id: "vertex",
    name: "Vertex Supplements",
    initials: "VX",
    type: "retainer",
    tier: "VIP",
    progressLabel: "Day 82 of 90",
    health: "attention",
    schedule: [
      { id: "vertex-1", iso: "2026-06-27", date: "27 Jun", title: "Day 75 renewal refresh", detail: "Built, sitting unsent 3 days from renewal", owner: "Aanchal", status: "active", output: { label: "Refresh deck", state: "draft", href: MILESTONE } },
      { id: "vertex-2", iso: "2026-06-30", date: "30 Jun", title: "Weekly roundup", detail: "What happened this week", owner: "Amber", status: "active", output: { label: "Weekly roundup", state: "todo", href: REPORT } },
      { id: "vertex-3", iso: "2026-07-02", date: "2 Jul", title: "Testing velocity report", detail: "Tests shipped vs planned, win rate", owner: "Aanchal", status: "active", output: { label: "Velocity report", state: "todo", href: REPORT } },
      { id: "vertex-4", iso: "2026-07-12", date: "12 Jul", title: "Renewal close + expansion", detail: "Renewal + VIP tier upsell", owner: "Amber", status: "upcoming", output: { label: "Renewal proposal", state: "todo", href: RENEWAL } },
    ],
  },
];

/* ── Status dot ─────────────────────────────────────────────── */

function StatusDot({ status }: { status: Status }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center justify-center size-5 rounded-full bg-success/10 ring-1 ring-success/20">
        <CheckIcon className="size-3 text-success" />
      </span>
    );
  }
  if (status === "active") {
    return <span className="block size-2.5 rounded-full bg-warning ring-4 ring-warning/15" />;
  }
  return <span className="block size-2.5 rounded-full bg-subtle" />;
}

/* Doc cell - the three-state lifecycle control + a view link.
 *   todo      → [Create]
 *   draft     → [Mark sent]  (+ view)   ← the "built but not delivered" gap
 *   delivered → Sent {date}  (+ view) */
function DocCell({
  output,
  onMarkSent,
}: {
  output: Output;
  onMarkSent: () => void;
}) {
  const view = (
    <Link
      href={output.href}
      className="inline-flex items-center justify-center size-7 rounded-lg text-subtle hover:text-foreground hover:bg-surface-hover"
      title="View doc"
    >
      <ArrowTopRightOnSquareIcon className="size-4" />
    </Link>
  );

  if (output.state === "delivered") {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-success whitespace-nowrap">
          <CheckIcon className="size-3.5" />
          Sent {output.deliveredOn}
        </span>
        {view}
      </div>
    );
  }

  if (output.state === "draft") {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onMarkSent}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-warning/10 text-warning ring-1 ring-warning/20 hover:bg-warning/20 whitespace-nowrap"
        >
          <PaperAirplaneIcon className="size-3.5" />
          Mark sent
        </button>
        {view}
      </div>
    );
  }

  return (
    <Link
      href={output.href}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-foreground text-background hover:opacity-90 whitespace-nowrap shrink-0"
    >
      <PlusIcon className="size-3.5" />
      Create
    </Link>
  );
}

const TYPE_LABEL: Record<EngagementType, string> = {
  retainer: "Retainer",
  build: "Single build",
};

/* ── Page ───────────────────────────────────────────────────── */

export default function ClientSuccessPreview() {
  const [view, setView] = useState<"home" | "detail" | "add">("home");
  const [activeId, setActiveId] = useState<string | null>(null);
  /* Session-only: ids marked sent this visit flip draft → delivered. */
  const [sent, setSent] = useState<Set<string>>(new Set());

  const active = ENGAGEMENTS.find((e) => e.id === activeId) ?? null;

  function open(id: string) {
    setActiveId(id);
    setView("detail");
  }
  function markSent(stepId: string) {
    setSent((prev) => new Set(prev).add(stepId));
  }
  /* Resolve the live doc state, applying any in-session "mark sent". */
  function resolveOutput(step: Step): Output | undefined {
    if (!step.output) return undefined;
    if (step.output.state === "draft" && sent.has(step.id)) {
      return { ...step.output, state: "delivered", deliveredOn: TODAY };
    }
    return step.output;
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-warning/10 ring-1 ring-warning/20 text-[12px] text-warning mb-6">
          <span className="size-1.5 rounded-full bg-warning" />
          Preview · mock data
        </div>

        {view === "home" && (
          <Home onOpen={open} onAdd={() => setView("add")} resolveOutput={resolveOutput} onMarkSent={markSent} />
        )}
        {view === "detail" && active && (
          <Detail engagement={active} onBack={() => setView("home")} resolveOutput={resolveOutput} onMarkSent={markSent} />
        )}
        {view === "add" && <AddEngagement onBack={() => setView("home")} />}
      </div>
    </div>
  );
}

/* ── Home / dashboard ───────────────────────────────────────── */

function Home({
  onOpen,
  onAdd,
  resolveOutput,
  onMarkSent,
}: {
  onOpen: (id: string) => void;
  onAdd: () => void;
  resolveOutput: (s: Step) => Output | undefined;
  onMarkSent: (id: string) => void;
}) {
  const comingUp = useMemo(() => {
    const rows = ENGAGEMENTS.flatMap((e) =>
      e.schedule
        .filter((s) => s.status !== "done")
        .map((s) => ({ ...s, client: e.name })),
    );
    rows.sort((a, b) => a.iso.localeCompare(b.iso));
    return rows.slice(0, 7);
  }, []);

  /* Full-book stats for the dashboard cards. dueThisWeek = anything not
   * done landing on/before 7 Jul; toSend = drafts (built, not delivered);
   * toCreate = docs that don't exist yet. */
  const stats = useMemo(() => {
    let dueThisWeek = 0,
      toSend = 0,
      toCreate = 0;
    for (const e of ENGAGEMENTS) {
      for (const s of e.schedule) {
        if (s.status === "done") continue;
        if (s.iso <= "2026-07-07") dueThisWeek++;
        const out = resolveOutput(s);
        if (out?.state === "draft") toSend++;
        if (out?.state === "todo") toCreate++;
      }
    }
    return { dueThisWeek, toSend, toCreate };
  }, [resolveOutput]);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-semibold">Client success</h1>
          <p className="text-[14px] text-muted mt-1">{ENGAGEMENTS.length} active clients</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold bg-foreground text-background hover:opacity-90"
        >
          <PlusIcon className="size-4" />
          Add engagement
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Due this week" value={stats.dueThisWeek} tone="amber" />
        <StatCard label="To send" value={stats.toSend} tone="amber" hint="built, not delivered" />
        <StatCard label="To create" value={stats.toCreate} tone="sky" />
      </div>

      {/* Coming up board */}
      <h2 className="text-[12px] uppercase tracking-[0.08em] text-subtle font-semibold mb-3 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-info" />
        Coming up · across all clients
      </h2>
      <div className="bg-background rounded-2xl ring-1 ring-border divide-y divide-border mb-10">
        {comingUp.map((r) => {
          const out = resolveOutput(r);
          return (
            <div key={r.id} className="flex items-center gap-4 px-6 py-4">
              <StatusDot status={r.status} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] text-foreground truncate">{r.title}</div>
                <div className="text-[12px] text-subtle mt-0.5">{r.client} · {r.owner}</div>
              </div>
              <span className="text-[13px] text-subtle tabular-nums shrink-0 mr-2">{r.date}</span>
              {out ? (
                <DocCell output={out} onMarkSent={() => onMarkSent(r.id)} />
              ) : (
                <span className="text-[11px] text-subtle w-[64px] text-center shrink-0">deliverable</span>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="text-[12px] uppercase tracking-[0.08em] text-subtle font-semibold mb-3 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-success" />
        Clients
      </h2>
      <div className="space-y-2.5">
        {ENGAGEMENTS.map((e) => (
          <button
            key={e.id}
            onClick={() => onOpen(e.id)}
            className="w-full text-left bg-background rounded-2xl ring-1 ring-border hover:ring-border transition-all px-6 py-5"
          >
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center size-11 rounded-xl bg-surface-raised ring-1 ring-border text-[14px] font-semibold text-foreground shrink-0">
                {e.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[17px] font-semibold truncate">{e.name}</span>
                  <span className={`size-2 rounded-full shrink-0 ${e.health === "on-track" ? "bg-success" : "bg-warning"}`} />
                </div>
                <div className="text-[13px] text-subtle mt-0.5">
                  {TYPE_LABEL[e.type]}
                  {e.tier ? ` · ${e.tier}` : ""} · {e.progressLabel}
                </div>
              </div>
              <ArrowRightIcon className="size-4 text-subtle shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "amber" | "sky";
  hint?: string;
}) {
  const toneText = tone === "amber" ? "text-warning" : "text-info";
  return (
    <div className="bg-background rounded-2xl ring-1 ring-border px-6 py-5">
      <div className="text-[12px] uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div className={`text-[32px] leading-none font-semibold tabular-nums mt-3 ${value === 0 ? "text-subtle" : toneText}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-subtle mt-2">{hint}</div>}
    </div>
  );
}

/* ── Client detail ──────────────────────────────────────────── */

function Detail({
  engagement: e,
  onBack,
  resolveOutput,
  onMarkSent,
}: {
  engagement: Engagement;
  onBack: () => void;
  resolveOutput: (s: Step) => Output | undefined;
  onMarkSent: (id: string) => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-subtle hover:text-foreground mb-5"
      >
        <ArrowLeftIcon className="size-4" />
        Dashboard
      </button>

      <div className="flex items-center gap-4 mb-6">
        <span className="inline-flex items-center justify-center size-12 rounded-xl bg-surface-raised ring-1 ring-border text-[15px] font-semibold text-foreground shrink-0">
          {e.initials}
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{e.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] text-muted">
              {TYPE_LABEL[e.type]}
              {e.tier ? ` · ${e.tier}` : ""} · {e.progressLabel}
            </span>
            {e.scopeLocked && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-success/10 text-success ring-1 ring-success/20">
                Scope locked
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-[13px] font-medium text-subtle mb-3">
        {e.type === "retainer"
          ? "The engine: what the client gets, and when"
          : "Deliverables + client-facing dates"}
      </div>

      <div className="relative">
        <div className="absolute left-[10px] top-3 bottom-3 w-px bg-border" />
        <div className="space-y-1">
          {e.schedule.map((s) => {
            const out = resolveOutput(s);
            return (
              <div key={s.id} className="relative flex gap-4 py-3">
                <div className="relative z-10 shrink-0 pt-0.5 w-5 flex justify-center">
                  <StatusDot status={s.status} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`text-[15px] font-medium ${s.status === "upcoming" ? "text-muted" : "text-foreground"}`}>
                      {s.title}
                    </span>
                    <span className="text-[13px] text-subtle tabular-nums shrink-0">{s.date}</span>
                  </div>
                  <div className="text-[13px] text-subtle mt-0.5">{s.detail}</div>
                  <div className="flex items-center justify-between gap-3 mt-1.5">
                    <span className="text-[12px] text-subtle">Owner: {s.owner}</span>
                    {out && <DocCell output={out} onMarkSent={() => onMarkSent(s.id)} />}
                  </div>
                </div>
              </div>
            );
          })}
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
        className="inline-flex items-center gap-1.5 text-[13px] text-subtle hover:text-foreground mb-5"
      >
        <ArrowLeftIcon className="size-4" />
        Cancel
      </button>

      <h1 className="text-2xl font-semibold mb-1">Add engagement</h1>
      <p className="text-[14px] text-muted mb-6">
        Sets up the success tracker. Would also spin up the delivery board.
      </p>

      <div className="space-y-5 max-w-lg">
        <Field label="Client name">
          <input
            placeholder="Acme Co"
            className="w-full h-11 px-3.5 bg-background rounded-lg ring-1 ring-border text-[14px] text-foreground placeholder:text-subtle focus:outline-none focus:ring-ring"
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
                    ? "bg-foreground text-background ring-ring"
                    : "bg-background text-muted ring-border hover:text-foreground"
                }`}
              >
                <div className="text-[14px] font-semibold">{TYPE_LABEL[t]}</div>
                <div className={`text-[12px] mt-0.5 ${type === t ? "text-background/60" : "text-subtle"}`}>
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
                <div key={tier} className="px-3 py-2.5 rounded-lg text-center text-[13px] bg-background ring-1 ring-border text-muted">
                  {tier}
                </div>
              ))}
            </div>
            <p className="text-[12px] text-subtle mt-2">
              Tier sets delivery volume on the board. The success cadence is the same for all three.
            </p>
          </Field>
        ) : (
          <Field label="Deliverables">
            <div className="space-y-2">
              {["Framing page", "Product page", "Cart"].map((d) => (
                <div key={d} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-background ring-1 ring-border">
                  <span className="text-[14px] text-foreground">{d}</span>
                  <span className="text-[12px] text-subtle">client date</span>
                </div>
              ))}
              <button className="inline-flex items-center gap-1.5 text-[13px] text-subtle hover:text-foreground mt-1">
                <PlusIcon className="size-4" />
                Add deliverable
              </button>
            </div>
          </Field>
        )}

        <Field label="Kickoff date">
          <input
            type="date"
            className="w-full h-11 px-3.5 bg-background rounded-lg ring-1 ring-border text-[14px] text-foreground focus:outline-none focus:ring-ring"
          />
        </Field>

        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold bg-foreground text-background hover:opacity-90">
          Create engagement
          <ArrowRightIcon className="size-4" />
        </button>
        <p className="text-[12px] text-subtle">
          Schedule auto-fills off the kickoff date - same template every time.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium uppercase tracking-wider text-subtle mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
