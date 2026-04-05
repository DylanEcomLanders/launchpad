"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { loadSettings, type TeamMember } from "@/lib/settings";

interface Task {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: "todo" | "in-progress" | "done";
  client?: string;
  portalId?: string;
  deliverableId?: string;
}

interface BoardData {
  designTasks: Task[];
  devTasks: Task[];
}

const ADMIN_KEY = typeof window !== "undefined" ? "ecomlanders2025" : "";

/* ── Stable row component (won't re-mount on parent state change) ── */
const TaskEditorRow = memo(function TaskEditorRow({
  task,
  assignees,
  onUpdate,
  onRemove,
}: {
  task: Task;
  assignees: TeamMember[];
  onUpdate: (field: string, value: string) => void;
  onRemove: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [client, setClient] = useState(task.client || "");

  // Sync from parent if task changes externally
  useEffect(() => { setTitle(task.title); }, [task.title]);
  useEffect(() => { setClient(task.client || ""); }, [task.client]);

  return (
    <div className="grid grid-cols-[1fr_120px_120px_100px_100px_32px] gap-2 px-4 py-2.5 border-b border-[#EDEDEF] last:border-0 items-center">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => onUpdate("title", title)}
        placeholder="Task description..."
        className="text-sm px-2 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none"
      />
      <input
        type="text"
        value={client}
        onChange={(e) => setClient(e.target.value)}
        onBlur={() => onUpdate("client", client)}
        placeholder="Client"
        className="text-xs px-2 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none"
      />
      <select
        value={task.assignee}
        onChange={(e) => onUpdate("assignee", e.target.value)}
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
        onChange={(e) => onUpdate("dueDate", e.target.value)}
        className="text-xs px-1 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none"
      />
      <select
        value={task.status}
        onChange={(e) => onUpdate("status", e.target.value)}
        className="text-xs px-1 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none"
      >
        <option value="todo">To Do</option>
        <option value="in-progress">In Progress</option>
        <option value="done">Done</option>
      </select>
      <button onClick={onRemove} className="p-1 text-[#CCC] hover:text-red-400">
        <TrashIcon className="size-3.5" />
      </button>
    </div>
  );
});

export default function TaskBoardAdminPage() {
  const [board, setBoard] = useState<BoardData>({ designTasks: [], devTasks: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterDate, setFilterDate] = useState<"all" | "overdue" | "today" | "this-week">("all");
  const boardRef = useRef(board);
  boardRef.current = board;

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
      body: JSON.stringify(boardRef.current),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addTask = (type: "design" | "dev") => {
    const task: Task = { id: crypto.randomUUID(), title: "", assignee: "", dueDate: "", status: "todo", client: "" };
    setBoard((prev) => {
      const key = type === "design" ? "designTasks" : "devTasks";
      return { ...prev, [key]: [...prev[key], task] };
    });
  };

  const updateTask = useCallback((type: "design" | "dev", id: string, field: string, value: string) => {
    setBoard((prev) => {
      const key = type === "design" ? "designTasks" : "devTasks";
      return { ...prev, [key]: prev[key].map((t) => (t.id === id ? { ...t, [field]: value } : t)) };
    });
  }, []);

  const removeTask = useCallback((type: "design" | "dev", id: string) => {
    setBoard((prev) => {
      const key = type === "design" ? "designTasks" : "devTasks";
      return { ...prev, [key]: prev[key].filter((t) => t.id !== id) };
    });
  }, []);

  const designers = team.filter((m) => m.role.toLowerCase().includes("design"));
  const developers = team.filter((m) => m.role.toLowerCase().includes("develop") || m.role.toLowerCase().includes("head of dev"));

  // Filter tasks
  const filterTasks = useCallback((tasks: Task[]) => {
    let filtered = tasks;
    if (filterAssignee) {
      filtered = filtered.filter((t) => t.assignee === filterAssignee);
    }
    if (filterDate !== "all") {
      const today = new Date().toISOString().split("T")[0];
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      filtered = filtered.filter((t) => {
        if (!t.dueDate) return false;
        if (filterDate === "overdue") return t.dueDate < today && t.status !== "done";
        if (filterDate === "today") return t.dueDate === today;
        if (filterDate === "this-week") return t.dueDate >= today && t.dueDate <= weekEndStr;
        return true;
      });
    }
    return filtered;
  }, [filterAssignee, filterDate]);

  const filteredDesign = filterTasks(board.designTasks);
  const filteredDev = filterTasks(board.devTasks);
  const allAssignees = [...new Set([...board.designTasks, ...board.devTasks].map((t) => t.assignee).filter(Boolean))].sort();

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
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline">/tasks</a>
          </p>
        </div>
        <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-50">
          {saved ? "Saved" : saving ? "Saving..." : "Save & Publish"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-lg bg-white focus:outline-none"
        >
          <option value="">All Assignees</option>
          {allAssignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex items-center gap-1">
          {(["all", "overdue", "today", "this-week"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterDate(f)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                filterDate === f ? "bg-[#1A1A1A] text-white" : "bg-[#F3F3F5] text-[#777] hover:bg-[#E5E5EA]"
              }`}
            >
              {f === "all" ? "All Dates" : f === "overdue" ? "Overdue" : f === "today" ? "Today" : "This Week"}
            </button>
          ))}
        </div>
        {(filterAssignee || filterDate !== "all") && (
          <button onClick={() => { setFilterAssignee(""); setFilterDate("all"); }} className="text-[11px] text-[#AAA] hover:text-[#1A1A1A]">Clear</button>
        )}
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
          {filteredDesign.length === 0 ? (
            <p className="text-xs text-[#CCC] text-center py-6">No design tasks</p>
          ) : (
            filteredDesign.map((t) => (
              <TaskEditorRow
                key={t.id}
                task={t}
                assignees={designers}
                onUpdate={(field, value) => updateTask("design", t.id, field, value)}
                onRemove={() => removeTask("design", t.id)}
              />
            ))
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
          {filteredDev.length === 0 ? (
            <p className="text-xs text-[#CCC] text-center py-6">No dev tasks</p>
          ) : (
            filteredDev.map((t) => (
              <TaskEditorRow
                key={t.id}
                task={t}
                assignees={developers}
                onUpdate={(field, value) => updateTask("dev", t.id, field, value)}
                onRemove={() => removeTask("dev", t.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
