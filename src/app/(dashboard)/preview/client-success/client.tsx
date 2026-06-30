"use client";

/* ── Client Success OS · PREVIEW ──
 *
 * Isolated mock preview. NOT wired to real data. Lives at
 * /preview/client-success so Dylan can click through the concept
 * before any real build. Two engines:
 *
 *   1. Account Playbook  - the same touchpoint template instantiated
 *      per client, dated off their start date. Consistency engine:
 *      every client gets the same cadence regardless of tier.
 *   2. Commitments board - owner + SLA on every non-deliverable
 *      promise (the "client asked on a call and it evaporated" fix).
 *
 * Plus a cross-client "Ops review" roll-up: one screen, what's due,
 * who owns it, what's slipping. Mirrors the kanban aesthetic so it
 * reads as a sibling surface (would actually live inside Retention).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChartPieIcon,
  FlagIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

/* ── Mock model ─────────────────────────────────────────────── */

type Status = "done" | "due" | "overdue" | "upcoming";
type Role = "PM" | "Strategist" | "CSM" | "Pod Lead" | "Design Lead";

interface Owner {
  initials: string;
  name: string;
  role: Role;
}

interface Touchpoint {
  name: string;
  when: string;
  owner: Owner;
  status: Status;
  label: string;
  /* Which Hero Offer deck this touchpoint produces, if any. */
  deck?: { label: string; href: string };
}

interface Commitment {
  text: string;
  owner: Owner;
  sla: string;
  status: Status;
  label: string;
  toTicket?: boolean;
}

interface Client {
  id: string;
  name: string;
  initials: string;
  tier: "Entry" | "Core" | "VIP";
  cycleDay: number;
  cycleLength: number;
  playbook: Touchpoint[];
  commitments: Commitment[];
}

const OWNERS: Record<string, Owner> = {
  brandon: { initials: "BR", name: "Brandon", role: "PM" },
  aanchal: { initials: "AA", name: "Aanchal", role: "Strategist" },
  amber: { initials: "AM", name: "Amber", role: "CSM" },
  barnaby: { initials: "BB", name: "Barnaby", role: "Design Lead" },
  archie: { initials: "AR", name: "Archie", role: "Pod Lead" },
};

/* The canonical template - identical shape for every client. Only the
 * dates + statuses differ per client (computed off cycle day). Tier
 * never removes a touchpoint; it only changes delivery volume on the
 * kanban side. */
function buildPlaybook(
  statuses: Record<string, { when: string; status: Status; label: string }>,
): Touchpoint[] {
  return [
    { name: "Weekly update", owner: OWNERS.brandon, ...statuses.weekly },
    { name: "Day 30 test review", owner: OWNERS.aanchal, ...statuses.day30, deck: { label: "Milestone Deck", href: "/hero-offer/retention/milestone-deck" } },
    { name: "Monthly report + review call", owner: OWNERS.amber, ...statuses.monthly, deck: { label: "Monthly Report Deck", href: "/hero-offer/retention/monthly-report" } },
    { name: "Day 75 renewal refresh deck", owner: OWNERS.aanchal, ...statuses.day75, deck: { label: "Milestone Deck", href: "/hero-offer/retention/milestone-deck" } },
    { name: "Day 90 renewal close", owner: OWNERS.amber, ...statuses.day90, deck: { label: "Renewal Proposal", href: "/tools/proposals" } },
    { name: "Upsell pitch · expansion", owner: OWNERS.amber, ...statuses.upsell, deck: { label: "Pitch Deck", href: "/hero-offer/acquisition/pitch-deck" } },
    { name: "QBR deck + call", owner: OWNERS.aanchal, ...statuses.qbr, deck: { label: "Monthly Report Deck", href: "/hero-offer/retention/monthly-report" } },
  ];
}

