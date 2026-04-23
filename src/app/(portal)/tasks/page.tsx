"use client";

import { useState, useEffect, useMemo } from "react";
import { Logo } from "@/components/logo";
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

type TabFilter = "all" | PhaseCategory;
type AnnotatedTask = Task & { _lane: "design" | "dev" };

const GRID = "grid-cols-[minmax(0,1fr)_140px_170px_130px_130px]";

const TAB_META: { value: TabFilter; label: string; color: string }[] = [
  { value: "all", label: "All", color: "#1A1A1A" },
  { value: "research", label: "Research", color: "#0891B2" },
  { value: "design", label: "Design", color: "#7C3AED" },
  { value: "dev", label: "Development", color: "#059669" },
];

export default function TaskBoardPage() {
  const [board, setBoard] = useState<BoardData>({ designTasks: [], devTasks: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [tabFilter, setTabFilter] = useState<TabFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("");

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

  // Merge both lists with lane annotation
  const allTasks = useMemo<AnnotatedTask[]>(
    () => [
      ...board.designTasks.map((t) => ({ ...t, _lane: "design" as const })),
      ...board.devTasks.map((t) => ({ ...t, _lane: "dev" as const })),
    ],
    [board],
  );

  // Per-tab active counts (non-done) for the tab pills
  const tabCounts = useMemo(() => {
    const active = allTasks.filter((t) => t.status !== "done");
    return {
      all: active.length,
      research: active.filter((t) => matchesCategoryFilter(t, "research", t._lane)).length,
      design: active.filter((t) => matchesCategoryFilter(t, "design", t._lane)).length,
      dev: active.filter((t) => matchesCategoryFilter(t, "dev", t._lane)).length,
    };
  }, [allTasks]);

  const tabFiltered = allTasks.filter((t) => matchesCategoryFilter(t, tabFilter, t._lane));

  const assignees = useMemo(
    () => [...new Set(tabFiltered.map((t) => computeAssignee(t)).filter(Boolean))].sort(),
    [tabFiltered],
  );

  // Reset assignee filter if it no longer matches anyone in the current tab
  useEffect(() => {
    if (assigneeFilter && !assignees.includes(assigneeFilter)) setAssigneeFilter("");
  }, [assignees, assigneeFilter]);

  const sortByDate = (tasks: AnnotatedTask[]) =>
    [...tasks].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const applyAssigneeFilter = (tasks: AnnotatedTask[]) =>
    assigneeFilter ? tasks.filter((t) => computeAssignee(t) === assigneeFilter) : tasks;
  const applyPhaseFilter = (tasks: AnnotatedTask[]) =>
    phaseFilter ? tasks.filter((t) => t.phase === phaseFilter) : tasks;

  const visibleTasks = applyPhaseFilter(applyAssigneeFilter(tabFiltered));
  const active = sortByDate(visibleTasks.filter((t) => t.status !== "done"));
  const done = visibleTasks.filter((t) => t.status === "done");
  const activeGroups = groupTasksByClient(active);

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = openTaskId ? allTasks.find((t) => t.id === openTaskId) ?? null : null;

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

  function TaskRow({ task, indented }: { task: Task; indented?: boolean }) {
    const pMeta = phaseMeta(task.phase);
    const enteredAt = currentPhaseEnteredAt(task.phaseHistory);
    const timeInPhase = enteredAt ? formatTimeInPhase(enteredAt) : null;
    const { field: deadlineField, value: relevantDue } = relevantDeadline(task);
    const urgency = computeUrgency(relevantDue);
    const urgencyColor = urgency === "overdue" ? "#DC2626" : urgency === "due-soon" ? "#D97706" : urgency === "ok" ? "#059669" : "#AAA";
    const deadlineLabel =
      deadlineField === "designDueDate" ? "Design" : deadlineField === "devDueDate" ? "Dev" : "Launch";
    const assignee = computeAssignee(task);

    return (
      <div
        className={`grid ${GRID} gap-4 items-center ${indented ? "pl-9 pr-5" : "px-5"} py-3.5 border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFAFA] cursor-pointer transition-colors`}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("select")) return;
          setOpenTaskId(task.id);
        }}
      >
        {/* Task */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {urgency && (
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ background: urgency === "overdue" ? "#DC2626" : urgency === "due-soon" ? "#D97706" : "#D4D4D8" }}
                title={urgency === "overdue" ? "Overdue" : urgency === "due-soon" ? "Due soon" : "On track"}
              />
            )}
            <p className="text-sm font-medium text-[#1A1A1A] truncate">{task.title}</p>
          </div>
          {task.client && <p className="text-[10px] text-[#AAA] mt-0.5 truncate">{task.client}</p>}
        </div>

        {/* Assignee (computed) */}
        <div className="min-w-0">
          {assignee ? (
            <span className="text-xs text-[#1A1A1A] truncate block">{assignee}</span>
          ) : (
            <span className="text-xs text-[#CCC]">Unassigned</span>
          )}
        </div>

        {/* Phase */}
        <div className="relative">
          <select
            value={task.phase || ""}
            onChange={(e) => changePhase(task.id, e.target.value)}
            className="w-full appearance-none text-[10px] font-semibold uppercase tracking-wider pl-2.5 pr-6 py-1 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 border-0"
            style={pMeta ? { background: pMeta.bg, color: pMeta.color } : { background: "#F3F3F5", color: "#AAA" }}
            title="Change phase"
          >
            <option value="">Set phase…</option>
            {PHASE_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 size-2.5 opacity-60"
            style={pMeta ? { color: pMeta.color } : { color: "#AAA" }}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Associated deadline (auto-picks based on current phase) */}
        <div className="flex flex-col items-start gap-0.5 min-w-0">
          {relevantDue ? (
            <>
              <span className="text-[11px] font-semibold tabular-nums truncate" style={{ color: urgencyColor }}>
                {formatDeadline(relevantDue)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#AAA]">{deadlineLabel} deadline</span>
            </>
          ) : (
            <>
              <span className="text-[11px] text-[#DDD]">—</span>
              <span className="text-[9px] uppercase tracking-wider text-[#CCC]">{deadlineLabel} deadline</span>
            </>
          )}
        </div>

        {/* Time in phase */}
        <div className="flex justify-end">
          {timeInPhase && pMeta ? (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tabular-nums"
              style={{ color: pMeta.color }}
              title={enteredAt ? `Entered ${new Date(enteredAt).toLocaleString()}` : ""}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .2.08.39.22.53l3 3a.75.75 0 101.06-1.06L10.75 9.69V5z"
                  clipRule="evenodd"
                />
              </svg>
              {timeInPhase}
            </span>
          ) : (
            <span className="text-[11px] text-[#DDD]">—</span>
          )}
        </div>
      </div>
    );
  }

  function ColumnHeader() {
    return (
      <div className={`grid ${GRID} gap-4 px-5 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA]`}>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Task</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Assignee</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Phase</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Deadline</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA] text-right">Time in phase</span>
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

  const currentTabMeta = TAB_META.find((t) => t.value === tabFilter)!;
  const assigneeFilterLabel =
    tabFilter === "research"
      ? "All assignees"
      : tabFilter === "design"
      ? "All designers"
      : tabFilter === "dev"
      ? "All developers"
      : "All assignees";

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
        {/* Tab + assignee filter */}
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="inline-flex items-center p-1 bg-[#EFEFF1] rounded-lg">
            {TAB_META.map((t) => (
              <button
                key={t.value}
                onClick={() => setTabFilter(t.value)}
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

          <div className="flex items-center gap-2">
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
              className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-lg bg-white focus:outline-none focus:border-[#999]"
            >
              <option value="">All phases</option>
              {PHASE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-lg bg-white focus:outline-none focus:border-[#999]"
            >
              <option value="">{assigneeFilterLabel}</option>
              {assignees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            {(assigneeFilter || phaseFilter) && (
              <button
                onClick={() => { setAssigneeFilter(""); setPhaseFilter(""); }}
                className="text-[11px] text-[#AAA] hover:text-[#1A1A1A]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-2 mb-4">
          {tabFilter !== "all" && <div className="size-2 rounded-full" style={{ background: currentTabMeta.color }} />}
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
            {currentTabMeta.label} ({active.length} active)
            {assigneeFilter && <span className="text-[#BBB] normal-case font-normal"> · {assigneeFilter}</span>}
          </h2>
        </div>

        {/* One continuous list, grouped by client via in-table header rows */}
        {active.length === 0 ? (
          <div className="bg-white border border-[#E5E5EA] rounded-xl">
            <p className="text-xs text-[#CCC] text-center py-10">
              No active tasks{assigneeFilter ? ` for ${assigneeFilter}` : ""}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden">
            <ColumnHeader />
            {activeGroups.map((group, i) => (
              <div key={group.key}>
                <div className={`flex items-center gap-2 px-5 pb-1.5 ${i === 0 ? "pt-4" : "pt-6"} border-t ${i === 0 ? "border-transparent" : "border-[#F0F0F0]"}`}>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${group.key === "__unassigned__" ? "text-[#AAA] italic" : "text-[#1A1A1A]"}`}>
                    {group.label}
                  </h3>
                  <span className="text-[10px] font-medium text-[#AAA]">
                    {group.tasks.length} {group.tasks.length === 1 ? "deliverable" : "deliverables"}
                  </span>
                </div>
                {group.tasks.map((t) => <TaskRow key={t.id} task={t} indented />)}
              </div>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <details className="mt-4">
            <summary className="text-[10px] text-[#CCC] cursor-pointer hover:text-[#999]">
              {done.length} completed
            </summary>
            <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden mt-2 opacity-60">
              <ColumnHeader />
              {done.map((t) => <TaskRow key={t.id} task={t} />)}
            </div>
          </details>
        )}
      </div>

      <div className="text-center py-6">
        <p className="text-[10px] text-[#CCC]">Auto-refreshes every 30 seconds</p>
      </div>

      <TaskDetailDrawer task={openTask} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}
