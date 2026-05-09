// ─── Pods v2 — localStorage repo with seed ──────────────────────────
// Per agreement: V1 is localStorage-only with seed. Supabase tables can be
// wired up later by adding queries here without touching call-sites.

"use client";

import {
  Bucket,
  Client,
  PAGE_DEFAULT_WEIGHT,
  PAGE_LABEL,
  PageType,
  Pod,
  PodMember,
  PodMemberRole,
  Project,
  ProjectPage,
  ProjectStatus,
  RetainerTier,
  Task,
  TaskDiscipline,
} from "./types";
import {
  adjustedPoints,
  bucketFromPoints,
  deliveryThursdayFor,
  effectivePagePoints,
  kickoffMondayFor,
} from "./calc";

const LS_PODS = "launchpad-pods-v2-pods";
const LS_CLIENTS = "launchpad-pods-v2-clients";
const LS_PROJECTS = "launchpad-pods-v2-projects";
const LS_TASKS = "launchpad-pods-v2-tasks";
const LS_CRO_LEADS = "launchpad-pods-v2-cro-leads";
const LS_SEEDED = "launchpad-pods-v2-seeded-v4";
/* Bumped when we want every browser to wipe its old fake-seed data on
 * the next page load. Any browser without this sentinel runs the
 * one-time cleanup in ensureSeed() and then sets it. v2 — second wipe
 * to clear test clients/projects/tasks accumulated during pre-launch
 * iteration so every pod starts clean. */
const LS_CLEAN = "launchpad-pods-v2-clean-v2";

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Per-task due date by discipline.
 * - Design tasks: the Thursday a week before delivery (end of design phase).
 * - Dev tasks: the project delivery Thursday.
 *
 * For Bucket A (10-day): design = end of week 1, dev = end of week 2.
 * For Bucket B / C, design slides accordingly.
 */
export function taskDueDateFor(
  project: { kickoff_date: string; delivery_date: string },
  discipline: TaskDiscipline,
): string {
  if (discipline === "development") return project.delivery_date;
  if (discipline === "strategy") {
    // Dan's CRO work is due end of week 1 = Friday after the Monday kickoff.
    const d = new Date(`${project.kickoff_date}T12:00:00`);
    d.setDate(d.getDate() + 4);
    return d.toISOString().slice(0, 10);
  }
  // Design due = delivery minus 7 days, snapped backward to the previous Thursday.
  const d = new Date(`${project.delivery_date}T12:00:00`);
  d.setDate(d.getDate() - 7);
  // Ensure we land on a Thursday (already should be).
  while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
  // Don't go before kickoff.
  const kickoff = new Date(`${project.kickoff_date}T12:00:00`);
  if (d < kickoff) {
    const k = new Date(kickoff);
    while (k.getDay() !== 4) k.setDate(k.getDate() + 1);
    return k.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

// ─── Read / write primitives ────────────────────────────────────────

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Pods ───────────────────────────────────────────────────────────

export function getPods(): Pod[] {
  return read<Pod>(LS_PODS);
}

export function getPodById(id: string): Pod | null {
  return getPods().find((p) => p.id === id) ?? null;
}

export function getPodMember(podId: string, memberId: string): PodMember | null {
  const pod = getPodById(podId);
  return pod?.members.find((m) => m.id === memberId) ?? null;
}

// ─── Clients ────────────────────────────────────────────────────────

export function getClients(): Client[] {
  return read<Client>(LS_CLIENTS);
}

export function getClientsForPod(podId: string): Client[] {
  return getClients().filter((c) => c.pod_id === podId);
}

export function getClientById(id: string): Client | null {
  return getClients().find((c) => c.id === id) ?? null;
}

/* Update a client's CVR / AOV metrics. Pass undefined for any field
 * to leave it unchanged; pass null to clear. metrics_updated_at is
 * stamped automatically when any metric value changes. */
export function updateClientMetrics(
  clientId: string,
  patch: {
    cvr_baseline?: number | null;
    cvr_current?: number | null;
    aov_baseline?: number | null;
    aov_current?: number | null;
  },
): void {
  const all = getClients();
  const next = all.map((c) => {
    if (c.id !== clientId) return c;
    const updated: Client = { ...c, metrics_updated_at: new Date().toISOString() };
    if ("cvr_baseline" in patch) {
      updated.cvr_baseline = patch.cvr_baseline === null ? undefined : patch.cvr_baseline;
    }
    if ("cvr_current" in patch) {
      updated.cvr_current = patch.cvr_current === null ? undefined : patch.cvr_current;
    }
    if ("aov_baseline" in patch) {
      updated.aov_baseline = patch.aov_baseline === null ? undefined : patch.aov_baseline;
    }
    if ("aov_current" in patch) {
      updated.aov_current = patch.aov_current === null ? undefined : patch.aov_current;
    }
    return updated;
  });
  write(LS_CLIENTS, next);
}

export function createClient(input: Omit<Client, "id">): Client {
  const client: Client = {
    ...input,
    id: uid(),
  };
  const all = getClients();
  all.push(client);
  write(LS_CLIENTS, all);
  return client;
}

// ─── Projects ───────────────────────────────────────────────────────

export function getProjects(): Project[] {
  return read<Project>(LS_PROJECTS);
}

export function getProjectsForPod(podId: string): Project[] {
  return getProjects().filter((p) => p.pod_id === podId);
}

export function getProjectsForClient(clientId: string): Project[] {
  return getProjects().filter((p) => p.client_id === clientId);
}

export interface CreateProjectInput {
  name: string;
  client_id: string;
  pod_id: string;
  pages: ProjectPage[];
  signoff_date: string; // YYYY-MM-DD
  signoff_hour?: number; // 0-23 (defaults to 12)
  is_rush: boolean;
  brand_warm: boolean;
  onboarding_id?: string;
}

export function createProject(input: CreateProjectInput): Project {
  const points = adjustedPoints(input.pages, input.brand_warm);
  const bucket: Bucket = bucketFromPoints(points);
  const kickoff = kickoffMondayFor(input.signoff_date, input.signoff_hour ?? 12, input.is_rush);
  const delivery = deliveryThursdayFor(kickoff, bucket, input.is_rush) ?? kickoff;

  const project: Project = {
    id: uid(),
    name: input.name,
    client_id: input.client_id,
    pod_id: input.pod_id,
    bucket,
    points,
    pages: input.pages,
    kickoff_date: kickoff,
    delivery_date: delivery,
    is_rush: input.is_rush,
    status: "queued",
    onboarding_id: input.onboarding_id,
  };
  const all = getProjects();
  all.push(project);
  write(LS_PROJECTS, all);

  // Seed core_deliverable tasks: one design + one dev per page.
  const pod = getPodById(input.pod_id);
  if (pod) {
    const pd = pod.members.find((m) => m.role === "primary_designer");
    const pdv = pod.members.find((m) => m.role === "primary_dev");
    const designDue = taskDueDateFor(project, "design");
    const devDue = taskDueDateFor(project, "development");
    const nowIso = new Date().toISOString();
    const pageTasks: Task[] = [];
    const pagePoints = effectivePagePoints(input.pages);
    for (let pi = 0; pi < input.pages.length; pi++) {
      const page = input.pages[pi];
      const points = pagePoints[pi];
      const designId = uid();
      const devId = uid();
      const label = PAGE_LABEL[page.type];
      if (pd) {
        pageTasks.push({
          id: designId,
          project_id: project.id,
          title: `Design – ${label}`,
          type: "core_deliverable",
          discipline: "design",
          phase: "design",
          assigned_to: pd.id,
          status: "todo",
          due_date: designDue,
          created_at: nowIso,
          deliverable_type: page.type,
          points,
          paired_task_id: pdv ? devId : undefined,
        });
      }
      if (pdv) {
        pageTasks.push({
          id: devId,
          project_id: project.id,
          title: `Build – ${label}`,
          type: "core_deliverable",
          discipline: "development",
          phase: "development",
          assigned_to: pdv.id,
          status: "todo",
          due_date: devDue,
          created_at: nowIso,
          deliverable_type: page.type,
          points,
          paired_task_id: pd ? designId : undefined,
        });
      }
    }
    const tasks = getTasks();
    write(LS_TASKS, [...tasks, ...pageTasks]);
  }

  return project;
}

export function updateProjectStatus(id: string, status: ProjectStatus): void {
  const all = getProjects();
  const before = all.find((p) => p.id === id);
  const next = all.map((p) => (p.id === id ? { ...p, status } : p));
  write(LS_PROJECTS, next);

  /* Slipped-project Slack ping. Fires once on the transition into
   * "slipped" — no re-ping if it was already slipped. Goes to the pod's
   * Slack channel, fire-and-forget, silent on failure. */
  if (
    before &&
    before.status !== "slipped" &&
    status === "slipped" &&
    typeof window !== "undefined"
  ) {
    const pod = getPodById(before.pod_id);
    const client = getClientById(before.client_id);
    if (pod?.slack_channel_id) {
      fetch("/api/pods/slip-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: pod.slack_channel_id,
          pod_name: pod.name,
          project_name: before.name,
          client_name: client?.name,
          delivery_date: before.delivery_date,
          slip_reason: before.slip_reason,
        }),
      }).catch(() => {});
    }
  }
}

