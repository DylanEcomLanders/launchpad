import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { ContentEntry, ContentEntryInsert } from "./types";

/* ── Local-storage key ── */
const LS_KEY = "content-database";

function uid(): string {
  return crypto.randomUUID();
}

function calcEngagementRate(impressions: number, engagements: number): number {
  if (!impressions || impressions <= 0) return 0;
  return Math.round((engagements / impressions) * 10000) / 100; // 2 decimal places
}

// ═══════════════════════════════════════════════════════════════════
// Read
// ═══════════════════════════════════════════════════════════════════

export async function getContentEntries(): Promise<ContentEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("content_database")
        .select("*")
        .order("post_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    } catch {
      /* fall through to localStorage */
    }
  }
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LS_KEY);
  const entries: ContentEntry[] = stored ? JSON.parse(stored) : [];
  return entries.sort(
    (a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime()
  );
}

export async function getContentEntryById(
  id: string
): Promise<ContentEntry | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("content_database")
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
  const all = await getContentEntries();
  return all.find((e) => e.id === id) ?? null;
}

export async function getWinners(): Promise<ContentEntry[]> {
  const all = await getContentEntries();
  return all.filter((e) => e.is_winner);
}

// ═══════════════════════════════════════════════════════════════════
// Create
// ═══════════════════════════════════════════════════════════════════

export async function createContentEntry(
  input: ContentEntryInsert
): Promise<ContentEntry> {
  const now = new Date().toISOString();
  const id = uid();
  const engagement_rate = calcEngagementRate(
    input.impressions,
    input.engagements
  );

  const row = {
    id,
    platform: input.platform,
    category: input.category,
    content: input.content || "",
    post_url: input.post_url || "",
    post_date: input.post_date || now,
    impressions: input.impressions || 0,
    engagements: input.engagements || 0,
    clicks: input.clicks || 0,
    engagement_rate,
    is_winner: input.is_winner || false,
    tags: input.tags || [],
    notes: input.notes || "",
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("content_database")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    } catch {
      /* fall through */
    }
  }
  const entry = row as ContentEntry;
  const existing = await getContentEntries();
  existing.unshift(entry);
  localStorage.setItem(LS_KEY, JSON.stringify(existing));
  return entry;
}

// ═══════════════════════════════════════════════════════════════════
// Update
// ═══════════════════════════════════════════════════════════════════

export async function updateContentEntry(
  id: string,
  updates: Partial<ContentEntryInsert>
): Promise<void> {
  const now = new Date().toISOString();

  // Recalculate engagement rate if metrics changed
  let engagement_rate: number | undefined;
  if (updates.impressions !== undefined || updates.engagements !== undefined) {
    const existing = await getContentEntryById(id);
    if (existing) {
      const imp =
        updates.impressions !== undefined
          ? updates.impressions
          : existing.impressions;
      const eng =
        updates.engagements !== undefined
          ? updates.engagements
          : existing.engagements;
      engagement_rate = calcEngagementRate(imp, eng);
    }
  }

  const payload = {
    ...updates,
    ...(engagement_rate !== undefined ? { engagement_rate } : {}),
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("content_database")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      return;
    } catch {
      /* fall through */
    }
  }
  const all = await getContentEntries();
  const updated = all.map((e) =>
    e.id === id ? { ...e, ...payload } : e
  );
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
}

// ═══════════════════════════════════════════════════════════════════
// Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteContentEntry(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("content_database")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return;
    } catch {
      /* fall through */
    }
  }
  const all = await getContentEntries();
  localStorage.setItem(
    LS_KEY,
    JSON.stringify(all.filter((e) => e.id !== id))
  );
}

// ═══════════════════════════════════════════════════════════════════
// Row mapper
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ContentEntry {
  return {
    id: row.id,
    platform: row.platform || "twitter",
    category: row.category || "other",
    content: row.content || "",
    post_url: row.post_url || "",
    post_date: row.post_date || "",
    impressions: row.impressions || 0,
    engagements: row.engagements || 0,
    clicks: row.clicks || 0,
    engagement_rate: row.engagement_rate || 0,
    is_winner: row.is_winner || false,
    tags: row.tags || [],
    notes: row.notes || "",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
  };
}
