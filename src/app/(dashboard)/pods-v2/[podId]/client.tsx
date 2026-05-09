"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ClockIcon } from "@heroicons/react/24/solid";
import { useRole } from "@/components/auth-gate";
import {
  addTask,
  deleteTask,
  ensureSeed,
  getClientsForPod,
  getPodById,
  getProjectsForPod,
  getTasks,
  addBlocker,
  addPairedDeliverable,
  deleteBlocker,
  getPods,
  moveClientToPod,
  parkClient,
  pauseTask,
  reassignTask,
  reopenBlocker,
  resolveBlocker,
  resumeTask,
  updateMemberAvatar,
  updatePodSlackChannel,
  updateTaskPhase,
  updateTaskPriority,
  updateTaskStatus,
} from "@/lib/pods-v2/data";
import {
  capacityUsed,
  fourWeekWindow,
  isMidWeekKickoff,
} from "@/lib/pods-v2/calc";
import {
  Client,
  PAGE_DEFAULT_WEIGHT,
  PAGE_LABEL,
  PAGE_WEIGHT_POINTS,
  PageType,
  Pod,
  PodMember,
  Project,
  RETAINER_SCOPE,
  RetainerTier,
  CYCLE_WEEK_LABEL,
  TASK_PHASE_LABEL,
  TASK_PHASE_ORDER,
  Task,
  TaskPhase,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/lib/pods-v2/types";
import { formatDayMonth, todayYMD } from "@/lib/dates";
import { formatTimeInPhase } from "@/lib/task-board/phases";
import {
  CapacityMeter,
  MemberAvatar,
  MemberRow,
  PodHeading,
} from "../components";
import { selectClass } from "@/lib/form-styles";

const TIER_PILL: Record<RetainerTier, { label: string; cls: string }> = {
  none: {
    label: "Project-only",
    cls: "border-[#E5E5EA] bg-[#F3F3F5] text-[#7A7A7A]",
  },
  "8k": {
    label: "£8k retainer",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  "12k": {
    label: "£12k retainer",
    cls: "border-amber-200 bg-amber-50 text-amber-800",
  },
};

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  core_deliverable: "Core deliverable",
  revision: "Revision",
  bug: "Bug",
  desktop_fix: "Desktop fix",
  asset_prep: "Asset prep",
  library: "Library",
};

const TASK_TYPE_BADGE: Record<TaskType, string> = {
  core_deliverable: "border-[#1B1B1B]/15 bg-white text-[#1B1B1B]",
  revision: "border-blue-200 bg-blue-50 text-blue-800",
  bug: "border-rose-200 bg-rose-50 text-rose-800",
  desktop_fix: "border-purple-200 bg-purple-50 text-purple-800",
  asset_prep: "border-amber-200 bg-amber-50 text-amber-800",
  library: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const PHASE_PILL: Record<TaskPhase, string> = {
  onboarding: "bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]",
  research: "bg-[#ECFEFF] text-[#0E7490] border-[#A5F3FC]",
  design: "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]",
  "internal-design-qa": "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]",
  "external-design-review": "bg-[#FDF2F8] text-[#BE185D] border-[#FBCFE8]",
  "design-revision": "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]",
  development: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]",
  "development-qa": "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]",
  "external-dev-review": "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
  "dev-revision": "bg-[#FFFBEB] text-[#A16207] border-[#FDE68A]",
  launch: "bg-[#1B1B1B] text-white border-[#1B1B1B]",
};

const DISCIPLINE_BADGE: Record<TaskDisciplineLocal, string> = {
  design: "border-purple-200 bg-purple-50 text-purple-800",
  development: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

type TaskDisciplineLocal = "design" | "development";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_PILL: Record<TaskPriority, string> = {
  low: "border-[#E5E5EA] bg-white text-[#7A7A7A]",
  normal: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  urgent: "border-rose-200 bg-rose-50 text-rose-700",
};

const PRIORITY_ORDER: TaskPriority[] = ["low", "normal", "high", "urgent"];

// ─── Helpers ────────────────────────────────────────────────────────

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


// ─── Component ──────────────────────────────────────────────────────

export default function PodDetailClient({ podId }: { podId: string }) {
  const role = useRole();
  /* Team flavour decided by URL: anything under /team/pods/* runs in
   * the (team) layout and force-downgrades isAdmin. Legacy ?view=team
   * + sessionStorage flag still honoured as fallback. */
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inTeamRoute = pathname?.startsWith("/team/pods") ?? false;
  const linkBase = inTeamRoute ? "/team/pods" : "/pods-v2";
  const [paramTeamView, setParamTeamView] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (searchParams.get("view") === "team") {
      sessionStorage.setItem("pods-v2-team-view", "1");
      setParamTeamView(true);
      return;
    }
    setParamTeamView(sessionStorage.getItem("pods-v2-team-view") === "1");
  }, [searchParams]);
  const forceTeamView = inTeamRoute || paramTeamView;
  const isAdmin = role === "admin" && !forceTeamView;
  const [pod, setPod] = useState<Pod | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setPod(getPodById(podId));
    setProjects(getProjectsForPod(podId));
    setClients(getClientsForPod(podId));
    setTasks(getTasks());
  };

  useEffect(() => {
    ensureSeed();
    setPod(getPodById(podId));
    refresh();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podId]);

  const today = todayYMD();

  /* Two windows for the meter — current 4-week month from today's Mon,
   * then the 4 weeks after that. M2/M3 cycle tasks carry half-points
   * so the next-month projection actually catches the iteration load. */
  const { used, nextMonthUsed } = useMemo(() => {
    const tw = fourWeekWindow(today);
    const dayAfterEnd = (() => {
      const d = new Date(`${tw.end}T12:00:00`);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();
    const nw = fourWeekWindow(dayAfterEnd);
    return {
      used: capacityUsed(projects, tasks, tw.start, tw.end),
      nextMonthUsed: capacityUsed(projects, tasks, nw.start, nw.end),
    };
  }, [projects, tasks, today]);

  const clientById = useMemo(() => {
    const map = new Map<string, Client>();
    for (const c of clients) map.set(c.id, c);
    return map;
  }, [clients]);

  const liveProjectIds = useMemo(
    () =>
      new Set(
        projects.filter((p) => p.status !== "shipped").map((p) => p.id),
      ),
    [projects],
  );
  const podMemberIds = useMemo(
    () => new Set(pod?.members.map((m) => m.id) ?? []),
    [pod],
  );

  /* All work in flight for the pod, regardless of task type. The view used
   * to split this into a Core Deliverables swim lane + a Tickets table —
   * combined into one per-member list so each pod member's full plate
   * lives in the same place. Sort by due date so urgent items float up. */
  const allTasks = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            podMemberIds.has(t.assigned_to) &&
            liveProjectIds.has(t.project_id),
        )
        .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")),
    [tasks, liveProjectIds, podMemberIds],
  );

  if (loading || !pod) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="text-sm text-[#7A7A7A]">Loading pod…</div>
      </div>
    );
  }

  const projectById = new Map(projects.map((p) => [p.id, p] as const));

  const midWeekCount = projects.filter(isMidWeekKickoff).length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
      <div className="flex items-center justify-between">
        <Link
          href={linkBase}
          className="inline-flex items-center gap-1 text-xs text-[#7A7A7A] hover:text-[#1B1B1B]"
        >
          <ChevronLeftIcon className="size-3.5" />
          All pods
        </Link>
        {isAdmin && (
          <Link
            href="/pods-v2/new-project"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B1B1B] bg-[#1B1B1B] px-3 py-2 text-xs font-medium text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[#2D2D2D]"
          >
            <PlusIcon className="size-3.5" />
            New project
          </Link>
        )}
      </div>

      {/* HEADER STRIP */}
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1fr,360px]">
        <div className="rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-[var(--shadow-soft)]">
          <PodHeading name={pod.name} tagline={pod.tagline} />
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {pod.members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                onChangeAvatar={(url) => {
                  updateMemberAvatar(m.id, url);
                  refresh();
                }}
              />
            ))}
          </div>
        </div>
        <CapacityPanel
          pod={pod}
          used={used}
          nextMonthUsed={nextMonthUsed}
          projects={projects}
          tasks={tasks}
          midWeekCount={midWeekCount}
        />
      </div>

      {/* BLOCKERS — pod-wide blockers visible to everyone */}
      <PodBlockersPanel pod={pod} onMutate={refresh} isAdmin={isAdmin} />

      {/* CLIENT ROSTER — moved up */}
      <ClientRoster clients={clients} currentPodId={pod.id} onMutate={refresh} canUnassign={isAdmin} />

      {/* WORK IN FLIGHT — one column per pod member, all task types combined */}
      <SwimLane
        title="Work in flight"
        subtitle="Core deliverables and tickets. One column per pod member, sorted by due date."
        members={pod.members}
        allMembers={pod.members}
        tasks={allTasks}
        projectById={projectById}
        clientById={clientById}
        today={today}
        onMutate={refresh}
        defaultTaskType="core_deliverable"
        isAdmin={isAdmin}
      />
    </div>
  );
}

