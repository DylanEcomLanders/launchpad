/* ── Finance module types ──
 * Receivables (invoices issued), payables (expenses), documents bucket,
 * company profile. All stored as jsonb blobs in finance_* tables.
 */

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "disputed";

export type VatTreatment =
  | "uk_standard"        // 20% added (UK B2B/B2C)
  | "reverse_charge"     // Non-UK B2B, customer accounts for VAT
  | "zero_rated"         // Non-UK B2C / outside scope
  | "not_registered"     // We aren't VAT registered (current state)
  | "manual";            // Manual override, see vat_amount_override

export interface InvoiceLineItem {
  id: string;
  type: "deliverable" | "custom";
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceIssued {
  id: string;
  invoice_number: string;        // e.g. INV-2026-001
  client_name: string;
  contact_name?: string;
  client_email?: string;
  client_address?: string;
  client_country: string;        // ISO2, defaults "GB"
  invoice_date: string;          // YYYY-MM-DD
  due_date: string;              // YYYY-MM-DD
  payment_term?: string;
  items: InvoiceLineItem[];
  vat_treatment: VatTreatment;
  vat_amount_override?: number;  // only used when vat_treatment === "manual"
  bank_name?: string;
  account_name?: string;
  sort_code?: string;
  account_number?: string;
  notes?: string;
  status: InvoiceStatus;
  sent_date?: string;
  paid_date?: string;
  disputed_at?: string;
  disputed_reason?: string;
  pdf_url?: string;              // signed URL or storage path
  pdf_path?: string;             // raw storage path for signing later
  /* Optional external attachment (signed PO, payment confirmation,
   * contract reference, etc). Separate from the auto-generated PDF. */
  attachment_url?: string;
  attachment_path?: string;
  attachment_name?: string;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory =
  | "team_salary"
  | "contractor"
  | "software"
  | "office"
  | "marketing"
  | "professional_services"
  | "travel"
  | "tax"
  | "other";

export type RecurringFrequency = "monthly" | "quarterly" | "annual";

export type ExpenseStatus = "due" | "paid" | "overdue";

export interface Expense {
  id: string;
  supplier_name: string;
  description?: string;
  category: ExpenseCategory;
  amount: number;                // Gross amount paid/owed
  vat_included: boolean;
  vat_amount?: number;           // Input VAT we can reclaim (if VAT registered)
  date_due: string;              // YYYY-MM-DD
  date_paid?: string;
  status: ExpenseStatus;
  recurring?: RecurringFrequency;
  recurring_next_date?: string;  // next projected occurrence
  file_url?: string;
  file_path?: string;
  file_name?: string;
  notes?: string;
  /* migration breadcrumbs */
  legacy_source?: "company_invoices" | "tools_expenses";
  legacy_id?: string;
  created_at: string;
  updated_at: string;
}

export type DocumentCategory =
  | "bank_statement"
  | "tax_document"
  | "contract"
  | "receipt"
  | "other";

export interface FinanceDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  tags: string[];
  document_date?: string;        // YYYY-MM-DD — date the doc itself represents
  file_url: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: "default";                 // single-row table, fixed id
  legal_name: string;
  address_lines: string[];
  company_number: string;
  vat_number: string | null;
  vat_registered: boolean;
  email?: string;
  website?: string;
  default_bank_name?: string;
  default_account_name?: string;
  default_sort_code?: string;
  default_account_number?: string;
  default_payment_term?: string;
  created_at: string;
  updated_at: string;
}

/* ── Display / labelling ── */

/* "Due" is the label, "sent" is the underlying status value. We keep
 * sent_date as the field name since it captures when we sent it; the
 * label change is a vocabulary fix for the founder. */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Due",
  paid: "Paid",
  overdue: "Overdue",
  disputed: "Disputed",
};

export const INVOICE_STATUS_BADGE: Record<
  InvoiceStatus,
  { bg: string; text: string; dot: string }
> = {
  draft: { bg: "#F3F3F5", text: "#7A7A7A", dot: "#A0A0A0" },
  sent: { bg: "#E0E7FF", text: "#3730A3", dot: "#6366F1" },
  paid: { bg: "#D1FAE5", text: "#047857", dot: "#10B981" },
  overdue: { bg: "#FEE2E2", text: "#B91C1C", dot: "#EF4444" },
  disputed: { bg: "#FEF3C7", text: "#92400E", dot: "#D97706" },
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  team_salary: "Team Salary",
  contractor: "Contractor",
  software: "Software / SaaS",
  office: "Office",
  marketing: "Marketing",
  professional_services: "Professional Services",
  travel: "Travel",
  tax: "Tax",
  other: "Other",
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  bank_statement: "Bank Statement",
  tax_document: "Tax Document",
  contract: "Contract",
  receipt: "Receipt",
  other: "Other",
};

export const VAT_TREATMENT_LABELS: Record<VatTreatment, string> = {
  uk_standard: "UK standard (20%)",
  reverse_charge: "Reverse charge (non-UK B2B)",
  zero_rated: "Zero-rated (outside scope)",
  not_registered: "Not VAT registered",
  manual: "Manual override",
};
