// ─── Pods v2, localStorage repo with seed ──────────────────────────
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
  PodTest,
  PodHypothesis,
  HealthSignals,
  EngagementKind,
  RenewalStatus,
} from "./types";
import {
  adjustedPoints,
  bucketFromPoints,
  deliveryThursdayFor,
  effectivePagePoints,
  kickoffMondayFor,
} from "./calc";
import type { Phase } from "@/lib/task-board/phases";

const LS_PODS = "launchpad-pods-v2-pods";
const LS_CLIENTS = "launchpad-pods-v2-clients";
const LS_PROJECTS = "launchpad-pods-v2-projects";
const LS_TASKS = "launchpad-pods-v2-tasks";
const LS_CRO_LEADS = "launchpad-pods-v2-cro-leads";
const LS_STRATEGIST_TESTS = "launchpad-pods-v2-strategist-tests";
const LS_HYPOTHESES = "launchpad-pods-v2-hypotheses";
const LS_SEEDED = "launchpad-pods-v2-seeded-v4";
/* Bumped when we want every browser to wipe its old fake-seed data on
 * the next page load. Any browser without this sentinel runs the
 * one-time cleanup in ensureSeed() and then sets it. v2, second wipe
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
  } catch (err) {
    /* JSON.parse failure means the localStorage blob is corrupt. We
     * return [] so the page still renders, but log the cache key so a
     * dev can spot the corruption (typically from manual edits during
     * debugging). */
    console.error(`[pods-v2/data] read(${key}) failed:`, err);
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  /* Mirror to Supabase so pods data is durable across browsers /
   * devices / localStorage clears. Fire-and-forget, localStorage is
   * the always-correct sync cache; cloud failures don't affect
   * correctness. Dynamic import keeps the sync module out of the
   * critical bundle path for cold loads. */
  if (typeof window !== "undefined") {
    import("./sync").then(({ POD_KEY_TO_TABLE, mirrorToSupabase }) => {
      const table = POD_KEY_TO_TABLE[key];
      if (!table) return;
      mirrorToSupabase(table, value as Array<Record<string, unknown> & { id: string }>);
    });
  }
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

export function createClient(input: Omit<Client, "id"> & { id?: string }): Client {
  const client: Client = {
    ...input,
    id: input.id ?? uid(),
  };
  const all = getClients();
  all.push(client);
  write(LS_CLIENTS, all);
  return client;
}

/** Persist the editable client brief snapshot. Used by the engagement
 * portal's Brief panel. Initial values typically come from an
 * OnboardingSubmission via onboardingToBrief(); subsequent edits are
 * decoupled. */
export function updateClientBrief(
  clientId: string,
  brief: import("./types").ClientBrief,
): void {
  const all = getClients();
  const next = all.map((c) => (c.id === clientId ? { ...c, brief } : c));
  write(LS_CLIENTS, next);
}

/** Patch one of the engagement-level Must do gates. Each gate carries
 * its own checklist + notes + optional link + completed timestamp, so
 * the call sites are the modal's "save progress" and "mark complete"
 * handlers. Pass a partial, merges with the existing gate state. */
export function setClientMustDoGate(
  clientId: string,
  key: "cro_brief" | "design_handoff" | "dev_handoff" | "launch_prep",
  patch: Partial<import("./types").MustDoGate>,
): void {
  const all = getClients();
  const next = all.map((c) => {
    if (c.id !== clientId) return c;
    const prev = c.must_dos?.[key] ?? {};
    return {
      ...c,
      must_dos: { ...(c.must_dos ?? {}), [key]: { ...prev, ...patch } },
    };
  });
  write(LS_CLIENTS, next);
}

/** Append a manual win to the client (test winners are auto-derived from
 * Tasks; this is for non-test ships the pod wants to flag). */
export function addClientWin(
  clientId: string,
  win: import("./types").ClientWin,
): void {
  const all = getClients();
  const next = all.map((c) =>
    c.id === clientId ? { ...c, wins: [...(c.wins ?? []), win] } : c,
  );
  write(LS_CLIENTS, next);
}

/** Append a timestamped note to the client. created_at is stamped here
 *  so the call site doesn't need to pass it. Returns the new note so
 *  the caller can update local state without re-reading. */
export function addClientNote(
  clientId: string,
  input: { content: string; author?: string },
): import("./types").ClientNote {
  const note: import("./types").ClientNote = {
    id: uid(),
    content: input.content,
    author: input.author,
    created_at: new Date().toISOString(),
  };
  const all = getClients();
  const next = all.map((c) =>
    c.id === clientId ? { ...c, notes: [note, ...(c.notes ?? [])] } : c,
  );
  write(LS_CLIENTS, next);
  return note;
}

