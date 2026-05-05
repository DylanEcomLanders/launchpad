"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  TICKET_TYPE_COLORS,
  TICKET_TYPE_LABELS,
  ageLabel,
  type Ticket,
} from "@/lib/tickets/types";

type TriageDecision = "do" | "shift" | "kill";

interface Props {
  tickets: Ticket[]; // pre-sorted open tickets
  currentUser: string;
  onClose: () => void;
  onResolve: (
    ticketId: string,
    decision: TriageDecision,
    payload?: { killReason?: string },
  ) => void;
}

/* Morning triage. Goes through every open ticket one at a time with
 * Do today / Shift / Kill. Keyboard 1/2/3 or arrow keys, summary at the
 * end. Forcing function that prevents tickets from dying silently. */
export function TriageMode({ tickets, currentUser, onClose, onResolve }: Props) {
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<
    { ticketId: string; decision: TriageDecision }[]
  >([]);
  const [killReason, setKillReason] = useState("");
  const [killing, setKilling] = useState(false);

  const current = tickets[index];
  const finished = index >= tickets.length;

  const decide = (decision: TriageDecision, payload?: { killReason?: string }) => {
    if (!current) return;
    onResolve(current.id, decision, payload);
    setDecisions((prev) => [
      ...prev,
      { ticketId: current.id, decision },
    ]);
    setKilling(false);
    setKillReason("");
    setIndex((i) => i + 1);
  };

  // Keyboard shortcuts. 1 = Do, 2 = Shift, 3 = Kill. ArrowRight skips to
  // the next via Shift (no decision = shift).
  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (killing) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "1") decide("do");
      if (e.key === "2") decide("shift");
      if (e.key === "3") {
        e.preventDefault();
        setKilling(true);
      }
      if (e.key === "ArrowRight") decide("shift");
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, killing, finished]);

  // Summary screen
  if (finished) {
    const did = decisions.filter((d) => d.decision === "do").length;
    const shifted = decisions.filter((d) => d.decision === "shift").length;
    const killed = decisions.filter((d) => d.decision === "kill").length;
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
            Triage complete
          </p>
          <h2 className="text-[22px] font-semibold tracking-tight text-[#1A1A1A] mb-6">
            {tickets.length === 0
              ? "No open tickets to triage."
              : "All clear."}
          </h2>
          {tickets.length > 0 && (
            <div className="space-y-2 text-[14px] text-[#1A1A1A]">
              <div className="flex justify-between">
                <span>Doing today</span>
                <span className="font-semibold tabular-nums text-[#059669]">
                  {did}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Shifted</span>
                <span className="font-semibold tabular-nums text-[#A16207]">
                  {shifted}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Killed</span>
                <span className="font-semibold tabular-nums text-[#DC2626]">
                  {killed}
                </span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full px-4 py-3 bg-[#1A1A1A] text-white text-[13px] font-semibold rounded-lg hover:bg-[#2D2D2D]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 text-white">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Triage
          </span>
          <span className="text-[11px] tabular-nums text-white/80">
            {index + 1} / {tickets.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          aria-label="Close"
        >
          <XMarkIcon className="size-5" />
        </button>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: TICKET_TYPE_COLORS[current.type] }}
            >
              {TICKET_TYPE_LABELS[current.type]}
            </span>
            <span className="text-[10px] font-semibold tabular-nums text-[#7A7A7A]">
              {ageLabel(current.raised_at)} old
            </span>
            {current.shifted_count && current.shifted_count > 0 ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                Shifted {current.shifted_count}×
              </span>
            ) : null}
          </div>
          <h3 className="text-[22px] font-semibold tracking-tight text-[#1A1A1A] mb-3 leading-tight">
            {current.title}
          </h3>
          {(current.client_id || current.raised_by || current.notes) && (
            <div className="space-y-1 text-[12px] text-[#7A7A7A] mb-6">
              {current.client_id && <p>Client: {current.client_id}</p>}
              <p>Raised by {current.raised_by}</p>
              {current.notes && (
                <p className="italic mt-2 text-[#888]">{current.notes}</p>
              )}
            </div>
          )}

          {killing ? (
            <div className="space-y-2">
              <input
                type="text"
                autoFocus
                value={killReason}
                onChange={(e) => setKillReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && killReason.trim()) {
                    decide("kill", { killReason: killReason.trim() });
                  }
                  if (e.key === "Escape") {
                    setKilling(false);
                    setKillReason("");
                  }
                }}
                placeholder="Why kill this ticket?"
                className="w-full text-[14px] px-4 py-3 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1A1A1A]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => decide("kill", { killReason: killReason.trim() })}
                  disabled={!killReason.trim()}
                  className="flex-1 px-4 py-3 bg-[#DC2626] text-white text-[13px] font-semibold rounded-lg disabled:opacity-40"
                >
                  Confirm kill
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKilling(false);
                    setKillReason("");
                  }}
                  className="px-4 py-3 text-[13px] font-semibold text-[#7A7A7A] hover:text-[#1A1A1A]"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <TriageButton
                kbd="1"
                label="Do today"
                color="#059669"
                onClick={() => decide("do")}
              />
              <TriageButton
                kbd="2"
                label="Shift"
                color="#A16207"
                onClick={() => decide("shift")}
              />
              <TriageButton
                kbd="3"
                label="Kill"
                color="#DC2626"
                onClick={() => setKilling(true)}
              />
            </div>
          )}

          <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-[#BBB]">
            Raised by {current.raised_by} · {currentUser} triaging
          </p>
        </div>
      </div>
    </div>
  );
}

function TriageButton({
  kbd,
  label,
  color,
  onClick,
}: {
  kbd: string;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 py-4 rounded-lg border-[1.5px] hover:bg-[#FAFAFA] transition-colors"
      style={{ borderColor: color, color }}
    >
      <span className="text-[10px] font-mono tabular-nums opacity-50">
        {kbd}
      </span>
      <span className="text-[14px] font-semibold tracking-tight">{label}</span>
    </button>
  );
}
