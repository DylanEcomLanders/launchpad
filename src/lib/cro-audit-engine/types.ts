export interface ScorecardItem {
  area: string;
  rating: "strong" | "average" | "weak";
}

export interface AuditIssue {
  id: string;
  title: string;
  severity: "critical" | "high" | "quick-win";
  subtitle: string;
  problem: string;
  fix: string;
}

export interface AuditReport {
  id: string;
  token: string;
  brand_name: string;
  url: string;
  status: "draft" | "published";
  executive_summary: string;
  not_saying: string; // "What This Audit Is Not Saying" section
  scorecard: ScorecardItem[];
  issues: AuditIssue[];
  priority_order: string[];
  screenshot_url: string;
  whatsapp_link: string;
  booking_link: string;
  opened_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}
