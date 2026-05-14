/* Engagement trash store · soft-delete for client engagements.
 *
 * Engagements come from three sources today:
 *   1. pods-v2 Client + Projects + Tasks (the real ops data)
 *   2. localStorage-only MockEngagement (one-off projects created via
 *      /engagements/new before they were wired through pods)
 *   3. Static MOCK_ENGAGEMENTS constants (reference examples)
 *
 * Hard-deleting any of those is destructive and confusing if the user
 * removes the wrong client. So this module implements a soft-delete:
 *
 *   trashEngagement(id, snapshot, source, payload)
 *     - persists a TrashEntry with everything needed to restore
 *     - physically removes the underlying source data so the engagement
 *       disappears from /engagements and the pod board
 *
 *   restoreEngagement(id)
 *     - reverses the above: writes Client/Projects/Tasks (or local eng)
 *       back into their stores and removes the trash entry
 *
 *   permanentlyDeleteEngagement(id)
 *     - removes the trash entry with no chance to recover
 *
 * The trash store is mirrored to Supabase using the same key pattern as
 * pods-v2 so trash survives device wipes and is consistent across
 * browsers. localStorage is the always-correct cache, cloud sync is
 * best-effort.
 */

"use client";

import type { MockEngagement } from "./engagement-mocks";
import {
  deleteClientCascade,
  getClientById,
  getProjectsForClient,
  getTasksForProject,
  restoreClientCascade,
} from "./pods-v2/data";
import type { Client, Project, Task } from "./pods-v2/types";

const LS_KEY = "launchpad-engagements-trash";
const LS_LOCAL_ENG = "launchpad-engagements-local";

export type TrashSource = "pods" | "local" | "mock";

export interface TrashEntry {
  id: string;
  source: TrashSource;
  trashedAt: string; // ISO
  snapshot: MockEngagement; // for trash-list display
  payload: {
    client?: Client;
    projects?: Project[];
    tasks?: Task[];
    localEng?: MockEngagement;
  };
}

/* ── Read helpers ────────────────────────────────────────────────── */

export function getTrashEntries(): TrashEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrashEntry[]) : [];
  } catch (err) {
    console.error("[engagement-trash] read failed:", err);
    return [];
  }
}

export function getTrashedIds(): Set<string> {
  return new Set(getTrashEntries().map((e) => e.id));
}

function writeTrash(entries: TrashEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(entries));
  /* Mirror to Supabase, same shape as pods-v2 sync. Best-effort, local
   * cache is always correct. */
  mirrorTrashToCloud(entries);
}

/* ── Cloud mirror ────────────────────────────────────────────────── */

const SUPABASE_TABLE = "engagements_trash";

async function mirrorTrashToCloud(entries: TrashEntry[]): Promise<void> {
  try {
    const { supabase, isSupabaseConfigured } = await import("./supabase");
    if (!isSupabaseConfigured()) return;
    /* Pull current cloud ids, delete the diff so a restored entry
     * disappears from the cloud trash too. */
    const { data } = await supabase.from(SUPABASE_TABLE).select("id");
    const cloudIds = new Set((data || []).map((r: { id: string }) => r.id));
    const localIds = new Set(entries.map((e) => e.id));
    const toDelete = [...cloudIds].filter((id) => !localIds.has(id));
    if (toDelete.length > 0) {
      await supabase.from(SUPABASE_TABLE).delete().in("id", toDelete);
    }
    if (entries.length === 0) return;
    const rows = entries.map((e) => ({
      id: e.id,
      data: {
        source: e.source,
        trashedAt: e.trashedAt,
        snapshot: e.snapshot,
        payload: e.payload,
      },
      updated_at: new Date().toISOString(),
    }));
    await supabase.from(SUPABASE_TABLE).upsert(rows);
  } catch (err) {
    console.error("[engagement-trash] mirror failed:", err);
  }
}

/** Pull cloud trash into localStorage. Called once at app boot from
 *  the /engagements + /engagements/trash routes. Cloud wins. */
