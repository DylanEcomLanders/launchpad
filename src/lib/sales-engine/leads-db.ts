/* ── Leads Database data layer ── */

import { createStore } from "@/lib/supabase-store";

export type ProspectStatus = "new" | "reached_out" | "responded";

export interface Prospect {
  id: string;
  name: string;
  brand: string;
  url: string;
  rev_estimate: string; // e.g. "£500k/mo", "7-fig", etc.
  status: ProspectStatus;
  created_at: string;
  updated_at: string;
}

export const PROSPECT_STATUSES: Record<ProspectStatus, { label: string; color: string }> = {
  new: { label: "New", color: "#94A3B8" },
  reached_out: { label: "Reached Out", color: "#3B82F6" },
  responded: { label: "Responded", color: "#10B981" },
};

const store = createStore<Prospect>({
  table: "leads_db",
  lsKey: "se-leads-db",
});

export async function getProspects(): Promise<Prospect[]> {
  return store.getAll();
}

export async function saveProspects(prospects: Prospect[]): Promise<void> {
  await store.saveAll(prospects);
}
