import { createStore } from "@/lib/supabase-store";
import type { ContentEntry, ContentEntryInsert } from "./types";

/* ── Store instance ── */
const store = createStore<ContentEntry>({
  table: "content_accounts",
  lsKey: "content-database",
});

function calcEngagementRate(impressions: number, engagements: number): number {
  if (!impressions || impressions <= 0) return 0;
  return Math.round((engagements / impressions) * 10000) / 100; // 2 decimal places
}

// ═══════════════════════════════════════════════════════════════════
// Read
// ═══════════════════════════════════════════════════════════════════

export async function getContentEntries(): Promise<ContentEntry[]> {
  const entries = await store.getAll();
  return entries.sort(
    (a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime()
  );
}

export async function getContentEntryById(
  id: string
): Promise<ContentEntry | null> {
  return store.getById(id);
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
  const engagement_rate = calcEngagementRate(
    input.impressions,
    input.engagements
  );

  const entry: ContentEntry = {
    id: crypto.randomUUID(),
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

  return store.create(entry);
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

  await store.update(id, payload as Partial<ContentEntry>);
}

// ═══════════════════════════════════════════════════════════════════
// Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteContentEntry(id: string): Promise<void> {
  await store.remove(id);
}