/** Remove a note from a client by id. Used by the delete button on
 *  each note row. No cloud-side delete needed because the notes are
 *  embedded on the Client row, the full Client gets re-upserted with
 *  the note dropped. */
export function deleteClientNote(clientId: string, noteId: string): void {
  const all = getClients();
  const next = all.map((c) =>
    c.id === clientId
      ? { ...c, notes: (c.notes ?? []).filter((n) => n.id !== noteId) }
      : c,
  );
  write(LS_CLIENTS, next);
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
      /* Title carries the page type plus the PM-supplied variant label
       * if one was captured at intake. That lets a pod looking at four
       * paired PDPs tell them apart ("Whitening Strips" vs "Floss Pro")
       * instead of seeing four identical "Design - PDP" rows. */
      const typeLabel = PAGE_LABEL[page.type];
      const variant = page.label?.trim();
      const label = variant ? `${typeLabel} · ${variant}` : typeLabel;
      if (pd) {
        pageTasks.push({
          id: designId,
          project_id: project.id,
          title: `Design - ${label}`,
          type: "core_deliverable",
          discipline: "design",
          phase: "design",
          phase_history: [{ phase: "design", enteredAt: nowIso }],
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
          title: `Build - ${label}`,
          type: "core_deliverable",
          discipline: "development",
          phase: "development",
          phase_history: [{ phase: "development", enteredAt: nowIso }],
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
   * "slipped", no re-ping if it was already slipped. Goes to the pod's
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
      }).catch((err) => console.error("[pods-v2] slip-notify failed:", err));
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

  /* Pod ↔ portal phase sync, when a core deliverable's design or dev
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
    }).catch((err) => console.error("[pods-v2] portal phase sync failed:", err));
  }
}

/** Append an entry to a Task's phase_history if the phase has actually
 * changed. Per-visit spans are intentional, a task that re-enters
 * External Design Review three times records three spans, not one
 * collapsed total. The revision-loop count is the signal. */
function withPhaseTransition(task: Task, nextPhase: Task["phase"]): Task {
  if (!nextPhase) return { ...task, phase: undefined };
  const history = task.phase_history ?? [];
  const last = history[history.length - 1];
  if (last && last.phase === nextPhase) {
    return { ...task, phase: nextPhase };
  }
  return {
    ...task,
    phase: nextPhase,
    phase_history: [
      ...history,
      { phase: nextPhase as Phase, enteredAt: new Date().toISOString() },
    ],
  };
}

export function updateTaskPhase(taskId: string, phase: Task["phase"]): void {
  const all = getTasks();
  write(LS_TASKS, all.map((t) => (t.id === taskId ? withPhaseTransition(t, phase) : t)));
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
 * Cloud is the source of truth here, local URLs that aren't in the
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
 * Match scope item by `type` (canonical PageType, "pdp", "homepage")
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
      // Already set, don't no-op churn the portal
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
 * can't see it. Per-admin browser scan is good enough, the staleness
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
    // Only tickets, core deliverables don't get stale pings (they
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
    if (t.waiting_on) return t; // paused, clock isn't running

    const created = new Date(t.created_at).getTime();
    const banked = t.paused_total_ms || 0;
    const livePauseMs = t.paused_at
      ? Math.max(0, now - new Date(t.paused_at).getTime())
      : 0;
    const effectiveAgeMs = now - created - banked - livePauseMs;
    if (effectiveAgeMs < FORTY_EIGHT_H_MS) return t;

    // Stale, fire the ping
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
      }).catch((err) => console.error("[pods-v2] stale-notify failed:", err));
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

/* ── Roster editing ─────────────────────────────────────────────
 *
 * Members are no longer hardcoded to a pod, the admin "Manage roster"
 * UI calls these to move people around, swap timezones, change roles,
 * etc. Stable member IDs (see SEED_POD_DEFINITIONS) mean `avatar_url`
 * and any `task.assigned_to` references travel with the member; the
 * legacy `business_settings.avatars` pod_name+role map is kept in sync
 * here too so older hydration paths don't end up pointing at the wrong
 * slot after a move. */

/** Move a member to a different pod. Keeps the member's role unless
 * `newRole` is provided. Re-points the legacy avatar slot so a later
 * hydrate doesn't misalign Jack ↔ Brandon. No-op if member or pod is
 * unknown, or if the move is a no-op. */
export function moveMemberToPod(
  memberId: string,
  targetPodId: string,
  newRole?: PodMemberRole,
): void {
  const pods = getPods();
  const source = pods.find((p) => p.members.some((m) => m.id === memberId));
  const target = pods.find((p) => p.id === targetPodId);
  if (!source || !target) return;
  const member = source.members.find((m) => m.id === memberId);
  if (!member) return;

  const finalRole = newRole ?? member.role;
  if (source.id === target.id && finalRole === member.role) return;

  const moved: PodMember = { ...member, pod_id: target.id, role: finalRole };
  const next = pods.map((p) => {
    if (p.id === source.id) {
      return { ...p, members: p.members.filter((m) => m.id !== memberId) };
    }
    if (p.id === target.id) {
      return { ...p, members: [...p.members.filter((m) => m.id !== memberId), moved] };
    }
    return p;
  });
  write(LS_PODS, next);

  /* Re-point the legacy avatar slot map so any pre-stable-ID hydrate
   * still resolves to the right URL. Best-effort, silent on failure. */
  if (typeof window !== "undefined" && member.avatar_url) {
    import("./team-avatars").then(({ podMemberAvatarKey, saveTeamAvatar }) => {
      saveTeamAvatar(podMemberAvatarKey(source.name, member.role), undefined);
      saveTeamAvatar(podMemberAvatarKey(target.name, finalRole), member.avatar_url);
    });
  }
}

/** Swap two members' positions (pod + role). Used by the roster UI when
 * the admin clicks two slots in sequence. Either or both members can be
 * placeholders. */
export function swapMembers(memberAId: string, memberBId: string): void {
  if (memberAId === memberBId) return;
  const pods = getPods();
  let a: PodMember | undefined;
  let b: PodMember | undefined;
  let aPod: Pod | undefined;
  let bPod: Pod | undefined;
  for (const p of pods) {
    for (const m of p.members) {
      if (m.id === memberAId) {
        a = m;
        aPod = p;
      } else if (m.id === memberBId) {
        b = m;
        bPod = p;
      }
    }
  }
  if (!a || !b || !aPod || !bPod) return;

  const aNew: PodMember = { ...a, pod_id: bPod.id, role: b.role };
  const bNew: PodMember = { ...b, pod_id: aPod.id, role: a.role };

  const next = pods.map((p) => {
    if (p.id === aPod!.id && p.id === bPod!.id) {
      return {
        ...p,
        members: p.members.map((m) =>
          m.id === a!.id ? aNew : m.id === b!.id ? bNew : m,
        ),
      };
    }
    if (p.id === aPod!.id) {
      return {
        ...p,
        members: [...p.members.filter((m) => m.id !== a!.id), bNew],
      };
    }
    if (p.id === bPod!.id) {
      return {
        ...p,
        members: [...p.members.filter((m) => m.id !== b!.id), aNew],
      };
    }
    return p;
  });
  write(LS_PODS, next);

  /* Re-point the legacy avatar slot map for both moved slots. */
  if (typeof window !== "undefined") {
    import("./team-avatars").then(({ podMemberAvatarKey, saveTeamAvatar }) => {
      saveTeamAvatar(podMemberAvatarKey(aPod!.name, a!.role), b!.avatar_url);
      saveTeamAvatar(podMemberAvatarKey(bPod!.name, b!.role), a!.avatar_url);
    });
  }
}

/** Rename a member or toggle their placeholder state. Used by the
 * roster UI when a "TO HIRE" slot is filled or someone gets renamed. */
export function updateMemberDetails(
  memberId: string,
  patch: { name?: string; is_placeholder?: boolean; role?: PodMemberRole },
): void {
  const pods = getPods();
  const next = pods.map((p) => ({
    ...p,
    members: p.members.map((m) =>
      m.id === memberId
        ? {
            ...m,
            ...(patch.name !== undefined ? { name: patch.name.trim() || m.name } : {}),
            ...(patch.is_placeholder !== undefined ? { is_placeholder: patch.is_placeholder } : {}),
            ...(patch.role !== undefined ? { role: patch.role } : {}),
          }
        : m,
    ),
  }));
  write(LS_PODS, next);
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
   * silent, the blocker is already saved locally; the channel post is
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
    }).catch((err) => console.error("[pods-v2] blocker-notify failed:", err));
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

