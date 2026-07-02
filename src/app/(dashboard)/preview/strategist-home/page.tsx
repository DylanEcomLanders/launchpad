"use client";

/* PREVIEW PAGE - strategist's own dashboard / workflow view.
 *
 * Different from /preview/strategist-deliverables (which showed how
 * existing pod/client surfaces change). This one is the strategist's
 * home, designed around their daily and weekly flow, not the team's
 * view of them.
 *
 * Workflow concepts shown:
 *   - Today's attention: what's blocking the strategist's day right now
 *     (signoff requests from clients, design-ready handoffs).
 *   - Queue (Kanban): strategy slices flowing through Drafting → In
 *     review → Approved → Handed to design. Explicit state transitions
 *     so the strategist always knows what to do next.
 *   - My engagements: cross-pod client view (8 clients across 3 pods),
 *     with health indicators (last reviewed, next deliverable, status).
 *   - This week: planner strip showing commitments by day.
 *   - Decisions log: recent strategic calls captured for the rest of
 *     the team.
 *
 * Mock data only. Not wired up. The state transition buttons don't
 * actually transition state.
 */

import { useState } from "react";
import {
  ArrowRightIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  HandRaisedIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

// ─── Types ───────────────────────────────────────────────────────────

type SliceState = "drafting" | "in_review" | "approved" | "handed_off";

interface QueueItem {
  id: string;
  client: string;
  deliverable: string;
  state: SliceState;
  age_days: number;
  waiting_on?: string;
  next_action: string;
}

interface EngagementRow {
  id: string;
  client: string;
  pod: string;
  retainer: string;
  last_reviewed: string;
  next_deliverable: string;
  health: "good" | "watch" | "risk";
  reviews_due?: string;
}

interface Attention {
  id: string;
  kind: "signoff_received" | "handoff_complete" | "review_due" | "blocked";
  client: string;
  title: string;
  detail: string;
  age: string;
  action_label: string;
}

interface Decision {
  id: string;
  client: string;
  title: string;
  context: string;
  decided_at: string;
  shared_with: string[];
}

// ─── Mock data ───────────────────────────────────────────────────────

const STRATEGIST = { name: "Maya Lin", today: "Monday 25 May" };

const ATTENTION: Attention[] = [
  {
    id: "a1",
    kind: "signoff_received",
    client: "Hydrant",
    title: "Dan approved homepage positioning shift",
    detail: "Approved 18 mins ago. Hand to Sarah to start design.",
    age: "18m",
    action_label: "Hand to design",
  },
  {
    id: "a2",
    kind: "review_due",
    client: "Loop Earplugs",
    title: "Monthly strategic review overdue",
    detail: "Last review 34 days ago. April monthly never went out.",
    age: "4d overdue",
    action_label: "Draft review",
  },
  {
    id: "a3",
    kind: "blocked",
    client: "Three Spirit",
    title: "Quiz strategy blocked on analytics",
    detail: "Waiting for Mira to confirm baseline CVR before sign-off.",
    age: "2d",
    action_label: "Nudge Mira",
  },
];

const QUEUE: QueueItem[] = [
  // drafting
  {
    id: "q1",
    client: "Hydrant",
    deliverable: "Welcome email sequence, strategy",
    state: "drafting",
    age_days: 2,
    next_action: "Finish angle B, ship by Wed",
  },
  {
    id: "q2",
    client: "Loop Earplugs",
    deliverable: "Bundle PDP angles",
    state: "drafting",
    age_days: 1,
    next_action: "3 angles drafted, pick 2 to test",
  },
  // in review
  {
    id: "q3",
    client: "Three Spirit",
    deliverable: "Quiz funnel, strategy",
    state: "in_review",
    age_days: 2,
    waiting_on: "Mira (analytics)",
    next_action: "Awaiting baseline CVR confirmation",
  },
  {
    id: "q4",
    client: "Beam",
    deliverable: "April monthly review",
    state: "in_review",
    age_days: 1,
    waiting_on: "Dan (CRO lead)",
    next_action: "Sent for signoff Fri",
  },
  // approved
  {
    id: "q5",
    client: "Hydrant",
    deliverable: "Homepage Q3 refresh",
    state: "approved",
    age_days: 0,
    next_action: "Ready to hand to Sarah",
  },
  // handed off
  {
    id: "q6",
    client: "Hydrant",
    deliverable: "PDP test, whitening strips",
    state: "handed_off",
    age_days: 3,
    next_action: "Sarah has it, design due Fri",
  },
  {
    id: "q7",
    client: "Pact Coffee",
    deliverable: "Subscription upsell, strategy",
    state: "handed_off",
    age_days: 7,
    next_action: "In dev, ships next Thu",
  },
];

const ENGAGEMENTS: EngagementRow[] = [
  {
    id: "e1",
    client: "Hydrant",
    pod: "Pod 2",
    retainer: "8k",
    last_reviewed: "8 days ago",
    next_deliverable: "Welcome email · ships Thu 6 Jun",
    health: "good",
  },
  {
    id: "e2",
    client: "Loop Earplugs",
    pod: "Pod 2",
    retainer: "8k",
    last_reviewed: "34 days ago",
    next_deliverable: "Bundle PDP test · ships Thu 13 Jun",
    health: "risk",
    reviews_due: "April monthly overdue",
  },
  {
    id: "e3",
    client: "Three Spirit",
    pod: "Pod 1",
    retainer: "12k",
    last_reviewed: "12 days ago",
    next_deliverable: "Quiz funnel · ships Thu 20 Jun",
    health: "watch",
    reviews_due: "Blocked on analytics",
  },
  {
    id: "e4",
    client: "Pact Coffee",
    pod: "Pod 1",
    retainer: "8k",
    last_reviewed: "5 days ago",
    next_deliverable: "Subscription upsell · ships Thu 30 May",
    health: "good",
  },
  {
    id: "e5",
    client: "Beam",
    pod: "Pod 3",
    retainer: "8k",
    last_reviewed: "9 days ago",
    next_deliverable: "Sleep PDP refresh · ships Thu 13 Jun",
    health: "good",
  },
  {
    id: "e6",
    client: "Trip CBD",
    pod: "Pod 3",
    retainer: "12k",
    last_reviewed: "21 days ago",
    next_deliverable: "Bundle landing page · ships Thu 27 Jun",
    health: "watch",
    reviews_due: "Review due this week",
  },
];

const WEEK = [
  {
    day: "Mon",
    date: "25",
    is_today: true,
    items: [
      "Hand Hydrant homepage to Sarah (design start)",
      "Draft Loop April monthly review",
      "Nudge Mira re: Three Spirit baseline",
    ],
  },
  {
    day: "Tue",
    date: "26",
    is_today: false,
    items: ["Loop bundle PDP angles, ship to Dan", "Trip CBD review kickoff"],
  },
  {
    day: "Wed",
    date: "27",
    is_today: false,
    items: [
      "Hydrant welcome email strategy ships",
      "Pod 1 weekly strategic review (12:00)",
    ],
  },
  {
    day: "Thu",
    date: "28",
    is_today: false,
    items: ["Pod 2 weekly strategic review (10:00)", "Beam monthly draft"],
  },
  {
    day: "Fri",
    date: "29",
    is_today: false,
    items: ["Pod 3 weekly strategic review (14:00)", "Catch-up + buffer"],
  },
];

const DECISIONS: Decision[] = [
  {
    id: "d1",
    client: "Hydrant",
    title: "Pivoting homepage positioning from ingredients to results",
    context:
      "VOC review showed customers compare on outcome, not formula. Repositioning hero around 'cleared skin in 14 days' frame.",
    decided_at: "Today, 09:12",
    shared_with: ["Sarah Chen", "Dan Forsyth", "Pod 2 Slack"],
  },
  {
    id: "d2",
    client: "Loop Earplugs",
    title: "Killing the 'gift' angle for bundle PDPs",
    context:
      "Two month-long tests, no lift. Reallocating to lifestyle-segment angles (sleep / work / live music).",
    decided_at: "Fri 22 May",
    shared_with: ["Tom Park", "Dan Forsyth"],
  },
  {
    id: "d3",
    client: "Pact Coffee",
    title: "Subscription upsell: testing free-shipping floor vs % off",
    context:
      "Hypothesis: free-shipping reads as concrete value, % off reads as discounted brand. Two-arm test on PDP.",
    decided_at: "Thu 21 May",
    shared_with: ["Ben Adams", "Lily Rao", "Pod 1 Slack"],
  },
];

// ─── Visual helpers ──────────────────────────────────────────────────

const STATE_LABEL: Record<SliceState, string> = {
  drafting: "Drafting",
  in_review: "In review",
  approved: "Approved",
  handed_off: "Handed off",
};

const STATE_HEADER_CLASS: Record<SliceState, string> = {
  drafting: "border-violet-200 bg-violet-50 text-violet-800",
  in_review: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  handed_off: "border-blue-200 bg-blue-50 text-blue-800",
};

const STATE_NEXT_LABEL: Record<SliceState, string | null> = {
  drafting: "Send for review",
  in_review: "Mark approved",
  approved: "Hand to design",
  handed_off: null,
};

const HEALTH_COLOR: Record<EngagementRow["health"], string> = {
  good: "bg-emerald-500",
  watch: "bg-amber-500",
  risk: "bg-rose-500",
};

const HEALTH_RING: Record<EngagementRow["health"], string> = {
  good: "border-emerald-200 bg-emerald-50",
  watch: "border-amber-200 bg-amber-50",
  risk: "border-rose-200 bg-rose-50",
};

const ATTENTION_ICON: Record<Attention["kind"], React.ReactNode> = {
  signoff_received: <CheckCircleIcon className="h-5 w-5 text-emerald-700" />,
  handoff_complete: <PaperAirplaneIcon className="h-5 w-5 text-blue-700" />,
  review_due: <ClipboardDocumentCheckIcon className="h-5 w-5 text-amber-700" />,
  blocked: <ExclamationTriangleIcon className="h-5 w-5 text-rose-700" />,
};

const ATTENTION_RING: Record<Attention["kind"], string> = {
  signoff_received: "border-emerald-200 bg-emerald-50/50",
  handoff_complete: "border-blue-200 bg-blue-50/50",
  review_due: "border-amber-200 bg-amber-50/50",
  blocked: "border-rose-200 bg-rose-50/50",
};

function initials(name: string) {
  const parts = name.split(" ");
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

// ─── Page ────────────────────────────────────────────────────────────

export default function StrategistHomePreview() {
  const grouped: Record<SliceState, QueueItem[]> = {
    drafting: QUEUE.filter((q) => q.state === "drafting"),
    in_review: QUEUE.filter((q) => q.state === "in_review"),
    approved: QUEUE.filter((q) => q.state === "approved"),
    handed_off: QUEUE.filter((q) => q.state === "handed_off"),
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* ─── Personal header ─────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-violet-100 text-base font-semibold text-violet-700 ring-2 ring-violet-300">
            {initials(STRATEGIST.name).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-medium text-foreground">
              Good morning, {STRATEGIST.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-subtle">
              {STRATEGIST.today} · 6 engagements across 3 pods · {QUEUE.length} strategy slices in flight
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
          <SparklesIcon className="h-3.5 w-3.5" />
          Preview, mock data, not wired up
        </div>
      </div>

      {/* ─── Section A: Today's attention ────────────────────────── */}
      <section className="mb-8">
        <SectionHeading
          eyebrow="Today, needs you"
          title="3 things waiting on you right now"
          sub="Push-style queue. These hit your Slack and surface here. Clear them, then move to your queue."
        />
        <div className="grid gap-3 md:grid-cols-3">
          {ATTENTION.map((a) => (
            <AttentionCard key={a.id} attention={a} />
          ))}
        </div>
      </section>

      {/* ─── Section B: Queue Kanban with transitions ────────────── */}
      <section className="mb-8">
        <SectionHeading
          eyebrow="My queue"
          title="Strategy slices, by state"
          sub="The state machine for strategic work. Each card moves left to right: Drafting (you) → In review (signoff) → Approved → Handed off (design takes over). Transition buttons show the next action available."
        />
        <div className="grid gap-3 md:grid-cols-4">
          {(["drafting", "in_review", "approved", "handed_off"] as SliceState[]).map(
            (state) => (
              <QueueColumn
                key={state}
                state={state}
                items={grouped[state]}
              />
            ),
          )}
        </div>
      </section>

      {/* ─── Section C: My engagements ───────────────────────────── */}
      <section className="mb-8">
        <SectionHeading
          eyebrow="My engagements"
          title="Cross-pod client view"
          sub="Pod-agnostic. Sorted by health. Risk first, then watch, then good. This is the strategist's client lens, distinct from the pod lens."
        />
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
          <table className="min-w-full text-sm">
            <thead className="bg-background text-[10px] font-semibold uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-4 py-2.5 text-left">Client</th>
                <th className="px-4 py-2.5 text-left">Pod</th>
                <th className="px-4 py-2.5 text-left">Retainer</th>
                <th className="px-4 py-2.5 text-left">Last reviewed</th>
                <th className="px-4 py-2.5 text-left">Next deliverable</th>
                <th className="px-4 py-2.5 text-left">Health</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...ENGAGEMENTS]
                .sort((a, b) => {
                  const order = { risk: 0, watch: 1, good: 2 };
                  return order[a.health] - order[b.health];
                })
                .map((e) => (
                  <EngagementRowItem key={e.id} engagement={e} />
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Section D: This week ─────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeading
          eyebrow="This week"
          title="What you committed to"
          sub="Planner. Day-by-day commitments derived from your queue plus calendar holds for pod reviews."
        />
        <div className="grid gap-3 md:grid-cols-5">
          {WEEK.map((day) => (
            <WeekColumn key={day.day} day={day} />
          ))}
        </div>
      </section>

      {/* ─── Section E: Decisions log ────────────────────────────── */}
      <section className="mb-8">
        <SectionHeading
          eyebrow="Decisions log"
          title="What you've decided recently"
          sub="The strategic record. When you make a call that needs to propagate, capture it here. Shared with the named recipients automatically."
        />
        <div className="space-y-3">
          {DECISIONS.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-muted bg-surface px-4 py-3 text-sm font-medium text-border hover:border-white hover:text-foreground">
            <SparklesIcon className="h-4 w-4" />
            Capture a decision
          </button>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-10 rounded-lg border border-border bg-background p-4 text-xs text-subtle">
        <p className="font-semibold uppercase tracking-wider text-foreground">
          Workflow concepts this preview demonstrates
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            <span className="font-medium text-foreground">Push vs pull.</span> Today section is push (system surfaces what needs you). Queue + engagements are pull (you go looking).
          </li>
          <li>
            <span className="font-medium text-foreground">State machine.</span> Strategy slice transitions: Drafting → In review → Approved → Handed off. Each transition is an explicit action with an explicit owner of the next step.
          </li>
          <li>
            <span className="font-medium text-foreground">Cross-pod lens.</span> Engagements table is sorted by client health, not by pod. Pod is metadata, not the primary lens.
          </li>
          <li>
            <span className="font-medium text-foreground">Review cadence.</span> Engagements with overdue reviews surface as risk. This is what's missing today, reviews fall off the radar with nothing tracking them.
          </li>
          <li>
            <span className="font-medium text-foreground">Decision log.</span> Strategic calls captured at the moment of decision and broadcast to named recipients, instead of getting lost in DMs.
          </li>
        </ul>
        <p className="mt-3">
          What this preview does NOT yet model: capacity planning, intake flow for new clients, monthly review cadence triggers, brief-creation workflow, handoff handshake on the receiving side.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-3xl text-[13px] text-subtle">{sub}</p>
    </div>
  );
}

function AttentionCard({ attention }: { attention: Attention }) {
  return (
    <div
      className={`rounded-xl border p-3.5 shadow-[var(--shadow-soft)] ${ATTENTION_RING[attention.kind]}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="shrink-0">{ATTENTION_ICON[attention.kind]}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-border">
              {attention.client}
            </span>
            <span className="text-[10px] text-subtle">{attention.age}</span>
          </div>
          <div className="mt-1 text-[13px] font-semibold leading-snug text-foreground">
            {attention.title}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-border">
            {attention.detail}
          </p>
        </div>
      </div>
      <button className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-foreground">
        {attention.action_label}
        <ArrowRightIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

function QueueColumn({ state, items }: { state: SliceState; items: QueueItem[] }) {
  const nextLabel = STATE_NEXT_LABEL[state];
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div
        className={`mb-2.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATE_HEADER_CLASS[state]}`}
      >
        {STATE_LABEL[state]}
        <span className="rounded bg-surface/60 px-1 text-[10px]">
          {items.length}
        </span>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-2 text-center text-[10px] italic text-subtle">
            Nothing here
          </div>
        )}
        {items.map((it) => (
          <div
            key={it.id}
            className="rounded-md border border-border bg-surface p-2.5 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-border">
                {it.client}
              </span>
              <span className="text-[10px] text-subtle">{it.age_days}d</span>
            </div>
            <div className="mt-1 text-[12px] font-medium leading-snug text-foreground">
              {it.deliverable}
            </div>
            {it.waiting_on && (
              <div className="mt-1 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                <HandRaisedIcon className="h-3 w-3" />
                Waiting on {it.waiting_on}
              </div>
            )}
            <p className="mt-1.5 text-[11px] leading-snug text-subtle">
              {it.next_action}
            </p>
            {nextLabel && (
              <button className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded border border-border bg-surface px-2 py-1 text-[10px] font-medium text-foreground hover:border-white">
                {nextLabel}
                <ChevronRightIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EngagementRowItem({ engagement }: { engagement: EngagementRow }) {
  return (
    <tr className="hover:bg-background">
      <td className="px-4 py-2.5">
        <span className="font-medium text-foreground">{engagement.client}</span>
      </td>
      <td className="px-4 py-2.5 text-[12px] text-subtle">
        {engagement.pod}
      </td>
      <td className="px-4 py-2.5 text-[12px] text-subtle">
        {engagement.retainer}
      </td>
      <td className="px-4 py-2.5 text-[12px] text-subtle">
        {engagement.last_reviewed}
      </td>
      <td className="px-4 py-2.5 text-[12px] text-border">
        {engagement.next_deliverable}
      </td>
      <td className="px-4 py-2.5">
        <div
          className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${HEALTH_RING[engagement.health]}`}
        >
          <span className={`h-2 w-2 rounded-full ${HEALTH_COLOR[engagement.health]}`} />
          {engagement.health === "good" && "On track"}
          {engagement.health === "watch" && (engagement.reviews_due ?? "Watch")}
          {engagement.health === "risk" && (engagement.reviews_due ?? "At risk")}
        </div>
      </td>
      <td className="px-4 py-2.5 text-right">
        <button className="rounded p-1 text-subtle hover:bg-surface-raised hover:text-foreground">
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function WeekColumn({ day }: { day: (typeof WEEK)[number] }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        day.is_today
          ? "border-violet-300 bg-violet-50/40 shadow-[var(--shadow-soft)]"
          : "border-border bg-surface"
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            day.is_today ? "text-violet-700" : "text-subtle"
          }`}
        >
          {day.day}
          {day.is_today && " · Today"}
        </span>
        <span className="text-sm font-semibold text-foreground">{day.date}</span>
      </div>
      <ul className="space-y-1.5">
        {day.items.map((item, i) => (
          <li
            key={i}
            className="rounded-md border border-border bg-surface p-2 text-[11px] leading-snug text-border"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DecisionCard({ decision }: { decision: Decision }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">
              {decision.client}
            </span>
            <span className="text-[10px] text-subtle">
              · {decision.decided_at}
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {decision.title}
          </div>
          <p className="mt-1 text-[12px] leading-snug text-border">
            {decision.context}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
        <PaperAirplaneIcon className="h-3.5 w-3.5 text-subtle" />
        <span className="text-[11px] text-subtle">Shared with</span>
        <div className="flex flex-wrap gap-1">
          {decision.shared_with.map((s) => (
            <span
              key={s}
              className="inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-border"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
