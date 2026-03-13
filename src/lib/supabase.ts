import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ── Quick check: is the anon key present and plausible? ── */
// Accepts both legacy JWT keys (eyJ...) and newer publishable keys (sb_publishable_...)
const hasValidKey = !!(
  supabaseAnonKey &&
  (supabaseAnonKey.startsWith("eyJ") || supabaseAnonKey.startsWith("sb_"))
);

/**
 * Returns true if the Supabase client appears to be configured with a valid key.
 * Use this to skip Supabase calls and go straight to localStorage fallback.
 */
export function isSupabaseConfigured(): boolean {
  return hasValidKey;
}
