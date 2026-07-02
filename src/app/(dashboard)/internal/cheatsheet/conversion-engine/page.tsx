"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckIcon,
  ClipboardIcon,
  PencilSquareIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import {
  loadOfferContent,
  saveOfferContent,
  getOfferContent,
  type OfferContentOverrides,
} from "@/lib/offer-content";

/* ── Defaults ── */

const DEFAULT_POSITIONING =
  "The post-click agency. We own the conversion layer for DTC brands — audit, build, test, compound.";

interface CardDef {
  id: string;
  title: string;
  defaultMarkdown: string;
}

const CARDS: CardDef[] = [
  {
    id: "who",
    title: "Who it's for",
    defaultMarkdown: `**ICP:** DTC brands £80K–£300K/mo, £20K+ ad spend, no in-house CRO, post-click hasn't been touched in 12+ months.

**Not ICP:** brands under £50K/mo, <£10K ad spend, anyone wanting one-off page builds.`,
  },
  {
    id: "included",
    title: "What's included",
    defaultMarkdown: `- Conversion audit + revenue gap analysis
- 60–90 day visual roadmap (Miro)
- Monthly page builds (LP, PDP, cart, bundle)
- A/B test programme with hypothesis chains
- AOV: bundles, upsells, post-purchase
- Monthly report with revenue attribution
- Dedicated Slack with the team`,
  },
  {
    id: "how",
    title: "How it works",
    defaultMarkdown: `**Audit (Mo 1)** → score every layer, find the 3 biggest leaks, ship quick wins Wk 1.

**Test cycle (Mo 2+)** → build, ship, measure, iterate. ICE-prioritised. 2-week test minimum.

**Cadence** — weekly Slack, monthly report, quarterly review.`,
  },
  {
    id: "pricing",
    title: "Pricing",
    defaultMarkdown: `**Standard — £8K/mo.** The deal. Roadmap, monthly builds, tests, monthly report.

**Anchor — £12K/mo.** Faster turnarounds, more resources, dedicated calls.

Always quote both. £12K exists so £8K feels like the deal.`,
  },
  {
    id: "outcomes",
    title: "Expected outcomes",
    defaultMarkdown: `- 0.5–2% site-wide CVR lift in 90 days (range, not promise)
- Quick wins live in Week 1
- First major build live Month 2
- Most retainers pay back inside 60 days
- Compounding kicks in from Month 3`,
  },
  {
    id: "proof",
    title: "Proof",
    defaultMarkdown: `- Supplements brand · 2.1% → 4.3% CVR · 90 days
- Skincare DTC · +38% AOV via bundle + upsell flow
- Apparel · +£42K/mo recovered on PDP rebuild
- Pet food · checkout opt → +14% completion rate
- Home goods · post-purchase upsell · +£18 per order`,
  },
];

interface ObjectionDef {
  q: string;
  a: string;
}

const DEFAULT_OBJECTIONS: ObjectionDef[] = [
  {
    q: "We already have a CRO agency.",
    a: "Most CRO agencies audit and recommend — we audit, build, and ship from one team. If yours is moving CVR every month, keep them. If they're sending 47-page reports and waiting on your dev team, that's the gap we fill.",
  },
  {
    q: "We have an in-house designer/dev.",
    a: "Good — that keeps cost down. We work two ways: hand over Figma + section specs for them to build, or run end-to-end and let them focus on product and brand. Most clients pick the second after one cycle.",
  },
  {
    q: "It's too expensive.",
    a: "The £8K retainer pays back at a 0.1% CVR lift on £800K monthly revenue. If your traffic and revenue numbers don't make those maths work, we're not the right fit and we'll tell you. Walk us through the numbers first — the gap is usually bigger than the retainer.",
  },
  {
    q: "Why not a freelancer?",
    a: "A freelancer gives you pages. We give you a roadmap, a test loop, and revenue attribution. The £500 page on a brand with no testing programme doesn't compound — that's the difference.",
  },
  {
    q: "How is this different from [competitor]?",
    a: "Most competitors split into two camps — strategy-only or build-only. We do both from the same team, so there's no handoff gap and the strategist who scoped the test is the one reviewing the result.",
  },
  {
    q: "We tried CRO before and it didn't work.",
    a: "One page is a guess. A programme is a process of elimination. Send us what was tested — usually the issue is offer mismatch, wrong traffic source, or a single shot with no iteration.",
  },
  {
    q: "Can you guarantee results?",
    a: "No. Anyone guaranteeing CVR lift is lying or charging for the risk. We guarantee the system: a roadmap, monthly builds, tracked tests, and revenue attribution. If 90 days in the numbers haven't moved, we have an honest conversation.",
  },
  {
    q: "Why a retainer and not project-based?",
    a: "One-off projects don't compound. The first build teaches you something — a retainer means we apply that on the next build instead of starting cold. We do projects, but the ROI only stacks on retainer.",
  },
  {
    q: "We're not ready, we want to wait until [event].",
    a: "Every month you wait costs the CVR gap × revenue. If a replatform or brand refresh is genuinely blocking, we'll wait. If it's \"Q4\" or \"after the launch\" — that's when you need it most, not least.",
  },
  {
    q: "Can we start with just one funnel?",
    a: "That's the standard £8K retainer. The full system focused on one funnel. If it lifts CVR there, expand scope from there — we don't tier or upsell, we just price the bigger scope.",
  },
];

