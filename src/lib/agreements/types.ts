/* ── Team agreements (NDA + Contract) types ──
 *
 * One polymorphic table backs both kinds: `kind: 'nda' | 'contract'`
 * distinguishes them. Each agreement carries a SNAPSHOT of the master
 * template clauses so editing the template later doesn't rewrite
 * history.
 *
 * Identity model:
 *   - person_id is the soft FK into company_people. Snapshot fields
 *     (person_full_name, person_email, etc.) are written at creation
 *     so a person row rename doesn't break a signed document.
 *
 * Counter-sign:
 *   - Team member signs first via /portal/<kind>/[id]. Submission
 *     flips status from 'sent' to 'team_signed' and writes
 *     team_signed_* fields.
 *   - Dylan counter-signs via /company/contracts/[id]. Submission
 *     flips status to 'counter_signed', then 'active' on save.
 */

import type { EmploymentType } from "@/lib/company/types";

export type AgreementKind = "nda" | "contract";

export type AgreementStatus =
  | "draft"            // created in admin, not yet shared
  | "sent"             // signing link copied/shared; awaiting team member
  | "team_signed"      // member submitted; awaiting Dylan's counter-sign
  | "counter_signed"   // Dylan signed; document is final
  | "active"           // in effect (same as counter_signed for now)
  | "terminated";      // ended after being active

export interface Clause {
  /* Stable id helps the templates editor reorder / target individual
   * clauses without diffing by position. */
  id: string;
  heading: string;
  /* Plain text body. Mustache-style {{ placeholders }} get resolved at
   * render time against the agreement's snapshotted person data. */
  body: string;
  /* Optional conditional gate. If set, this clause is only included
   * when the agreement's employment_type matches. Lets one template
   * cover both employee and contractor variants. */
  only_for?: EmploymentType;
}

export interface TemplateBody {
  /* Document title shown at the top of the rendered page. */
  title: string;
  /* Optional intro paragraph rendered between the header and the
   * numbered clauses. */
  intro: string;
  clauses: Clause[];
  /* Optional closing paragraph (e.g. "By signing below..."). */
  outro: string;
}

export interface AgreementTemplate {
  id: string;
  kind: AgreementKind;
  body: TemplateBody;
  /* Free-text revision label for the admin to track edits ("v1.0 –
   * initial draft", "v1.1 – tightened IP clause", etc.). */
  revision: string;
  created_at: string;
  updated_at: string;
}

export interface Agreement {
  id: string;
  kind: AgreementKind;
  person_id: string;
  /* ── Person snapshot at creation ──────────────────────────────── */
  person_full_name: string;
  person_email?: string;
  person_employment_type: EmploymentType;
  person_job_title?: string;
  /* Compensation snapshot — only populated for contracts, not NDAs. */
  comp_type?: string;
  comp_amount?: number;
  comp_currency?: string;
  comp_frequency?: string;
  start_date?: string;
  /* ── Engagement Schedule fields (Contractor Agreement v2026-06-22) ─
   * Optional, all default to readable placeholders when missing so the
   * rendered doc never shows raw {{ placeholders }}. Surface them in
   * the GenerateAgreementsModal when richer per-contract capture is
   * needed; for now sensible defaults keep new contracts shippable. */
  contractor_company?: string;       // Limited company name, if any
  contractor_address?: string;       // Postal address
  operating_as?: string;             // "Sole trader" | "Limited company" | "Overseas"
  reporting_to?: string;             // Manager / lead name
  services_description?: string;     // Bullets of role-specific scope
  vat_status?: string;               // "Not VAT registered" | "VAT no. XXX"
  restriction_months?: number;       // Post-engagement non-compete window (default 6)
  /* ── Template snapshot ────────────────────────────────────────── */
  template_revision: string;
  template_body: TemplateBody;
  /* ── Lifecycle ───────────────────────────────────────────────── */
  status: AgreementStatus;
  sent_at?: string;
  team_signed_at?: string;
  team_signed_name?: string;
  team_signature_image?: string;     // base64 PNG data URL
  counter_signed_at?: string;
  counter_signed_name?: string;
  counter_signature_image?: string;  // base64 PNG data URL
  terminated_at?: string;
  terminated_reason?: string;
  /* Free-text notes Dylan can add at any stage. */
  notes?: string;
  created_at: string;
  updated_at: string;
}

/* Status display metadata — colour pairs reused by the badge component
 * across the contracts list, person detail, and the public signing
 * pages. Mirrors the shape used by company/ui status badges. */
export const AGREEMENT_STATUS_META: Record<
  AgreementStatus,
  { label: string; bg: string; fg: string }
> = {
  draft:          { label: "Draft",          bg: "#F0F0F0", fg: "#7A7A7A" },
  sent:           { label: "Sent",           bg: "#FFF7E0", fg: "#92591A" },
  team_signed:    { label: "Awaiting your sign", bg: "#FFE4D6", fg: "#9A4A1F" },
  counter_signed: { label: "Signed",         bg: "#E0EBFF", fg: "#1E40AF" },
  active:         { label: "Active",         bg: "#E8F5E9", fg: "#1F6B2B" },
  terminated:     { label: "Terminated",     bg: "#FCE4E4", fg: "#B22B2B" },
};

export const AGREEMENT_KIND_LABEL: Record<AgreementKind, string> = {
  nda: "NDA",
  contract: "Contract",
};