const CLIENTS: Client[] = [
  {
    id: "acme",
    name: "Acme Co",
    initials: "AC",
    tier: "Core",
    cycleDay: 47,
    cycleLength: 90,
    playbook: buildPlaybook({
      weekly: { when: "every Mon", status: "done", label: "sent Mon" },
      day30: { when: "9 Jun", status: "done", label: "done" },
      monthly: { when: "4 Jul", status: "due", label: "3 days" },
      day75: { when: "22 Jul", status: "upcoming", label: "in 28d" },
      day90: { when: "6 Aug", status: "upcoming", label: "in 43d" },
      upsell: { when: "with renewal", status: "upcoming", label: "queued" },
      qbr: { when: "30 Sep", status: "upcoming", label: "in 98d" },
    }),
    commitments: [
      { text: "Reduce PDP hero height on mobile", owner: OWNERS.barnaby, sla: "48h", status: "due", label: "18h left", toTicket: true },
      { text: "Send revised pricing-table copy", owner: OWNERS.aanchal, sla: "24h", status: "done", label: "done" },
      { text: "Confirm Klaviyo flow scope", owner: OWNERS.amber, sla: "24h", status: "overdue", label: "6h over" },
    ],
  },
  {
    id: "lumen",
    name: "Lumen Skincare",
    initials: "LU",
    tier: "Entry",
    cycleDay: 12,
    cycleLength: 90,
    playbook: buildPlaybook({
      weekly: { when: "every Mon", status: "done", label: "sent Mon" },
      day30: { when: "18 Jul", status: "upcoming", label: "in 18d" },
      monthly: { when: "1 Aug", status: "upcoming", label: "in 32d" },
      day75: { when: "29 Aug", status: "upcoming", label: "in 60d" },
      day90: { when: "13 Sep", status: "upcoming", label: "in 75d" },
      upsell: { when: "with renewal", status: "upcoming", label: "queued" },
      qbr: { when: "13 Sep", status: "upcoming", label: "in 75d" },
    }),
    commitments: [
      { text: "Approve new homepage hero direction", owner: OWNERS.amber, sla: "48h", status: "due", label: "31h left" },
    ],
  },
  {
    id: "vertex",
    name: "Vertex Supplements",
    initials: "VX",
    tier: "VIP",
    cycleDay: 82,
    cycleLength: 90,
    playbook: buildPlaybook({
      weekly: { when: "every Mon", status: "done", label: "sent Mon" },
      day30: { when: "14 May", status: "done", label: "done" },
      monthly: { when: "13 Jun", status: "done", label: "done" },
      day75: { when: "27 Jun", status: "overdue", label: "3d over" },
      day90: { when: "12 Jul", status: "due", label: "in 12d" },
      upsell: { when: "with renewal", status: "due", label: "now" },
      qbr: { when: "12 Jul", status: "due", label: "in 12d" },
    }),
    commitments: [
      { text: "Build VIP-tier expansion proposal", owner: OWNERS.amber, sla: "72h", status: "due", label: "40h left", toTicket: false },
      { text: "Pull 90-day CR + revenue deltas", owner: OWNERS.aanchal, sla: "48h", status: "done", label: "done" },
    ],
  },
];

/* ── Status tokens ──────────────────────────────────────────── */

const STATUS_META: Record<
  Status,
  { tint: string; text: string; ring: string; Icon: typeof CheckCircleIcon }
> = {
  done: { tint: "bg-emerald-500/10", text: "text-emerald-300", ring: "ring-emerald-500/30", Icon: CheckCircleIcon },
  due: { tint: "bg-amber-500/10", text: "text-amber-300", ring: "ring-amber-500/30", Icon: ClockIcon },
  overdue: { tint: "bg-rose-500/10", text: "text-rose-300", ring: "ring-rose-500/30", Icon: ExclamationTriangleIcon },
  upcoming: { tint: "bg-white/[0.03]", text: "text-[#71757D]", ring: "ring-white/[0.06]", Icon: ClockIcon },
};

