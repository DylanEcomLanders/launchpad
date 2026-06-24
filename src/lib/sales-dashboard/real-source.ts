/* ── Sales Dashboard - real data source ──
 *
 * Adapter: loads from the live Launchpad tables (leads, proposals)
 * and transforms into the Sales Dashboard's mock shapes (Lead,
 * Deal, Client, LeadMessage, LeadTask, PipelineStage, Owner). The
 * dashboard UI stays unchanged; this layer hides the impedance
 * mismatch between the new lead model and the older sales-dashboard
 * model.
 *
 * Inbox messages (lead_messages) and tasks (lead_tasks) don't have
 * a real storage layer yet - this returns derived/empty data for
 * those. The Inbox surface gracefully shows what it has.
 */

import { useEffect, useState } from "react";
import { leadsStore } from "@/lib/leads/data";
import { proposalsStore } from "@/lib/proposals/data";
import type { Lead as MyLead, LeadStage as MyStage } from "@/lib/leads/types";
import type { Proposal } from "@/lib/proposals/types";
import type {
  Client,
  Deal,
  Lead,
  LeadMessage,
  LeadTask,
  PipelineStage,
  LeadSource,
  Channel,
  Temperature,
} from "./types";
import type { Owner } from "./mock-data";

/* Canonical pipeline stages — derived from MyStage so the kanban
 * mirrors what's in /pipeline. We collapse the model: my 7 stages
 * (incl. nurture) map cleanly to the sales-dashboard's funnel. */
export const REAL_STAGES: PipelineStage[] = [
  { id: "stg-new", name: "New", position: 0, probability: 10, is_won: false, is_lost: false },
  { id: "stg-qualified", name: "Qualified", position: 1, probability: 25, is_won: false, is_lost: false },
  { id: "stg-discovery", name: "Discovery Audit", position: 2, probability: 55, is_won: false, is_lost: false },
  { id: "stg-proposal", name: "Proposed", position: 3, probability: 75, is_won: false, is_lost: false },
  { id: "stg-won", name: "Closed Won", position: 4, probability: 100, is_won: true, is_lost: false },
  { id: "stg-lost", name: "Closed Lost", position: 5, probability: 0, is_won: false, is_lost: true },
];

const STAGE_MAP: Record<MyStage, string> = {
  new: "stg-new",
  qualified: "stg-qualified",
  discovery_audit: "stg-discovery",
  proposed: "stg-proposal",
  closed_won: "stg-won",
  closed_lost: "stg-lost",
  nurture: "stg-qualified",        // surface in qualified for now; nurture has no column
};

/* Best-effort source mapping. Source field in MyLead is free text
 * but the sales dashboard wants an enum. Fuzzy match. */
function mapSource(source: string): LeadSource {
  const s = source.toLowerCase();
  if (s.includes("referral")) return "referral";
  if (s.includes("instagram") || s.includes("ig")) return "instagram";
  if (s.includes("linkedin") || s.includes("li")) return "linkedin";
  if (s.includes("whatsapp")) return "whatsapp";
  if (s.includes("cal") || s.includes("calendly")) return "cal_com";
  if (s.includes("lander") || s.includes("landing")) return "lander";
  if (s.includes("outbound") || s.includes("cold") || s.includes("scout") || s.includes("apollo")) return "outbound";
  return "manual";
}

/* Quick guess at MRR from the revenue band - close enough for the
 * weighted-pipeline KPI. If revenue_band has £200k → £400k = Entry
 * (£5k/mo), £400k → £800k = Core (£10k), £800k+ = VIP (£15k). */
function guessMrr(revenueBand: string): number {
  if (!revenueBand) return 8000;
  const m = revenueBand.replace(/,/g, "").match(/(\d+\.?\d*)\s*([km])/i);
  if (!m) return 8000;
  const value = Number(m[1]);
  const unit = m[2].toLowerCase();
  const monthlyK = unit === "m" ? value * 1000 : value;
  if (monthlyK < 200) return 5000;
  if (monthlyK < 400) return 5000;
  if (monthlyK < 800) return 10000;
  return 15000;
}

function temperatureFor(lead: MyLead): Temperature {
  if (lead.stage === "closed_won" || lead.stage === "closed_lost" || lead.stage === "nurture") return "cold";
  if (lead.path === "upsell" || lead.path === "warm") return "hot";
  if (lead.stage === "proposed" || lead.stage === "discovery_audit") return "hot";
  if (lead.stage === "qualified") return "warm";
  return "cold";
}

/* Build the owners list from distinct lead.owner values. */
function buildOwners(leads: MyLead[]): Owner[] {
  const names = [...new Set(leads.map((l) => l.owner).filter(Boolean))];
  return names.length > 0
    ? names.map((name) => ({
        id: `owner-${name.toLowerCase().replace(/\s+/g, "-")}`,
        name,
        initials: name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
      }))
    : [{ id: "owner-unassigned", name: "Unassigned", initials: "??" }];
}

