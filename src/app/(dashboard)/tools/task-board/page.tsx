"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass } from "@/lib/form-styles";
import { loadSettings, type TeamMember } from "@/lib/settings";

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

const ADMIN_KEY = typeof window !== "undefined" ? "ecomlanders2025" : "";

export default function TaskBoardAdminPage() {
  const [board, setBoard] = useState<BoardData>({ designTasks: [], devTasks: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [res, settings] = await Promise.all([
      fetch("/api/task-board").then((r) => r.json()),
      loadSettings(),
    ]);
    setBoard(res);
    setTeam(settings.team || []);
    setPreviewUrl(`${window.location.origin}/tasks`);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    await fetch("/api/task-board", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify(board),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addTask = (type: "design" | "dev") => {
    const task: Task = {
      id: crypto.randomUUID(),
      title: "",
      assignee: "",
      dueDate: "",
      status: "todo",
      client: "",
    };
    if (type === "design") {
      setBoard({ ...board, designTasks: [...board.designTasks, task] });
    } else {
      setBoard({ ...board, devTasks: [...board.devTasks, task] });
    }
  };

  const updateTask = (type: "design" | "dev", id: string, field: string, value: string) => {
    const key = type === "design" ? "designTasks" : "devTasks";
    setBoard({
      ...board,
      [key]: board[key].map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    });
  };

  const removeTask = (type: "design" | "dev", id: string) => {
    const key = type === "design" ? "designTasks" : "devTasks";
    setBoard({ ...board, [key]: board[key].filter((t) => t.id !== id) });
  };

  const designers = team.filter((m) => m.role.toLowerCase().includes("design"));
  const developers = team.filter((m) => m.role.toLowerCase().includes("develop") || m.role.toLowerCase().includes("head of dev"));

  function TaskEditor({ task, type, assignees }: { task: Task; type: "design" | "dev"; assignees: TeamMember[] }) {
    return (
      <div className="grid grid-cols-[1fr_120px_120px_100px_100px_32px] gap-2 px-4 py-2.5 border-b border-[#EDEDEF] last:border-0 items-center">
        <input
          type="text"
          value={task.title}
          onChange={(e) => updateTask(type, task.id, "title", e.target.value)}
          placeholder="Task description..."
          className="text-sm px-2 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none"
        />
        <input
          type="text"
          value={task.client || ""}
          onChange={(e) => updateTask(type, task.id, "client", e.target.value)}
          placeholder="Client"
          className="text-xs px-2 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none"
        />
        <select
          value={task.assignee}
          onChange={(e) => updateTask(type, task.id, "assignee", e.target.value)}
          className="text-xs px-1 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none"
        >
          <option value="">Unassigned</option>
          {assignees.map((m) => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={task.dueDate}
          onChange={(e) => updateTask(type, task.id, "dueDate", e.target.value)}
          className="text-xs px-1 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none"
        />
        <select
          value={task.status}
          onChange={(e) => updateTask(type, task.id, "status", e.target.value)}
          className="text-xs px-1 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none"
        >
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <button onClick={() => removeTask(type, task.id)} className="p-1 text-[#CCC] hover:text-red-400">
          <TrashIcon className="size-3.5" />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Board</h1>
          <p className="text-xs text-[#7A7A7A] mt-1">
            Manage design and dev tasks. Team views at{" "}
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline">
              /tasks
            </a>
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-50"
        >
          {saved ? "Saved" : saving ? "Saving..." : "Save & Publish"}
        </button>
      </div>

      {/* Design Tasks */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#7C3AED]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">Design Tasks</h2>
          </div>
          <button onClick={() => addTask("design")} className="flex items-center gap-1 text-[11px] text-[#777] hover:text-[#1A1A1A]">
            <PlusIcon className="size-3" /> Add
          </button>
        </div>
        <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_120px_100px_100px_32px] gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA]">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Task</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Client</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Assignee</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Due</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Status</span>
            <span />
          </div>
          {board.designTasks.length === 0 ? (
            <p className="text-xs text-[#CCC] text-center py-6">No design tasks</p>
          ) : (
            board.designTasks.map((t) => <TaskEditor key={t.id} task={t} type="design" assignees={designers} />)
          )}
        </div>
      </div>

      {/* Dev Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#059669]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">Dev Tasks</h2>
          </div>
          <button onClick={() => addTask("dev")} className="flex items-center gap-1 text-[11px] text-[#777] hover:text-[#1A1A1A]">
            <PlusIcon className="size-3" /> Add
          </button>
        </div>
        <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_120px_100px_100px_32px] gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA]">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Task</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Client</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Assignee</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Due</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Status</span>
            <span />
          </div>
          {board.devTasks.length === 0 ? (
            <p className="text-xs text-[#CCC] text-center py-6">No dev tasks</p>
          ) : (
            board.devTasks.map((t) => <TaskEditor key={t.id} task={t} type="dev" assignees={developers} />)
          )}
        </div>
      </div>
    </div>
  );
}
