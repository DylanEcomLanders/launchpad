/* ── Mission Control kanban ↔ Supabase data layer ─────────────────
 *
 * Pull-on-mount, write-on-mutate. The hook in use-kanban-data.ts owns
 * the React state; this module owns the row shapes, mappers, and the
 * actual Supabase calls.
 *
 * Cloud is the source of truth. localStorage caches the last-known good
 * snapshot so first paint is instant even on cold load. On mount the hook
 * pulls cloud → state → localStorage so multi-device edits land cleanly.
 *
 * Writes are additive (upsert) by default; explicit deletes route through
 * deletePods / deleteTasks / etc. Same posture as pods-v2/sync — we got
 * burned on 2026-05-12 by a destructive collection-mirror so the kanban
 * sticks to additive + explicit-delete.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  MOCK_CLIENTS,
  MOCK_PODS,
  type MockClient,
  type MockDeliverable,
  type MockPod,
  type MockProject,
  type OnboardingBrief,
  type TrackedMetric,
} from "@/lib/projects/mock-data";
import type {
  PhaseHistoryEntry,
  PreviewPhase,
  TestResult,
} from "@/lib/projects/preview-phases";
import { isStoragePath, signScreenshotPaths } from "./storage";

// ─── Row types ──────────────────────────────────────────────────────────────

interface KanbanPodRow {
  id: string;
  name: string;
  designer: string | null;
  secondary_designer: string | null;
  developer: string | null;
  secondary_developer: string | null;
}

interface KanbanClientRow {
  id: string;
  name: string;
  onboarding_brief: OnboardingBrief | null;
}

interface KanbanProjectRow {
  id: string;
  client_id: string;
  name: string;
  type: "build" | "retainer" | null;
  turnaround_days: 15 | 20 | 25 | null;
  engagement_days: 30 | 60 | 90 | null;
  pod_id: string | null;
  start_date: string | null;
  client_approved_at: string | null;
  phase1_deadline: string | null;
  phase2_deadline: string | null;
  brief: string | null;
  figma_url: string | null;
}

interface KanbanTaskRow {
  id: string;
  project_id: string;
  title: string;
  phase: PreviewPhase;
  category: string | null;
  designer: string | null;
  secondary_designer: string | null;
  developer: string | null;
  secondary_developer: string | null;
  due_date: string | null;
  phase_history: PhaseHistoryEntry[];
  revision_requested: boolean;
  approved_at: string | null;
  completed_at: string | null;
  sent_to_client_at: string | null;
  brief: string | null;
  figma_url: string | null;
  notes: string | null;
  live_test_url: string | null;
  live_started_at: string | null;
  metrics: TrackedMetric[];
  interim_notes: string | null;
  screenshot_url: string | null;
  test_result: TestResult | null;
}

// ─── Row → Mock mappers (read path) ─────────────────────────────────────────

function podRowToMock(r: KanbanPodRow): MockPod {
  return {
    id: r.id,
    name: r.name,
    designer: r.designer ?? undefined,
    secondaryDesigner: r.secondary_designer ?? undefined,
    developer: r.developer ?? undefined,
    secondaryDeveloper: r.secondary_developer ?? undefined,
  };
}

function taskRowToMock(r: KanbanTaskRow): MockDeliverable {
  return {
    id: r.id,
    title: r.title,
    phase: r.phase,
    category: r.category ?? undefined,
    designer: r.designer ?? undefined,
    secondaryDesigner: r.secondary_designer ?? undefined,
    developer: r.developer ?? undefined,
    secondaryDeveloper: r.secondary_developer ?? undefined,
    dueDate: r.due_date ?? undefined,
    /* hoursInPhase is a runtime field (worker computed). DB doesn't store it
     * yet; default 0 so the type stays satisfied. Status decoration falls
     * back to phase_history-driven dates. */
    hoursInPhase: 0,
    phaseHistory: r.phase_history ?? [],
    revisionRequested: r.revision_requested,
    approvedAt: r.approved_at ?? undefined,
    completedAt: r.completed_at ?? undefined,
    sentToClientAt: r.sent_to_client_at ?? undefined,
    brief: r.brief ?? undefined,
    figmaUrl: r.figma_url ?? undefined,
    notes: r.notes ?? undefined,
    liveTestUrl: r.live_test_url ?? undefined,
    liveStartedAt: r.live_started_at ?? undefined,
    metrics: r.metrics ?? [],
    interimNotes: r.interim_notes ?? undefined,
    screenshot: r.screenshot_url ?? undefined,
    testResult: r.test_result ?? undefined,
  };
}

