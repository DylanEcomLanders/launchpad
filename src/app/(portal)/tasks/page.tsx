"use client";

import { useState, useEffect, useMemo } from "react";
import { Logo } from "@/components/logo";
import {
  PHASE_OPTIONS,
  appendPhaseTransition,
  currentPhaseEnteredAt,
  formatTimeInPhase,
  phaseMeta,
  type PhaseEntry,
} from "@/lib/task-board/phases";

interface Task {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: "todo" | "in-progress" | "done";
  client?: string;
  phase?: string;
  phaseHistory?: PhaseEntry[];
}

interface BoardData {
  designTasks: Task[];
  devTasks: Task[];
}

type Lane = "design" | "dev";

const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
  todo: { text: "To Do", color: "#777", bg: "#F3F3F5" },
  "in-progress": { text: "In Progress", color: "#2563EB", bg: "#EFF6FF" },
  done: { text: "Done", color: "#059669", bg: "#ECFDF5" },
};

const GRID = "grid-cols-[minmax(0,1fr)_200px_110px_110px]";

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isOverdue(d: string) {
  if (!d) return false;
  return new Date(d + "T23:59:59") < new Date();
}

export default function TaskBoardPage() {
  const [board, setBoard] = useState<BoardData>({ designTasks: [], devTasks: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [lane, setLane] = useState<Lane>("design");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  useEffect(() => {
    const fetchBoard = () =>
      fetch("/api/task-board")
        .then((r) => r.json())
        .then((data) => {
          setBoard(data);
          setLastUpdated(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
        });

    fetchBoard().finally(() => setLoading(false));
    const interval = setInterval(fetchBoard, 30000);
    return () => clearInterval(interval);
  }, []);

  const laneTasks = lane === "design" ? board.designTasks : board.devTasks;

  const assignees = useMemo(
    () => [...new Set(laneTasks.map((t) => t.assignee).filter(Boolean))].sort(),
    [laneTasks],
  );

  // Reset assignee filter if it no longer matches anyone in the current lane
  useEffect(() => {
    if (assigneeFilter && !assignees.includes(assigneeFilter)) setAssigneeFilter("");
  }, [assignees, assigneeFilter]);

  const sortByDate = (tasks: Task[]) =>
    [...tasks].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const applyAssigneeFilter = (tasks: Task[]) =>
    assigneeFilter ? tasks.filter((t) => t.assignee === assigneeFilter) : tasks;

  const visibleTasks = applyAssigneeFilter(laneTasks);
  const active = sortByDate(visibleTasks.filter((t) => t.status !== "done"));
  const done = visibleTasks.filter((t) => t.status === "done");

  const changePhase = async (taskId: string, nextPhase: string) => {
    setBoard((prev) => ({
      designTasks: prev.designTasks.map((t) => (t.id === taskId ? appendPhaseTransition(t, nextPhase) : t)),
      devTasks: prev.devTasks.map((t) => (t.id === taskId ? appendPhaseTransition(t, nextPhase) : t)),
    }));
    try {
      const res = await fetch("/api/task-board", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, phase: nextPhase }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      fetch("/api/task-board").then((r) => r.json()).then(setBoard);
    }
  };

  function TaskRow({ task }: { task: Task }) {
    const s = statusLabel[task.status] || statusLabel.todo;
    const overdue = task.status !== "done" && isOverdue(task.dueDate);
    const pMeta = phaseMeta(task.phase);
    const enteredAt = currentPhaseEnteredAt(task.phaseHistory);
    const timeInPhase = enteredAt ? formatTimeInPhase(enteredAt) : null;

    return (
      <div className={`grid ${GRID} gap-4 items-center px-5 py-3.5 border-b border-[#F0F0F0] last:border-0 ${overdue ? "bg-red-50/30" : ""}`}>
        {/* Task + meta */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1A1A1A] truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {task.client && <span className="text-[10px] text-[#AAA]">{task.client}</span>}
            {task.client && task.assignee && <span className="text-[10px] text-[#DDD]">/</span>}
            {task.assignee && <span className="text-[10px] text-[#777]">{task.assignee}</span>}
          </div>
        </div>

        {/* Phase */}
        <div className="flex flex-col items-start gap-0.5">
          <div className="relative w-full">
            <select
              value={task.phase || ""}
              onChange={(e) => changePhase(task.id, e.target.value)}
              className="w-full appearance-none text-[10px] font-semibold uppercase tracking-wider pl-2.5 pr-6 py-1 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 border-0"
              style={pMeta ? { background: pMeta.bg, color: pMeta.color } : { background: "#F3F3F5", color: "#AAA" }}
              title="Change phase"
            >
              <option value="">Set phase…</option>
              {PHASE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 size-2.5 opacity-60"
              style={pMeta ? { color: pMeta.color } : { color: "#AAA" }}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
          {timeInPhase && pMeta && (
            <span
              className="text-[9px] text-[#AAA] pl-2.5"
              title={enteredAt ? `Entered ${new Date(enteredAt).toLocaleString()}` : ""}
            >
              {timeInPhase} in phase
            </span>
          )}
        </div>

        {/* Due */}
        <div className="text-right">
          {task.dueDate ? (
            <span className={`text-[11px] font-medium ${overdue ? "text-red-500" : "text-[#AAA]"}`}>
              {formatDate(task.dueDate)}
              {overdue && " (overdue)"}
            </span>
          ) : (
            <span className="text-[11px] text-[#DDD]">—</span>
          )}
        </div>

        {/* Status */}
        <div className="flex justify-end">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap"
            style={{ background: s.bg, color: s.color }}
          >
            {s.text}
          </span>
        </div>
      </div>
    );
  }

  function ColumnHeader() {
    return (
      <div className={`grid ${GRID} gap-4 px-5 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA]`}>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Task</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Phase</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA] text-right">Due</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA] text-right">Status</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
      </div>
    );
  }

  const laneDotColor = lane === "design" ? "#7C3AED" : "#059669";

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5EA] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo height={16} className="text-[#1A1A1A]" />
            <div className="h-4 w-px bg-[#E5E5EA]" />
            <h1 className="text-sm font-semibold text-[#1A1A1A]">Task Board</h1>
          </div>
          <span className="text-[10px] text-[#CCC]">Updated {lastUpdated}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Controls: Design/Dev toggle + assignee filter */}
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="inline-flex items-center p-1 bg-[#EFEFF1] rounded-lg">
            {(["design", "dev"] as const).map((l) => {
              const count = (l === "design" ? board.designTasks : board.devTasks).filter((t) => t.status !== "done").length;
              return (
                <button
                  key={l}
                  onClick={() => setLane(l)}
                  className={`px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center gap-2 ${
                    lane === l ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#777] hover:text-[#1A1A1A]"
                  }`}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: l === "design" ? "#7C3AED" : "#059669" }}
                  />
                  {l === "design" ? "Design" : "Development"}
                  <span className={`text-[10px] font-medium ${lane === l ? "text-[#AAA]" : "text-[#BBB]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-lg bg-white focus:outline-none focus:border-[#999]"
            >
              <option value="">All {lane === "design" ? "designers" : "developers"}</option>
              {assignees.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            {assigneeFilter && (
              <button
                onClick={() => setAssigneeFilter("")}
                className="text-[11px] text-[#AAA] hover:text-[#1A1A1A]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Active list */}
        <div className="flex items-center gap-2 mb-3">
          <div className="size-2 rounded-full" style={{ background: laneDotColor }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
            {lane === "design" ? "Design" : "Development"} ({active.length} active)
            {assigneeFilter && <span className="text-[#BBB] normal-case font-normal"> · {assigneeFilter}</span>}
          </h2>
        </div>
        <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden">
          {active.length > 0 && <ColumnHeader />}
          {active.length === 0 ? (
            <p className="text-xs text-[#CCC] text-center py-8">
              No active {lane === "design" ? "design" : "dev"} tasks{assigneeFilter ? ` for ${assigneeFilter}` : ""}
            </p>
          ) : (
            active.map((t) => <TaskRow key={t.id} task={t} />)
          )}
        </div>

        {done.length > 0 && (
          <details className="mt-3">
            <summary className="text-[10px] text-[#CCC] cursor-pointer hover:text-[#999]">
              {done.length} completed
            </summary>
            <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden mt-1 opacity-60">
              <ColumnHeader />
              {done.map((t) => <TaskRow key={t.id} task={t} />)}
            </div>
          </details>
        )}
      </div>

      <div className="text-center py-6">
        <p className="text-[10px] text-[#CCC]">Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}
