/* ── Pipeline Data Layer ── */

import { createStore } from "@/lib/supabase-store";
import type { Deal, DealStage } from "./types";

const store = createStore<Deal>({
  table: "deals",
  lsKey: "launchpad-deals",
});

export async function getDeals(): Promise<Deal[]> {
  return store.getAll();
}

export async function getDeal(id: string): Promise<Deal | null> {
  const deals = await store.getAll();
  return deals.find((d) => d.id === id) || null;
}

export async function saveDeal(deal: Deal): Promise<void> {
  const deals = await store.getAll();
  const idx = deals.findIndex((d) => d.id === deal.id);
  if (idx >= 0) {
    deals[idx] = { ...deal, updated_at: new Date().toISOString() };
  } else {
    deals.push(deal);
  }
  await store.saveAll(deals);
}

export async function deleteDeal(id: string): Promise<void> {
  const deals = await store.getAll();
  await store.saveAll(deals.filter((d) => d.id !== id));
}

export async function moveDeal(id: string, stage: DealStage): Promise<void> {
  const deals = await store.getAll();
  const idx = deals.findIndex((d) => d.id === id);
  if (idx >= 0) {
    deals[idx] = { ...deals[idx], stage, updated_at: new Date().toISOString() };
    await store.saveAll(deals);
  }
}

export function createNewDeal(partial: Partial<Deal>): Deal {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "",
    brand_name: "",
    contact_name: "",
    contact_email: "",
    stage: "lead",
    value: 0,
    currency: "GBP",
    source: "",
    notes: "",
    owner: "dylan",
    created_at: now,
    updated_at: now,
    ...partial,
  };
}
