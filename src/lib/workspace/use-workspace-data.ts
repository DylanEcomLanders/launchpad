"use client";

// ─── Workspace data hook ────────────────────────────────────────────
// Single client-side bootstrap for the new Workspace module. Reuses the
// battle-tested pods-v2 + strategy data layer wholesale (Supabase pull →
// localStorage cache → synchronous getters). No new tables, no new sync.

import { useEffect, useState } from "react";
import {
  getPods,
  getClients,
  getProjects,
  getTasks,
  getTests,
  getHypotheses,
  ensureSeed,
  hydrateTeamAvatarsFromCloud,
} from "@/lib/pods-v2/data";
import { bootstrapPodsSync } from "@/lib/pods-v2/sync";
import type {
  Pod,
  Client,
  Project,
  Task,
  PodTest,
  PodHypothesis,
} from "@/lib/pods-v2/types";

export interface WorkspaceData {
  pods: Pod[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  tests: PodTest[];
  hypotheses: PodHypothesis[];
  loading: boolean;
}

const EMPTY: WorkspaceData = {
  pods: [],
  clients: [],
  projects: [],
  tasks: [],
  tests: [],
  hypotheses: [],
  loading: true,
};

/** Bootstrap and read everything the workspace renders off. The whole
 * module is read-mostly, so a single load on mount is enough; mutations
 * (when added) can call `reload()`. */
export function useWorkspaceData(): WorkspaceData & { reload: () => void } {
  const [state, setState] = useState<WorkspaceData>(EMPTY);

  /* Snapshot the synchronous localStorage view. Every mutation in the
   * pods-v2 data layer writes to localStorage immediately (and mirrors to
   * Supabase fire-and-forget), so reading back from localStorage right
   * after a write always reflects the change. */
  function snapshot(): WorkspaceData {
    return {
      pods: getPods(),
      clients: getClients(),
      projects: getProjects(),
      tasks: getTasks(),
      tests: getTests(),
      hypotheses: getHypotheses(),
      loading: false,
    };
  }

  // Cloud bootstrap runs ONCE on mount. We must NOT re-run it on every
  // reload(): bootstrapPodsSync re-pulls from Supabase and could overwrite a
  // just-written local mutation before its fire-and-forget mirror lands (a
  // read-after-write race that silently reverted edits). reload() therefore
  // only re-snapshots localStorage, which already holds the change.
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      await bootstrapPodsSync();
      ensureSeed();
      hydrateTeamAvatarsFromCloud();
      if (cancelled) return;
      setState(snapshot());
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, reload: () => setState(snapshot()) };
}

/** Today as YYYY-MM-DD in local time, matching the format every date in
 * the pods-v2 model uses. */
export function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
