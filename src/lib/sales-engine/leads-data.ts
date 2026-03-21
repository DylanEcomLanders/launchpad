/* ── Leads Data Layer ── */

import { createStore } from "@/lib/supabase-store";
import type { Lead, LeadStatus } from "./types";

const store = createStore<Lead>({
  table: "deals", // reuse existing table
  lsKey: "se-leads",
});

export async function getLeads(): Promise<Lead[]> {
  return store.getAll();
}

export async function saveLead(lead: Lead): Promise<void> {
  const all = await store.getAll();
  const idx = all.findIndex((l) => l.id === lead.id);
  if (idx >= 0) {
    all[idx] = { ...lead, updated_at: new Date().toISOString() };
  } else {
    all.push(lead);
  }
  await store.saveAll(all);
}

export async function deleteLead(id: string): Promise<void> {
  const all = await store.getAll();
  await store.saveAll(all.filter((l) => l.id !== id));
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const all = await store.getAll();
  const idx = all.findIndex((l) => l.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], status, updated_at: new Date().toISOString() };
    await store.saveAll(all);
  }
}

export function createNewLead(partial: Partial<Lead>): Lead {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    brand_name: "",
    contact_name: "",
    contact_email: "",
    status: "new",
    source: "",
    notes: "",
    created_at: now,
    updated_at: now,
    ...partial,
  };
}
