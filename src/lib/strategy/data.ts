/* Strategy data layer.
 *
 * Reads + writes for the four strategy tables created in migration 021:
 *   - strategy_briefs    (one row per onboarding assigned to a pod)
 *   - strategy_results   (one row per live test)
 *   - strategy_resources (per-client sandbox resources)
 *   - strategy_notes     (per-client dated note entries)
 *
 * Storage convention is { id text pk, data jsonb, updated_at }, same as
 * the rest of the app. Reads select the `data` column and unwrap.
 *
 * Multi-device pattern: additive only + explicit delete. NEVER write a
 * destructive saveAll, that'll nuke other devices' rows.
 *
 * Supabase Storage bucket `strategy-resources` (private) holds uploaded
 * files. Resource rows reference them via `file_path`.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  StrategyBrief,
  StrategyResult,
  StrategyResource,
  StrategyNote,
} from "./types";

const TABLE_BRIEFS = "strategy_briefs";
const TABLE_RESULTS = "strategy_results";
const TABLE_RESOURCES = "strategy_resources";
const TABLE_NOTES = "strategy_notes";

const STORAGE_BUCKET = "strategy-resources";

function newId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── Briefs ──────────────────────────────────────────────────────────

export async function listBriefs(): Promise<StrategyBrief[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE_BRIEFS)
      .select("data")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: { data: StrategyBrief }) => r.data);
  } catch (err) {
    console.error("[strategy] listBriefs:", err);
    return [];
  }
}

export async function createBrief(
  brief: Omit<StrategyBrief, "id" | "created_at" | "updated_at" | "done">,
): Promise<StrategyBrief | null> {
  if (!isSupabaseConfigured()) return null;
  const row: StrategyBrief = {
    ...brief,
    id: newId(),
    done: false,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  try {
    const { error } = await supabase
      .from(TABLE_BRIEFS)
      .insert({ id: row.id, data: row });
    if (error) throw error;
    return row;
  } catch (err) {
    console.error("[strategy] createBrief:", err);
    return null;
  }
}

export async function updateBrief(
  id: string,
  patch: Partial<StrategyBrief>,
): Promise<StrategyBrief | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: existing, error: readErr } = await supabase
      .from(TABLE_BRIEFS)
      .select("data")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!existing) return null;
    const merged: StrategyBrief = {
      ...(existing.data as StrategyBrief),
      ...patch,
      updated_at: nowIso(),
    };
    const { error: writeErr } = await supabase
      .from(TABLE_BRIEFS)
      .update({ data: merged, updated_at: nowIso() })
      .eq("id", id);
    if (writeErr) throw writeErr;
    return merged;
  } catch (err) {
    console.error("[strategy] updateBrief:", err);
    return null;
  }
}

export async function removeBrief(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from(TABLE_BRIEFS).delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[strategy] removeBrief:", err);
    return false;
  }
}

// ─── Results ─────────────────────────────────────────────────────────

export async function listResults(): Promise<StrategyResult[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE_RESULTS)
      .select("data")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: { data: StrategyResult }) => r.data);
  } catch (err) {
    console.error("[strategy] listResults:", err);
    return [];
  }
}

export async function createResult(
  result: Omit<StrategyResult, "id" | "created_at" | "updated_at" | "done">,
): Promise<StrategyResult | null> {
  if (!isSupabaseConfigured()) return null;
  const row: StrategyResult = {
    ...result,
    id: newId(),
    done: false,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  try {
    const { error } = await supabase
      .from(TABLE_RESULTS)
      .insert({ id: row.id, data: row });
    if (error) throw error;
    return row;
  } catch (err) {
    console.error("[strategy] createResult:", err);
    return null;
  }
}

export async function updateResult(
  id: string,
  patch: Partial<StrategyResult>,
): Promise<StrategyResult | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: existing, error: readErr } = await supabase
      .from(TABLE_RESULTS)
      .select("data")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!existing) return null;
    const merged: StrategyResult = {
      ...(existing.data as StrategyResult),
      ...patch,
      updated_at: nowIso(),
    };
    const { error: writeErr } = await supabase
      .from(TABLE_RESULTS)
      .update({ data: merged, updated_at: nowIso() })
      .eq("id", id);
    if (writeErr) throw writeErr;
    return merged;
  } catch (err) {
    console.error("[strategy] updateResult:", err);
    return null;
  }
}

export async function removeResult(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from(TABLE_RESULTS).delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[strategy] removeResult:", err);
    return false;
  }
}

// ─── Resources (per client) ──────────────────────────────────────────

export async function listResourcesForClient(
  clientId: string,
): Promise<StrategyResource[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE_RESOURCES)
      .select("data")
      .filter("data->>client_id", "eq", clientId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: { data: StrategyResource }) => r.data);
  } catch (err) {
    console.error("[strategy] listResourcesForClient:", err);
    return [];
  }
}

export async function createResource(
  resource: Omit<StrategyResource, "id" | "added_at">,
): Promise<StrategyResource | null> {
  if (!isSupabaseConfigured()) return null;
  const row: StrategyResource = {
    ...resource,
    id: newId(),
    added_at: nowIso(),
  };
  try {
    const { error } = await supabase
      .from(TABLE_RESOURCES)
      .insert({ id: row.id, data: row });
    if (error) throw error;
    return row;
  } catch (err) {
    console.error("[strategy] createResource:", err);
    return null;
  }
}

export async function removeResource(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    // Best-effort: also remove the uploaded file from Storage if present.
    const { data: existing } = await supabase
      .from(TABLE_RESOURCES)
      .select("data")
      .eq("id", id)
      .maybeSingle();
    const filePath = (existing?.data as StrategyResource | undefined)?.file_path;
    if (filePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
    }
    const { error } = await supabase
      .from(TABLE_RESOURCES)
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[strategy] removeResource:", err);
    return false;
  }
}

/** Server-side signed URL helper. Resources reference files by
 * `file_path`; this fetches a short-lived signed URL the browser can
 * open. */
export async function signedUrlForResource(
  filePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);
    if (error) throw error;
    return data?.signedUrl ?? null;
  } catch (err) {
    console.error("[strategy] signedUrlForResource:", err);
    return null;
  }
}

// ─── Notes (per client) ──────────────────────────────────────────────

export async function listNotesForClient(
  clientId: string,
): Promise<StrategyNote[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE_NOTES)
      .select("data")
      .filter("data->>client_id", "eq", clientId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: { data: StrategyNote }) => r.data);
  } catch (err) {
    console.error("[strategy] listNotesForClient:", err);
    return [];
  }
}

export async function createNote(
  note: Omit<StrategyNote, "id" | "created_at">,
): Promise<StrategyNote | null> {
  if (!isSupabaseConfigured()) return null;
  const row: StrategyNote = {
    ...note,
    id: newId(),
    created_at: nowIso(),
  };
  try {
    const { error } = await supabase
      .from(TABLE_NOTES)
      .insert({ id: row.id, data: row });
    if (error) throw error;
    return row;
  } catch (err) {
    console.error("[strategy] createNote:", err);
    return null;
  }
}

export async function removeNote(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from(TABLE_NOTES).delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[strategy] removeNote:", err);
    return false;
  }
}
