/* ── Company module types ──
 * People, invoices, hiring (open roles + candidates).
 * Stored as jsonb blobs in company_* tables via createStore().
 */

export type EmploymentType = "employee" | "contractor";
export type PersonStatus = "active" | "on_leave" | "notice" | "left";
export type CompensationType = "salary" | "day_rate" | "hourly" | "monthly_retainer";
export type PaymentFrequency = "monthly" | "weekly" | "per_invoice";
export type PaymentMethod = "bank_transfer" | "wise" | "other";
export type TaxStatus = "PAYE" | "self_employed" | "ltd_company";

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
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  date_of_birth?: string;
  notes?: string;

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

export const CANDIDATE_COLUMNS: { id: CandidateStatus; label: string }[] = [
  { id: "applied", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "hired", label: "Hired" },
];