// ─── Capacity panel with breakdown ──────────────────────────────────

function CapacityPanel({
  pod,
  used,
  nextMonthUsed,
  projects,
  tasks,
  midWeekCount,
}: {
  pod: Pod;
  used: number;
  nextMonthUsed: number;
  projects: Project[];
  tasks: Task[];
  midWeekCount: number;
}) {
  const inFlight = projects.filter(
    (p) => p.status === "in_progress" || p.status === "in_review",
  ).length;
  const queued = projects.filter((p) => p.status === "queued").length;
  const taskCounts = pod.members.map((m) => ({
    member: m,
    count: tasks.filter(
      (t) =>
        t.assigned_to === m.id &&
        t.status !== "done",
    ).length,
  }));
  const cycleProjectIds = new Set(tasks.filter((t) => t.cycle).map((t) => t.project_id));
  const cycleRetainers = projects.filter(
    (p) => cycleProjectIds.has(p.id) && p.status !== "shipped" && p.status !== "slipped",
  ).length;

  return (
    <div className="rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <CapacityMeter
            used={used}
            total={pod.capacity_points_per_month}
            label="Capacity this month"
            cycleRetainers={cycleRetainers}
            nextMonthUsed={nextMonthUsed}
          />
        </div>
        <SnapshotStat label="In flight" value={inFlight} />
        <SnapshotStat label="Queued" value={queued} />
        <SnapshotStat
          label="Mid-week kickoffs"
          value={midWeekCount}
          tone={midWeekCount > 0 ? "alert" : undefined}
        />
        <SnapshotStat label="Members" value={pod.members.length} />
      </div>
      <div className="mt-4 border-t border-[#EDEDEF] pt-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
          Open tasks per member
        </div>
        <div className="mt-2 space-y-1.5">
          {taskCounts.map(({ member, count }) => (
            <div
              key={member.id}
              className="flex items-center justify-between text-xs"
            >
              <span
                className={`truncate ${
                  member.is_placeholder ? "italic text-[#A0A0A0]" : ""
                }`}
              >
                {member.is_placeholder ? "TO HIRE" : member.name}
              </span>
              <span className="tabular-nums text-[#7A7A7A]">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SnapshotStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "alert";
}) {
  const cls =
    tone === "alert"
      ? "bg-rose-50 text-rose-900"
      : "bg-[#F7F8FA] text-[#1B1B1B]";
  return (
    <div className={`rounded-lg px-3 py-2 ${cls}`}>
      <div className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}


// ─── Primary swim lane ────────────────────────────────────────────

function SwimLane({
  title,
  subtitle,
  members,
  allMembers,
  tasks,
  projectById,
  clientById,
  today,
  onMutate,
  defaultTaskType,
  isAdmin,
}: {
  title: string;
  subtitle: string;
  members: PodMember[];
  allMembers: PodMember[];
  tasks: Task[];
  projectById: Map<string, Project>;
  clientById: Map<string, Client>;
  today: string;
  onMutate: () => void;
  defaultTaskType: TaskType;
  isAdmin: boolean;
}) {
  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-[#7A7A7A]">{subtitle}</p>
        </div>
        <div className="text-[11px] text-[#A0A0A0]">
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {members.map((member) => {
          /* Open tasks first (sorted by due date), done tasks pushed to
           * the bottom of each column. */
          const myTasks = tasks
            .filter((t) => t.assigned_to === member.id)
            .sort((a, b) => {
              if (a.status === "done" && b.status !== "done") return 1;
              if (a.status !== "done" && b.status === "done") return -1;
              return (a.due_date || "").localeCompare(b.due_date || "");
            });
          return (
            <div
              key={member.id}
              className="rounded-xl border border-[#E5E5EA] bg-white p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between">
                <MemberRow
                  member={member}
                  onChangeAvatar={(url) => {
                    updateMemberAvatar(member.id, url);
                    onMutate();
                  }}
                />
                <span className="text-[11px] tabular-nums text-[#7A7A7A]">
                  {myTasks.length}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {myTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#E5E5EA] px-3 py-3 text-center text-[11px] text-[#A0A0A0]">
                    No tasks
                  </div>
                )}
                {myTasks.map((t) => (
                  <PrimaryTaskRow
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
                    members={allMembers}
                    today={today}
                    onMutate={onMutate}
                    isAdmin={isAdmin}
                  />
                ))}
                <AddTaskInline
                  member={member}
                  allMembers={allMembers}
                  defaultType={defaultTaskType}
                  projects={Array.from(projectById.values())}
                  clientById={clientById}
                  onMutate={onMutate}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrimaryTaskRow({
  task,
  project,
  client,
  members,
  today,
  onMutate,
  isAdmin,
}: {
  task: Task;
  project?: Project;
  client?: Client;
  members: PodMember[];
  today: string;
  isAdmin: boolean;
  onMutate: () => void;
}) {
  const [reassignOpen, setReassignOpen] = useState(false);
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reassignOpen && !phaseOpen && !priorityOpen && !pauseOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setReassignOpen(false);
        setPhaseOpen(false);
        setPriorityOpen(false);
        setPauseOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [reassignOpen, phaseOpen, priorityOpen, pauseOpen]);

  const assignedMember = members.find((m) => m.id === task.assigned_to);
  // Use the task's own due date (design vs dev), not the project's delivery.
  const daysToDeadline = daysBetween(today, task.due_date);
  const deadlineTone =
    daysToDeadline < 0
      ? "text-rose-700"
      : daysToDeadline <= 3
        ? "text-amber-700"
        : "text-[#7A7A7A]";

  const dueLabel = `Due ${formatDayMonth(task.due_date)} · ${
    daysToDeadline < 0
      ? `${Math.abs(daysToDeadline)}d over`
      : daysToDeadline === 0
        ? "today"
        : `${daysToDeadline}d`
  }`;

  /* Open-age signal on tickets only. Tickets are fast-moving — thresholds
   * are 24h (amber) and 48h (red), not days. Anything still sitting
   * after two days needs eyes on it.
   *
   * Secondaries do tickets only — even if a task on a secondary's column
   * is technically `core_deliverable` (legacy/bad data), render it
   * ticket-style so the column reads consistently.
   *
   * Pause: when `waiting_on` is set, the age clock is frozen — paused
   * duration is subtracted from elapsed time so a ticket sitting on a
   * client signoff doesn't escalate unfairly. */
  const assignee = members.find((m) => m.id === task.assigned_to);
  const assigneeIsSecondary =
    assignee?.role === "secondary_designer" || assignee?.role === "secondary_dev";
  const isTicket = task.type !== "core_deliverable" || assigneeIsSecondary;
  const isPaused = !!task.waiting_on;
  const effectiveCreatedAtMs = (() => {
    const base = new Date(task.created_at).getTime();
    const banked = task.paused_total_ms || 0;
    const livePauseMs = task.paused_at ? Math.max(0, Date.now() - new Date(task.paused_at).getTime()) : 0;
    return base + banked + livePauseMs;
  })();
  const ageHours = isTicket
    ? Math.max(0, Math.floor((Date.now() - effectiveCreatedAtMs) / 3_600_000))
    : 0;
  const ageTime = isTicket ? formatTimeInPhase(new Date(effectiveCreatedAtMs).toISOString()) : null;

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[#F7F8FA] ${
        task.status === "done" ? "opacity-50" : ""
      }`}
      ref={ref}
    >
      {/* Status circle — click to cycle */}
      <button
        onClick={() => {
          updateTaskStatus(task.id, STATUS_CYCLE[task.status]);
          onMutate();
        }}
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          task.status === "done"
            ? "border-emerald-500 bg-emerald-500 text-white"
            : task.status === "in_progress"
              ? "border-blue-500 bg-white text-blue-500"
              : "border-[#D5D5DC] bg-white hover:border-[#1B1B1B]"
        }`}
        title={`Cycle status (current: ${task.status === "done" ? "Done" : task.status === "in_progress" ? "In progress" : "To do"})`}
      >
        {task.status === "done" && (
          <svg viewBox="0 0 12 12" className="size-3" fill="currentColor">
            <path d="M10.28 3.28L4.5 9.06 1.72 6.28l1.06-1.06L4.5 6.94l4.72-4.72z" />
          </svg>
        )}
        {task.status === "in_progress" && <span className="size-1.5 rounded-full bg-blue-500" />}
      </button>

      {/* Title + client · project · phase/type tag */}
      <div className="min-w-0 flex-1">
        <div
          className={`flex items-center gap-1.5 truncate text-sm leading-tight ${
            task.status === "done" ? "text-[#A0A0A0] line-through" : "text-[#1B1B1B]"
          }`}
        >
          <span className="truncate">{task.title}</span>
          {task.cycle && (
            <span
              className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-emerald-800"
              title={`Conversion Engine — Month ${task.cycle.month}, Week ${task.cycle.week} (${CYCLE_WEEK_LABEL[task.cycle.week]})`}
            >
              M{task.cycle.month} · W{task.cycle.week} · {CYCLE_WEEK_LABEL[task.cycle.week]}
            </span>
          )}
          {task.points != null && (
            <span
              className="shrink-0 rounded border border-[#E5E5EA] bg-white px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-[#7A7A7A]"
              title={`${task.points} pt deliverable — covers design + dev together`}
            >
              {task.points}pt{task.points === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-[#7A7A7A]">
          {client?.brand_warm && (
            <span
              className="size-1 shrink-0 rounded-full bg-orange-500"
              title="Brand-warm"
            />
          )}
          {client && <span className="truncate font-medium text-[#1B1B1B]">{client.name}</span>}
          {client && project && <span className="text-[#C5C5C5]">·</span>}
          {project && <span className="truncate">{project.name}</span>}
          {/* Phase pill (primary) or ticket-type pill (secondary) */}
          {task.phase ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPhaseOpen((v) => !v);
              }}
              className={`shrink-0 inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium ${PHASE_PILL[task.phase]} hover:opacity-80`}
              title="Click to change phase"
            >
              {TASK_PHASE_LABEL[task.phase]}
            </button>
          ) : isTicket ? (
            <span
              className={`shrink-0 inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium ${TASK_TYPE_BADGE[task.type]}`}
            >
              {TASK_TYPE_LABEL[task.type]}
            </span>
          ) : null}
        </div>
      </div>

      {/* Right: date or age */}
      <div className="flex shrink-0 items-center gap-2">
        {isTicket ? (
          isPaused ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPauseOpen((v) => !v);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-[#E5E5EA] bg-[#F7F8FA] px-1.5 py-0.5 text-[10px] font-medium text-[#7A7A7A] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
              title="Click to resume"
            >
              ⏸ Waiting on {task.waiting_on === "client" ? "client" : "internal"}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPauseOpen((v) => !v);
              }}
              className={`text-[11px] font-medium tabular-nums hover:underline ${
                ageHours >= 48
                  ? "text-rose-700"
                  : ageHours >= 24
                    ? "text-amber-700"
                    : "text-emerald-700"
              }`}
              title={`Opened ${new Date(task.created_at).toLocaleString()} — click to pause`}
            >
              {ageTime}
            </button>
          )
        ) : (
          <span
            className={`text-[11px] font-medium tabular-nums ${
              daysToDeadline < 0
                ? "text-rose-700"
                : daysToDeadline <= 3
                  ? "text-amber-700"
                  : daysToDeadline <= 7
                    ? "text-emerald-700"
                    : "text-[#7A7A7A]"
            }`}
          >
            {formatDayMonth(task.due_date)}
          </span>
        )}
        {isAdmin && (
          <button
            onClick={() => {
              if (confirm(`Delete task "${task.title}"?`)) {
                deleteTask(task.id);
                onMutate();
              }
            }}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            title="Delete task"
          >
            <XMarkIcon className="size-3.5 text-[#A0A0A0] hover:text-rose-600" />
          </button>
        )}
      </div>

      {reassignOpen && (
        <ReassignPopover
          members={members}
          currentId={task.assigned_to}
          onPick={(memberId) => {
            reassignTask(task.id, memberId);
            setReassignOpen(false);
            onMutate();
          }}
        />
      )}

      {phaseOpen && task.phase && (
        <PhasePopover
          currentPhase={task.phase}
          onPick={(phase) => {
            updateTaskPhase(task.id, phase);
            setPhaseOpen(false);
            onMutate();
          }}
        />
      )}

      {priorityOpen && isTicket && (
        <PriorityPopover
          currentPriority={task.priority || "normal"}
          onPick={(p) => {
            updateTaskPriority(task.id, p);
            setPriorityOpen(false);
            onMutate();
          }}
        />
      )}

      {pauseOpen && isTicket && (
        <PausePopover
          isPaused={isPaused}
          waitingOn={task.waiting_on}
          onPause={(reason) => {
            pauseTask(task.id, reason);
            setPauseOpen(false);
            onMutate();
          }}
          onResume={() => {
            resumeTask(task.id);
            setPauseOpen(false);
            onMutate();
          }}
        />
      )}
    </div>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────

function ReassignPopover({
  members,
  currentId,
  onPick,
}: {
  members: PodMember[];
  currentId: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white shadow-[var(--shadow-card)]">
      <div className="border-b border-[#EDEDEF] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
        Reassign to…
      </div>
      {members.map((m) => (
        <button
          key={m.id}
          disabled={m.is_placeholder}
          onClick={() => onPick(m.id)}
          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#F7F8FA] ${
            m.id === currentId ? "bg-[#F3F3F5] font-medium" : ""
          } ${m.is_placeholder ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span>{m.is_placeholder ? "TO HIRE" : m.name}</span>
          <span className="text-[10px] text-[#A0A0A0]">
            {m.role.replace("_", " ")}
          </span>
        </button>
      ))}
    </div>
  );
}

function PhasePopover({
  currentPhase,
  onPick,
}: {
  currentPhase: TaskPhase;
  onPick: (p: TaskPhase) => void;
}) {
  return (
    <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white shadow-[var(--shadow-card)]">
      <div className="border-b border-[#EDEDEF] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
        Move to phase…
      </div>
      {TASK_PHASE_ORDER.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#F7F8FA] ${
            p === currentPhase ? "bg-[#F3F3F5] font-medium" : ""
          }`}
        >
          <span>{TASK_PHASE_LABEL[p]}</span>
          <span
            className={`inline-flex items-center rounded border px-1 py-0.5 text-[9px] font-medium ${PHASE_PILL[p]}`}
          >
            ●
          </span>
        </button>
      ))}
    </div>
  );
}

function PausePopover({
  isPaused,
  waitingOn,
  onPause,
  onResume,
}: {
  isPaused: boolean;
  waitingOn?: "client" | "internal";
  onPause: (reason: "client" | "internal") => void;
  onResume: () => void;
}) {
  return (
    <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white shadow-[var(--shadow-card)]">
      <div className="border-b border-[#EDEDEF] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
        {isPaused ? "Currently paused" : "Pause clock — waiting on…"}
      </div>
      {isPaused ? (
        <>
          <div className="px-3 py-1.5 text-[11px] text-[#7A7A7A]">
            Waiting on <strong className="text-[#1B1B1B]">{waitingOn === "client" ? "client" : "internal"}</strong>. Resume when unblocked to restart the clock from where it left off.
          </div>
          <button
            onClick={onResume}
            className="flex w-full items-center justify-center gap-1 border-t border-[#EDEDEF] px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            ▶ Resume
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onPause("client")}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#F7F8FA]"
          >
            <span>Waiting on client</span>
            <span className="text-[10px] text-[#A0A0A0]">most common</span>
          </button>
          <button
            onClick={() => onPause("internal")}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#F7F8FA]"
          >
            <span>Waiting on internal</span>
            <span className="text-[10px] text-[#A0A0A0]">team blocker</span>
          </button>
        </>
      )}
    </div>
  );
}

function PriorityPopover({
  currentPriority,
  onPick,
}: {
  currentPriority: TaskPriority;
  onPick: (p: TaskPriority) => void;
}) {
  return (
    <div className="absolute left-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white shadow-[var(--shadow-card)]">
      <div className="border-b border-[#EDEDEF] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
        Set priority…
      </div>
      {PRIORITY_ORDER.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#F7F8FA] ${
            p === currentPriority ? "bg-[#F3F3F5] font-medium" : ""
          }`}
        >
          <span>{PRIORITY_LABEL[p]}</span>
          <span
            className={`inline-flex items-center rounded border px-1 py-0.5 text-[9px] font-medium ${PRIORITY_PILL[p]}`}
          >
            ●
          </span>
        </button>
      ))}
    </div>
  );
}

function TaskStatusButton({
  status,
  onClick,
}: {
  status: TaskStatus;
  onClick: () => void;
}) {
  const cls =
    status === "done"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "in_progress"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-[#F3F3F5] text-[#7A7A7A] border-[#E5E5EA]";
  const label =
    status === "done" ? "Done" : status === "in_progress" ? "Live" : "Todo";
  return (
    <button
      onClick={onClick}
      title="Click to advance status"
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-all hover:scale-105 ${cls}`}
    >
      {label}
    </button>
  );
}

function AddTaskInline({
  member,
  allMembers,
  defaultType,
  projects,
  clientById,
  onMutate,
  isAdmin,
}: {
  member: PodMember;
  allMembers: PodMember[];
  defaultType: TaskType;
  projects: Project[];
  clientById: Map<string, Client>;
  onMutate: () => void;
  isAdmin: boolean;
}) {
  const memberIsDesigner =
    member.role === "primary_designer" || member.role === "secondary_designer";
  const memberIsSecondary =
    member.role === "secondary_designer" || member.role === "secondary_dev";
  /* Only PRIMARY members get the core-deliverable add-flow. Secondaries
   * do tickets (revisions, bugs, desktop fixes, asset prep) — give them
   * the ticket form regardless of the swim-lane's default. */
  const memberIsPrimary =
    member.role === "primary_designer" || member.role === "primary_dev";
  /* Only admins can spawn paired core deliverables — that's PM-side
   * scope-setting. Team members get the ticket form regardless of
   * which column they're adding to. */
  const isPrimaryMode = defaultType === "core_deliverable" && memberIsPrimary && isAdmin;
  /* For secondaries, default the ticket type to "revision" (the most
   * common secondary-work flavour). Designer secondaries → revision;
   * dev secondaries → desktop_fix is also common, but revision covers
   * the broader case so we keep one default. */
  const secondaryDefault: TaskType = memberIsDesigner ? "revision" : "desktop_fix";

  /* Pair partner: same tier (primary↔primary, secondary↔secondary) on the
   * opposite discipline. Falls back to the other tier if same-tier slot
   * is unfilled. */
  const pairPartner = useMemo(() => {
    if (!isPrimaryMode) return undefined;
    const wantsDev = memberIsDesigner;
    const sameTierRole = memberIsSecondary
      ? wantsDev
        ? "secondary_dev"
        : "secondary_designer"
      : wantsDev
        ? "primary_dev"
        : "primary_designer";
    const altTierRole = memberIsSecondary
      ? wantsDev
        ? "primary_dev"
        : "primary_designer"
      : wantsDev
        ? "secondary_dev"
        : "secondary_designer";
    return (
      allMembers.find((m) => m.role === sameTierRole && !m.is_placeholder) ||
      allMembers.find((m) => m.role === altTierRole && !m.is_placeholder)
    );
  }, [allMembers, isPrimaryMode, memberIsDesigner, memberIsSecondary]);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>(memberIsPrimary ? defaultType : secondaryDefault);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [deliverableType, setDeliverableType] = useState<PageType>("pdp");
  const [variantLabel, setVariantLabel] = useState("");

  if (member.is_placeholder) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#E5E5EA] px-2 py-1.5 text-[11px] text-[#A0A0A0] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
      >
        <PlusIcon className="size-3" />
        Add for {member.name}
      </button>
    );
  }

  function pointsFor(d: PageType): number {
    return PAGE_WEIGHT_POINTS[PAGE_DEFAULT_WEIGHT[d]];
  }

  function reset() {
    setOpen(false);
    setTitle("");
    setType(memberIsPrimary ? defaultType : secondaryDefault);
  }

  return (
    <div className="rounded-lg border border-[#1B1B1B]/20 bg-[#F7F8FA] p-2.5">
      <div className="flex items-center gap-2 pb-1.5 text-[11px] text-[#7A7A7A]">
        {isPrimaryMode ? (
          <>
            New deliverable starting with <strong className="text-[#1B1B1B]">{member.name}</strong>
          </>
        ) : (
          <>
            New for <strong className="text-[#1B1B1B]">{member.name}</strong>
          </>
        )}
      </div>

      {isPrimaryMode ? (
        projects.length === 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
            No projects on this pod yet. Create one via{" "}
            <Link href="/pods-v2/new-project" className="font-medium underline hover:text-amber-900">
              + New project
            </Link>{" "}
            or assign an onboarding form from the Onboarding-in-purgatory list.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_2fr] gap-1.5">
              <select
                value={deliverableType}
                onChange={(e) => setDeliverableType(e.target.value as PageType)}
                className={`${selectClass} !py-1 !text-[11px]`}
              >
                {(Object.keys(PAGE_LABEL) as PageType[]).map((d) => (
                  <option key={d} value={d}>
                    {PAGE_LABEL[d]} · {pointsFor(d)}pt{pointsFor(d) === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
              <input
                autoFocus
                value={variantLabel}
                onChange={(e) => setVariantLabel(e.target.value)}
                placeholder="Variant label (e.g. Lavender oil)"
                className="rounded border border-[#E5E5EA] bg-white px-2 py-1 text-[11px] placeholder:text-[#CCC]"
              />
            </div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`${selectClass} !py-1 !text-[11px] mt-1.5`}
            >
              {projects.map((p) => {
                const client = clientById.get(p.client_id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} · {client?.name ?? "—"}
                  </option>
                );
              })}
            </select>
            <div className="mt-1.5 text-[10px] text-[#7A7A7A]">
              Creates two paired tasks: <strong>Design – {PAGE_LABEL[deliverableType]}</strong> for{" "}
              <strong className="text-[#1B1B1B]">{memberIsDesigner ? member.name : pairPartner?.name ?? "—"}</strong>
              {" "}+{" "}
              <strong>Build – {PAGE_LABEL[deliverableType]}</strong> for{" "}
              <strong className="text-[#1B1B1B]">{memberIsDesigner ? pairPartner?.name ?? "—" : member.name}</strong>.
              Points cover both halves: <strong>{pointsFor(deliverableType)}pt{pointsFor(deliverableType) === 1 ? "" : "s"}</strong>.
              Same-type discount applies if a {PAGE_LABEL[deliverableType]} already exists on this project.
            </div>
          </>
        )
      ) : (
        <>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full rounded border border-[#E5E5EA] bg-white px-2 py-1 text-xs"
          />
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              className={`${selectClass} !py-1 !text-[11px]`}
            >
              {(
                Object.entries(TASK_TYPE_LABEL) as Array<[TaskType, string]>
              ).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`${selectClass} !py-1 !text-[11px]`}
            >
              {projects.map((p) => {
                const client = clientById.get(p.client_id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} · {client?.name ?? "—"}
                  </option>
                );
              })}
            </select>
          </div>
        </>
      )}

      <div className="mt-1.5 flex justify-end gap-1.5">
        <button
          onClick={reset}
          className="rounded px-2 py-1 text-[11px] text-[#7A7A7A] hover:text-[#1B1B1B]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (isPrimaryMode) {
              if (!projectId || !pairPartner) return;
              const designerId = memberIsDesigner ? member.id : pairPartner.id;
              const devId = memberIsDesigner ? pairPartner.id : member.id;
              const { design, dev } = addPairedDeliverable({
                project_id: projectId,
                deliverable_type: deliverableType,
                designer_id: designerId,
                dev_id: devId,
                points: pointsFor(deliverableType),
              });
              // Append variant label to the auto-generated titles
              if (variantLabel.trim()) {
                const tasks = getTasks();
                const next = tasks.map((t) => {
                  if (t.id === design.id) return { ...t, title: `Design – ${PAGE_LABEL[deliverableType]} · ${variantLabel.trim()}` };
                  if (t.id === dev.id) return { ...t, title: `Build – ${PAGE_LABEL[deliverableType]} · ${variantLabel.trim()}` };
                  return t;
                });
                localStorage.setItem("launchpad-pods-v2-tasks", JSON.stringify(next));
              }
              setVariantLabel("");
            } else {
              if (!title.trim() || !projectId) return;
              addTask({
                project_id: projectId,
                title: title.trim(),
                type,
                assigned_to: member.id,
              });
            }
            reset();
            onMutate();
          }}
          disabled={(isPrimaryMode && (!pairPartner || projects.length === 0))}
          className="rounded bg-[#1B1B1B] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#2D2D2D] disabled:opacity-50"
        >
          {isPrimaryMode ? "Add deliverable" : "Add"}
        </button>
      </div>
    </div>
  );
}

// ─── Client roster ────────────────────────────────────────────────

// ─── Pod blockers panel ──────────────────────────────────────────

function PodBlockersPanel({
  pod,
  onMutate,
  isAdmin,
}: {
  pod: Pod;
  onMutate: () => void;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  /* Slack channel editor — admins can paste a channel id. Saved on
   * blur; shows a tiny green dot when configured so the team knows
   * blocker pings are live. */
  const [editingSlack, setEditingSlack] = useState(false);
  const [slackDraft, setSlackDraft] = useState(pod.slack_channel_id || "");

  const blockers = pod.blockers || [];
  const active = blockers.filter((b) => !b.resolved_at);
  const resolved = blockers.filter((b) => b.resolved_at).slice(0, 3);

  function submit() {
    if (!title.trim()) return;
    addBlocker(pod.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      owner_id: ownerId || undefined,
    });
    setTitle("");
    setDescription("");
    setOwnerId("");
    setOpen(false);
    onMutate();
  }

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Blockers
          </h2>
          <p className="mt-0.5 text-xs text-[#7A7A7A]">
            Pod-wide blockers everyone needs to see — a missing asset, a sick teammate, a tool down.
            {pod.slack_channel_id && (
              <span className="ml-1.5 inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-emerald-800">
                <span className="size-1 rounded-full bg-emerald-500" /> Slack
              </span>
            )}
          </p>
          {isAdmin && (
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#A0A0A0]">
              <span>Slack channel:</span>
              {editingSlack ? (
                <>
                  <input
                    autoFocus
                    value={slackDraft}
                    onChange={(e) => setSlackDraft(e.target.value)}
                    placeholder="C0123456 (channel id)"
                    className="rounded border border-[#E5E5EA] bg-white px-1.5 py-0.5 text-[10px]"
                    onBlur={() => {
                      updatePodSlackChannel(pod.id, slackDraft.trim());
                      setEditingSlack(false);
                      onMutate();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") {
                        setSlackDraft(pod.slack_channel_id || "");
                        setEditingSlack(false);
                      }
                    }}
                  />
                </>
              ) : (
                <button
                  onClick={() => setEditingSlack(true)}
                  className="font-mono text-[#1B1B1B] hover:underline"
                >
                  {pod.slack_channel_id || "— not set —"}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] tabular-nums text-[#A0A0A0]">
          <span className={active.length > 0 ? "font-semibold text-rose-700" : ""}>
            {active.length} active
          </span>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-[#E5E5EA] px-2 py-1 text-[11px] font-medium text-[#1B1B1B] hover:border-[#1B1B1B]"
          >
            {open ? "Cancel" : "+ Raise blocker"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-[#1B1B1B]/20 bg-[#F7F8FA] p-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's blocking? (e.g. Waiting on Acme brand assets)"
            className="w-full rounded-md border border-[#E5E5EA] bg-white px-2 py-1.5 text-xs"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="More context (optional)"
            rows={2}
            className="mt-1.5 w-full rounded-md border border-[#E5E5EA] bg-white px-2 py-1.5 text-xs placeholder:text-[#CCC]"
          />
          <div className="mt-1.5 flex items-center gap-1.5">
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[11px]"
            >
              <option value="">Owner (optional)</option>
              {pod.members.filter((m) => !m.is_placeholder).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={submit}
              disabled={!title.trim()}
              className="rounded-md bg-[#1B1B1B] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#2D2D2D] disabled:opacity-50"
            >
              Raise blocker
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {active.length === 0 && !open && (
          <div className="rounded-xl border border-dashed border-[#E5E5EA] bg-white px-4 py-6 text-center text-xs text-[#A0A0A0]">
            No active blockers. Pod is clear.
          </div>
        )}
        {active.map((b) => {
          const owner = pod.members.find((m) => m.id === b.owner_id);
          const ageMs = Date.now() - new Date(b.raised_at).getTime();
          const ageHours = Math.floor(ageMs / 3_600_000);
          const ageLabel = ageHours < 1 ? "just now" : ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageHours / 24)}d ago`;
          const tone = ageHours >= 48 ? "border-rose-300 bg-rose-50" : ageHours >= 24 ? "border-amber-300 bg-amber-50" : "border-[#E5E5EA] bg-white";
          return (
            <div key={b.id} className={`rounded-xl border ${tone} p-3 shadow-[var(--shadow-soft)]`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#1B1B1B]">{b.title}</div>
                  {b.description && (
                    <div className="mt-1 text-[12px] text-[#555] whitespace-pre-wrap">{b.description}</div>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#7A7A7A]">
                    <span>Raised {ageLabel}</span>
                    {owner && (
                      <>
                        <span className="text-[#C5C5C5]">·</span>
                        <span>Owner: <strong className="text-[#1B1B1B]">{owner.name}</strong></span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      resolveBlocker(pod.id, b.id);
                      onMutate();
                    }}
                    className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete blocker "${b.title}"?`)) {
                        deleteBlocker(pod.id, b.id);
                        onMutate();
                      }
                    }}
                    className="text-[#A0A0A0] hover:text-rose-600"
                    title="Delete"
                  >
                    <XMarkIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {resolved.length > 0 && (
          <details className="text-[11px] text-[#7A7A7A]">
            <summary className="cursor-pointer hover:text-[#1B1B1B]">Recently resolved ({resolved.length})</summary>
            <div className="mt-2 space-y-1">
              {resolved.map((b) => (
                <div key={b.id} className="group flex items-center justify-between gap-2 rounded-md bg-[#F7F8FA] px-2 py-1">
                  <span className="truncate line-through opacity-60">{b.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] text-[#A0A0A0]">{b.resolved_at ? new Date(b.resolved_at).toLocaleDateString("en-GB") : ""}</span>
                    <button
                      onClick={() => {
                        reopenBlocker(pod.id, b.id);
                        onMutate();
                      }}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#1B1B1B] opacity-0 transition-opacity hover:bg-white hover:underline group-hover:opacity-100"
                      title="Re-open — moves back to active blockers"
                    >
                      ↺ Re-open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function ClientRoster({
  clients,
  currentPodId,
  onMutate,
  canUnassign,
}: {
  clients: Client[];
  currentPodId: string;
  onMutate: () => void;
  canUnassign: boolean;
}) {
  return (
    <div className="mt-10">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
        Client roster
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((c) => (
          <ClientCard key={c.id} client={c} currentPodId={currentPodId} onMutate={onMutate} canUnassign={canUnassign} />
        ))}
        {clients.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#E5E5EA] bg-white px-4 py-6 text-center text-xs text-[#A0A0A0]">
            No clients assigned yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ClientCard({
  client,
  currentPodId,
  onMutate,
  canUnassign,
}: {
  client: Client;
  currentPodId: string;
  onMutate: () => void;
  canUnassign: boolean;
}) {
  const [unassignOpen, setUnassignOpen] = useState(false);
  const tier = TIER_PILL[client.retainer_tier];
  const portalHref = client.portal_slug
    ? `/tools/client-portal?client=${client.portal_slug}`
    : "/tools/client-portal";

  return (
    <div className="group relative rounded-xl border border-[#E5E5EA] bg-white p-4 shadow-[var(--shadow-soft)] transition-colors hover:border-[#1B1B1B]/30">
      <div className="flex items-start justify-between gap-2">
        <Link href={portalHref} className="block min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold leading-tight">
              {client.name}
            </span>
            <ArrowTopRightOnSquareIcon className="size-3 text-[#A0A0A0] transition-colors group-hover:text-[#1B1B1B]" />
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${tier.cls}`}
            >
              {tier.label}
            </span>
            {client.brand_warm && (
              <span className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                Brand-warm
              </span>
            )}
          </div>
        </Link>
        {canUnassign && (
          <button
            onClick={() => setUnassignOpen(true)}
            className="rounded-md px-1.5 py-0.5 text-[10px] text-[#A0A0A0] hover:bg-[#F7F8FA] hover:text-[#1B1B1B]"
            title="Unassign from pod"
          >
            Unassign
          </button>
        )}
      </div>
      {client.retainer_tier !== "none" && (
        <div className="mt-3 text-[11px] text-[#7A7A7A]">
          {RETAINER_SCOPE[client.retainer_tier]}
        </div>
      )}
      {unassignOpen && (
        <UnassignClientModal
          client={client}
          currentPodId={currentPodId}
          onCancel={() => setUnassignOpen(false)}
          onComplete={() => {
            setUnassignOpen(false);
            onMutate();
          }}
        />
      )}
    </div>
  );
}

function UnassignClientModal({
  client,
  currentPodId,
  onCancel,
  onComplete,
}: {
  client: Client;
  currentPodId: string;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const otherPods = useMemo(() => getPods().filter((p) => p.id !== currentPodId), [currentPodId]);
  const [mode, setMode] = useState<"move" | "park">(otherPods.length > 0 ? "move" : "park");
  const [targetPodId, setTargetPodId] = useState<string>(otherPods[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  function submit() {
    setSubmitting(true);
    if (mode === "move") {
      if (!targetPodId) return;
      moveClientToPod(client.id, targetPodId);
    } else {
      parkClient(client.id);
    }
    setSubmitting(false);
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
          Unassign from pod
        </p>
        <h2 className="text-lg font-semibold text-[#1B1B1B]">{client.name}</h2>
        <p className="mt-1 text-[11px] text-[#7A7A7A]">
          Pick a destination. Open tasks reassign to the new pod's primary designer/dev. Done tasks stay attached for audit.
        </p>

        <div className="mt-4 space-y-2">
          <label
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
              mode === "move" ? "border-[#1B1B1B] bg-[#F7F8FA]" : "border-[#E5E5EA]"
            } ${otherPods.length === 0 ? "opacity-50" : ""}`}
          >
            <input
              type="radio"
              checked={mode === "move"}
              onChange={() => setMode("move")}
              disabled={otherPods.length === 0}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-xs font-medium text-[#1B1B1B]">Move to another pod</div>
              <div className="text-[10px] text-[#7A7A7A]">Reassign client + open work to a destination pod.</div>
              {mode === "move" && otherPods.length > 0 && (
                <select
                  value={targetPodId}
                  onChange={(e) => setTargetPodId(e.target.value)}
                  className="mt-2 w-full rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[11px]"
                >
                  {otherPods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
              mode === "park" ? "border-[#1B1B1B] bg-[#F7F8FA]" : "border-[#E5E5EA]"
            }`}
          >
            <input
              type="radio"
              checked={mode === "park"}
              onChange={() => setMode("park")}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-xs font-medium text-[#1B1B1B]">Park (no pod)</div>
              <div className="text-[10px] text-[#7A7A7A]">
                Client stays in the system. Open projects flip to queued, open tasks become unassigned. Use when capacity isn't ready yet.
              </div>
            </div>
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded px-3 py-1.5 text-[11px] text-[#7A7A7A] hover:text-[#1B1B1B]">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || (mode === "move" && !targetPodId)}
            className="rounded bg-[#1B1B1B] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#2D2D2D] disabled:opacity-50"
          >
            {submitting ? "Working…" : mode === "move" ? "Move client" : "Park client"}
          </button>
        </div>
      </div>
    </div>
  );
}