function projectRowToMock(
  r: KanbanProjectRow,
  deliverables: MockDeliverable[],
): MockProject {
  return {
    id: r.id,
    name: r.name,
    type: r.type ?? undefined,
    podId: r.pod_id ?? undefined,
    turnaroundDays: r.turnaround_days ?? undefined,
    engagementDays: r.engagement_days ?? undefined,
    startDate: r.start_date ?? undefined,
    clientApprovedAt: r.client_approved_at ?? undefined,
    phase1Deadline: r.phase1_deadline ?? undefined,
    phase2Deadline: r.phase2_deadline ?? undefined,
    brief: r.brief ?? undefined,
    figmaUrl: r.figma_url ?? undefined,
    deliverables,
  };
}

function clientRowToMock(
  r: KanbanClientRow,
  projects: MockProject[],
): MockClient {
  return {
    id: r.id,
    name: r.name,
    onboardingBrief: r.onboarding_brief ?? undefined,
    projects,
  };
}

// ─── Mock → Row mappers (write path) ────────────────────────────────────────

function mockPodToRow(p: MockPod): KanbanPodRow {
  return {
    id: p.id,
    name: p.name,
    designer: p.designer ?? null,
    secondary_designer: p.secondaryDesigner ?? null,
    developer: p.developer ?? null,
    secondary_developer: p.secondaryDeveloper ?? null,
  };
}

function mockClientToRow(c: MockClient): KanbanClientRow {
  return {
    id: c.id,
    name: c.name,
    onboarding_brief: c.onboardingBrief ?? null,
  };
}

function mockProjectToRow(clientId: string, p: MockProject): KanbanProjectRow {
  return {
    id: p.id,
    client_id: clientId,
    name: p.name,
    type: p.type ?? null,
    turnaround_days: p.turnaroundDays ?? null,
    engagement_days: p.engagementDays ?? null,
    pod_id: p.podId ?? null,
    start_date: p.startDate ?? null,
    client_approved_at: p.clientApprovedAt ?? null,
    phase1_deadline: p.phase1Deadline ?? null,
    phase2_deadline: p.phase2Deadline ?? null,
    brief: p.brief ?? null,
    figma_url: p.figmaUrl ?? null,
  };
}

/* Signed URLs are great for display but terrible to persist - they
 * expire in 24h. Convert any kanban-bucket signed URL back to its
 * path before writing so the DB only ever holds long-lived values.
 * Anything else (legacy data: fixtures, external URLs) passes
 * through unchanged. */
const BUCKET_NAME = "kanban-screenshots";
function persistScreenshotValue(v: string | undefined): string | null {
  if (!v) return null;
  /* match `.../kanban-screenshots/<path>?token=...` and strip the
   * query string + bucket prefix. */
  const idx = v.indexOf(`/${BUCKET_NAME}/`);
  if (idx >= 0) {
    const after = v.slice(idx + BUCKET_NAME.length + 2);
    const q = after.indexOf("?");
    return q >= 0 ? after.slice(0, q) : after;
  }
  return v;
}

