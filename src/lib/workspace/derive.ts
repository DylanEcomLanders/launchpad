// ─── Workspace derivations ──────────────────────────────────────────
// Pure selectors that turn raw pods-v2 data into the three things the
// new Workspace is built around:
//   1. Visibility   - everything rolled up, nothing buried
//   2. Deadlines    - every deliverable carries a live countdown + risk
//   3. Accountability - every deliverable carries a named owner
// Strategy is treated as a first-class delivery lane alongside design and
// development everywhere.

import type {
  Pod,
  PodMember,
  Client,
  Project,
  Task,
  PodTest,
  TaskDiscipline,
} from "@/lib/pods-v2/types";
import {
  daysBetween,
  healthScore,
  healthBand,
  engagementDay,
  engagementWindow,
  ENGAGEMENT_WINDOW_LABEL,
  engagementKindOf,
  callTest,
  needsCall,
  capacityUsed,
  fourWeekWindow,
  weekWindow,
  nextWeekWindow,
  weekDays,
} from "@/lib/pods-v2/calc";

// ─── Lanes ──────────────────────────────────────────────────────────

export type Lane = "strategy" | "design" | "development";
export const LANES: Lane[] = ["strategy", "design", "development"];
export const LANE_LABEL: Record<Lane, string> = {
  strategy: "Strategy",
  design: "Design",
  development: "Development",
};

// Map a task discipline onto a lane (1:1 today, kept as a seam).
function laneOf(discipline: TaskDiscipline): Lane {
  return discipline;
}

// ─── Owner resolution ───────────────────────────────────────────────

export interface ResolvedMember extends PodMember {
  podName: string;
}

/** The pod a given member belongs to (by member id), or null. Used to scope
 * a team member's Workspace to their own pod. */
export function podIdForMember(pods: Pod[], memberId: string | null): string | null {
  if (!memberId) return null;
  for (const pod of pods) {
    if (pod.members.some((m) => m.id === memberId)) return pod.id;
  }
  return null;
}

/** Flat lookup of every member across every pod, so a task's
 * `assigned_to` always resolves to a real name (accountability). */
export function buildMemberMap(pods: Pod[]): Map<string, ResolvedMember> {
  const m = new Map<string, ResolvedMember>();
  for (const pod of pods) {
    for (const mem of pod.members) m.set(mem.id, { ...mem, podName: pod.name });
  }
  return m;
}

// ─── Deadlines ──────────────────────────────────────────────────────

export type DeadlineState =
  | "overdue"
  | "soon"
  | "ontrack"
  | "done"
  | "paused"
  | "awaiting_approval";

/** A deliverable is "soon" within 2 days of its due date. */
const SOON_DAYS = 2;

export function deadlineState(task: Task, todayYMD: string): DeadlineState {
  if (task.status === "done") return "done";
  // Approval-gated dev task whose clock hasn't started: its due_date is a
  // placeholder, so it must not read as overdue/soon. It's simply waiting on
  // the client to approve the paired design.
  if (task.approval_gated && !task.design_approved_at) return "awaiting_approval";
  if (task.waiting_on) return "paused";
  const d = daysBetween(todayYMD, task.due_date);
  if (d < 0) return "overdue";
  if (d <= SOON_DAYS) return "soon";
  return "ontrack";
}

export interface DeliverableVM {
  id: string;
  title: string;
  lane: Lane;
  status: Task["status"];
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  dueDate: string;
  daysToDue: number; // negative = overdue
  state: DeadlineState;
  projectName: string;
  waitingOn?: "client" | "internal";
  isCore: boolean;
  /** Approval-gated dev clock surfacing (for the client-page UI). */
  approvalGated: boolean;
  designApprovedAt?: string;
  /** Brief decision tri-state: undefined = pending (Aanchal hasn't ruled),
   * true = needs a brief, false = no brief needed. */
  needsBrief?: boolean;
  pairedTaskId?: string;
}