/* Pause a ticket, the age clock stops escalating until resumed. The
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

/* Resume a paused ticket, bank the elapsed pause duration into
 * paused_total_ms so future age calcs skip it. */
export function resumeTask(taskId: string): void {
  const all = getTasks();
  const nowMs = Date.now();
  write(
    LS_TASKS,
    all.map((t) => {
      if (t.id !== taskId) return t;
      if (!t.paused_at) {
        // Was flagged waiting but not actually paused, just clear the flag
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
 * half via `paired_task_id`. Points represent the whole deliverable, * not doubled across the two halves.
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

/** Last day of the 12-week Conversion Engine cycle, Thu of M3 W4. */
export function conversionEngineDeliveryDate(kickoffYMD: string): string {
  return cycleWeekDate(kickoffYMD, 3, 4, "thu");
}

/* Seed a full 12-week Conversion Engine cycle on a project. Replaces
 * the default per-page design+build tasks createProject seeded (their
 * due dates assume a 10/15/20-day bucket, not 12 weeks). For each of
 * the 3 months, per deliverable:
 *   W1, Dan: Strategy + Wireframe (asset_prep, due Fri W1)
 *   W2, Designer pair: Design (core_deliverable, paired, due Thu W2)
 *   W3, Dev pair: Build (core_deliverable, paired, due Thu W3)
 *   W4, Designer + Dev: Test/Prep (asset_prep, due Thu W4)
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

  /* Drop the default M1 design+build tasks createProject just seeded, * their due dates assume a short bucket. The cycle seeder below
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

      // W1, Dan: Strategy + Wireframe
      if (dan) {
        newTasks.push({
          id: uid(),
          project_id: project.id,
          title: `Strategy - ${fullSuffix}`,
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
          title: `Wireframe - ${fullSuffix}`,
          type: "asset_prep",
          discipline: "strategy",
          assigned_to: dan.id,
          status: "todo",
          due_date: cycleWeekDate(project.kickoff_date, mIdx, 1, "fri"),
          created_at: nowIso,
          cycle: { month: mIdx, week: 1 },
        });
      }

      // W2, Designer: Design.  W3, Dev: Build. Paired.
      // M1 carries full points, M2/M3 carry half, variant-test
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
          title: `Design - ${fullSuffix}`,
          type: "core_deliverable",
          discipline: "design",
          phase: "design",
          phase_history: [{ phase: "design", enteredAt: nowIso }],
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
          title: `Build - ${fullSuffix}`,
          type: "core_deliverable",
          discipline: "development",
          phase: "development",
          phase_history: [{ phase: "development", enteredAt: nowIso }],
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

      // W4, Designer + Dev: Test / Prep
      if (designer) {
        newTasks.push({
          id: uid(),
          project_id: project.id,
          title: `Test/Prep - ${fullSuffix}`,
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
          title: `QA/Prep - ${fullSuffix}`,
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
    title: `Design - ${label}`,
    type: "core_deliverable",
    discipline: "design",
    assigned_to: input.designer_id,
    status: "todo",
    due_date: project ? taskDueDateFor(project, "design") : now.slice(0, 10),
    created_at: now,
    phase: "design",
    phase_history: [{ phase: "design", enteredAt: now }],
    deliverable_type: input.deliverable_type,
    points: effectivePoints,
    paired_task_id: devId,
  };
  const dev: Task = {
    id: devId,
    project_id: input.project_id,
    title: `Build - ${label}`,
    type: "core_deliverable",
    discipline: "development",
    assigned_to: input.dev_id,
    status: "todo",
    due_date: project ? taskDueDateFor(project, "development") : now.slice(0, 10),
    created_at: now,
    phase: "development",
    phase_history: [{ phase: "development", enteredAt: now }],
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

/* Park a client, strip the pod assignment without deleting anything.
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

/** Cascade-delete a client: removes the Client row, all its Projects,
 *  and all Tasks across those Projects, both from localStorage and from
 *  Supabase. Used by the engagement trash flow, which snapshots the
 *  data before calling this so it can be restored later via
 *  restoreClientCascade.
 *
 *  Each table is updated through the same `write()` helper used by
 *  every other mutation so the additive mirror still runs, then the
 *  explicit Supabase delete fires for the removed ids. Without the
 *  explicit delete the cloud copy would simply reappear on the next
 *  bootstrap pull. */
export function deleteClientCascade(clientId: string): void {
  if (typeof window === "undefined") return;
  const projects = getProjectsForClient(clientId);
  const projectIds = projects.map((p) => p.id);
  const taskIds = projects
    .flatMap((p) => getTasksForProject(p.id))
    .map((t) => t.id);

  /* Local writes first so the page reflects the change immediately. */
  localStorage.setItem(
    LS_CLIENTS,
    JSON.stringify(getClients().filter((c) => c.id !== clientId)),
  );
  localStorage.setItem(
    LS_PROJECTS,
    JSON.stringify(getProjects().filter((p) => p.client_id !== clientId)),
  );
  localStorage.setItem(
    LS_TASKS,
    JSON.stringify(getTasks().filter((t) => !projectIds.includes(t.project_id))),
  );

  /* Explicit Supabase deletes, the collection mirror is additive
   * only, so genuine removals have to fire deletes directly. */
  import("./sync").then(({ mirrorDeleteFromSupabase }) => {
    mirrorDeleteFromSupabase("pods_v2_clients", [clientId]);
    if (projectIds.length > 0) {
      mirrorDeleteFromSupabase("pods_v2_projects", projectIds);
    }
    if (taskIds.length > 0) {
      mirrorDeleteFromSupabase("pods_v2_tasks", taskIds);
    }
  });
}

/** Restore a previously trashed client: re-add the Client + Projects +
 *  Tasks back into localStorage and mirror them up to Supabase via the
 *  standard write() upsert. Idempotent, repeated calls just re-upsert
 *  the same ids. */
export function restoreClientCascade(
  client: Client,
  projects: Project[],
  tasks: Task[],
): void {
  if (typeof window === "undefined") return;
  const existingClients = getClients();
  if (!existingClients.some((c) => c.id === client.id)) {
    write(LS_CLIENTS, [...existingClients, client]);
  }
  const existingProjects = getProjects();
  const projectIds = new Set(existingProjects.map((p) => p.id));
  const newProjects = projects.filter((p) => !projectIds.has(p.id));
  if (newProjects.length > 0) {
    write(LS_PROJECTS, [...existingProjects, ...newProjects]);
  }
  const existingTasks = getTasks();
  const taskIds = new Set(existingTasks.map((t) => t.id));
  const newTasks = tasks.filter((t) => !taskIds.has(t.id));
  if (newTasks.length > 0) {
    write(LS_TASKS, [...existingTasks, ...newTasks]);
  }
}

export function deleteTask(taskId: string): void {
  const all = getTasks();
  /* Explicit Supabase delete, the collection mirror is additive only
   * (see sync.ts), so genuine removals have to call this directly to
   * propagate. localStorage is updated first as the always-correct
   * cache; Supabase delete is fire-and-forget. */
  localStorage.setItem(
    LS_TASKS,
    JSON.stringify(all.filter((t) => t.id !== taskId)),
  );
  if (typeof window !== "undefined") {
    import("./sync").then(({ mirrorDeleteFromSupabase }) => {
      mirrorDeleteFromSupabase("pods_v2_tasks", [taskId]);
    });
  }
}

export interface AddTaskInput {
  project_id: string;
  title: string;
  type: Task["type"];
  discipline?: TaskDiscipline;
  assigned_to: string;
  /** Optional override; otherwise inferred from project + discipline. */
  due_date?: string;
  /** Conversion Engine cycle position. When set, the engagement portal
   * bridge groups the task into the matching month + week. Tasks created
   * outside the CE flow (ad-hoc tickets, bugs) leave this undefined. */
  cycle?: { month: 1 | 2 | 3; week: 1 | 2 | 3 | 4 };
}

export interface AddPairedTasksInput {
  project_id: string;
  /** Common label for the deliverable. Becomes "Design, {label}" and
   * "Build, {label}" on the two paired tasks. */
  label: string;
  designer_id: string;
  dev_id: string;
  design_due_date: string;
  dev_due_date: string;
  cycle?: { month: 1 | 2 | 3; week: 1 | 2 | 3 | 4 };
  /** Optional points for capacity math. Counted once across the pair. */
  points?: number;
}

/** Create paired design + dev tasks linked via paired_task_id. Mirrors
 * the seeding pattern in createProject so engagement-portal-added build
 * deliverables behave identically to onboarding-form-spawned ones. */
export function addPairedTasks(input: AddPairedTasksInput): { designTaskId: string; devTaskId: string } {
  const designId = uid();
  const devId = uid();
  const now = new Date().toISOString();
  const design: Task = {
    id: designId,
    project_id: input.project_id,
    title: `Design - ${input.label}`,
    type: "core_deliverable",
    discipline: "design",
    assigned_to: input.designer_id,
    status: "todo",
    due_date: input.design_due_date,
    created_at: now,
    paired_task_id: devId,
    points: input.points,
    cycle: input.cycle,
  };
  const dev: Task = {
    id: devId,
    project_id: input.project_id,
    title: `Build - ${input.label}`,
    type: "core_deliverable",
    discipline: "development",
    assigned_to: input.dev_id,
    status: "todo",
    due_date: input.dev_due_date,
    created_at: now,
    paired_task_id: designId,
    points: input.points,
    cycle: input.cycle,
  };
  const all = getTasks();
  write(LS_TASKS, [...all, design, dev]);
  return { designTaskId: designId, devTaskId: devId };
}

/** Return total points loaded into a pod for a given month. Counts each
 * paired deliverable once (sums distinct paired_task_id groups). Used by
 * the engagement portal to warn on capacity overflow. */
export function podPointsForMonth(podId: string, month: 1 | 2 | 3): number {
  const podProjects = getProjectsForPod(podId).map((p) => p.id);
  const tasks = getTasks().filter(
    (t) => podProjects.includes(t.project_id) && t.cycle?.month === month,
  );
  const seen = new Set<string>();
  let total = 0;
  for (const t of tasks) {
    if (!t.points) continue;
    /* Pair dedup: skip the secondary half if we've already counted the
     * primary. Sorting by id and only counting the lexicographically
     * smaller id makes this deterministic. */
    if (t.paired_task_id) {
      const pairKey = [t.id, t.paired_task_id].sort().join("|");
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
    }
    total += t.points;
  }
  return total;
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
    cycle: input.cycle,
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

/* Stable pod + member IDs. We used to mint random UUIDs per browser
 * which made avatars and task assignments unstable across devices, and
 * forced us to key avatars by pod_name+role (which then broke the moment
 * anyone wanted to move a person to a different pod). Stable IDs let
 * `member.avatar_url` and `task.assigned_to` survive a move, and let
 * future reassignment UIs just write the new pod_id onto the member. */
const SEED_POD_DEFINITIONS: Array<{
  id: string;
  name: string;
  tagline: string;
  members: Array<{
    id: string;
    name: string;
    role: PodMemberRole;
    placeholder?: boolean;
  }>;
}> = [
  {
    id: "pod-1",
    name: "Pod 1",
    tagline: "Barnaby's pod",
    members: [
      { id: "member-barnaby", name: "Barnaby", role: "primary_designer" },
      { id: "member-victoria", name: "Victoria", role: "secondary_designer" },
      { id: "member-angel", name: "Angel", role: "primary_dev" },
      { id: "member-kaye", name: "Kaye", role: "secondary_dev" },
    ],
  },
  {
    id: "pod-2",
    name: "Pod 2",
    tagline: "Jack's pod",
    members: [
      { id: "member-jack", name: "Jack", role: "primary_designer" },
      { id: "member-anastasia", name: "Anastasia", role: "secondary_designer" },
      { id: "member-ian", name: "Ian", role: "primary_dev" },
      { id: "member-clien", name: "Clien", role: "secondary_dev" },
    ],
  },
  {
    id: "pod-3",
    name: "Pod 3",
    tagline: "Brandon's pod",
    members: [
      { id: "member-brandon", name: "Brandon", role: "primary_designer" },
      {
        id: "member-pod-3-secondary-designer",
        name: "TO HIRE",
        role: "secondary_designer",
        placeholder: true,
      },
      { id: "member-hitesh", name: "Hitesh", role: "primary_dev" },
      { id: "member-ashish", name: "Ashish", role: "secondary_dev" },
    ],
  },
];

function buildSeedPods(): Pod[] {
  return SEED_POD_DEFINITIONS.map((def) => ({
    id: def.id,
    name: def.name,
    tagline: def.tagline,
    capacity_points_per_month: 40,
    slack_channel_id: POD_DEFAULT_SLACK_CHANNELS[def.name],
    members: def.members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      pod_id: def.id,
      is_placeholder: !!m.placeholder,
    })),
  }));
}

/** Map of seed-name → stable member id, used by the one-time migration
 * to rewrite random per-browser UUIDs onto the stable ids and rewire
 * any task.assigned_to references. Keep in lockstep with
 * SEED_POD_DEFINITIONS above. */
const STABLE_MEMBER_ID_BY_NAME: Record<string, string> = {
  Barnaby: "member-barnaby",
  Victoria: "member-victoria",
  Angel: "member-angel",
  Kaye: "member-kaye",
  Jack: "member-jack",
  Anastasia: "member-anastasia",
  Ian: "member-ian",
  Clien: "member-clien",
  Brandon: "member-brandon",
  Hitesh: "member-hitesh",
  Ashish: "member-ashish",
};

const STABLE_POD_ID_BY_NAME: Record<string, string> = {
  "Pod 1": "pod-1",
  "Pod 2": "pod-2",
  "Pod 3": "pod-3",
};

/** Snap a YYYY-MM-DD forward to the next occurrence of `targetDow` (0-6). */
function snapToDay(ymd: string, targetDow: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Initialise the data store on first load.
 *
 * Pods + members are the real team structure, always seeded if
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

  // Pod team structure is always seeded if missing, independent of any
  // other sentinel, so admins always land on the real team grid.
  // Initial seed bypasses the Supabase mirror so a fresh browser doesn't
  // overwrite a populated cloud (with real avatars / OOO etc.) before
  // bootstrapPodsSync gets a chance to pull it down.
  if (!localStorage.getItem(LS_PODS)) {
    localStorage.setItem(LS_PODS, JSON.stringify(buildSeedPods()));
  } else {
    /* Back-fill default Slack channel ids onto pods that were seeded
     * before slack_channel_id existed. Only writes when missing, never
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

    /* Migration: rewrite random per-browser pod + member UUIDs onto the
     * stable ids defined in SEED_POD_DEFINITIONS. Pre-stable seeds
     * coupled avatars to pod_name+role because ids weren't durable,
     * which broke as soon as anyone wanted to reassign a member between
     * pods. After this migration:
     *   - Pod 1/2/3 have ids "pod-1" / "pod-2" / "pod-3"
     *   - Each known member has id "member-<lowercase-name>"
     *   - All `client.pod_id`, `project.pod_id`, `task.assigned_to`
     *     references are rewritten to point at the stable ids.
     *
     * Pulls Supabase-stored avatars from the legacy `business_settings`
     * map (keyed by pod_name+role) onto the migrated member rows when
     * the member doesn't already have an avatar_url. That's the recovery
     * path for photos uploaded before this migration, including Dan's,
     * so we don't lose any existing pictures. */
    const needsIdMigration = getPods().some(
      (p) =>
        !p.id.startsWith("pod-") ||
        p.members.some((m) => !m.id.startsWith("member-")),
    );
    if (needsIdMigration) {
      const podIdRewrites: Record<string, string> = {};
      const memberIdRewrites: Record<string, string> = {};
      const podsBefore = getPods();

      const migratedPods = podsBefore.map((p) => {
        const stablePodId = STABLE_POD_ID_BY_NAME[p.name] ?? p.id;
        if (stablePodId !== p.id) podIdRewrites[p.id] = stablePodId;

        const migratedMembers = p.members.map((m) => {
          const stableMemberId =
            STABLE_MEMBER_ID_BY_NAME[m.name] ??
            (m.is_placeholder
              ? `member-${stablePodId}-${m.role}`
              : m.id);
          if (stableMemberId !== m.id) memberIdRewrites[m.id] = stableMemberId;
          return { ...m, id: stableMemberId, pod_id: stablePodId };
        });

        return { ...p, id: stablePodId, members: migratedMembers };
      });
      write(LS_PODS, migratedPods);

      if (Object.keys(podIdRewrites).length > 0) {
        const clients = getClients();
        write(
          LS_CLIENTS,
          clients.map((c) =>
            podIdRewrites[c.pod_id] ? { ...c, pod_id: podIdRewrites[c.pod_id] } : c,
          ),
        );
        const projects = getProjects();
        write(
          LS_PROJECTS,
          projects.map((proj) =>
            podIdRewrites[proj.pod_id]
              ? { ...proj, pod_id: podIdRewrites[proj.pod_id] }
              : proj,
          ),
        );
      }
      if (Object.keys(memberIdRewrites).length > 0) {
        const tasks = getTasks();
        write(
          LS_TASKS,
          tasks.map((t) =>
            memberIdRewrites[t.assigned_to]
              ? { ...t, assigned_to: memberIdRewrites[t.assigned_to] }
              : t,
          ),
        );
      }

      /* Explicitly delete the now-orphaned random-UUID rows from Supabase
       * so dedupe doesn't have to guess which version wins on the next
       * bootstrap. Best-effort, silent. */
      const oldPodIds = Object.keys(podIdRewrites);
      if (oldPodIds.length > 0 && typeof window !== "undefined") {
        import("./sync").then(({ mirrorDeleteFromSupabase }) => {
          mirrorDeleteFromSupabase("pods_v2_pods", oldPodIds);
        });
      }
    }
  }

  // Seed the org-level CRO lead (Dan) on first load.
  ensureCroLeads();

  if (!localStorage.getItem(LS_SEEDED)) {
    localStorage.setItem(LS_SEEDED, "1");
  }
}

/* Org-level CRO leads, separate from pod members. Returns the current
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
  /* Skip the Supabase mirror on initial seed. If we used `write` here a
   * fresh browser would immediately upsert an avatar-less Dan into the
   * cloud and trample any avatar the cloud already has. bootstrapPodsSync
   * will hydrate Dan's real row (avatar and all) on the next mount. */
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_CRO_LEADS, JSON.stringify([dan]));
  }
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

  /* Same cloud-pin pattern as updateMemberAvatar, persists the URL so
   * Dan's photo doesn't reset when localStorage gets cleared. */
  if (touchedName && typeof window !== "undefined") {
    import("./team-avatars").then(({ croLeadAvatarKey, saveTeamAvatar }) => {
      saveTeamAvatar(croLeadAvatarKey(touchedName!), avatarUrl);
    });
  }
}

