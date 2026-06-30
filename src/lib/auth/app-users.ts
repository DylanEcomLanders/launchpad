"use client";

// ─── App users (per-person identity allowlist) ──────────────────────
// Thin data layer over the `app_users` table created in migration 024.
// Turns an authenticated email into a known person (name + role + linked
// pod member). Admin manages who's on the list; sign-in only "counts" for
// emails that are present + active.

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type AppUserRole = "admin" | "cro" | "team";

/* True when a Supabase error just means the app_users migration hasn't been
 * pasted into the SQL editor yet. Postgres raises 42P01 for a missing
 * relation; PostgREST surfaces it as PGRST205. We treat this as an expected,
 * non-error state (the login screen falls back to "not on the list" and the
 * shared-password path still works) and log it quietly so the console isn't
 * spammed with red errors before the one-time migration runs. */
function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return (
    e?.code === "42P01" ||
    e?.code === "PGRST205" ||
    /schema cache|does not exist|find the table/i.test(e?.message ?? "")
  );
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: AppUserRole;
  pod_member_id: string | null;
  auth_id: string | null;
  active: boolean;
}

/* localStorage cache of the signed-in person, so client components can read
 * "who am I" synchronously (same pattern the rest of the app uses for role).
 * The Supabase session remains the source of truth for *authentication*;
 * this is just the resolved identity for display + attribution. */
const CURRENT_USER_KEY = "launchpad-current-user";

function rowToUser(r: Record<string, unknown>): AppUser {
  return {
    id: String(r.id),
    email: String(r.email),
    name: String(r.name),
    role: (r.role as AppUserRole) ?? "team",
    pod_member_id: (r.pod_member_id as string | null) ?? null,
    auth_id: (r.auth_id as string | null) ?? null,
    active: r.active !== false,
  };
}

/** Look up the allowlist row for an email (case-insensitive). Returns null
 *  if the email isn't on the list, isn't active, or Supabase is unreachable. */
export async function findAppUserByEmail(email: string): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return null;
  const normalized = email.trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("email", normalized)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const user = rowToUser(data);
    return user.active ? user : null;
  } catch (err) {
    if (isMissingTable(err)) {
      console.info("[app-users] app_users not migrated yet — sign-in allowlist unavailable.");
    } else {
      console.error("[app-users] findAppUserByEmail:", err);
    }
    return null;
  }
}

/** Stamp sign-in bookkeeping (auth_id + last_seen_at) on the user's row.
 *  Best-effort; failure doesn't block the session. */
export async function stampSignIn(userId: string, authId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase
      .from("app_users")
      .update({ auth_id: authId, last_seen_at: new Date().toISOString() })
      .eq("id", userId);
  } catch (err) {
    console.error("[app-users] stampSignIn:", err);
  }
}

/** Cache the resolved identity locally for synchronous reads. */
export function cacheCurrentUser(user: AppUser | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

/** Read the cached signed-in person synchronously. Null when not signed in
 *  via magic link (e.g. legacy shared-password sessions). */
export function getCachedCurrentUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

/** List every account (admin "Team access" management screen). */
export async function listAppUsers(): Promise<AppUser[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(rowToUser);
  } catch (err) {
    console.error("[app-users] listAppUsers:", err);
    return [];
  }
}

/** Add a person to the allowlist (admin invite). Email is lowercased; role
 *  defaults to team. Returns the created row, or null on failure (incl. the
 *  unique-email conflict, which the caller can treat as "already invited"). */
export async function inviteAppUser(input: {
  email: string;
  name: string;
  role: AppUserRole;
  pod_member_id?: string | null;
  invited_by?: string;
}): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from("app_users")
      .insert({
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        role: input.role,
        pod_member_id: input.pod_member_id ?? null,
        invited_by: input.invited_by ?? null,
      })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? rowToUser(data) : null;
  } catch (err) {
    console.error("[app-users] inviteAppUser:", err);
    return null;
  }
}

/** Toggle a person's active flag (soft revoke / restore access). */
export async function setAppUserActive(id: string, active: boolean): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from("app_users").update({ active }).eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[app-users] setAppUserActive:", err);
    return false;
  }
}

/** Promote / demote a person's role (admin / cro / team). Routes through
 *  the service-role endpoint because role is security-sensitive and the
 *  anon key's RLS blocks the write from a team-role session. The affected
 *  user picks up the new role on their next sign-in. */
export async function setAppUserRole(id: string, role: AppUserRole): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/set-user-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    return res.ok;
  } catch (err) {
    console.error("[app-users] setAppUserRole:", err);
    return false;
  }
}
