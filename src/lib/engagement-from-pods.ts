/* Bridge · pods-v2 Client → MockEngagement shape.
 *
 * The Client portal renders MockEngagement objects (header / brief /
 * metrics / stage tables / etc). The pod board operates on pods-v2
 * Client / Project / Task rows in Supabase-mirrored localStorage.
 *
 * This mapper converts a pods-v2 Client into the MockEngagement shape so
 * the Client portal can display real pod-board clients on /engagements
 * without duplicating storage. Fields that have no pods-v2 equivalent
 * (vertical, brief, customDeliverables, assets, activity) default to
 * empty so the UI degrades gracefully — they'll fill in as later slices
 * wire Tasks, OnboardingSubmissions, etc.
 */

import {
  getClients,
  getClientById,
  getPodById,
  getProjectsForClient,
  getTasksForProject,
} from "@/lib/pods-v2/data";
import type {
  Client,
  Pod,
  PodMember,
  Project,
  RetainerTier,
  Task,
} from "@/lib/pods-v2/types";
import type {
  EngagementActivity,
  EngagementDeliverableState,
  EngagementWin,
  MockEngagement,
} from "./engagement-mocks";
import type {
  CustomDeliverable,
  CycleNumber,
  DeliverableStatus,
  DeliverableTestResult,
  EngagementKind,
  OwnerRole,
  StageId,
  WeekInCycle,
} from "./engagement-template";

/** Pull a "Pod N" numeric suffix from the pod name. Falls back to 0 when
 * the pod name doesn't follow the seed convention. */
