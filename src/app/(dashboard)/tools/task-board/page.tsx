"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { PlusIcon, TrashIcon, ChevronDownIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { loadSettings, type TeamMember } from "@/lib/settings";
import {
  PHASE_OPTIONS,
  appendPhaseTransition,
  currentPhaseEnteredAt,
  formatTimeInPhase,
  groupTasksByPhase,
  phaseMeta,
  type PhaseEntry,
} from "@/lib/task-board/phases";
import { TaskDetailDrawer } from "@/components/task-board/task-detail-drawer";

interface Task {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: "todo" | "in-progress" | "done";
  client?: string;
  portalId?: string;
  deliverableId?: string;
  phase?: string;
  phaseHistory?: PhaseEntry[];
  designDueDate?: string;
  devDueDate?: string;
  launchDueDate?: string;
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
  onOpenDetail,
}: {
  task: Task;
  assignees: TeamMember[];
  onUpdate: (field: string, value: string) => void;
  onRemove: () => void;
  onOpenDetail: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [client, setClient] = useState(task.client || "");

  // Sync from parent if task changes externally
  useEffect(() => { setTitle(task.title); }, [task.title]);
  useEffect(() => { setClient(task.client || ""); }, [task.client]);

  const enteredAt = currentPhaseEnteredAt(task.phaseHistory);
  const timeInPhase = enteredAt ? formatTimeInPhase(enteredAt) : null;
  const meta = phaseMeta(task.phase);
  const hasDeadline = !!(task.designDueDate || task.devDueDate || task.launchDueDate);

  return (
    <div className="grid grid-cols-[1.3fr_140px_140px_180px_120px_32px_32px] gap-2 px-4 py-2.5 border-b border-[#EDEDEF] last:border-0 items-center">
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
      <div className="flex flex-col gap-0.5 min-w-0">
        <select
          value={task.phase || ""}
          onChange={(e) => onUpdate("phase", e.target.value)}
          className="text-xs px-1 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none truncate"
          style={meta ? { color: meta.color } : undefined}
        >
          <option value="">—</option>
          {PHASE_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {timeInPhase && task.phase && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-1 leading-none tabular-nums"
            style={meta ? { color: meta.color } : undefined}
            title={enteredAt ? new Date(enteredAt).toLocaleString() : ""}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-3">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .2.08.39.22.53l3 3a.75.75 0 101.06-1.06L10.75 9.69V5z" clipRule="evenodd" />
            </svg>
            {timeInPhase} in phase
          </span>
        )}
      </div>
      <select
        value={task.status}
        onChange={(e) => onUpdate("status", e.target.value)}
        className="text-xs px-1 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#999] rounded focus:outline-none"
      >
        <option value="todo">To Do</option>
        <option value="in-progress">In Progress</option>
        <option value="done">Done</option>
      </select>
      <button
        onClick={onOpenDetail}
        title={hasDeadline ? "View deadlines & timeline" : "Set deadlines & view timeline"}
        className={`p-1 rounded hover:bg-[#F3F3F5] ${hasDeadline ? "text-[#777]" : "text-[#CCC]"} hover:text-[#1A1A1A]`}
      >
        <CalendarIcon className="size-3.5" />
      </button>
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
  const [lane, setLane] = useState<"design" | "dev">("design");
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

  const addTask = (type: "design" | "dev", initialPhase?: string) => {
    const base: Task = { id: crypto.randomUUID(), title: "", assignee: "", dueDate: "", status: "todo", client: "" };
    const task = initialPhase ? appendPhaseTransition(base, initialPhase) : base;
    setBoard((prev) => {
      const key = type === "design" ? "designTasks" : "devTasks";
      return { ...prev, [key]: [...prev[key], task] };
    });
  };

  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const togglePhase = (key: string) => setCollapsedPhases((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = openTaskId
    ? [...board.designTasks, ...board.devTasks].find((t) => t.id === openTaskId) ?? null
    : null;
  const openTaskLane: "design" | "dev" | null = openTaskId
    ? board.designTasks.some((t) => t.id === openTaskId)
      ? "design"
      : "dev"
    : null;

  const updateTask = useCallback((type: "design" | "dev", id: string, field: string, value: string) => {
    setBoard((prev) => {
      const key = type === "design" ? "designTasks" : "devTasks";
      return {
        ...prev,
        [key]: prev[key].map((t) => {
          if (t.id !== id) return t;
          if (field === "phase") return appendPhaseTransition(t, value);
          return { ...t, [field]: value };
        }),
      };
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
  const laneTasks = lane === "design" ? filteredDesign : filteredDev;
  const laneAssignees = lane === "design" ? designers : developers;
  const laneCount = (lane === "design" ? board.designTasks : board.devTasks).length;
  const allAssignees = [...new Set((lane === "design" ? board.designTasks : board.devTasks).map((t) => t.assignee).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
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

      {/* Lane toggle */}
      <div className="inline-flex items-center p-1 bg-[#EFEFF1] rounded-lg mb-4">
        {(["design", "dev"] as const).map((l) => {
          const count = (l === "design" ? board.designTasks : board.devTasks).length;
          return (
            <button
              key={l}
              onClick={() => { setLane(l); setFilterAssignee(""); }}
              className={`px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center gap-2 ${
                lane === l ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#777] hover:text-[#1A1A1A]"
              }`}
            >
              <span className="size-1.5 rounded-full" style={{ background: l === "design" ? "#7C3AED" : "#059669" }} />
              {l === "design" ? "Design" : "Development"}
              <span className={`text-[10px] font-medium ${lane === l ? "text-[#AAA]" : "text-[#BBB]"}`}>{count}</span>
            </button>
          );
        })}
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

      {/* Active lane summary */}
      <div className="flex items-center gap-2 mb-4">
        <div className="size-2 rounded-full" style={{ background: lane === "design" ? "#7C3AED" : "#059669" }} />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
          {lane === "design" ? "Design Tasks" : "Dev Tasks"}
        </h2>
        <span className="text-[10px] text-[#BBB]">{laneTasks.length} of {laneCount}</span>
        <button
          onClick={() => addTask(lane)}
          className="ml-auto flex items-center gap-1 text-[11px] text-[#777] hover:text-[#1A1A1A]"
        >
          <PlusIcon className="size-3" /> Add task
        </button>
      </div>

      {laneTasks.length === 0 ? (
        <div className="border border-[#E5E5EA] rounded-xl bg-white">
          <p className="text-xs text-[#CCC] text-center py-10">No {lane === "design" ? "design" : "dev"} tasks match current filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupTasksByPhase(laneTasks).map((group) => {
            const isCollapsed = collapsedPhases.has(group.key);
            return (
              <div key={group.key} className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 hover:bg-[#FAFAFA] transition-colors">
                  <button
                    type="button"
                    onClick={() => togglePhase(group.key)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <ChevronDownIcon
                      className={`size-3.5 text-[#AAA] transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                    />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: group.bg, color: group.color }}
                    >
                      {group.label}
                    </span>
                    <span className="text-[11px] font-medium text-[#AAA]">{group.tasks.length}</span>
                  </button>
                  <button
                    onClick={() => addTask(lane, group.key === "not-started" ? "" : group.key)}
                    className="flex items-center gap-1 text-[11px] text-[#777] hover:text-[#1A1A1A]"
                  >
                    <PlusIcon className="size-3" /> Add
                  </button>
                </div>
                {!isCollapsed && (
                  <>
                    <div className="grid grid-cols-[1.3fr_140px_140px_180px_120px_32px_32px] gap-2 px-4 py-2 bg-[#FAFAFA] border-y border-[#E5E5EA]">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Task</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Client</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Assignee</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Phase</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Status</span>
                      <span />
                      <span />
                    </div>
                    {group.tasks.map((t) => (
                      <TaskEditorRow
                        key={t.id}
                        task={t}
                        assignees={laneAssignees}
                        onUpdate={(field, value) => updateTask(lane, t.id, field, value)}
                        onRemove={() => removeTask(lane, t.id)}
                        onOpenDetail={() => setOpenTaskId(t.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TaskDetailDrawer
        task={openTask}
        onClose={() => setOpenTaskId(null)}
        editable
        onUpdate={(field, value) => {
          if (!openTaskId || !openTaskLane) return;
          updateTask(openTaskLane, openTaskId, field, value);
        }}
      />
    </div>
  );
}
