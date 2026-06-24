"use client";

// My Tasks - a kanban view of every deliverable assigned to the logged-in
// person, across all clients. Mirrors the /kanban visual language (column
// chrome, border-tinted cards, drag-and-drop) but the columns map to
// TaskStatus instead of phase, and the data comes from Supabase via
// useWorkspaceData. Replaces the old grouped-list "My Work".

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useWorkspaceData, todayYMD } from "@/lib/workspace/use-workspace-data";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { useCurrentUser } from "@/components/auth-gate";
import {
  formatDue,
  type DeadlineState,
} from "@/lib/workspace/derive";
import {
  buildMyWorkIdentity,
  classifyClientsForUser,
  dragActionFor,
  type ClassifiedCard,
  type MyWorkLane,
  type MyWorkRole,
} from "@/lib/my-work/classify";
import { getPods as getPodsV2 } from "@/lib/pods-v2/data";
import type { Pod as PodV2 } from "@/lib/pods-v2/types";
import type { PodMember } from "@/lib/pods-v2/types";

const VIEW_AS_KEY = "launchpad-my-tasks-view-as";

type TaskStatus = MyWorkLane;

const ROLE_LABEL: Record<MyWorkRole, string> = {
  senior_designer: "Designer",
  junior_designer: "Designer (jnr)",
  senior_developer: "Developer",
  junior_developer: "Developer (jnr)",
  strategist: "Strategist",
};
const ROLE_DOT: Record<MyWorkRole, string> = {
  senior_designer: "#3B82F6",
  junior_designer: "#3B82F6",
  senior_developer: "#10B981",
  junior_developer: "#10B981",
  strategist: "#8B5CF6",
};

interface MyItem {
  id: string;             // synthetic = card.id + role (one card may surface twice)
  cardId: string;
  classified: ClassifiedCard;
  clientId: string;
  clientName: string;
  projectName: string;
  title: string;
  lane: MyWorkLane;
  role: MyWorkRole;
  state: DeadlineState;
  dueDate: string;
}

// Border + tint per deadline state. Overdue red, soon amber, everything else
// quiet - mirrors the kanban's STUCK_STYLES philosophy (one signal, no flood).
const STATE_STYLE: Record<DeadlineState, { ring: string; bg: string }> = {
  overdue: { ring: "border-red-500/70", bg: "bg-red-500/10" },
  soon: { ring: "border-amber-500/60", bg: "bg-amber-500/10" },
  ontrack: { ring: "border-[#2A2A2A]", bg: "bg-[#181818]" },
  done: { ring: "border-[#2A2A2A]", bg: "bg-[#181818]" },
  awaiting_approval: { ring: "border-[#2A2A2A]", bg: "bg-[#181818]" },
  paused: { ring: "border-[#2A2A2A]", bg: "bg-[#181818]" },
};

const COLUMNS: { key: TaskStatus; label: string; dot: string }[] = [
  { key: "todo", label: "Todo", dot: "#9CA3AF" },
  { key: "in_progress", label: "In progress", dot: "#F59E0B" },
  { key: "done", label: "Done", dot: "#10B981" },
];

/* Quick deadline state from a card's dueDate. Three buckets:
 *   overdue  - dueDate before today
 *   soon     - within 3 days
 *   ontrack  - anything else (incl. no dueDate)
 * Lighter than the kanban's full status engine; my-work only needs
 * to flag what's slipping. */
function deriveState(dueDate: string | undefined, todayYMD: string): DeadlineState {
  if (!dueDate) return "ontrack";
  if (dueDate < todayYMD) return "overdue";
  const due = new Date(dueDate);
  const t = new Date(todayYMD);
  const diff = (due.getTime() - t.getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 3) return "soon";
  return "ontrack";
}

// Sort within column: overdue first, then soon, then by due date, then title.
const STATE_RANK: Record<DeadlineState, number> = {
  overdue: 0,
  soon: 1,
  ontrack: 2,
  awaiting_approval: 3,
  paused: 4,
  done: 5,
};