function mockTaskToRow(projectId: string, d: MockDeliverable): KanbanTaskRow {
  /* testResult.screenshot needs the same path-extraction treatment so
   * the jsonb blob doesnt end up with an expired URL inside it. */
  const persistedTestResult: TestResult | null = d.testResult
    ? {
        ...d.testResult,
        screenshot:
          persistScreenshotValue(d.testResult.screenshot) ?? undefined,
      }
    : null;
  return {
    id: d.id,
    project_id: projectId,
    title: d.title,
    phase: d.phase,
    category: d.category ?? null,
    designer: d.designer ?? null,
    secondary_designer: d.secondaryDesigner ?? null,
    developer: d.developer ?? null,
    secondary_developer: d.secondaryDeveloper ?? null,
    due_date: d.dueDate ?? null,
    phase_history: d.phaseHistory ?? [],
    revision_requested: !!d.revisionRequested,
    approved_at: d.approvedAt ?? null,
    completed_at: d.completedAt ?? null,
    sent_to_client_at: d.sentToClientAt ?? null,
    brief: d.brief ?? null,
    figma_url: d.figmaUrl ?? null,
    notes: d.notes ?? null,
    live_test_url: d.liveTestUrl ?? null,
    live_started_at: d.liveStartedAt ?? null,
    metrics: d.metrics ?? [],
    interim_notes: d.interimNotes ?? null,
    screenshot_url: persistScreenshotValue(d.screenshot),
    test_result: persistedTestResult,
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export interface KanbanSnapshot {
  clients: MockClient[];
  pods: MockPod[];
}

export async function fetchKanban(): Promise<KanbanSnapshot | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const [
      { data: podRows, error: podErr },
      { data: clientRows, error: clientErr },
      { data: projectRows, error: projectErr },
      { data: taskRows, error: taskErr },
    ] = await Promise.all([
      supabase.from("kanban_pods").select("*"),
      supabase.from("kanban_clients").select("*"),
      supabase.from("kanban_projects").select("*"),
      supabase.from("kanban_tasks").select("*"),
    ]);
    if (podErr || clientErr || projectErr || taskErr) {
      console.error("[kanban/data] fetchKanban failed:", {
        podErr,
        clientErr,
        projectErr,
        taskErr,
      });
      return null;
    }

    const pods = (podRows ?? []).map((r) => podRowToMock(r as KanbanPodRow));

    /* Bucket tasks by project_id, then projects by client_id. Two passes
     * keeps the assembly O(n) instead of nested filters. */
    const tasksByProject = new Map<string, MockDeliverable[]>();
    for (const r of (taskRows ?? []) as KanbanTaskRow[]) {
      const arr = tasksByProject.get(r.project_id) ?? [];
      arr.push(taskRowToMock(r));
      tasksByProject.set(r.project_id, arr);
    }

    const projectsByClient = new Map<string, MockProject[]>();
    for (const r of (projectRows ?? []) as KanbanProjectRow[]) {
      const deliverables = tasksByProject.get(r.id) ?? [];
      const arr = projectsByClient.get(r.client_id) ?? [];
      arr.push(projectRowToMock(r, deliverables));
      projectsByClient.set(r.client_id, arr);
    }

    const clients = ((clientRows ?? []) as KanbanClientRow[]).map((r) =>
      clientRowToMock(r, projectsByClient.get(r.id) ?? []),
    );

    /* Sign every storage-path screenshot in one batch and swap the
     * paths for signed URLs in place. Anything already a URL (signed
     * link, external upload, legacy data: URL on the mock fixtures) is
     * passed through. */
    await rewriteScreenshotsToSignedUrls(clients);

    return { clients, pods };
  } catch (err) {
    console.error("[kanban/data] fetchKanban threw:", err);
    return null;
  }
}

/* Walk the tree, collect every screenshot path that lives in our
 * bucket, sign them all in one call, and write the signed URLs back
 * into the in-memory state. Mutates `clients` in place; the freshly
 * constructed tree is owned by the caller. */
