"use client";

/* ── Hero Offer / Execution ──
 *
 * Three canonical tools: Briefs (links to /tools/briefs), Roadmap
 * (tier-aware monthly), Kickoff Deck (shareable HTML). Test tracker
 * lives in /tools/tests (delivery surface) and throughput rolls up
 * into Delivery KPIs - both out of this page on purpose.
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
import type { OfferResource, OfferSection } from "@/lib/hero-offer/types";
import { SectionCard } from "@/lib/hero-offer/section-card";
import { ResourceList } from "@/lib/hero-offer/resource-list";
import { ToolCardGrid, type ToolCard } from "@/lib/hero-offer/tool-card-grid";
import {
  DocumentDuplicateIcon,
  MapIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";

const EXECUTION_TOOLS: ToolCard[] = [
  { href: "/tools/briefs", label: "Briefs", blurb: "Design / Dev / Hypothesis briefs as fillable forms. Strategist writes, team builds.", icon: DocumentDuplicateIcon, status: "live" },
  { href: "/hero-offer/execution/roadmap", label: "Roadmap", blurb: "Monthly roadmap per tier (£5k/£10k/£15k). Fill in client name + customise, present to client.", icon: MapIcon, status: "live" },
  { href: "/hero-offer/execution/kickoff-deck", label: "Kickoff Deck", blurb: "First-week onboarding deck. Input client details → shareable HTML link.", icon: RocketLaunchIcon, status: "live" },
];

export default function ExecutionPage() {
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
      setSections(
        s
          .filter((row) => row.stage === ("execution" as OfferSection["stage"]))
          .sort((a, b) => a.order - b.order),
      );
      setHydrated(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addSection() {
    const row: OfferSection = {
      id: uid(),
      stage: "execution" as OfferSection["stage"],
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
        accent="cyan"
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
          <span className="size-2 rounded-full bg-info" />
          Tools
        </h2>
        <ToolCardGrid cards={EXECUTION_TOOLS} accent="cyan" />
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-subtle font-semibold mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-info" />
          Playbook notes
        </h2>
        <p className="text-[12px] text-subtle mb-4 max-w-2xl">
          Free-form copy for the team: how we kick off, how briefs flow, how each phase wraps. Anything that doesn&apos;t belong in a tool.
        </p>
        <div className="space-y-3">
          {sections.length === 0 ? (
            <div className="bg-background rounded-2xl p-6 text-center ring-1 ring-border">
              <p className="text-sm text-subtle">
                {isAdmin
                  ? "Add execution principles, brief flow, sprint cadence."
                  : "Nothing here yet."}
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
              className="w-full py-3 rounded-2xl text-[13px] text-subtle ring-1 ring-dashed ring-border hover:ring-info/40 hover:text-foreground hover:bg-info/[0.04] transition-all"
            >
              + Add section
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
