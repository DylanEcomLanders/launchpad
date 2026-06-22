/* ── Company module types ──
 * People, invoices, hiring (open roles + candidates).
 * Stored as jsonb blobs in company_* tables via createStore().
 */

export type EmploymentType = "employee" | "contractor";
/* status now includes the onboarding + offboarding phases so we can
 * drive the 30-day clock + active checklist from the Person status
 * itself rather than a parallel flag. Order matters in the picker. */
export type PersonStatus =
  | "onboarding"
  | "active"
  | "on_leave"
  | "notice"
  | "offboarding"
  | "left";
export type CompensationType = "salary" | "day_rate" | "hourly" | "monthly_retainer";
export type PaymentFrequency = "monthly" | "weekly" | "per_invoice";
export type PaymentMethod = "bank_transfer" | "wise" | "other";
export type TaxStatus = "PAYE" | "self_employed" | "ltd_company";

/* Engagement type drives the bonus scheme. Three values cover the
 * reality today (spine team on retainer + per-page contractors + the
 * inner circle on revenue-share). Direct employees aren't a category
 * yet; add 'employee' here when we make a first hire. */
export type EngagementType =
  | "core_retainer"        // revenue-tier bonus (100k/150k/200k)
  | "contractor_retainer"  // contractor scheme retainer bonuses (max +33%/mo)
  | "contractor_per_page"; // contractor scheme per-page bonuses (max +25%/build)

/* Standard team-member onboarding task. The default checklist is
 * seeded when status flips to 'onboarding'; admin can mark items
 * done_at via the Onboarding tab. due_offset_days is relative to
 * onboarding_started_at so the same template works for any start
 * date. order is purely for display. */
export interface OnboardingTask {
  id: string;
  title: string;
  description?: string;
  order: number;
  due_offset_days: number;
  done_at?: string; // YYYY-MM-DD when marked complete
}

/* Per-scoring-period record for the contractor scheme (see the
 * contractor scheme doc). Lives nested on Person.scoring_periods so
 * the rolling history is right next to the rest of the HR record;
 * no separate table needed. */
export type ScoringLever = "speed" | "quality" | "retention";
export type ScoringSource = "auto_kanban" | "auto_retention" | "manual";
export type ScoringStatus = "draft" | "locked" | "disputed" | "resolved";

export interface ScoringEntry {
  id: string;
  lever: ScoringLever;
  /* Short label shown in the breakdown e.g. "Delivered early - h-live1". */
  label: string;
  /* Percentage points applied to the contractor fee. Positive = bonus,
   * negative = deduction. Range is roughly ±15 per entry. */
  delta_pct: number;
  source: ScoringSource;
  /* For auto entries, the kanban task id / retention client id that
   * produced this signal. Lets the breakdown row link back to the
   * evidence. */
  evidence_ref?: string;
  /* Free-text reason on manual adjustments. */
  reason?: string;
  added_at: string; // ISO
}

/* One paid bonus. Logged whenever a bonus is settled - contractor
 * scheme final %, revenue-tier milestone, or an ad-hoc one-off. Lives
 * in Person.bonus_payments[] as an append-only audit trail; the
 * Bonuses tab on Person renders them in reverse-chronological order
 * and the Inbox surfaces "bonuses due" until they're marked paid. */
export type BonusKind =
  | "revenue_tier"       // Core retainer hits a monthly revenue milestone
  | "contractor_scheme"  // Locked scoring period worth a contractor scheme delta
  | "adhoc";             // Founder discretion, holiday, project bonus, etc.

export interface BonusPayment {
  id: string;
  kind: BonusKind;
  amount: number;
  currency: string;
  /* ISO YYYY-MM-DD. The day the payment was authorised / sent. */
  paid_at: string;
  /* Free-text reason. For contractor_scheme this is the scoring
   * period label; for revenue_tier it's the milestone label
   * ("100k month, May"); for adhoc it's whatever the founder typed. */
  reason: string;
  /* Optional tier marker for revenue_tier bonuses (100 / 150 / 200)
   * so the UI can show "first time at 150k". */
  tier?: 100 | 150 | 200;
  /* Optional FK back into Person.scoring_periods for contractor_scheme
   * payments so the audit chain is provable. */
  scoring_period_id?: string;
  /* Who logged the payment. Free text for now since auth identity is
   * lightweight here; "Dylan" or admin email. */
  paid_by: string;
  created_at: string;
}

export interface ScoringPeriod {
  id: string;
  /* For per-page contractors: the kanban task id this scores. For
   * retainer contractors: YYYY-MM. Lets us key on period naturally. */
  period_key: string;
  scheme: "per_page" | "retainer";
  entries: ScoringEntry[];
  /* Final delta after caps (+25/-30 per-page, +33/-30 retainer)
   * computed at lock time and frozen. Null when status is draft. */
  final_delta_pct?: number;
  status: ScoringStatus;
  locked_at?: string;
  locked_by?: string;
  disputed_at?: string;
  disputed_reason?: string;
  resolved_at?: string;
  resolved_by?: string;
  /* Invoice this was attached to at lock time. Lets the per-person
   * invoices view show "scored against INV-2026-042". */
  invoice_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CompensationChange {
  id: string;
  changed_at: string; // YYYY-MM-DD
  old_amount: number | null;
  new_amount: number;
  reason: string;
}

export interface Review {
  id: string;
  reviewer: string;
  review_date: string;
  rating: string; // "1"–"5" or letter grade
  summary: string;
  notes: string;
  created_at: string;
}

export type GoalStatus = "not_started" | "in_progress" | "done" | "dropped";

export interface Goal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  status: GoalStatus;
  review_id?: string;
  created_at: string;
}

