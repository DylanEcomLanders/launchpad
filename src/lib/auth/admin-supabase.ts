/* ── Server-only Supabase admin client ──
 *
 * Uses the service-role key so it can call auth.admin.* operations
 * (invite users, create users, etc.) that aren't available to anon
 * clients. Same pattern as the finance module's server client.
 *
 * NEVER import this from client components - "server-only" will
 * throw at build time if you do.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.local + Vercel.
 */

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

export class AdminAuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthConfigError";
  }
}

export function adminAuthClient(): SupabaseClient {
  if (cached) return cached;
  if (!url || !serviceRoleKey) {
    throw new AdminAuthConfigError(
      "Admin auth needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars.",
    );
  }
  cached = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