export async function bootstrapEngagementTrash(): Promise<void> {
  try {
    const { supabase, isSupabaseConfigured } = await import("./supabase");
    if (!isSupabaseConfigured() || typeof window === "undefined") return;
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("id, data");
    if (error) {
      console.error("[engagement-trash] bootstrap pull failed:", error);
      return;
    }
    const entries: TrashEntry[] = (data || []).map(
      (row: { id: string; data: Omit<TrashEntry, "id"> }) => ({
        id: row.id,
        ...row.data,
      }),
    );
    window.localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("[engagement-trash] bootstrap failed:", err);
  }
}

/* ── Source-aware delete helpers ─────────────────────────────────── */

/** Pluck the matching local-only MockEngagement out of the local
 *  engagements store. Used when source is "local". */
function readLocalEng(id: string): MockEngagement | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(LS_LOCAL_ENG);
    if (!raw) return undefined;
    const list = JSON.parse(raw) as MockEngagement[];
    return list.find((e) => e.id === id);
  } catch {
    return undefined;
  }
}

function removeLocalEng(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LS_LOCAL_ENG);
    const list = raw ? (JSON.parse(raw) as MockEngagement[]) : [];
    const next = list.filter((e) => e.id !== id);
    window.localStorage.setItem(LS_LOCAL_ENG, JSON.stringify(next));
  } catch (err) {
    console.error("[engagement-trash] removeLocalEng failed:", err);
  }
}

function writeLocalEng(eng: MockEngagement): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LS_LOCAL_ENG);
    const list = raw ? (JSON.parse(raw) as MockEngagement[]) : [];
    const next = [eng, ...list.filter((e) => e.id !== eng.id)];
    window.localStorage.setItem(LS_LOCAL_ENG, JSON.stringify(next));
  } catch (err) {
    console.error("[engagement-trash] writeLocalEng failed:", err);
  }
}

/** Determine which underlying store an engagement id belongs to. The
 *  delete UI passes this through to trashEngagement so the cascade
 *  knows what to physically remove. */
export function detectEngagementSource(id: string): TrashSource {
  if (getClientById(id)) return "pods";
  if (readLocalEng(id)) return "local";
  return "mock";
}

/* ── Public API ──────────────────────────────────────────────────── */

/** Soft-delete an engagement: snapshot it, drop the underlying source
 *  data, record the trash entry. Returns the created TrashEntry. */
export function trashEngagement(
  engagement: MockEngagement,
  source: TrashSource,
): TrashEntry {
  const payload: TrashEntry["payload"] = {};

  if (source === "pods") {
    const client = getClientById(engagement.id);
    if (client) {
      const projects = getProjectsForClient(client.id);
      const tasks = projects.flatMap((p) => getTasksForProject(p.id));
      payload.client = client;
      payload.projects = projects;
      payload.tasks = tasks;
      deleteClientCascade(client.id);
    }
  } else if (source === "local") {
    const local = readLocalEng(engagement.id);
    if (local) {
      payload.localEng = local;
      removeLocalEng(engagement.id);
    }
  } else {
    /* mock source: nothing to physically remove, the trash record
     * itself is what causes the engagements list to hide it. */
  }

  const entry: TrashEntry = {
    id: engagement.id,
    source,
    trashedAt: new Date().toISOString(),
    snapshot: engagement,
    payload,
  };

  const current = getTrashEntries();
  const next = [entry, ...current.filter((e) => e.id !== entry.id)];
  writeTrash(next);
  return entry;
}

/** Restore an engagement from trash. Re-writes the underlying source
 *  data and removes the trash entry. */
export function restoreEngagement(id: string): TrashEntry | null {
  const entries = getTrashEntries();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;

  if (entry.source === "pods" && entry.payload.client) {
    restoreClientCascade(
      entry.payload.client,
      entry.payload.projects ?? [],
      entry.payload.tasks ?? [],
    );
  } else if (entry.source === "local" && entry.payload.localEng) {
    writeLocalEng(entry.payload.localEng);
  }

  const next = entries.filter((e) => e.id !== id);
  writeTrash(next);
  return entry;
}

/** Permanently delete a trashed engagement. No way back after this. */
export function permanentlyDeleteEngagement(id: string): void {
  const next = getTrashEntries().filter((e) => e.id !== id);
  writeTrash(next);
}
