"use client";

/* ── useKanbanData ─────────────────────────────────────────────────
 *
 * The state hook for /kanban. Plays the same role as useWorkspaceData
 * for /workspace: localStorage-cached, Supabase-mirrored, drop-in for
 * useState<MockClient[]>.
 *
 * On mount:
 *   1. Render from localStorage immediately (instant first paint)
 *   2. Fetch from Supabase
 *   3. If the cloud DB is empty, seed it with MOCK_CLIENTS + MOCK_PODS
 *   4. Overlay cloud state into React + localStorage
 *
 * On mutation:
 *   - setClients / setPods update React state synchronously
 *   - localStorage is updated in the same tick (so a refresh sees the
 *     change even if the cloud round-trip hasn't returned yet)
 *   - The cloud diff fires in the background, errors logged only
 */

import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  MOCK_CLIENTS,
  MOCK_PODS,
  type MockClient,
  type MockPod,
} from "@/lib/projects/mock-data";
import {
  fetchKanban,
  seedFromMockFixtures,
  syncClientsDiff,
  syncPodsDiff,
} from "./data";

/* Merge local cache into remote fetch. Anything in local that the
 * remote is missing is a PENDING WRITE that didn't sync yet (user
 * added → navigated away before the fire-and-forget syncClientsDiff
 * completed). Bug: previously remote blindly overwrote local, which
 * dropped pending writes on every mount.
 *
 * Strategy:
 *   - Start from remote (multi-device truth)
 *   - For each client/project/task in local that's NOT in remote,
 *     re-add it - it's a pending local write
 *   - Return the merged set + the deltas so we can re-fire a sync
 *     for the missing rows
 */
function mergeLocalIntoRemote(
  remoteClients: MockClient[],
  localClients: MockClient[],
): { merged: MockClient[]; hadPending: boolean } {
  if (localClients.length === 0) return { merged: remoteClients, hadPending: false };
  const remoteById = new Map(remoteClients.map((c) => [c.id, c]));
  let hadPending = false;
  /* Start from remote so multi-device updates always come through. */
  const merged: MockClient[] = remoteClients.map((c) => ({ ...c, projects: c.projects.map((p) => ({ ...p, deliverables: [...p.deliverables] })) }));
  const mergedById = new Map(merged.map((c) => [c.id, c]));

  for (const localClient of localClients) {
    const remoteClient = remoteById.get(localClient.id);
    if (!remoteClient) {
      /* Client missing from remote entirely - pending insert. */
      merged.push({
        ...localClient,
        projects: localClient.projects.map((p) => ({ ...p, deliverables: [...p.deliverables] })),
      });
      hadPending = true;
      continue;
    }
    /* Client exists remotely. Walk its projects + tasks for pending children. */
    const target = mergedById.get(localClient.id)!;
    const remoteProjectIds = new Set(remoteClient.projects.map((p) => p.id));
    for (const localProject of localClient.projects) {
      if (!remoteProjectIds.has(localProject.id)) {
        target.projects.push({ ...localProject, deliverables: [...localProject.deliverables] });
        hadPending = true;
        continue;
      }
      const remoteProject = remoteClient.projects.find((p) => p.id === localProject.id)!;
      const remoteTaskIds = new Set(remoteProject.deliverables.map((d) => d.id));
      const targetProject = target.projects.find((p) => p.id === localProject.id)!;
      for (const localTask of localProject.deliverables) {
        if (!remoteTaskIds.has(localTask.id)) {
          targetProject.deliverables.push(localTask);
          hadPending = true;
        }
      }
    }
  }
  return { merged, hadPending };
}

function mergeLocalPods(remote: MockPod[], local: MockPod[]): { merged: MockPod[]; hadPending: boolean } {
  if (local.length === 0) return { merged: remote, hadPending: false };
  const remoteIds = new Set(remote.map((p) => p.id));
  const pending = local.filter((p) => !remoteIds.has(p.id));
  if (pending.length === 0) return { merged: remote, hadPending: false };
  return { merged: [...remote, ...pending], hadPending: true };
}

const LS_CLIENTS_KEY = "launchpad-kanban-clients";
const LS_PODS_KEY = "launchpad-kanban-pods";

function lsRead<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.error(`[kanban] lsRead(${key}) failed:`, err);
    return null;
  }
}

function lsWrite<T>(key: string, val: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`[kanban] lsWrite(${key}) failed:`, err);
  }
}

