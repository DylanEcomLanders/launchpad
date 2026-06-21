"use client";

/* ── Hero Offer / Retention ──
 *
 * How to make it last. One card per lifecycle milestone (Day 30,
 * 90, 180, 365 to start; the day field is free so the team can add
 * more touchpoints). Each card has a title + markdown body
 * describing the plays at that point.
 */

import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  offerMilestonesStore,
  offerResourcesStore,
  offerSectionsStore,
  nextOrder,
  nowISO,
  uid,
} from "@/lib/hero-offer/data";
import {
  seedRetentionMilestones,
  seedRetentionSections,
} from "@/lib/hero-offer/seed";
import type {
  OfferMilestone,
  OfferResource,
  OfferSection,
} from "@/lib/hero-offer/types";
import { SectionCard } from "@/lib/hero-offer/section-card";
import { ResourceList } from "@/lib/hero-offer/resource-list";
import { inputClass, textareaClass, labelClass } from "@/lib/form-styles";

const DEFAULT_DAYS = [30, 90, 180, 365];

export default function RetentionPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [sections, setSections] = useState<OfferSection[]>([]);
  const [milestones, setMilestones] = useState<OfferMilestone[]>([]);
  const [resources, setResources] = useState<OfferResource[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [s, m, r] = await Promise.all([
        offerSectionsStore.getAll(),
        offerMilestonesStore.getAll(),
        offerResourcesStore.getAll(),
      ]);
      if (cancelled) return;
      setResources(r);
      const isSeeder = role === "admin" || role === "cro";

      const retentionSections = s
        .filter((r) => r.stage === "retention")
        .sort((a, b) => a.order - b.order);
      if (retentionSections.length === 0 && isSeeder) {
        const seeded = await seedRetentionSections();
        if (cancelled) return;
        setSections(seeded);
      } else {
        setSections(retentionSections);
      }

      const milestoneRows = m.sort(
        (a, b) => a.day - b.day || a.order - b.order,
      );
      if (milestoneRows.length === 0 && isSeeder) {
        const seeded = await seedRetentionMilestones();
        if (cancelled) return;
        setMilestones(seeded);
      } else {
        setMilestones(milestoneRows);
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
      stage: "retention",
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

  /* ── Milestone CRUD ── */
  async function addMilestone(day: number) {
    const row: OfferMilestone = {
      id: uid(),
      day,
      title: `Day ${day}`,
      body: "",
      order: nextOrder(milestones),
    };
    await offerMilestonesStore.create(row);
    setMilestones((prev) =>
      [...prev, row].sort((a, b) => a.day - b.day || a.order - b.order),
    );
    setEditingMilestoneId(row.id);
  }
  async function patchMilestone(id: string, patch: Partial<OfferMilestone>) {
    const current = milestones.find((m) => m.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    setMilestones((prev) =>
      prev
        .map((m) => (m.id === id ? next : m))
        .sort((a, b) => a.day - b.day || a.order - b.order),
    );
    await offerMilestonesStore.update(id, next);
  }
  async function removeMilestone(id: string) {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    await offerMilestonesStore.remove(id);
  }

  /* ── Resource CRUD ── */
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

  function resourceFooter(
    parentType: OfferResource["parent_type"],
    parentId: string,
  ): ReactNode {
    return (
      <ResourceList
        parentType={parentType}
        parentId={parentId}
        resources={resources.filter(
          (r) => r.parent_type === parentType && r.parent_id === parentId,
        )}
        isAdmin={isAdmin}
        accent="sky"
        onCreate={createResource}
        onUpdate={updateResource}
        onRemove={removeResource}
      />
    );
  }

  if (!hydrated) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-[#0C0C0C] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  /* Which of the default days have no milestone yet - admin can
   * one-click add them. */
  const existingDays = new Set(milestones.map((m) => m.day));
  const missingDefaultDays = DEFAULT_DAYS.filter((d) => !existingDays.has(d));

  return (
    <div className="space-y-10">
      {/* GUIDANCE SECTIONS */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 shadow-[0_0_12px_rgba(14,165,233,0.6)]" />
          Guidance
        </h2>
        <div className="space-y-3">
          {sections.length === 0 ? (
            <div className="bg-[#0F0F10] rounded-2xl p-6 text-center ring-1 ring-white/[0.04]">
              <p className="text-sm text-[#71757D]">
                {isAdmin
                  ? "Add overarching retention principles, comms cadence, expansion levers."
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
              className="w-full py-3 rounded-2xl text-[13px] text-[#71757D] ring-1 ring-dashed ring-white/[0.08] hover:ring-sky-500/40 hover:text-[#E5E5EA] hover:bg-sky-500/[0.04] transition-all"
            >
              + Add section
            </button>
          )}
        </div>
      </section>

      {/* LIFECYCLE MILESTONES */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 shadow-[0_0_12px_rgba(14,165,233,0.6)]" />
          Lifecycle milestones
        </h2>
        <div className="space-y-3">
          {milestones.length === 0 ? (
            <div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]">
              <p className="text-sm text-[#71757D] mb-4">
                {isAdmin
                  ? "Start with the four standard milestones, then layer in more touchpoints."
                  : "No milestones yet."}
              </p>
              {isAdmin && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {DEFAULT_DAYS.map((d) => (
                    <button
                      key={d}
                      onClick={() => addMilestone(d)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-gradient-to-r from-sky-500/15 to-blue-500/15 ring-1 ring-sky-500/30 text-sky-200 hover:from-sky-500/25 hover:to-blue-500/25"
                    >
                      + Day {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            milestones.map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                isAdmin={isAdmin}
                editing={editingMilestoneId === m.id}
                onEdit={() => setEditingMilestoneId(m.id)}
                onCancel={() => setEditingMilestoneId(null)}
                onSave={(patch) => {
                  patchMilestone(m.id, patch);
                  setEditingMilestoneId(null);
                }}
                onDelete={() => removeMilestone(m.id)}
                footer={resourceFooter("milestone", m.id)}
              />
            ))
          )}
          {isAdmin && milestones.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {missingDefaultDays.map((d) => (
                <button
                  key={d}
                  onClick={() => addMilestone(d)}
                  className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#222222] text-[#71757D] hover:bg-[#2A2A2A] hover:text-[#E5E5EA]"
                >
                  + Day {d}
                </button>
              ))}
              <button
                onClick={() => {
                  const input = window.prompt("Day number for new milestone (e.g. 45, 120, 730)");
                  if (!input) return;
                  const n = parseInt(input, 10);
                  if (Number.isFinite(n) && n > 0) addMilestone(n);
                }}
                className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#222222] text-[#71757D] hover:bg-[#2A2A2A] hover:text-[#E5E5EA]"
              >
                + Custom day
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ─── MilestoneCard ─── */
function MilestoneCard({
  milestone,
  isAdmin,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  footer,
}: {
  milestone: OfferMilestone;
  isAdmin: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<OfferMilestone>) => void;
  onDelete: () => void;
  footer?: ReactNode;
}) {
  const [dayDraft, setDayDraft] = useState(String(milestone.day));
  const [titleDraft, setTitleDraft] = useState(milestone.title);
  const [bodyDraft, setBodyDraft] = useState(milestone.body);

  useEffect(() => {
    if (editing) {
      setDayDraft(String(milestone.day));
      setTitleDraft(milestone.title);
      setBodyDraft(milestone.body);
    }
  }, [editing, milestone]);

  if (editing) {
    return (
      <div className="bg-[#0F0F10] rounded-2xl p-5 space-y-3 ring-1 ring-sky-500/30 shadow-[0_8px_32px_rgba(14,165,233,0.12)]">
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <div>
            <label className={labelClass}>Day</label>
            <input
              type="number"
              value={dayDraft}
              onChange={(e) => setDayDraft(e.target.value)}
              className={inputClass}
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Title</label>
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className={inputClass}
              placeholder="e.g. Renewal kickoff call"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Body (markdown)</label>
          <textarea
            value={bodyDraft}
            onChange={(e) => setBodyDraft(e.target.value)}
            rows={8}
            className={`${textareaClass} font-mono text-[13px]`}
            placeholder="What happens at this point. Plays, comms, deliverables."
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={onDelete}
            className="text-[11px] uppercase tracking-wider text-[#71757D] hover:text-rose-400"
          >
            Delete milestone
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
              onClick={() => {
                const n = parseInt(dayDraft, 10);
                onSave({
                  day: Number.isFinite(n) && n > 0 ? n : milestone.day,
                  title: titleDraft.trim() || `Day ${milestone.day}`,
                  body: bodyDraft,
                });
              }}
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
      <div className="flex items-start gap-4">
        <div className="shrink-0 size-14 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex flex-col items-center justify-center text-center shadow-[0_8px_24px_rgba(14,165,233,0.3)]">
          <div className="text-lg font-bold text-white leading-none">
            {milestone.day}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-white/70 mt-0.5">
            Day
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-lg font-semibold text-[#E5E5EA]">
              {milestone.title}
            </h3>
            {isAdmin && (
              <button
                onClick={onEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#71757D] hover:text-[#E5E5EA] shrink-0"
                title="Edit milestone"
              >
                <PencilSquareIcon className="size-4" />
              </button>
            )}
          </div>
          {milestone.body.trim() ? (
            <div className="prose prose-invert prose-sm max-w-none prose-p:text-[#9CA3AF] prose-li:text-[#9CA3AF] prose-strong:text-[#E5E5EA]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {milestone.body}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-xs text-[#71757D] italic">Not filled in.</p>
          )}
          {footer}
        </div>
      </div>
    </div>
  );
}
