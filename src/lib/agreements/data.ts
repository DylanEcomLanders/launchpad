/* ── Agreements data layer ──
 * Wraps createStore() for both tables. Pattern matches rd/data.ts and
 * company/data.ts. Multi-team-member writes go through create/update/
 * remove only — never saveAll — per the MEMORY rule on additive sync.
 */

import { createStore } from "@/lib/supabase-store";
import type { Agreement, AgreementTemplate, AgreementKind, TemplateRole } from "./types";
import { TEMPLATE_ROLE_LABEL } from "./types";
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
 * in a way you want existing un-customised templates to pick up. */
const STALE_REVISIONS = new Set([
  "v1.0 – seeded default",
]);
const CURRENT_LEADERSHIP_REVISION = "v2.0 – leadership 2026-06-22";
const CURRENT_DESIGNER_REVISION = "v1.0 – designer 2026-06-24";
const CURRENT_DEVELOPER_REVISION = "v1.0 – developer 2026-06-24";
const CURRENT_NDA_REVISION = "v1.0 – seeded default";

/* Multi-template seed. Contract has THREE role-keyed templates
 * (Leadership / Designer / Developer) seeded from the master contract
 * doc. Custom is created on demand when admin uploads a PDF - no
 * seed body. NDA has a single "default" template. */
function buildSeedTemplate(
  kind: AgreementKind,
  template_role: TemplateRole,
): AgreementTemplate {
  const now = nowISO();
  const body =
    kind === "nda"
      ? structuredClone(DEFAULT_NDA_TEMPLATE)
      : structuredClone(DEFAULT_CONTRACT_TEMPLATE);
  const revision =
    kind === "nda"
      ? CURRENT_NDA_REVISION
      : template_role === "leadership"
      ? CURRENT_LEADERSHIP_REVISION
      : template_role === "designer"
      ? CURRENT_DESIGNER_REVISION
      : template_role === "developer"
      ? CURRENT_DEVELOPER_REVISION
      : "v1.0 – custom";
  return {
    id: uid(),
    kind,
    template_role,
    name: TEMPLATE_ROLE_LABEL[template_role],
    body,
    revision,
    created_at: now,
    updated_at: now,
  };
}

/* Backfill: pre-2.3 AgreementTemplate rows have no template_role +
 * no name. Stamp the existing v2.0 contract template as "leadership"
 * (it's the docx Dylan ships as the leadership / CSM agreement) and
 * the NDA as "default". Then seed Designer + Developer copies if
 * they don't exist yet, using the same body as Leadership so admin
 * has a starting point. */
async function backfillAndSeed(all: AgreementTemplate[]): Promise<AgreementTemplate[]> {
  let mutated = false;

  /* Stamp role + name on rows missing them. */
  for (const t of all) {
    if (!t.template_role || !t.name) {
      const role: TemplateRole = t.kind === "nda" ? "default" : "leadership";
      const updates = {
        template_role: role,
        name: TEMPLATE_ROLE_LABEL[role],
        updated_at: nowISO(),
      };
      const updated = await templateStore.update(t.id, updates);
      if (updated) {
        Object.assign(t, updated);
        mutated = true;
      }
    }
  }

  /* Auto-upgrade stale-revision templates (e.g. very old un-edited
   * default) to the current shipped Leadership body. Same guard as
   * before - custom edits keep their bespoke revision string. */
  const leadership = all.find((t) => t.kind === "contract" && t.template_role === "leadership");
  if (leadership && STALE_REVISIONS.has(leadership.revision)) {
    const updates = {
      body: structuredClone(DEFAULT_CONTRACT_TEMPLATE),
      revision: CURRENT_LEADERSHIP_REVISION,
      updated_at: nowISO(),
    };
    await templateStore.update(leadership.id, updates);
    Object.assign(leadership, updates);
    mutated = true;
  }

  /* Seed the role-keyed templates that don't exist yet. NDA + the
   * three contract roles. Custom is never seeded - it's created on
   * demand by the "Upload PDF" flow. */
  const seedTargets: { kind: AgreementKind; role: TemplateRole }[] = [
    { kind: "nda", role: "default" },
    { kind: "contract", role: "leadership" },
    { kind: "contract", role: "designer" },
    { kind: "contract", role: "developer" },
  ];
  for (const { kind, role } of seedTargets) {
    const exists = all.some(
      (t) => t.kind === kind && t.template_role === role,
    );
    if (!exists) {
      const seeded = buildSeedTemplate(kind, role);
      await templateStore.create(seeded);
      all.push(seeded);
      mutated = true;
    }
  }

  if (mutated) {
    /* Re-fetch to get the canonical ordering + any server-side
     * defaults the store layer might add. */
    return await templateStore.getAll();
  }
  return all;
}

