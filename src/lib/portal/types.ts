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
}

export interface PortalTestResult {
  name: string;
  status: "running" | "winner" | "loser" | "scheduled";
  metric: string;
  lift?: string;
  startDate: string;
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
  scope: string[];
  deliverables: PortalDeliverable[];
  documents: PortalDocument[];
  results: PortalTestResult[];
  wins: PortalWin[];
  created_at: string;
  updated_at: string;
  view_count: number;
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