function toDeliverable(
  task: Task,
  projectName: string,
  members: Map<string, ResolvedMember>,
  todayYMD: string,
  clientPaused = false,
): DeliverableVM {
  const owner = members.get(task.assigned_to);
  // A paused client freezes all its open work: force the 'paused' state so
  // nothing reads overdue/at-risk while we wait on the client.
  const state: DeadlineState =
    clientPaused && task.status !== "done" ? "paused" : deadlineState(task, todayYMD);
  return {
    id: task.id,
    title: task.title,
    lane: laneOf(task.discipline),
    status: task.status,
    ownerId: task.assigned_to,
    ownerName: owner?.name ?? "Unassigned",
    ownerAvatar: owner?.avatar_url,
    dueDate: task.due_date,
    daysToDue: daysBetween(todayYMD, task.due_date),
    state,
    projectName,
    waitingOn: task.waiting_on,
    isCore: task.type === "core_deliverable",
    approvalGated: !!task.approval_gated,
    designApprovedAt: task.design_approved_at,
    needsBrief: task.needs_brief,
    pairedTaskId: task.paired_task_id,
  };
}

// ─── Lane summary ───────────────────────────────────────────────────

export interface LaneSummary {
  lane: Lane;
  total: number;
  done: number;
  open: number;
  atRisk: number; // open + (overdue|soon)
  nextDue?: DeliverableVM; // soonest-due open deliverable
}

function summariseLane(lane: Lane, items: DeliverableVM[]): LaneSummary {
  const inLane = items.filter((d) => d.lane === lane);
  const open = inLane.filter((d) => d.status !== "done");
  const atRisk = open.filter((d) => d.state === "overdue" || d.state === "soon");
  const nextDue = [...open]
    .filter((d) => d.state !== "paused" && d.state !== "awaiting_approval")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return {
    lane,
    total: inLane.length,
    done: inLane.filter((d) => d.status === "done").length,
    open: open.length,
    atRisk: atRisk.length,
    nextDue,
  };
}

// ─── Client view model ──────────────────────────────────────────────

export interface ClientVM {
  client: Client;
  podId: string;
  podName: string;
  day: number | null;
  windowLabel: string | null;
  kind: "retainer" | "sprint";
  health: number;
  band: "green" | "amber" | "red";
  deliverables: DeliverableVM[];
  lanes: Record<Lane, LaneSummary>;
  atRiskCount: number;
  awaitingClient: number;
  nextDeadline?: DeliverableVM;
  liveTests: PodTest[];
  testsNeedingCall: PodTest[];
  openCount: number;
  doneCount: number;
  /** Client-level pause: while true, the whole engagement is frozen (we're
   * waiting on the client) and reads as paused rather than overdue/at-risk. */
  paused: boolean;
}

export function buildClientVM(
  client: Client,
  projects: Project[],
  tasks: Task[],
  tests: PodTest[],
  members: Map<string, ResolvedMember>,
  pods: Pod[],
  todayYMD: string,
): ClientVM {
  const clientProjects = projects.filter((p) => p.client_id === client.id);
  const projectName = new Map(clientProjects.map((p) => [p.id, p.name]));
  const projectIds = new Set(clientProjects.map((p) => p.id));
  const clientTasks = tasks.filter((t) => projectIds.has(t.project_id));
  const paused = !!client.paused_at;

  const deliverables = clientTasks.map((t) =>
    toDeliverable(t, projectName.get(t.project_id) ?? "Project", members, todayYMD, paused),
  );

  const lanes: Record<Lane, LaneSummary> = {
    strategy: summariseLane("strategy", deliverables),
    design: summariseLane("design", deliverables),
    development: summariseLane("development", deliverables),
  };

  const open = deliverables.filter((d) => d.status !== "done");
  const atRiskCount = open.filter(
    (d) => d.state === "overdue" || d.state === "soon",
  ).length;
  const awaitingClient = open.filter((d) => d.waitingOn === "client").length;
  const nextDeadline = [...open]
    .filter((d) => d.state !== "paused" && d.state !== "awaiting_approval")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  const clientTests = tests.filter((t) => t.client_id === client.id);
  const liveTests = clientTests.filter(
    (t) => t.status === "live" || t.status === "analysing",
  );
  const testsNeedingCall = clientTests.filter(needsCall);

  const day = engagementDay(client, todayYMD);
  const health = healthScore(
    client.health_signals ?? {
      client_delay_days: 0,
      approval_lag_days: 0,
      engagement_gap_days: 0,
      open_blockers: 0,
    },
  );
  const podName =
    pods.find((p) => p.id === client.pod_id)?.name ?? "Unassigned";

  return {
    client,
    podId: client.pod_id,
    podName,
    day,
    windowLabel: day != null ? ENGAGEMENT_WINDOW_LABEL[engagementWindow(day)] : null,
    kind: engagementKindOf(client),
    health,
    band: healthBand(health),
    deliverables,
    lanes,
    atRiskCount,
    awaitingClient,
    nextDeadline,
    liveTests,
    testsNeedingCall,
    openCount: open.length,
    doneCount: deliverables.length - open.length,
    paused,
  };
}

