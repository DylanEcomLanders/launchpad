"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createV2ServerClient } from "@/lib/v2/supabase/server";
import { isV2AuthCookie } from "@/lib/v2/supabase/cookie";
import type { V2AppUser, V2AppUserRole } from "@/lib/v2/types";

function asRole(value: unknown): V2AppUserRole {
  return value === "admin" || value === "cro" || value === "team" ? value : "team";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function lookupActiveAppUser(
  supabase: Awaited<ReturnType<typeof createV2ServerClient>>,
  email: string,
): Promise<V2AppUser | null> {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, email, name, role, active")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  if (error) {
    throw new Error(`app_users lookup failed: ${error.message}`);
  }
  if (!data || data.active === false) return null;

  return {
    id: String(data.id),
    email: String(data.email),
    name: String(data.name),
    role: asRole(data.role),
  };
}

async function stampAppUserSignIn(userId: string, authId: string): Promise<void> {
  const supabase = await createV2ServerClient();
  const { error } = await supabase
    .from("app_users")
    .update({ auth_id: authId, last_seen_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    throw new Error(`app_users stamp failed: ${error.message}`);
  }
}

/** Current v2 person, or null if there is no real per-user session. */
export async function getV2User(): Promise<V2AppUser | null> {
  const supabase = await createV2ServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    // No cookie / expired session is not a hard failure.
    if (/session|jwt|auth/i.test(error.message)) return null;
    throw new Error(`v2 auth.getUser failed: ${error.message}`);
  }
  const email = data.user?.email;
  if (!email || !data.user) return null;
  return lookupActiveAppUser(supabase, email);
}

export async function requireV2User(): Promise<V2AppUser> {
  const user = await getV2User();
  if (!user) redirect("/v2/login");
  return user;
}

export type V2SignInResult = { ok: true } | { ok: false; error: string };

/**
 * Email + password via Supabase Auth, then the app_users allowlist.
 * Does not accept the 1.0 shared gate password or launchpad-role cookie.
 */
export async function signInV2(email: string, password: string): Promise<V2SignInResult> {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const supabase = await createV2ServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error || !data.user?.email) {
    return { ok: false, error: "Wrong email or password." };
  }

  try {
    const appUser = await lookupActiveAppUser(supabase, data.user.email);
    if (!appUser) {
      await supabase.auth.signOut();
      await clearV2AuthCookies();
      return { ok: false, error: "That email isn't on the team list. Ask an admin to invite you." };
    }
    await stampAppUserSignIn(appUser.id, data.user.id);
    return { ok: true };
  } catch (err) {
    await supabase.auth.signOut();
    await clearV2AuthCookies();
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sign-in failed.",
    };
  }
}

/** Clears only lp-v2-auth cookies. Leaves 1.0 gate cookies alone. */
export async function signOutV2(): Promise<void> {
  const supabase = await createV2ServerClient();
  const { error } = await supabase.auth.signOut();
  await clearV2AuthCookies();
  if (error) {
    throw new Error(`v2 sign-out failed: ${error.message}`);
  }
}

async function clearV2AuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (!isV2AuthCookie(cookie.name)) continue;
    cookieStore.set(cookie.name, "", { path: "/", maxAge: 0 });
  }
}
