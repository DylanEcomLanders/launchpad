"use client";

import {
  computePhaseSpans,
  formatDurationMs,
  phaseMeta,
  type PhaseEntry,
} from "@/lib/task-board/phases";

/**
 * Shared per-visit phase timeline. Renders the chronological span list
 * produced by `computePhaseSpans`, each entry into a phase is its own
 * row (revisits stay separate). Used by both the Task Board drawer and
 * the pods-v2 / engagement task surfaces so the timeline reads the
 * same everywhere.
 */
export function PhaseTimeline({
  history,
  emptyLabel = "No phase history yet.",
  compact = false,
}: {
  history: PhaseEntry[] | undefined;
  emptyLabel?: string;
  compact?: boolean;
}) {
  const spans = computePhaseSpans(history);
  if (spans.length === 0) {
    return <p className="text-xs text-[#9CA3AF]">{emptyLabel}</p>;
  }
  return (
    <ol className={`relative ${compact ? "space-y-2.5" : "space-y-4"} before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-[#2A2A2A]`}>
      {spans.map((span, i) => {
        const meta = phaseMeta(span.phase);
        if (!meta) return null;
        return (
          <li key={i} className="relative pl-6">
            <span
              className="absolute left-0 top-1.5 size-2.5 rounded-full ring-2 ring-white"
              style={{ background: meta.color }}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>
              <span className="text-xs font-medium text-[#E5E5EA] tabular-nums">
                {formatDurationMs(span.durationMs)}
              </span>
              {span.isCurrent && <span className="text-[10px] text-[#9CA3AF]">· in progress</span>}
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1">
              {new Date(span.enteredAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {span.exitedAt && (
                <> → {new Date(span.exitedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
