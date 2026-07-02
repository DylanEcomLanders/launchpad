"use client";

/* ── Hero Offer / The Offer ──
 *
 * Front page. Mirrors the public /pricing surface so the team and
 * the founder see the same shape:
 *   - 3 tier cards across the top (Entry / Core / VIP)
 *   - North Star + Guarantee + Who-it's-for (3 cards under tiers)
 *   - Playbook guide cards (what it is, how it's organised, who
 *     maintains, how to use day to day, glossary)
 *   - Objection library at the bottom (Q&A)
 *   - Stage links (Acquisition / Execution / Retention)
 *
 * Editable: objections are admin-CRUD inline. Tier cards + guide cards
 * are static for now; promote to editable later if needed.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  PencilSquareIcon,
  XMarkIcon,
  MegaphoneIcon,
  WrenchScrewdriverIcon,
  HeartIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  offerObjectionsStore,
  nextOrder,
  uid,
} from "@/lib/hero-offer/data";
import type { OfferObjection } from "@/lib/hero-offer/types";
import { inputClass, textareaClass } from "@/lib/form-styles";

/* ── Tier definitions ───────────────────────────────────────────
 * Mirror /pricing exactly. Single source of truth lives in the
 * public pricing page; this is the internal-facing mirror so the
 * team sees what the prospect sees. */
const TIERS = [
  {
    name: "Entry",
    monthly: 5000,
    blurb: "The Conversion Engine at a starter cadence.",
    features: [
      "2 page builds per month",
      "2 A/B tests per month",
      "Biweekly strategy calls",
      "Biweekly reports on results",
    ],
    featured: false,
  },
  {
    name: "Core",
    monthly: 10000,
    badge: "Most chosen",
    blurb: "Full Conversion Engine on a weekly rhythm.",
    features: [
      "4 page builds per month",
      "4 A/B tests per month",
      "Weekly strategy calls (optional)",
      "Weekly reports on results",
    ],
    featured: true,
  },
  {
    name: "VIP",
    monthly: 15000,
    blurb: "Maximum velocity, aggressive test programme.",
    features: [
      "6 page builds per month",
      "12 A/B tests per month",
      "Weekly strategy calls",
      "Priority turnaround",
      "Quarterly brand-strategy calls",
    ],
    featured: false,
  },
];

const PLAYBOOK_GUIDE = [
  {
    eyebrow: "What this playbook is",
    title: "The conversion engine, fully documented.",
    body: "Three stages (Acquisition · Execution · Retention) covering how we win the deal, how we wow on delivery, and how we make it last. Every tool the team needs to run the offer lives in here.",
  },
  {
    eyebrow: "How it's organised",
    title: "Stages → Tools → Decks.",
    body: "Each stage has a small set of canonical tools. Each tool is either a working surface (briefs, roadmap, kickoff) or a presentable deck (pitch, milestone, monthly report). One source of truth, no scattered Google Docs.",
  },
  {
    eyebrow: "Who maintains each section",
    title: "Founder owns the offer, leads own their stage.",
    body: "Dylan owns The Offer + Acquisition copy. Strategist owns Execution (briefs, roadmap). CSM owns Retention (reports, milestones). Anyone with admin can edit; the page badges show who last touched what.",
  },
  {
    eyebrow: "How to use it day to day",
    title: "Open the tool you need, ship.",
    body: "Sales call? Open Pitch Deck + Qualification Script. Kicking off a new client? Generate the Kickoff Deck. Monthly review? Open Monthly Report. Day 30/90/180/365 check-in? Generate the Milestone Deck. Don't reinvent: every workflow already has a home here.",
  },
  {
    eyebrow: "Glossary",
    title: "The terms we use.",
    body: "CR = conversion rate. North Star = the one metric (CR). Hero Offer = the conversion partnership we sell. Pod = the delivery team (strategist + designer + dev + QA). Engagement = an active client retainer. Test = an A/B experiment in market.",
  },
];

const STAGES = [
  {
    href: "/hero-offer/acquisition",
    icon: MegaphoneIcon,
    label: "Acquisition",
    sub: "Win the deal: discovery audit, proposals, pitch deck, qualification.",
    gradient: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.18)",
  },
  {
    href: "/hero-offer/execution",
    icon: WrenchScrewdriverIcon,
    label: "Execution",
    sub: "Wow on delivery: briefs, monthly roadmap, kickoff deck.",
    gradient: "from-cyan-500 to-teal-600",
    glow: "rgba(6,182,212,0.18)",
  },
  {
    href: "/hero-offer/retention",
    icon: HeartIcon,
    label: "Retention",
    sub: "Make it last: monthly reports, milestone decks, renewals.",
    gradient: "from-sky-500 to-blue-600",
    glow: "rgba(14,165,233,0.18)",
  },
];

