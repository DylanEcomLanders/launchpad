"use client";

/* ── Hero Offer / Acquisition ──
 *
 * How to win the deal. Three blocks:
 *   - Guidance sections (pitch, outreach, anything else admin adds)
 *   - Objection library (Q&A pairs the team builds up over time)
 *   - Pricing tiers (tier name + price + what's included)
 *
 * Admin can add / edit / reorder / delete each. Team reads only.
 */

import { useEffect, useState, type ReactNode } from "react";
import {
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  offerObjectionsStore,
  offerPricingStore,
  offerResourcesStore,
  offerSectionsStore,
  nextOrder,
  nowISO,
  uid,
} from "@/lib/hero-offer/data";
import {
  seedAcquisitionPricing,
  seedAcquisitionSections,
} from "@/lib/hero-offer/seed";
import type {
  OfferObjection,
  OfferPricingTier,
  OfferResource,
  OfferSection,
} from "@/lib/hero-offer/types";
import { SectionCard } from "@/lib/hero-offer/section-card";
import { ResourceList } from "@/lib/hero-offer/resource-list";
import { inputClass, textareaClass } from "@/lib/form-styles";

export default function AcquisitionPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [sections, setSections] = useState<OfferSection[]>([]);
  const [objections, setObjections] = useState<OfferObjection[]>([]);
  const [pricing, setPricing] = useState<OfferPricingTier[]>([]);
  const [resources, setResources] = useState<OfferResource[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingObjectionId, setEditingObjectionId] = useState<string | null>(null);
  const [editingPricingId, setEditingPricingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [s, o, p, r] = await Promise.all([
        offerSectionsStore.getAll(),
        offerObjectionsStore.getAll(),
        offerPricingStore.getAll(),
        offerResourcesStore.getAll(),
      ]);
      if (cancelled) return;
      setResources(r);
      const isSeeder = role === "admin" || role === "cro";

      const acquisitionSections = s
        .filter((r) => r.stage === "acquisition")
        .sort((a, b) => a.order - b.order);
      if (acquisitionSections.length === 0 && isSeeder) {
        const seeded = await seedAcquisitionSections();
        if (cancelled) return;
        setSections(seeded);
      } else {
        setSections(acquisitionSections);
      }

      /* Objections: don't seed - admin adds as they encounter them. */
      setObjections(o.sort((a, b) => a.order - b.order));

      const pricingRows = p.sort((a, b) => a.order - b.order);
      if (pricingRows.length === 0 && isSeeder) {
        const seeded = await seedAcquisitionPricing();
        if (cancelled) return;
        setPricing(seeded);
      } else {
        setPricing(pricingRows);
      }

      setHydrated(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [role]);

  /* ── Section CRUD ── */
  async function addSection() {
    const row: OfferSection = {
      id: uid(),
      stage: "acquisition",
      title: "New section",
      body: "",
      order: nextOrder(sections),
      updated_at: nowISO(),
    };
    await offerSectionsStore.create(row);
    setSections((prev) => [...prev, row]);
    setEditingSectionId(row.id);
  }
  async function patchSection(id: string, patch: Partial<OfferSection>) {
    const current = sections.find((s) => s.id === id);
    if (!current) return;
    const next = { ...current, ...patch, updated_at: nowISO() };
    setSections((prev) => prev.map((s) => (s.id === id ? next : s)));
    await offerSectionsStore.update(id, next);
  }
  async function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    await offerSectionsStore.remove(id);
  }

  /* ── Objection CRUD ── */
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

  /* ── Pricing CRUD ── */
  async function addPricing() {
    const row: OfferPricingTier = {
      id: uid(),
      tier: "New tier",
      price: "",
      includes: [],
      order: nextOrder(pricing),
    };
    await offerPricingStore.create(row);
    setPricing((prev) => [...prev, row]);
    setEditingPricingId(row.id);
  }
  async function patchPricing(id: string, patch: Partial<OfferPricingTier>) {
    const current = pricing.find((p) => p.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    setPricing((prev) => prev.map((p) => (p.id === id ? next : p)));
    await offerPricingStore.update(id, next);
  }
  async function removePricing(id: string) {
    setPricing((prev) => prev.filter((p) => p.id !== id));
    await offerPricingStore.remove(id);
  }

  /* ── Resource CRUD ── shared across every Acquisition card. */
  async function createResource(input: Omit<OfferResource, "id">) {
    const row: OfferResource = { id: uid(), ...input };
    setResources((prev) => [...prev, row]);
    await offerResourcesStore.create(row);
  }
  async function updateResource(id: string, patch: Partial<OfferResource>) {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
    await offerResourcesStore.update(id, patch);
  }
  async function removeResource(id: string) {
    setResources((prev) => prev.filter((r) => r.id !== id));
    await offerResourcesStore.remove(id);
  }

  /* Reusable helper - every card asks the same question: "what
   * resources are attached to me?" */
  function resourcesFor(parentType: OfferResource["parent_type"], parentId: string) {
    return resources.filter(
      (r) => r.parent_type === parentType && r.parent_id === parentId,
    );
  }
  function resourceFooter(parentType: OfferResource["parent_type"], parentId: string, accent: "emerald" | "cyan" | "sky"): ReactNode {
    return (
      <ResourceList
        parentType={parentType}
        parentId={parentId}
        resources={resourcesFor(parentType, parentId)}
        isAdmin={isAdmin}
        accent={accent}
        onCreate={createResource}
        onUpdate={updateResource}
        onRemove={removeResource}
      />
    );
  }

  if (!hydrated) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-[#0C0C0C] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* GUIDANCE SECTIONS */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
          Guidance
        </h2>
        <div className="space-y-3">
          {sections.length === 0 ? (
            <EmptyState
              copy={
                isAdmin
                  ? "Add the pitch script, outreach playbook, and anything else needed to win deals."
                  : "Nothing here yet. Ask an admin to fill it in."
              }
            />
          ) : (
            sections.map((s) => (
              <SectionCard
                key={s.id}
                section={s}
                isAdmin={isAdmin}
                editing={editingSectionId === s.id}
                onEdit={() => setEditingSectionId(s.id)}
                onCancel={() => setEditingSectionId(null)}
                onSave={(patch) => {
                  patchSection(s.id, patch);
                  setEditingSectionId(null);
                }}
                onDelete={() => removeSection(s.id)}
                footer={resourceFooter("section", s.id, "emerald")}
              />
            ))
          )}
          {isAdmin && (
            <button
              onClick={addSection}
              className="w-full py-3 rounded-2xl text-[13px] text-[#71757D] ring-1 ring-dashed ring-white/[0.08] hover:ring-emerald-500/40 hover:text-[#E5E5EA] hover:bg-emerald-500/[0.04] transition-all"
            >
              + Add section
            </button>
          )}
        </div>
      </section>

      {/* OBJECTION LIBRARY */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
          Objection library
        </h2>
        <div className="space-y-3">
          {objections.length === 0 ? (
            <EmptyState
              copy={
                isAdmin
                  ? "Capture every objection you hear + the response that lands. Build this up over time."
                  : "Nothing here yet."
              }
            />
          ) : (
            objections.map((o) => (
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
                footer={resourceFooter("objection", o.id, "cyan")}
              />
            ))
          )}
          {isAdmin && (
            <button
              onClick={addObjection}
              className="w-full py-3 rounded-2xl text-[13px] text-[#71757D] ring-1 ring-dashed ring-white/[0.08] hover:ring-emerald-500/40 hover:text-[#E5E5EA] hover:bg-emerald-500/[0.04] transition-all"
            >
              + Add objection
            </button>
          )}
        </div>
      </section>

      {/* PRICING */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 shadow-[0_0_12px_rgba(14,165,233,0.6)]" />
          Pricing &amp; what&apos;s included
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pricing.length === 0 ? (
            <div className="md:col-span-3">
              <EmptyState
                copy={
                  isAdmin
                    ? "Add the priced tiers and what each covers."
                    : "Pricing not published yet."
                }
              />
            </div>
          ) : (
            pricing.map((p) => (
              <PricingCard
                key={p.id}
                tier={p}
                isAdmin={isAdmin}
                editing={editingPricingId === p.id}
                onEdit={() => setEditingPricingId(p.id)}
                onCancel={() => setEditingPricingId(null)}
                onSave={(patch) => {
                  patchPricing(p.id, patch);
                  setEditingPricingId(null);
                }}
                onDelete={() => removePricing(p.id)}
                footer={resourceFooter("pricing", p.id, "sky")}
              />
            ))
          )}
        </div>
        {isAdmin && (
          <button
            onClick={addPricing}
            className="mt-3 w-full py-3 border border-dashed border-[#2A2A2A] rounded-xl text-[13px] text-[#71757D] hover:border-white hover:text-[#E5E5EA] transition-colors"
          >
            + Add pricing tier
          </button>
        )}
      </section>
    </div>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="bg-[#0F0F10] rounded-2xl p-6 text-center ring-1 ring-white/[0.04]">
      <p className="text-sm text-[#71757D]">{copy}</p>
    </div>
  );
}

/* ─── ObjectionCard ─── */
function ObjectionCard({
  objection,
  isAdmin,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  footer,
}: {
  objection: OfferObjection;
  isAdmin: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<OfferObjection>) => void;
  onDelete: () => void;
  footer?: ReactNode;
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
      <div className="bg-[#0F0F10] rounded-2xl p-5 space-y-3 ring-1 ring-cyan-500/30 shadow-[0_8px_32px_rgba(6,182,212,0.12)]">
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
            className="text-[11px] uppercase tracking-wider text-[#71757D] hover:text-rose-400"
          >
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA]"
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
    <div className="bg-[#0F0F10] rounded-2xl p-5 group ring-1 ring-white/[0.04] hover:ring-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="font-semibold text-[#E5E5EA] text-sm">
          &ldquo;{objection.objection}&rdquo;
        </div>
        {isAdmin && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#71757D] hover:text-[#E5E5EA] shrink-0"
            title="Edit objection"
          >
            <PencilSquareIcon className="size-4" />
          </button>
        )}
      </div>
      <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">
        {objection.response || (
          <span className="italic text-[#71757D]">No response yet.</span>
        )}
      </p>
      {footer}
    </div>
  );
}

