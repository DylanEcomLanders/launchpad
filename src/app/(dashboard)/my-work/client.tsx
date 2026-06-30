"use client";

// My Tasks - a kanban view of every deliverable assigned to the logged-in
// person, across all clients. Mirrors the /kanban visual language (column
// chrome, border-tinted cards, drag-and-drop) but the columns map to
// TaskStatus instead of phase, and the data comes from Supabase via
// useWorkspaceData. Replaces the old grouped-list "My Work".

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDownIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useWorkspaceData, todayYMD } from "@/lib/workspace/use-workspace-data";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import type { MockDeliverable, MockProject } from "@/lib/projects/mock-data";
import { useCurrentUser, useRole } from "@/components/auth-gate";
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
  ontrack: { ring: "border-border", bg: "bg-surface" },
  done: { ring: "border-border", bg: "bg-surface" },
  awaiting_approval: { ring: "border-border", bg: "bg-surface" },
  paused: { ring: "border-border", bg: "bg-surface" },
};

const COLUMNS: { key: TaskStatus; label: string; dot: string }[] = [
  { key: "todo", label: "Todo", dot: "#9CA3AF" },
  { key: "in_progress", label: "In progress", dot: "#F59E0B" },
  { key: "done", label: "Done", dot: "#10B981" },
];

/* Tightened deadline state - matches the kanban's deadlineStatus rule:
 *   overdue  - today > due (any day past)
 *   soon     - today === due (day-of)
 *   ontrack  - today < due (yesterday or earlier)
 * No buffer - day-after-due is red. */
