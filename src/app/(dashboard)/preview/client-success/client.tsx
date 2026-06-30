"use client";

/* ── Client Success OS · PREVIEW (v3) ──
 *
 * Isolated mock. NOT wired. Rebuilt again per feedback:
 *
 *   Home      - a real DASHBOARD, not just a client list. A "Coming up"
 *               board across ALL clients in date order so the CSM sees
 *               the whole book at a glance. Each row carries the doc
 *               action: View (already made) or Create (spin one up) -
 *               so the CSM maintains cadence without leaving the surface.
 *               Client list sits below to drill in.
 *   Client    - click in: the engagement timeline. Each step that
 *               produces a doc shows the same View / Create action.
 *   Add       - new engagement: retainer vs single build.
 *
 * The docs are the "extra mile" client-success outputs: onboarding
 * deck, weekly roundup, monthly report, day-30 review, day-75 refresh,
 * renewal, testing-velocity report. Create links point at the relevant
 * Hero Offer builder. Mock data only.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PlusIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

/* ── Model ──────────────────────────────────────────────────── */

type Status = "done" | "active" | "upcoming";
type EngagementType = "retainer" | "build";

interface Output {
  label: string;
  created: boolean;
  href: string;
}

interface Step {
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
      { iso: "2026-05-19", date: "19 May", title: "Onboarding deck", detail: "Read your brief, here's how it runs from here", owner: "Aanchal", status: "done", output: { label: "Onboarding deck", created: true, href: KICKOFF } },
      { iso: "2026-06-09", date: "9 Jun", title: "Day 30 review", detail: "What shipped, early test reads, next 30 days", owner: "Amber", status: "done", output: { label: "Day 30 deck", created: true, href: MILESTONE } },
      { iso: "2026-06-30", date: "30 Jun", title: "Weekly roundup", detail: "What happened this week, where we are", owner: "Amber", status: "active", output: { label: "Weekly roundup", created: false, href: REPORT } },
      { iso: "2026-07-04", date: "4 Jul", title: "Monthly report + call", detail: "CR + revenue deltas, wins, next month", owner: "Amber", status: "active", output: { label: "Monthly report", created: false, href: REPORT } },
      { iso: "2026-07-22", date: "22 Jul", title: "Day 75 renewal refresh", detail: "Forward roadmap deck to anchor the renewal", owner: "Aanchal", status: "upcoming", output: { label: "Refresh deck", created: false, href: MILESTONE } },
      { iso: "2026-08-06", date: "6 Aug", title: "Day 90 renewal close", detail: "Renewal conversation, move to rolling", owner: "Amber", status: "upcoming", output: { label: "Renewal proposal", created: false, href: RENEWAL } },
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
      { iso: "2026-06-23", date: "23 Jun", title: "Onboarding deck", detail: "Scope confirmed, expectations aligned", owner: "Aanchal", status: "done", output: { label: "Onboarding deck", created: true, href: KICKOFF } },
      { iso: "2026-06-30", date: "30 Jun", title: "Weekly roundup", detail: "Build progress, what's next", owner: "Amber", status: "active", output: { label: "Weekly roundup", created: false, href: REPORT } },
      { iso: "2026-07-03", date: "3 Jul", title: "Framing page · design", detail: "First page to client for review", owner: "Barnaby", status: "done" },
      { iso: "2026-07-08", date: "8 Jul", title: "Product page · design", detail: "Conversion-led PDP to client", owner: "Barnaby", status: "active" },
      { iso: "2026-07-17", date: "17 Jul", title: "Launch + handoff", detail: "QA, go-live, walkthrough call", owner: "Brandon", status: "upcoming" },
      { iso: "2026-07-24", date: "24 Jul", title: "Post-launch review", detail: "First-week numbers, what's next", owner: "Amber", status: "upcoming", output: { label: "Post-launch report", created: false, href: REPORT } },
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
      { iso: "2026-06-27", date: "27 Jun", title: "Day 75 renewal refresh", detail: "Forward roadmap deck - needs sending", owner: "Aanchal", status: "active", output: { label: "Refresh deck", created: false, href: MILESTONE } },
      { iso: "2026-06-30", date: "30 Jun", title: "Weekly roundup", detail: "What happened this week", owner: "Amber", status: "active", output: { label: "Weekly roundup", created: false, href: REPORT } },
      { iso: "2026-07-02", date: "2 Jul", title: "Testing velocity report", detail: "Tests shipped vs planned, win rate", owner: "Aanchal", status: "active", output: { label: "Velocity report", created: false, href: REPORT } },
      { iso: "2026-07-12", date: "12 Jul", title: "Renewal close + expansion", detail: "Renewal + VIP tier upsell", owner: "Amber", status: "upcoming", output: { label: "Renewal proposal", created: false, href: RENEWAL } },
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
    return <span className="block size-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/15" />;
  }
  return <span className="block size-2.5 rounded-full bg-[#3A3A3A]" />;
}