// ─── Tasks ──────────────────────────────────────────────────────────

export function getTasks(): Task[] {
  return read<Task>(LS_TASKS);
}

export function getTasksForProject(projectId: string): Task[] {
  return getTasks().filter((t) => t.project_id === projectId);
}

export function getTasksForMember(memberId: string): Task[] {
  return getTasks().filter((t) => t.assigned_to === memberId);
}

export function updateTaskStatus(taskId: string, status: Task["status"]): void {
  const all = getTasks();
  const task = all.find((t) => t.id === taskId);
  write(LS_TASKS, all.map((t) => (t.id === taskId ? { ...t, status } : t)));

  /* Pod ↔ portal phase sync — when a core deliverable's design or dev
   * half flips to done, mark the matching scope item on the linked
   * client portal so the portal's phase advances automatically. Fire-
   * and-forget; failures don't block the local mutation.
   *
   * Only fires for core_deliverable tasks (revisions/tickets don't
   * advance phase) and only on transition into `done` (not back out). */
  if (
    task &&
    status === "done" &&
    task.type === "core_deliverable" &&
    task.deliverable_type &&
    typeof window !== "undefined"
  ) {
    syncPortalDeliverable({
      project_id: task.project_id,
      deliverable_type: task.deliverable_type,
      discipline: task.discipline,
    }).catch(() => {});
  }
}

export function updateTaskPhase(taskId: string, phase: Task["phase"]): void {
  const all = getTasks();
  write(LS_TASKS, all.map((t) => (t.id === taskId ? { ...t, phase } : t)));
}

export function updateTaskPriority(taskId: string, priority: Task["priority"]): void {
  const all = getTasks();
  write(LS_TASKS, all.map((t) => (t.id === taskId ? { ...t, priority } : t)));
}

/** Set / update a Build task's test_result. Pass undefined to clear. */
export function updateTaskTestResult(
  taskId: string,
  result: Task["test_result"] | undefined,
): void {
  const all = getTasks();
  write(
    LS_TASKS,
    all.map((t) =>
      t.id === taskId
        ? {
            ...t,
            test_result: result
              ? { ...result, recorded_at: new Date().toISOString() }
              : undefined,
          }
        : t,
    ),
  );
}

/* ── Avatar hydration from Supabase ────────────────────────────── */

/* Read the cloud-stored team-avatars map and overlay the URLs onto the
 * local pod members + CRO leads. Run once after ensureSeed on every
 * /pods-v2 mount so a freshly-seeded localStorage picks up everyone's
 * existing photos instead of showing initials.
 *
 * Cloud is the source of truth here — local URLs that aren't in the
 * cloud map get cleared, and cloud URLs override local. That's the
 * right call for "this should match across devices" UX. */
export async function hydrateTeamAvatarsFromCloud(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const { loadTeamAvatars, podMemberAvatarKey, croLeadAvatarKey } = await import("./team-avatars");
  const cloud = await loadTeamAvatars();
  if (Object.keys(cloud).length === 0) return false;

  let touched = false;

  // Merge into pods
  const pods = getPods();
  const nextPods = pods.map((p) => ({
    ...p,
    members: p.members.map((m) => {
      const cloudUrl = cloud[podMemberAvatarKey(p.name, m.role)];
      if (cloudUrl !== undefined && cloudUrl !== m.avatar_url) {
        touched = true;
        return { ...m, avatar_url: cloudUrl };
      }
      return m;
    }),
  }));
  if (touched) write(LS_PODS, nextPods);

  // Merge into CRO leads
  const cros = getCroLeads();
  let croTouched = false;
  const nextCros = cros.map((c) => {
    const cloudUrl = cloud[croLeadAvatarKey(c.name)];
    if (cloudUrl !== undefined && cloudUrl !== c.avatar_url) {
      croTouched = true;
      return { ...c, avatar_url: cloudUrl };
    }
    return c;
  });
  if (croTouched) write(LS_CRO_LEADS, nextCros);

  return touched || croTouched;
}

