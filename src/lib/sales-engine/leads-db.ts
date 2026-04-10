/* ── Leads Database data layer ── */

import { createStore } from "@/lib/supabase-store";

export type ProspectStatus = "new" | "reached_out" | "responded";

export interface Prospect {
  id: string;
  name: string;
  brand: string;
  url: string;
  rev_estimate: string;
  status: ProspectStatus;
  // Extended fields from Scout agent
  email?: string;
  email_verified?: boolean;
  niche?: string;
  cro_observations?: string;
  outreach_hook?: string;
  priority_flag?: boolean;
  source?: string;
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

/**
 * Normalize raw JSONB data into the Prospect shape.
 * Scout agent writes: brand_name, decision_maker_name, estimated_mrr
 * UI expects:         brand, name, rev_estimate
 */
function normalize(raw: Record<string, unknown>): Prospect {
  const r = raw as any;
  return {
    id: r.id || "",
    name: r.name || r.decision_maker_name || "",
    brand: r.brand || r.brand_name || "",
    url: r.url || "",
    rev_estimate: r.rev_estimate || (r.estimated_mrr != null
      ? `£${Number(r.estimated_mrr).toLocaleString("en-GB")}/mo`
      : ""),
    status: r.status || "new",
    email: r.email || undefined,
    email_verified: r.email_verified ?? undefined,
    niche: r.niche || undefined,
    cro_observations: r.cro_observations || undefined,
    outreach_hook: r.outreach_hook || undefined,
    priority_flag: r.priority_flag ?? undefined,
    source: r.source || undefined,
    created_at: r.created_at || new Date().toISOString(),
    updated_at: r.updated_at || new Date().toISOString(),
  };
}

export async function getProspects(): Promise<Prospect[]> {
  const raw = await store.getAll();
  return (raw as unknown as Record<string, unknown>[]).map(normalize);
}

export async function saveProspects(prospects: Prospect[]): Promise<void> {
  await store.saveAll(prospects);
}