/* Transform one of MY leads into the Sales-Dashboard Lead shape. */
function adaptLead(l: MyLead, owners: Owner[]): Lead {
  const ownerId = owners.find((o) => o.name === l.owner)?.id ?? owners[0].id;
  return {
    id: l.id,
    name: l.full_name || "(no name)",
    company: l.brand_name || "(no brand)",
    email: l.email,
    phone: l.phone || "",
    source: mapSource(l.source),
    revenue_band: l.revenue_band,
    expected_mrr: guessMrr(l.revenue_band),
    owner_id: ownerId,
    stage_id: STAGE_MAP[l.stage],
    temperature: temperatureFor(l),
    notes: l.notes,
    last_contact_at: l.last_touched_at || null,
    created_at: l.created_at,
    updated_at: l.updated_at,
  };
}

/* Each MyLead.touches[] entry becomes a LeadMessage. Direction
 * inferred from kind; channel from touch.channel (preserves real
 * channel from Unipile backfill) → manual fallback for legacy. */
const VALID_CHANNELS: Channel[] = [
  "email",
  "whatsapp",
  "twitter",
  "instagram",
  "linkedin",
  "cal_com",
  "lander",
  "manual",
];
function adaptMessages(leads: MyLead[]): LeadMessage[] {
  const out: LeadMessage[] = [];
  for (const l of leads) {
    for (const t of l.touches) {
      const isInbound = t.kind === "reply_received";
      const channel: Channel = VALID_CHANNELS.includes(t.channel as Channel)
        ? (t.channel as Channel)
        : "manual";
      out.push({
        id: t.id,
        lead_id: l.id,
        channel,
        direction: isInbound ? "inbound" : "outbound",
        /* No auto-subject - Unipile backfill messages don't have
         * one. The kind ("outreach sent") was leaking through as
         * a fake header. Manual touches with real subjects can
         * still carry them later if we add a subject field. */
        subject: "",
        body: t.summary,
        external_id: t.external_id ?? null,
        is_read: true,
        created_at: t.at,
      });
    }
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/* MyLead.next_action + next_action_date becomes a single LeadTask. */
function adaptTasks(leads: MyLead[]): LeadTask[] {
  const out: LeadTask[] = [];
  for (const l of leads) {
    if (!l.next_action || !l.next_action_date) continue;
    out.push({
      id: `task-${l.id}`,
      lead_id: l.id,
      title: l.next_action,
      due_at: l.next_action_date,
      completed_at: null,
      created_at: l.updated_at,
    });
  }
  return out;
}

/* Signed/paid/kicked-off proposals become Deals. */
function adaptDeals(proposals: Proposal[]): Deal[] {
  return proposals
    .filter((p) => p.status === "signed" || p.status === "paid" || p.status === "kicked_off")
    .map((p) => ({
      id: p.id,
      lead_id: p.lead_id || "",
      plan: (p.tier === "VIP" ? "pro" : p.tier === "Core" ? "core" : "custom") as Deal["plan"],
      mrr: p.monthly_fee,
      setup_fee: 0,
      contract_months: p.term_months,
      closed_at: p.signed_at || p.paid_at || p.created_at,
      created_at: p.created_at,
    }));
}

/* Closed-won leads with a signed proposal become Clients. */
function adaptClients(leads: MyLead[], deals: Deal[], proposals: Proposal[]): Client[] {
  const out: Client[] = [];
  for (const l of leads) {
    if (l.stage !== "closed_won") continue;
    const proposal = proposals.find((p) => p.id === l.proposal_id);
    if (!proposal) continue;
    const deal = deals.find((d) => d.lead_id === l.id);
    out.push({
      id: `client-${l.id}`,
      name: l.full_name,
      company: l.brand_name,
      lead_id: l.id,
      pod_id: null,
      owner_id: null,
      plan: (proposal.tier === "VIP" ? "pro" : proposal.tier === "Core" ? "core" : "custom") as Client["plan"],
      mrr: proposal.monthly_fee,
      status: "active",
      onboarded_at: proposal.kicked_off_at || proposal.signed_at || proposal.created_at,
      renewal_date: new Date(new Date(proposal.signed_at || proposal.created_at).getTime() + proposal.term_months * 30 * 86_400_000).toISOString().slice(0, 10),
      created_at: deal?.created_at || proposal.created_at,
    });
  }
  return out;
}

export interface RealSalesData {
  leads: Lead[];
  messages: LeadMessage[];
  tasks: LeadTask[];
  deals: Deal[];
  clients: Client[];
  owners: Owner[];
  stages: PipelineStage[];
}

/* Hook: subscribe to real sales data. Re-loads on mount. Returns
 * { data, loading, refresh } - components can call refresh() after
 * mutating to pick up fresh data. */
export function useSalesData() {
  const [data, setData] = useState<RealSalesData | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [myLeads, myProposals] = await Promise.all([
      leadsStore.getAll(),
      proposalsStore.getAll(),
    ]);
    const owners = buildOwners(myLeads);
    const leads = myLeads.map((l) => adaptLead(l, owners));
    const messages = adaptMessages(myLeads);
    const tasks = adaptTasks(myLeads);
    const deals = adaptDeals(myProposals);
    const clients = adaptClients(myLeads, deals, myProposals);
    setData({ leads, messages, tasks, deals, clients, owners, stages: REAL_STAGES });
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return { data, loading, refresh };
}