/** Wipe all client / project / task data. Pods + members are kept, * the team structure is real, only the work data is reset. */
export function resetAndReseed(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_CLIENTS);
  localStorage.removeItem(LS_PROJECTS);
  localStorage.removeItem(LS_TASKS);
  ensureSeed();
}

// ─── Clients v2: engagement-lifecycle patch (§1.9, §2.7) ──────────

/** Patch the engagement-lifecycle fields on a client. Pass only what
 * changed; undefined fields are left untouched. Used by the Clients v2
 * lifecycle editor and the CSM dashboard. */
export function updateClientLifecycle(
  clientId: string,
  patch: {
    engagement_kind?: EngagementKind;
    engagement_start?: string;
    renewal_status?: RenewalStatus;
    next_check_in?: string;
    risk_flags?: string[];
    onboarding_notes?: string[];
    strategy_thesis?: string;
    health_signals?: HealthSignals;
  },
): void {
  const all = getClients();
  const next = all.map((c) => (c.id === clientId ? { ...c, ...patch } : c));
  write(LS_CLIENTS, next);
}

// ─── Strategist: tests (§1.8, §4.1) ───────────────────────────────

export function getTests(): PodTest[] {
  return read<PodTest>(LS_STRATEGIST_TESTS);
}

export function getTestsForClient(clientId: string): PodTest[] {
  return getTests().filter((t) => t.client_id === clientId);
}

