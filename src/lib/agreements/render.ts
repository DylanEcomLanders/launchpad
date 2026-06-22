/* ── Agreement rendering ──
 * Resolves {{ placeholders }} in clause body / intro / outro text
 * against an Agreement's snapshotted person + comp fields. Also
 * filters out clauses whose `only_for` employment type doesn't match.
 *
 * Why snapshot-based: the rendered document the team member sees and
 * signs has to be reproducible from the row alone, even months later
 * when the master template has been edited. So we resolve placeholders
 * from the Agreement row's own fields (person_full_name, comp_amount
 * etc.), never from the live peopleStore.
 */

import type { Agreement, Clause, TemplateBody } from "./types";

/* Format helpers — kept inline so the render layer has zero deps on
 * the rest of the app's date/money utils. */
function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
function fmtMoney(n?: number, currency = "GBP"): string {
  if (n == null || !Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}

export function buildPlaceholderMap(agreement: Agreement): Record<string, string> {
  return {
    person_full_name: agreement.person_full_name,
    person_email: agreement.person_email || "—",
    person_job_title: agreement.person_job_title || "—",
    person_employment_type:
      agreement.person_employment_type === "employee" ? "employee" : "contractor",
    start_date: fmtDate(agreement.start_date),
    effective_date: fmtDate(agreement.created_at),
    /* Today's date in the contract preamble ("THIS AGREEMENT is dated...").
     * Falls back to created_at if missing. */
    agreement_date: fmtDate(agreement.created_at),
    comp_amount: agreement.comp_amount != null
      ? fmtMoney(agreement.comp_amount, agreement.comp_currency || "GBP").replace(/[£$€]/, "")
        .replace(/,/g, ",")
        .trim()
      : "—",
    /* comp_amount above strips the currency symbol because the
     * template renders the symbol separately as {{ comp_currency }}.
     * Keeps the placeholder swap less brittle. */
    comp_currency: agreement.comp_currency || "GBP",
    comp_frequency:
      agreement.comp_frequency === "monthly"
        ? "month"
        : agreement.comp_frequency === "weekly"
        ? "week"
        : agreement.comp_frequency === "per_invoice"
        ? "invoice"
        : agreement.comp_frequency || "month",
    /* New Engagement Schedule placeholders. Admin can override per
     * agreement when richer fields land on the row; for now sensible
     * defaults keep the rendered doc readable rather than littered
     * with raw {{ placeholders }}. */
    contractor_company: agreement.contractor_company || "N/A (sole trader)",
    contractor_address: agreement.contractor_address || "[to be confirmed]",
    operating_as: agreement.operating_as || "Sole trader",
    reporting_to: agreement.reporting_to || "Dylan Evans",
    services_description:
      agreement.services_description ||
      "Conversion design, development, strategy and / or CSM work as agreed on assignment.",
    vat_status: agreement.vat_status || "Not VAT registered",
    restriction_months: agreement.restriction_months
      ? String(agreement.restriction_months)
      : "6",
  };
}

/* Replace {{ key }} (with any whitespace around the key) with the
 * matching value from the map. Unknown keys are left intact so a typo
 * in a template is visible rather than silently empty. */
export function resolvePlaceholders(text: string, map: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(map, key) ? map[key] : `{{ ${key} }}`,
  );
}

/* Filter clauses by employment_type gate, then resolve placeholders
 * in each clause's body. Returns a render-ready list the UI can map
 * straight into <article> rows. */
export function renderClauses(agreement: Agreement): Clause[] {
  const map = buildPlaceholderMap(agreement);
  const visible = agreement.template_body.clauses.filter((c) => {
    if (!c.only_for) return true;
    return c.only_for === agreement.person_employment_type;
  });
  return visible.map((c) => ({
    ...c,
    body: resolvePlaceholders(c.body, map),
  }));
}

export function renderIntro(agreement: Agreement): string {
  const map = buildPlaceholderMap(agreement);
  return resolvePlaceholders(agreement.template_body.intro, map);
}
export function renderOutro(agreement: Agreement): string {
  const map = buildPlaceholderMap(agreement);
  return resolvePlaceholders(agreement.template_body.outro, map);
}
export function renderTitle(agreement: Agreement): string {
  return agreement.template_body.title;
}

/* Reused by both the public signing page and the admin detail view.
 * Returns everything the UI needs to draw the rendered document
 * without re-walking the agreement structure each time. */
export interface RenderedDocument extends Pick<TemplateBody, "title"> {
  title: string;
  intro: string;
  outro: string;
  clauses: Clause[];
}
export function renderDocument(agreement: Agreement): RenderedDocument {
  return {
    title: renderTitle(agreement),
    intro: renderIntro(agreement),
    outro: renderOutro(agreement),
    clauses: renderClauses(agreement),
  };
}
