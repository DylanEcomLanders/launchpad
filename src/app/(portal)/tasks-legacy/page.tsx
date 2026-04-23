"use client";

// Legacy view of the task board before phase tracking / drawers / split deadlines.
// Reads the same Supabase `task_board` blob but renders the original
// Title / Client / Assignee / Due / Status layout so historic dueDate values
// (hidden from the new /tasks view) remain visible at a glance.

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Logo } from "@/components/logo";

interface Task {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: "todo" | "in-progress" | "done";
  client?: string;
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

export default function LegacyTaskBoardPage() {
  const [board, setBoard] = useState<BoardData>({ designTasks: [], devTasks: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

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

  const sortByDate = (tasks: Task[]) =>
    [...tasks].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  const activeTasks = (tasks: Task[]) => sortByDate(tasks.filter((t) => t.status !== "done"));
  const doneTasks = (tasks: Task[]) => tasks.filter((t) => t.status === "done");

  function TaskRow({ task }: { task: Task }) {
    const s = statusLabel[task.status] || statusLabel.todo;
    const overdue = task.status !== "done" && isOverdue(task.dueDate);
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
      <div className="bg-white border-b border-[#E5E5EA] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/team"
              className="flex items-center gap-1.5 text-[11px] font-medium text-[#7A7A7A] hover:text-[#1A1A1A] transition-colors"
            >
              <ArrowLeftIcon className="size-3" />
              Team Tools
            </Link>
            <div className="h-4 w-px bg-[#E5E5EA]" />
            <Logo height={16} className="text-[#1A1A1A]" />
            <div className="h-4 w-px bg-[#E5E5EA]" />
            <h1 className="text-sm font-semibold text-[#1A1A1A]">Task Board · Legacy view</h1>
          </div>
          <span className="text-[10px] text-[#CCC]">Updated {lastUpdated}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-6">
          <p className="text-[11px] text-amber-800">
            Legacy view — shows the original Title / Assignee / Due / Status layout with pre-phase <code>dueDate</code> values intact. The live team view is at{" "}
            <a href="/tasks" className="underline font-medium">/tasks</a>.
          </p>
        </div>

        <div className="space-y-8">
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
      </div>

      <div className="text-center py-6">
        <p className="text-[10px] text-[#CCC]">Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}