function fmtK(n: number) {
  const k = n / 1000;
  return `£${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

export default function TheOfferPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [objections, setObjections] = useState<OfferObjection[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingObjectionId, setEditingObjectionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const o = await offerObjectionsStore.getAll();
      if (cancelled) return;
      setObjections(o.sort((a, b) => a.order - b.order));
      setHydrated(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addObjection() {
    const row: OfferObjection = {
      id: uid(),
      objection: "New objection",
      response: "",
      order: nextOrder(objections),
    };
    await offerObjectionsStore.create(row);
    setObjections((prev) => [...prev, row]);
    setEditingObjectionId(row.id);
  }
  async function patchObjection(id: string, patch: Partial<OfferObjection>) {
    const current = objections.find((o) => o.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    setObjections((prev) => prev.map((o) => (o.id === id ? next : o)));
    await offerObjectionsStore.update(id, next);
  }
  async function removeObjection(id: string) {
    setObjections((prev) => prev.filter((o) => o.id !== id));
    await offerObjectionsStore.remove(id);
  }

  return (
    <div className="space-y-10">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="pt-2">
        <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-subtle mb-4">
          The Conversion Engine
        </div>
        <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.02em] leading-[1.05] mb-4 bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-transparent">
          We turn the traffic you already pay for into revenue.
        </h2>
        <p className="text-sm md:text-base text-muted leading-relaxed max-w-2xl">
          One programme. A full conversion team (design, dev, copy, CRO) embedded inside your business on a monthly system. Not consultancy, not vendor: a partnership built to compound.
        </p>
      </section>

      {/* ── Tier cards (mirrors /pricing) ──────────────────────── */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-stretch">
          {TIERS.map((tier) => {
            const featured = tier.featured;
            return (
              <div
                key={tier.name}
                className={
                  featured
                    ? "rounded-3xl bg-surface-raised text-surface p-7 md:p-8 shadow-xl shadow-black/30"
                    : "rounded-3xl ring-1 ring-white/[0.08] bg-white/[0.025] p-7 md:p-8"
                }
              >
                <div className="flex items-center justify-between gap-2 mb-6">
                  <h3 className={`text-lg font-semibold ${featured ? "" : "text-white/85"}`}>
                    {tier.name}
                  </h3>
                  {featured && tier.badge && (
                    <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-surface text-surface-raised">
                      {tier.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-5xl font-semibold tracking-[-0.03em] tabular-nums ${featured ? "" : "text-white/90"}`}>
                    {fmtK(tier.monthly)}
                  </span>
                  <span className={`text-sm ${featured ? "text-surface/45" : "text-white/40"}`}>
                    /mo
                  </span>
                </div>
                <p className={`text-sm leading-relaxed mt-4 mb-6 ${featured ? "text-surface/60" : "text-white/50"}`}>
                  {tier.blurb}
                </p>
                <div className={`h-px mb-6 ${featured ? "bg-surface/10" : "bg-white/10"}`} />
                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon className={`size-3.5 mt-0.5 shrink-0 ${featured ? "text-surface" : "text-white/35"}`} />
                      <span className={`text-sm leading-snug ${featured ? "" : "text-white/70"}`}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-white/35 mt-6 text-center">
          90-day initial commitment · 10% off when paid up front
        </p>
      </section>

      {/* ── North Star · Guarantee · Who it's for ──────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-background ring-1 ring-white/[0.04] p-5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">
            North Star
          </div>
          <div className="text-base font-semibold text-foreground mb-1">Conversion rate.</div>
          <p className="text-[12px] text-muted leading-relaxed">
            The one metric we measure ourselves on. CR up = revenue up at the same ad spend.
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-sky-500/10 ring-1 ring-emerald-500/20 p-5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">
            The guarantee
          </div>
          <div className="text-base font-semibold text-foreground mb-1">
            Measurable CR lift in 90 days, or we keep working free.
          </div>
          <p className="text-[12px] text-muted leading-relaxed">
            You ship what we recommend. We hit the number.
          </p>
        </div>
        <div className="rounded-2xl bg-background ring-1 ring-white/[0.04] p-5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">
            Who it&apos;s for
          </div>
          <div className="text-base font-semibold text-foreground mb-1">
            Shopify brands at £200k/mo+
          </div>
          <p className="text-[12px] text-muted leading-relaxed">
            Paid-traffic dependent. Founders or CMOs with conversion ambition and the bandwidth to ship what we recommend.
          </p>
        </div>
      </section>

      {/* ── Stage links ────────────────────────────────────────── */}
      <section>
        <div className="text-[11px] uppercase tracking-wider text-subtle font-semibold mb-3">
          Jump to a stage
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STAGES.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="group block bg-background rounded-2xl p-5 ring-1 ring-white/[0.04] hover:ring-white/[0.12] transition-all"
                style={{ ["--glow" as string]: s.glow }}
              >
                <div
                  className={`size-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-[0_8px_24px_var(--glow)] mb-4 transition-transform group-hover:scale-105`}
                >
                  <Icon className="size-5 text-white" />
                </div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-subtle mb-1">
                  {s.label}
                </div>
                <p className="text-sm text-foreground leading-relaxed">{s.sub}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Playbook guide ─────────────────────────────────────── */}
      <section>
        <div className="text-[11px] uppercase tracking-wider text-subtle font-semibold mb-3">
          How the playbook works
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PLAYBOOK_GUIDE.map((g) => (
            <div
              key={g.eyebrow}
              className="rounded-2xl bg-background ring-1 ring-white/[0.04] p-5"
            >
              <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">
                {g.eyebrow}
              </div>
              <div className="text-base font-semibold text-foreground mb-1.5">{g.title}</div>
              <p className="text-[13px] text-muted leading-relaxed">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Operations hub (admin) ─────────────────────────────── */}
      {isAdmin && (
        <Link
          href="/operations"
          className="block bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-sky-500/10 rounded-2xl p-5 ring-1 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-sky-500 flex items-center justify-center shadow-[0_8px_24px_rgba(6,182,212,0.3)] shrink-0">
              <SparklesIcon className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold mb-0.5">
                Operations
              </div>
              <div className="text-sm text-foreground">
                Every operational tool the playbook turns into: pipeline, briefs, tests, reports, onboarding, lifecycle, cadence, brain library.
              </div>
            </div>
            <ArrowTopRightOnSquareIcon className="size-4 text-subtle group-hover:text-emerald-300 transition-colors shrink-0" />
          </div>
        </Link>
      )}

      {/* ── Objection library ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="size-4 text-cyan-400" />
            <div className="text-[11px] uppercase tracking-wider text-subtle font-semibold">
              Objection library
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={addObjection}
              className="text-[11px] uppercase tracking-wider font-semibold text-subtle hover:text-cyan-300 transition-colors"
            >
              + Add objection
            </button>
          )}
        </div>
        <p className="text-[12px] text-subtle mb-4 max-w-2xl">
          Every objection we hear + the response that lands. Build this up over time. Searchable mid-call.
        </p>
        {!hydrated ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-background rounded-xl animate-pulse" />
            ))}
          </div>
        ) : objections.length === 0 ? (
          <div className="bg-background rounded-2xl p-6 text-center ring-1 ring-white/[0.04]">
            <p className="text-sm text-subtle">
              {isAdmin
                ? "Capture every objection you hear and the response that lands. Click + Add objection above."
                : "Nothing here yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {objections.map((o) => (
              <ObjectionCard
                key={o.id}
                objection={o}
                isAdmin={isAdmin}
                editing={editingObjectionId === o.id}
                onEdit={() => setEditingObjectionId(o.id)}
                onCancel={() => setEditingObjectionId(null)}
                onSave={(patch) => {
                  patchObjection(o.id, patch);
                  setEditingObjectionId(null);
                }}
                onDelete={() => removeObjection(o.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ObjectionCard({
  objection,
  isAdmin,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  objection: OfferObjection;
  isAdmin: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<OfferObjection>) => void;
  onDelete: () => void;
}) {
  const [qDraft, setQDraft] = useState(objection.objection);
  const [aDraft, setADraft] = useState(objection.response);
  useEffect(() => {
    if (editing) {
      setQDraft(objection.objection);
      setADraft(objection.response);
    }
  }, [editing, objection.objection, objection.response]);

  if (editing) {
    return (
      <div className="bg-background rounded-2xl p-5 space-y-3 ring-1 ring-cyan-500/30">
        <input
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder="What they say"
          className={inputClass}
          autoFocus
        />
        <textarea
          value={aDraft}
          onChange={(e) => setADraft(e.target.value)}
          placeholder="How we respond"
          rows={4}
          className={textareaClass}
        />
        <div className="flex items-center justify-between">
          <button
            onClick={onDelete}
            className="text-[11px] uppercase tracking-wider text-subtle hover:text-rose-400"
          >
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-subtle hover:text-white"
            >
              <XMarkIcon className="size-3.5" />
              Cancel
            </button>
            <button
              onClick={() =>
                onSave({
                  objection: qDraft.trim() || "Untitled",
                  response: aDraft,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-background hover:bg-foreground"
            >
              <CheckIcon className="size-3.5" />
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-2xl p-5 group ring-1 ring-white/[0.04] hover:ring-cyan-500/30 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="font-semibold text-foreground text-sm">
          &ldquo;{objection.objection}&rdquo;
        </div>
        {isAdmin && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-subtle hover:text-foreground shrink-0"
            title="Edit objection"
          >
            <PencilSquareIcon className="size-4" />
          </button>
        )}
      </div>
      <p className="text-sm text-muted whitespace-pre-wrap">
        {objection.response || (
          <span className="italic text-subtle">No response yet.</span>
        )}
      </p>
    </div>
  );
}
