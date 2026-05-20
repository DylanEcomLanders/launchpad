/* ── Server-only Supabase client for the finance module ──
 *
 * Uses the service-role key so it can read/write finance_* tables that
 * have RLS locked down to deny anon entirely. NEVER import this from
 * client components — `import "server-only"` will throw at build time
 * if you do.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.local + Vercel.
 */

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

export class FinanceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceConfigError";
  }
}

export function financeServerClient(): SupabaseClient {
  if (cached) return cached;
  if (!url || !serviceRoleKey) {
    throw new FinanceConfigError(
      "Finance module requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars (add to .env.local + Vercel).",
    );
  }
  cached = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
