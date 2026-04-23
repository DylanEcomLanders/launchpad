"use client";

import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  computePhaseSpans,
  computeUrgency,
  formatDeadline,
  formatDurationMs,
  phaseMeta,
  type PhaseEntry,
} from "@/lib/task-board/phases";

export interface TaskDetailTask {
  id: string;
  title: string;
  client?: string;
  assignee?: string;
  phase?: string;
  phaseHistory?: PhaseEntry[];
  designDueDate?: string;
  devDueDate?: string;
}

const URGENCY_STYLES: Record<NonNullable<ReturnType<typeof computeUrgency>>, { color: string; bg: string }> = {
  "overdue": { color: "#DC2626", bg: "#FEF2F2" },
  "due-soon": { color: "#D97706", bg: "#FFFBEB" },
  "ok": { color: "#059669", bg: "#ECFDF5" },
};

export function TaskDetailDrawer({
  task,
  onClose,
  editable,
  onUpdate,
}: {
  task: TaskDetailTask | null;
  onClose: () => void;
  editable?: boolean;
  onUpdate?: (field: "designDueDate" | "devDueDate", value: string) => void;
}) {
  // Close on Escape
  useEffect(() => {
    if (!task) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [task, onClose]);

  if (!task) return null;

  const spans = computePhaseSpans(task.phaseHistory);
  const currentMeta = phaseMeta(task.phase);
  const designUrgency = computeUrgency(task.designDueDate);
  const devUrgency = computeUrgency(task.devDueDate);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative ml-auto w-full max-w-[440px] h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#EDEDEF]">
          <div className="min-w-0 pr-3">
            <h2 className="text-base font-semibold text-[#1A1A1A] break-words">{task.title || "Untitled task"}</h2>
            <p className="text-xs text-[#AAA] mt-1">
              {task.client || "—"}
              {task.assignee && <> · {task.assignee}</>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-[#999] hover:text-[#1A1A1A] hover:bg-[#F3F3F5]"
            aria-label="Close"
          >
            <XMarkIcon className="size-4" />
          </button>
        </div>

        {/* Current phase */}
        <section className="px-6 py-5 border-b border-[#EDEDEF]">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Current phase</h3>
          {currentMeta ? (
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
                style={{ background: currentMeta.bg, color: currentMeta.color }}
              >
                {currentMeta.label}
              </span>
              {spans.length > 0 && (
                <span className="text-xs font-semibold tabular-nums" style={{ color: currentMeta.color }}>
                  {formatDurationMs(spans[spans.length - 1].durationMs)} in phase
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#AAA]">Not started</p>
          )}
        </section>

        {/* Deadlines */}
        <section className="px-6 py-5 border-b border-[#EDEDEF]">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">Deadlines</h3>
          <DeadlineRow
            label="Design"
            value={task.designDueDate}
            urgency={designUrgency}
            editable={editable}
            onChange={editable && onUpdate ? (v) => onUpdate("designDueDate", v) : undefined}
          />
          <DeadlineRow
            label="Dev / Go-live"
            value={task.devDueDate}
            urgency={devUrgency}
            editable={editable}
            onChange={editable && onUpdate ? (v) => onUpdate("devDueDate", v) : undefined}
          />
        </section>

        {/* Timeline */}
        <section className="px-6 py-5">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">Phase timeline</h3>
          {spans.length === 0 ? (
            <p className="text-xs text-[#AAA]">No phase history yet. Set a phase to start the timer.</p>
          ) : (
            <ol className="relative space-y-4 before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-[#E5E5EA]">
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
                      <span className="text-xs font-medium text-[#1A1A1A] tabular-nums">
                        {formatDurationMs(span.durationMs)}
                      </span>
                      {span.isCurrent && <span className="text-[10px] text-[#AAA]">· in progress</span>}
                    </div>
                    <p className="text-[10px] text-[#AAA] mt-1">
                      {new Date(span.enteredAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {span.exitedAt && (
                        <> → {new Date(span.exitedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</>
                      )}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function DeadlineRow({
  label,
  value,
  urgency,
  editable,
  onChange,
}: {
  label: string;
  value: string | undefined;
  urgency: ReturnType<typeof computeUrgency>;
  editable?: boolean;
  onChange?: (v: string) => void;
}) {
  const urgencyStyle = urgency ? URGENCY_STYLES[urgency] : null;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        {urgencyStyle && (
          <span
            className="size-2 rounded-full"
            style={{ background: urgencyStyle.color }}
            title={urgency === "overdue" ? "Overdue" : urgency === "due-soon" ? "Due soon" : "On track"}
          />
        )}
        <span className="text-sm font-medium text-[#1A1A1A]">{label}</span>
      </div>
      {editable && onChange ? (
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs px-2 py-1 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#999]"
        />
      ) : (
        <span
          className="text-xs tabular-nums"
          style={urgencyStyle ? { color: urgencyStyle.color, fontWeight: 600 } : { color: "#AAA" }}
        >
          {formatDeadline(value)}
        </span>
      )}
    </div>
  );
}
