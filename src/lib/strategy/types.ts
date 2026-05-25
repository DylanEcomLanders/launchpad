/* Strategy data types — shared between StrategyView (/pods-v2) and
 * StrategySandbox (per-engagement). */

export type PodId = string; // "Pod 1" | "Pod 2" | "Pod 3" or future ids

export type BriefStatus =
  | "needs_brief"
  | "drafting"
  | "in_review"
  | "approved";

export type ResultStatus = "running" | "ready" | "overdue" | "read";

export interface BriefDeliverable {
  type: string;
  label?: string;
}

export interface StrategyBrief {
  id: string;
  client_id: string;
  client_name: string;
  pod_id: PodId;
  status: BriefStatus;
  onboarding_received: string; // ISO or human-readable date
  onboarding_submission_id?: string;
  is_overdue?: boolean;
  deliverables: BriefDeliverable[];
  retainer?: string;
  done: boolean;
  done_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StrategyResult {
  id: string;
  client_id: string;
  client_name: string;
  pod_id: PodId;
  project: string;
  live_since: string;
  live_days: number;
  status: ResultStatus;
  done: boolean;
  done_at?: string;
  created_at: string;
  updated_at: string;
}

export type ResourceKind = "doc" | "loom" | "link" | "file";

export interface StrategyResource {
  id: string;
  client_id: string;
  title: string;
  kind: ResourceKind;
  url?: string;
  file_path?: string; // Supabase Storage path inside `strategy-resources` bucket
  added_at: string;
  added_by?: string;
  brandable?: boolean;
}

export interface StrategyNote {
  id: string;
  client_id: string;
  content: string;
  created_at: string;
  author?: string;
}