export interface PersonNote {
  id: string;
  author: string;
  content: string;
  tags: string[];
  created_at: string;
}

export interface Person {
  id: string;
  // Overview
  full_name: string;
  preferred_name?: string;
  avatar_url?: string;
  job_title?: string;
  department?: string;
  reports_to?: string; // person.id
  employment_type: EmploymentType;
  status: PersonStatus;
  start_date?: string;
  end_date?: string;
  email?: string;
  phone?: string;
  location?: string;
  date_of_birth?: string;
  notes?: string;

  /* Bridge to the pods-v2 PodMember record. Drives the per-person KPI
   * tab (resolves kanban tasks assigned to this human) and stops
   * settings.team / pods_v2_pods / company_people drifting apart. Set
   * via the picker on the Overview tab; nullable for humans not on a
   * delivery pod (founders, ops, hires before first pod assignment). */
  pod_member_id?: string;

  /* Engagement type drives the bonus scheme + which Financial tab UI
   * surfaces. core_retainer gets the revenue-tier inputs; the two
   * contractor types get the contractor-scheme scoring engine. */
  engagement_type?: EngagementType;

  /* Onboarding state. Seeded with the default checklist when status
   * flips to 'onboarding'. The 30-day clock runs from onboarding_started_at
   * (defaults to start_date when present). */
  onboarding_started_at?: string;        // YYYY-MM-DD
  onboarding_completed_at?: string;       // YYYY-MM-DD - all tasks ticked
  onboarding_checklist?: OnboardingTask[];

  // Financial
  compensation_type?: CompensationType;
  compensation_amount?: number;
  compensation_currency?: string;
  payment_frequency?: PaymentFrequency;
  payment_method?: PaymentMethod;
  bank_details?: string;
  tax_status?: TaxStatus;
  company_name?: string;
  utr_or_company_number?: string;
  compensation_history?: CompensationChange[];

  /* Revenue-tier bonus structure. Only used when engagement_type ===
   * 'core_retainer'. Each amount is paid when monthly revenue first
   * crosses the milestone; cleared when revenue retreats below for a
   * full month. Currency follows compensation_currency. */
  bonus_tier_100k?: number;
  bonus_tier_150k?: number;
  bonus_tier_200k?: number;

  /* Rolling per-period scoring under the contractor scheme. Only used
   * when engagement_type is contractor_retainer or contractor_per_page.
   * Each entry is one build (per_page) or one month (retainer). */
  scoring_periods?: ScoringPeriod[];

  /* Bonus payment log. Every bonus ever paid to this person, regardless
   * of kind (revenue-tier milestone, contractor scheme period, ad-hoc).
   * Append-only from the UI - editing past payments would muddy the
   * audit trail. */
  bonus_payments?: BonusPayment[];

  // Performance
  reviews?: Review[];
  goals?: Goal[];
  performance_notes?: PersonNote[];

  // Org chart positions
  chart_position_x?: number;
  chart_position_y?: number;

  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = "pending" | "paid" | "overdue" | "disputed";
export type InvoiceCategory = "software" | "contractor" | "service" | "other";

export interface InvoiceStatusChange {
  id: string;
  old_status: InvoiceStatus | null;
  new_status: InvoiceStatus;
  changed_at: string;
}

export interface Invoice {
  id: string;
  invoice_number?: string;
  supplier_name: string;
  linked_person_id?: string;
  issue_date?: string;
  due_date?: string;
  paid_date?: string;
  amount: number;
  currency: string;
  category?: InvoiceCategory;
  status: InvoiceStatus;
  file_url?: string;
  file_name?: string;
  notes?: string;
  status_history?: InvoiceStatusChange[];
  created_at: string;
  updated_at: string;
}

export type RoleStatus = "open" | "filled" | "closed";

export interface OpenRole {
  id: string;
  title: string;
  department?: string;
  employment_type: EmploymentType;
  status: RoleStatus;
  description?: string;
  date_opened: string;
  created_at: string;
}

export type CandidateStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export interface CandidateNote {
  id: string;
  content: string;
  created_at: string;
}

export interface Candidate {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  role_id?: string;
  source?: string;
  status: CandidateStatus;
  cv_url?: string;
  cv_name?: string;
  notes?: string;
  candidate_notes?: CandidateNote[];
  date_added: string;
  created_at: string;
  updated_at: string;
}

export const DEPARTMENTS = [
  "Leadership",
  "Design",
  "Development",
  "Account Management",
  "Strategy",
  "Operations",
  "Marketing",
] as const;

export const DEPARTMENT_COLORS: Record<string, string> = {
  Leadership: "#1B1B1B",
  Design: "#7C3AED",
  Development: "#0EA5E9",
  "Account Management": "#16A34A",
  Strategy: "#D97746",
  Operations: "#EAB308",
  Marketing: "#EC4899",
};

/* Color flows cold → warm → green so the eye can read pipeline
 * temperature without parsing the label. Matches the kanban phase
 * dot pattern across the app. */
export const CANDIDATE_COLUMNS: {
  id: CandidateStatus;
  label: string;
  color: string;
}[] = [
  { id: "applied",   label: "Applied",   color: "#6366F1" }, // indigo
  { id: "screening", label: "Screening", color: "#3B82F6" }, // blue
  { id: "interview", label: "Interview", color: "#F59E0B" }, // amber
  { id: "offer",     label: "Offer",     color: "#FB923C" }, // orange
  { id: "hired",     label: "Hired",     color: "#10B981" }, // green
];
