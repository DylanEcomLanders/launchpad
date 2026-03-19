/* ── Portal types ── */

export type PhaseStatus = "complete" | "in-progress" | "upcoming";
export type DeliverableStatus = "complete" | "in-progress" | "not-started";

export interface PortalPhase {
  id: string;
  name: string;
  status: PhaseStatus;
  dates: string;
  description: string;
  tasks: number;
  completed: number;
  deadline?: string; // ISO date — used for dashboard deadline tracking
  completedDate?: string; // ISO date — set when phase marked complete
}

export interface PortalDeliverable {
  id: string;
  name: string;
  phase: string; // phase name reference
  status: DeliverableStatus;
  assignee: string;
}

export interface PortalDocument {
  name: string;
  type: "Roadmap" | "Scope" | "Agreement" | "QA Checklist" | "Other";
  date: string;
  url?: string; // link to downloadable file
}

export type ScopeItem = string | { description: string; type: string };

export type TestStatus = "scheduled" | "live" | "complete";
export type TestResult = "winner" | "loser" | "inconclusive";
export type TestingTier = "T1" | "T2" | "T3"; // 1/week, 2/week, 4/week

export interface MetricSnapshot {
  a?: string; // Variant A (control)
  b?: string; // Variant B
}

export interface PortalTestResult {
  id: string;
  name: string;
  status: TestStatus;
  result?: TestResult;
  metric: string;
  cvr?: MetricSnapshot;
  aov?: MetricSnapshot;
  rpv?: MetricSnapshot;
  figma_url?: string;
  week: string; // e.g. "W12 — 18 Mar"
  startDate: string;
  endDate?: string;
}

export interface PortalWin {
  id: string;
  title: string;
  metric: string;
  before: string;
  after: string;
  lift: string;
  date: string;
  description: string;
}

export interface AdHocRequest {
  id: string;
  title: string;
  description: string;
  requested_at: string;
  status: "open" | "in-progress" | "done";
  created_by: string;
}

export type BlockerType = "client" | "internal" | "external";

export interface PortalBlocker {
  type: BlockerType;
  reason: string;
  since: string; // ISO date
}

export interface PortalData {
  id: string;
  token: string;
  client_name: string;
  client_email: string;
  project_type: string;
  current_phase: string;
  progress: number;
  next_touchpoint: { date: string; description: string };
  phases: PortalPhase[];
  scope: ScopeItem[];
  deliverables: PortalDeliverable[];
  documents: PortalDocument[];
  results: PortalTestResult[];
  testing_tier?: TestingTier | null;
  intelligems_key?: string;
  intelligems_selected_tests?: string[]; // IDs of Intelligems tests we're running (cherry-picked)
  wins: PortalWin[];
  show_results: boolean;
  slack_channel_url: string;
  ad_hoc_requests: AdHocRequest[];
  blocker?: PortalBlocker | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  deleted_at?: string | null; // ISO date — soft delete (trash bin)
}

export type PortalInsert = Omit<PortalData, "id" | "token" | "created_at" | "updated_at" | "view_count">;

/* ── Updates ── */

export interface PortalUpdate {
  id: string;
  portal_id: string;
  title: string;
  description: string;
  loom_url: string;
  posted_by: string;
  created_at: string;
}

export type PortalUpdateInsert = Omit<PortalUpdate, "id" | "created_at">;

/* ── Approvals ── */

export type ApprovalType = "deliverable" | "phase";

export interface PortalApproval {
  id: string;
  portal_id: string;
  approval_type: ApprovalType;
  reference_id: string; // deliverable id or phase id
  approved_by: string;
  comment: string;
  approved_at: string;
}

export type PortalApprovalInsert = Omit<PortalApproval, "id" | "approved_at">;