function podNumberFromPod(pod: Pod | null): number {
  if (!pod) return 0;
  const match = pod.name.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Map a pods-v2 Task.discipline + member role → engagement owner. The
 * engagement portal uses a coarser owner enum (CRO / Pod / Design / PM /
 * Dylan) so a primary_designer is just "Design", a primary_dev / secondary_*
 * is "Pod" (resolves to the specific Pod N badge), etc. */
function ownerFromTask(task: Task, member: PodMember | null): OwnerRole {
  if (task.discipline === "design") return "Design";
  if (task.discipline === "strategy") return "CRO";
  // discipline === "development"
  if (member?.role === "cro_lead") return "CRO";
  return "Pod";
}

/** Pods-v2 task status → engagement deliverable status. todo/in_progress/done
 * map straight across; we don't carry a "blocked" status on pods-v2 Tasks
 * (blockers live on the Pod) so blocked is never read in. */
function statusFromTask(t: Task): DeliverableStatus {
  if (t.status === "done") return "done";
  if (t.status === "in_progress") return "in_progress";
  return "todo";
}

/** Engagement stage from pods-v2 Task.discipline + (for retainers) cycle
 * week. Buckets always use design/development/testing; retainers reuse
 * the older audit/build/test scheme. */
function stageFromTask(t: Task, kind: EngagementKind): Exclude<StageId, "audit"> {
  if (kind === "bucket") {
    if (t.discipline === "design") return "design";
    if (t.discipline === "strategy") return "design";
    // testing tasks come through as a winner test_result on a dev task
    return "development";
  }
  // retainer: tasks fall into build (W2-3) by default; W4 → test
  const week = t.cycle?.week;
  if (week === 4) return "test";
  return "build";
}

function weekInCycleFromTask(t: Task): WeekInCycle {
  return (t.cycle?.week ?? 2) as WeekInCycle;
}

function cycleNumberFromTask(t: Task): CycleNumber {
  return (t.cycle?.month ?? 1) as CycleNumber;
}

/** Working-day count between two YYYY-MM-DD strings (skips Sat/Sun). */
function workingDaysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 1;
  let count = 1;
  const cursor = new Date(s);
  while (cursor < e) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/** Map a pod Task → CustomDeliverable. dueDay is computed as working
 * days from the engagement startDate so it lines up with the engagement
 * portal's working-day cadence. */
function taskToCustomDeliverable(
  task: Task,
  startDate: string,
  kind: EngagementKind,
  member: PodMember | null,
): CustomDeliverable {
  const stage = stageFromTask(task, kind);
  const testResult: DeliverableTestResult | undefined = task.test_result
    ? {
        status: task.test_result.status,
        liftPct: task.test_result.lift_pct,
        significancePct: task.test_result.significance_pct,
        notes: task.test_result.notes,
      }
    : undefined;
  return {
    id: task.id,
    name: task.title,
    cycle: cycleNumberFromTask(task),
    stage,
    weekInCycle: weekInCycleFromTask(task),
    owner: ownerFromTask(task, member),
    dueDay: workingDaysBetween(startDate, task.due_date),
    testResult,
  };
}

/** Roll up all Tasks across all Projects for a client into the shape the
 * engagement portal expects: customDeliverables (definitions) + deliverables
 * (state). */
function tasksToEngagementParts(
  client: Client,
  startDate: string,
  kind: EngagementKind,
): {
  customDeliverables: CustomDeliverable[];
  deliverables: EngagementDeliverableState[];
  wins: EngagementWin[];
  activity: EngagementActivity[];
} {
  const projects = getProjectsForClient(client.id);
  const allTasks: Task[] = projects.flatMap((p) => getTasksForProject(p.id));
  // Only core_deliverable + revision tasks surface in the engagement
  // portal; bugs / asset_prep / library are pod-internal noise.
  const visibleTasks = allTasks.filter((t) =>
    t.type === "core_deliverable" || t.type === "revision",
  );

  const pod = getPodById(client.pod_id);
  const memberById = new Map<string, PodMember>();
  pod?.members.forEach((m) => memberById.set(m.id, m));

  const customDeliverables: CustomDeliverable[] = visibleTasks.map((t) =>
    taskToCustomDeliverable(t, startDate, kind, memberById.get(t.assigned_to) ?? null),
  );

  const deliverables: EngagementDeliverableState[] = visibleTasks.map((t) => ({
    templateId: t.id,
    status: statusFromTask(t),
    completedAtDay:
      t.status === "done"
        ? workingDaysBetween(startDate, t.due_date)
        : undefined,
  }));

  // Auto-derive wins from tasks whose test_result is a confirmed winner.
  const wins: EngagementWin[] = visibleTasks
    .filter((t) => t.test_result?.status === "winner")
    .map((t) => ({
      id: `win-${t.id}`,
      shippedAtDay: workingDaysBetween(startDate, t.due_date),
      title: t.title,
      metric:
        t.test_result?.lift_pct != null
          ? `+${t.test_result.lift_pct}% lift`
          : undefined,
      notes: t.test_result?.notes,
    }));

  // Activity: surface recent task completions (most recent 8).
  const activity: EngagementActivity[] = visibleTasks
    .filter((t) => t.status === "done")
    .sort((a, b) => b.due_date.localeCompare(a.due_date))
    .slice(0, 8)
    .map((t) => ({
      id: `act-${t.id}`,
      day: workingDaysBetween(startDate, t.due_date),
      actor: memberById.get(t.assigned_to)?.name ?? "Pod",
      action: `Marked '${t.title}' done`,
    }));

  return { customDeliverables, deliverables, wins, activity };
}

/** Pick the earliest kickoff_date across this client's Projects as the
 * engagement startDate. Falls back to today's Monday when there are no
 * Projects yet. */
function startDateForClient(client: Client): string {
  const projects = getProjectsForClient(client.id);
  if (projects.length === 0) return nextMonday();
  const earliest = projects
    .map((p) => p.kickoff_date)
    .sort()[0];
  return earliest ?? nextMonday();
}

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday of this week
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function daysSince(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const ms = today.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

function retainerLabel(tier: RetainerTier): string {
  if (tier === "8k") return "£8K";
  if (tier === "12k") return "£12K";
  return "Project";
}

function anchorLabel(tier: RetainerTier): string {
  if (tier === "8k") return "£12K";
  if (tier === "12k") return "£20K";
  return "";
}

function kindFromTier(tier: RetainerTier): EngagementKind {
  return tier === "none" ? "bucket" : "retainer";
}

/** Map a single pods-v2 Client → MockEngagement. Pulls Projects + Tasks
 * so the engagement portal's stage tables, wins log, and activity feed
 * all populate from the same pod-board data. */
export function clientToEngagement(client: Client): MockEngagement {
  const pod = getPodById(client.pod_id);
  const podNumber = podNumberFromPod(pod);
  const startDate = startDateForClient(client);
  const kind = kindFromTier(client.retainer_tier);
  const { customDeliverables, deliverables, wins, activity } =
    tasksToEngagementParts(client, startDate, kind);
  return {
    id: client.id,
    brand: client.name,
    vertical: "",
    retainer: retainerLabel(client.retainer_tier),
    anchor: anchorLabel(client.retainer_tier),
    startDate,
    currentDay: daysSince(startDate),
    podNumber,
    kind,
    brief: {},
    metrics: {
      cvrBaseline: client.cvr_baseline,
      cvrCurrent: client.cvr_current,
      aovBaseline: client.aov_baseline,
      aovCurrent: client.aov_current,
      metricsUpdatedAt: client.metrics_updated_at,
    },
    wins,
    deliverables,
    customDeliverables,
    assets: [],
    activity,
  };
}

/** Pull every pods-v2 Client and map them all in one go. Returns [] when
 * pods-v2 hasn't been seeded yet. Synchronous because getClients() reads
 * the localStorage cache; Supabase hydration happens in the existing
 * bootstrapPodsSync() flow. */
export function loadEngagementsFromPods(): MockEngagement[] {
  if (typeof window === "undefined") return [];
  return getClients().map(clientToEngagement);
}

/** Look up a single pods-v2 Client and return as MockEngagement, or null
 * if the id isn't a pods-v2 Client. */
export function loadEngagementFromPodsById(id: string): MockEngagement | null {
  if (typeof window === "undefined") return null;
  const client = getClientById(id);
  return client ? clientToEngagement(client) : null;
}
