"use client";

/* ── Hero Offer — the conversion-engine front page ──
 * Internal mirror of the public /pricing offer so the team + founder see what
 * the prospect sees: the three tiers, the North Star / guarantee / fit, the
 * playbook's stages, and an editable objection library.
 * DESIGN.md craft bar: dark tokens, 4px rounding, border-border-faint cards,
 * muted-status colour only, no shadows / rings / gradients / coloured cards.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckIcon, PencilSquareIcon, XMarkIcon, MegaphoneIcon, WrenchScrewdriverIcon,
  HeartIcon, ArrowUpRightIcon, PlusIcon, ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { offerObjectionsStore, nextOrder, uid } from "@/lib/hero-offer/data";
import type { OfferObjection } from "@/lib/hero-offer/types";
import { inputClass, textareaClass } from "@/lib/form-styles";

/* Mirrors /pricing exactly. */
const TIERS = [
  { name: "Entry", monthly: 5000, blurb: "The conversion engine at a starter cadence.", featured: false, features: ["2 page builds / month", "2 A/B tests / month", "Biweekly strategy calls", "Biweekly reporting"] },
  { name: "Core", monthly: 10000, badge: "Most chosen", blurb: "Full conversion engine on a weekly rhythm.", featured: true, features: ["4 page builds / month", "4 A/B tests / month", "Weekly strategy calls", "Weekly reporting"] },
  { name: "VIP", monthly: 15000, blurb: "Maximum velocity, aggressive test programme.", featured: false, features: ["6 page builds / month", "12 A/B tests / month", "Weekly strategy calls", "Priority turnaround", "Quarterly brand strategy"] },
];

const SIGNALS = [
  { key: "North Star", tone: false, title: "Conversion rate", body: "The one metric we measure ourselves on. CR up = revenue up at the same ad spend." },
  { key: "The guarantee", tone: true, title: "Measurable CR lift in 90 days, or we keep working free", body: "You ship what we recommend. We hit the number." },
  { key: "Who it's for", tone: false, title: "Shopify brands at £200k/mo+", body: "Paid-traffic dependent. Founders or CMOs with conversion ambition and the bandwidth to ship." },
];

const STAGES = [
  { href: "/hero-offer/acquisition", icon: MegaphoneIcon, label: "Acquisition", sub: "Win the deal: discovery audit, proposals, pitch deck, qualification." },
  { href: "/hero-offer/execution", icon: WrenchScrewdriverIcon, label: "Execution", sub: "Wow on delivery: briefs, monthly roadmap, kickoff deck." },
  { href: "/hero-offer/retention", icon: HeartIcon, label: "Retention", sub: "Make it last: monthly reports, milestone decks, renewals." },
];

const PLAYBOOK_GUIDE = [
  { eyebrow: "What this playbook is", title: "The conversion engine, fully documented.", body: "Three stages — Acquisition · Execution · Retention — covering how we win the deal, wow on delivery, and make it last. Every tool the team needs to run the offer lives here." },
  { eyebrow: "How it's organised", title: "Stages → Tools → Decks.", body: "Each stage has a small set of canonical tools — a working surface (briefs, roadmap, kickoff) or a presentable deck (pitch, milestone, monthly report). One source of truth, no scattered docs." },
  { eyebrow: "Who maintains each section", title: "Founder owns the offer, leads own their stage.", body: "Dylan owns the offer + acquisition copy. Strategist owns execution. CSM owns retention. Anyone with admin can edit; badges show who last touched what." },
  { eyebrow: "How to use it day to day", title: "Open the tool you need, ship.", body: "Sales call? Pitch deck + qualification script. New client? Kickoff deck. Monthly review? Monthly report. Day 30/90/180 check-in? Milestone deck. Every workflow already has a home here." },
];

