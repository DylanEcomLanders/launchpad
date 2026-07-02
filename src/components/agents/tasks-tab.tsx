"use client";

import { useMemo, useState } from "react";
import type { Agent, AgentTask, TaskStatus } from "@/lib/agents/types";
import { TASK_STATUS_META } from "@/lib/agents/types";

type SortKey = "date-desc" | "date-asc" | "status";

const STATUS_FILTERS: ({ key: "ALL" } | { key: TaskStatus })[] = [
  { key: "ALL" },
  { key: "RUNNING" },
  { key: "COMPLETE" },
  { key: "FAILED" },
  { key: "PENDING" },
];

export function TasksTab({ tasks, agent }: { tasks: AgentTask[]; agent: Agent }) {
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [filter, setFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [open, setOpen] = useState<string | null>(null);

  const visible = useMemo(() => {
    let out = tasks.slice();
    if (filter !== "ALL") out = out.filter((t) => t.status === filter);
    if (sort === "date-desc") out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    if (sort === "date-asc")  out.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    if (sort === "status")    out.sort((a, b) => a.status.localeCompare(b.status));
    return out;
  }, [tasks, filter, sort]);

  return (
    <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => {
            const label = s.key === "ALL" ? "All" : TASK_STATUS_META[s.key].label;
            const active = filter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  active ? "bg-white text-background" : "text-subtle hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-subtle">
          <span>Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] focus:outline-none focus:border-white"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Empty state */}
      {visible.length === 0 ? (
        <div className="p-12 text-center text-sm text-subtle">
          {tasks.length === 0
            ? `${agent.name} hasn't run any tasks yet.`
            : "No tasks match this filter."}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((task) => {
            const meta = TASK_STATUS_META[task.status];
            const isOpen = open === task.id;
            return (
              <li key={task.id}>
                <button
                  onClick={() => setOpen(isOpen ? null : task.id)}
                  className="grid w-full grid-cols-[110px_1fr_120px_60px] items-center gap-3 px-4 py-2.5 text-left hover:bg-background transition-colors"
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <span className="truncate text-sm text-foreground">{task.input}</span>
                  <span className="text-[11px] tabular-nums text-subtle">
                    {new Date(task.startedAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-[11px] tabular-nums text-subtle text-right">
                    {durationLabel(task)}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-background px-4 py-3 space-y-2">
                    <DetailRow label="Input"  value={task.input} />
                    <DetailRow label="Output" value={task.output || "—"} />
                    <DetailRow label="By"     value={task.triggeredBy} mono />
                    <DetailRow label="Started"   value={new Date(task.startedAt).toLocaleString()} mono />
                    <DetailRow label="Completed" value={task.completedAt ? new Date(task.completedAt).toLocaleString() : "—"} mono />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3 text-xs">
      <span className="font-semibold uppercase tracking-wider text-subtle">{label}</span>
      <span className={mono ? "font-mono text-foreground" : "text-foreground whitespace-pre-wrap"}>{value}</span>
    </div>
  );
}

function durationLabel(task: AgentTask): string {
  if (!task.completedAt) return "—";
  const ms = new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
