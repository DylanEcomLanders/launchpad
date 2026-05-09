"use client";

// ─── Per-member calendars ──────────────────────────────────────────
// One mini calendar grid per pod member. Each shows that member's
// tasks plotted on the day they're due. Renders Mon–Fri columns
// across either a single week (week mode) or four weeks (month mode).

import { useMemo } from "react";
import {
  Client,
  PodMember,
  Project,
  Task,
  TaskDiscipline,
  TaskPhase,
  TASK_PHASE_LABEL,
} from "@/lib/pods-v2/types";
import { formatDayMonth, todayYMD } from "@/lib/dates";
import { isThursday } from "@/lib/pods-v2/calc";
import { MemberRow } from "./components";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function parseYMD(s: string): Date {
  return new Date(`${s}T12:00:00`);
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (parseYMD(b).getTime() - parseYMD(a).getTime()) / 86_400_000,
  );
}

/** Build N weeks × 5 weekdays, starting from this week's Monday. */
function buildWeekGrid(today: string, weeks: number): string[][] {
  const t = parseYMD(today);
  const dow = t.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  const monday = new Date(t);
  monday.setDate(t.getDate() - back);
  const grid: string[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: string[] = [];
    for (let d = 0; d < 5; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + w * 7 + d);
      week.push(ymd(day));
    }
    grid.push(week);
  }
  return grid;
}

const PHASE_DOT: Record<TaskPhase, string> = {
  onboarding: "bg-[#9CA3AF]",
  research: "bg-[#0891B2]",
  wireframe: "bg-[#F59E0B]",
  design: "bg-[#7C3AED]",
  "internal-design-qa": "bg-[#9333EA]",
  "external-design-review": "bg-[#DB2777]",
  "design-revision": "bg-[#EA580C]",
  development: "bg-[#059669]",
  "development-qa": "bg-[#047857]",
  "external-dev-review": "bg-[#DC2626]",
  "dev-revision": "bg-[#D97706]",
  launch: "bg-[#1A1A1A]",
};

const DISCIPLINE_BADGE: Record<TaskDiscipline, string> = {
  strategy: "border-amber-200 bg-amber-50 text-amber-800",
  design: "border-purple-200 bg-purple-50 text-purple-800",
  development: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

interface MemberCalendarsProps {
  members: PodMember[];
  tasks: Task[];
  projects: Project[];
  clientById: Map<string, Client>;
  mode: "week" | "month";
}

export function MemberCalendars({
  members,
  tasks,
  projects,
  clientById,
  mode,
}: MemberCalendarsProps) {
  const today = todayYMD();
  const weekCount = mode === "month" ? 4 : 1;
  const grid = useMemo(
    () => buildWeekGrid(today, weekCount),
    [today, weekCount],
  );

  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p] as const)),
    [projects],
  );

  return (
    <div
      className={`mt-3 grid grid-cols-1 gap-4 ${
        mode === "month" ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"
      }`}
    >
      {members.map((member) => {
        const myTasks = tasks.filter(
          (t) => t.assigned_to === member.id && t.status !== "done",
        );
        return (
          <MemberCalendar
            key={member.id}
            member={member}
            tasks={myTasks}
            projectById={projectById}
            clientById={clientById}
            grid={grid}
            today={today}
            mode={mode}
          />
        );
      })}
    </div>
  );
}

function MemberCalendar({
  member,
  tasks,
  projectById,
  clientById,
  grid,
  today,
  mode,
}: {
  member: PodMember;
  tasks: Task[];
  projectById: Map<string, Project>;
  clientById: Map<string, Client>;
  grid: string[][];
  today: string;
  mode: "week" | "month";
}) {
  // Group tasks by their due_date. Tasks falling outside the visible grid
  // bucket into "earlier" / "later" lists.
  const minYMD = grid[0][0];
  const maxYMD = grid[grid.length - 1][4];
  const tasksByDay = new Map<string, Task[]>();
  const earlier: Task[] = [];
  const later: Task[] = [];
  for (const t of tasks) {
    if (t.due_date < minYMD) {
      earlier.push(t);
    } else if (t.due_date > maxYMD) {
      later.push(t);
    } else {
      const arr = tasksByDay.get(t.due_date) ?? [];
      arr.push(t);
      tasksByDay.set(t.due_date, arr);
    }
  }

  return (
    <div className="rounded-xl border border-[#E5E5EA] bg-white shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#E5E5EA] px-4 py-3">
        <MemberRow member={member} />
        <div className="flex items-center gap-2 text-[11px] text-[#7A7A7A]">
          <span className="tabular-nums">{tasks.length}</span>
          <span>open</span>
          {earlier.length > 0 && (
            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700">
              {earlier.length} overdue
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 border-b border-[#EDEDEF] bg-[#F7F8FA]">
        {DOW_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#7A7A7A]"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="divide-y divide-[#EDEDEF]">
        {grid.map((week) => (
          <div key={week[0]} className="grid grid-cols-5">
            {week.map((dayYMD) => {
              const isToday = dayYMD === today;
              const isThu = isThursday(dayYMD);
              const dayTasks = tasksByDay.get(dayYMD) ?? [];
              return (
                <div
                  key={dayYMD}
                  className={`min-h-[80px] border-r border-[#EDEDEF] p-1.5 last:border-r-0 ${
                    isToday ? "bg-[#FFFCEF]" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] tabular-nums ${
                        isToday
                          ? "font-semibold text-[#1B1B1B]"
                          : isThu
                            ? "text-[#1B1B1B]"
                            : "text-[#7A7A7A]"
                      }`}
                    >
                      {formatDayMonth(dayYMD)}
                    </span>
                    {dayTasks.length > 1 && (
                      <span className="rounded bg-[#F3F3F5] px-1 text-[9px] tabular-nums text-[#7A7A7A]">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayTasks.map((t) => (
                      <MemberTaskTile
                        key={t.id}
                        task={t}
                        project={projectById.get(t.project_id)}
                        client={
                          projectById.get(t.project_id)
                            ? clientById.get(
                                projectById.get(t.project_id)!.client_id,
                              )
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {(earlier.length > 0 || later.length > 0) && (
        <div className="border-t border-[#EDEDEF] bg-[#F7F8FA] px-3 py-2 text-[10px] text-[#7A7A7A]">
          {earlier.length > 0 && (
            <span className="mr-3 text-rose-700">
              {earlier.length} earlier overdue
            </span>
          )}
          {later.length > 0 && (
            <span>{later.length} due after this {mode === "month" ? "month" : "week"}</span>
          )}
        </div>
      )}
    </div>
  );
}

function MemberTaskTile({
  task,
  project,
  client,
}: {
  task: Task;
  project?: Project;
  client?: Client;
}) {
  const phase = task.phase;
  return (
    <div
      className={`rounded border bg-white px-1.5 py-1 text-[10px] ${DISCIPLINE_BADGE[task.discipline]}`}
      title={`${task.title}${
        project ? ` · ${project.name}` : ""
      }${client ? ` · ${client.name}` : ""}${
        phase ? ` · ${TASK_PHASE_LABEL[phase]}` : ""
      }`}
    >
      <div className="flex items-center gap-1">
        {phase && (
          <span
            className={`size-1.5 shrink-0 rounded-full ${PHASE_DOT[phase]}`}
            aria-hidden
          />
        )}
        <span className="truncate font-medium">{task.title}</span>
      </div>
      {(client || project) && (
        <div className="truncate text-[9px] opacity-75">
          {client?.name ?? project?.name}
        </div>
      )}
    </div>
  );
}