/* ── Pod ↔ portal phase sync ───────────────────────────────────── */

/* When a core deliverable hits done in a pod, advance the linked
 * client portal's matching scope item. Design done → design_approved.
 * Build done → dev_live. Both flags are already wired to advance the
 * portal's per-deliverable phase ladder.
 *
 * Lookup chain: project → onboarding_id → assigned_portal_id → portal.
 * Match scope item by `type` (canonical PageType — "pdp", "homepage")
 * since that's the field shared between pods-v2 and the portal scope.
 * Falls back to substring match on description if `type` isn't set
 * (legacy string-only scope items). */
async function syncPortalDeliverable(input: {
  project_id: string;
  deliverable_type: PageType;
  discipline: TaskDiscipline;
}): Promise<void> {
  const project = getProjects().find((p) => p.id === input.project_id);
  if (!project?.onboarding_id) return;

  const { onboardingStore } = await import("../onboarding");
  const onboarding = await onboardingStore.getById(project.onboarding_id);
  if (!onboarding?.assigned_portal_id) return;

  const { getPortalById, updatePortal } = await import("../portal/data");
  const portal = await getPortalById(onboarding.assigned_portal_id);
  if (!portal?.scope) return;

  const flag = input.discipline === "design" ? "design_approved" : "dev_live";
  const matchType = input.deliverable_type;

  let touched = false;
  const nextScope = portal.scope.map((item) => {
    if (typeof item === "string") return item;
    const itemType = (item as { type?: string }).type?.toLowerCase();
    const matchesType = itemType === matchType;
    const desc = (item as { description?: string }).description?.toLowerCase() || "";
    const matchesDesc = !itemType && desc.includes(matchType.toLowerCase());
    if (matchesType || matchesDesc) {
      // Already set — don't no-op churn the portal
      if ((item as Record<string, unknown>)[flag] === true) return item;
      touched = true;
      return { ...item, [flag]: true };
    }
    return item;
  });

  if (touched) {
    await updatePortal(portal.id, { scope: nextScope });
  }
}

/* ── Stale-ticket scanner ──────────────────────────────────────── */

/* Scan all open tickets and fire a Slack ping for any that have been
 * sitting unresolved for more than 48 hours of effective time (paused
 * windows excluded). Marks `stale_pinged_at` on the task so the same
 * ticket doesn't re-ping every page load. Called from /pods-v2 admin
 * mount; safe to call repeatedly.
 *
 * Why client-side: pods data lives in localStorage; a server cron
 * can't see it. Per-admin browser scan is good enough — the staleness
 * threshold is 48h, not minutes, so we don't need second-by-second
 * precision. */
export function scanAndNotifyStaleTickets(): void {
  if (typeof window === "undefined") return;
  const tasks = getTasks();
  const projects = getProjects();
  const projectById = new Map<string, Project>();
  for (const p of projects) projectById.set(p.id, p);
  const pods = getPods();
  const podById = new Map<string, Pod>();
  for (const p of pods) podById.set(p.id, p);

  const now = Date.now();
  const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;

  let touched = false;
  const updated = tasks.map((t) => {
    // Only tickets — core deliverables don't get stale pings (they
    // have due_dates, not age clocks)
    const isTicket =
      t.type === "revision" ||
      t.type === "bug" ||
      t.type === "desktop_fix" ||
      t.type === "asset_prep" ||
      t.type === "library";
    if (!isTicket) return t;
    if (t.status === "done") return t;
    if (t.stale_pinged_at) return t; // already pinged once
    if (t.waiting_on) return t; // paused — clock isn't running

    const created = new Date(t.created_at).getTime();
    const banked = t.paused_total_ms || 0;
    const livePauseMs = t.paused_at
      ? Math.max(0, now - new Date(t.paused_at).getTime())
      : 0;
    const effectiveAgeMs = now - created - banked - livePauseMs;
    if (effectiveAgeMs < FORTY_EIGHT_H_MS) return t;

    // Stale — fire the ping
    const project = projectById.get(t.project_id);
    const pod = project ? podById.get(project.pod_id) : undefined;
    if (pod?.slack_channel_id) {
      const owner = pod.members.find((m) => m.id === t.assigned_to)?.name;
      fetch("/api/pods/stale-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: pod.slack_channel_id,
          pod_name: pod.name,
          task_title: t.title,
          owner_name: owner,
          age_hours: Math.floor(effectiveAgeMs / 3_600_000),
        }),
      }).catch(() => {});
    }
    touched = true;
    return { ...t, stale_pinged_at: new Date().toISOString() };
  });

  if (touched) write(LS_TASKS, updated);
}

/* ── Pod Slack channel ─────────────────────────────────────────── */

/* Set or clear the pod's Slack channel id used for blocker notifications.
 * Empty string clears (no notifications). */
export function updatePodSlackChannel(podId: string, channelId: string | undefined): void {
  const pods = getPods();
  const next = pods.map((p) =>
    p.id === podId ? { ...p, slack_channel_id: channelId || undefined } : p,
  );
  write(LS_PODS, next);
}

/* ── Member out-of-office ──────────────────────────────────────── */

/** Set or clear a member's OOO window. Pass empty strings to clear. */
export function updateMemberOoo(
  memberId: string,
  start: string | undefined,
  end: string | undefined,
): void {
  const pods = getPods();
  const next = pods.map((p) => ({
    ...p,
    members: p.members.map((m) =>
      m.id === memberId
        ? { ...m, ooo_start: start || undefined, ooo_end: end || undefined }
        : m,
    ),
  }));
  write(LS_PODS, next);
}

/** True if a member's OOO window contains today (inclusive). Open-
 * ended starts (no `ooo_start`) count as ongoing; open-ended ends
 * count as still away. */
export function isMemberOoo(member: PodMember, todayYMD: string): boolean {
  if (!member.ooo_start && !member.ooo_end) return false;
  if (member.ooo_start && todayYMD < member.ooo_start) return false;
  if (member.ooo_end && todayYMD > member.ooo_end) return false;
  return true;
}

/* ── Member avatar ─────────────────────────────────────────────── */