export function getTestsForPod(podId: string): PodTest[] {
  return getTests().filter((t) => t.pod_id === podId);
}

export function createTest(
  input: Omit<PodTest, "id" | "created_at" | "updated_at"> & { id?: string },
): PodTest {
  const now = new Date().toISOString();
  const test: PodTest = {
    ...input,
    id: input.id ?? uid(),
    created_at: now,
    updated_at: now,
  };
  const all = getTests();
  all.push(test);
  write(LS_STRATEGIST_TESTS, all);
  return test;
}

/** Patch a test (status, confidence, guardrails, lift, etc.). Stamps
 * updated_at. Used by the strategist's Tests-in-Flight panel. */
export function updateTest(
  testId: string,
  patch: Partial<Omit<PodTest, "id" | "created_at">>,
): void {
  const all = getTests();
  const next = all.map((t) =>
    t.id === testId ? { ...t, ...patch, updated_at: new Date().toISOString() } : t,
  );
  write(LS_STRATEGIST_TESTS, next);
}

export function deleteTest(testId: string): void {
  const all = getTests().filter((t) => t.id !== testId);
  write(LS_STRATEGIST_TESTS, all);
  if (typeof window !== "undefined") {
    import("./sync").then(({ mirrorDeleteFromSupabase }) => {
      mirrorDeleteFromSupabase("pods_v2_strategist_tests", [testId]);
    });
  }
}

