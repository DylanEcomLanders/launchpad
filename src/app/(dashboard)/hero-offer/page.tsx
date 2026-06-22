"use client";

/* ── Hero Offer / Start here ──
 *
 * The index. Explains what the playbook is, how it's organised, and
 * links into each stage. One editable intro section + a stage grid.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MegaphoneIcon,
  WrenchScrewdriverIcon,
  HeartIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  offerSectionsStore,
  offerResourcesStore,
  uid,
  nowISO,
  nextOrder,
} from "@/lib/hero-offer/data";
import { seedStartHere } from "@/lib/hero-offer/seed";
import { SectionCard } from "@/lib/hero-offer/section-card";
import { ResourceList } from "@/lib/hero-offer/resource-list";
import type { OfferResource, OfferSection } from "@/lib/hero-offer/types";

/* Each stage owns one slice of the gradient palette so the eye can
 * read "where am I" without parsing the label. Quiet at rest, vivid
 * on the icon tile. */
const STAGES = [
  {
    href: "/hero-offer/acquisition",
    icon: MegaphoneIcon,
    label: "Acquisition",
    sub: "How to win the deal: pitch, outreach, objections, pricing.",
    gradient: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.18)",
  },
  {
    href: "/hero-offer/execution",
    icon: WrenchScrewdriverIcon,
    label: "Execution",
    sub: "How to wow on delivery: the conversion engine, layer by layer.",
    gradient: "from-cyan-500 to-teal-600",
    glow: "rgba(6,182,212,0.18)",
  },
  {
    href: "/hero-offer/retention",
    icon: HeartIcon,
    label: "Retention",
    sub: "How to make it last: Day 30 / 90 / 180 / 365 lifecycle.",
    gradient: "from-sky-500 to-blue-600",
    glow: "rgba(14,165,233,0.18)",
  },
];

