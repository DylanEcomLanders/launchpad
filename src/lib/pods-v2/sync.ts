/* ── Pods v2 ↔ Supabase sync ────────────────────────────────────
 *
 * The /pods-v2 stack reads + writes via the sync `read/write` helpers
 * in data.ts which hit localStorage. That keeps the existing call
 * sites synchronous (no async refactor of every render path).
 *
 * This module mirrors those localStorage writes to Supabase so the
 * data is durable across browsers, devices, and localStorage clears.
 * Read direction: on /pods-v2 mount, pull from Supabase and overlay
 * onto localStorage so the freshly-loaded cache reflects cloud state.
 *
 * Conflict policy: cloud wins on hydrate (multi-device truth lives
 * server-side). Subsequent writes immediately mirror back to cloud
 * so the client browser stays the source of in-flight changes.
 *
 * Best-effort throughout. Supabase failures never break the local
 * mutation — localStorage is the always-correct cache.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/** Map LS_KEY → Supabase table. Add to this when a new pods-v2
 * collection lands; the rest of the sync logic picks it up. */
export const POD_KEY_TO_TABLE: Record<string, string> = {
  "launchpad-pods-v2-pods": "pods_v2_pods",
  "launchpad-pods-v2-clients": "pods_v2_clients",
  "launchpad-pods-v2-projects": "pods_v2_projects",
  "launchpad-pods-v2-tasks": "pods_v2_tasks",
  "launchpad-pods-v2-cro-leads": "pods_v2_cro_leads",
};

/** Mirror an entire collection to Supabase. Upserts everything in
 * `items` and deletes any rows on the server whose id isn't present.
 * Same semantics as createStore.saveAll — but standalone so it can
 * be called from inside the sync `write` helper. */
export async function mirrorToSupabase(
  table: string,
  items: Array<Record<string, unknown> & { id: string }>,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const keepIds = new Set(items.map((i) => i.id));
    const { data: existing } = await supabase.from(table).select("id");
    if (existing) {
      const toDelete = (existing as { id: string }[])
        .map((r) => r.id)
        .filter((id) => !keepIds.has(id));
      if (toDelete.length > 0) {
        await supabase.from(table).delete().in("id", toDelete);
      }
    }
    const rows = items.map((item) => {
      const { id, ...rest } = item;
      return { id, data: rest, updated_at: new Date().toISOString() };
    });
    if (rows.length > 0) {
      // Chunk to stay well under any payload limits.
      const CHUNK = 200;
      for (let i = 0; i < rows.length; i += CHUNK) {
        await supabase.from(table).upsert(rows.slice(i, i + CHUNK));
      }
    }
  } catch {
    // Silent — localStorage already saved.
  }
}

/** Pull a single table from Supabase. Returns the items rebuilt from
 * the `id, data` row shape, or null if Supabase is unavailable / the
 * fetch fails. Empty array means "table exists, has zero rows" — that
 * matters for the first-run migration logic. */
async function pullTable<T>(table: string): Promise<T[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from(table).select("id, data");
    if (error) return null;
    return (data || []).map((row) => ({
      ...(row.data as Record<string, unknown>),
      id: row.id,
    })) as T[];
  } catch {
    return null;
  }
}

/** Called on /pods-v2 mount. For each pods-v2 collection:
 *   - if Supabase has rows → cloud wins, overwrite localStorage
 *   - if Supabase is empty BUT localStorage has rows → push local up
 *     (one-time migration from local-only to cloud-backed)
 *   - if both empty → leave alone (fresh user)
 *
 * Returns true if any local cache changed, so callers can refresh
 * their React state. */
export async function bootstrapPodsSync(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!isSupabaseConfigured()) return false;

  let touchedAny = false;

  for (const [lsKey, table] of Object.entries(POD_KEY_TO_TABLE)) {
    const cloud = await pullTable<{ id: string }>(table);
    if (cloud === null) continue; // network/error — leave local alone

    if (cloud.length > 0) {
      // Cloud wins — overwrite local cache.
      const localRaw = window.localStorage.getItem(lsKey);
      const cloudJson = JSON.stringify(cloud);
      if (localRaw !== cloudJson) {
        window.localStorage.setItem(lsKey, cloudJson);
        touchedAny = true;
      }
      continue;
    }

    // Cloud is empty — check local.
    const localRaw = window.localStorage.getItem(lsKey);
    if (!localRaw) continue;
    let local: Array<Record<string, unknown> & { id: string }> = [];
    try {
      local = JSON.parse(localRaw);
    } catch {
      continue;
    }
    if (local.length === 0) continue;

    // First-run migration — push local → cloud.
    await mirrorToSupabase(table, local);
  }

  return touchedAny;
}
