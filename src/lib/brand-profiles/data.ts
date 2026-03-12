import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { BrandProfile, BrandProfileInsert } from "./types";

/* ── Local-storage key ── */
const LS_BRAND_PROFILES = "brand-profiles";

function uid(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════════
// Read
// ═══════════════════════════════════════════════════════════════════

export async function getBrandProfiles(): Promise<BrandProfile[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("brand_profiles")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    } catch {
      /* fall through to localStorage */
    }
  }
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LS_BRAND_PROFILES);
  return stored ? JSON.parse(stored) : [];
}

export async function getBrandProfileById(id: string): Promise<BrandProfile | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("brand_profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data ? mapRow(data) : null;
    } catch {
      /* fall through */
    }
  }
  if (typeof window === "undefined") return null;
  const all = await getBrandProfiles();
  return all.find((p) => p.id === id) ?? null;
}

// ═══════════════════════════════════════════════════════════════════
// Create
// ═══════════════════════════════════════════════════════════════════

export async function createBrandProfile(input: BrandProfileInsert): Promise<BrandProfile> {
  const now = new Date().toISOString();
  const id = uid();

  const row = {
    id,
    project_name: input.project_name,
    brand_url: input.brand_url || "",
    pain_points: input.pain_points || [],
    desires: input.desires || [],
    objections: input.objections || [],
    language_pulls: input.language_pulls || [],
    raw_report: input.raw_report || "",
    last_researched: input.last_researched || now,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("brand_profiles")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    } catch {
      /* fall through */
    }
  }
  const profile = row as BrandProfile;
  const existing = await getBrandProfiles();
  existing.unshift(profile);
  localStorage.setItem(LS_BRAND_PROFILES, JSON.stringify(existing));
  return profile;
}

// ═══════════════════════════════════════════════════════════════════
// Update
// ═══════════════════════════════════════════════════════════════════

export async function updateBrandProfile(
  id: string,
  updates: Partial<BrandProfileInsert>
): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("brand_profiles")
        .update({ ...updates, updated_at: now })
        .eq("id", id);
      if (error) throw error;
      return;
    } catch {
      /* fall through */
    }
  }
  const all = await getBrandProfiles();
  const updated = all.map((p) =>
    p.id === id ? { ...p, ...updates, updated_at: now } : p
  );
  localStorage.setItem(LS_BRAND_PROFILES, JSON.stringify(updated));
}

// ═══════════════════════════════════════════════════════════════════
// Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteBrandProfile(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("brand_profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return;
    } catch {
      /* fall through */
    }
  }
  const all = await getBrandProfiles();
  localStorage.setItem(LS_BRAND_PROFILES, JSON.stringify(all.filter((p) => p.id !== id)));
}

// ═══════════════════════════════════════════════════════════════════
// Row mapper
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): BrandProfile {
  return {
    id: row.id,
    project_name: row.project_name || "",
    brand_url: row.brand_url || "",
    pain_points: row.pain_points || [],
    desires: row.desires || [],
    objections: row.objections || [],
    language_pulls: row.language_pulls || [],
    raw_report: row.raw_report || "",
    last_researched: row.last_researched || "",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
  };
}
