/* ── Portfolio v2 Data Layer ──
 *
 * Required Supabase table:
 *
 *   CREATE TABLE IF NOT EXISTS public.portfolio_v2 (
 *     id TEXT PRIMARY KEY,
 *     slug TEXT UNIQUE NOT NULL,
 *     data JSONB NOT NULL,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *
 *   ALTER TABLE public.portfolio_v2 ENABLE ROW LEVEL SECURITY;
 *
 *   CREATE POLICY "Allow all access" ON public.portfolio_v2
 *     FOR ALL USING (true) WITH CHECK (true);
 *
 * Required Supabase storage bucket:
 *   `portfolio-v2` (public) with an all-access policy matching `audit-portfolio`.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { PortfolioProject } from "./types";

const TABLE = "portfolio_v2";

export async function getProjects(): Promise<PortfolioProject[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: { data: PortfolioProject }) => row.data);
  } catch (err) {
    console.error("[portfolio-v2] getProjects error:", err);
    return [];
  }
}

export async function getProject(slug: string): Promise<PortfolioProject | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data?.data as PortfolioProject) ?? null;
  } catch (err) {
    console.error("[portfolio-v2] getProject error:", err);
    return null;
  }
}

export async function saveProject(project: PortfolioProject): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  const { error } = await supabase.from(TABLE).upsert(
    {
      id: project.id,
      slug: project.slug,
      data: project,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
