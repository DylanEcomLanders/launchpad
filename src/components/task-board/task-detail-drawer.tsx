"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  computeAssignee,
  computePhaseSpans,
  computeUrgency,
  formatDeadline,
  formatDurationMs,
  phaseMeta,
  RESEARCH_ASSIGNEE,
  type DeadlineChangeEntry,
  type PhaseEntry,
} from "@/lib/task-board/phases";

export interface TaskDetailTask {
  id: string;
  title: string;
  client?: string;
  assignee?: string;
  designer?: string;
  developer?: string;
  phase?: string;
  phaseHistory?: PhaseEntry[];
  designDueDate?: string;
  devDueDate?: string;
  launchDueDate?: string;
  deadlineHistory?: DeadlineChangeEntry[];
}

export type DrawerField =
  | "designDueDate"
  | "devDueDate"
  | "launchDueDate"
  | "designer"
  | "developer";

export type DeadlineField = "designDueDate" | "devDueDate" | "launchDueDate";

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
  onUpdateDeadline,
  designers,
  developers,
}: {
  task: TaskDetailTask | null;
  onClose: () => void;
  editable?: boolean;
  onUpdate?: (field: DrawerField, value: string) => void;
  // Separate handler for deadline changes so the admin can append to deadlineHistory
  // when reason is provided (for changes to an existing deadline, not the initial set).
  onUpdateDeadline?: (field: DeadlineField, value: string, reason?: string) => void;
  designers?: { id: string; name: string }[];
  developers?: { id: string; name: string }[];
}) {
  const [pendingChange, setPendingChange] = useState<
    | { field: DeadlineField; prev: string; next: string }
    | null
  >(null);
  const [reasonDraft, setReasonDraft] = useState("");

  const attemptDeadlineChange = (field: DeadlineField, prev: string | undefined, next: string) => {
    if (!onUpdateDeadline) return;
    if (prev && prev !== next) {
      // Existing deadline being moved — require a reason
      setPendingChange({ field, prev, next });
      setReasonDraft("");
    } else {
      onUpdateDeadline(field, next);
    }
  };

  const confirmPendingChange = () => {
    if (!pendingChange || !onUpdateDeadline) return;
    const reason = reasonDraft.trim();
    if (!reason) return;
    onUpdateDeadline(pendingChange.field, pendingChange.next, reason);
    setPendingChange(null);
    setReasonDraft("");
  };

  const cancelPendingChange = () => {
    setPendingChange(null);
    setReasonDraft("");
  };
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
  const launchUrgency = computeUrgency(task.launchDueDate);
  const computedAssignee = computeAssignee(task);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {pendingChange && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-[360px] mx-4 bg-white rounded-xl shadow-2xl p-5">
            <h3 className="text-sm font-semibold text-[#1A1A1A]">
              {pendingChange.field === "designDueDate" ? "Design" : pendingChange.field === "devDueDate" ? "Dev" : "Launch"} deadline is moving
            </h3>
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className="tabular-nums line-through text-[#777]">
                {new Date(pendingChange.prev + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span className="text-[#BBB]">→</span>
              <span className="tabular-nums font-semibold text-[#1A1A1A]">
                {new Date(pendingChange.next + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <label className="block mt-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">Why is it changing?</span>
              <textarea
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                placeholder="e.g. Client requested extra round of revisions"
                autoFocus
                rows={3}
                className="mt-1.5 w-full text-sm px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#999] resize-none"
              />
            </label>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={cancelPendingChange}
                className="px-3 py-1.5 text-xs font-medium text-[#777] hover:text-[#1A1A1A]"
              >
                Cancel
              </button>
              <button
                onClick={confirmPendingChange}
                disabled={!reasonDraft.trim()}
                className="px-4 py-1.5 text-xs font-medium bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save change
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="relative ml-auto w-full max-w-[440px] h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#EDEDEF]">
          <div className="min-w-0 pr-3">
            <h2 className="text-base font-semibold text-[#1A1A1A] break-words">{task.title || "Untitled task"}</h2>
            <p className="text-xs text-[#AAA] mt-1">
              {task.client || "—"}
              {computedAssignee && <> · {computedAssignee}</>}
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

        {/* Team */}
        <section className="px-6 py-5 border-b border-[#EDEDEF]">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">Team</h3>
          <TeamRow
            label="Designer"
            value={task.designer}
            options={designers || []}
            editable={editable}
            active={!!computedAssignee && computedAssignee === task.designer}
            onChange={editable && onUpdate ? (v) => onUpdate("designer", v) : undefined}
          />
          <TeamRow
            label="Developer"
            value={task.developer}
            options={developers || []}
            editable={editable}
            active={!!computedAssignee && computedAssignee === task.developer}
            onChange={editable && onUpdate ? (v) => onUpdate("developer", v) : undefined}
          />
          <TeamRow
            label="Research"
            value={RESEARCH_ASSIGNEE}
            options={[]}
            editable={false}
            active={computedAssignee === RESEARCH_ASSIGNEE}
            locked
          />
        </section>

        {/* Deadlines */}
        <section className="px-6 py-5 border-b border-[#EDEDEF]">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">Deadlines</h3>
          <DeadlineRow
            label="Design"
            field="designDueDate"
            value={task.designDueDate}
            urgency={designUrgency}
            editable={editable}
            history={(task.deadlineHistory || []).filter((h) => h.field === "designDueDate")}
            onChange={editable && onUpdateDeadline ? (v) => attemptDeadlineChange("designDueDate", task.designDueDate, v) : undefined}
          />
          <DeadlineRow
            label="Dev"
            field="devDueDate"
            value={task.devDueDate}
            urgency={devUrgency}
            editable={editable}
            history={(task.deadlineHistory || []).filter((h) => h.field === "devDueDate")}
            onChange={editable && onUpdateDeadline ? (v) => attemptDeadlineChange("devDueDate", task.devDueDate, v) : undefined}
          />
          <DeadlineRow
            label="Launch"
            field="launchDueDate"
            value={task.launchDueDate}
            urgency={launchUrgency}
            editable={editable}
            history={(task.deadlineHistory || []).filter((h) => h.field === "launchDueDate")}
            onChange={editable && onUpdateDeadline ? (v) => attemptDeadlineChange("launchDueDate", task.launchDueDate, v) : undefined}
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

function TeamRow({
  label,
  value,
  options,
  editable,
  active,
  locked,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { id: string; name: string }[];
  editable?: boolean;
  active?: boolean;
  locked?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full"
          style={{ background: active ? "#1A1A1A" : "#D4D4D8" }}
          title={active ? "Currently on this task" : ""}
        />
        <span className="text-sm font-medium text-[#1A1A1A]">{label}</span>
        {locked && <span className="text-[9px] text-[#BBB] uppercase tracking-wider">auto</span>}
      </div>
      {editable && onChange ? (
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs px-2 py-1 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#999] min-w-[140px]"
        >
          <option value="">Unassigned</option>
          {options.map((m) => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>
      ) : (
        <span className={`text-xs ${value ? "text-[#1A1A1A]" : "text-[#BBB]"}`}>
          {value || "Unassigned"}
        </span>
      )}
    </div>
  );
}

function DeadlineRow({
  label,
  field,
  value,
  urgency,
  editable,
  history,
  onChange,
}: {
  label: string;
  field: DeadlineField;
  value: string | undefined;
  urgency: ReturnType<typeof computeUrgency>;
  editable?: boolean;
  history?: DeadlineChangeEntry[];
  onChange?: (v: string) => void;
}) {
  const urgencyStyle = urgency ? URGENCY_STYLES[urgency] : null;
  const hasHistory = (history?.length ?? 0) > 0;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3">
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
      {hasHistory && (
        <ul className="mt-2 ml-4 pl-3 border-l border-[#EDEDEF] space-y-1.5">
          {(history ?? []).slice().reverse().map((h, i) => (
            <li key={i} className="text-[11px]">
              <div className="flex items-center gap-2 text-[#777]">
                <span className="tabular-nums line-through">{new Date(h.previousValue + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                <span className="text-[#BBB]">→</span>
                <span className="tabular-nums font-medium text-[#1A1A1A]">{new Date(h.newValue + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                <span className="text-[10px] text-[#AAA]">
                  · {new Date(h.changedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <p className="text-[#555] mt-0.5 italic">{h.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