export function updateMemberAvatar(memberId: string, avatarUrl: string | undefined): void {
  const pods = getPods();
  let touchedPodName: string | undefined;
  let touchedRole: string | undefined;
  const next = pods.map((p) => ({
    ...p,
    members: p.members.map((m) => {
      if (m.id !== memberId) return m;
      touchedPodName = p.name;
      touchedRole = m.role;
      return { ...m, avatar_url: avatarUrl };
    }),
  }));
  write(LS_PODS, next);

  /* Persist the URL → slot mapping to Supabase so the avatar survives
   * any localStorage reset / different browser / new device. Files are
   * already permanent in the company-avatars bucket; we just need the
   * pointer to be too. Best-effort, silent on failure. */
  if (touchedPodName && touchedRole && typeof window !== "undefined") {
    import("./team-avatars").then(({ podMemberAvatarKey, saveTeamAvatar }) => {
      saveTeamAvatar(podMemberAvatarKey(touchedPodName!, touchedRole!), avatarUrl);
    });
  }
}

/* ── Pod blockers ───────────────────────────────────────────────── */

export function addBlocker(
  podId: string,
  input: { title: string; description?: string; owner_id?: string; raised_by?: string },
): void {
  const pods = getPods();
  const idx = pods.findIndex((p) => p.id === podId);
  if (idx < 0) return;
  const pod = pods[idx];
  const owner = input.owner_id
    ? pod.members.find((m) => m.id === input.owner_id)?.name
    : undefined;
  const blocker = {
    id: uid(),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    owner_id: input.owner_id,
    raised_by: input.raised_by,
    raised_at: new Date().toISOString(),
  };
  const next = [...pods];
  next[idx] = {
    ...next[idx],
    blockers: [...(next[idx].blockers || []), blocker],
  };
  write(LS_PODS, next);

  /* Fire-and-forget Slack ping when the pod has a channel configured.
   * Failure (no channel, network error, missing token) is intentionally
   * silent — the blocker is already saved locally; the channel post is
   * a nice-to-have, not a correctness gate. */
  if (pod.slack_channel_id && typeof window !== "undefined") {
    fetch("/api/pods/blocker-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_id: pod.slack_channel_id,
        pod_name: pod.name,
        title: blocker.title,
        description: blocker.description,
        owner_name: owner,
        raised_by: input.raised_by,
      }),
    }).catch(() => {});
  }
}

export function resolveBlocker(podId: string, blockerId: string, resolvedBy?: string): void {
  const pods = getPods();
  const idx = pods.findIndex((p) => p.id === podId);
  if (idx < 0) return;
  const next = [...pods];
  next[idx] = {
    ...next[idx],
    blockers: (next[idx].blockers || []).map((b) =>
      b.id === blockerId
        ? { ...b, resolved_at: new Date().toISOString(), resolved_by: resolvedBy }
        : b,
    ),
  };
  write(LS_PODS, next);
}

export function reopenBlocker(podId: string, blockerId: string): void {
  const pods = getPods();
  const idx = pods.findIndex((p) => p.id === podId);
  if (idx < 0) return;
  const next = [...pods];
  next[idx] = {
    ...next[idx],
    blockers: (next[idx].blockers || []).map((b) =>
      b.id === blockerId
        ? { ...b, resolved_at: undefined, resolved_by: undefined }
        : b,
    ),
  };
  write(LS_PODS, next);
}

export function deleteBlocker(podId: string, blockerId: string): void {
  const pods = getPods();
  const idx = pods.findIndex((p) => p.id === podId);
  if (idx < 0) return;
  const next = [...pods];
  next[idx] = {
    ...next[idx],
    blockers: (next[idx].blockers || []).filter((b) => b.id !== blockerId),
  };
  write(LS_PODS, next);
}

/* Pause a ticket — the age clock stops escalating until resumed. The
 * `waiting_on` reason is captured for UI context. */
export function pauseTask(taskId: string, waitingOn: "client" | "internal"): void {
  const all = getTasks();
  const now = new Date().toISOString();
  write(
    LS_TASKS,
    all.map((t) =>
      t.id === taskId
        ? { ...t, waiting_on: waitingOn, paused_at: t.paused_at || now }
        : t,
    ),
  );
}

/* Resume a paused ticket — bank the elapsed pause duration into
 * paused_total_ms so future age calcs skip it. */
export function resumeTask(taskId: string): void {
  const all = getTasks();
  const nowMs = Date.now();
  write(
    LS_TASKS,
    all.map((t) => {
      if (t.id !== taskId) return t;
      if (!t.paused_at) {
        // Was flagged waiting but not actually paused — just clear the flag
        return { ...t, waiting_on: undefined };
      }
      const elapsed = nowMs - new Date(t.paused_at).getTime();
      return {
        ...t,
        waiting_on: undefined,
        paused_at: undefined,
        paused_total_ms: (t.paused_total_ms || 0) + Math.max(0, elapsed),
      };
    }),
  );
}

/* Create a paired design + dev deliverable. Both tasks reference the
 * same project, deliverable_type and points. Each links to its other
 * half via `paired_task_id`. Points represent the whole deliverable —
 * not doubled across the two halves.
 *
 * Same-type discount: if the project already has a deliverable of this
 * type (any other PDP, etc.), the new one comes in at half points. The
 * caller passes the *full* points value; we halve it here when the
 * second-of-type rule applies. */
/* Compute the date for week W of month M of a Conversion Engine cycle.
 * Kickoff = Mon of M1 W1. weekday="fri" lands on Fri of that week (W1
 * strategy due date), "thu" lands on Thu (delivery day for design /
 * build / test). */
function cycleWeekDate(
  kickoffYMD: string,
  month: 1 | 2 | 3,
  week: 1 | 2 | 3 | 4,
  weekday: "fri" | "thu",
): string {
  const k = new Date(`${kickoffYMD}T12:00:00`);
  const weekIndex = (month - 1) * 4 + (week - 1);
  k.setDate(k.getDate() + weekIndex * 7 + (weekday === "fri" ? 4 : 3));
  return k.toISOString().slice(0, 10);
}

/** Last day of the 12-week Conversion Engine cycle — Thu of M3 W4. */
export function conversionEngineDeliveryDate(kickoffYMD: string): string {
  return cycleWeekDate(kickoffYMD, 3, 4, "thu");
}

/* Seed a full 12-week Conversion Engine cycle on a project. Replaces
 * the default per-page design+build tasks createProject seeded (their
 * due dates assume a 10/15/20-day bucket, not 12 weeks). For each of
 * the 3 months, per deliverable:
 *   W1 — Dan: Strategy + Wireframe (asset_prep, due Fri W1)
 *   W2 — Designer pair: Design (core_deliverable, paired, due Thu W2)
 *   W3 — Dev pair: Build (core_deliverable, paired, due Thu W3)
 *   W4 — Designer + Dev: Test/Prep (asset_prep, due Thu W4)
 *
 * Capacity model: M1 W2/W3 carry full deliverable points. M2/M3
 * iteration cycles carry no points (variant tests, not new builds) so
 * they don't multiply pod capacity 3× while still showing up on the
 * board with proper dates. */