/** Build VMs for every client in one pass. */
export function buildAllClientVMs(args: {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  tests: PodTest[];
  pods: Pod[];
  todayYMD: string;
}): ClientVM[] {
  const members = buildMemberMap(args.pods);
  return args.clients
    .map((c) =>
      buildClientVM(
        c,
        args.projects,
        args.tasks,
        args.tests,
        members,
        args.pods,
        args.todayYMD,
      ),
    )
    .sort((a, b) => {
      // Most-at-risk clients float to the top - visibility first.
      if (b.atRiskCount !== a.atRiskCount) return b.atRiskCount - a.atRiskCount;
      return a.health - b.health;
    });
}

// ─── Pod view model ─────────────────────────────────────────────────

/** A deliverable due inside the pod's current week, carrying its client
 *  context so the weekly calendar can show "who / which client / nudge". */
export interface WeekDeliverable extends DeliverableVM {
  clientId: string;
  clientName: string;
}

export interface PodVM {
  pod: Pod;
  clientCount: number;
  retainerCount: number;
  sprintCount: number;
  /** Points landing this week / next week / across the 4-week month. */
  capWeek: number;
  capNextWeek: number;
  capacityUsed: number; // month (4-week) usage — kept name for call-sites
  capacityTotal: number;
  capacityPct: number;
  atRiskCount: number;
  awaitingClient: number;
  liveTests: number;
  clients: ClientVM[];
  /** Open deliverables due Mon-Sun of the current week, soonest first. */
  weekDeliverables: WeekDeliverable[];
}

export function buildPodVM(
  pod: Pod,
  clientVMs: ClientVM[],
  projects: Project[],
  tasks: Task[],
  todayYMD: string,
): PodVM {
  const podClients = clientVMs.filter((c) => c.podId === pod.id);
  const podProjects = projects.filter((p) => p.pod_id === pod.id);
  const projectIds = new Set(podProjects.map((p) => p.id));
  const podTasks = tasks.filter((t) => projectIds.has(t.project_id));

  const month = fourWeekWindow(todayYMD);
  const wk = weekWindow(todayYMD);
  const nextWk = nextWeekWindow(todayYMD);
  const used = capacityUsed(podProjects, podTasks, month.start, month.end);
  const total = pod.capacity_points_per_month || 40;

  // Weekly calendar feed: open deliverables due inside this Mon-Sun week.
  const weekDeliverables: WeekDeliverable[] = [];
  for (const c of podClients) {
    for (const d of c.deliverables) {
      if (d.status === "done") continue;
      if (d.dueDate >= wk.start && d.dueDate <= wk.end) {
        weekDeliverables.push({ ...d, clientId: c.client.id, clientName: c.client.name });
      }
    }
  }
  weekDeliverables.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    pod,
    clientCount: podClients.length,
    retainerCount: podClients.filter((c) => c.kind === "retainer").length,
    sprintCount: podClients.filter((c) => c.kind === "sprint").length,
    capWeek: capacityUsed(podProjects, podTasks, wk.start, wk.end),
    capNextWeek: capacityUsed(podProjects, podTasks, nextWk.start, nextWk.end),
    capacityUsed: used,
    capacityTotal: total,
    capacityPct: total > 0 ? Math.round((used / total) * 100) : 0,
    atRiskCount: podClients.reduce((s, c) => s + c.atRiskCount, 0),
    awaitingClient: podClients.reduce((s, c) => s + c.awaitingClient, 0),
    liveTests: podClients.reduce((s, c) => s + c.liveTests.length, 0),
    clients: podClients,
    weekDeliverables,
  };
}

export function buildAllPodVMs(args: {
  pods: Pod[];
  clientVMs: ClientVM[];
  projects: Project[];
  tasks: Task[];
  todayYMD: string;
}): PodVM[] {
  return args.pods.map((pod) =>
    buildPodVM(pod, args.clientVMs, args.projects, args.tasks, args.todayYMD),
  );
}

// ─── Week strip (compact, all-pods overview) ────────────────────────

