import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ── Quick check: is the anon key a valid JWT? ── */
// If not, every Supabase call will fail — skip network round-trips.
const isValidJwt = !!(supabaseAnonKey && supabaseAnonKey.startsWith("eyJ"));

/**
 * Returns true if the Supabase client appears to be configured with a valid key.
 * Use this to skip Supabase calls and go straight to localStorage fallback.
 */
export function isSupabaseConfigured(): boolean {
  return isValidJwt;
}