async function rewriteScreenshotsToSignedUrls(
  clients: MockClient[],
): Promise<void> {
  const paths: string[] = [];
  for (const c of clients) {
    for (const p of c.projects) {
      for (const d of p.deliverables) {
        if (isStoragePath(d.screenshot)) paths.push(d.screenshot as string);
        if (isStoragePath(d.testResult?.screenshot)) {
          paths.push(d.testResult!.screenshot as string);
        }
      }
    }
  }
  if (paths.length === 0) return;
  const signed = await signScreenshotPaths(paths);
  for (const c of clients) {
    for (const p of c.projects) {
      for (const d of p.deliverables) {
        if (d.screenshot && signed[d.screenshot]) {
          d.screenshot = signed[d.screenshot];
        }
        if (d.testResult?.screenshot && signed[d.testResult.screenshot]) {
          d.testResult = {
            ...d.testResult,
            screenshot: signed[d.testResult.screenshot],
          };
        }
      }
    }
  }
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/* Upserts throw on failure so callers can decide whether to surface
 * the error vs swallow it. Existing fire-and-forget callers (setClients
 * in use-kanban-data) wrap these in .catch(); explicit recovery callers
 * (pushLocalKanbanToCloud) let the throw bubble up so the UI can toast
 * the real error message. */
export async function upsertPods(pods: MockPod[]): Promise<void> {
  if (!isSupabaseConfigured() || pods.length === 0) return;
  const rows = pods.map(mockPodToRow);
  const { error } = await supabase.from("kanban_pods").upsert(rows);
  if (error) {
    console.error("[kanban/data] upsertPods failed:", error);
    throw new Error(`upsertPods: ${error.message}`);
  }
}

export async function upsertClients(clients: MockClient[]): Promise<void> {
  if (!isSupabaseConfigured() || clients.length === 0) return;
  const rows = clients.map(mockClientToRow);
  const { error } = await supabase.from("kanban_clients").upsert(rows);
  if (error) {
    console.error("[kanban/data] upsertClients failed:", error);
    throw new Error(`upsertClients: ${error.message}`);
  }
}

export async function upsertProjects(
  rows: Array<{ clientId: string; project: MockProject }>,
): Promise<void> {
  if (!isSupabaseConfigured() || rows.length === 0) return;
  const dbRows = rows.map((r) => mockProjectToRow(r.clientId, r.project));
  const { error } = await supabase.from("kanban_projects").upsert(dbRows);
  if (error) {
    console.error("[kanban/data] upsertProjects failed:", error);
    throw new Error(`upsertProjects: ${error.message}`);
  }
}

export async function upsertTasks(
  rows: Array<{ projectId: string; task: MockDeliverable }>,
): Promise<void> {
  if (!isSupabaseConfigured() || rows.length === 0) return;
  const dbRows = rows.map((r) => mockTaskToRow(r.projectId, r.task));
  /* Chunk to stay under payload limits when the board fills up. */
  const CHUNK = 200;
  for (let i = 0; i < dbRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("kanban_tasks")
      .upsert(dbRows.slice(i, i + CHUNK));
    if (error) {
      console.error("[kanban/data] upsertTasks chunk failed:", error);
      throw new Error(`upsertTasks (chunk ${i}): ${error.message}`);
    }
  }
}

export async function deletePods(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  const { error } = await supabase.from("kanban_pods").delete().in("id", ids);
  if (error) console.error("[kanban/data] deletePods failed:", error);
}

export async function deleteClients(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  /* Cascade FK removes projects + tasks on the DB side. */
  const { error } = await supabase
    .from("kanban_clients")
    .delete()
    .in("id", ids);
  if (error) console.error("[kanban/data] deleteClients failed:", error);
}

export async function deleteProjects(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  const { error } = await supabase
    .from("kanban_projects")
    .delete()
    .in("id", ids);
  if (error) console.error("[kanban/data] deleteProjects failed:", error);
}

export async function deleteTasks(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  const { error } = await supabase.from("kanban_tasks").delete().in("id", ids);
  if (error) console.error("[kanban/data] deleteTasks failed:", error);
}

// ─── Seed (first-run only) ──────────────────────────────────────────────────

/* Drop MOCK_CLIENTS + MOCK_PODS into a virgin DB so the team has something
 * to look at on day one. Called by the hook when fetchKanban returns
 * everything empty. Order matters: pods, clients, projects, tasks (FK). */
export async function seedFromMockFixtures(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await upsertPods(MOCK_PODS);
  await upsertClients(MOCK_CLIENTS);
  const projectRows = MOCK_CLIENTS.flatMap((c) =>
    c.projects.map((p) => ({ clientId: c.id, project: p })),
  );
  await upsertProjects(projectRows);
  const taskRows = MOCK_CLIENTS.flatMap((c) =>
    c.projects.flatMap((p) =>
      p.deliverables.map((d) => ({ projectId: p.id, task: d })),
    ),
  );
  await upsertTasks(taskRows);
}

// ─── Diff + sync helpers (called by setClients/setPods wrapper) ─────────────

/* Compute what changed between two pod arrays and mirror the delta.
 * Pods are tiny (3 today), so a full upsert of changed rows is fine; the
 * skip-if-unchanged check spares the network. */
export async function syncPodsDiff(
  prev: MockPod[],
  next: MockPod[],
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const prevById = new Map(prev.map((p) => [p.id, p]));
  const nextById = new Map(next.map((p) => [p.id, p]));
  const changed: MockPod[] = [];
  for (const p of next) {
    const before = prevById.get(p.id);
    if (!before || JSON.stringify(before) !== JSON.stringify(p)) {
      changed.push(p);
    }
  }
  const removedIds = [...prevById.keys()].filter((id) => !nextById.has(id));
  await upsertPods(changed);
  await deletePods(removedIds);
}

/* Diff two MockClient trees and mirror everything that changed: client
 * metadata, projects, tasks. Deletions in either projects or tasks get
 * explicit delete calls (DB cascades only fire when the PARENT is
 * deleted). The diff walks ids; full-field JSON.stringify compare is OK
 * here — these arrays max out around a few hundred tasks.
 */
export async function syncClientsDiff(
  prev: MockClient[],
  next: MockClient[],
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const clientChanged: MockClient[] = [];
  const projectChanged: Array<{ clientId: string; project: MockProject }> = [];
  const taskChanged: Array<{ projectId: string; task: MockDeliverable }> = [];

  const prevClientById = new Map(prev.map((c) => [c.id, c]));
  const nextClientById = new Map(next.map((c) => [c.id, c]));

  /* For each next client, compare to prev and queue up changed rows. */
  for (const c of next) {
    const before = prevClientById.get(c.id);
    if (
      !before ||
      before.name !== c.name ||
      JSON.stringify(before.onboardingBrief ?? null) !==
        JSON.stringify(c.onboardingBrief ?? null)
    ) {
      clientChanged.push(c);
    }
    const prevProjects = new Map(
      (before?.projects ?? []).map((p) => [p.id, p]),
    );
    for (const p of c.projects) {
      const pBefore = prevProjects.get(p.id);
      if (
        !pBefore ||
        pBefore.name !== p.name ||
        pBefore.type !== p.type ||
        pBefore.podId !== p.podId ||
        pBefore.turnaroundDays !== p.turnaroundDays ||
        pBefore.engagementDays !== p.engagementDays ||
        pBefore.startDate !== p.startDate ||
        pBefore.clientApprovedAt !== p.clientApprovedAt ||
        pBefore.phase1Deadline !== p.phase1Deadline ||
        pBefore.phase2Deadline !== p.phase2Deadline ||
        pBefore.brief !== p.brief ||
        pBefore.figmaUrl !== p.figmaUrl
      ) {
        projectChanged.push({ clientId: c.id, project: p });
      }
      const prevTasks = new Map(
        (pBefore?.deliverables ?? []).map((d) => [d.id, d]),
      );
      for (const d of p.deliverables) {
        const dBefore = prevTasks.get(d.id);
        if (!dBefore || JSON.stringify(dBefore) !== JSON.stringify(d)) {
          taskChanged.push({ projectId: p.id, task: d });
        }
      }
    }
  }

  /* Deletions: any id in prev that's not in next. Walk client → project →
   * task so we delete tasks first (FK), then projects, then clients. */
  const removedTaskIds: string[] = [];
  const removedProjectIds: string[] = [];
  const removedClientIds: string[] = [];

  for (const c of prev) {
    const cAfter = nextClientById.get(c.id);
    if (!cAfter) {
      removedClientIds.push(c.id);
      /* Cascade will drop the projects/tasks; no need to enumerate them. */
      continue;
    }
    const nextProjects = new Map(cAfter.projects.map((p) => [p.id, p]));
    for (const p of c.projects) {
      const pAfter = nextProjects.get(p.id);
      if (!pAfter) {
        removedProjectIds.push(p.id);
        continue;
      }
      const nextTasks = new Map(pAfter.deliverables.map((d) => [d.id, d]));
      for (const d of p.deliverables) {
        if (!nextTasks.has(d.id)) removedTaskIds.push(d.id);
      }
    }
  }

  /* Order: upsert parents before children, delete children before parents.
   * Run sequentially so a transient failure on one tier doesn't leave
   * orphaned children downstream. */
  await upsertClients(clientChanged);
  await upsertProjects(projectChanged);
  await upsertTasks(taskChanged);
  await deleteTasks(removedTaskIds);
  await deleteProjects(removedProjectIds);
  await deleteClients(removedClientIds);
}