/** One Mon-Fri day for the Overview week strip: just a count + flags, no
 *  per-item detail (Overview spans all pods, so listing every task would
 *  re-clutter it). `overdue` tints the day red; `today` highlights it. */
/** A deliverable due on a given week-strip day, with its client context so
 *  the click-in panel can show "what / who / which client". */
export interface WeekDayItem {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  lane: Lane;
  ownerName: string;
  state: DeadlineState;
  daysToDue: number;
}

export interface WeekDay {
  ymd: string;
  weekday: string; // "Mon"
  dayNum: number; // 25
  count: number; // open deliverables due that day, across all clients
  overdue: number; // of those, how many are past due
  isToday: boolean;
  items: WeekDayItem[]; // the deliverables behind the count (for click-in)
}

/** Aggregate every client's open deliverables into Mon-Fri buckets for the
 *  current week. The count drives the compact strip; `items` powers the
 *  click-to-expand detail so Overview stays clean by default. */
export function buildWeekCounts(clientVMs: ClientVM[], todayYMD: string): WeekDay[] {
  const days = weekDays(todayYMD); // Mon-Fri YMD strings
  const buckets = new Map<string, WeekDayItem[]>();
  for (const d of days) buckets.set(d, []);
  for (const c of clientVMs) {
    for (const d of c.deliverables) {
      if (d.status === "done") continue;
      // Approval-gated dev tasks have a placeholder due date until the client
      // approves — don't let them pollute the week strip.
      if (d.state === "awaiting_approval") continue;
      const bucket = buckets.get(d.dueDate);
      if (!bucket) continue; // due outside this Mon-Fri week
      bucket.push({
        id: d.id,
        title: d.title,
        clientId: c.client.id,
        clientName: c.client.name,
        lane: d.lane,
        ownerName: d.ownerName,
        state: d.state,
        daysToDue: d.daysToDue,
      });
    }
  }
  return days.map((ymd) => {
    const dt = new Date(`${ymd}T12:00:00`);
    const items = buckets.get(ymd)!;
    return {
      ymd,
      weekday: dt.toLocaleDateString("en-GB", { weekday: "short" }),
      dayNum: dt.getDate(),
      count: items.length,
      overdue: items.filter((i) => i.state === "overdue").length,
      isToday: ymd === todayYMD,
      items,
    };
  });
}

// ─── Attention feed (the "what needs me now" surface) ───────────────

export type AttentionKind =
  | "overdue"
  | "due_soon"
  | "test_call"
  | "awaiting_client"
  | "strategy_gap";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  clientId: string;
  clientName: string;
  lane?: Lane;
  title: string;
  detail: string;
  ownerName?: string;
  severity: number; // higher = more urgent, drives sort
}

const KIND_BASE: Record<AttentionKind, number> = {
  overdue: 1000,
  test_call: 700,
  due_soon: 500,
  strategy_gap: 400,
  awaiting_client: 200,
};

/** Flatten every client's risk signals into one prioritised feed. This is
 * the single place a lead looks to answer "what's slipping and who owns
 * it" - the core fix for the visibility + accountability pain points. */