export function seedConversionEngineCycle(input: {
  project_id: string;
  items: Array<{ type: PageType; label: string }>;
}): void {
  const projects = getProjects();
  const project = projects.find((p) => p.id === input.project_id);
  if (!project) return;
  const pod = getPodById(project.pod_id);
  if (!pod) return;
  const dan = read<PodMember>(LS_CRO_LEADS)[0];

  /* Pick designer + dev for the cycle. If the primary is out of
   * office on the project's kickoff date, fall through to the
   * secondary so we don't seed a stack of work on an empty seat.
   * Logged so admins can see the swap happened. */
  const todayYMD = new Date().toISOString().slice(0, 10);
  const referenceYMD = project.kickoff_date < todayYMD ? todayYMD : project.kickoff_date;
  const pickRole = (primary: PodMemberRole, secondary: PodMemberRole) => {
    const p = pod.members.find((m) => m.role === primary);
    if (p && !isMemberOoo(p, referenceYMD) && !p.is_placeholder) return p;
    const s = pod.members.find((m) => m.role === secondary);
    if (s && !isMemberOoo(s, referenceYMD) && !s.is_placeholder) return s;
    return p || s;
  };
  const designer = pickRole("primary_designer", "secondary_designer");
  const dev = pickRole("primary_dev", "secondary_dev");

  /* Override project window to 12 weeks (Bespoke bucket) so the
   * delivery_date reflects the engagement's true end. */
  const newDelivery = conversionEngineDeliveryDate(project.kickoff_date);
  write(
    LS_PROJECTS,
    projects.map((p) =>
      p.id === project.id
        ? { ...p, bucket: "Bespoke" as Bucket, delivery_date: newDelivery }
        : p,
    ),
  );

  /* Drop the default M1 design+build tasks createProject just seeded —
   * their due dates assume a short bucket. The cycle seeder below
   * recreates them with proper week dates and the cycle field set. */
  const allTasks = getTasks().filter(
    (t) => !(t.project_id === project.id && t.type === "core_deliverable"),
  );

  const nowIso = new Date().toISOString();
  const pagePts = effectivePagePoints(input.items.map((it) => ({
    type: it.type,
    weight: PAGE_DEFAULT_WEIGHT[it.type],
  })));

  const newTasks: Task[] = [];

  for (let mIdx = 1 as 1 | 2 | 3; mIdx <= 3; mIdx = (mIdx + 1) as 1 | 2 | 3) {
    for (let dIdx = 0; dIdx < input.items.length; dIdx++) {
      const it = input.items[dIdx];
      const label = PAGE_LABEL[it.type];
      const variant = it.label.trim() ? ` · ${it.label.trim()}` : "";
      const fullSuffix = `${label}${variant}`;
      const points = pagePts[dIdx];

      // W1 — Dan: Strategy + Wireframe
      if (dan) {
        newTasks.push({
          id: uid(),
          project_id: project.id,
          title: `Strategy – ${fullSuffix}`,
          type: "asset_prep",
          discipline: "strategy",
          assigned_to: dan.id,
          status: "todo",
          due_date: cycleWeekDate(project.kickoff_date, mIdx, 1, "fri"),
          created_at: nowIso,
          cycle: { month: mIdx, week: 1 },
        });
        newTasks.push({
          id: uid(),
          project_id: project.id,
          title: `Wireframe – ${fullSuffix}`,
          type: "asset_prep",
          discipline: "strategy",
          assigned_to: dan.id,
          status: "todo",
          due_date: cycleWeekDate(project.kickoff_date, mIdx, 1, "fri"),
          created_at: nowIso,
          cycle: { month: mIdx, week: 1 },
        });
      }

      // W2 — Designer: Design.  W3 — Dev: Build. Paired.
      // M1 carries full points, M2/M3 carry half — variant-test
      // iterations on the same deliverable cost less than a fresh
      // build but aren't free either. Capacity meter is now time-
      // window scoped (capacityUsed takes start/end YMD), so summing
      // M2 design points only counts when the meter's window covers
      // M2's due date. That's how "next month: X / 40" works.
      const designId = uid();
      const buildId = uid();
      const cyclePoints = mIdx === 1 ? points : points * 0.5;
      if (designer) {
        newTasks.push({
          id: designId,
          project_id: project.id,
          title: `Design – ${fullSuffix}`,
          type: "core_deliverable",
          discipline: "design",
          phase: "design",
          assigned_to: designer.id,
          status: "todo",
          due_date: cycleWeekDate(project.kickoff_date, mIdx, 2, "thu"),
          created_at: nowIso,
          deliverable_type: it.type,
          points: cyclePoints,
          paired_task_id: dev ? buildId : undefined,
          cycle: { month: mIdx, week: 2 },
        });
      }
      if (dev) {
        newTasks.push({
          id: buildId,
          project_id: project.id,
          title: `Build – ${fullSuffix}`,
          type: "core_deliverable",
          discipline: "development",
          phase: "development",
          assigned_to: dev.id,
          status: "todo",
          due_date: cycleWeekDate(project.kickoff_date, mIdx, 3, "thu"),
          created_at: nowIso,
          deliverable_type: it.type,
          points: cyclePoints,
          paired_task_id: designer ? designId : undefined,
          cycle: { month: mIdx, week: 3 },
        });
      }

      // W4 — Designer + Dev: Test / Prep
      if (designer) {
        newTasks.push({
          id: uid(),
          project_id: project.id,
          title: `Test/Prep – ${fullSuffix}`,
          type: "asset_prep",
          discipline: "design",
          assigned_to: designer.id,
          status: "todo",
          due_date: cycleWeekDate(project.kickoff_date, mIdx, 4, "thu"),
          created_at: nowIso,
          cycle: { month: mIdx, week: 4 },
        });
      }
      if (dev) {
        newTasks.push({
          id: uid(),
          project_id: project.id,
          title: `QA/Prep – ${fullSuffix}`,
          type: "asset_prep",
          discipline: "development",
          assigned_to: dev.id,
          status: "todo",
          due_date: cycleWeekDate(project.kickoff_date, mIdx, 4, "thu"),
          created_at: nowIso,
          cycle: { month: mIdx, week: 4 },
        });
      }
    }
  }

  write(LS_TASKS, [...allTasks, ...newTasks]);
}

/** @deprecated Kept for back-compat with any callers still on the W1-only
 * seeder. New code should use seedConversionEngineCycle. */
