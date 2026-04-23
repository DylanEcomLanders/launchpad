"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { PlusIcon, TrashIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { loadSettings, type TeamMember } from "@/lib/settings";
import {
  PHASE_OPTIONS,
  appendPhaseTransition,
  categoryForPhase,
  computeAssignee,
  computeUrgency,
  currentPhaseEnteredAt,
  formatDeadline,
  formatTimeInPhase,
  groupTasksByClient,
  matchesCategoryFilter,
  phaseMeta,
  relevantDeadline,
  type DeadlineChangeEntry,
  type PhaseCategory,
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
  designer?: string;
  developer?: string;
  deadlineHistory?: DeadlineChangeEntry[];
}

interface BoardData {
  designTasks: Task[];
  devTasks: Task[];
}

const ADMIN_KEY = typeof window !== "undefined" ? "ecomlanders2025" : "";

/* ── Stable row component (won't re-mount on parent state change) ── */
const TaskEditorRow = memo(function TaskEditorRow({
  task,
  onUpdate,
  onRemove,
  onOpenDetail,
  indented,
}: {
  task: Task;
  onUpdate: (field: string, value: string) => void;
  onRemove: () => void;
  onOpenDetail: () => void;
  indented?: boolean;
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
  const assignee = computeAssignee(task);
  const { field: deadlineField, value: relevantDue } = relevantDeadline(task);
  const urgency = computeUrgency(relevantDue);
  const urgencyColor = urgency === "overdue" ? "#DC2626" : urgency === "due-soon" ? "#D97706" : urgency === "ok" ? "#059669" : "#AAA";
  const deadlineShortLabel =
    deadlineField === "designDueDate" ? "Design" : deadlineField === "devDueDate" ? "Dev" : "Launch";

  return (
    <div className={`grid grid-cols-[1.3fr_130px_130px_170px_120px_110px_32px_32px] gap-2 ${indented ? "pl-8 pr-4" : "px-4"} py-2.5 border-b border-[#EDEDEF] last:border-0 items-center`}>
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
      <button
        type="button"
        onClick={onOpenDetail}
        title="Set designer / developer in drawer"
        className={`text-xs px-2 py-1 rounded text-left truncate hover:bg-[#F3F3F5] ${assignee ? "text-[#1A1A1A]" : "text-[#BBB]"}`}
      >
        {assignee || "Unassigned"}
      </button>
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
      <div className="flex flex-col gap-0.5 min-w-0">
        {relevantDue ? (
          <span className="text-[11px] font-semibold tabular-nums truncate" style={{ color: urgencyColor }}>
            {formatDeadline(relevantDue)}
          </span>
        ) : (
          <span className="text-[11px] text-[#DDD]">—</span>
        )}
        <span className="text-[9px] uppercase tracking-wider text-[#BBB] leading-none">{deadlineShortLabel}</span>
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
  const [tabFilter, setTabFilter] = useState<"all" | PhaseCategory>("all");
  const [phaseFilter, setPhaseFilter] = useState("");
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

  const addTask = (type: "design" | "dev", initialPhase?: string, initialClient?: string) => {
    const base: Task = { id: crypto.randomUUID(), title: "", assignee: "", dueDate: "", status: "todo", client: initialClient || "" };
    const task = initialPhase ? appendPhaseTransition(base, initialPhase) : base;
    setBoard((prev) => {
      const key = type === "design" ? "designTasks" : "devTasks";
      return { ...prev, [key]: [...prev[key], task] };
    });
  };

  // Resolves which list (designTasks or devTasks) a task currently lives in.
  const laneForTask = useCallback(
    (id: string): "design" | "dev" => (boardRef.current.designTasks.some((t) => t.id === id) ? "design" : "dev"),
    [],
  );

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

  // Deadline updates route through here so we can append a DeadlineChangeEntry
  // when the user moves an existing deadline and provides a reason.
  const updateDeadline = useCallback((
    type: "design" | "dev",
    id: string,
    field: "designDueDate" | "devDueDate" | "launchDueDate",
    value: string,
    reason?: string,
  ) => {
    setBoard((prev) => {
      const key = type === "design" ? "designTasks" : "devTasks";
      return {
        ...prev,
        [key]: prev[key].map((t) => {
          if (t.id !== id) return t;
          const prevValue = t[field];
          const updated = { ...t, [field]: value };
          if (reason && prevValue && prevValue !== value) {
            const entry: DeadlineChangeEntry = {
              field,
              previousValue: prevValue,
              newValue: value,
              reason,
              changedAt: new Date().toISOString(),
            };
            updated.deadlineHistory = [...(t.deadlineHistory || []), entry];
          }
          return updated;
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

  // Annotate each task with its lane, then merge into one list
  type AnnotatedTask = Task & { _lane: "design" | "dev" };
  const allTasks: AnnotatedTask[] = [
    ...board.designTasks.map((t) => ({ ...t, _lane: "design" as const })),
    ...board.devTasks.map((t) => ({ ...t, _lane: "dev" as const })),
  ];

  // Counts per top tab, from the unfiltered merged list
  const tabCounts = {
    all: allTasks.length,
    research: allTasks.filter((t) => matchesCategoryFilter(t, "research", t._lane)).length,
    design: allTasks.filter((t) => matchesCategoryFilter(t, "design", t._lane)).length,
    dev: allTasks.filter((t) => matchesCategoryFilter(t, "dev", t._lane)).length,
  };

  // Apply tab + phase + assignee + date filters
  const filteredTasks = allTasks.filter((t) => {
    if (!matchesCategoryFilter(t, tabFilter, t._lane)) return false;
    if (phaseFilter && t.phase !== phaseFilter) return false;
    if (filterAssignee && computeAssignee(t) !== filterAssignee) return false;
    if (filterDate !== "all") {
      const dueDates = [t.designDueDate, t.devDueDate, t.launchDueDate].filter(Boolean) as string[];
      if (dueDates.length === 0) return false;
      const today = new Date().toISOString().split("T")[0];
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
      const weekEndStr = weekEnd.toISOString().split("T")[0];
      if (filterDate === "overdue") return dueDates.some((d) => d < today && t.status !== "done");
      if (filterDate === "today") return dueDates.some((d) => d === today);
      if (filterDate === "this-week") return dueDates.some((d) => d >= today && d <= weekEndStr);
    }
    return true;
  });

  const visibleAssignees = [...new Set(filteredTasks.map((t) => computeAssignee(t)).filter(Boolean))].sort();

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

      {/* Tab filter — All / Research / Design / Development */}
      <div className="inline-flex items-center p-1 bg-[#EFEFF1] rounded-lg mb-4">
        {([
          { value: "all", label: "All", color: "#1A1A1A" },
          { value: "research", label: "Research", color: "#0891B2" },
          { value: "design", label: "Design", color: "#7C3AED" },
          { value: "dev", label: "Development", color: "#059669" },
        ] as const).map((t) => (
          <button
            key={t.value}
            onClick={() => { setTabFilter(t.value); setFilterAssignee(""); }}
            className={`px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center gap-2 ${
              tabFilter === t.value ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#777] hover:text-[#1A1A1A]"
            }`}
          >
            {t.value !== "all" && <span className="size-1.5 rounded-full" style={{ background: t.color }} />}
            {t.label}
            <span className={`text-[10px] font-medium ${tabFilter === t.value ? "text-[#AAA]" : "text-[#BBB]"}`}>
              {tabCounts[t.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={phaseFilter}
          onChange={(e) => {
            const next = e.target.value;
            setPhaseFilter(next);
            if (next) {
              const cat = categoryForPhase(next);
              if (cat) setTabFilter(cat);
            }
          }}
          className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-lg bg-white focus:outline-none"
        >
          <option value="">All phases</option>
          {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-lg bg-white focus:outline-none"
        >
          <option value="">All Assignees</option>
          {visibleAssignees.map((a) => <option key={a} value={a}>{a}</option>)}
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
        {(filterAssignee || filterDate !== "all" || phaseFilter) && (
          <button onClick={() => { setFilterAssignee(""); setFilterDate("all"); setPhaseFilter(""); }} className="text-[11px] text-[#AAA] hover:text-[#1A1A1A]">Clear</button>
        )}
      </div>

      {/* Summary + add */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
          {tabFilter === "all" ? "All tasks" : tabFilter === "research" ? "Research" : tabFilter === "design" ? "Design" : "Development"}
        </h2>
        <span className="text-[10px] text-[#BBB]">{filteredTasks.length} of {tabCounts[tabFilter]}</span>
        <button
          onClick={() => addTask(tabFilter === "dev" ? "dev" : "design")}
          className="ml-auto flex items-center gap-1 text-[11px] text-[#777] hover:text-[#1A1A1A]"
        >
          <PlusIcon className="size-3" /> Add task
        </button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="border border-[#E5E5EA] rounded-xl bg-white">
          <p className="text-xs text-[#CCC] text-center py-10">No tasks match current filters</p>
        </div>
      ) : (
        <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
          <div className="grid grid-cols-[1.3fr_130px_130px_170px_120px_110px_32px_32px] gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA]">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Task</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Client</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Assignee</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Phase</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Deadline</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Status</span>
            <span />
            <span />
          </div>
          {groupTasksByClient(filteredTasks).map((group, i) => (
            <div key={group.key}>
              <div className={`flex items-center gap-2 px-4 pb-2 ${i === 0 ? "pt-4" : "pt-10"}`}>
                <h3 className={`text-sm font-bold tracking-wide flex-1 ${group.key === "__unassigned__" ? "text-[#AAA] italic" : "text-[#1A1A1A]"}`}>
                  {group.label.toUpperCase()}
                </h3>
                <span className="text-[10px] font-medium text-[#AAA]">
                  {group.tasks.length} {group.tasks.length === 1 ? "deliverable" : "deliverables"}
                </span>
                <button
                  onClick={() => addTask(tabFilter === "dev" ? "dev" : "design", undefined, group.key === "__unassigned__" ? "" : group.label)}
                  className="flex items-center gap-1 text-[11px] text-[#777] hover:text-[#1A1A1A] ml-2"
                  title={group.key === "__unassigned__" ? "Add task" : `Add deliverable for ${group.label}`}
                >
                  <PlusIcon className="size-3" /> Add
                </button>
              </div>
              {group.tasks.map((t) => (
                <TaskEditorRow
                  key={t.id}
                  task={t}
                  onUpdate={(field, value) => updateTask(laneForTask(t.id), t.id, field, value)}
                  onRemove={() => removeTask(laneForTask(t.id), t.id)}
                  onOpenDetail={() => setOpenTaskId(t.id)}
                  indented
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <TaskDetailDrawer
        task={openTask}
        onClose={() => setOpenTaskId(null)}
        editable
        designers={designers.map((m) => ({ id: m.id, name: m.name }))}
        developers={developers.map((m) => ({ id: m.id, name: m.name }))}
        onUpdate={(field, value) => {
          if (!openTaskId || !openTaskLane) return;
          updateTask(openTaskLane, openTaskId, field, value);
        }}
        onUpdateDeadline={(field, value, reason) => {
          if (!openTaskId || !openTaskLane) return;
          updateDeadline(openTaskLane, openTaskId, field, value, reason);
        }}
      />
    </div>
  );
}