export function buildAttentionFeed(clientVMs: ClientVM[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const c of clientVMs) {
    // Overdue + due-soon deliverables, each with its named owner.
    for (const d of c.deliverables) {
      if (d.status === "done" || d.state === "paused") continue;
      if (d.state === "overdue") {
        items.push({
          id: `od-${d.id}`,
          kind: "overdue",
          clientId: c.client.id,
          clientName: c.client.name,
          lane: d.lane,
          title: d.title,
          detail: `${Math.abs(d.daysToDue)}d overdue · ${LANE_LABEL[d.lane]}`,
          ownerName: d.ownerName,
          severity: KIND_BASE.overdue + Math.abs(d.daysToDue),
        });
      } else if (d.state === "soon") {
        items.push({
          id: `ds-${d.id}`,
          kind: "due_soon",
          clientId: c.client.id,
          clientName: c.client.name,
          lane: d.lane,
          title: d.title,
          detail: `due in ${d.daysToDue}d · ${LANE_LABEL[d.lane]}`,
          ownerName: d.ownerName,
          severity: KIND_BASE.due_soon + (SOON_DAYS - d.daysToDue),
        });
      }
    }

    // Tests that have hit a decision point (strategy = core deliverable).
    for (const t of c.testsNeedingCall) {
      const call = callTest(t);
      items.push({
        id: `tc-${t.id}`,
        kind: "test_call",
        clientId: c.client.id,
        clientName: c.client.name,
        lane: "strategy",
        title: t.name,
        detail: `${call.action} · ${call.why}`,
        severity: KIND_BASE.test_call,
      });
    }

    // Strategy gap: an active engagement with no live strategy work and no
    // live tests is a silent accountability hole - surface it.
    const strategyAlive =
      c.lanes.strategy.open > 0 || c.liveTests.length > 0;
    if (!strategyAlive && c.openCount > 0 && c.kind === "retainer") {
      items.push({
        id: `sg-${c.client.id}`,
        kind: "strategy_gap",
        clientId: c.client.id,
        clientName: c.client.name,
        lane: "strategy",
        title: "No live strategy work",
        detail: "Retainer is building with nothing in the strategy lane",
        severity: KIND_BASE.strategy_gap,
      });
    }

    // Awaiting client (blocks accountability - make it visible, not hidden).
    if (c.awaitingClient > 0) {
      items.push({
        id: `ac-${c.client.id}`,
        kind: "awaiting_client",
        clientId: c.client.id,
        clientName: c.client.name,
        title: `${c.awaitingClient} item${c.awaitingClient > 1 ? "s" : ""} waiting on client`,
        detail: "Paused - chase the client to unblock",
        severity: KIND_BASE.awaiting_client + c.awaitingClient,
      });
    }
  }

  return items.sort((a, b) => b.severity - a.severity);
}

/** One row per client for the decluttered Overview: the single most urgent
 *  signal plus how many other open issues that client has. Keeps the feed
 *  scannable (one line per client) instead of dozens of task rows. */
export interface ClientAttention {
  clientId: string;
  clientName: string;
  top: AttentionItem;
  extraCount: number;
  maxSeverity: number;
}

export function groupAttentionByClient(items: AttentionItem[]): ClientAttention[] {
  const byClient = new Map<string, AttentionItem[]>();
  for (const it of items) {
    const arr = byClient.get(it.clientId) ?? [];
    arr.push(it);
    byClient.set(it.clientId, arr);
  }
  const out: ClientAttention[] = [];
  for (const [clientId, arr] of byClient) {
    arr.sort((a, b) => b.severity - a.severity);
    out.push({
      clientId,
      clientName: arr[0].clientName,
      top: arr[0],
      extraCount: arr.length - 1,
      maxSeverity: arr[0].severity,
    });
  }
  return out.sort((a, b) => b.maxSeverity - a.maxSeverity);
}

// ─── Top-line stats ─────────────────────────────────────────────────

export interface WorkspaceStats {
  atRisk: number;
  dueThisWeek: number;
  awaitingClient: number;
  liveTests: number;
  testsNeedingCall: number;
  activeClients: number;
  healthAtRisk: number; // amber + red clients
}

export function buildStats(clientVMs: ClientVM[]): WorkspaceStats {
  let atRisk = 0;
  let dueThisWeek = 0;
  let awaitingClient = 0;
  let liveTests = 0;
  let testsNeedingCall = 0;
  let healthAtRisk = 0;

  for (const c of clientVMs) {
    atRisk += c.atRiskCount;
    awaitingClient += c.awaitingClient;
    liveTests += c.liveTests.length;
    testsNeedingCall += c.testsNeedingCall.length;
    if (c.band !== "green") healthAtRisk += 1;
    for (const d of c.deliverables) {
      if (d.status === "done" || d.state === "paused" || d.state === "awaiting_approval") continue;
      if (d.daysToDue >= 0 && d.daysToDue <= 7) dueThisWeek += 1;
    }
  }

  return {
    atRisk,
    dueThisWeek,
    awaitingClient,
    liveTests,
    testsNeedingCall,
    activeClients: clientVMs.length,
    healthAtRisk,
  };
}

// ─── Small formatting helpers ───────────────────────────────────────

export function formatDue(dateYMD: string): string {
  const d = new Date(`${dateYMD}T12:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function countdownLabel(daysToDue: number, state: DeadlineState): string {
  if (state === "done") return "Done";
  if (state === "paused") return "Paused";
  if (state === "awaiting_approval") return "Awaiting approval";
  if (daysToDue < 0) return `${Math.abs(daysToDue)}d over`;
  if (daysToDue === 0) return "Today";
  if (daysToDue === 1) return "Tomorrow";
  return `${daysToDue}d left`;
}