/* ─── PricingCard ─── */
function PricingCard({
  tier,
  isAdmin,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  footer,
}: {
  tier: OfferPricingTier;
  isAdmin: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<OfferPricingTier>) => void;
  onDelete: () => void;
  footer?: ReactNode;
}) {
  const [tierDraft, setTierDraft] = useState(tier.tier);
  const [priceDraft, setPriceDraft] = useState(tier.price);
  /* Includes is stored as string[] but edited as a newline-separated
   * textarea - one bullet per line - because the team will mostly
   * paste from notes. */
  const [includesDraft, setIncludesDraft] = useState(tier.includes.join("\n"));
  useEffect(() => {
    if (editing) {
      setTierDraft(tier.tier);
      setPriceDraft(tier.price);
      setIncludesDraft(tier.includes.join("\n"));
    }
  }, [editing, tier.tier, tier.price, tier.includes]);

  if (editing) {
    return (
      <div className="bg-[#0F0F10] rounded-2xl p-5 space-y-3 md:col-span-3 ring-1 ring-sky-500/30 shadow-[0_8px_32px_rgba(14,165,233,0.12)]">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={tierDraft}
            onChange={(e) => setTierDraft(e.target.value)}
            placeholder="Tier name (Entry, Core, VIP)"
            className={inputClass}
            autoFocus
          />
          <input
            value={priceDraft}
            onChange={(e) => setPriceDraft(e.target.value)}
            placeholder="Price (£8k / month, from £5,000)"
            className={inputClass}
          />
        </div>
        <textarea
          value={includesDraft}
          onChange={(e) => setIncludesDraft(e.target.value)}
          placeholder="One bullet per line of what this tier includes"
          rows={6}
          className={textareaClass}
        />
        <div className="flex items-center justify-between">
          <button
            onClick={onDelete}
            className="text-[11px] uppercase tracking-wider text-[#71757D] hover:text-rose-400"
          >
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white"
            >
              <XMarkIcon className="size-3.5" />
              Cancel
            </button>
            <button
              onClick={() =>
                onSave({
                  tier: tierDraft.trim() || "Untitled",
                  price: priceDraft.trim(),
                  includes: includesDraft
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA]"
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
    <div className="bg-[#0F0F10] rounded-2xl p-5 group ring-1 ring-white/[0.04] hover:ring-sky-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#71757D]">
            {tier.tier}
          </div>
          <div className="text-2xl font-semibold bg-gradient-to-br from-sky-300 to-blue-200 bg-clip-text text-transparent mt-1">
            {tier.price || "—"}
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#71757D] hover:text-[#E5E5EA]"
            title="Edit tier"
          >
            <PencilSquareIcon className="size-4" />
          </button>
        )}
      </div>
      {tier.includes.length > 0 ? (
        <ul className="text-sm text-[#9CA3AF] space-y-1 list-disc list-inside mt-3">
          {tier.includes.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[#71757D] italic mt-3">Nothing listed yet.</p>
      )}
      {footer}
    </div>
  );
}
