import { supabase } from "@/lib/supabase";
import type { SavedProspect, SavedProspectInsert } from "./types";

/* ── Local-storage key ── */
const LS_PROSPECTS = "saved-prospects";

function uid(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════════
// Read
// ═══════════════════════════════════════════════════════════════════

export async function getSavedProspects(): Promise<SavedProspect[]> {
  try {
    const { data, error } = await supabase
      .from("saved_prospects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(LS_PROSPECTS);
    return stored ? JSON.parse(stored) : [];
  }
}

export async function getSavedProspectByUrl(url: string): Promise<SavedProspect | null> {
  try {
    const { data, error } = await supabase
      .from("saved_prospects")
      .select("*")
      .eq("url", url)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  } catch {
    if (typeof window === "undefined") return null;
    const all = await getSavedProspects();
    return all.find((p) => p.url === url) ?? null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Create
// ═══════════════════════════════════════════════════════════════════

export async function saveProspect(input: SavedProspectInsert): Promise<SavedProspect> {
  const now = new Date().toISOString();
  const id = uid();

  const row = {
    id,
    brand_name: input.brand_name,
    url: input.url,
    emails: input.emails,
    social_links: input.social_links,
    revenue_score: input.revenue_score,
    apps: input.apps,
    niche: input.niche,
    outreach_status: input.outreach_status || "not_contacted",
    notes: input.notes || "",
    product_count: input.product_count,
    price_range: input.price_range,
    has_reviews: input.has_reviews,
    has_subscriptions: input.has_subscriptions,
    has_bnpl: input.has_bnpl,
    created_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("saved_prospects")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  } catch {
    const prospect = row as SavedProspect;
    const existing = await getSavedProspects();
    existing.unshift(prospect);
    localStorage.setItem(LS_PROSPECTS, JSON.stringify(existing));
    return prospect;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Update
// ═══════════════════════════════════════════════════════════════════

export async function updateSavedProspect(
  id: string,
  updates: Partial<Pick<SavedProspect, "outreach_status" | "notes" | "niche">>
): Promise<void> {
  try {
    const { error } = await supabase
      .from("saved_prospects")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
  } catch {
    const all = await getSavedProspects();
    const updated = all.map((p) => (p.id === id ? { ...p, ...updates } : p));
    localStorage.setItem(LS_PROSPECTS, JSON.stringify(updated));
  }
}

// ═══════════════════════════════════════════════════════════════════
// Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteSavedProspect(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("saved_prospects")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch {
    const all = await getSavedProspects();
    localStorage.setItem(LS_PROSPECTS, JSON.stringify(all.filter((p) => p.id !== id)));
  }
}

export async function unsaveProspectByUrl(url: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("saved_prospects")
      .delete()
      .eq("url", url);
    if (error) throw error;
  } catch {
    const all = await getSavedProspects();
    localStorage.setItem(LS_PROSPECTS, JSON.stringify(all.filter((p) => p.url !== url)));
  }
}

// ═══════════════════════════════════════════════════════════════════
// Row mapper
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SavedProspect {
  return {
    id: row.id,
    brand_name: row.brand_name || "",
    url: row.url || "",
    emails: row.emails || [],
    social_links: row.social_links || [],
    revenue_score: row.revenue_score || 0,
    apps: row.apps || [],
    niche: row.niche || "",
    outreach_status: row.outreach_status || "not_contacted",
    notes: row.notes || "",
    product_count: row.product_count || 0,
    price_range: row.price_range || null,
    has_reviews: row.has_reviews || false,
    has_subscriptions: row.has_subscriptions || false,
    has_bnpl: row.has_bnpl || false,
    created_at: row.created_at || "",
  };
}
