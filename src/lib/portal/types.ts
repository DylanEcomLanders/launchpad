/* ── Portal types ── */

export interface IntelligemsAssignment {
  testId: string; // Intelligems experience ID
  week: string; // e.g. "W12 — 16 Mar"
  figma_url?: string; // Optional Figma design URL for this test
}

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
  startDate?: string; // ISO date — editable phase start
  endDate?: string; // ISO date — editable phase end
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

export type TestStatus = "ideation" | "scheduled" | "live" | "complete";
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
  screenshot_url?: string;
  notes?: string;
  intelligems_test_id?: string; // Links to a specific Intelligems test for auto-metrics
  week: string; // e.g. "W12 — 18 Mar"
  startDate: string;
  endDate?: string;
  deleted_at?: string; // Soft delete
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

export interface PortalReport {
  id: string;
  title: string;
  date: string;           // ISO date e.g. "2026-03-30"
  content: string;         // HTML from mammoth extraction
  published: boolean;
  created_at: string;
}

export type BlockerType = "client" | "internal" | "external";

export interface PortalBlocker {
  type: BlockerType;
  reason: string;
  since: string; // ISO date
  resolved_at?: string; // ISO date — when blocker was cleared
  days_lost?: number; // business days the project was blocked
  /** Snapshot of phase dates before blocker was applied */
  original_phases?: { id: string; startDate?: string; endDate?: string }[];
  /** Client-friendly reason shown in portal (auto-generated if blank) */
  client_reason?: string;
}

/** History of resolved blockers — kept on the portal for timeline context */
export interface BlockerHistory {
  blocker: PortalBlocker;
  shifted_days: number;
}

/* ── Internal QA Gates ── */

export interface QAGateItem {
  label: string;
  checked: boolean;
}

export interface BriefFile {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface UploadedFile {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface QAGate {
  items: QAGateItem[];
  notes: string;
  submitted_by: string;
  submitted_at?: string;
  status: "pending" | "submitted";

  // Design brief form fields
  brief_file?: BriefFile;

  // Design handoff form fields
  figma_url?: string;
  loom_url?: string;
  extra_assets_files?: UploadedFile[];
  font_files_uploads?: UploadedFile[];
  // Legacy text fields (kept for backward compat)
  extra_assets?: string;
  font_files?: string;

  // Handoff / Testing gate fields
  testing_mode?: "we-test" | "client-test";
  intelligems_url?: string;
  staging_url?: string;
  go_live_date?: string;
  dev_lead_signoff?: boolean;
  client_approval_confirmed?: boolean;
}

export interface QAGates {
  cro_brief?: QAGate;
  design_handoff?: QAGate;
  dev_handoff?: QAGate;
  launch_prep?: QAGate;
  cro_brief_enabled?: boolean;
}

/* ── Project Flow Gates (assembly line checkpoints) ── */

export interface GateCheckItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface GateData {
  status: "not-started" | "in-progress" | "passed" | "failed";
  items: GateCheckItem[];
  notes: string;
  completed_by?: string;
  completed_at?: string;
}

export type GateKey = "design-brief" | "dev-handover" | "dev-qa" | "handoff-testing";

export type ProjectGates = Partial<Record<GateKey, GateData>>;

/* ── Project Context ── */

export interface ContextEntry {
  id: string;
  date: string;
  source: string; // "AJ voice note", "Client call", etc.
  rawTranscript: string;
  cleanVersion: string;
  created_at: string;
}

/* ── Retainer Weekly Deliverables ── */

export interface WeeklyDeliverable {
  weekStart: string; // YYYY-MM-DD (Monday)
  missionStatement?: string;
  missionStatementDate?: string;
  weeklyReport?: { title: string; content: string };
  weeklyReportDate?: string;
}

/* ── Projects (multi-project per client) ── */

export type ProjectType = "page-build" | "retainer" | "landing-page" | "cro-audit" | "other";
export type ProjectStatus = "active" | "complete" | "paused";

export interface PortalProject {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  created_at: string;

  // Page build fields (linear timeline)
  phases?: PortalPhase[];
  deliverables?: PortalDeliverable[];
  current_phase?: string;
  progress?: number;

  // Retainer fields (cyclical)
  testing_tier?: TestingTier | null;

  // Shared
  scope?: ScopeItem[];
  documents?: PortalDocument[];

  // Internal (not client-facing)
  qa_gates?: QAGates;
  gates?: ProjectGates;
  context_entries?: ContextEntry[];
  weekly_deliverables?: WeeklyDeliverable[];
}

export type ClientType = "retainer" | "regular";

export interface PortalData {
  id: string;
  token: string;
  client_name: string;
  client_email: string;
  client_type: ClientType; // Drives entire portal UX
  project_type: string; // Legacy — kept for backward compat
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
  intelligems_selected_tests?: string[]; // Legacy — IDs only
  intelligems_assignments?: IntelligemsAssignment[]; // Assigned tests with week + figma
  wins: PortalWin[];
  show_results: boolean;
  slack_channel_url: string; // External (client-facing) Slack channel ID
  slack_internal_channel_id?: string; // Internal team Slack channel ID
  ad_hoc_requests: AdHocRequest[];
  reports?: PortalReport[];
  blocker?: PortalBlocker | null;
  blocker_history?: BlockerHistory[];
  created_at: string;
  updated_at: string;
  view_count: number;
  deleted_at?: string | null; // ISO date — soft delete (trash bin)
  team_member_ids?: string[]; // IDs from settings.team — who's working on this client

  // Client-level context (not tied to a specific project)
  context_entries?: ContextEntry[];

  // Multi-project support
  projects: PortalProject[];
}

export type PortalInsert = Omit<PortalData, "id" | "token" | "created_at" | "updated_at" | "view_count" | "projects"> & { projects?: PortalProject[]; client_type?: ClientType };

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
