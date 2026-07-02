"use client";

/* ── Hero Offer / Acquisition ──
 *
 * Five canonical tools: Discovery Audit (reference deck), Proposals
 * & Quotes, Pricelist (external), Pitch Deck (combined sales+pitch+
 * proof), Qualification Script. Objection library moved to The Offer
 * front page so it's surfaced one click sooner.
 *
 * Pricing tiers panel removed - they live on The Offer front page now.
 * Guidance sections kept for free-form playbook copy (admin-editable).
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRole } from "@/components/auth-gate";
import {
  offerResourcesStore,
  offerSectionsStore,
  nextOrder,
  nowISO,
  uid,
} from "@/lib/hero-offer/data";
import { seedAcquisitionSections } from "@/lib/hero-offer/seed";
import type {
  OfferResource,
  OfferSection,
} from "@/lib/hero-offer/types";
import { SectionCard } from "@/lib/hero-offer/section-card";
import { ResourceList } from "@/lib/hero-offer/resource-list";
import { ToolCardGrid, type ToolCard } from "@/lib/hero-offer/tool-card-grid";
import {
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  TagIcon,
  DocumentDuplicateIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

const ACQUISITION_TOOLS: ToolCard[] = [
  { href: "/hero-offer/acquisition/discovery-audit", label: "Discovery Audit", blurb: "What to look for on every audit. Reference deck for the team.", icon: DocumentMagnifyingGlassIcon, status: "live" },
  { href: "/tools/proposals", label: "Proposals / Quotes", blurb: "Tier picker + terms + guarantee + shareable proposal.", icon: DocumentTextIcon, status: "live" },
  { href: "/pricing", label: "Pricelist", blurb: "Public-facing 3-tier pricing page. The one we send out.", icon: TagIcon, status: "live", external: true },
  { href: "/hero-offer/acquisition/pitch-deck", label: "Pitch Deck", blurb: "Sales tactics + the pitch + proof. One deck the closer drives.", icon: DocumentDuplicateIcon, status: "live" },
  { href: "/hero-offer/acquisition/qualification", label: "Qualification Script", blurb: "The questions to ask on a cold-lead call. 8 questions.", icon: CheckBadgeIcon, status: "live" },
];

export default function AcquisitionPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [sections, setSections] = useState<OfferSection[]>([]);
  const [resources, setResources] = useState<OfferResource[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [s, r] = await Promise.all([
        offerSectionsStore.getAll(),
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

      setHydrated(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [role]);

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

  function resourceFooter(parentType: OfferResource["parent_type"], parentId: string): ReactNode {
    return (
      <ResourceList
        parentType={parentType}
        parentId={parentId}
        resources={resources.filter(
          (r) => r.parent_type === parentType && r.parent_id === parentId,
        )}
        isAdmin={isAdmin}
        accent="emerald"
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
          <div key={i} className="h-32 bg-background rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-subtle font-semibold mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-success" />
          Tools
        </h2>
        <ToolCardGrid cards={ACQUISITION_TOOLS} accent="emerald" />
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-subtle font-semibold mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-success" />
          Playbook notes
        </h2>
        <p className="text-[12px] text-subtle mb-4 max-w-2xl">
          Free-form copy for the team: pitch principles, outreach playbook, anything that doesn&apos;t belong in a tool but needs to be discoverable.
        </p>
        <div className="space-y-3">
          {sections.length === 0 ? (
            <div className="bg-background rounded-2xl p-6 text-center ring-1 ring-border">
              <p className="text-sm text-subtle">
                {isAdmin
                  ? "Add the pitch principles, outreach playbook, and anything else needed to win deals."
                  : "Nothing here yet. Ask an admin to fill it in."}
              </p>
            </div>
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
                footer={resourceFooter("section", s.id)}
              />
            ))
          )}
          {isAdmin && (
            <button
              onClick={addSection}
              className="w-full py-3 rounded-2xl text-[13px] text-subtle ring-1 ring-dashed ring-border hover:ring-success/40 hover:text-foreground hover:bg-success/[0.04] transition-all"
            >
              + Add section
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