export function seedDanForProject(input: {
  project_id: string;
  items: Array<{ type: PageType; label: string }>;
}): void {
  seedConversionEngineCycle(input);
}

export function addPairedDeliverable(input: {
  project_id: string;
  deliverable_type: PageType;
  designer_id: string;
  dev_id: string;
  points: number;
}): { design: Task; dev: Task } {
  const project = getProjects().find((p) => p.id === input.project_id);
  const label = PAGE_LABEL[input.deliverable_type];
  const designId = uid();
  const devId = uid();
  const now = new Date().toISOString();

  const all = getTasks();
  const sameTypeExists = all.some(
    (t) =>
      t.project_id === input.project_id &&
      t.deliverable_type === input.deliverable_type &&
      t.discipline === "design",
  );
  const effectivePoints = sameTypeExists ? input.points * 0.5 : input.points;

  const design: Task = {
    id: designId,
    project_id: input.project_id,
    title: `Design – ${label}`,
    type: "core_deliverable",
    discipline: "design",
    assigned_to: input.designer_id,
    status: "todo",
    due_date: project ? taskDueDateFor(project, "design") : now.slice(0, 10),
    created_at: now,
    phase: "design",
    deliverable_type: input.deliverable_type,
    points: effectivePoints,
    paired_task_id: devId,
  };
  const dev: Task = {
    id: devId,
    project_id: input.project_id,
    title: `Build – ${label}`,
    type: "core_deliverable",
    discipline: "development",
    assigned_to: input.dev_id,
    status: "todo",
    due_date: project ? taskDueDateFor(project, "development") : now.slice(0, 10),
    created_at: now,
    phase: "development",
    deliverable_type: input.deliverable_type,
    points: effectivePoints,
    paired_task_id: designId,
  };
  write(LS_TASKS, [...all, design, dev]);
  return { design, dev };
}

/* Move a client to a different pod. Their projects move with them, and
 * any open (non-done) tasks get re-assigned to the destination pod's
 * primary designer/dev (matching discipline). Done tasks stay attached
 * to the original assignee for audit history. */
export function moveClientToPod(clientId: string, targetPodId: string): void {
  const clients = getClients();
  const client = clients.find((c) => c.id === clientId);
  if (!client) return;
  const target = getPodById(targetPodId);
  if (!target) return;

  write(
    LS_CLIENTS,
    clients.map((c) => (c.id === clientId ? { ...c, pod_id: targetPodId } : c)),
  );

  const projects = getProjects();
  const movedProjectIds = new Set(
    projects.filter((p) => p.client_id === clientId).map((p) => p.id),
  );
  write(
    LS_PROJECTS,
    projects.map((p) =>
      p.client_id === clientId ? { ...p, pod_id: targetPodId } : p,
    ),
  );

  const designerId = target.members.find((m) => m.role === "primary_designer" && !m.is_placeholder)?.id;
  const devId = target.members.find((m) => m.role === "primary_dev" && !m.is_placeholder)?.id;
  const tasks = getTasks();
  write(
    LS_TASKS,
    tasks.map((t) => {
      if (!movedProjectIds.has(t.project_id)) return t;
      if (t.status === "done") return t;
      if (t.discipline === "design" && designerId) {
        return { ...t, assigned_to: designerId };
      }
      if (t.discipline === "development" && devId) {
        return { ...t, assigned_to: devId };
      }
      return t;
    }),
  );
}

/* Park a client — strip the pod assignment without deleting anything.
 * The client stays in the system, their projects flip to `queued`
 * status, and open tasks become un-assigned (assigned_to = "") so they
 * don't render in any pod's columns. Useful for capacity rejigging
 * when there's no destination pod yet. */
export function parkClient(clientId: string): void {
  const clients = getClients();
  write(
    LS_CLIENTS,
    clients.map((c) => (c.id === clientId ? { ...c, pod_id: "" } : c)),
  );

  const projects = getProjects();
  const parkedProjectIds = new Set(
    projects.filter((p) => p.client_id === clientId).map((p) => p.id),
  );
  write(
    LS_PROJECTS,
    projects.map((p) =>
      p.client_id === clientId
        ? { ...p, pod_id: "", status: p.status === "shipped" || p.status === "slipped" ? p.status : "queued" }
        : p,
    ),
  );

  const tasks = getTasks();
  write(
    LS_TASKS,
    tasks.map((t) => {
      if (!parkedProjectIds.has(t.project_id)) return t;
      if (t.status === "done") return t;
      return { ...t, assigned_to: "" };
    }),
  );
}

export function reassignTask(taskId: string, memberId: string): void {
  const all = getTasks();
  write(
    LS_TASKS,
    all.map((t) => (t.id === taskId ? { ...t, assigned_to: memberId } : t)),
  );
}

export function deleteTask(taskId: string): void {
  const all = getTasks();
  write(
    LS_TASKS,
    all.filter((t) => t.id !== taskId),
  );
}

export interface AddTaskInput {
  project_id: string;
  title: string;
  type: Task["type"];
  discipline?: TaskDiscipline;
  assigned_to: string;
  /** Optional override; otherwise inferred from project + discipline. */
  due_date?: string;
}

export function addTask(input: AddTaskInput): Task {
  const project = getProjects().find((p) => p.id === input.project_id);
  // Default discipline to design for revision/asset_prep, dev for bug/desktop_fix.
  const discipline: TaskDiscipline =
    input.discipline ??
    (input.type === "bug" || input.type === "desktop_fix"
      ? "development"
      : "design");
  const dueDate =
    input.due_date ??
    (project ? taskDueDateFor(project, discipline) : new Date().toISOString().slice(0, 10));
  const task: Task = {
    id: uid(),
    project_id: input.project_id,
    title: input.title,
    type: input.type,
    discipline,
    assigned_to: input.assigned_to,
    status: "todo",
    due_date: dueDate,
    created_at: new Date().toISOString(),
  };
  const all = getTasks();
  write(LS_TASKS, [...all, task]);
  return task;
}

// ─── Seed ───────────────────────────────────────────────────────────

/* Default Slack channel ids for blocker notifications, keyed by pod
 * name. Used by buildSeedPods on first load AND by the back-fill
 * migration in ensureSeed so browsers that already seeded their pods
 * (before slack_channel_id existed) pick up the channel without
 * losing their clients/projects/tasks. */
const POD_DEFAULT_SLACK_CHANNELS: Record<string, string> = {
  "Pod 1": "C0B289Z9Y9M",
  "Pod 2": "C0B28A1GDAT",
  "Pod 3": "C0B2PPN424A",
};