export default function StartHerePage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [sections, setSections] = useState<OfferSection[]>([]);
  const [resources, setResources] = useState<OfferResource[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [rows, res] = await Promise.all([
        offerSectionsStore.getAll(),
        offerResourcesStore.getAll(),
      ]);
      if (cancelled) return;
      const slice = rows
        .filter((r) => r.stage === "start")
        .sort((a, b) => a.order - b.order);
      /* First-visit seed: pre-create the scaffold sections so the page
       * isn't a blank "+ Add section" prompt. Only admin seeds; team
       * members read whatever's there. */
      if (slice.length === 0 && (role === "admin" || role === "cro")) {
        const seeded = await seedStartHere();
        if (cancelled) return;
        setSections(seeded);
      } else {
        setSections(slice);
      }
      setResources(res);
      setHydrated(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [role]);

  /* ── Resource CRUD ── shared across the page; ResourceList filters
   * its own slice by (parent_type, parent_id). */
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

  async function addSection() {
    const row: OfferSection = {
      id: uid(),
      stage: "start",
      title: "New section",
      body: "",
      order: nextOrder(sections),
      updated_at: nowISO(),
    };
    await offerSectionsStore.create(row);
    setSections((prev) => [...prev, row]);
    setEditingId(row.id);
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

  /* Resources attached at "root" sit above the index so playbook-wide
   * artefacts (the whole playbook as a PDF, the agency wiki) read as
   * top-level, not buried in a section. Empty unless admin adds. */
  const rootResources = resources.filter(
    (r) => r.parent_type === "root" && r.parent_id === "root",
  );

  return (
    <div className="space-y-6">
      {/* "The Offer" brochure - what we do and why. Reads like the
       * first 6 slides of a deck. Sits above all editable content. */}
      <section className="bg-gradient-to-br from-emerald-500/[0.08] via-cyan-500/[0.08] to-sky-500/[0.08] rounded-2xl ring-1 ring-emerald-500/20 p-8">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-emerald-300/80 mb-4">
          The Conversion Engine
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold mb-3 bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-transparent leading-tight">
          We turn the traffic you already pay for into revenue.
        </h2>
        <p className="text-sm md:text-base text-[#9CA3AF] leading-relaxed max-w-2xl">
          One programme. A full conversion team — design, dev, copy, CRO — embedded inside your business on a monthly system. Not consultancy, not vendor: a partnership built to compound.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
          <div className="bg-[#0F0F10]/60 rounded-xl p-4 ring-1 ring-white/[0.04]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">Entry</div>
            <div className="text-2xl font-semibold text-[#E5E5EA]">£5k<span className="text-sm text-[#71757D]">/mo</span></div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">2 pages + 2 tests / month</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 rounded-xl p-4 ring-1 ring-emerald-500/30">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">Core</div>
            <div className="text-2xl font-semibold text-[#E5E5EA]">£10k<span className="text-sm text-[#71757D]">/mo</span></div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">4 pages + 4 tests / month</p>
          </div>
          <div className="bg-[#0F0F10]/60 rounded-xl p-4 ring-1 ring-white/[0.04]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">VIP</div>
            <div className="text-2xl font-semibold text-[#E5E5EA]">£15k<span className="text-sm text-[#71757D]">/mo</span></div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">6 pages + 12 tests / month</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="bg-[#0F0F10]/60 rounded-xl p-4 ring-1 ring-white/[0.04]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">North Star</div>
            <div className="text-sm text-[#E5E5EA] font-medium">Conversion rate.</div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">The one metric we measure ourselves on. CR up = revenue up at the same ad spend.</p>
          </div>
          <div className="bg-[#0F0F10]/60 rounded-xl p-4 ring-1 ring-white/[0.04]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">The guarantee</div>
            <div className="text-sm text-[#E5E5EA] font-medium">Measurable CR lift in 90 days, or we keep working free.</div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">You ship what we recommend. We hit the number.</p>
          </div>
        </div>

        <div className="bg-[#0F0F10]/60 rounded-xl p-4 ring-1 ring-white/[0.04] mt-3">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">Who it&apos;s for</div>
          <p className="text-sm text-[#E5E5EA] leading-relaxed">
            Shopify brands at £200k/mo+ with paid traffic dependency. Founders or CMOs with conversion-rate ambition and the bandwidth to actually ship what we recommend.
          </p>
        </div>
      </section>

      {/* Playbook-wide resources */}
      {hydrated && (isAdmin || rootResources.length > 0) && (
        <div className="bg-[#0F0F10] rounded-2xl p-5 ring-1 ring-white/[0.04]">
          <ResourceList
            parentType="root"
            parentId="root"
            resources={rootResources}
            isAdmin={isAdmin}
            accent="emerald"
            embedded={false}
            onCreate={createResource}
            onUpdate={updateResource}
            onRemove={removeResource}
          />
        </div>
      )}

      {/* Editable intro sections */}
      <div className="space-y-3">
        {!hydrated ? (
          <div className="h-32 bg-[#0C0C0C] rounded-xl animate-pulse" />
        ) : sections.length === 0 ? (
          <div className="bg-[#0F0F10] rounded-2xl p-6 text-center ring-1 ring-white/[0.04]">
            <p className="text-sm text-[#71757D]">
              Nothing on the index yet. {isAdmin ? "Add a welcome section below." : "Ask an admin to fill this in."}
            </p>
          </div>
        ) : (
          sections.map((s) => (
            <SectionCard
              key={s.id}
              section={s}
              isAdmin={isAdmin}
              editing={editingId === s.id}
              onEdit={() => setEditingId(s.id)}
              onCancel={() => setEditingId(null)}
              onSave={(patch) => {
                patchSection(s.id, patch);
                setEditingId(null);
              }}
              onDelete={() => removeSection(s.id)}
              footer={
                <ResourceList
                  parentType="section"
                  parentId={s.id}
                  resources={resources.filter(
                    (r) =>
                      r.parent_type === "section" && r.parent_id === s.id,
                  )}
                  isAdmin={isAdmin}
                  accent="emerald"
                  onCreate={createResource}
                  onUpdate={updateResource}
                  onRemove={removeResource}
                />
              }
            />
          ))
        )}
        {isAdmin && hydrated && (
          <button
            onClick={addSection}
            className="w-full py-3 rounded-2xl text-[13px] text-[#71757D] ring-1 ring-dashed ring-white/[0.08] hover:ring-emerald-500/40 hover:text-[#E5E5EA] hover:bg-emerald-500/[0.04] transition-all"
          >
            + Add section
          </button>
        )}
      </div>

      {/* Operations hub link - takes admin straight into the
          tools that operationalise this playbook. Admin only. */}
      {isAdmin && hydrated && (
        <Link href="/operations" className="block bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-sky-500/10 rounded-2xl p-5 ring-1 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all group">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-sky-500 flex items-center justify-center shadow-[0_8px_24px_rgba(6,182,212,0.3)] shrink-0">
              <SparklesIcon className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold mb-0.5">
                Operations
              </div>
              <div className="text-sm text-[#E5E5EA]">
                Every tool the playbook turns into. Pipeline · Discovery · Roadmap · Briefs · Tests · Reports · Onboarding · Lifecycle · Cadence · Brain library.
              </div>
            </div>
            <ArrowTopRightOnSquareIcon className="size-4 text-[#71757D] group-hover:text-emerald-300 transition-colors shrink-0" />
          </div>
        </Link>
      )}

      {/* Stage links - each gets its own slice of the palette so the
          three stages read as a sequence, not three identical cards. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        {STAGES.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group block bg-[#0F0F10] rounded-2xl p-5 ring-1 ring-white/[0.04] hover:ring-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all"
              style={{ ["--glow" as string]: s.glow }}
            >
              <div
                className={`size-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-[0_8px_24px_var(--glow)] mb-4 transition-transform group-hover:scale-105`}
              >
                <Icon className="size-5 text-white" />
              </div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[#71757D] mb-1">
                {s.label}
              </div>
              <p className="text-sm text-[#E5E5EA] leading-relaxed">{s.sub}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

