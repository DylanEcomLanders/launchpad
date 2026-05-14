"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusIcon, BoltIcon } from "@heroicons/react/24/outline";
import {
  isClosedToday,
  isStale,
  sortOpenTickets,
  type Ticket,
} from "@/lib/tickets/types";
import { loadTickets, saveTickets } from "@/lib/tickets/data";
import { TicketCard } from "./ticket-card";
import { QuickAddComposer } from "./quick-add-composer";
import { TriageMode } from "./triage-mode";

type View = "open" | "done" | "killed";

interface Props {
  /** Display name used as raised_by on new tickets and assignee on Start. */
  currentUser: string;
  /** List of client names for the composer datalist. */
  clients: string[];
  /** Called when "Promote to task" fires. Optional, when omitted, the
   * Promote button is hidden. Use the omission on team-facing surfaces
   * where only leadership should be able to promote a ticket to a task. */
  onPromoteToTask?: (ticket: Ticket) => Promise<string | null>;
}

/* Persistent panel that sits on the task board. Owns the entire ticket
 * lifecycle: load, mutate, save (auto, every change). The host page
 * doesn't need to know anything about ticket state. */
export function TicketsPanel({ currentUser, clients, onPromoteToTask }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("open");
  const [composing, setComposing] = useState(false);
  const [triaging, setTriaging] = useState(false);

  // Initial load
  useEffect(() => {
    loadTickets().then((t) => {
      setTickets(t);
      setHydrated(true);
    });
  }, []);

  // Auto-save on every mutation. Speed of capture is the whole point.
  const persist = (next: Ticket[]) => {
    setTickets(next);
    saveTickets(next).catch(() => {
      /* swallow, UX shouldn't block on save errors. Last write wins. */
    });
  };

  const updateTicket = (id: string, patch: Partial<Ticket>) => {
    persist(tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  /* ── Derived views ──────────────────────────────────────────── */

  const openTickets = useMemo(
    () =>
      sortOpenTickets(
        tickets.filter(
          (t) => t.status === "open" || t.status === "in_progress",
        ),
      ),
    [tickets],
  );

  const doneTodayTickets = useMemo(
    () =>
      tickets.filter(
        (t) => t.status === "done" && isClosedToday(t.closed_at),
      ),
    [tickets],
  );

  const killedTickets = useMemo(
    () =>
      [...tickets.filter((t) => t.status === "killed")].sort(
        (a, b) =>
          new Date(b.closed_at || b.raised_at).getTime() -
          new Date(a.closed_at || a.raised_at).getTime(),
      ),
    [tickets],
  );

  const openCount = openTickets.length;
  const staleCount = openTickets.filter((t) => isStale(t.raised_at)).length;

  /* ── Actions ────────────────────────────────────────────────── */

  const handleSubmit = (ticket: Ticket) => {
    persist([...tickets, ticket]);
    setComposing(false);
  };

  const handleStart = (id: string) => {
    const t = tickets.find((x) => x.id === id);
    if (!t) return;
    updateTicket(id, {
      status: "in_progress",
      assigned_to: t.assigned_to || currentUser,
    });
  };

  const handleDone = (id: string) => {
    updateTicket(id, {
      status: "done",
      closed_at: new Date().toISOString(),
    });
  };

  const handleKill = (id: string, reason: string) => {
    updateTicket(id, {
      status: "killed",
      kill_reason: reason,
      closed_at: new Date().toISOString(),
    });
  };

  const handlePromote = async (id: string) => {
    if (!onPromoteToTask) return;
    const t = tickets.find((x) => x.id === id);
    if (!t) return;
    const taskId = await onPromoteToTask(t);
    if (!taskId) return;
    updateTicket(id, {
      status: "done",
      closed_at: new Date().toISOString(),
      linked_task_id: taskId,
      notes: t.notes
        ? `${t.notes}\n\nPromoted to task ${taskId}.`
        : `Promoted to task ${taskId}.`,
    });
  };

  /* ── Triage mode handler ────────────────────────────────────── */

  const handleTriageResolve = (
    ticketId: string,
    decision: "do" | "shift" | "kill",
    payload?: { killReason?: string },
  ) => {
    if (decision === "do") {
      const t = tickets.find((x) => x.id === ticketId);
      if (!t) return;
      updateTicket(ticketId, {
        status: "in_progress",
        assigned_to: t.assigned_to || currentUser,
      });
    } else if (decision === "shift") {
      const t = tickets.find((x) => x.id === ticketId);
      if (!t) return;
      updateTicket(ticketId, {
        shifted_count: (t.shifted_count || 0) + 1,
      });
    } else if (decision === "kill") {
      updateTicket(ticketId, {
        status: "killed",
        kill_reason: payload?.killReason || "no reason given",
        closed_at: new Date().toISOString(),
      });
    }
  };

  /* ── Render ─────────────────────────────────────────────────── */

  const visible =
    view === "open"
      ? openTickets
      : view === "done"
      ? doneTodayTickets
      : killedTickets;

  return (
    <>
      <div className="rounded-xl border border-[#E5E5EA] bg-white overflow-hidden">
        {/* Header, counts are the always-visible pressure signal */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E5E5EA] bg-[#FAFAFA]">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#1A1A1A]">
              Tickets
            </h2>
            <span className="text-[10px] font-medium text-[#7A7A7A] tabular-nums">
              {openCount} open
            </span>
            {staleCount > 0 && (
              <span className="text-[10px] font-bold tabular-nums text-[#DC2626]">
                · {staleCount} stale
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setTriaging(true)}
            disabled={openTickets.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <BoltIcon className="size-3" />
            Triage
          </button>
        </div>

        {/* Add button + view tabs */}
        <div className="px-3 py-2 border-b border-[#F0F0F0]">
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-2 text-[12px] font-semibold rounded border border-dashed border-[#E5E5EA] text-[#7A7A7A] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
          >
            <PlusIcon className="size-3.5" />
            New ticket
          </button>
        </div>

        <div className="flex border-b border-[#F0F0F0]">
          <ViewTab
            label={`Open (${openCount})`}
            active={view === "open"}
            onClick={() => setView("open")}
          />
          <ViewTab
            label={`Done today (${doneTodayTickets.length})`}
            active={view === "done"}
            onClick={() => setView("done")}
          />
          <ViewTab
            label="Killed"
            active={view === "killed"}
            onClick={() => setView("killed")}
            muted
          />
        </div>

        {/* Inline composer slides in above the list */}
        {composing && (
          <div className="px-3 pt-3">
            <QuickAddComposer
              raisedBy={currentUser}
              clients={clients}
              onSubmit={handleSubmit}
              onCancel={() => setComposing(false)}
            />
          </div>
        )}

        {/* List */}
        <div className="px-3 py-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
          {!hydrated ? (
            <p className="text-[11px] text-[#BBB] text-center py-6">
              Loading…
            </p>
          ) : visible.length === 0 ? (
            <p className="text-[11px] text-[#BBB] text-center py-6">
              {view === "open"
                ? "No open tickets. Inbox zero."
                : view === "done"
                ? "Nothing closed today."
                : "Nothing killed."}
            </p>
          ) : (
            visible.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                onStart={() => handleStart(t.id)}
                onDone={() => handleDone(t.id)}
                onKill={(reason) => handleKill(t.id, reason)}
                onPromote={onPromoteToTask ? () => handlePromote(t.id) : undefined}
                onUpdate={(patch) => updateTicket(t.id, patch)}
              />
            ))
          )}
        </div>
      </div>

      {triaging && (
        <TriageMode
          tickets={openTickets}
          currentUser={currentUser}
          onClose={() => setTriaging(false)}
          onResolve={handleTriageResolve}
        />
      )}
    </>
  );
}

function ViewTab({
  label,
  active,
  onClick,
  muted,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
        active
          ? "border-[#1A1A1A] text-[#1A1A1A]"
          : muted
          ? "border-transparent text-[#BBB] hover:text-[#7A7A7A]"
          : "border-transparent text-[#7A7A7A] hover:text-[#1A1A1A]"
      }`}
    >
      {label}
    </button>
  );
}
