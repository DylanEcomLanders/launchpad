/* ── SOP Data Layer ── */

import { createStore } from "@/lib/supabase-store";
import type { SOP } from "./types";

const store = createStore<SOP>({ table: "sops", lsKey: "launchpad-sops" });

export async function getSOPs(): Promise<SOP[]> {
  const all = await store.getAll();
  return all.sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at));
}

export async function getSOPById(id: string): Promise<SOP | null> {
  return store.getById(id);
}

export async function createSOP(sop: SOP): Promise<void> {
  await store.create(sop);
}

export async function updateSOP(id: string, updates: Partial<SOP>): Promise<void> {
  await store.update(id, updates);
}

export async function deleteSOP(id: string): Promise<void> {
  await store.remove(id);
}