const SEED_POD_DEFINITIONS: Array<{
  name: string;
  tagline: string;
  members: Array<{ name: string; role: PodMemberRole; placeholder?: boolean }>;
}> = [
  {
    name: "Pod 1",
    tagline: "Barnaby's pod",
    members: [
      { name: "Barnaby", role: "primary_designer" },
      { name: "Victoria", role: "secondary_designer" },
      { name: "Angel", role: "primary_dev" },
      { name: "Kaye", role: "secondary_dev" },
    ],
  },
  {
    name: "Pod 2",
    tagline: "Jack's pod",
    members: [
      { name: "Jack", role: "primary_designer" },
      { name: "Anastasia", role: "secondary_designer" },
      { name: "Ian", role: "primary_dev" },
      { name: "Clien", role: "secondary_dev" },
    ],
  },
  {
    name: "Pod 3",
    tagline: "Brandon's pod",
    members: [
      { name: "Brandon", role: "primary_designer" },
      { name: "TO HIRE", role: "secondary_designer", placeholder: true },
      { name: "Hitesh", role: "primary_dev" },
      { name: "Ashish", role: "secondary_dev" },
    ],
  },
];

function buildSeedPods(): Pod[] {
  return SEED_POD_DEFINITIONS.map((def) => {
    const podId = uid();
    return {
      id: podId,
      name: def.name,
      tagline: def.tagline,
      capacity_points_per_month: 40,
      slack_channel_id: POD_DEFAULT_SLACK_CHANNELS[def.name],
      members: def.members.map((m) => ({
        id: uid(),
        name: m.name,
        role: m.role,
        pod_id: podId,
        is_placeholder: !!m.placeholder,
      })),
    };
  });
}

/**
 * Seed dummy projects + clients across the three pods so views render
 * meaningfully on first load. Only runs once.
 */
