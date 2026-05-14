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
 * mutation, localStorage is the always-correct cache.
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

/** Mirror an entire collection to Supabase, ADDITIVE ONLY.
 *
 * Upserts every row in `items`. Does NOT delete Supabase rows whose id
 * isn't in `items`. The previous version did, which meant any browser
 * with a stale or empty localStorage cache would wipe other clients'
 * data the moment it wrote a single row. We learned this the hard way
 * on 2026-05-12, a verification run with a cleared local cache caused
 * deletion of real pod data on the cloud. Never again.
 *
 * Explicit deletes go through mirrorDeleteFromSupabase(), called only
 * by the small number of genuine delete operations in data.ts. The
 * collection-mirror path stays additive so a partial local snapshot
 * never destroys cloud state. */
export async function mirrorToSupabase(
  table: string,
  items: Array<Record<string, unknown> & { id: string }>,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const rows = items.map((item) => {
      const { id, ...rest } = item;
      return { id, data: rest, updated_at: new Date().toISOString() };
    });
    if (rows.length === 0) return;
    /* Chunk to stay well under any payload limits. */
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await supabase.from(table).upsert(rows.slice(i, i + CHUNK));
    }
  } catch (err) {
    /* localStorage already saved so correctness is intact, but a
     * persistent cloud-mirror failure means data drift across devices.
     * Surface to console so dev can catch sync regressions early. */
    console.error(`[pods-v2/sync] mirrorToSupabase(${table}) failed:`, err);
  }
}

/** Explicitly delete rows from Supabase by id. Use this when an item is
 * genuinely removed (deleteTask, deleteBlocker, etc.), never as a
 * passive side-effect of a cache diff. */
export async function mirrorDeleteFromSupabase(
  table: string,
  ids: string[],
): Promise<void> {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  try {
    await supabase.from(table).delete().in("id", ids);
  } catch (err) {
    console.error(`[pods-v2/sync] mirrorDeleteFromSupabase(${table}) failed:`, err);
  }
}

/** Pull a single table from Supabase. Returns the items rebuilt from
 * the `id, data` row shape, or null if Supabase is unavailable / the
 * fetch fails. Empty array means "table exists, has zero rows", that
 * matters for the first-run migration logic. */
async function pullTable<T>(table: string): Promise<T[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from(table).select("id, data");
    if (error) {
      console.error(`[pods-v2/sync] pullTable(${table}) returned error:`, error);
      return null;
    }
    return (data || []).map((row) => ({
      ...(row.data as Record<string, unknown>),
      id: row.id,
    })) as T[];
  } catch (err) {
    console.error(`[pods-v2/sync] pullTable(${table}) threw:`, err);
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
    if (cloud === null) continue; // network/error, leave local alone

    if (cloud.length > 0) {
      /* Cloud wins, overwrite local cache. Pods specifically get
       * deduped by name first: across multi-browser seed runs the
       * additive mirror accumulated multiple rows with the same name
       * (Pod 1 / Pod 1 / Pod 1 with different ids). Group, keep the
       * best one per name, delete the rest from Supabase so the
       * cleanup sticks for every device. */
      let resolved = cloud as Array<Record<string, unknown> & { id: string }>;
      if (lsKey === "launchpad-pods-v2-pods" && cloud.length > 3) {
        const { kept, drop } = dedupePodsByName(resolved as PodLike[]);
        if (drop.length > 0) {
          await mirrorDeleteFromSupabase(table, drop);
          resolved = kept as Array<Record<string, unknown> & { id: string }>;
        }
      }
      const localRaw = window.localStorage.getItem(lsKey);
      const cloudJson = JSON.stringify(resolved);
      if (localRaw !== cloudJson) {
        window.localStorage.setItem(lsKey, cloudJson);
        touchedAny = true;
      }
      continue;
    }

    // Cloud is empty, check local.
    const localRaw = window.localStorage.getItem(lsKey);
    if (!localRaw) continue;
    let local: Array<Record<string, unknown> & { id: string }> = [];
    try {
      local = JSON.parse(localRaw);
    } catch {
      continue;
    }
    if (local.length === 0) continue;

    // First-run migration, push local → cloud.
    await mirrorToSupabase(table, local);
  }

  return touchedAny;
}

/* Pods are seeded as a fixed set of 3 (Pod 1, Pod 2, Pod 3). The
 * additive Supabase mirror accumulated extra rows whenever a fresh
 * browser ran ensureSeed (new uid() per pod, then pushed up alongside
 * the existing rows). This dedupes by name post-pull, keeping the
 * canonical row per pod and listing the rest for deletion from cloud.
 *
 * Canonical = the row with the highest "completeness" score (most
 * non-placeholder members, plus a small bump for having slack_channel
 * set, plus a bump for any uploaded member avatars). Falls back to the
 * first row when scores tie. */
interface PodLike {
  id: string;
  name?: string;
  slack_channel_id?: string;
  members?: Array<{ is_placeholder?: boolean; avatar_url?: string }>;
}

function dedupePodsByName(pods: PodLike[]): { kept: PodLike[]; drop: string[] } {
  const score = (p: PodLike) =>
    (p.members?.filter((m) => !m.is_placeholder).length ?? 0) * 10 +
    (p.members?.filter((m) => m.avatar_url).length ?? 0) * 3 +
    (p.slack_channel_id ? 1 : 0);

  const byName = new Map<string, PodLike>();
  const drop: string[] = [];
  for (const p of pods) {
    const name = p.name ?? "";
    const existing = byName.get(name);
    if (!existing) {
      byName.set(name, p);
      continue;
    }
    if (score(p) > score(existing)) {
      drop.push(existing.id);
      byName.set(name, p);
    } else {
      drop.push(p.id);
    }
  }
  return { kept: Array.from(byName.values()), drop };
}
