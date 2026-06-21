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
  createProject,
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
  isMemberOoo,
  updateClientMetrics,
  updateMemberAvatar,
  updateMemberOoo,
  updatePodSlackChannel,
  updateTaskPhase,
  updateTaskPriority,
  updateTaskStatus,
  updateTaskTestResult,
} from "@/lib/pods-v2/data";
import {
  capacityUsed,
  fourWeekWindow,
  isMidWeekKickoff,
  engagementKindOf,
  engagementDay,
} from "@/lib/pods-v2/calc";
import {
  deliverableStatus,
  riskLevel,
  riskReason,
  RISK_RANK,
  type RiskLevel,
  type DeliverableStatus,
} from "@/lib/pods-v2/deliverable";
import { PhaseTimeline } from "@/components/task-board/phase-timeline";
import { WeeksView } from "../WeeksView";
import { WeeklyBoard } from "../WeeklyBoard";
import { PodKanban } from "../PodKanban";
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
  Task,
  TaskDiscipline,
  TaskPhase,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/lib/pods-v2/types";
import { formatDayMonth, todayYMD } from "@/lib/dates";
import { formatTimeInPhase, phasesForDiscipline } from "@/lib/task-board/phases";
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
    cls: "border-[#2A2A2A] bg-[#222222] text-[#71757D]",
  },
  "8k": {
    label: "£8k retainer",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  "12k": {
    label: "£12k retainer",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-300",
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
  core_deliverable: "border-white/15 bg-[#181818] text-[#E5E5EA]",
  revision: "border-blue-200 bg-blue-50 text-blue-800",
  bug: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  desktop_fix: "border-purple-200 bg-purple-50 text-purple-800",
  asset_prep: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  library: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

/* Reverse cycle for shift-click / right-click on the status pip. Lets
 * the user back out of an in_progress design task without first having
 * to fight through the handoff modal on the way to done, which was the
 * "I can't untick this design" bug.
 *
 * Asymmetric on purpose: `todo` is the start of the line so shift-click
 * is a no-op there (never wrap forward to `done`, that'd let admins skip
 * the design handoff gate by accident). */
const STATUS_CYCLE_BACK: Record<TaskStatus, TaskStatus> = {
  todo: "todo",
  in_progress: "todo",
  done: "in_progress",
};

const PHASE_PILL: Record<TaskPhase, string> = {
  onboarding: "bg-[#222222] text-[#C7C9CD] border-[#2A2A2A]",
  research: "bg-[#ECFEFF] text-[#0E7490] border-[#A5F3FC]",
  wireframe: "bg-amber-500/15 text-[#92400E] border-[#FDE68A]",
  design: "bg-purple-500/15 text-[#6D28D9] border-[#DDD6FE]",
  "internal-design-qa": "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]",
  "external-design-review": "bg-[#FDF2F8] text-[#BE185D] border-[#FBCFE8]",
  "design-revision": "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]",
  development: "bg-emerald-500/15 text-[#047857] border-[#A7F3D0]",
  "development-qa": "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]",
  "external-dev-review": "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
  "dev-revision": "bg-amber-500/15 text-[#A16207] border-[#FDE68A]",
  launch: "bg-[#E5E5EA] text-[#181818] border-[#E5E5EA]",
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
  low: "border-[#2A2A2A] bg-[#181818] text-[#71757D]",
  normal: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  urgent: "border-rose-500/30 bg-rose-500/10 text-rose-300",
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
  /* Filter state for the swim lane. `me` filters to the current member
   * (only meaningful in team-view; admin doesn't have a "me"). `client`
   * filters to a single client id. `hideDone` hides done tasks. */
  const [filterClient, setFilterClient] = useState<string>("");
  const [hideDone, setHideDone] = useState(false);
  const [hotkeyHelpOpen, setHotkeyHelpOpen] = useState(false);
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
    /* Pull all pods-v2 data from Supabase and overlay onto local
     * cache so the pod detail reflects multi-device truth. Avatar
     * URLs ride along on Pod.members[] so this also handles the
     * older hydrateTeamAvatarsFromCloud path. */
    import("@/lib/pods-v2/sync").then(({ bootstrapPodsSync }) => {
      bootstrapPodsSync().then((changed) => {
        if (changed) {
          setPod(getPodById(podId));
          refresh();
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podId]);

  const today = todayYMD();

  /* Revision count per client, sum of `revision`-type tasks across
   * all of a client's projects (not just this pod's projects, but in
   * practice the pod owns the client so it's the same thing). >2 is
   * the threshold the team uses for "this client/project is
   * struggling", surfaced as a rose pill on the client card. */
  const revisionsByClient = useMemo(() => {
    const projectClient = new Map<string, string>();
    for (const p of projects) projectClient.set(p.id, p.client_id);
    const counts = new Map<string, number>();
    for (const t of tasks) {
      if (t.type !== "revision") continue;
      const cid = projectClient.get(t.project_id);
      if (!cid) continue;
      counts.set(cid, (counts.get(cid) || 0) + 1);
    }
    return counts;
  }, [projects, tasks]);

  /* Per-client deliverables + risk, the data behind the roster cards'
   * "what's due / what's at risk" strip. Brings the engagement's tracked
   * deliverables right onto the pod view so nothing gets missed. Core
   * deliverables + revisions only (the engagement-visible work); sorted by
   * urgency (risk, then due date). Owner resolved to a person. */
  const deliverablesByClient = useMemo(() => {
    const projectClient = new Map<string, string>();
    for (const p of projects) projectClient.set(p.id, p.client_id);
    const memberName = new Map<string, string>();
    pod?.members.forEach((m) => memberName.set(m.id, m.name));
    const clientById = new Map<string, Client>();
    for (const c of clients) clientById.set(c.id, c);

    const map = new Map<string, ClientDeliverable[]>();
    for (const t of tasks) {
      if (t.type !== "core_deliverable" && t.type !== "revision") continue;
      const cid = projectClient.get(t.project_id);
      if (!cid) continue;
      const client = clientById.get(cid) ?? null;
      const entry: ClientDeliverable = {
        task: t,
        status: deliverableStatus(t, client),
        risk: riskLevel(t, client, today),
        reason: riskReason(t, client, today),
        ownerName: memberName.get(t.assigned_to) ?? "Unassigned",
      };
      const arr = map.get(cid);
      if (arr) arr.push(entry);
      else map.set(cid, [entry]);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          RISK_RANK[a.risk] - RISK_RANK[b.risk] || a.task.due_date.localeCompare(b.task.due_date),
      );
    }
    return map;
  }, [projects, tasks, clients, pod, today]);

  /* This pod's tasks (scoped via its projects), for the weekly board. */
  const podTasks = useMemo(() => {
    const ids = new Set(projects.map((p) => p.id));
    return tasks.filter((t) => ids.has(t.project_id));
  }, [projects, tasks]);

  /* Apply filter state to allTasks. `filteredTasks` is what the swim
   * lane renders; `allTasks` stays in tact for capacity / revisions /
   * cycle counts which are unaffected by what the user is currently
   * looking at. */
  const filteredTasks = useMemo(() => {
    let out = tasks;
    if (filterClient) {
      const projectIdsForClient = new Set(
        projects.filter((p) => p.client_id === filterClient).map((p) => p.id),
      );
      out = out.filter((t) => projectIdsForClient.has(t.project_id));
    }
    if (hideDone) {
      out = out.filter((t) => t.status !== "done");
    }
    return out;
  }, [tasks, projects, filterClient, hideDone]);

  /* Hotkeys: j/k navigate, space toggles, d toggles hideDone, / focuses
   * filter, ? toggles help, esc clears. Listener is global; ignored
   * when the user is already typing in an input/textarea/select. */
  useEffect(() => {
    function isTypingTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t.isContentEditable
      );
    }
    function focusedTaskRow(): HTMLElement | null {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.dataset.taskId) return el;
      return null;
    }
    function listAllTaskRows(): HTMLElement[] {
      return Array.from(
        document.querySelectorAll<HTMLElement>("[data-task-id]"),
      );
    }
    function moveFocus(dir: 1 | -1) {
      const rows = listAllTaskRows();
      if (rows.length === 0) return;
      const current = focusedTaskRow();
      const idx = current ? rows.indexOf(current) : -1;
      const nextIdx =
        idx < 0
          ? dir === 1
            ? 0
            : rows.length - 1
          : Math.min(rows.length - 1, Math.max(0, idx + dir));
      rows[nextIdx]?.focus();
      rows[nextIdx]?.scrollIntoView({ block: "nearest" });
    }
    function handler(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "j":
          e.preventDefault();
          moveFocus(1);
          break;
        case "k":
          e.preventDefault();
          moveFocus(-1);
          break;
        case " ": {
          const row = focusedTaskRow();
          if (!row?.dataset.taskId) return;
          e.preventDefault();
          const t = tasks.find((x) => x.id === row.dataset.taskId);
          if (!t) return;
          updateTaskStatus(
            t.id,
            t.status === "todo"
              ? "in_progress"
              : t.status === "in_progress"
                ? "done"
                : "todo",
          );
          refresh();
          break;
        }
        case "d":
          e.preventDefault();
          setHideDone((v) => !v);
          break;
        case "/":
          e.preventDefault();
          (document.querySelector("[data-filter-client]") as HTMLElement | null)?.focus();
          break;
        case "?":
          e.preventDefault();
          setHotkeyHelpOpen((v) => !v);
          break;
        case "Escape":
          if (filterClient || hideDone) {
            setFilterClient("");
            setHideDone(false);
          } else if (hotkeyHelpOpen) {
            setHotkeyHelpOpen(false);
          }
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tasks, filterClient, hideDone, hotkeyHelpOpen]);

  /* Two windows for the meter, current 4-week month from today's Mon,
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
   * to split this into a Core Deliverables swim lane + a Tickets table, * combined into one per-member list so each pod member's full plate
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
        <div className="text-sm text-[#71757D]">Loading pod…</div>
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
          className="inline-flex items-center gap-1 text-xs text-[#71757D] hover:text-[#E5E5EA]"
        >
          <ChevronLeftIcon className="size-3.5" />
          All pods
        </Link>
        {isAdmin && (
          <Link
            href="/pods-v2/new-project"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white bg-[#1B1B1B] px-3 py-2 text-xs font-medium text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[#F3F4F6]"
          >
            <PlusIcon className="size-3.5" />
            New project
          </Link>
        )}
      </div>

      {/* THIS WEEK — the lead. Deadlines front and centre, Tue/Thu slots,
          slips flagged red so nothing slides quietly. */}
      <div className="mt-4">
        <WeeklyBoard
          tasks={podTasks}
          projects={projects}
          clients={clients}
          members={pod.members}
          today={today}
          onMutate={refresh}
        />
      </div>

      {/* PIPELINE — kanban by stage, with a "just mine" filter. Advancing a
          card IS the status update (no forms), to drive adoption. */}
      <div className="mt-4">
        <PodKanban
          tasks={podTasks}
          projects={projects}
          clients={clients}
          members={pod.members}
          today={today}
          onMutate={refresh}
        />
      </div>

      {/* HEADER STRIP */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr,360px]">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#181818] p-5 shadow-[var(--shadow-soft)]">
          <PodHeading name={pod.name} tagline={pod.tagline} />
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {pod.members.map((m) => {
              const ooo = isMemberOoo(m, today);
              const oooLabel = m.ooo_end
                ? `until ${formatDayMonth(m.ooo_end)}`
                : m.ooo_start
                  ? `from ${formatDayMonth(m.ooo_start)}`
                  : "";
              return (
                <div key={m.id} className="space-y-1">
                  <MemberRow
                    member={m}
                    isOoo={ooo}
                    oooLabel={oooLabel}
                    onChangeAvatar={(url) => {
                      updateMemberAvatar(m.id, url);
                      refresh();
                    }}
                  />
                  {isAdmin && !m.is_placeholder && (
                    <MemberOooEditor member={m} onChange={refresh} />
                  )}
                </div>
              );
            })}
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

      {/* BLOCKERS, pod-wide blockers visible to everyone */}
      <PodBlockersPanel pod={pod} onMutate={refresh} isAdmin={isAdmin} />

      {/* WEEKLY CADENCE — this pod's rolling weeks (Kicking off Mon · In
          flight · Shipping Thu) so the pod can see what lands when and hit
          the dates. Reuses the shared WeeksView, scoped to this pod. */}
      <div className="mt-10">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
          Weekly cadence
        </h2>
        <WeeksView
          projects={projects}
          podById={new Map([[pod.id, pod]])}
          clientById={new Map(clients.map((c) => [c.id, c]))}
          today={today}
        />
      </div>

      {/* CLIENT ROSTER, moved up */}
      <ClientRoster
        clients={clients}
        currentPodId={pod.id}
        onMutate={refresh}
        canUnassign={isAdmin}
        revisionsByClient={revisionsByClient}
        deliverablesByClient={deliverablesByClient}
        today={today}
      />

      {/* FILTERS, narrow the swim lane to a single client or hide
       * done tasks. Useful when columns get full and you want to zoom
       * in on what matters. */}
      <div className="mt-10 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-semibold uppercase tracking-wider text-[#71757D]">
          Filter:
        </span>
        <select
          data-filter-client
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[11px]"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="size-3"
          />
          Hide done
        </label>
        {(filterClient || hideDone) && (
          <button
            onClick={() => {
              setFilterClient("");
              setHideDone(false);
            }}
            className="rounded-md px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-500/10"
          >
            Clear
          </button>
        )}
        <button
          onClick={() => setHotkeyHelpOpen((v) => !v)}
          className="ml-auto rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[10px] text-[#71757D] hover:border-white hover:text-[#E5E5EA]"
          title="Show keyboard shortcuts (?)"
        >
          ? Hotkeys
        </button>
      </div>

      {hotkeyHelpOpen && (
        <div className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-[#2A2A2A] bg-[#181818] p-3 text-[11px] md:grid-cols-3">
          <div>
            <kbd className="rounded border border-[#2A2A2A] bg-[#0C0C0C] px-1 font-mono text-[10px]">j</kbd>
            <kbd className="ml-1 rounded border border-[#2A2A2A] bg-[#0C0C0C] px-1 font-mono text-[10px]">k</kbd>
            <span className="ml-2 text-[#71757D]">Move focus down / up between tasks</span>
          </div>
          <div>
            <kbd className="rounded border border-[#2A2A2A] bg-[#0C0C0C] px-1 font-mono text-[10px]">space</kbd>
            <span className="ml-2 text-[#71757D]">Cycle focused task status</span>
          </div>
          <div>
            <kbd className="rounded border border-[#2A2A2A] bg-[#0C0C0C] px-1 font-mono text-[10px]">d</kbd>
            <span className="ml-2 text-[#71757D]">Toggle Hide done</span>
          </div>
          <div>
            <kbd className="rounded border border-[#2A2A2A] bg-[#0C0C0C] px-1 font-mono text-[10px]">/</kbd>
            <span className="ml-2 text-[#71757D]">Focus the client filter</span>
          </div>
          <div>
            <kbd className="rounded border border-[#2A2A2A] bg-[#0C0C0C] px-1 font-mono text-[10px]">esc</kbd>
            <span className="ml-2 text-[#71757D]">Clear filters / close popovers</span>
          </div>
          <div>
            <kbd className="rounded border border-[#2A2A2A] bg-[#0C0C0C] px-1 font-mono text-[10px]">?</kbd>
            <span className="ml-2 text-[#71757D]">Toggle this help</span>
          </div>
        </div>
      )}

      {/* WORK IN FLIGHT, one column per pod member, all task types combined */}
      <SwimLane
        title="Work in flight"
        subtitle="Core deliverables and tickets. One column per pod member, sorted by due date."
        members={pod.members}
        allMembers={pod.members}
        tasks={filteredTasks}
        projectById={projectById}
        clientById={clientById}
        clients={clients}
        podId={pod.id}
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
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#181818] p-5 shadow-[var(--shadow-soft)]">
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
      <div className="mt-4 border-t border-[#2A2A2A] pt-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
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
                  member.is_placeholder ? "italic text-[#71757D]" : ""
                }`}
              >
                {member.is_placeholder ? "TO HIRE" : member.name}
              </span>
              <span className="tabular-nums text-[#71757D]">{count}</span>
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
      : "bg-[#0C0C0C] text-[#E5E5EA]";
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
  clients,
  podId,
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
  clients: Client[];
  podId: string;
  today: string;
  onMutate: () => void;
  defaultTaskType: TaskType;
  isAdmin: boolean;
}) {
  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-[#71757D]">{subtitle}</p>
        </div>
        <div className="text-[11px] text-[#71757D]">
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
              className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between">
                <MemberRow
                  member={member}
                  onChangeAvatar={(url) => {
                    updateMemberAvatar(member.id, url);
                    onMutate();
                  }}
                />
                <span className="text-[11px] tabular-nums text-[#71757D]">
                  {myTasks.length}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {myTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#2A2A2A] px-3 py-3 text-center text-[11px] text-[#71757D]">
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
                  clients={clients}
                  podId={podId}
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
  /* Designer → Dev handoff checklist. When a designer flips a Design
   * core_deliverable from in_progress to done, surface a 3-checkbox
   * gate (Figma link / assets exported / scope locked). All three
   * must tick before the status flip lands. Stops the back-and-forth
   * where dev pings the designer two days later asking for the file. */
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [testResultOpen, setTestResultOpen] = useState(false);
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
        : "text-[#71757D]";

  const dueLabel = `Due ${formatDayMonth(task.due_date)} · ${
    daysToDeadline < 0
      ? `${Math.abs(daysToDeadline)}d over`
      : daysToDeadline === 0
        ? "today"
        : `${daysToDeadline}d`
  }`;

  /* Open-age signal on tickets only. Tickets are fast-moving, thresholds
   * are 24h (amber) and 48h (red), not days. Anything still sitting
   * after two days needs eyes on it.
   *
   * Secondaries do tickets only, even if a task on a secondary's column
   * is technically `core_deliverable` (legacy/bad data), render it
   * ticket-style so the column reads consistently.
   *
   * Pause: when `waiting_on` is set, the age clock is frozen, paused
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
      data-task-id={task.id}
      tabIndex={-1}
      className={`group relative flex items-center gap-3 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-[#0C0C0C] focus:bg-[#EEF2FF] focus:ring-2 focus:ring-[#1B1B1B]/20 ${
        task.status === "done" ? "opacity-50" : ""
      }`}
      ref={ref}
    >
      {/* Status circle. Plain click cycles forward
       * (todo → in_progress → done → todo). Shift-click or right-click
       * cycles backward, which is the escape hatch for "this got
       * accidentally ticked, set it back" without fighting through the
       * design → dev handoff modal that gates forward motion into done. */}
      <button
        onClick={(e) => {
          const back = e.shiftKey;
          const next = back ? STATUS_CYCLE_BACK[task.status] : STATUS_CYCLE[task.status];
          const isDesignHandoff =
            !back &&
            next === "done" &&
            task.type === "core_deliverable" &&
            task.discipline === "design";
          if (isDesignHandoff) {
            setHandoffOpen(true);
            return;
          }
          updateTaskStatus(task.id, next);
          onMutate();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const next = STATUS_CYCLE_BACK[task.status];
          updateTaskStatus(task.id, next);
          onMutate();
        }}
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          task.status === "done"
            ? "border-emerald-500 bg-emerald-500 text-white"
            : task.status === "in_progress"
              ? "border-blue-500 bg-[#181818] text-blue-500"
              : "border-[#2A2A2A] bg-[#181818] hover:border-white"
        }`}
        title={`Current: ${task.status === "done" ? "Done" : task.status === "in_progress" ? "In progress" : "To do"}. Click to advance · Shift-click or right-click to step back.`}
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
            task.status === "done" ? "text-[#71757D] line-through" : "text-[#E5E5EA]"
          }`}
        >
          <span className="truncate">{task.title}</span>
          {task.cycle && (
            <span
              className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-emerald-800"
              title={`Conversion Engine, Month ${task.cycle.month}, Week ${task.cycle.week} (${CYCLE_WEEK_LABEL[task.cycle.week]})`}
            >
              M{task.cycle.month} · W{task.cycle.week} · {CYCLE_WEEK_LABEL[task.cycle.week]}
            </span>
          )}
          {/* Test result chip, only on Build tasks (variant tests
           * shipped as Conversion Engine cycle work). Clickable to
           * open the result editor inline. */}
          {task.discipline === "development" && task.cycle && task.cycle.month >= 2 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTestResultOpen((v) => !v);
              }}
              className={`shrink-0 rounded border px-1 py-0 text-[9px] font-semibold uppercase tracking-wider hover:opacity-80 ${
                task.test_result?.status === "winner"
                  ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                  : task.test_result?.status === "loser"
                    ? "border-rose-300 bg-rose-100 text-rose-900"
                    : task.test_result?.status === "inconclusive"
                      ? "border-[#2A2A2A] bg-[#0C0C0C] text-[#71757D]"
                      : task.test_result?.status === "pending"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-dashed border-[#2A2A2A] bg-[#181818] text-[#71757D]"
              }`}
              title="Click to edit test result"
            >
              {task.test_result
                ? task.test_result.status === "winner" && task.test_result.lift_pct != null
                  ? `+${task.test_result.lift_pct}% won`
                  : task.test_result.status === "loser" && task.test_result.lift_pct != null
                    ? `${task.test_result.lift_pct}% lost`
                    : task.test_result.status
                : "+ result"}
            </button>
          )}
          {task.points != null && (
            <span
              className="shrink-0 rounded border border-[#2A2A2A] bg-[#181818] px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-[#71757D]"
              title={`${task.points} pt deliverable, covers design + dev together`}
            >
              {task.points}pt{task.points === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-[#71757D]">
          {client?.brand_warm && (
            <span
              className="size-1 shrink-0 rounded-full bg-orange-500"
              title="Brand-warm"
            />
          )}
          {client && <span className="truncate font-medium text-[#E5E5EA]">{client.name}</span>}
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
              className="inline-flex items-center gap-1 rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-1.5 py-0.5 text-[10px] font-medium text-[#71757D] hover:border-white hover:text-[#E5E5EA]"
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
              title={`Opened ${new Date(task.created_at).toLocaleString()}, click to pause`}
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
                    : "text-[#71757D]"
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
            <XMarkIcon className="size-3.5 text-[#71757D] hover:text-rose-600" />
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

      {handoffOpen && (
        <DesignHandoffModal
          taskTitle={task.title}
          onCancel={() => setHandoffOpen(false)}
          onConfirm={() => {
            updateTaskStatus(task.id, "done");
            setHandoffOpen(false);
            onMutate();
          }}
        />
      )}

      {testResultOpen && (
        <TestResultEditor
          taskTitle={task.title}
          current={task.test_result}
          shareHref={(() => {
            if (!task.test_result || task.test_result.status === "pending") return undefined;
            const params = new URLSearchParams({
              client: client?.name || "",
              page: task.title.replace(/^Build\s*,\s*/i, ""),
              lift: task.test_result.lift_pct != null
                ? `${task.test_result.lift_pct > 0 ? "+" : ""}${task.test_result.lift_pct}`
                : "0",
              sig: task.test_result.significance_pct != null
                ? String(task.test_result.significance_pct)
                : ",",
              status: task.test_result.status,
              period: task.cycle ? `M${task.cycle.month} cycle` : "",
              hyp: task.test_result.notes || "",
            });
            return `/share/test-result?${params.toString()}`;
          })()}
          onCancel={() => setTestResultOpen(false)}
          onSave={(result) => {
            updateTaskTestResult(task.id, result);
            setTestResultOpen(false);
            onMutate();
          }}
          onClear={() => {
            updateTaskTestResult(task.id, undefined);
            setTestResultOpen(false);
            onMutate();
          }}
        />
      )}

      {phaseOpen && task.phase && (
        <PhasePopover
          currentPhase={task.phase}
          discipline={task.discipline}
          history={task.phase_history}
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
    <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#181818] shadow-[var(--shadow-card)]">
      <div className="border-b border-[#2A2A2A] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
        Reassign to…
      </div>
      {members.map((m) => (
        <button
          key={m.id}
          disabled={m.is_placeholder}
          onClick={() => onPick(m.id)}
          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#0C0C0C] ${
            m.id === currentId ? "bg-[#222222] font-medium" : ""
          } ${m.is_placeholder ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span>{m.is_placeholder ? "TO HIRE" : m.name}</span>
          <span className="text-[10px] text-[#71757D]">
            {m.role.replace("_", " ")}
          </span>
        </button>
      ))}
    </div>
  );
}

function PhasePopover({
  currentPhase,
  discipline,
  history,
  onPick,
}: {
  currentPhase: TaskPhase;
  discipline?: TaskDiscipline;
  history?: import("@/lib/task-board/phases").PhaseEntry[];
  onPick: (p: TaskPhase) => void;
}) {
  const hasHistory = (history?.length ?? 0) > 0;
  /* Filter the picker by discipline so a design task can't accidentally
   * be flipped into Development phases. Universal phases (onboarding,
   * launch) surface for both lanes; research is design-side. */
  const applicable = phasesForDiscipline(discipline) as TaskPhase[];
  return (
    <div className="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#181818] shadow-[var(--shadow-card)]">
      <div className="border-b border-[#2A2A2A] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
        Move to phase…
      </div>
      <div className="max-h-64 overflow-y-auto">
        {applicable.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#0C0C0C] ${
              p === currentPhase ? "bg-[#222222] font-medium" : ""
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
      {hasHistory && (
        <div className="border-t border-[#2A2A2A] bg-[#FAFBFD] px-3 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#71757D] mb-2">
            Phase history
          </p>
          <PhaseTimeline history={history} compact />
        </div>
      )}
    </div>
  );
}

/* Inline OOO editor for a pod member. Two date inputs (start / end);
 * either can be left empty for an open-ended absence. Saves on blur.
 * Render only for admins, non-admins see the OOO pill (set elsewhere)
 * but can't edit. Compact so it fits under the MemberRow without
 * pushing the header out of shape. */
function MemberOooEditor({
  member,
  onChange,
}: {
  member: PodMember;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(member.ooo_start || "");
  const [end, setEnd] = useState(member.ooo_end || "");
  const hasOoo = !!(member.ooo_start || member.ooo_end);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] text-[#71757D] hover:text-[#E5E5EA] hover:underline"
      >
        {hasOoo ? "Edit OOO" : "+ Set OOO"}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px]">
      <input
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        className="rounded border border-[#2A2A2A] bg-[#181818] px-1 py-0.5 text-[10px]"
        title="OOO start"
      />
      <span className="text-[#71757D]">→</span>
      <input
        type="date"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        className="rounded border border-[#2A2A2A] bg-[#181818] px-1 py-0.5 text-[10px]"
        title="OOO end"
      />
      <button
        onClick={() => {
          updateMemberOoo(member.id, start || undefined, end || undefined);
          setOpen(false);
          onChange();
        }}
        className="rounded bg-[#E5E5EA] text-[#181818] px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-[#F3F4F6]"
      >
        Save
      </button>
      {hasOoo && (
        <button
          onClick={() => {
            updateMemberOoo(member.id, undefined, undefined);
            setStart("");
            setEnd("");
            setOpen(false);
            onChange();
          }}
          className="rounded px-1.5 py-0.5 text-[10px] text-rose-700 hover:bg-rose-500/10"
          title="Clear OOO, back at the desk"
        >
          Clear
        </button>
      )}
      <button
        onClick={() => {
          setStart(member.ooo_start || "");
          setEnd(member.ooo_end || "");
          setOpen(false);
        }}
        className="rounded px-1.5 py-0.5 text-[10px] text-[#71757D] hover:text-[#E5E5EA]"
      >
        Cancel
      </button>
    </div>
  );
}

/* Inline modal to set/update a client's CVR + AOV baseline + current.
 * Manually entered, we don't have GA / Shopify integration yet, but
 * the delta math runs as soon as both numbers exist. metrics_updated_at
 * stamps automatically on save. */
function ClientMetricsEditor({
  client,
  onCancel,
  onSave,
}: {
  client: Client;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [cvrBase, setCvrBase] = useState(
    client.cvr_baseline != null ? String(client.cvr_baseline) : "",
  );
  const [cvrCur, setCvrCur] = useState(
    client.cvr_current != null ? String(client.cvr_current) : "",
  );
  const [aovBase, setAovBase] = useState(
    client.aov_baseline != null ? String(client.aov_baseline) : "",
  );
  const [aovCur, setAovCur] = useState(
    client.aov_current != null ? String(client.aov_current) : "",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#181818] p-5 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
          Client metrics
        </p>
        <h2 className="mt-0.5 text-base font-semibold text-[#E5E5EA]">{client.name}</h2>
        <p className="mt-1 text-[11px] text-[#71757D]">
          Baseline at engagement start, current latest. Drives the renewal share-card and the % delta on the roster card.
        </p>

        <div className="mt-3 space-y-3">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
              Conversion rate (%)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#71757D]">Baseline</label>
                <input
                  type="number"
                  step="0.01"
                  value={cvrBase}
                  onChange={(e) => setCvrBase(e.target.value)}
                  placeholder="2.4"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#181818] px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#71757D]">Current</label>
                <input
                  type="number"
                  step="0.01"
                  value={cvrCur}
                  onChange={(e) => setCvrCur(e.target.value)}
                  placeholder="3.1"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#181818] px-2 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
              Average order value (£)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#71757D]">Baseline</label>
                <input
                  type="number"
                  step="0.01"
                  value={aovBase}
                  onChange={(e) => setAovBase(e.target.value)}
                  placeholder="68"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#181818] px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#71757D]">Current</label>
                <input
                  type="number"
                  step="0.01"
                  value={aovCur}
                  onChange={(e) => setAovCur(e.target.value)}
                  placeholder="74"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#181818] px-2 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs text-[#71757D] hover:text-[#E5E5EA]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const parse = (v: string) => (v === "" ? null : Number(v));
              updateClientMetrics(client.id, {
                cvr_baseline: parse(cvrBase),
                cvr_current: parse(cvrCur),
                aov_baseline: parse(aovBase),
                aov_current: parse(aovCur),
              });
              onSave();
            }}
            className="rounded-lg bg-[#1B1B1B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#F3F4F6]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* Test result editor for Build tasks (M2/M3 variant tests). Captures
 * lift %, significance, status enum, free-text notes. Status drives the
 * chip colour on the swim lane. Save persists; Clear strips the result
 * back to "+ result" placeholder. */
function TestResultEditor({
  taskTitle,
  current,
  shareHref,
  onCancel,
  onSave,
  onClear,
}: {
  taskTitle: string;
  current?: Task["test_result"];
  /** When the task already has a non-pending result, this is the URL
   * for the share-card. Surfaced as a "Share-card →" link in the
   * footer so the designer/Dan can grab a renewal asset on the spot. */
  shareHref?: string;
  onCancel: () => void;
  onSave: (result: NonNullable<Task["test_result"]>) => void;
  onClear: () => void;
}) {
  const [status, setStatus] = useState<NonNullable<Task["test_result"]>["status"]>(
    current?.status || "pending",
  );
  const [lift, setLift] = useState<string>(
    current?.lift_pct != null ? String(current.lift_pct) : "",
  );
  const [sig, setSig] = useState<string>(
    current?.significance_pct != null ? String(current.significance_pct) : "95",
  );
  const [notes, setNotes] = useState(current?.notes || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#181818] p-5 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
          Test result
        </p>
        <h2 className="mt-0.5 text-base font-semibold text-[#E5E5EA]">{taskTitle}</h2>
        <p className="mt-1 text-[11px] text-[#71757D]">
          Captures the outcome so retainer renewals run on data, not vibes. Surfaces a chip on the task and feeds the share-card.
        </p>

        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
              Status
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(["pending", "winner", "loser", "inconclusive"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-md border px-2 py-1.5 text-[11px] font-medium capitalize ${
                    status === s
                      ? s === "winner"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : s === "loser"
                          ? "border-rose-500 bg-rose-50 text-rose-900"
                          : s === "inconclusive"
                            ? "border-white bg-[#0C0C0C] text-[#E5E5EA]"
                            : "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-[#2A2A2A] bg-[#181818] text-[#71757D]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                Lift % vs control
              </label>
              <input
                type="number"
                step="0.1"
                value={lift}
                onChange={(e) => setLift(e.target.value)}
                placeholder="e.g. 18.4"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#181818] px-2 py-1.5 text-xs"
                disabled={status === "pending"}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                Significance %
              </label>
              <input
                type="number"
                value={sig}
                onChange={(e) => setSig(e.target.value)}
                placeholder="95"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#181818] px-2 py-1.5 text-xs"
                disabled={status === "pending"}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Hypothesis, what changed, what to try next…"
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#181818] px-2 py-1.5 text-xs"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {current && (
              <button
                onClick={onClear}
                className="text-[11px] text-rose-700 hover:underline"
              >
                Clear result
              </button>
            )}
            {shareHref && (
              <a
                href={shareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Share-card →
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg px-3 py-1.5 text-xs text-[#71757D] hover:text-[#E5E5EA]"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onSave({
                  status,
                  lift_pct: lift !== "" ? Number(lift) : undefined,
                  significance_pct: sig !== "" ? Number(sig) : undefined,
                  notes: notes.trim() || undefined,
                })
              }
              className="rounded-lg bg-[#1B1B1B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#F3F4F6]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Designer → Dev handoff modal. Three checkboxes the designer has to
 * tick before flipping a Design core deliverable to done. Live count
 * gates the Confirm button. Cancel leaves the task in_progress. */
function DesignHandoffModal({
  taskTitle,
  onCancel,
  onConfirm,
}: {
  taskTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [figma, setFigma] = useState(false);
  const [assets, setAssets] = useState(false);
  const [scope, setScope] = useState(false);
  const ready = figma && assets && scope;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#181818] p-5 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
          Design → Dev handoff
        </p>
        <h2 className="mt-0.5 text-base font-semibold text-[#E5E5EA]">{taskTitle}</h2>
        <p className="mt-1 text-[11px] text-[#71757D]">
          Tick all three before flipping to done, stops the back-and-forth where dev pings the designer two days later.
        </p>

        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#2A2A2A] px-3 py-2 hover:border-white">
            <input
              type="checkbox"
              checked={figma}
              onChange={(e) => setFigma(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-xs font-medium text-[#E5E5EA]">Figma link present</div>
              <div className="text-[10px] text-[#71757D]">
                Pasted on the project / portal so dev can find it without asking.
              </div>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#2A2A2A] px-3 py-2 hover:border-white">
            <input
              type="checkbox"
              checked={assets}
              onChange={(e) => setAssets(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-xs font-medium text-[#E5E5EA]">Assets exported</div>
              <div className="text-[10px] text-[#71757D]">
                Hero images, icons, fonts, sliced and dropped where dev expects them.
              </div>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#2A2A2A] px-3 py-2 hover:border-white">
            <input
              type="checkbox"
              checked={scope}
              onChange={(e) => setScope(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-xs font-medium text-[#E5E5EA]">Scope locked</div>
              <div className="text-[10px] text-[#71757D]">
                No outstanding client comments. Anything new is a separate revision.
              </div>
            </div>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs text-[#71757D] hover:text-[#E5E5EA]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!ready}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              ready
                ? "bg-[#E5E5EA] text-[#181818] hover:bg-white"
                : "cursor-not-allowed bg-[#2A2A2A] text-[#71757D]"
            }`}
          >
            {ready ? "Confirm, mark done" : `Tick all 3 (${[figma, assets, scope].filter(Boolean).length}/3)`}
          </button>
        </div>
      </div>
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
    <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#181818] shadow-[var(--shadow-card)]">
      <div className="border-b border-[#2A2A2A] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
        {isPaused ? "Currently paused" : "Pause clock, waiting on…"}
      </div>
      {isPaused ? (
        <>
          <div className="px-3 py-1.5 text-[11px] text-[#71757D]">
            Waiting on <strong className="text-[#E5E5EA]">{waitingOn === "client" ? "client" : "internal"}</strong>. Resume when unblocked to restart the clock from where it left off.
          </div>
          <button
            onClick={onResume}
            className="flex w-full items-center justify-center gap-1 border-t border-[#2A2A2A] px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            ▶ Resume
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onPause("client")}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#0C0C0C]"
          >
            <span>Waiting on client</span>
            <span className="text-[10px] text-[#71757D]">most common</span>
          </button>
          <button
            onClick={() => onPause("internal")}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#0C0C0C]"
          >
            <span>Waiting on internal</span>
            <span className="text-[10px] text-[#71757D]">team blocker</span>
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
    <div className="absolute left-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#181818] shadow-[var(--shadow-card)]">
      <div className="border-b border-[#2A2A2A] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
        Set priority…
      </div>
      {PRIORITY_ORDER.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#0C0C0C] ${
            p === currentPriority ? "bg-[#222222] font-medium" : ""
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
        : "bg-[#222222] text-[#71757D] border-[#2A2A2A]";
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
  clients,
  podId,
  onMutate,
  isAdmin,
}: {
  member: PodMember;
  allMembers: PodMember[];
  defaultType: TaskType;
  projects: Project[];
  clientById: Map<string, Client>;
  /** All clients on this pod (with or without projects). Used to surface
   * "Create project for X" options for clients that have a roster entry
   * but no project rows yet, so an admin can add a deliverable straight
   * onto a fresh retainer without bouncing through /pods-v2/new-project. */
  clients: Client[];
  /** Current pod id. Needed to auto-create a project when the picker
   * selects a project-less client. */
  podId: string;
  onMutate: () => void;
  isAdmin: boolean;
}) {
  const memberIsDesigner =
    member.role === "primary_designer" || member.role === "secondary_designer";
  const memberIsSecondary =
    member.role === "secondary_designer" || member.role === "secondary_dev";
  /* Only PRIMARY members get the core-deliverable add-flow. Secondaries
   * do tickets (revisions, bugs, desktop fixes, asset prep), give them
   * the ticket form regardless of the swim-lane's default. */
  const memberIsPrimary =
    member.role === "primary_designer" || member.role === "primary_dev";
  /* Only admins can spawn paired core deliverables, that's PM-side
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

  /* Picker options: every project on this pod, plus a "+ New project for
   * <client>" pseudo-option for each pod client that has no projects yet
   * (e.g. Harvestory just had a Client row but no Project, so it was
   * invisible to the form). The `new:<clientId>` value triggers an
   * on-the-fly createProject before addPairedDeliverable runs. */
  const projectOptions = useMemo(() => {
    type Option =
      | { kind: "project"; value: string; label: string }
      | { kind: "new"; value: string; clientId: string; label: string };
    const opts: Option[] = projects.map((p) => {
      const client = clientById.get(p.client_id);
      return {
        kind: "project" as const,
        value: p.id,
        label: `${p.name} · ${client?.name ?? ","}`,
      };
    });
    const clientsWithProjects = new Set(projects.map((p) => p.client_id));
    for (const c of clients) {
      if (!clientsWithProjects.has(c.id)) {
        opts.push({
          kind: "new",
          value: `new:${c.id}`,
          clientId: c.id,
          label: `+ New project for ${c.name}`,
        });
      }
    }
    return opts;
  }, [projects, clients, clientById]);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>(memberIsPrimary ? defaultType : secondaryDefault);
  const [projectId, setProjectId] = useState(projectOptions[0]?.value ?? "");
  const [deliverableType, setDeliverableType] = useState<PageType>("pdp");
  const [variantLabel, setVariantLabel] = useState("");

  if (member.is_placeholder) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#2A2A2A] px-2 py-1.5 text-[11px] text-[#71757D] hover:border-white hover:text-[#E5E5EA]"
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
    <div className="rounded-lg border border-white/20 bg-[#0C0C0C] p-2.5">
      <div className="flex items-center gap-2 pb-1.5 text-[11px] text-[#71757D]">
        {isPrimaryMode ? (
          <>
            New deliverable starting with <strong className="text-[#E5E5EA]">{member.name}</strong>
          </>
        ) : (
          <>
            New for <strong className="text-[#E5E5EA]">{member.name}</strong>
          </>
        )}
      </div>

      {isPrimaryMode ? (
        projectOptions.length === 0 ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-300">
            No clients or projects on this pod yet. Create one via{" "}
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
                className="rounded border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[11px] placeholder:text-[#C7C9CD]"
              />
            </div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`${selectClass} !py-1 !text-[11px] mt-1.5`}
            >
              {projectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="mt-1.5 text-[10px] text-[#71757D]">
              Creates two paired tasks: <strong>Design, {PAGE_LABEL[deliverableType]}</strong> for{" "}
              <strong className="text-[#E5E5EA]">{memberIsDesigner ? member.name : pairPartner?.name ?? ","}</strong>
              {" "}+{" "}
              <strong>Build, {PAGE_LABEL[deliverableType]}</strong> for{" "}
              <strong className="text-[#E5E5EA]">{memberIsDesigner ? pairPartner?.name ?? "," : member.name}</strong>.
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
            className="w-full rounded border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-xs"
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
              {projectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="mt-1.5 flex justify-end gap-1.5">
        <button
          onClick={reset}
          className="rounded px-2 py-1 text-[11px] text-[#71757D] hover:text-[#E5E5EA]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            /* Resolve the picker value to a concrete project id. If the
             * user picked a "+ New project for <client>" option, create
             * a stub project for that client first (no pages, default
             * kickoff/delivery dates derived from today), then thread its
             * id into addPairedDeliverable. Keeps Harvestory-style retainer
             * clients addressable from the inline form without bouncing
             * through /pods-v2/new-project. */
            const resolveProjectId = (): string | null => {
              if (!projectId) return null;
              if (projectId.startsWith("new:")) {
                const cid = projectId.slice(4);
                const cl = clients.find((c) => c.id === cid);
                if (!cl) return null;
                const todayYMD = new Date().toISOString().slice(0, 10);
                const proj = createProject({
                  name: "Initial build",
                  client_id: cid,
                  pod_id: podId,
                  pages: [],
                  signoff_date: todayYMD,
                  is_rush: false,
                  brand_warm: !!cl.brand_warm,
                });
                return proj.id;
              }
              return projectId;
            };

            if (isPrimaryMode) {
              if (!pairPartner) return;
              const resolved = resolveProjectId();
              if (!resolved) return;
              const designerId = memberIsDesigner ? member.id : pairPartner.id;
              const devId = memberIsDesigner ? pairPartner.id : member.id;
              const { design, dev } = addPairedDeliverable({
                project_id: resolved,
                deliverable_type: deliverableType,
                designer_id: designerId,
                dev_id: devId,
                points: pointsFor(deliverableType),
              });
              // Append variant label to the auto-generated titles
              if (variantLabel.trim()) {
                const tasks = getTasks();
                const next = tasks.map((t) => {
                  if (t.id === design.id) return { ...t, title: `Design, ${PAGE_LABEL[deliverableType]} · ${variantLabel.trim()}` };
                  if (t.id === dev.id) return { ...t, title: `Build, ${PAGE_LABEL[deliverableType]} · ${variantLabel.trim()}` };
                  return t;
                });
                localStorage.setItem("launchpad-pods-v2-tasks", JSON.stringify(next));
              }
              setVariantLabel("");
            } else {
              if (!title.trim()) return;
              const resolved = resolveProjectId();
              if (!resolved) return;
              addTask({
                project_id: resolved,
                title: title.trim(),
                type,
                assigned_to: member.id,
              });
            }
            reset();
            onMutate();
          }}
          disabled={(isPrimaryMode && (!pairPartner || projectOptions.length === 0))}
          className="rounded bg-[#E5E5EA] text-[#181818] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#F3F4F6] disabled:opacity-50"
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
  /* Slack channel editor, admins can paste a channel id. Saved on
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
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
            Blockers
          </h2>
          <p className="mt-0.5 text-xs text-[#71757D]">
            Pod-wide blockers everyone needs to see, a missing asset, a sick teammate, a tool down.
            {pod.slack_channel_id && (
              <span className="ml-1.5 inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-emerald-800">
                <span className="size-1 rounded-full bg-emerald-500" /> Slack
              </span>
            )}
          </p>
          {isAdmin && (
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#71757D]">
              <span>Slack channel:</span>
              {editingSlack ? (
                <>
                  <input
                    autoFocus
                    value={slackDraft}
                    onChange={(e) => setSlackDraft(e.target.value)}
                    placeholder="C0123456 (channel id)"
                    className="rounded border border-[#2A2A2A] bg-[#181818] px-1.5 py-0.5 text-[10px]"
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
                  className="font-mono text-[#E5E5EA] hover:underline"
                >
                  {pod.slack_channel_id || ", not set ,"}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] tabular-nums text-[#71757D]">
          <span className={active.length > 0 ? "font-semibold text-rose-700" : ""}>
            {active.length} active
          </span>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-[#2A2A2A] px-2 py-1 text-[11px] font-medium text-[#E5E5EA] hover:border-white"
          >
            {open ? "Cancel" : "+ Raise blocker"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-white/20 bg-[#0C0C0C] p-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's blocking? (e.g. Waiting on Acme brand assets)"
            className="w-full rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1.5 text-xs"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="More context (optional)"
            rows={2}
            className="mt-1.5 w-full rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1.5 text-xs placeholder:text-[#C7C9CD]"
          />
          <div className="mt-1.5 flex items-center gap-1.5">
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[11px]"
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
              className="rounded-md bg-[#1B1B1B] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#F3F4F6] disabled:opacity-50"
            >
              Raise blocker
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {active.length === 0 && !open && (
          <div className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#181818] px-4 py-6 text-center text-xs text-[#71757D]">
            No active blockers. Pod is clear.
          </div>
        )}
        {active.map((b) => {
          const owner = pod.members.find((m) => m.id === b.owner_id);
          const ageMs = Date.now() - new Date(b.raised_at).getTime();
          const ageHours = Math.floor(ageMs / 3_600_000);
          const ageLabel = ageHours < 1 ? "just now" : ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageHours / 24)}d ago`;
          const tone = ageHours >= 48 ? "border-rose-300 bg-rose-50" : ageHours >= 24 ? "border-amber-300 bg-amber-50" : "border-[#2A2A2A] bg-[#181818]";
          return (
            <div key={b.id} className={`rounded-xl border ${tone} p-3 shadow-[var(--shadow-soft)]`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#E5E5EA]">{b.title}</div>
                  {b.description && (
                    <div className="mt-1 text-[12px] text-[#C7C9CD] whitespace-pre-wrap">{b.description}</div>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#71757D]">
                    <span>Raised {ageLabel}</span>
                    {owner && (
                      <>
                        <span className="text-[#C5C5C5]">·</span>
                        <span>Owner: <strong className="text-[#E5E5EA]">{owner.name}</strong></span>
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
                    className="text-[#71757D] hover:text-rose-600"
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
          <details className="text-[11px] text-[#71757D]">
            <summary className="cursor-pointer hover:text-[#E5E5EA]">Recently resolved ({resolved.length})</summary>
            <div className="mt-2 space-y-1">
              {resolved.map((b) => (
                <div key={b.id} className="group flex items-center justify-between gap-2 rounded-md bg-[#0C0C0C] px-2 py-1">
                  <span className="truncate line-through opacity-60">{b.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] text-[#71757D]">{b.resolved_at ? new Date(b.resolved_at).toLocaleDateString("en-GB") : ""}</span>
                    <button
                      onClick={() => {
                        reopenBlocker(pod.id, b.id);
                        onMutate();
                      }}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#E5E5EA] opacity-0 transition-opacity hover:bg-[#181818] hover:underline group-hover:opacity-100"
                      title="Re-open, moves back to active blockers"
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

interface ClientDeliverable {
  task: Task;
  status: DeliverableStatus;
  risk: RiskLevel;
  reason: string;
  ownerName: string;
}

const RISK_DOT: Record<RiskLevel, string> = {
  red: "bg-rose-500",
  amber: "bg-amber-400",
  green: "bg-emerald-400",
  blocked: "bg-[#C5C5C5]",
  shipped: "bg-[#C5C5C5]",
};

function ClientRoster({
  clients,
  currentPodId,
  onMutate,
  canUnassign,
  revisionsByClient,
  deliverablesByClient,
  today,
}: {
  clients: Client[];
  currentPodId: string;
  onMutate: () => void;
  canUnassign: boolean;
  revisionsByClient: Map<string, number>;
  deliverablesByClient: Map<string, ClientDeliverable[]>;
  today: string;
}) {
  return (
    <div className="mt-10">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
        Client roster
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            currentPodId={currentPodId}
            onMutate={onMutate}
            canUnassign={canUnassign}
            revisionCount={revisionsByClient.get(c.id) || 0}
            deliverables={deliverablesByClient.get(c.id) || []}
            today={today}
          />
        ))}
        {clients.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#181818] px-4 py-6 text-center text-xs text-[#71757D]">
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
  revisionCount,
  deliverables,
  today,
}: {
  client: Client;
  currentPodId: string;
  onMutate: () => void;
  canUnassign: boolean;
  revisionCount: number;
  deliverables: ClientDeliverable[];
  today: string;
}) {
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const tier = TIER_PILL[client.retainer_tier];
  const cardPathname = usePathname();
  const inTeamRoute = cardPathname?.startsWith("/team/pods") ?? false;
  const engagementHref = inTeamRoute
    ? `/team/engagements/${client.id}`
    : `/engagements/${client.id}`;

  // Deliverable rollup for the card's tracking strip.
  const liveDeliverables = deliverables.filter((d) => d.status !== "shipped");
  const atRisk = deliverables.filter((d) => d.risk === "red" || d.risk === "amber").length;
  const blockedCount = deliverables.filter((d) => d.risk === "blocked").length;
  const shippedCount = deliverables.filter((d) => d.status === "shipped").length;
  // Show the most urgent few; the rest live one tap away on the engagement.
  const topDeliverables = liveDeliverables.slice(0, 3);
  const overflow = liveDeliverables.length - topDeliverables.length;
  // Retainer clock for the timeline pill.
  const isRetainer = engagementKindOf(client) === "retainer";
  const day = isRetainer ? engagementDay(client, today) : null;

  const cvrDelta =
    client.cvr_baseline != null && client.cvr_current != null
      ? ((client.cvr_current - client.cvr_baseline) / client.cvr_baseline) * 100
      : null;
  const aovDelta =
    client.aov_baseline != null && client.aov_current != null
      ? ((client.aov_current - client.aov_baseline) / client.aov_baseline) * 100
      : null;

  return (
    <div className="group relative rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 shadow-[var(--shadow-soft)] transition-colors hover:border-white/30">
      <div className="flex items-start justify-between gap-2">
        <Link href={engagementHref} className="block min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold leading-tight">
              {client.name}
            </span>
            <ArrowTopRightOnSquareIcon className="size-3 text-[#71757D] transition-colors group-hover:text-[#E5E5EA]" />
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
            {revisionCount > 2 && (
              <span
                className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700"
                title={`${revisionCount} revision rounds, quality signal, this engagement may be struggling`}
              >
                {revisionCount} revs
              </span>
            )}
          </div>
        </Link>
        {canUnassign && (
          <button
            onClick={() => setUnassignOpen(true)}
            className="rounded-md px-1.5 py-0.5 text-[10px] text-[#71757D] hover:bg-[#0C0C0C] hover:text-[#E5E5EA]"
            title="Unassign from pod"
          >
            Unassign
          </button>
        )}
      </div>
      {client.retainer_tier !== "none" && (
        <div className="mt-3 text-[11px] text-[#71757D]">
          {RETAINER_SCOPE[client.retainer_tier]}
        </div>
      )}

      {/* Metrics row: baseline → current with delta. Click to edit. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setMetricsOpen(true)}
          className="rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] px-2 py-1.5 text-left transition-colors hover:border-white/30"
          title="Click to edit CVR baseline / current"
        >
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[#71757D]">
            CVR
          </div>
          {client.cvr_baseline != null || client.cvr_current != null ? (
            <div className="mt-0.5 flex items-baseline gap-1 text-[11px] tabular-nums">
              <span className="text-[#71757D]">{client.cvr_baseline ?? ","}%</span>
              <span className="text-[#C5C5C5]">→</span>
              <span className="font-semibold text-[#E5E5EA]">
                {client.cvr_current ?? ","}%
              </span>
              {cvrDelta != null && (
                <span
                  className={`ml-auto text-[10px] font-semibold ${
                    cvrDelta > 0
                      ? "text-emerald-700"
                      : cvrDelta < 0
                        ? "text-rose-700"
                        : "text-[#71757D]"
                  }`}
                >
                  {cvrDelta > 0 ? "+" : ""}
                  {cvrDelta.toFixed(1)}%
                </span>
              )}
            </div>
          ) : (
            <div className="mt-0.5 text-[10px] italic text-[#71757D]">+ set</div>
          )}
        </button>
        <button
          onClick={() => setMetricsOpen(true)}
          className="rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] px-2 py-1.5 text-left transition-colors hover:border-white/30"
          title="Click to edit AOV baseline / current"
        >
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[#71757D]">
            AOV
          </div>
          {client.aov_baseline != null || client.aov_current != null ? (
            <div className="mt-0.5 flex items-baseline gap-1 text-[11px] tabular-nums">
              <span className="text-[#71757D]">£{client.aov_baseline ?? ","}</span>
              <span className="text-[#C5C5C5]">→</span>
              <span className="font-semibold text-[#E5E5EA]">
                £{client.aov_current ?? ","}
              </span>
              {aovDelta != null && (
                <span
                  className={`ml-auto text-[10px] font-semibold ${
                    aovDelta > 0
                      ? "text-emerald-700"
                      : aovDelta < 0
                        ? "text-rose-700"
                        : "text-[#71757D]"
                  }`}
                >
                  {aovDelta > 0 ? "+" : ""}
                  {aovDelta.toFixed(1)}%
                </span>
              )}
            </div>
          ) : (
            <div className="mt-0.5 text-[10px] italic text-[#71757D]">+ set</div>
          )}
        </button>
      </div>

      {/* Deliverables + timeline — the tracking strip that brings the
          engagement's work onto the pod view so nothing gets missed. */}
      <div className="mt-3 border-t border-[#2A2A2A] pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            Deliverables
          </span>
          {day != null && (
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                day > 75
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-[#2A2A2A] bg-[#0C0C0C] text-[#71757D]"
              }`}
              title="Day in the 90-day engagement"
            >
              Day {Math.max(1, day)}/90
            </span>
          )}
        </div>

        {deliverables.length === 0 ? (
          <div className="mt-1.5 rounded-md border border-dashed border-[#2A2A2A] bg-[#0C0C0C] px-2 py-1.5 text-[10px] text-[#71757D]">
            No deliverables yet
          </div>
        ) : (
          <>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[#71757D]">
              <span>{liveDeliverables.length} live</span>
              {atRisk > 0 && <span className="font-semibold text-rose-600">· {atRisk} at risk</span>}
              {blockedCount > 0 && <span className="text-amber-700">· {blockedCount} blocked</span>}
              {shippedCount > 0 && <span className="text-emerald-700">· {shippedCount} shipped</span>}
            </div>

            <div className="mt-1.5 space-y-1">
              {topDeliverables.map((d) => (
                <Link
                  key={d.task.id}
                  href={engagementHref}
                  className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-[#0C0C0C]"
                >
                  <span className={`size-1.5 shrink-0 rounded-full ${RISK_DOT[d.risk]}`} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-[#E5E5EA]">{d.task.title}</span>
                  <span
                    className={`shrink-0 text-[10px] tabular-nums ${
                      d.risk === "red" ? "font-semibold text-rose-600" : "text-[#71757D]"
                    }`}
                  >
                    {d.reason}
                  </span>
                </Link>
              ))}
            </div>

            {overflow > 0 && (
              <Link
                href={engagementHref}
                className="mt-1 inline-block text-[10px] font-medium text-[#71757D] hover:text-[#E5E5EA]"
              >
                +{overflow} more →
              </Link>
            )}
          </>
        )}
      </div>

      {metricsOpen && (
        <ClientMetricsEditor
          client={client}
          onCancel={() => setMetricsOpen(false)}
          onSave={() => {
            setMetricsOpen(false);
            onMutate();
          }}
        />
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
      <div className="w-full max-w-md rounded-2xl bg-[#181818] p-5 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
          Unassign from pod
        </p>
        <h2 className="text-lg font-semibold text-[#E5E5EA]">{client.name}</h2>
        <p className="mt-1 text-[11px] text-[#71757D]">
          Pick a destination. Open tasks reassign to the new pod's primary designer/dev. Done tasks stay attached for audit.
        </p>

        <div className="mt-4 space-y-2">
          <label
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
              mode === "move" ? "border-white bg-[#0C0C0C]" : "border-[#2A2A2A]"
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
              <div className="text-xs font-medium text-[#E5E5EA]">Move to another pod</div>
              <div className="text-[10px] text-[#71757D]">Reassign client + open work to a destination pod.</div>
              {mode === "move" && otherPods.length > 0 && (
                <select
                  value={targetPodId}
                  onChange={(e) => setTargetPodId(e.target.value)}
                  className="mt-2 w-full rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[11px]"
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
              mode === "park" ? "border-white bg-[#0C0C0C]" : "border-[#2A2A2A]"
            }`}
          >
            <input
              type="radio"
              checked={mode === "park"}
              onChange={() => setMode("park")}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-xs font-medium text-[#E5E5EA]">Park (no pod)</div>
              <div className="text-[10px] text-[#71757D]">
                Client stays in the system. Open projects flip to queued, open tasks become unassigned. Use when capacity isn't ready yet.
              </div>
            </div>
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded px-3 py-1.5 text-[11px] text-[#71757D] hover:text-[#E5E5EA]">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || (mode === "move" && !targetPodId)}
            className="rounded bg-[#E5E5EA] text-[#181818] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#F3F4F6] disabled:opacity-50"
          >
            {submitting ? "Working…" : mode === "move" ? "Move client" : "Park client"}
          </button>
        </div>
      </div>
    </div>
  );
}
