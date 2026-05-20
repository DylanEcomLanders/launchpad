/* ── Finance module types ──
 * Receivables (invoices issued), payables (expenses), documents bucket,
 * company profile. All stored as jsonb blobs in finance_* tables.
 */

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"     // derived from due_date passing
  | "disputed"   // parked, being corrected
  | "void";      // cancelled, will not be paid

export type InvoicePaymentMethod = "online" | "bank_transfer";

/* Currency codes seen historically across Stripe / Wise / Whop / direct. */
export type InvoiceCurrency = "GBP" | "USD" | "EUR" | "AUD" | "CAD";

/* Where the invoice (or its payment) originated. Used for reconciliation
 * against bank deposits and source-system transactions. */
export type InvoiceSourceSystem =
  | "stripe"
  | "wise"
  | "whop"
  | "direct"   // founder-issued, not via a payment processor
  | "manual";  // legacy / hand-recorded

export type BankAccountReceivedInto =
  | "tide"
  | "wise_gbp"
  | "wise_usd"
  | "wise_eur"
  | "whop_balance"
  | "other";

/* ── Clients ──
 * Master list of clients we invoice. Each InvoiceIssued references
 * a Client via client_id AND snapshots the relevant fields onto the
 * invoice itself (so historical PDFs render unchanged when a client
 * updates their address). */
export interface Client {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  address?: string;
  country: string;   // ISO2, defaults "GB"
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type VatTreatment =
  | "standard_20"            // 20% added on top of line item prices
  | "inclusive_20"           // 20% baked into the entered prices, extracted for HMRC
  | "outside_scope"          // Outside scope of UK VAT (e.g. export, certain digital services)
  | "reverse_charge"         // Non-UK B2B, customer accounts for VAT
  | "zero_rated"             // Zero-rated supply
  | "exempt"                 // VAT-exempt supply
  | "pre_vat_registration"   // Issued before company was VAT registered
  | "manual";                // Manual override, see vat_amount_override

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

  /* ── Client ──
   * client_id is the FK into finance_clients. The snapshot fields below
   * are populated from the client at issue time so historical PDFs stay
   * accurate when the client's address changes. */
  client_id?: string;
  client_name: string;
  contact_name?: string;
  client_email?: string;
  client_address?: string;
  client_country: string;        // ISO2, defaults "GB"

  /* ── Dates ── */
  invoice_date: string;          // YYYY-MM-DD (the "issue_date" in the spec)
  due_date: string;              // YYYY-MM-DD
  paid_date?: string;            // (the "payment_date" in the spec)

  /* ── Pricing ──
   * gross/vat/net are snapshots written at save time. For invoices with
   * line items, computed from calculateVatBreakdown. For invoices imported
   * via CSV without line items, populated directly from the import row. */
  payment_term?: string;
  items: InvoiceLineItem[];
  currency: InvoiceCurrency;             // defaults "GBP"
  gross_amount: number;                  // total payable in `currency`
  vat_amount: number;                    // VAT component in `currency`
  net_amount: number;                    // gross - vat in `currency`
  gbp_equivalent: number;                // gross in GBP (= gross_amount if currency=GBP)
  vat_treatment: VatTreatment;
  vat_amount_override?: number;          // only used when vat_treatment === "manual"

  /* ── Payment & destination ── */
  payment_method?: InvoicePaymentMethod; // defaults to "online" if undefined
  bank_name?: string;
  account_name?: string;
  sort_code?: string;
  account_number?: string;

  /* ── Source tracking & reconciliation ──
   * source_system tells us where the invoice originated; the source_id
   * + bank_account_received_into + tide_transaction_id together let us
   * reconcile against bank statements. fee_gbp captures the payment
   * processor fee deducted (Stripe / Wise / Whop) so net-after-fee
   * cashflow is accurate. */
  source_system?: InvoiceSourceSystem;
  source_transaction_id?: string;
  bank_account_received_into?: BankAccountReceivedInto;
  tide_transaction_id?: string;
  fee_gbp?: number;
  /* Client classification for VAT decision-making + segmentation. */
  client_type?: "B2B" | "B2C";

  /* ── State & metadata ── */
  notes?: string;
  status: InvoiceStatus;
  sent_date?: string;
  disputed_at?: string;
  disputed_reason?: string;
  voided_at?: string;
  voided_reason?: string;
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

export type ExpenseStatus = "due" | "paid" | "overdue" | "disputed";

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
  disputed_at?: string;
  disputed_reason?: string;
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
  default_payment_method?: InvoicePaymentMethod;
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
  void: "Void",
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
  void: { bg: "#E5E5EA", text: "#555555", dot: "#7A7A7A" },
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
  standard_20: "Standard 20% (added to prices)",
  inclusive_20: "Inclusive 20% (baked into prices)",
  outside_scope: "Outside scope of UK VAT",
  reverse_charge: "Reverse charge (non-UK B2B)",
  zero_rated: "Zero-rated",
  exempt: "Exempt",
  pre_vat_registration: "Pre-VAT registration",
  manual: "Manual override",
};