function buildSeedProjectsAndClients(pods: Pod[]): {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
} {
  const today = new Date();
  const ymd = (offsetDays: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const findPod = (name: string) => pods.find((p) => p.name === name)!;
  const primaryDesigner = (pod: Pod) =>
    pod.members.find((m) => m.role === "primary_designer")!;
  const primaryDev = (pod: Pod) =>
    pod.members.find((m) => m.role === "primary_dev")!;
  const secondaryDesigner = (pod: Pod) =>
    pod.members.find((m) => m.role === "secondary_designer")!;
  const secondaryDev = (pod: Pod) =>
    pod.members.find((m) => m.role === "secondary_dev")!;

  const pod1 = findPod("Pod 1");
  const pod2 = findPod("Pod 2");
  const pod3 = findPod("Pod 3");

  const seedClients: Array<{
    name: string;
    pod: Pod;
    brand_warm: boolean;
    retainer: RetainerTier;
  }> = [
    { name: "Acme Skincare", pod: pod1, brand_warm: true, retainer: "8k" },
    { name: "Glow & Co", pod: pod1, brand_warm: false, retainer: "none" },
    { name: "Northwind Beauty", pod: pod1, brand_warm: false, retainer: "12k" },
    { name: "Boreal Coffee", pod: pod2, brand_warm: false, retainer: "none" },
    { name: "Hadron Apparel", pod: pod2, brand_warm: true, retainer: "8k" },
    { name: "Quartz Goods", pod: pod3, brand_warm: false, retainer: "none" },
    { name: "Rivulet Pet", pod: pod3, brand_warm: true, retainer: "12k" },
  ];

  const clients: Client[] = seedClients.map((c) => ({
    id: uid(),
    name: c.name,
    pod_id: c.pod.id,
    brand_warm: c.brand_warm,
    retainer_tier: c.retainer,
    portal_slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  }));

  const projects: Project[] = [];
  const tasks: Task[] = [];

  function pushProject(args: {
    name: string;
    client: Client;
    pod: Pod;
    pages: ProjectPage[];
    kickoffOffset: number; // days from today
    deliveryOffset: number;
    is_rush?: boolean;
    status?: ProjectStatus;
  }) {
    const points = adjustedPoints(args.pages, args.client.brand_warm);
    const bucket = bucketFromPoints(points);
    // Snap kickoff to nearest Monday in the spec'd direction.
    const kickoffYMD = snapToDay(ymd(args.kickoffOffset), 1);
    const deliveryYMD = snapToDay(ymd(args.deliveryOffset), 4);
    const project: Project = {
      id: uid(),
      name: args.name,
      client_id: args.client.id,
      pod_id: args.pod.id,
      bucket,
      points,
      pages: args.pages,
      kickoff_date: kickoffYMD,
      delivery_date: deliveryYMD,
      is_rush: !!args.is_rush,
      status: args.status ?? "in_progress",
    };
    projects.push(project);

    // Core tasks (primary lane) — split by discipline with proper due dates.
    const pd = primaryDesigner(args.pod);
    const pdv = primaryDev(args.pod);
    const designDue = taskDueDateFor(project, "design");
    const devDue = taskDueDateFor(project, "development");
    const created = new Date(`${project.kickoff_date}T09:00:00`).toISOString();
    args.pages.forEach((page, i) => {
      tasks.push({
        id: uid(),
        project_id: project.id,
        title: `Design — ${page.type.toUpperCase()}`,
        type: "core_deliverable",
        discipline: "design",
        phase: i === 0 ? "design" : "onboarding",
        assigned_to: pd.id,
        status: i === 0 ? "in_progress" : "todo",
        due_date: designDue,
        created_at: created,
      });
      tasks.push({
        id: uid(),
        project_id: project.id,
        title: `Build — ${page.type.toUpperCase()}`,
        type: "core_deliverable",
        discipline: "development",
        phase: "onboarding",
        assigned_to: pdv.id,
        status: "todo",
        due_date: devDue,
        created_at: created,
      });
    });

    // Secondary fill — tickets timestamped at kickoff
    const sd = secondaryDesigner(args.pod);
    const sdv = secondaryDev(args.pod);
    if (sd && !sd.is_placeholder) {
      tasks.push({
        id: uid(),
        project_id: project.id,
        title: `Revisions round 1 — ${args.name}`,
        type: "revision",
        discipline: "design",
        assigned_to: sd.id,
        status: "todo",
        due_date: designDue,
        created_at: created,
      });
    }
    if (sdv) {
      tasks.push({
        id: uid(),
        project_id: project.id,
        title: `Desktop QA — ${args.name}`,
        type: "desktop_fix",
        discipline: "development",
        assigned_to: sdv.id,
        status: "todo",
        due_date: devDue,
        created_at: created,
      });
    }
  }

  pushProject({
    name: "PDP rebuild Q2",
    client: clients[0],
    pod: pod1,
    pages: [
      { type: "pdp", weight: "heavy" },
      { type: "cart", weight: "medium" },
    ],
    kickoffOffset: -7,
    deliveryOffset: 3,
  });
  pushProject({
    name: "Homepage refresh",
    client: clients[1],
    pod: pod1,
    pages: [
      { type: "homepage", weight: "heavy" },
      { type: "navigation", weight: "light" },
    ],
    kickoffOffset: 0,
    deliveryOffset: 10,
  });
  pushProject({
    name: "Listicle — winter campaign",
    client: clients[2],
    pod: pod1,
    pages: [{ type: "listicle", weight: "medium" }],
    kickoffOffset: 7,
    deliveryOffset: 17,
  });
  pushProject({
    name: "Quiz funnel build",
    client: clients[3],
    pod: pod2,
    pages: [
      { type: "quiz", weight: "heavy" },
      { type: "advertorial", weight: "heavy" },
    ],
    kickoffOffset: -14,
    deliveryOffset: 0,
  });
  pushProject({
    name: "Cart + checkout polish",
    client: clients[4],
    pod: pod2,
    pages: [
      { type: "cart", weight: "medium" },
      { type: "policies", weight: "light" },
    ],
    kickoffOffset: 0,
    deliveryOffset: 10,
  });
  pushProject({
    name: "PDP A/B test variant",
    client: clients[5],
    pod: pod3,
    pages: [{ type: "pdp", weight: "heavy" }],
    kickoffOffset: -3,
    deliveryOffset: 7,
    is_rush: true,
  });
  pushProject({
    name: "Full funnel revamp",
    client: clients[6],
    pod: pod3,
    pages: [
      { type: "pdp", weight: "heavy" },
      { type: "homepage", weight: "heavy" },
      { type: "advertorial", weight: "heavy" },
      { type: "listicle", weight: "medium" },
    ],
    kickoffOffset: 7,
    deliveryOffset: 27,
  });

  return { clients, projects, tasks };
}

/** Snap a YYYY-MM-DD forward to the next occurrence of `targetDow` (0-6). */
function snapToDay(ymd: string, targetDow: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Initialise the data store on first load.
 *
 * Pods + members are the real team structure — always seeded if
 * missing so the org is visible. Clients/projects/tasks are
 * user-created (no demo data).
 *
 * Browsers that previously had the old fake clients/projects/tasks
 * sitting in localStorage get them wiped once via the LS_CLEAN
 * sentinel. Pods are preserved through that wipe.
 */
export function ensureSeed(): void {
  if (typeof window === "undefined") return;

  // One-time per-browser wipe of legacy fake clients/projects/tasks.
  if (!localStorage.getItem(LS_CLEAN)) {
    localStorage.removeItem(LS_CLIENTS);
    localStorage.removeItem(LS_PROJECTS);
    localStorage.removeItem(LS_TASKS);
    localStorage.setItem(LS_CLEAN, "1");
  }

  // Pod team structure is always seeded if missing — independent of any
  // other sentinel — so admins always land on the real team grid.
  if (!localStorage.getItem(LS_PODS)) {
    write(LS_PODS, buildSeedPods());
  } else {
    /* Back-fill default Slack channel ids onto pods that were seeded
     * before slack_channel_id existed. Only writes when missing — never
     * overwrites a channel an admin set manually. */
    {
      const pods = getPods();
      let touched = false;
      const withChannels = pods.map((p) => {
        if (p.slack_channel_id) return p;
        const def = POD_DEFAULT_SLACK_CHANNELS[p.name];
        if (!def) return p;
        touched = true;
        return { ...p, slack_channel_id: def };
      });
      if (touched) write(LS_PODS, withChannels);
    }

    /* Migration: an earlier iteration added Dan as a cro_lead member to
     * each pod. The CRO lead now lives at the org level (LS_CRO_LEADS),
     * not inside pods. Strip any cro_lead members and reassign their
     * tasks to the central Dan id. */
    const existing = getPods();
    const oldDanIds = existing.flatMap((p) =>
      p.members.filter((m) => m.role === "cro_lead").map((m) => m.id),
    );
    if (oldDanIds.length > 0) {
      const cleaned = existing.map((p) => ({
        ...p,
        members: p.members.filter((m) => m.role !== "cro_lead"),
      }));
      write(LS_PODS, cleaned);
      // Re-point any tasks assigned to old Dan-on-pod ids → central Dan
      const central = ensureCroLeads()[0];
      if (central) {
        const tasks = getTasks();
        const fixed = tasks.map((t) =>
          oldDanIds.includes(t.assigned_to)
            ? { ...t, assigned_to: central.id }
            : t,
        );
        write(LS_TASKS, fixed);
      }
    }
  }

  // Seed the org-level CRO lead (Dan) on first load.
  ensureCroLeads();

  if (!localStorage.getItem(LS_SEEDED)) {
    localStorage.setItem(LS_SEEDED, "1");
  }
}

/* Org-level CRO leads — separate from pod members. Returns the current
 * list, seeding Dan if the store is empty. */
export function getCroLeads(): PodMember[] {
  return read<PodMember>(LS_CRO_LEADS);
}

function ensureCroLeads(): PodMember[] {
  const existing = read<PodMember>(LS_CRO_LEADS);
  if (existing.length > 0) return existing;
  const dan: PodMember = {
    id: "cro-dan",
    name: "Dan",
    role: "cro_lead",
    pod_id: "*",
    is_placeholder: false,
  };
  write(LS_CRO_LEADS, [dan]);
  return [dan];
}

export function updateCroLeadAvatar(memberId: string, avatarUrl: string | undefined): void {
  const all = getCroLeads();
  let touchedName: string | undefined;
  write(
    LS_CRO_LEADS,
    all.map((m) => {
      if (m.id !== memberId) return m;
      touchedName = m.name;
      return { ...m, avatar_url: avatarUrl };
    }),
  );

  /* Same cloud-pin pattern as updateMemberAvatar — persists the URL so
   * Dan's photo doesn't reset when localStorage gets cleared. */
  if (touchedName && typeof window !== "undefined") {
    import("./team-avatars").then(({ croLeadAvatarKey, saveTeamAvatar }) => {
      saveTeamAvatar(croLeadAvatarKey(touchedName!), avatarUrl);
    });
  }
}

/** Wipe all client / project / task data. Pods + members are kept —
 * the team structure is real, only the work data is reset. */
export function resetAndReseed(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_CLIENTS);
  localStorage.removeItem(LS_PROJECTS);
  localStorage.removeItem(LS_TASKS);
  ensureSeed();
}
