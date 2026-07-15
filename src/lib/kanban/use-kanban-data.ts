"use client";

/* ── useKanbanData ─────────────────────────────────────────────────
 *
 * The state hook for /kanban. Supabase is the only source of truth -
 * no localStorage caching (was a source of multi-device divergence:
 * PM added cards, Dylan couldn't see them because both browsers had
 * their own private cache).
 *
 * On mount:
 *   1. Show a loading skeleton (no stale-cache flash)
 *   2. Fetch from Supabase
 *   3. Seed the tables if empty (first-run convenience)
 *   4. Subscribe to Realtime on every kanban_* table - any insert/
 *      update/delete from another browser triggers a debounced
 *      refetch so changes appear live without a page refresh
 *
 * On mutation:
 *   - setClients / setPods update React state synchronously (snappy
 *     local feedback)
 *   - The mutation also fires syncClientsDiff / syncPodsDiff against
 *     Supabase. Errors throw - the caller can surface them.
 *
 * Pods-v2 bridge: the kanban project picker still shows BOTH legacy
 * MockPods AND pods-v2 pods (defined canonically in /company/pods)
 * so admin can assign either. The pods-v2 entries are derived at
 * fetch time + never written back to kanban_pods.
 */

import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  MOCK_CLIENTS,
  MOCK_PODS,
  type Cycle,
  type MockClient,
  type MockPod,
} from "@/lib/projects/mock-data";
import {
  fetchCycles,
  fetchKanban,
  fetchKanbanActivity,
  logKanbanActivity,
  seedFromMockFixtures,
  syncClientsDiff,
  syncCyclesDiff,
  syncPodsDiff,
  type KanbanActivity,
} from "./data";
import { getPods as getPodsV2 } from "@/lib/pods-v2/data";
import type { Pod as PodV2 } from "@/lib/pods-v2/types";

/* Bridge: pods-v2 (canonical) → MockPod (legacy kanban shape).
 * The kanban only READS pods (for the picker + autopair on
 * deliverable add); never writes them. Safe to merge in at fetch
 * time without round-tripping to the kanban_pods table.
 *
 * Member-role mapping: pods-v2 PodMember.role enums map onto
 * MockPod's flat name fields. Stamps come from PodMember.name
 * (already populated from the linked Person at fetch time, so
 * renames in /company/people propagate everywhere). */
function convertPodV2ToMock(podV2: PodV2): MockPod {
  const find = (role: string) =>
    podV2.members.find((m) => m.role === role && m.person_id)?.name;
  return {
    id: podV2.id,
    name: podV2.name,
    designer: find("primary_designer"),
    secondaryDesigner: find("secondary_designer"),
    developer: find("primary_dev"),
    secondaryDeveloper: find("secondary_dev"),
  };
}

/* Deep clone via JSON round-trip so callers can freely mutate the
 * returned tree without affecting the cache. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface UseKanbanData {
  clients: MockClient[];
  setClients: React.Dispatch<React.SetStateAction<MockClient[]>>;
  pods: MockPod[];
  setPods: React.Dispatch<React.SetStateAction<MockPod[]>>;
  /* Token-meter pool periods. One per active retainer project per month.
   * Empty in mock mode + until migration 053 lands - the meter renders from
   * whatever is here, and cycles are find-or-created on project open. */
  cycles: Cycle[];
  setCycles: React.Dispatch<React.SetStateAction<Cycle[]>>;
  loading: boolean;
  source: "mock" | "supabase";
  /* Activity feed, newest first. */
  activity: KanbanActivity[];
  /* Append an activity entry. Stamps id + timestamp, prepends optimistically,
   * and fires the cloud insert (fire-and-forget). Caller supplies actor. */
  logActivity: (entry: Omit<KanbanActivity, "id" | "createdAt">) => void;
}

