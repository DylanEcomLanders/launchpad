/* ── Agreements data layer ──
 * Wraps createStore() for both tables. Pattern matches rd/data.ts and
 * company/data.ts. Multi-team-member writes go through create/update/
 * remove only — never saveAll — per the MEMORY rule on additive sync.
 */

import { createStore } from "@/lib/supabase-store";
import type { Agreement, AgreementTemplate, AgreementKind } from "./types";
import { DEFAULT_NDA_TEMPLATE, DEFAULT_CONTRACT_TEMPLATE } from "./defaults";

export const agreementStore = createStore<Agreement>({
  table: "company_agreements",
  lsKey: "launchpad-company-agreements",
});

export const templateStore = createStore<AgreementTemplate>({
  table: "company_agreement_templates",
  lsKey: "launchpad-company-agreement-templates",
});

/* ── Helpers ──────────────────────────────────────────────────── */

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
export function nowISO(): string {
  return new Date().toISOString();
}
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/* Revision tags. Bump CURRENT_*_REVISION whenever defaults.ts changes
 * in a way you want existing un-customised templates to pick up. The
 * ensureTemplate auto-upgrade below replaces ANY template whose
 * revision matches a known-stale tag, but leaves custom edits alone
 * (their revision will be a manually-set string set in the editor). */
const STALE_REVISIONS = new Set([
  "v1.0 – seeded default",
]);
const CURRENT_CONTRACT_REVISION = "v2.0 – contractor agreement 2026-06-22";
const CURRENT_NDA_REVISION = "v1.0 – seeded default"; /* unchanged */

/* Find or create the active template for a kind. If no row exists for
 * that kind yet, seeds one with the default content from defaults.ts
 * so the templates editor isn't staring at a blank page on first run.
 * If an existing row is at a known-stale revision (= unedited
 * default), upgrade it in place. Custom edits (= unknown revision
 * string) are left untouched. */
export async function ensureTemplate(kind: AgreementKind): Promise<AgreementTemplate> {
  const all = await templateStore.getAll();
  /* Pick the most recently updated row of this kind. The data layer
   * returns rows in descending created_at order so the first hit is
   * already the newest, but checking updated_at handles edits too. */
  const existing = all
    .filter((t) => t.kind === kind)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))[0];

  const currentRevision = kind === "contract" ? CURRENT_CONTRACT_REVISION : CURRENT_NDA_REVISION;
  const currentBody =
    kind === "nda"
      ? structuredClone(DEFAULT_NDA_TEMPLATE)
      : structuredClone(DEFAULT_CONTRACT_TEMPLATE);

  if (existing) {
    /* Auto-upgrade: existing template is at a stale revision (i.e.
     * was the unedited default), so refresh its body + revision to
     * the current shipped default. Anything else (custom revision
     * string from the editor) is treated as "Dylan has edited this
     * deliberately" and left alone. */
    if (STALE_REVISIONS.has(existing.revision) && existing.revision !== currentRevision) {
      const updates = {
        body: currentBody,
        revision: currentRevision,
        updated_at: nowISO(),
      };
      const upgraded = await templateStore.update(existing.id, updates);
      return upgraded ?? { ...existing, ...updates };
    }
    return existing;
  }

  const now = nowISO();
  const seeded: AgreementTemplate = {
    id: uid(),
    kind,
    body: currentBody,
    revision: currentRevision,
    created_at: now,
    updated_at: now,
  };
  await templateStore.create(seeded);
  return seeded;
}

export async function getAgreementsForPerson(personId: string): Promise<Agreement[]> {
  const all = await agreementStore.getAll();
  return all.filter((a) => a.person_id === personId);
}

/* Create a draft contract directly from a Person, snapshotting the
 * active template + every field the Person record knows. Empty / missing
 * fields are left undefined on the row; the renderer fills them with
 * readable placeholders ("—", "[to be confirmed]") so admin can spot
 * what's missing and fill it via the inline Engagement Details panel
 * on the contract detail page.
 *
 * Used by the Add Person flow: ticking "Generate contract draft" now
 * creates the agreement inline (no extra modal), routes admin straight
 * to the preview-edit surface. */
export async function createContractDraftFromPerson(person: {
  id: string;
  full_name: string;
  email?: string;
  employment_type: "employee" | "contractor";
  job_title?: string;
  compensation_type?: string;
  compensation_amount?: number;
  compensation_currency?: string;
  payment_frequency?: string;
  start_date?: string;
}): Promise<Agreement> {
  const tpl = await ensureTemplate("contract");
  const now = nowISO();
  const agreement: Agreement = {
    id: uid(),
    kind: "contract",
    person_id: person.id,
    person_full_name: person.full_name,
    person_email: person.email,
    person_employment_type: person.employment_type,
    person_job_title: person.job_title,
    comp_type: person.compensation_type,
    comp_amount: person.compensation_amount,
    comp_currency: person.compensation_currency || "GBP",
    comp_frequency: person.payment_frequency || "monthly",
    start_date: person.start_date || todayISO(),
    template_revision: tpl.revision,
    template_body: structuredClone(tpl.body),
    status: "draft",
    created_at: now,
    updated_at: now,
  };
  await agreementStore.create(agreement);
  return agreement;
}
