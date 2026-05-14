/* ── Team avatar persistence ─────────────────────────────────────
 *
 * Avatar image *files* live in Supabase storage (company-avatars
 * bucket). The URLs pointing to them used to live only in localStorage
 * via PodMember.avatar_url, which meant a clear of localStorage / a
 * different browser / a fresh device would orphan every photo.
 *
 * This module persists the URL → slot mapping to Supabase so avatars
 * survive any localStorage reset and show up identically across
 * machines. Keyed by pod_name+role (or "cro:{name}") since member ids
 * are randomly generated per-browser-seed and aren't stable.
 *
 * Storage shape:
 *   business_settings row id = "pods-v2-team-avatars"
 *   data = { avatars: { "pod:Pod 1:primary_designer": "https://...", ... } }
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const ROW_ID = "pods-v2-team-avatars";

export type TeamAvatarMap = Record<string, string>;

/** Pod member key, stable across browsers because pod name + role are
 * fixed by the seed. Two designers in the same pod can't both be
 * "primary_designer" so this is unique. */
export function podMemberAvatarKey(podName: string, role: string): string {
  return `pod:${podName}:${role}`;
}

/** CRO lead key. Currently only Dan, but kept name-keyed in case we
 * add more org-level CRO leads later. */
export function croLeadAvatarKey(name: string): string {
  return `cro:${name}`;
}

/** Fetch the cloud-stored URL→slot map. Returns empty when Supabase is
 * unconfigured or the row doesn't exist yet (first run). */
export async function loadTeamAvatars(): Promise<TeamAvatarMap> {
  if (!isSupabaseConfigured()) return {};
  try {
    const { data, error } = await supabase
      .from("business_settings")
      .select("data")
      .eq("id", ROW_ID)
      .limit(1);
    if (error) return {};
    const row = data?.[0]?.data;
    if (!row || typeof row !== "object") return {};
    const avatars = (row as { avatars?: TeamAvatarMap }).avatars;
    return avatars && typeof avatars === "object" ? avatars : {};
  } catch {
    return {};
  }
}

/** Upsert a single avatar URL. Reads the current map, merges, writes
 * back. Best-effort: failures don't block the local mutation since the
 * caller already wrote to localStorage. */
export async function saveTeamAvatar(key: string, url: string | undefined): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const current = await loadTeamAvatars();
    const next: TeamAvatarMap = { ...current };
    if (url) next[key] = url;
    else delete next[key];
    await supabase.from("business_settings").upsert(
      { id: ROW_ID, data: { avatars: next }, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
  } catch {
    // Silent, localStorage already up to date; cloud just falls behind
    // until the next successful save.
  }
}