function deriveState(dueDate: string | undefined, todayYMD: string): DeadlineState {
  if (!dueDate) return "ontrack";
  if (dueDate < todayYMD) return "overdue";
  if (dueDate === todayYMD) return "soon";
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
  const role = useRole();
  /* Non-member roles (admin / cro) can "view as" anyone for oversight -
   * e.g. Archie, Head of Development, checking his team's tasks. Members
   * stay locked to their own assigned work so they can't snoop. */
  const canViewAs = role !== "team";
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
    if (canViewAs) {
      /* View-as roles: an explicit pick wins, so a lead can flip to a
       * report and back. With no pick they fall through to their own
       * auth-resolved identity (their own tasks by default), then to
       * null for shared-password admin sessions until they pick. */
      if (pickedMemberId && allMembers.some((m) => m.id === pickedMemberId)) {
        return pickedMemberId;
      }
      return authMemberId;
    }
    /* Members: always their own auth identity. Never honour a stored
     * pick, so they can't peek at anyone else. */
    return authMemberId;
  }, [authMemberId, pickedMemberId, allMembers, canViewAs]);

  const activeMember = useMemo(
    () => allMembers.find((m) => m.id === memberId) ?? null,
    [allMembers, memberId],
  );

  /* Kanban data is the source of truth for cards. The classifier
   * matches them to the active user by name + role and assigns a
   * lane. */
  const { clients: kanbanClients, setClients: setKanbanClients, pods: kanbanPods } = useKanbanData();

  /* pods-v2 snapshot for strategist scope detection (the kanban's
   * MockPod doesn't carry role metadata). */
  const [podsV2, setPodsV2] = useState<PodV2[]>([]);
  useEffect(() => {
    setPodsV2(getPodsV2());
  }, []);

  /* For view-as roles the active member (their own by default, or the
   * one they picked) drives classification - otherwise a logged-in
   * admin's own name would always win and the picker would be inert.
   * Members always classify by their own auth identity. */
  const displayNameForClassify = canViewAs
    ? (activeMember?.name ?? me?.name ?? null)
    : (me?.name ?? activeMember?.name ?? null);

  const identity = useMemo(
    () => buildMyWorkIdentity(displayNameForClassify ?? undefined, podsV2),
    [displayNameForClassify, podsV2],
  );

  const items: MyItem[] = useMemo(() => {
    if (!identity) return [];
    const classified = classifyClientsForUser(kanbanClients, identity, kanbanPods);
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
  }, [identity, kanbanClients, kanbanPods, today]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  /* In-place card popup. Click any card → opens a modal showing the
   * key context + lane-move buttons. Avoids losing /my-work to a
   * deep-link into /kanban. */
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const openItem = openItemId
    ? items.find((x) => x.id === openItemId) ?? null
    : null;
  /* Resolve the project for the open card so the popup can read +
   * write project-level brief/figmaUrl. Project-level so the brief
   * the strategist writes is visible on every card in that project
   * (designer, dev, QA, launch). */
  const openProject = openItem
    ? kanbanClients
        .find((c) => c.id === openItem.clientId)
        ?.projects.find((p) => p.id === openItem.classified.projectId) ?? null
    : null;

  /* Search filter + done-cap. itemsByCol returns BOTH the filtered
   * cards (for rendering) AND the unfiltered total counts (for the
   * "X / Y" display when filtered) so the user knows how much they're
   * hiding. */
  const [search, setSearch] = useState("");

  /* Resolve display name eagerly (before any pin/keyboard state
   * that needs it). Title resolves from auth user first (email
   * signin), then the picked member's name (admin "view as"), then
   * neutral fallback. */
  const displayName = canViewAs
    ? (activeMember?.name ?? me?.name ?? null)
    : (me?.name ?? activeMember?.name ?? null);

  /* Pin / star priority - per-user, localStorage-backed. Pinned
   * cards bubble to the top of each lane. Keyed by display name so
   * Aanchal's pins don't show up for Barnaby etc. */
  const pinStorageKey = `mywork-pins:${(displayName ?? "anon").toLowerCase()}`;
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(pinStorageKey);
      if (raw) setPinnedIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore corrupted storage */
    }
  }, [pinStorageKey]);
  function togglePin(cardId: string) {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      try {
        window.localStorage.setItem(pinStorageKey, JSON.stringify(Array.from(next)));
      } catch {
        /* storage full or disabled - keep state in-memory anyway */
      }
      return next;
    });
  }

  /* Group view toggle - flips from the 3-column lane kanban into a
   * flat list grouped by client. Lets a designer see all their Brly
   * cards together when context-switching. Persists in localStorage
   * so the user's preference sticks across reloads. */
  const [viewMode, setViewMode] = useState<"lanes" | "by-client">("lanes");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("mywork-view-mode");
    if (stored === "by-client" || stored === "lanes") setViewMode(stored);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("mywork-view-mode", viewMode);
  }, [viewMode]);

  /* Focused card id for keyboard navigation. Declared here so it's
   * available before itemsByCol; the keyboard handler itself runs
   * after itemsByCol is computed (further down). */
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  /* 7-day cap on the Done lane - keeps the column from growing
   * forever. Computed as ISO yyyy-mm-dd against the deliverable's
   * completedAt / approvedAt where available, otherwise just the
   * card's dueDate. */
  const doneCutoffISO = useMemo(() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  }, [today]);

  const itemsByCol = useMemo(() => {
    const map: Record<TaskStatus, MyItem[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    const totals: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      done: 0,
    };
    const needle = search.trim().toLowerCase();
    for (const it of items) {
      /* Done-cap: drop done cards older than 7 days from view. They
       * still exist in the underlying kanban data, just not on
       * /my-work. Uses completedAt > approvedAt > dueDate as the
       * "when did this finish" signal. */
      if (it.lane === "done") {
        const finishedAt =
          it.classified.card.completedAt ||
          it.classified.card.approvedAt ||
          it.dueDate;
        if (finishedAt && finishedAt.slice(0, 10) < doneCutoffISO) continue;
      }
      totals[it.lane]++;
      /* Search: title + client + project, case-insensitive. */
      if (needle) {
        const hay = `${it.title} ${it.clientName} ${it.projectName}`.toLowerCase();
        if (!hay.includes(needle)) continue;
      }
      map[it.lane].push(it);
    }
    for (const k of Object.keys(map) as TaskStatus[]) {
      map[k].sort((a, b) => {
        /* Pinned items always bubble to top, regardless of state. */
        const pa = pinnedIds.has(a.cardId) ? 0 : 1;
        const pb = pinnedIds.has(b.cardId) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        const sa = STATE_RANK[a.state];
        const sb = STATE_RANK[b.state];
        if (sa !== sb) return sa - sb;
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return a.title.localeCompare(b.title);
      });
    }
    return { cards: map, totals };
  }, [items, search, doneCutoffISO, pinnedIds]);

  /* Keyboard navigation - j/k move focus through visible cards
   * (top-to-bottom column-major), enter opens the focused card,
   * 1/2/3 move it to Todo/In progress/Done, p toggles pin.
   * Disabled when typing in an input or when the popup is open. */
  const flatFocusOrder = useMemo(() => {
    const order: string[] = [];
    for (const k of ["todo", "in_progress", "done"] as TaskStatus[]) {
      for (const it of itemsByCol.cards[k] ?? []) order.push(it.id);
    }
    return order;
  }, [itemsByCol]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    function isTyping(t: EventTarget | null) {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        t.isContentEditable
      );
    }
    function handler(e: KeyboardEvent) {
      if (openItemId) return;
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const order = flatFocusOrder;
      if (order.length === 0) return;
      const currentIdx = focusedItemId ? order.indexOf(focusedItemId) : -1;
      if (e.key === "j") {
        e.preventDefault();
        const next = currentIdx < 0 ? 0 : Math.min(order.length - 1, currentIdx + 1);
        setFocusedItemId(order[next]);
      } else if (e.key === "k") {
        e.preventDefault();
        const next = currentIdx < 0 ? 0 : Math.max(0, currentIdx - 1);
        setFocusedItemId(order[next]);
      } else if (e.key === "Enter" && focusedItemId) {
        e.preventDefault();
        setOpenItemId(focusedItemId);
      } else if (e.key === "1" && focusedItemId) {
        e.preventDefault();
        moveTask(focusedItemId, "todo");
      } else if (e.key === "2" && focusedItemId) {
        e.preventDefault();
        moveTask(focusedItemId, "in_progress");
      } else if (e.key === "3" && focusedItemId) {
        e.preventDefault();
        moveTask(focusedItemId, "done");
      } else if (e.key === "p" && focusedItemId) {
        e.preventDefault();
        const cardId = items.find((x) => x.id === focusedItemId)?.cardId;
        if (cardId) togglePin(cardId);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openItemId, focusedItemId, flatFocusOrder, items]);

  /* Drag handler. Translates a my-work lane move into the kanban
   * transition that backs it (phase move or revision-flag patch).
   * setKanbanClients fires syncClientsDiff so the change persists to
   * Supabase + Realtime broadcasts to other open sessions. */
  /* Project-level patch - merges fields onto the matching project
   * and writes through setKanbanClients (syncs to Supabase + Realtime
   * broadcasts). Used by the in-place popup to edit project.brief +
   * project.figmaUrl, which then propagate to every card on the
   * project. */
  function patchProject(projectId: string, patch: Partial<MockProject>) {
    setKanbanClients((prev) =>
      prev.map((client) => ({
        ...client,
        projects: client.projects.map((p) =>
          p.id === projectId ? { ...p, ...patch } : p,
        ),
      })),
    );
  }

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
        <div className="h-96 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  // Shared-password admin with no linked identity AND nothing picked yet:
  // surface the picker as the primary action instead of dead-ending in a CTA.
  if (!memberId) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
            My Tasks
          </p>
          <h1 className="mt-2 text-[28px] leading-tight">
            <span className="font-bold">Pick a person to view</span>{" "}
            <span className="font-normal text-subtle">
              — this session isn&apos;t linked to a pod member
            </span>
          </h1>
          <p className="mt-3 text-sm text-muted">
            You&apos;re signed in with the shared admin code, which doesn&apos;t
            identify a single person. Pick someone to see their kanban, or sign
            in by email to land here directly.
          </p>
          {allMembers.length === 0 ? (
            <p className="mt-6 text-sm text-subtle">
              No pod members yet. Add some in Workspace.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => pickMember(m.id)}
                  className="text-left px-3.5 py-3 rounded-lg bg-surface border border-border hover:border-border hover:bg-surface-raised transition-colors"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-subtle mt-0.5 capitalize">
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
  // The "view as" picker is for oversight - admin/cro only. Members
  // never see it; they only ever see their own assigned tasks.
  const showPicker = canViewAs;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto px-4 sm:px-6 py-8">
        {/* Header — same eyebrow + bold-title pattern as /kanban */}
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
              {showPicker ? "My Tasks · Viewing as" : "My Tasks · Assigned to me"}
            </p>
            <h1 className="mt-2 text-[28px] leading-tight">
              <span className="font-bold text-foreground">
                {firstName ? `${firstName}'s tasks` : "My tasks"}
              </span>{" "}
              <span className="font-normal text-subtle">
                across every client
              </span>
            </h1>
            {showPicker && (
              <div className="mt-3">
                <ViewAsPicker
                  members={allMembers}
                  activeId={memberId}
                  onPick={pickMember}
                />
              </div>
            )}
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-subtle tabular-nums shrink-0">
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
              <div className="text-sm font-semibold text-foreground">
                {revisionCards.length === 1
                  ? "1 kanban card needs revisions from you"
                  : `${revisionCards.length} kanban cards need revisions from you`}
              </div>
              <div className="mt-0.5 text-[12px] text-muted truncate">
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

        {/* Search bar + view-mode toggle. Lane counts show
          * "filtered / total" so users see how much they're hiding.
          * View toggle flips between 3-lane kanban and a flat list
          * grouped by client. Keyboard shortcuts: j/k navigate,
          * enter open, 1/2/3 move lane, p pin. */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-subtle pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your tasks (title, client, project) · j/k navigate · enter open · 1/2/3 move · p pin"
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-surface border border-border rounded-lg text-foreground placeholder:text-subtle focus:outline-none focus:border-border"
            />
          </div>
          <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setViewMode("lanes")}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                viewMode === "lanes"
                  ? "bg-border text-foreground"
                  : "text-subtle hover:text-foreground"
              }`}
            >
              Lanes
            </button>
            <button
              onClick={() => setViewMode("by-client")}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                viewMode === "by-client"
                  ? "bg-border text-foreground"
                  : "text-subtle hover:text-foreground"
              }`}
            >
              By client
            </button>
          </div>
        </div>

        {/* Columns - only in Lanes mode. By-client renders below. */}
        {viewMode === "lanes" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COLUMNS.map((col) => {
            const cards = itemsByCol.cards[col.key] ?? [];
            const total = itemsByCol.totals[col.key] ?? 0;
            const isFiltered = search.trim().length > 0;
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
                    ? "bg-surface-raised border-2 border-dashed border-muted"
                    : "bg-surface border border-border"
                }`}
              >
                {/* Column header */}
                <div className="px-3.5 py-3 border-b border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="shrink-0 size-2 rounded-full"
                        style={{ background: col.dot }}
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">
                        {col.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-subtle tabular-nums shrink-0">
                      {isFiltered && cards.length !== total
                        ? `${cards.length} / ${total}`
                        : total}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-2.5 space-y-2.5 flex-1 min-h-[60vh]">
                  {cards.length === 0 ? (
                    <p className="text-[11px] text-border text-center py-8 px-3 leading-relaxed">
                      {isFiltered && total > 0
                        ? `No matches for "${search.trim()}" in this lane`
                        : col.key === "todo"
                          ? "Nothing to start"
                          : col.key === "in_progress"
                            ? "Nothing in progress"
                            : "Nothing finished in the last 7 days"}
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
                            : "text-subtle";
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
                          /* Click anywhere on the card opens an
                           * in-place popup with title, context, and
                           * the lane actions. Avoids losing the
                           * /my-work view to a /kanban navigate. */
                          onClick={() => setOpenItemId(d.id)}
                          className={`group relative p-3.5 border rounded-lg ${style.ring} ${style.bg} cursor-pointer hover:border-border transition-all ${
                            isDragging ? "opacity-40 scale-[0.98]" : ""
                          } ${
                            focusedItemId === d.id
                              ? "ring-2 ring-muted/60 ring-offset-2 ring-offset-background"
                              : ""
                          }`}
                        >
                          {/* Hand-off / kickback dot - top-right of the
                            * card when revisionRequested. Mirrors the
                            * red dot on /kanban. */}
                          {d.classified.card.revisionRequested && (
                            <span
                              className="absolute top-2 right-2 size-2 rounded-full bg-rose-500"
                              title="Kicked back from internal revisions"
                            />
                          )}
                          {/* Pin star - small button top-right. Pinned
                            * cards bubble to the top of the lane. */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(d.cardId);
                            }}
                            title={pinnedIds.has(d.cardId) ? "Unpin" : "Pin to top"}
                            className={`absolute top-2 ${
                              d.classified.card.revisionRequested ? "right-6" : "right-2"
                            } text-[14px] leading-none transition-colors ${
                              pinnedIds.has(d.cardId)
                                ? "text-amber-400 hover:text-amber-300"
                                : "text-border opacity-0 group-hover:opacity-100 hover:text-subtle"
                            }`}
                          >
                            {pinnedIds.has(d.cardId) ? "★" : "☆"}
                          </button>
                          {/* Header row — client name (subtle, links to workspace) */}
                          <div className="mb-2.5 pr-8">
                            <Link
                              href={`/workspace/clients/${d.clientId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-bold uppercase tracking-wider text-foreground hover:text-white transition-colors truncate block"
                            >
                              {d.clientName}
                            </Link>
                            <span className="text-[10px] text-subtle truncate block mt-0.5">
                              {d.projectName}
                            </span>
                          </div>

                          {/* Title */}
                          <p
                            className={`text-[14px] font-semibold leading-tight ${
                              d.lane === "done"
                                ? "text-muted line-through"
                                : "text-foreground"
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
                            <span className="inline-flex items-center gap-1.5 text-muted">
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
        )}

        {/* By-client grouped view - flat list, sections per client.
          * Pinned cards bubble to the top within each client. */}
        {viewMode === "by-client" && (
          <div className="space-y-6">
            {(() => {
              const byClient = new Map<
                string,
                { clientName: string; clientId: string; items: MyItem[] }
              >();
              const ordered: MyItem[] = [];
              for (const k of ["todo", "in_progress", "done"] as TaskStatus[]) {
                for (const it of itemsByCol.cards[k] ?? []) ordered.push(it);
              }
              for (const it of ordered) {
                const bucket = byClient.get(it.clientId) ?? {
                  clientName: it.clientName,
                  clientId: it.clientId,
                  items: [],
                };
                bucket.items.push(it);
                byClient.set(it.clientId, bucket);
              }
              const clients = Array.from(byClient.values());
              if (clients.length === 0) {
                return (
                  <p className="text-center text-[12px] text-subtle py-8">
                    {search.trim()
                      ? `No matches for "${search.trim()}"`
                      : "No tasks yet"}
                  </p>
                );
              }
              return clients.map((c) => (
                <div key={c.clientId}>
                  <div className="flex items-center justify-between mb-2">
                    <Link
                      href={`/workspace/clients/${c.clientId}`}
                      className="text-[11px] font-bold uppercase tracking-wider text-foreground hover:text-white"
                    >
                      {c.clientName}
                    </Link>
                    <span className="text-[11px] text-subtle tabular-nums">
                      {c.items.length} {c.items.length === 1 ? "task" : "tasks"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {c.items.map((d) => {
                      const dueLabel = d.dueDate ? formatDue(d.dueDate) : "—";
                      const dueTone =
                        d.state === "overdue"
                          ? "text-red-400"
                          : d.state === "soon"
                            ? "text-amber-400"
                            : "text-subtle";
                      const isPinned = pinnedIds.has(d.cardId);
                      const isKickback = d.classified.card.revisionRequested;
                      const laneLabel =
                        d.lane === "todo"
                          ? "Todo"
                          : d.lane === "in_progress"
                            ? "In progress"
                            : "Done";
                      return (
                        <button
                          key={d.id}
                          onClick={() => setOpenItemId(d.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left bg-surface border border-border rounded-md hover:border-border transition-colors ${
                            d.lane === "done"
                              ? "opacity-60"
                              : ""
                          }`}
                        >
                          {isPinned && (
                            <span
                              className="size-1.5 rounded-full bg-amber-400 shrink-0"
                              title="Pinned"
                            />
                          )}
                          {isKickback && (
                            <span
                              className="size-1.5 rounded-full bg-rose-400 shrink-0"
                              title="Kicked back"
                            />
                          )}
                          <span className="text-[12px] text-subtle uppercase tracking-wider w-[80px] shrink-0">
                            {laneLabel}
                          </span>
                          <span
                            className={`text-[13px] flex-1 min-w-0 truncate ${
                              d.lane === "done"
                                ? "text-subtle line-through"
                                : "text-foreground"
                            }`}
                          >
                            {d.title}
                          </span>
                          <span
                            className={`text-[11px] tabular-nums shrink-0 ${dueTone}`}
                          >
                            {dueLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Card detail popup. Click-outside or X closes. Lane-move
        * buttons fire moveTask which routes through dragActionFor +
        * setKanbanClients exactly like dragging would. Open-in-delivery
        * link lets the user jump to the full kanban modal if they
        * need the deeper actions (approve / kickback / conclude). */}
      {openItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpenItemId(null)}
        >
          <div
            className="bg-background border border-surface-raised rounded-2xl w-full max-w-md p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/workspace/clients/${openItem.clientId}`}
                  className="text-[10px] font-bold uppercase tracking-wider text-foreground hover:text-white block truncate"
                >
                  {openItem.clientName}
                </Link>
                <p className="text-[10px] text-subtle mt-0.5 truncate">
                  {openItem.projectName}
                </p>
              </div>
              <button
                onClick={() => setOpenItemId(null)}
                className="text-subtle hover:text-white text-[18px] leading-none shrink-0"
              >
                ×
              </button>
            </div>
            <h2 className="text-[18px] font-semibold text-foreground leading-snug mb-3">
              {openItem.title}
            </h2>
            {/* Strategy brief + Figma link. Editable in-place - team
              * pastes a link or types brief notes, save-on-blur
              * writes through setKanbanClients which syncs to
              * Supabase + broadcasts via Realtime. Both URL-style
              * values get an "Open" button next to the input so the
              * team can hop straight to Figma / the brief doc. */}
            {/* Designer-first layout:
              *   - Client brief: link to the onboarding info on the
              *     client profile (read-only; that's where the deeper
              *     context lives)
              *   - Strategist brief: read-only link to the URL the
              *     strategist dropped in on the delivery campaign.
              *     Designers can SEE it but don't edit it - that's
              *     the strategist's lane on /kanban.
              *   - Figma: editable here so the designer can paste
              *     their design link in as they spin up the work.
              * Actions sit at the bottom + side-by-side - the briefs
              * are the focus, not the workflow buttons. */}
            <div className="mb-4 space-y-2.5">
              {/* Client brief - link to client profile for the full
                * onboarding intake. */}
              <Link
                href={`/workspace/clients/${openItem.clientId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-2.5 py-2 text-[12px] bg-surface border border-border rounded-md text-foreground hover:border-border transition-colors"
              >
                <span>
                  <span className="text-[10px] uppercase tracking-wider text-subtle font-semibold block">
                    Client brief
                  </span>
                  <span className="text-muted">
                    {openItem.clientName} · onboarding + context
                  </span>
                </span>
                <span className="text-subtle">Open →</span>
              </Link>

              {/* Strategist brief - read-only. Surfaces the URL the
                * strategist set on the project. If nothing's set yet
                * show a placeholder so the designer knows it's missing. */}
              {openProject?.brief ? (
                /^https?:\/\//.test(openProject.brief) ? (
                  <a
                    href={openProject.brief}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-2.5 py-2 text-[12px] bg-surface border border-border rounded-md text-foreground hover:border-border transition-colors"
                  >
                    <span>
                      <span className="text-[10px] uppercase tracking-wider text-subtle font-semibold block">
                        Strategist brief
                      </span>
                      <span className="text-muted truncate block max-w-[280px]">
                        {openProject.brief.replace(/^https?:\/\//, "")}
                      </span>
                    </span>
                    <span className="text-subtle">Open →</span>
                  </a>
                ) : (
                  <div className="px-2.5 py-2 text-[12px] bg-surface border border-border rounded-md">
                    <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold mb-1">
                      Strategist brief
                    </p>
                    <p className="text-muted whitespace-pre-wrap leading-relaxed">
                      {openProject.brief}
                    </p>
                  </div>
                )
              ) : (
                <div className="px-2.5 py-2 text-[12px] bg-surface border border-border rounded-md text-border italic">
                  <span className="text-[10px] uppercase tracking-wider not-italic font-semibold block mb-0.5">
                    Strategist brief
                  </span>
                  Not added yet
                </div>
              )}

              {/* Figma - editable. Designer pastes their design URL
                * as they start the work. Writes to project so every
                * card on the project shares the same link. */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-subtle font-semibold">
                    Figma
                  </span>
                  {openProject?.figmaUrl && (
                    <a
                      href={openProject.figmaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-muted hover:text-white"
                    >
                      Open →
                    </a>
                  )}
                </div>
                <input
                  key={`figma-${openItem.classified.projectId}`}
                  type="url"
                  defaultValue={openProject?.figmaUrl ?? ""}
                  onBlur={(e) =>
                    patchProject(openItem.classified.projectId, {
                      figmaUrl: e.target.value || undefined,
                    })
                  }
                  placeholder="https://figma.com/file/…"
                  className="w-full px-2.5 py-1.5 text-[12px] bg-surface border border-border rounded-md text-foreground placeholder:text-border focus:outline-none focus:border-border"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider rounded"
                style={{
                  background: `${ROLE_DOT[openItem.role]}1F`,
                  color: ROLE_DOT[openItem.role],
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: ROLE_DOT[openItem.role] }}
                />
                {ROLE_LABEL[openItem.role]}
              </span>
              {openItem.dueDate && (
                <span
                  className={`text-[11px] tabular-nums font-medium ${
                    openItem.state === "overdue"
                      ? "text-rose-300"
                      : openItem.state === "soon"
                        ? "text-amber-400"
                        : "text-subtle"
                  }`}
                >
                  Due {formatDue(openItem.dueDate)}
                </span>
              )}
            </div>
            {/* Action buttons - side-by-side at the bottom. Briefs
              * are the focus of the popup; buttons are the quick
              * action when the user's ready to advance the card. */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => {
                  moveTask(
                    openItem.id,
                    openItem.lane === "in_progress" ? "todo" : "in_progress",
                  );
                  setOpenItemId(null);
                }}
                className="px-3 py-2 text-[12px] text-foreground bg-surface border border-border rounded-lg hover:bg-surface-raised transition-colors font-medium"
              >
                {openItem.lane === "in_progress"
                  ? "Move to Todo"
                  : "Move to In progress"}
              </button>
              <button
                onClick={() => {
                  moveTask(openItem.id, "done");
                  setOpenItemId(null);
                }}
                disabled={openItem.lane === "done"}
                className="px-3 py-2 text-[12px] text-background bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {openItem.lane === "done" ? "Done" : "Mark as done"}
              </button>
            </div>
            <Link
              href={`/kanban?card=${encodeURIComponent(openItem.cardId)}`}
              className="block text-center text-[11px] text-subtle hover:text-white pt-2 border-t border-surface-raised"
            >
              Open in Project Delivery for full actions →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* Admin "view as" picker. Custom dark dropdown matching the kanban
 * pickers - shows the active member + role, dropdown lists everyone
 * by role for quick scanning. Replaces the native <select> which
 * looked out of place against the rest of the app. */
function ViewAsPicker({
  members,
  activeId,
  onPick,
}: {
  members: PodMember[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const active = members.find((m) => m.id === activeId);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 pl-3 pr-2.5 py-1.5 text-xs font-medium bg-surface text-foreground border border-border rounded-full hover:border-border transition-colors"
      >
        <span className="truncate max-w-[200px]">
          {active?.name ?? "Pick someone"}
        </span>
        {active && (
          <span className="text-[10px] uppercase tracking-wider text-subtle">
            {active.role.replace(/_/g, " ")}
          </span>
        )}
        <ChevronDownIcon className="size-3 text-subtle shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-40 w-72 bg-background rounded-lg ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-subtle font-semibold border-b border-white/[0.04]">
            View as ({members.length})
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {members.map((m) => {
              const isActive = m.id === activeId;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => {
                      onPick(m.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors ${
                      isActive ? "bg-white/[0.04]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <svg className="size-3.5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.586l7.296-7.296a1 1 0 011.408 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="size-3.5 shrink-0" />
                      )}
                      <span className="text-[13px] text-foreground truncate flex-1 min-w-0">
                        {m.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-subtle shrink-0 capitalize">
                        {m.role.replace(/_/g, " ")}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
