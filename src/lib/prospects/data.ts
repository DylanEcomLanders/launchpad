import { createStore } from "@/lib/supabase-store";
import type { SavedProspect, SavedProspectInsert } from "./types";

/* ── Store instance ── */
const store = createStore<SavedProspect>({
  table: "prospects",
  lsKey: "saved-prospects",
});

// ═══════════════════════════════════════════════════════════════════
// Read
// ═══════════════════════════════════════════════════════════════════

export async function getSavedProspects(): Promise<SavedProspect[]> {
  return store.getAll();
}

export async function getSavedProspectByUrl(url: string): Promise<SavedProspect | null> {
  const all = await store.getAll();
  return all.find((p) => p.url === url) ?? null;
}

// ═══════════════════════════════════════════════════════════════════
// Create
// ═══════════════════════════════════════════════════════════════════

export async function saveProspect(input: SavedProspectInsert): Promise<SavedProspect> {
  const now = new Date().toISOString();
  const prospect: SavedProspect = {
    id: crypto.randomUUID(),
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

  return store.create(prospect);
}

// ═══════════════════════════════════════════════════════════════════
// Update
// ═══════════════════════════════════════════════════════════════════

export async function updateSavedProspect(
  id: string,
  updates: Partial<Pick<SavedProspect, "outreach_status" | "notes" | "niche">>
): Promise<void> {
  await store.update(id, updates);
}

// ═══════════════════════════════════════════════════════════════════
// Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteSavedProspect(id: string): Promise<void> {
  await store.remove(id);
}

export async function unsaveProspectByUrl(url: string): Promise<void> {
  const all = await store.getAll();
  const match = all.find((p) => p.url === url);
  if (match) {
    await store.remove(match.id);
  }
}