/* ── Page ── */

const PROSE_CLASS =
  "prose prose-sm max-w-none prose-p:text-muted prose-p:my-1 prose-strong:text-foreground prose-ul:my-1 prose-li:my-0 prose-li:text-muted";

export default function ConversionEngineCheatsheetPage() {
  const [overrides, setOverrides] = useState<NonNullable<OfferContentOverrides["cheatsheet"]>>(() => {
    return getOfferContent().cheatsheet ?? {};
  });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // e.g. "positioning", "card:who", "obj:0:q", "obj:0:a"
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadOfferContent().then((c) => {
      if (!cancelled) setOverrides(c.cheatsheet ?? {});
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const positioning = overrides.positioning ?? DEFAULT_POSITIONING;
  const getCard = (id: string, def: string) => overrides.cards?.[id] ?? def;
  const getObjection = (i: number) => {
    const o = overrides.objections?.[String(i)];
    return {
      q: o?.q ?? DEFAULT_OBJECTIONS[i].q,
      a: o?.a ?? DEFAULT_OBJECTIONS[i].a,
    };
  };

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const persist = async (next: NonNullable<OfferContentOverrides["cheatsheet"]>) => {
    setOverrides(next);
    const current = getOfferContent();
    await saveOfferContent({ ...current, cheatsheet: next });
  };

  const startEdit = (key: string, current: string) => {
    setEditing(key);
    setDraft(current);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const next: NonNullable<OfferContentOverrides["cheatsheet"]> = {
      ...overrides,
      cards: { ...(overrides.cards ?? {}) },
      objections: { ...(overrides.objections ?? {}) },
    };

    if (editing === "positioning") {
      if (draft.trim() === DEFAULT_POSITIONING) delete next.positioning;
      else next.positioning = draft;
    } else if (editing.startsWith("card:")) {
      const id = editing.slice(5);
      const def = CARDS.find((c) => c.id === id)?.defaultMarkdown ?? "";
      if (draft.trim() === def.trim()) delete next.cards![id];
      else next.cards![id] = draft;
    } else if (editing.startsWith("obj:")) {
      const [, idxStr, field] = editing.split(":");
      const i = Number(idxStr);
      const key = String(i);
      const existing = next.objections![key] ?? {};
      const defVal = field === "q" ? DEFAULT_OBJECTIONS[i].q : DEFAULT_OBJECTIONS[i].a;
      if (draft.trim() === defVal.trim()) {
        delete existing[field as "q" | "a"];
      } else {
        existing[field as "q" | "a"] = draft;
      }
      if (existing.q === undefined && existing.a === undefined) {
        delete next.objections![key];
      } else {
        next.objections![key] = existing;
      }
    }

    // Clean empty containers
    if (next.cards && Object.keys(next.cards).length === 0) delete next.cards;
    if (next.objections && Object.keys(next.objections).length === 0) delete next.objections;

    await persist(next);
    setSaving(false);
    setEditing(null);
    setDraft("");
  };

  const resetPositioning = () => persist({ ...overrides, positioning: undefined });
  const resetCard = (id: string) => {
    const cards = { ...(overrides.cards ?? {}) };
    delete cards[id];
    const next = { ...overrides, cards: Object.keys(cards).length ? cards : undefined };
    persist(next);
  };
  const resetObjection = (i: number) => {
    const objs = { ...(overrides.objections ?? {}) };
    delete objs[String(i)];
    const next = { ...overrides, objections: Object.keys(objs).length ? objs : undefined };
    persist(next);
  };

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <header className="mb-5 flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Internal · Sales Enablement</p>
          <h1 className="text-xl font-semibold text-foreground mt-0.5">Conversion Engine — Cheat Sheet</h1>
        </div>
        <p className="text-[11px] text-subtle">Hover any block to edit. Cmd+F to find any answer.</p>
      </header>

      {/* Section 1: Cheat Sheet */}
      <section className="mb-8">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-3">§ 1 · Cheat Sheet</h2>

        {/* Positioning — full width */}
        <EditableBlock
          isEditing={editing === "positioning"}
          overridden={overrides.positioning !== undefined}
          onEdit={() => startEdit("positioning", positioning)}
          onReset={resetPositioning}
          onCancel={cancelEdit}
          onSave={saveEdit}
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          className={`rounded-lg border px-4 py-3 mb-3 ${
            editing === "positioning"
              ? "border-white bg-surface"
              : "border-foreground bg-foreground text-surface"
          }`}
          textareaRows={3}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-1">Positioning</p>
          <p className="text-sm leading-snug">{positioning}</p>
        </EditableBlock>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {CARDS.map((c) => {
            const editKey = `card:${c.id}`;
            const isEditing = editing === editKey;
            const value = getCard(c.id, c.defaultMarkdown);
            const overridden = overrides.cards?.[c.id] !== undefined;
            return (
              <EditableBlock
                key={c.id}
                isEditing={isEditing}
                overridden={overridden}
                onEdit={() => startEdit(editKey, value)}
                onReset={() => resetCard(c.id)}
                onCancel={cancelEdit}
                onSave={saveEdit}
                draft={draft}
                setDraft={setDraft}
                saving={saving}
                className={`rounded-lg border p-3 ${
                  isEditing
                    ? "border-white bg-surface"
                    : overridden
                      ? "border-border bg-amber-500/15"
                      : "border-border bg-surface"
                }`}
                textareaRows={8}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1.5">{c.title}</p>
                <div className={`${PROSE_CLASS} text-[11px] leading-snug`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                </div>
              </EditableBlock>
            );
          })}
        </div>
      </section>

      {/* Section 2: Objections */}
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-3">§ 2 · Objections</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle w-[28%]">Objection</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">Response</th>
                <th className="w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_OBJECTIONS.map((_, i) => {
                const obj = getObjection(i);
                const qOverridden = overrides.objections?.[String(i)]?.q !== undefined;
                const aOverridden = overrides.objections?.[String(i)]?.a !== undefined;
                const editingQ = editing === `obj:${i}:q`;
                const editingA = editing === `obj:${i}:a`;
                const rowOverridden = qOverridden || aOverridden;
                return (
                  <tr
                    key={i}
                    className={`border-b border-border last:border-0 align-top ${
                      rowOverridden ? "bg-amber-500/15/60" : "hover:bg-background/60"
                    }`}
                  >
                    <td className="px-3 py-2.5 text-[12px] font-medium text-foreground leading-snug">
                      <InlineEditable
                        isEditing={editingQ}
                        overridden={qOverridden}
                        value={obj.q}
                        onEdit={() => startEdit(`obj:${i}:q`, obj.q)}
                        onCancel={cancelEdit}
                        onSave={saveEdit}
                        onReset={() => resetObjection(i)}
                        draft={draft}
                        setDraft={setDraft}
                        saving={saving}
                        textareaRows={2}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-muted leading-snug">
                      <InlineEditable
                        isEditing={editingA}
                        overridden={aOverridden}
                        value={obj.a}
                        onEdit={() => startEdit(`obj:${i}:a`, obj.a)}
                        onCancel={cancelEdit}
                        onSave={saveEdit}
                        onReset={() => resetObjection(i)}
                        draft={draft}
                        setDraft={setDraft}
                        saving={saving}
                        textareaRows={4}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        onClick={() => copy(obj.a, i)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-border text-muted hover:border-white hover:text-foreground transition-colors"
                      >
                        {copiedIdx === i ? (
                          <>
                            <CheckIcon className="size-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <ClipboardIcon className="size-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ── Editable block (positioning + cards) ── */

function EditableBlock({
  isEditing,
  overridden,
  onEdit,
  onReset,
  onCancel,
  onSave,
  draft,
  setDraft,
  saving,
  className,
  textareaRows,
  children,
}: {
  isEditing: boolean;
  overridden: boolean;
  onEdit: () => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
  draft: string;
  setDraft: (s: string) => void;
  saving: boolean;
  className: string;
  textareaRows: number;
  children: React.ReactNode;
}) {
  return (
    <div className={`group relative ${className}`}>
      {overridden && !isEditing && (
        <span className="absolute top-1.5 right-12 text-[9px] font-semibold uppercase tracking-wider text-[#92400E] bg-amber-500/15 px-1.5 py-0.5 rounded">
          Edited
        </span>
      )}
      {!isEditing && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {overridden && (
            <button
              onClick={onReset}
              title="Reset to default"
              className="p-1 rounded hover:bg-foreground/10 text-subtle hover:text-foreground"
            >
              <ArrowUturnLeftIcon className="size-3.5" />
            </button>
          )}
          <button
            onClick={onEdit}
            title="Edit"
            className="p-1 rounded hover:bg-foreground/10 text-subtle hover:text-foreground"
          >
            <PencilSquareIcon className="size-3.5" />
          </button>
        </div>
      )}
      {isEditing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(textareaRows, draft.split("\n").length + 1)}
            className="w-full font-mono text-[11px] leading-relaxed border border-border rounded-md p-2 focus:outline-none focus:border-white focus:ring-1 focus:ring-surface resize-y text-foreground bg-surface"
          />
          <div className="mt-1.5 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              disabled={saving}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-muted hover:text-foreground px-2 py-1 rounded disabled:opacity-50"
            >
              <XMarkIcon className="size-3" />
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-surface bg-foreground hover:bg-white px-2 py-1 rounded disabled:opacity-50"
            >
              <CheckIcon className="size-3" />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/* ── Inline editable text (objection q/a cells) ── */

function InlineEditable({
  isEditing,
  overridden,
  value,
  onEdit,
  onCancel,
  onSave,
  onReset,
  draft,
  setDraft,
  saving,
  textareaRows,
}: {
  isEditing: boolean;
  overridden: boolean;
  value: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onReset: () => void;
  draft: string;
  setDraft: (s: string) => void;
  saving: boolean;
  textareaRows: number;
}) {
  if (isEditing) {
    return (
      <div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.max(textareaRows, draft.split("\n").length + 1)}
          className="w-full text-[12px] leading-snug border border-white rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-surface resize-y bg-surface"
        />
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <button
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted hover:text-foreground px-1.5 py-0.5 rounded disabled:opacity-50"
          >
            <XMarkIcon className="size-3" />
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-surface bg-foreground hover:bg-white px-1.5 py-0.5 rounded disabled:opacity-50"
          >
            <CheckIcon className="size-3" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="group relative">
      <span>{value}</span>
      <span className="ml-1 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity align-middle">
        {overridden && (
          <button
            onClick={onReset}
            title="Reset to default"
            className="p-0.5 rounded hover:bg-surface-raised text-subtle hover:text-foreground"
          >
            <ArrowUturnLeftIcon className="size-3" />
          </button>
        )}
        <button
          onClick={onEdit}
          title="Edit"
          className="p-0.5 rounded hover:bg-surface-raised text-subtle hover:text-foreground"
        >
          <PencilSquareIcon className="size-3" />
        </button>
        {overridden && (
          <span className="text-[8px] font-semibold uppercase tracking-wider text-[#92400E] bg-amber-500/15 px-1 py-0.5 rounded">
            edited
          </span>
        )}
      </span>
    </div>
  );
}