export default function MyWorkClient() {
  const me = useCurrentUser();
  const data = useWorkspaceData();
  const today = todayYMD();

  // Real pod members flattened from every pod - used both for the "view as"
  // picker and for resolving a friendly name for the active member.
  const allMembers: PodMember[] = useMemo(() => {
    const seen = new Set<string>();
    const out: PodMember[] = [];
    for (const p of data.pods) {
      for (const m of p.members) {
        if (m.is_placeholder) continue;
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        out.push(m);
      }
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [data.pods]);

  // Auth-resolved member id (magic-link sessions). Shared-password admin
  // sessions land here as null and fall through to the picker.
  const authMemberId = me?.pod_member_id ?? null;

  const [pickedMemberId, setPickedMemberId] = useState<string | null>(null);

  // Restore the picker's last selection on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(VIEW_AS_KEY);
    if (saved) setPickedMemberId(saved);
  }, []);

  function pickMember(id: string) {
    setPickedMemberId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_AS_KEY, id);
    }
  }

  // Active member: prefer the auth-resolved id (it's authoritative), fall back
  // to the picker. Validate the picked id against the real member list so a
  // stale localStorage value doesn't render empty.
  const memberId = useMemo(() => {
    if (authMemberId) return authMemberId;
    if (pickedMemberId && allMembers.some((m) => m.id === pickedMemberId)) {
      return pickedMemberId;
    }
    return null;
  }, [authMemberId, pickedMemberId, allMembers]);

  const activeMember = useMemo(
    () => allMembers.find((m) => m.id === memberId) ?? null,
    [allMembers, memberId],
  );

  /* Kanban data is the source of truth for cards. The classifier
   * matches them to the active user by name + role and assigns a
   * lane. */
  const { clients: kanbanClients, setClients: setKanbanClients } = useKanbanData();

  /* pods-v2 snapshot for strategist scope detection (the kanban's
   * MockPod doesn't carry role metadata). */
  const [podsV2, setPodsV2] = useState<PodV2[]>([]);
  useEffect(() => {
    setPodsV2(getPodsV2());
  }, []);

  const displayNameForClassify =
    me?.name ??
    activeMember?.name ??
    null;

  const identity = useMemo(
    () => buildMyWorkIdentity(displayNameForClassify ?? undefined, podsV2),
    [displayNameForClassify, podsV2],
  );

  const items: MyItem[] = useMemo(() => {
    if (!identity) return [];
    const classified = classifyClientsForUser(kanbanClients, identity);
    return classified.map((c) => ({
      id: `${c.card.id}::${c.role}`,
      cardId: c.card.id,
      classified: c,
      clientId: c.clientId,
      clientName: c.clientName,
      projectName: c.projectName,
      title: c.card.title,
      lane: c.lane,
      role: c.role,
      state: deriveState(c.card.dueDate, today),
      dueDate: c.card.dueDate ?? "",
    }));
  }, [identity, kanbanClients, today]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const itemsByCol = useMemo(() => {
    const map: Record<TaskStatus, MyItem[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const it of items) {
      map[it.lane].push(it);
    }
    for (const k of Object.keys(map) as TaskStatus[]) {
      map[k].sort((a, b) => {
        const sa = STATE_RANK[a.state];
        const sb = STATE_RANK[b.state];
        if (sa !== sb) return sa - sb;
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return a.title.localeCompare(b.title);
      });
    }
    return map;
  }, [items]);

  /* Drag handler. Translates a my-work lane move into the kanban
   * transition that backs it (phase move or revision-flag patch).
   * setKanbanClients fires syncClientsDiff so the change persists to
   * Supabase + Realtime broadcasts to other open sessions. */
  function moveTask(itemId: string, target: TaskStatus) {
    const it = items.find((x) => x.id === itemId);
    if (!it || it.lane === target) return;
    const action = dragActionFor(it.classified, target);
    if (action.kind === "noop") {
      if (action.reason !== "no kanban action for start") {
        console.info("[my-work] drag no-op:", action.reason);
      }
      return;
    }
    setKanbanClients((prev) =>
      prev.map((client) => ({
        ...client,
        projects: client.projects.map((p) => ({
          ...p,
          deliverables: p.deliverables.map((d) => {
            if (d.id !== it.cardId) return d;
            if (action.kind === "patch") return { ...d, ...action.patch };
            if (action.kind === "phase_move") {
              const enteredAt = today;
              return {
                ...d,
                phase: action.phase,
                phaseHistory: [
                  ...(d.phaseHistory ?? []),
                  { phase: action.phase, enteredAt },
                ],
                /* Clear revision_requested when moving forward so the
                 * card doesn't carry a stale kickback flag into the
                 * next phase. */
                revisionRequested: false,
              };
            }
            return d;
          }),
        })),
      })),
    );
  }

  // Title resolves from the auth user first (when signed in by email), then
  // the picked member's name (admin "view as"), then a neutral fallback.
  // Computed BEFORE early returns so the revisionCards useMemo (and any
  // other hook below) runs in a stable order across renders.
  const displayName = me?.name ?? activeMember?.name ?? null;

  /* Kanban "Revisions needed" callout - matches by display name
   * against the four kanban assignee slots. Lives above the early
   * returns so the hook order stays stable when memberId toggles. */
  const revisionCards = useMemo(() => {
    if (!displayName) return [] as { id: string; title: string; client: string }[];
    const needle = displayName.trim().toLowerCase();
    const matches: { id: string; title: string; client: string }[] = [];
    for (const c of kanbanClients) {
      for (const p of c.projects) {
        for (const d of p.deliverables) {
          if (!d.revisionRequested) continue;
          const names = [
            d.designer,
            d.secondaryDesigner,
            d.developer,
            d.secondaryDeveloper,
          ]
            .filter(Boolean)
            .map((n) => n!.trim().toLowerCase());
          if (names.includes(needle)) {
            matches.push({ id: d.id, title: d.title, client: c.name });
          }
        }
      }
    }
    return matches;
  }, [kanbanClients, displayName]);

  if (data.loading) {
    return (
      <div className="px-4 sm:px-6 py-8">
        <div className="h-96 animate-pulse rounded-2xl bg-[#181818]" />
      </div>
    );
  }

  // Shared-password admin with no linked identity AND nothing picked yet:
  // surface the picker as the primary action instead of dead-ending in a CTA.
  if (!memberId) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#E5E5EA]">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#71757D]">
            My Tasks
          </p>
          <h1 className="mt-2 text-[28px] leading-tight">
            <span className="font-bold">Pick a person to view</span>{" "}
            <span className="font-normal text-[#71757D]">
              — this session isn&apos;t linked to a pod member
            </span>
          </h1>
          <p className="mt-3 text-sm text-[#9CA3AF]">
            You&apos;re signed in with the shared admin code, which doesn&apos;t
            identify a single person. Pick someone to see their kanban, or sign
            in by email to land here directly.
          </p>
          {allMembers.length === 0 ? (
            <p className="mt-6 text-sm text-[#71757D]">
              No pod members yet. Add some in Workspace.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => pickMember(m.id)}
                  className="text-left px-3.5 py-3 rounded-lg bg-[#181818] border border-[#2A2A2A] hover:border-[#383838] hover:bg-[#222222] transition-colors"
                >
                  <div className="text-sm font-semibold text-[#E5E5EA]">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-[#71757D] mt-0.5 capitalize">
                    {m.role.replace(/_/g, " ")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const open = items.filter((d) => d.lane !== "done");
  const overdueCount = open.filter((d) => d.state === "overdue").length;
  const soonCount = open.filter((d) => d.state === "soon").length;
  const firstName = displayName?.split(/\s+/)[0];
  // Show the "view as" picker whenever the active member came from the picker
  // (i.e. there's no auth-resolved identity to lock it down).
  const showPicker = !authMemberId;

  return (
    <div className="min-h-screen bg-[#080808] text-[#E5E5EA]">
      <div className="mx-auto px-4 sm:px-6 py-8">
        {/* Header — same eyebrow + bold-title pattern as /kanban */}
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#71757D]">
              {showPicker ? "My Tasks · Viewing as" : "My Tasks · Assigned to me"}
            </p>
            <h1 className="mt-2 text-[28px] leading-tight">
              <span className="font-bold text-[#E5E5EA]">
                {firstName ? `${firstName}'s tasks` : "My tasks"}
              </span>{" "}
              <span className="font-normal text-[#71757D]">
                across every client
              </span>
            </h1>
            {showPicker && (
              <div className="mt-3 relative inline-block">
                <select
                  value={memberId ?? ""}
                  onChange={(e) => pickMember(e.target.value)}
                  className="appearance-none text-xs font-medium pl-3 pr-8 py-1.5 bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] rounded-full focus:outline-none focus:border-[#383838] cursor-pointer"
                >
                  {allMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="size-3 text-[#71757D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#71757D] tabular-nums shrink-0">
            {open.length} open
            {overdueCount > 0 && (
              <>
                {" · "}
                <span className="text-red-400">{overdueCount} overdue</span>
              </>
            )}
            {soonCount > 0 && (
              <>
                {" · "}
                <span className="text-amber-400">{soonCount} due soon</span>
              </>
            )}
          </p>
        </div>

        {revisionCards.length > 0 && (
          <Link
            href="/kanban"
            className="group mb-6 flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 transition-colors hover:border-orange-500/50 hover:bg-orange-500/10"
          >
            <ExclamationTriangleIcon className="size-5 text-orange-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[#E5E5EA]">
                {revisionCards.length === 1
                  ? "1 kanban card needs revisions from you"
                  : `${revisionCards.length} kanban cards need revisions from you`}
              </div>
              <div className="mt-0.5 text-[12px] text-[#9CA3AF] truncate">
                {revisionCards
                  .slice(0, 3)
                  .map((r) => `${r.title} - ${r.client}`)
                  .join(" · ")}
                {revisionCards.length > 3
                  ? ` · +${revisionCards.length - 3} more`
                  : ""}
              </div>
            </div>
            <span className="self-center text-[11px] font-semibold uppercase tracking-wider text-orange-400 group-hover:text-orange-300 shrink-0">
              Open kanban →
            </span>
          </Link>
        )}

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COLUMNS.map((col) => {
            const cards = itemsByCol[col.key] ?? [];
            const isDropTarget = dragOverCol === col.key && draggingId !== null;
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  if (!draggingId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverCol !== col.key) setDragOverCol(col.key);
                }}
                onDragLeave={(e) => {
                  const related = e.relatedTarget as Node | null;
                  if (
                    !related ||
                    !(e.currentTarget as Node).contains(related)
                  ) {
                    if (dragOverCol === col.key) setDragOverCol(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id =
                    e.dataTransfer.getData("text/plain") || draggingId;
                  if (id) moveTask(id, col.key);
                  setDragOverCol(null);
                  setDraggingId(null);
                }}
                className={`rounded-xl flex flex-col transition-colors ${
                  isDropTarget
                    ? "bg-[#222222] border-2 border-dashed border-[#9CA3AF]"
                    : "bg-[#181818] border border-[#2A2A2A]"
                }`}
              >
                {/* Column header */}
                <div className="px-3.5 py-3 border-b border-[#2A2A2A]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="shrink-0 size-2 rounded-full"
                        style={{ background: col.dot }}
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#E5E5EA] truncate">
                        {col.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[#71757D] tabular-nums shrink-0">
                      {cards.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-2.5 space-y-2.5 flex-1 min-h-[60vh]">
                  {cards.length === 0 ? (
                    <p className="text-[11px] text-[#4B4D52] text-center py-6">
                      &mdash;
                    </p>
                  ) : (
                    cards.map((d) => {
                      const style = STATE_STYLE[d.state];
                      const isDragging = draggingId === d.id;
                      const dueLabel = d.dueDate ? formatDue(d.dueDate) : "No due date";
                      const dueTone =
                        d.state === "overdue"
                          ? "text-red-400"
                          : d.state === "soon"
                            ? "text-amber-400"
                            : "text-[#71757D]";
                      return (
                        <div
                          key={d.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", d.id);
                            setDraggingId(d.id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverCol(null);
                          }}
                          className={`p-3.5 border rounded-lg ${style.ring} ${style.bg} cursor-grab active:cursor-grabbing hover:border-[#383838] transition-all ${
                            isDragging ? "opacity-40 scale-[0.98]" : ""
                          }`}
                        >
                          {/* Header row — client name (subtle, links to workspace) */}
                          <div className="mb-2.5">
                            <Link
                              href={`/workspace/clients/${d.clientId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-bold uppercase tracking-wider text-[#E5E5EA] hover:text-white transition-colors truncate block"
                            >
                              {d.clientName}
                            </Link>
                            <span className="text-[10px] text-[#71757D] truncate block mt-0.5">
                              {d.projectName}
                            </span>
                          </div>

                          {/* Title */}
                          <p
                            className={`text-[14px] font-semibold leading-tight ${
                              d.lane === "done"
                                ? "text-[#9CA3AF] line-through"
                                : "text-[#E5E5EA]"
                            }`}
                          >
                            {d.title}
                          </p>

                          {/* Footer — role + due. Role chip tells the
                            * user which hat the card is in (senior vs
                            * junior designer/dev, strategist) so a
                            * card surfacing twice for cross-role users
                            * is unambiguous. */}
                          <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1.5 text-[#9CA3AF]">
                              <span
                                className="size-1.5 rounded-full"
                                style={{ background: ROLE_DOT[d.role] }}
                              />
                              {ROLE_LABEL[d.role]}
                            </span>
                            <span
                              className={`tabular-nums font-medium ${dueTone}`}
                            >
                              {dueLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
