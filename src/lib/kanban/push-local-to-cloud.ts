/* ── Push local kanban data to Supabase ──
 *
 * One-shot recovery: reads the user's localStorage kanban cache,
 * diffs against what's in Supabase right now, and upserts the
 * delta. Use when the silent fire-and-forget sync has dropped
 * writes (which it has, for everyone, since 21 June 2026).
 *
 * Safe to run multiple times: upserts are idempotent (by id). Two
 * users running this back-to-back is fine; the later call just
 * upserts the same rows it already wrote.
 *
 * Returns a summary so the UI can toast what landed.
 */

import {
  fetchKanban,
  upsertPods,
  upsertClients,
  upsertProjects,
  upsertTasks,
} from "./data";
import type { MockClient, MockPod } from "@/lib/projects/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase";

const LS_CLIENTS_KEY = "launchpad-kanban-clients";
const LS_PODS_KEY = "launchpad-kanban-pods";

function lsRead<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export interface PushSummary {
  ok: boolean;
  pushed: {
    pods: number;
    clients: number;
    projects: number;
    tasks: number;
  };
  alreadyInCloud: {
    pods: number;
    clients: number;
    projects: number;
    tasks: number;
  };
  error?: string;
}

export async function pushLocalKanbanToCloud(): Promise<PushSummary> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      pushed: { pods: 0, clients: 0, projects: 0, tasks: 0 },
      alreadyInCloud: { pods: 0, clients: 0, projects: 0, tasks: 0 },
      error: "Supabase is not configured.",
    };
  }

  const localClients = lsRead<MockClient[]>(LS_CLIENTS_KEY) ?? [];
  const localPods = lsRead<MockPod[]>(LS_PODS_KEY) ?? [];

  if (localClients.length === 0 && localPods.length === 0) {
    return {
      ok: true,
      pushed: { pods: 0, clients: 0, projects: 0, tasks: 0 },
      alreadyInCloud: { pods: 0, clients: 0, projects: 0, tasks: 0 },
    };
  }

  /* Fetch the canonical cloud snapshot so the summary can report
   * "x already there" vs "y newly pushed". */
  const remote = await fetchKanban();
  if (!remote) {
    return {
      ok: false,
      pushed: { pods: 0, clients: 0, projects: 0, tasks: 0 },
      alreadyInCloud: { pods: 0, clients: 0, projects: 0, tasks: 0 },
      error: "Couldn't fetch the current cloud state — try again in a moment.",
    };
  }

  const remotePodIds = new Set(remote.pods.map((p) => p.id));
  const remoteClientIds = new Set(remote.clients.map((c) => c.id));
  const remoteProjectIds = new Set(
    remote.clients.flatMap((c) => c.projects.map((p) => p.id)),
  );
  const remoteTaskIds = new Set(
    remote.clients.flatMap((c) =>
      c.projects.flatMap((p) => p.deliverables.map((d) => d.id)),
    ),
  );

  /* Filter to ONLY local-only rows. Upsert is idempotent so we could
   * push everything safely, but reporting "5 newly pushed" beats
   * "23 upserted (some already there)" for clarity. */
  const podsToPush = localPods.filter((p) => !remotePodIds.has(p.id));
  const clientsToPush = localClients.filter((c) => !remoteClientIds.has(c.id));
  const projectsToPush: Array<{ clientId: string; project: MockClient["projects"][number] }> = [];
  const tasksToPush: Array<{ projectId: string; task: MockClient["projects"][number]["deliverables"][number] }> = [];

  for (const client of localClients) {
    for (const project of client.projects) {
      const isNewProject = !remoteProjectIds.has(project.id);
      if (isNewProject) {
        projectsToPush.push({ clientId: client.id, project });
      }
      /* Even if the project is already in remote, individual TASKS
       * inside it might be missing - the original sync may have
       * partially failed. Push the missing children too. */
      for (const task of project.deliverables) {
        if (!remoteTaskIds.has(task.id)) {
          tasksToPush.push({ projectId: project.id, task });
        }
      }
    }
  }

  /* Push order: pods first (no FKs), then clients, then projects
   * (FK → clients + pods), then tasks (FK → projects). Sequential
   * awaits so we don't blast through if the user's network is
   * patchy. */
  try {
    if (podsToPush.length > 0) await upsertPods(podsToPush);
    if (clientsToPush.length > 0) await upsertClients(clientsToPush);
    if (projectsToPush.length > 0) await upsertProjects(projectsToPush);
    if (tasksToPush.length > 0) await upsertTasks(tasksToPush);
  } catch (err) {
    return {
      ok: false,
      pushed: { pods: 0, clients: 0, projects: 0, tasks: 0 },
      alreadyInCloud: {
        pods: remote.pods.length,
        clients: remote.clients.length,
        projects: remoteProjectIds.size,
        tasks: remoteTaskIds.size,
      },
      error: err instanceof Error ? err.message : "Push failed.",
    };
  }

  return {
    ok: true,
    pushed: {
      pods: podsToPush.length,
      clients: clientsToPush.length,
      projects: projectsToPush.length,
      tasks: tasksToPush.length,
    },
    alreadyInCloud: {
      pods: remote.pods.length,
      clients: remote.clients.length,
      projects: remoteProjectIds.size,
      tasks: remoteTaskIds.size,
    },
  };
}