export function useKanbanData(): UseKanbanData {
  /* Initial state: empty arrays + loading=true. Mock fixtures are
   * only used as a fallback if Supabase isn't configured at all. */
  const [clients, setClientsRaw] = useState<MockClient[]>([]);
  const [pods, setPodsRaw] = useState<MockPod[]>([]);
  const [cycles, setCyclesRaw] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [source, setSource] = useState<"mock" | "supabase">("supabase");
  const [activity, setActivity] = useState<KanbanActivity[]>([]);

  /* Hold the latest state in refs so the diff helpers always compare
   * against what was actually committed last, not a stale closure. */
  const clientsRef = useRef(clients);
  const podsRef = useRef(pods);
  const cyclesRef = useRef(cycles);
  clientsRef.current = clients;
  podsRef.current = pods;
  cyclesRef.current = cycles;

  /* Debounce timer for Realtime refetches. A batch of inserts from
   * the same browser shouldn't trigger N refetches. */
  const refetchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFromCloud() {
      if (!isSupabaseConfigured()) {
        /* No Supabase = dev fallback. Use the mock fixtures so the UI
         * has something to render. Mutations stay in memory. */
        setClientsRaw(clone(MOCK_CLIENTS));
        setPodsRaw(clone(MOCK_PODS));
        setCyclesRaw([]);
        setSource("mock");
        setLoading(false);
        return;
      }

      try {
        let remote = await fetchKanban();
        if (cancelled) return;
        /* Seed if the kanban tables are completely empty (first run). */
        if (remote && remote.clients.length === 0 && remote.pods.length === 0) {
          await seedFromMockFixtures();
          if (cancelled) return;
          remote = await fetchKanban();
        }
        if (cancelled) return;
        if (remote) {
          /* Pod resolution: pods-v2 is the canonical source for any
           * pod whose ID exists there (admin edits in /company/pods
           * write to pods-v2). Legacy kanban_pods only fills the
           * gap for pods that exist ONLY in the old table.
           *
           * Was the other way round - kanban_pods won and pods-v2
           * was only used for missing IDs. Result: admin updates to
           * a pod's roster in /company/pods didn't surface on the
           * kanban because the stale kanban_pods row shadowed them. */
          const podV2Mocks = getPodsV2().map(convertPodV2ToMock);
          const v2Ids = new Set(podV2Mocks.map((p) => p.id));
          const legacyOnly = remote.pods.filter((p) => !v2Ids.has(p.id));
          setClientsRaw(remote.clients);
          setPodsRaw([...podV2Mocks, ...legacyOnly]);
          setSource("supabase");
          const acts = await fetchKanbanActivity();
          if (!cancelled) setActivity(acts);
          /* Cycles are fetched separately + resiliently (returns [] if the
           * table is missing) so a pending migration 053 never blocks the
           * board load. */
          const cyc = await fetchCycles();
          if (!cancelled) setCyclesRaw(cyc);
        }
      } catch (err) {
        console.error("[kanban] load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function scheduleRefetch() {
      if (refetchTimerRef.current) window.clearTimeout(refetchTimerRef.current);
      refetchTimerRef.current = window.setTimeout(() => {
        if (!cancelled) loadFromCloud();
      }, 350);
    }

    loadFromCloud();

    /* Realtime subscription. When any kanban_* table changes (anyone,
     * anywhere) → debounced refetch. Cross-device updates appear
     * within ~500ms without a page refresh.
     *
     * Requires Realtime to be enabled on the project + on each table
     * (Supabase dashboard → Database → Replication). */
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel("kanban-realtime")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("postgres_changes" as any, { event: "*", schema: "public", table: "kanban_clients" }, scheduleRefetch)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("postgres_changes" as any, { event: "*", schema: "public", table: "kanban_projects" }, scheduleRefetch)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("postgres_changes" as any, { event: "*", schema: "public", table: "kanban_tasks" }, scheduleRefetch)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("postgres_changes" as any, { event: "*", schema: "public", table: "kanban_pods" }, scheduleRefetch)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("postgres_changes" as any, { event: "*", schema: "public", table: "kanban_activity" }, scheduleRefetch)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("postgres_changes" as any, { event: "*", schema: "public", table: "cycles" }, scheduleRefetch)
        .subscribe();
    }

    return () => {
      cancelled = true;
      if (refetchTimerRef.current) window.clearTimeout(refetchTimerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /* setClients wrapper - updates state + fires cloud diff. Errors
   * are thrown by the underlying upsert functions; we surface them
   * via console + the kanban page's own error toast (added in PR
   * #25). Realtime will broadcast the change back to other browsers. */
  const setClients: React.Dispatch<React.SetStateAction<MockClient[]>> = (
    updater,
  ) => {
    setClientsRaw((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (p: MockClient[]) => MockClient[])(prev)
          : updater;
      syncClientsDiff(prev, next).catch((err) => {
        console.error("[kanban] syncClientsDiff failed:", err);
        /* Surface a visible toast so writes-vanishing-silently never
         * happens again. The kanban page mounts a global error
         * listener for kanban-sync-error events. */
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("kanban-sync-error", {
              detail: { message: err instanceof Error ? err.message : String(err) },
            }),
          );
        }
      });
      return next;
    });
  };

  const setPods: React.Dispatch<React.SetStateAction<MockPod[]>> = (updater) => {
    setPodsRaw((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (p: MockPod[]) => MockPod[])(prev)
          : updater;
      syncPodsDiff(prev, next).catch((err) => {
        console.error("[kanban] syncPodsDiff failed:", err);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("kanban-sync-error", {
              detail: { message: err instanceof Error ? err.message : String(err) },
            }),
          );
        }
      });
      return next;
    });
  };

  /* setCycles wrapper - updates state + fires the cloud diff, same posture as
   * setClients/setPods. Errors surface via the shared kanban-sync-error toast
   * (e.g. "Could not find the 'cycles' table" until migration 053 is applied)
   * but never block the optimistic local update. */
  const setCycles: React.Dispatch<React.SetStateAction<Cycle[]>> = (
    updater,
  ) => {
    setCyclesRaw((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (p: Cycle[]) => Cycle[])(prev)
          : updater;
      syncCyclesDiff(prev, next).catch((err) => {
        console.error("[kanban] syncCyclesDiff failed:", err);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("kanban-sync-error", {
              detail: {
                message: err instanceof Error ? err.message : String(err),
              },
            }),
          );
        }
      });
      return next;
    });
  };

  /* Append an activity entry: stamp id + wall-clock time, prepend locally
   * for instant feedback, then fire the cloud insert. Realtime echoes the
   * insert back to other browsers. Uses real Date (not the board's
   * MOCK_TODAY) so "x minutes ago" is honest. */
  const logActivity = (entry: Omit<KanbanActivity, "id" | "createdAt">) => {
    const full: KanbanActivity = {
      ...entry,
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setActivity((prev) => [full, ...prev].slice(0, 200));
    logKanbanActivity(full).catch((err) =>
      console.error("[kanban] logActivity failed:", err),
    );
  };

  return { clients, setClients, pods, setPods, cycles, setCycles, loading, source, activity, logActivity };
}