/* Deep clone via JSON round-trip so callers can freely mutate the
 * returned tree without affecting the cache. The kanban page does the
 * same on its current useState initializer; we preserve that contract. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface UseKanbanData {
  clients: MockClient[];
  setClients: React.Dispatch<React.SetStateAction<MockClient[]>>;
  pods: MockPod[];
  setPods: React.Dispatch<React.SetStateAction<MockPod[]>>;
  loading: boolean;
  source: "mock" | "localStorage" | "supabase";
}

export function useKanbanData(): UseKanbanData {
  /* Render mock fixtures on the FIRST render to keep SSR + hydration
   * stable (no window access). The localStorage overlay runs in the
   * post-mount effect below, then the Supabase pull replaces both. */
  const [clients, setClientsRaw] = useState<MockClient[]>(() => clone(MOCK_CLIENTS));
  const [pods, setPodsRaw] = useState<MockPod[]>(() => clone(MOCK_PODS));
  const [loading, setLoading] = useState<boolean>(true);
  const [source, setSource] = useState<"mock" | "localStorage" | "supabase">(
    "mock",
  );

  /* Hold the latest state in refs so the diff helpers always compare
   * against what was actually committed last, not a stale closure. */
  const clientsRef = useRef(clients);
  const podsRef = useRef(pods);
  clientsRef.current = clients;
  podsRef.current = pods;

  useEffect(() => {
    let cancelled = false;

    /* 1. localStorage overlay (instant paint while Supabase fetches).
     * Only trust the cache when it has actual content - an empty
     * array left over from a failed Supabase write would otherwise
     * paint a blank board and mask the cloud data. */
    const cachedClients = lsRead<MockClient[]>(LS_CLIENTS_KEY);
    const cachedPods = lsRead<MockPod[]>(LS_PODS_KEY);
    if (cachedClients && cachedClients.length > 0) setClientsRaw(cachedClients);
    if (cachedPods && cachedPods.length > 0) setPodsRaw(cachedPods);
    if (
      (cachedClients && cachedClients.length > 0) ||
      (cachedPods && cachedPods.length > 0)
    ) {
      setSource("localStorage");
    }

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    /* 2. Supabase pull → seed if empty → MERGE with localStorage (preserves
     * any pending writes that fire-and-forget syncs hadn't completed yet) →
     * state. Critical: never blindly overwrite local with remote, otherwise
     * a fast add-client-then-navigate sequence loses the new client. */
    (async () => {
      try {
        let remote = await fetchKanban();
        if (cancelled) return;
        if (remote && remote.clients.length === 0 && remote.pods.length === 0) {
          await seedFromMockFixtures();
          if (cancelled) return;
          remote = await fetchKanban();
        }
        if (cancelled) return;
        if (remote) {
          /* Merge local additions that hadn't synced yet. */
          const localCachedClients = lsRead<MockClient[]>(LS_CLIENTS_KEY) ?? [];
          const localCachedPods = lsRead<MockPod[]>(LS_PODS_KEY) ?? [];
          const { merged: mergedClients, hadPending: pendingClients } =
            mergeLocalIntoRemote(remote.clients, localCachedClients);
          const { merged: mergedPods, hadPending: pendingPods } =
            mergeLocalPods(remote.pods, localCachedPods);

          setClientsRaw(mergedClients);
          setPodsRaw(mergedPods);
          lsWrite(LS_CLIENTS_KEY, mergedClients);
          lsWrite(LS_PODS_KEY, mergedPods);
          setSource("supabase");

          /* If we found pending local writes that remote didn't have,
           * re-fire the diff so they actually land in Supabase this time
           * (the original fire-and-forget sync likely got dropped when
           * the page unmounted). */
          if (pendingClients) {
            console.warn("[kanban] re-syncing pending local clients/projects/tasks that remote was missing");
            syncClientsDiff(remote.clients, mergedClients).catch((err) =>
              console.error("[kanban] pending re-sync (clients) failed:", err),
            );
          }
          if (pendingPods) {
            console.warn("[kanban] re-syncing pending local pods that remote was missing");
            syncPodsDiff(remote.pods, mergedPods).catch((err) =>
              console.error("[kanban] pending re-sync (pods) failed:", err),
            );
          }
        }
      } catch (err) {
        console.error("[kanban] initial load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* setClients wrapper - updates state + localStorage + fires cloud diff. */
  const setClients: React.Dispatch<React.SetStateAction<MockClient[]>> = (
    updater,
  ) => {
    setClientsRaw((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (p: MockClient[]) => MockClient[])(prev)
          : updater;
      lsWrite(LS_CLIENTS_KEY, next);
      /* Fire-and-forget; surface errors to console so we catch drift. */
      syncClientsDiff(prev, next).catch((err) =>
        console.error("[kanban] syncClientsDiff failed:", err),
      );
      return next;
    });
  };

  const setPods: React.Dispatch<React.SetStateAction<MockPod[]>> = (updater) => {
    setPodsRaw((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (p: MockPod[]) => MockPod[])(prev)
          : updater;
      lsWrite(LS_PODS_KEY, next);
      syncPodsDiff(prev, next).catch((err) =>
        console.error("[kanban] syncPodsDiff failed:", err),
      );
      return next;
    });
  };

  return { clients, setClients, pods, setPods, loading, source };
}
