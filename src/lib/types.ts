export interface TimeEntry {
  id: string;
  dev_name: string;
  client_name: string;
  project_name: string;
  hours: number;
  date: string;
  description: string;
  invoiced: boolean;
  dev_rate: number;
  client_rate: number;
  created_at: string;
}

export interface TimeEntryInsert {
  dev_name: string;
  client_name: string;
  project_name: string;
  hours: number;
  date: string;
  description: string;
}

export interface DashboardMetrics {
  totalHours: number;
  internalCost: number;
  clientBillable: number;
  invoicedAmount: number;
  uninvoicedAmount: number;
  margin: number;
}

export interface Filters {
  clientName: string;
  devName: string;
  invoicedStatus: "all" | "invoiced" | "uninvoiced";
  month: string; // "YYYY-MM" format
}

export interface Expense {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: "monthly" | "yearly" | "one-off";
  status: "needed" | "review" | "cut";
  notes: string;
  created_at: string;
}

export interface ExpenseInsert {
  name: string;
  category: string;
  amount: number;
  frequency: "monthly" | "yearly" | "one-off";
  status: "needed" | "review" | "cut";
  notes: string;
}

// ── CRO Test Monitor ────────────────────────────────────────────

export type CroTestStatus = "live" | "paused" | "winner" | "loser" | "inconclusive";

export interface CroTest {
  id: string;
  client_name: string;
  test_name: string;
  status: CroTestStatus;
  start_date: string;
  variant_name: string;
  hypothesis: string;
  cvr_control: number;
  cvr_variant: number;
  rpv_control: number;
  rpv_variant: number;
  aov_control: number;
  aov_variant: number;
  stat_sig: number;
  sample_size: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CroTestInsert {
  client_name: string;
  test_name: string;
  variant_name: string;
  hypothesis: string;
  start_date: string;
}

// ── Prospect Scraper ────────────────────────────────────────────

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Prospect {
  url: string;
  brandName: string;
  isShopify: boolean;
  emails: string[];
  socialLinks: SocialLink[];
  productCount: number;
  priceRange: { min: number; max: number } | null;
  apps: string[];
  hasReviews: boolean;
  hasSubscriptions: boolean;
  hasBNPL: boolean;
  revenueScore: number;
  crawlError?: string;
}

// ── CRO Audit ───────────────────────────────────────────────────

export interface AuditSection {
  title: string;
  analysis: string;
  rating: "strong" | "moderate" | "weak";
}

export interface AuditResult {
  verdict: {
    winner: "variant" | "control" | "mixed";
    summary: string;
  };
  sections: AuditSection[];
  quickWins: string[];
  predictedImpact: string;
}
