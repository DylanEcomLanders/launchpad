"use client";

/* ── R&D Tracker — dashboard ──
 * /rd. Two-column grid of initiative cards (active first, then collapsed
 * sections for parked / shipped / killed), followed by an ideas inbox.
 * Modals for "+ New initiative" and "+ Add idea".
 *
 * Data flow: hydrate from initiativeStore / subpointStore / ideaStore on
 * mount, write through the same stores on every mutation. Multi-device
 * sync is additive only (we never call saveAll, per MEMORY).
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlusIcon, ChevronDownIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import {
  initiativeStore,
  subpointStore,
  ideaStore,
  getCurrentUserName,
  setCurrentUserName,
  uid,
  nowISO,
  progressPct,
  lastTouchedISO,
  isStale,
  timeAgo,
  firstName,
} from "@/lib/rd/data";
import type {
  Initiative,
  InitiativeStatus,
  Subpoint,
  Idea,
} from "@/lib/rd/types";
import {
  TypeBadge,
  ProgressBar,
  NewInitiativeModal,
  AddIdeaModal,
} from "./components";

export default function RdDashboardClient() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [subpoints, setSubpoints] = useState<Subpoint[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInitiativeOpen, setNewInitiativeOpen] = useState(false);
  const [addIdeaOpen, setAddIdeaOpen] = useState(false);
  /* Collapsed sections — parked default open if there's anything in it,
   * shipped + killed always collapsed by default to keep the page light. */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    parked: false,
    shipped: false,
    killed: false,
  });

  // ── Hydrate ─────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    Promise.all([
      initiativeStore.getAll(),
      subpointStore.getAll(),
      ideaStore.getAll(),
    ]).then(([i, s, ideas]) => {
      if (!alive) return;
      setInitiatives(i);
      setSubpoints(s);
      setIdeas(ideas);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // ── Derived groupings ───────────────────────────────────────────
  const subsByInitiative = useMemo(() => {
    const m = new Map<string, Subpoint[]>();
    for (const s of subpoints) {
      const arr = m.get(s.initiative_id) || [];
      arr.push(s);
      m.set(s.initiative_id, arr);
    }
    return m;
  }, [subpoints]);

  const grouped = useMemo(() => {
    const buckets: Record<InitiativeStatus, Initiative[]> = {
      active: [],
      parked: [],
      shipped: [],
      killed: [],
    };
    for (const i of initiatives) buckets[i.status].push(i);
    // Active: by % complete descending (showcase momentum)
    buckets.active.sort((a, b) => {
      const pa = progressPct(subsByInitiative.get(a.id) || []);
      const pb = progressPct(subsByInitiative.get(b.id) || []);
      return pb - pa;
    });
    // Others: most recently touched first
    for (const k of ["parked", "shipped", "killed"] as const) {
      buckets[k].sort((a, b) => {
        const la = lastTouchedISO(a, subsByInitiative.get(a.id) || []);
        const lb = lastTouchedISO(b, subsByInitiative.get(b.id) || []);
        return lb.localeCompare(la);
      });
    }
    return buckets;
  }, [initiatives, subsByInitiative]);

  const inboxIdeas = useMemo(
    () =>
      ideas
        .filter((i) => i.status === "inbox")
        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [ideas],
  );

  // ── Mutations ───────────────────────────────────────────────────
  async function handleCreateInitiative(payload: {
    name: string;
    type: Initiative["type"];
    owner: string;
    north_star: string;
  }) {
    setCurrentUserName(payload.owner);
    const now = nowISO();
    const initiative: Initiative = {
      id: uid(),
      name: payload.name,
      type: payload.type,
      owner: payload.owner,
      north_star: payload.north_star,
      status: "active",
      promoted_from_idea_id: null,
      created_at: now,
      updated_at: now,
    };
    await initiativeStore.create(initiative);
    setInitiatives((prev) => [initiative, ...prev]);
    setNewInitiativeOpen(false);
    // Drop user straight into the detail page so they add sub-points
    window.location.href = `/rd/${initiative.id}`;
  }

  async function handleAddIdea(payload: {
    title: string;
    why: string;
    type: Idea["type"];
    submitted_by: string;
  }) {
    setCurrentUserName(payload.submitted_by);
    const now = nowISO();
    const idea: Idea = {
      id: uid(),
      title: payload.title,
      why: payload.why,
      type: payload.type,
      submitted_by: payload.submitted_by,
      status: "inbox",
      created_at: now,
      updated_at: now,
    };
    await ideaStore.create(idea);
    setIdeas((prev) => [idea, ...prev]);
    setAddIdeaOpen(false);
  }

  // ── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16">
        <div className="text-[13px] text-[#71757D]">Loading R&amp;D tracker...</div>
      </div>
    );
  }

  const totals = {
    active: grouped.active.length,
    parked: grouped.parked.length,
    shipped: grouped.shipped.length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#E5E5EA]">
            Initiatives
          </h1>
          <p className="text-[13px] text-[#71757D] mt-1">
            {totals.active} active · {totals.parked} parked · {totals.shipped} shipped
          </p>
        </div>
        <button
          onClick={() => setNewInitiativeOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E5E5EA] text-[#181818] text-[13px] font-medium rounded-lg hover:bg-white transition-colors"
        >
          <PlusIcon className="size-4" />
          New initiative
        </button>
      </div>

      {/* Active grid */}
      {grouped.active.length === 0 ? (
        <EmptyState
          title="No active initiatives yet"
          body="Create your first one to start tracking sub-points and momentum."
          cta={{ label: "+ New initiative", onClick: () => setNewInitiativeOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {grouped.active.map((i) => (
            <InitiativeCard
              key={i.id}
              initiative={i}
              subpoints={subsByInitiative.get(i.id) || []}
            />
          ))}
        </div>
      )}

      {/* Collapsed sections */}
      {(["parked", "shipped", "killed"] as const).map((status) => {
        const items = grouped[status];
        if (items.length === 0) return null;
        const open = openSections[status];
        return (
          <div key={status} className="mt-8">
            <button
              onClick={() =>
                setOpenSections((p) => ({ ...p, [status]: !p[status] }))
              }
              className="flex items-center gap-2 w-full text-left group"
            >
              <ChevronDownIcon
                className={`size-3.5 text-[#71757D] transition-transform ${open ? "" : "-rotate-90"}`}
              />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] group-hover:text-[#E5E5EA] transition-colors">
                {status} ({items.length})
              </span>
            </button>
            {open && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {items.map((i) => (
                  <InitiativeCard
                    key={i.id}
                    initiative={i}
                    subpoints={subsByInitiative.get(i.id) || []}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Ideas inbox */}
      <div className="mt-14">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#E5E5EA] flex items-center gap-2">
              <LightBulbIcon className="size-4 text-[#E5E5EA]" />
              Ideas from the team
            </h2>
            <p className="text-[13px] text-[#71757D] mt-1">
              {inboxIdeas.length} unreviewed · review weekly
            </p>
          </div>
          <button
            onClick={() => setAddIdeaOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#181818] border border-[#2A2A2A] text-[#E5E5EA] text-[12px] font-medium rounded-lg hover:border-white transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Add idea
          </button>
        </div>
        <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-2xl p-3 md:p-4">
          {inboxIdeas.length === 0 ? (
            <div className="px-3 py-10 text-center text-[13px] text-[#71757D]">
              Nothing in the inbox. The team can drop ideas with the button
              above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {inboxIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewInitiativeModal
        open={newInitiativeOpen}
        onClose={() => setNewInitiativeOpen(false)}
        onCreate={handleCreateInitiative}
        defaultOwner={getCurrentUserName()}
      />
      <AddIdeaModal
        open={addIdeaOpen}
        onClose={() => setAddIdeaOpen(false)}
        onCreate={handleAddIdea}
        defaultSubmitter={getCurrentUserName()}
      />
    </div>
  );
}

/* ─── Card components ─────────────────────────────────────────── */

function InitiativeCard({
  initiative,
  subpoints,
}: {
  initiative: Initiative;
  subpoints: Subpoint[];
}) {
  const pct = progressPct(subpoints);
  const done = subpoints.filter((s) => s.done).length;
  const total = subpoints.length;
  const stale = isStale(initiative, subpoints);
  const last = lastTouchedISO(initiative, subpoints);
  return (
    <Link
      href={`/rd/${initiative.id}`}
      className="block bg-[#181818] border border-[#2A2A2A] rounded-xl p-4 hover:border-white/30 hover:shadow-[var(--shadow-soft)] transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-[#E5E5EA] truncate">
            {initiative.name}
          </div>
          <div className="text-[11px] text-[#71757D] mt-0.5">
            {firstName(initiative.owner)} · {timeAgo(last)}
          </div>
        </div>
        <TypeBadge type={initiative.type} />
      </div>
      <ProgressBar pct={pct} />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-[#71757D]">
          {done} of {total} sub-points
        </span>
        {stale ? (
          <span className="text-[11px] font-semibold text-[#B22B2B] uppercase tracking-wider">
            Stale
          </span>
        ) : (
          <span className="text-[11px] font-medium text-[#E5E5EA] tabular-nums">
            {pct}%
          </span>
        )}
      </div>
    </Link>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  return (
    <Link
      href={`/rd/ideas/${idea.id}`}
      className="block bg-[#181818] border border-[#2A2A2A] rounded-lg p-3 hover:border-white/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-[14px] font-medium text-[#E5E5EA] flex-1 min-w-0">
          {idea.title}
        </div>
        <div className="text-[11px] text-[#71757D] shrink-0">
          {firstName(idea.submitted_by)} · {timeAgo(idea.created_at)}
        </div>
      </div>
      {idea.why && (
        <p className="text-[13px] text-[#C7C9CD] leading-relaxed line-clamp-2">
          {idea.why}
        </p>
      )}
      {idea.type && (
        <div className="mt-2">
          <TypeBadge type={idea.type} size="sm" />
        </div>
      )}
    </Link>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { label: string; onClick: () => void };
}) {
  return (
    <div className="bg-[#0C0C0C] border border-dashed border-[#2A2A2A] rounded-2xl p-10 text-center">
      <div className="text-[15px] font-medium text-[#E5E5EA] mb-1">{title}</div>
      <div className="text-[13px] text-[#71757D] mb-5">{body}</div>
      <button
        onClick={cta.onClick}
        className="inline-flex items-center px-4 py-2 bg-[#E5E5EA] text-[#181818] text-[13px] font-medium rounded-lg hover:bg-white transition-colors"
      >
        {cta.label}
      </button>
    </div>
  );
}
