/* ── Content Calendar Data Layer ── */

import { createStore } from "@/lib/supabase-store";
import type { ContentItem, ContentStatus, ContentPlatform, DealOwner, FunnelStage } from "./types";

const store = createStore<ContentItem>({
  table: "content_calendar",
  lsKey: "launchpad-content-calendar",
});

export async function getContentItems(): Promise<ContentItem[]> {
  return store.getAll();
}

export async function saveContentItem(item: ContentItem): Promise<void> {
  const items = await store.getAll();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx] = { ...item, updated_at: new Date().toISOString() };
  } else {
    items.push(item);
  }
  await store.saveAll(items);
}

export async function deleteContentItem(id: string): Promise<void> {
  const items = await store.getAll();
  await store.saveAll(items.filter((i) => i.id !== id));
}

export function createNewContentItem(partial: Partial<ContentItem>): ContentItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    body: "",
    platform: "linkedin",
    account_id: "dylan",
    status: "idea",
    funnel_stage: "tofu",
    category: "",
    notes: "",
    created_at: now,
    updated_at: now,
    ...partial,
  };
}