/* Doc action: View if it exists, Create if it doesn't. The one thing
 * the CSM clicks to keep cadence without leaving the surface. */
function DocAction({ output }: { output: Output }) {
  if (output.created) {
    return (
      <Link
        href={output.href}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-white/[0.04] text-cyan-200 ring-1 ring-cyan-500/20 hover:bg-white/[0.08] whitespace-nowrap"
      >
        <ArrowTopRightOnSquareIcon className="size-3.5" />
        View
      </Link>
    );
  }
  return (
    <Link
      href={output.href}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-white text-[#0C0C0C] hover:bg-[#E5E5EA] whitespace-nowrap"
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
  const active = ENGAGEMENTS.find((e) => e.id === activeId) ?? null;

  function open(id: string) {
    setActiveId(id);
    setView("detail");
  }

  return (
    <div className="min-h-full bg-[#080808] text-[#E5E5EA]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 ring-1 ring-amber-500/30 text-[12px] text-amber-200 mb-6">
          <span className="size-1.5 rounded-full bg-amber-400" />
          Preview · mock data
        </div>

        {view === "home" && <Home onOpen={open} onAdd={() => setView("add")} />}
        {view === "detail" && active && (
          <Detail engagement={active} onBack={() => setView("home")} />
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
}: {
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  /* "Coming up" across every client - the at-a-glance whole-book view.
   * Active + upcoming steps, date-ordered, capped so it stays scannable. */
  const comingUp = useMemo(() => {
    const rows = ENGAGEMENTS.flatMap((e) =>
      e.schedule
        .filter((s) => s.status !== "done")
        .map((s) => ({ ...s, client: e.name, clientId: e.id })),
    );
    rows.sort((a, b) => a.iso.localeCompare(b.iso));
    return rows.slice(0, 7);
  }, []);

  const needsCreating = comingUp.filter((r) => r.output && !r.output.created).length;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Client success</h1>
          <p className="text-[14px] text-[#9CA3AF] mt-1">
            {ENGAGEMENTS.length} clients · {needsCreating} docs to create
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

      {/* Coming up board */}
      <div className="text-[13px] font-medium text-[#71757D] mb-3">Coming up</div>
      <div className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.05] divide-y divide-white/[0.05] mb-8">
        {comingUp.map((r, i) => (
          <div key={i} className="flex items-center gap-3.5 px-5 py-3.5">
            <StatusDot status={r.status} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] text-[#E5E5EA] truncate">{r.title}</div>
              <div className="text-[12px] text-[#71757D] mt-0.5">
                {r.client} · {r.owner}
              </div>
            </div>
            <span className="text-[13px] text-[#71757D] tabular-nums shrink-0">{r.date}</span>
            {r.output ? (
              <DocAction output={r.output} />
            ) : (
              <span className="text-[11px] text-[#5A5C61] w-[58px] text-center shrink-0">
                deliverable
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Client list */}
      <div className="text-[13px] font-medium text-[#71757D] mb-3">Clients</div>
      <div className="space-y-2">
        {ENGAGEMENTS.map((e) => (
          <button
            key={e.id}
            onClick={() => onOpen(e.id)}
            className="w-full text-left bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.05] hover:ring-white/[0.14] transition-all px-5 py-4"
          >
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-sky-500/25 to-blue-600/25 ring-1 ring-sky-500/25 text-[13px] font-semibold text-sky-100 shrink-0">
                {e.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[16px] font-semibold truncate">{e.name}</span>
                  <span
                    className={`size-2 rounded-full shrink-0 ${
                      e.health === "on-track" ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                </div>
                <div className="text-[12px] text-[#71757D] mt-0.5">
                  {TYPE_LABEL[e.type]}
                  {e.tier ? ` · ${e.tier}` : ""} · {e.progressLabel}
                </div>
              </div>
              <ArrowRightIcon className="size-4 text-[#5A5C61] shrink-0" />
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
        Dashboard
      </button>

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

      <div className="text-[13px] font-medium text-[#71757D] mb-3">
        {e.type === "retainer"
          ? "The engine: what the client gets, and when"
          : "Deliverables + client-facing dates"}
      </div>

      <div className="relative">
        <div className="absolute left-[10px] top-3 bottom-3 w-px bg-white/[0.06]" />
        <div className="space-y-1">
          {e.schedule.map((s, i) => (
            <div key={i} className="relative flex gap-4 py-3">
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
                  <span className="text-[13px] text-[#71757D] tabular-nums shrink-0">{s.date}</span>
                </div>
                <div className="text-[13px] text-[#71757D] mt-0.5">{s.detail}</div>
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <span className="text-[12px] text-[#5A5C61]">Owner: {s.owner}</span>
                  {s.output && <DocAction output={s.output} />}
                </div>
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