/* Find or create the active template for a (kind, role) slot. If no
 * row exists for that slot yet, seeds one. If an existing row is at
 * a known-stale revision, upgrades it. Custom edits left untouched. */
export async function ensureTemplate(
  kind: AgreementKind,
  role: TemplateRole = "leadership",
): Promise<AgreementTemplate> {
  const all = await backfillAndSeed(await templateStore.getAll());
  /* NDA always resolves to its single default. */
  const effectiveRole: TemplateRole = kind === "nda" ? "default" : role;
  const found = all
    .filter((t) => t.kind === kind && t.template_role === effectiveRole)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))[0];
  if (found) return found;
  /* Slot didn't exist + backfill didn't create one (e.g. "custom"
   * which is never auto-seeded). Create it now. */
  const seeded = buildSeedTemplate(kind, effectiveRole);
  await templateStore.create(seeded);
  return seeded;
}

/* List all templates for a kind, ordered by template_role + name. */
export async function getTemplatesForKind(
  kind: AgreementKind,
): Promise<AgreementTemplate[]> {
  const all = await backfillAndSeed(await templateStore.getAll());
  const order: TemplateRole[] = ["leadership", "designer", "developer", "custom", "default"];
  return all
    .filter((t) => t.kind === kind)
    .sort(
      (a, b) =>
        order.indexOf(a.template_role) - order.indexOf(b.template_role) ||
        a.name.localeCompare(b.name),
    );
}

/* Create a new template manually (e.g. a Custom upload variant or
 * a brand-new role template the admin wants). Body defaults to a
 * blank skeleton so the editor can fill it in. */
export async function createTemplate(input: {
  kind: AgreementKind;
  template_role: TemplateRole;
  name: string;
  body?: AgreementTemplate["body"];
  revision?: string;
}): Promise<AgreementTemplate> {
  const now = nowISO();
  const body = input.body ?? {
    title: input.name,
    intro: "",
    clauses: [],
    outro: "",
  };
  const template: AgreementTemplate = {
    id: uid(),
    kind: input.kind,
    template_role: input.template_role,
    name: input.name.trim(),
    body,
    revision: input.revision?.trim() || "v1.0",
    created_at: now,
    updated_at: now,
  };
  await templateStore.create(template);
  return template;
}

export async function getAgreementsForPerson(personId: string): Promise<Agreement[]> {
  const all = await agreementStore.getAll();
  return all.filter((a) => a.person_id === personId);
}

/* Map a Person's department to the most appropriate contract
 * template. Design / Development get their dedicated templates;
 * everything else (Leadership, Account Mgmt, Strategy, Ops,
 * Marketing) falls back to Leadership. Admin can override on the
 * contract detail page if the auto-pick is wrong. */
export function templateRoleForDepartment(
  department: string | undefined,
): TemplateRole {
  const d = (department || "").toLowerCase();
  if (d === "design") return "designer";
  if (d === "development") return "developer";
  return "leadership";
}

/* Create a draft contract directly from a Person, snapshotting the
 * active template + every field the Person record knows. Pass an
 * explicit template_role to override the department-based auto-pick. */
export async function createContractDraftFromPerson(
  person: {
    id: string;
    full_name: string;
    email?: string;
    employment_type: "employee" | "contractor";
    job_title?: string;
    department?: string;
    compensation_type?: string;
    compensation_amount?: number;
    compensation_currency?: string;
    payment_frequency?: string;
    start_date?: string;
  },
  template_role?: TemplateRole,
): Promise<Agreement> {
  const role = template_role ?? templateRoleForDepartment(person.department);
  const tpl = await ensureTemplate("contract", role);
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