// ─── Strategist: hypothesis library (§4.1) ────────────────────────

export function getHypotheses(): PodHypothesis[] {
  return read<PodHypothesis>(LS_HYPOTHESES);
}

export function createHypothesis(
  input: Omit<PodHypothesis, "id" | "created_at" | "updated_at"> & { id?: string },
): PodHypothesis {
  const now = new Date().toISOString();
  const hyp: PodHypothesis = {
    ...input,
    id: input.id ?? uid(),
    created_at: now,
    updated_at: now,
  };
  const all = getHypotheses();
  all.push(hyp);
  write(LS_HYPOTHESES, all);
  return hyp;
}

export function updateHypothesis(
  id: string,
  patch: Partial<Omit<PodHypothesis, "id" | "created_at">>,
): void {
  const all = getHypotheses();
  const next = all.map((h) =>
    h.id === id ? { ...h, ...patch, updated_at: new Date().toISOString() } : h,
  );
  write(LS_HYPOTHESES, next);
}

export function deleteHypothesis(id: string): void {
  const all = getHypotheses().filter((h) => h.id !== id);
  write(LS_HYPOTHESES, all);
  if (typeof window !== "undefined") {
    import("./sync").then(({ mirrorDeleteFromSupabase }) => {
      mirrorDeleteFromSupabase("pods_v2_hypotheses", [id]);
    });
  }
}

// ─── Slip accountability (pain point #7) ──────────────────────────

/** Record (or clear) why a deliverable slipped past its internal date.
 * Pass null to clear. Stamps slip_logged_at when set. */
export function setTaskSlipReason(
  taskId: string,
  reason: import("./types").SlipReason | null,
): void {
  const all = getTasks();
  const next = all.map((t) =>
    t.id === taskId
      ? {
          ...t,
          slip_reason: reason ?? undefined,
          slip_logged_at: reason ? new Date().toISOString() : undefined,
        }
      : t,
  );
  write(LS_TASKS, next);
}
