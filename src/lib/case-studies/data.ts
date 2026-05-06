/* ── Case Studies — Data layer ──
 *
 * Required Supabase table:
 *
 *   CREATE TABLE IF NOT EXISTS public.case_studies (
 *     id TEXT PRIMARY KEY,
 *     slug TEXT UNIQUE NOT NULL,
 *     data JSONB NOT NULL,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *
 *   ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;
 *
 *   CREATE POLICY "Allow all access" ON public.case_studies
 *     FOR ALL USING (true) WITH CHECK (true);
 *
 *   CREATE INDEX IF NOT EXISTS case_studies_published_idx
 *     ON public.case_studies ((data->'settings'->>'published'));
 *
 * Required Supabase storage bucket:
 *   `case-studies` (public) with an all-access policy matching `audit-portfolio`.
 *   Files are organised as `{slug}/{filename}`.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { CaseStudy } from "./types";

const TABLE = "case_studies";

/* Old rows may be missing fields added after they were created. Fill in
 * empty arrays / defaults so the renderer can rely on `xs.length` etc. */
function normalize(raw: unknown): CaseStudy {
  const c = (raw || {}) as Partial<CaseStudy> & Record<string, unknown>;
  return {
    ...(c as CaseStudy),
    headlineStats: c.headlineStats ?? [],
    compoundedResults: c.compoundedResults ?? [],
    techStack: c.techStack ?? [],
    relatedCaseStudyIds: c.relatedCaseStudyIds ?? [],
    hero: {
      ...(c.hero as CaseStudy["hero"]),
      collageImages: c.hero?.collageImages ?? [],
    },
    challenge: {
      ...(c.challenge as CaseStudy["challenge"]),
      pullQuotes: c.challenge?.pullQuotes ?? [],
    },
    approach: {
      ...(c.approach as CaseStudy["approach"]),
      cards: c.approach?.cards ?? [],
    },
    results: {
      tests: c.results?.tests ?? [],
      screenshots: c.results?.screenshots ?? [],
      screenshotLayout: c.results?.screenshotLayout,
    },
    designs: {
      ...(c.designs as CaseStudy["designs"]),
      figmaFrames: c.designs?.figmaFrames ?? [],
      desktopSlices: c.designs?.desktopSlices ?? [],
      mobileSlices: c.designs?.mobileSlices ?? [],
    },
    extraBlocks: c.extraBlocks ?? [],
  };
}

export async function getCaseStudies(): Promise<CaseStudy[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: { data: unknown }) => normalize(row.data));
  } catch (err) {
    console.error("[case-studies] getCaseStudies error:", err);
    return [];
  }
}

export async function getCaseStudy(slug: string): Promise<CaseStudy | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data?.data ? normalize(data.data) : null;
  } catch (err) {
    console.error("[case-studies] getCaseStudy error:", err);
    return null;
  }
}

export async function getPublishedCaseStudies(): Promise<CaseStudy[]> {
  const all = await getCaseStudies();
  return all.filter((c) => c.settings.published);
}

export async function saveCaseStudy(study: CaseStudy): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  const next: CaseStudy = { ...study, updated_at: new Date().toISOString() };
  const { error } = await supabase.from(TABLE).upsert(
    {
      id: next.id,
      slug: next.slug,
      data: next,
      updated_at: next.updated_at,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function deleteCaseStudy(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return true;
    return excludeId ? data.id === excludeId : false;
  } catch (err) {
    console.error("[case-studies] isSlugAvailable error:", err);
    return true;
  }
}