function StatusPill({ status, label }: { status: Status; label: string }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${m.tint} ${m.text} ring-1 ${m.ring} whitespace-nowrap`}>
      <m.Icon className="size-3" />
      {label}
    </span>
  );
}

function OwnerChip({ owner }: { owner: Owner }) {
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <span className="inline-flex items-center justify-center size-[22px] rounded-full bg-gradient-to-br from-sky-500/30 to-blue-600/30 ring-1 ring-sky-500/30 text-[10px] font-semibold text-sky-200">
        {owner.initials}
      </span>
      <span className="text-[11px] text-[#71757D]">{owner.role}</span>
    </span>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function ClientSuccessPreview() {
  const [activeId, setActiveId] = useState(CLIENTS[0].id);
  const active = CLIENTS.find((c) => c.id === activeId)!;

  /* Cross-client roll-up (the "Weekly Ops Review" view). */
  const rollup = useMemo(() => {
    let due = 0,
      overdue = 0,
      commitmentsOpen = 0;
    for (const c of CLIENTS) {
      for (const t of c.playbook) {
        if (t.status === "due") due++;
        if (t.status === "overdue") overdue++;
      }
      for (const m of c.commitments) {
        if (m.status === "due" || m.status === "overdue") commitmentsOpen++;
      }
    }
    return { due, overdue, commitmentsOpen };
  }, []);

  /* Everything due / overdue across every client, flattened for the
   * top roll-up so leadership sees the whole book at a glance. */
  const attention = useMemo(() => {
    const rows: { client: string; item: string; owner: Owner; status: Status; label: string; kind: "touchpoint" | "commitment" }[] = [];
    for (const c of CLIENTS) {
      for (const t of c.playbook) {
        if (t.status === "due" || t.status === "overdue") {
          rows.push({ client: c.name, item: t.name, owner: t.owner, status: t.status, label: t.label, kind: "touchpoint" });
        }
      }
      for (const m of c.commitments) {
        if (m.status === "due" || m.status === "overdue") {
          rows.push({ client: c.name, item: m.text, owner: m.owner, status: m.status, label: m.label, kind: "commitment" });
        }
      }
    }
    const order: Record<Status, number> = { overdue: 0, due: 1, done: 2, upcoming: 3 };
    return rows.sort((a, b) => order[a.status] - order[b.status]);
  }, []);

  return (
    <div className="min-h-full bg-[#080808] text-[#E5E5EA]">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 ring-1 ring-amber-500/30 text-[11px] text-amber-200 mb-3">
            <span className="size-1.5 rounded-full bg-amber-400" />
            Preview · mock data · would live inside Retention
          </div>
          <h1 className="text-2xl font-semibold">
            <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              Client Success OS
            </span>
          </h1>
          <p className="text-sm text-[#71757D] mt-1 max-w-2xl">
            The same playbook runs for every client. Tier changes delivery volume, not the cadence. Every touchpoint is dated + owned; every off-call promise gets an owner and an SLA.
          </p>
        </div>

        {/* Cross-client roll-up */}
        <section>
          <h2 className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-gradient-to-br from-sky-500 to-blue-600" />
            Weekly ops review · across all clients
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <RollupStat label="Due this week" value={rollup.due} tone="amber" />
            <RollupStat label="Overdue" value={rollup.overdue} tone="rose" />
            <RollupStat label="Open commitments" value={rollup.commitmentsOpen} tone="sky" />
          </div>
          <div className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] divide-y divide-white/[0.04]">
            {attention.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#E5E5EA] truncate">{r.item}</span>
                    {r.kind === "commitment" && (
                      <span className="text-[9px] uppercase tracking-wider text-cyan-300/80 ring-1 ring-cyan-500/20 rounded px-1 py-px shrink-0">
                        commitment
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#71757D]">{r.client}</div>
                </div>
                <OwnerChip owner={r.owner} />
                <StatusPill status={r.status} label={r.label} />
              </div>
            ))}
          </div>
        </section>

        {/* Client switcher */}
        <section>
          <h2 className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600" />
            Per-client playbook
          </h2>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {CLIENTS.map((c) => {
              const on = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full text-[12px] font-medium ring-1 transition-colors ${
                    on
                      ? "bg-white text-[#0C0C0C] ring-white"
                      : "bg-[#0F0F10] text-[#9CA3AF] ring-white/[0.06] hover:text-[#E5E5EA]"
                  }`}
                >
                  <span className={`inline-flex items-center justify-center size-6 rounded-full text-[10px] font-semibold ${on ? "bg-[#0C0C0C] text-white" : "bg-white/[0.06] text-[#E5E5EA]"}`}>
                    {c.initials}
                  </span>
                  {c.name}
                  <span className={`text-[10px] uppercase tracking-wider ${on ? "text-[#0C0C0C]/50" : "text-[#71757D]"}`}>
                    {c.tier}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active client: playbook + commitments side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3 items-start">
            {/* Playbook timeline */}
            <div className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <ChartPieIcon className="size-4 text-sky-300" />
                  <span className="text-[13px] font-medium">Account playbook</span>
                </div>
                <span className="text-[11px] text-[#71757D]">
                  day {active.cycleDay} of {active.cycleLength}
                </span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {active.playbook.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-[#E5E5EA]">{t.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#71757D]">{t.when}</span>
                        {t.deck && (
                          <Link
                            href={t.deck.href}
                            className="inline-flex items-center gap-1 text-[10px] text-cyan-300/80 hover:text-cyan-200"
                          >
                            <ArrowTopRightOnSquareIcon className="size-2.5" />
                            {t.deck.label}
                          </Link>
                        )}
                      </div>
                    </div>
                    <OwnerChip owner={t.owner} />
                    <StatusPill status={t.status} label={t.label} />
                  </div>
                ))}
              </div>
            </div>

            {/* Commitments board */}
            <div className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <FlagIcon className="size-4 text-cyan-300" />
                  <span className="text-[13px] font-medium">Open commitments</span>
                </div>
                <button className="inline-flex items-center gap-1 text-[11px] text-[#71757D] hover:text-[#E5E5EA]">
                  <PlusIcon className="size-3.5" />
                  Log
                </button>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {active.commitments.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[12px] text-[#71757D]">
                    Nothing outstanding. Log a promise from your next call.
                  </div>
                ) : (
                  active.commitments.map((m, i) => (
                    <div key={i} className="px-5 py-3">
                      <div className="text-[13px] text-[#E5E5EA] mb-1.5">{m.text}</div>
                      <div className="flex items-center justify-between gap-2">
                        <OwnerChip owner={m.owner} />
                        <StatusPill status={m.status} label={m.label} />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-[#71757D] uppercase tracking-wider">SLA {m.sla}</span>
                        {m.toTicket && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300/80">
                            <ArrowTopRightOnSquareIcon className="size-2.5" />
                            spun to delivery ticket
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How it works footer */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FooterNote
            Icon={ChartPieIcon}
            title="One template, every client"
            body="The playbook is a master template. New client onboards, it instantiates with dates off their start. Edit master, it flows forward; edit a client, it stays bespoke."
          />
          <FooterNote
            Icon={DocumentTextIcon}
            title="The decks are the output"
            body="Each touchpoint links to its Hero Offer deck - Monthly Report, Milestone, Renewal. The playbook is when; the deck is what you send. Same framework, bespoke content."
          />
          <FooterNote
            Icon={ArrowTrendingUpIcon}
            title="Ownership, not just deliverables"
            body="Every off-call promise gets an owner + SLA the moment it's made. Goes red when breached, visible to leadership, one click to a delivery ticket."
          />
        </section>
      </div>
    </div>
  );
}

function RollupStat({ label, value, tone }: { label: string; value: number; tone: "amber" | "rose" | "sky" }) {
  const toneText =
    tone === "amber" ? "text-amber-300" : tone === "rose" ? "text-rose-300" : "text-sky-300";
  return (
    <div className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-4">
      <div className="text-[11px] uppercase tracking-wider text-[#71757D] mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${value === 0 ? "text-[#71757D]" : toneText}`}>
        {value}
      </div>
    </div>
  );
}

function FooterNote({
  Icon,
  title,
  body,
}: {
  Icon: typeof ChartPieIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
      <Icon className="size-4 text-[#71757D] mb-2" />
      <div className="text-[13px] font-medium text-[#E5E5EA] mb-1">{title}</div>
      <p className="text-[12px] text-[#9CA3AF] leading-relaxed">{body}</p>
    </div>
  );
}
