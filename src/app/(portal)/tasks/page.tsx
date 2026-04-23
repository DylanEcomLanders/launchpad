"use client";

import { useState, useEffect } from "react";
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

const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
  todo: { text: "To Do", color: "#777", bg: "#F3F3F5" },
  "in-progress": { text: "In Progress", color: "#2563EB", bg: "#EFF6FF" },
  done: { text: "Done", color: "#059669", bg: "#ECFDF5" },
};

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

  useEffect(() => {
    fetch("/api/task-board")
      .then((r) => r.json())
      .then((data) => {
        setBoard(data);
        setLastUpdated(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      })
      .finally(() => setLoading(false));

    // Auto-refresh every 30s
    const interval = setInterval(() => {
      fetch("/api/task-board")
        .then((r) => r.json())
        .then((data) => {
          setBoard(data);
          setLastUpdated(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
        });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const sortByDate = (tasks: Task[]) => [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  const activeTasks = (tasks: Task[]) => sortByDate(tasks.filter((t) => t.status !== "done"));
  const doneTasks = (tasks: Task[]) => tasks.filter((t) => t.status === "done");

  const changePhase = async (taskId: string, nextPhase: string) => {
    // Optimistic update: append to phaseHistory locally so "just now in phase" shows immediately
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
    } catch (err) {
      // On failure, refetch to revert
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
      <div className={`flex items-center gap-4 px-5 py-3.5 border-b border-[#F0F0F0] last:border-0 ${overdue ? "bg-red-50/30" : ""}`}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1A1A1A] truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {task.client && <span className="text-[10px] text-[#AAA]">{task.client}</span>}
            {task.client && task.assignee && <span className="text-[10px] text-[#DDD]">/</span>}
            {task.assignee && <span className="text-[10px] text-[#777]">{task.assignee}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <div className="relative">
              <select
                value={task.phase || ""}
                onChange={(e) => changePhase(task.id, e.target.value)}
                className="appearance-none text-[10px] font-semibold uppercase tracking-wider pl-2.5 pr-6 py-1 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 border-0"
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
                className="text-[9px] text-[#AAA]"
                title={enteredAt ? `Entered ${new Date(enteredAt).toLocaleString()}` : ""}
              >
                {timeInPhase} in phase
              </span>
            )}
          </div>
          {task.dueDate && (
            <span className={`text-[11px] font-medium ${overdue ? "text-red-500" : "text-[#AAA]"}`}>
              {formatDate(task.dueDate)}
              {overdue && " (overdue)"}
            </span>
          )}
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ background: s.bg, color: s.color }}
          >
            {s.text}
          </span>
        </div>
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

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5EA] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo height={16} className="text-[#1A1A1A]" />
            <div className="h-4 w-px bg-[#E5E5EA]" />
            <h1 className="text-sm font-semibold text-[#1A1A1A]">Task Board</h1>
          </div>
          <span className="text-[10px] text-[#CCC]">Updated {lastUpdated}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Design Tasks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-2 rounded-full bg-[#7C3AED]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
              Design ({activeTasks(board.designTasks).length} active)
            </h2>
          </div>
          <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden">
            {activeTasks(board.designTasks).length === 0 ? (
              <p className="text-xs text-[#CCC] text-center py-8">No active design tasks</p>
            ) : (
              activeTasks(board.designTasks).map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </div>
          {doneTasks(board.designTasks).length > 0 && (
            <details className="mt-2">
              <summary className="text-[10px] text-[#CCC] cursor-pointer hover:text-[#999]">
                {doneTasks(board.designTasks).length} completed
              </summary>
              <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden mt-1 opacity-60">
                {doneTasks(board.designTasks).map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            </details>
          )}
        </div>

        {/* Dev Tasks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-2 rounded-full bg-[#059669]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
              Development ({activeTasks(board.devTasks).length} active)
            </h2>
          </div>
          <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden">
            {activeTasks(board.devTasks).length === 0 ? (
              <p className="text-xs text-[#CCC] text-center py-8">No active dev tasks</p>
            ) : (
              activeTasks(board.devTasks).map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </div>
          {doneTasks(board.devTasks).length > 0 && (
            <details className="mt-2">
              <summary className="text-[10px] text-[#CCC] cursor-pointer hover:text-[#999]">
                {doneTasks(board.devTasks).length} completed
              </summary>
              <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden mt-1 opacity-60">
                {doneTasks(board.devTasks).map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            </details>
          )}
        </div>
      </div>

      <div className="text-center py-6">
        <p className="text-[10px] text-[#CCC]">Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}
