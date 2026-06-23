// Sales Dashboard — type definitions.
//
// These mirror the relational data model in the build brief, but the repo
// convention is to store each row as { id TEXT PK, data JSONB, updated_at }
// and drive it through createStore (Supabase-first + localStorage fallback).
// So the "tables" below live as TS interfaces; the JSONB `data` column holds
// everything except `id`. FKs (owner_id, stage_id, lead_id, pod_id) are plain
// string ids embedded in the blob, not enforced relations — same as pods_v2.
//
// Wire-up note: at integration time these back onto createStore<T>({ table })
// against the sales_dashboard_* tables in migration 028.

export type LeadSource =
  | "lander"
  | "cal_com"
  | "referral"
  | "outbound"
  | "whatsapp"
  | "twitter"
  | "instagram"
  | "linkedin"
  | "manual";

export type Temperature = "hot" | "warm" | "cold" | "nurture";

export type Channel =
  | "email"
  | "whatsapp"
  | "twitter"
  | "instagram"
  | "linkedin"
  | "cal_com"
  | "lander"
  | "manual";

export type MessageDirection = "inbound" | "outbound";

export type DealPlan = "core" | "pro" | "custom";

export type ClientStatus = "active" | "paused" | "churned";

/** pipeline_stages — ordered funnel columns. */
export interface PipelineStage {
  id: string;
  name: string;
  position: number;
  /** 0–100, used for weighted pipeline value. */
  probability: number;
  is_won: boolean;
  is_lost: boolean;
}

/** leads — the spine of the pipeline + inbox. */
export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: LeadSource;
  /** From the lander qualifier, e.g. "£500k–£1m". Free text. */
  revenue_band: string;
  expected_mrr: number;
  /** FK → app_users.id (the owning salesperson). */
  owner_id: string;
  /** FK → pipeline_stages.id. */
  stage_id: string;
  temperature: Temperature | null;
  notes: string;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
}

/** lead_messages — unified inbox rows, one per message across all channels. */
export interface LeadMessage {
  id: string;
  lead_id: string;
  channel: Channel;
  direction: MessageDirection;
  subject: string;
  body: string;
  /** Provider id used to dedupe on sync. null for manual logs. */
  external_id: string | null;
  is_read: boolean;
  created_at: string;
}

/** lead_tasks — follow-up to-dos attached to a lead. */
export interface LeadTask {
  id: string;
  lead_id: string;
  title: string;
  due_at: string;
  completed_at: string | null;
  created_at: string;
}

/** deals — written when a lead is dragged into a won stage. */
export interface Deal {
  id: string;
  lead_id: string;
  plan: DealPlan;
  mrr: number;
  setup_fee: number;
  contract_months: number;
  closed_at: string;
  created_at: string;
}

/**
 * clients — the shared spine the Retention + KPI dashboards run on.
 * Created here via the won-deal handoff. `owner_id` (CSM) is left null for
 * ops to assign. NOTE: distinct from the existing `pods_v2_clients` and
 * `finance_clients` tables — see migration 028 header for the rationale.
 */
export interface Client {
  id: string;
  name: string;
  company: string;
  /** FK → leads.id (origin of the relationship). */
  lead_id: string;
  /** FK → pods_v2 pod id. null until ops assigns a pod. */
  pod_id: string | null;
  /** FK → app_users.id (CSM). null until ops assigns. */
  owner_id: string | null;
  plan: DealPlan;
  mrr: number;
  status: ClientStatus;
  onboarded_at: string;
  renewal_date: string;
  created_at: string;
  /** Manual health override set from the Retention dashboard. When present it
   *  WINS over the computed band. null/undefined = use the computed health.
   *  Stored in this same blob (no migration). See src/lib/retention. */
  health_override?: "green" | "amber" | "red" | null;
}