function fmtK(n: number) {
  const k = n / 1000;
  return `£${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

export default function HeroOfferPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [objections, setObjections] = useState<OfferObjection[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    offerObjectionsStore.getAll().then((o) => {
      if (cancelled) return;
      setObjections(o.sort((a, b) => a.order - b.order));
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  async function addObjection() {
    const row: OfferObjection = { id: uid(), objection: "New objection", response: "", order: nextOrder(objections) };
    await offerObjectionsStore.create(row);
    setObjections((prev) => [...prev, row]);
    setEditingId(row.id);
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
    <div className="space-y-10 px-6 pb-20 pt-10 md:px-10">
      {/* ── Hero ── */}
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">The conversion engine</p>
        <h1 className="mt-3 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-foreground">
          We turn the traffic you already pay for into revenue.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          One programme. A full conversion team — design, dev, copy, CRO — embedded in your business on a monthly system. Not consultancy, not a vendor: a partnership built to compound.
        </p>
      </header>

      {/* ── Tiers ── */}
      <section>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div key={tier.name} className={`rounded border p-5 ${tier.featured ? "border-border bg-surface-raised" : "border-border-faint bg-surface"}`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">{tier.name}</h3>
                {tier.featured && tier.badge && (
                  <span className="rounded border border-border-faint bg-surface px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-muted">{tier.badge}</span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{fmtK(tier.monthly)}</span>
                <span className="text-sm text-subtle">/mo</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{tier.blurb}</p>
              <div className="my-5 border-t border-dashed border-border" />
              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-status-ontrack" />
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-2xs font-medium uppercase tracking-wider text-subtle">90-day initial commitment · 10% off paid up front</p>
      </section>

      {/* ── North Star · Guarantee · Fit ── */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {SIGNALS.map((s) => (
          <div key={s.key} className="rounded border border-border-faint bg-surface p-5">
            <div className={`mb-2 flex items-center gap-1.5 text-3xs font-semibold uppercase tracking-wider ${s.tone ? "text-status-ontrack" : "text-subtle"}`}>
              {s.tone && <span className="size-1.5 rounded-full bg-status-ontrack" />}{s.key}
            </div>
            <div className="text-sm font-semibold leading-snug text-foreground">{s.title}</div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      {/* ── Stage links ── */}
      <section>
        <p className="mb-3 text-3xs font-semibold uppercase tracking-wider text-subtle">Jump to a stage</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {STAGES.map((s) => (
            <Link key={s.href} href={s.href} className="group rounded border border-border-faint bg-surface p-5 transition-colors hover:bg-surface-raised">
              <div className="mb-4 flex size-9 items-center justify-center rounded border border-border-faint bg-surface-raised text-muted transition-colors group-hover:text-foreground">
                <s.icon className="size-4" />
              </div>
              <div className="text-3xs font-semibold uppercase tracking-wider text-subtle">{s.label}</div>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{s.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Playbook guide ── */}
      <section>
        <p className="mb-3 text-3xs font-semibold uppercase tracking-wider text-subtle">How the playbook works</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {PLAYBOOK_GUIDE.map((g) => (
            <div key={g.eyebrow} className="rounded border border-border-faint bg-surface p-5">
              <div className="mb-2 text-3xs font-semibold uppercase tracking-wider text-subtle">{g.eyebrow}</div>
              <div className="text-sm font-semibold text-foreground">{g.title}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Operations hub (admin) ── */}
      {isAdmin && (
        <Link href="/operations" className="group flex items-center gap-3.5 rounded border border-border-faint bg-surface p-5 transition-colors hover:bg-surface-raised">
          <div className="flex size-9 shrink-0 items-center justify-center rounded border border-border-faint bg-surface-raised text-muted"><WrenchScrewdriverIcon className="size-4" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-3xs font-semibold uppercase tracking-wider text-subtle">Operations</div>
            <div className="mt-0.5 text-sm text-foreground">Every operational tool the playbook turns into — pipeline, briefs, tests, reports, onboarding, lifecycle, cadence.</div>
          </div>
          <ArrowUpRightIcon className="size-4 shrink-0 text-subtle transition-colors group-hover:text-foreground" />
        </Link>
      )}

      {/* ── Objection library ── */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-2 text-3xs font-semibold uppercase tracking-wider text-subtle">
            <ChatBubbleLeftRightIcon className="size-3.5" />Objection library
          </p>
          {isAdmin && (
            <button onClick={addObjection} className="inline-flex items-center gap-1 text-2xs text-subtle transition-colors hover:text-foreground"><PlusIcon className="size-3" />Add objection</button>
          )}
        </div>
        <p className="mb-4 max-w-2xl text-xs text-subtle">Every objection we hear + the response that lands. Build it up over time; searchable mid-call.</p>

        {!hydrated ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded border border-border-faint bg-surface" />)}</div>
        ) : objections.length === 0 ? (
          <div className="rounded border border-border-faint bg-surface p-6 text-center text-sm text-subtle">
            {isAdmin ? "Capture every objection you hear and the response that lands. Click Add objection." : "Nothing here yet."}
          </div>
        ) : (
          <div className="space-y-2">
            {objections.map((o) => (
              <ObjectionCard
                key={o.id} objection={o} isAdmin={isAdmin} editing={editingId === o.id}
                onEdit={() => setEditingId(o.id)} onCancel={() => setEditingId(null)}
                onSave={(patch) => { patchObjection(o.id, patch); setEditingId(null); }}
                onDelete={() => removeObjection(o.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ObjectionCard({ objection, isAdmin, editing, onEdit, onCancel, onSave, onDelete }: {
  objection: OfferObjection; isAdmin: boolean; editing: boolean;
  onEdit: () => void; onCancel: () => void; onSave: (patch: Partial<OfferObjection>) => void; onDelete: () => void;
}) {
  const [qDraft, setQDraft] = useState(objection.objection);
  const [aDraft, setADraft] = useState(objection.response);
  useEffect(() => {
    if (editing) { setQDraft(objection.objection); setADraft(objection.response); }
  }, [editing, objection.objection, objection.response]);

  if (editing) {
    return (
      <div className="space-y-3 rounded border border-border bg-surface p-5">
        <input value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="What they say" className={inputClass} autoFocus />
        <textarea value={aDraft} onChange={(e) => setADraft(e.target.value)} placeholder="How we respond" rows={4} className={textareaClass} />
        <div className="flex items-center justify-between">
          <button onClick={onDelete} className="text-2xs uppercase tracking-wider text-subtle transition-colors hover:text-status-late">Delete</button>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"><XMarkIcon className="size-3.5" />Cancel</button>
            <button onClick={() => onSave({ objection: qDraft.trim() || "Untitled", response: aDraft })} className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"><CheckIcon className="size-3.5" />Save</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded border border-border-faint bg-surface p-5 transition-colors hover:bg-surface-raised">
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">&ldquo;{objection.objection}&rdquo;</div>
        {isAdmin && (
          <button onClick={onEdit} className="shrink-0 text-subtle opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100" title="Edit objection"><PencilSquareIcon className="size-4" /></button>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm text-muted">{objection.response || <span className="italic text-subtle">No response yet.</span>}</p>
    </div>
  );
}
