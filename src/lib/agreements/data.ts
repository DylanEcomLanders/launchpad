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

/* Find or create the active template for a kind. If no row exists for
 * that kind yet, seeds one with the default content from defaults.ts
 * so the templates editor isn't staring at a blank page on first run. */
export async function ensureTemplate(kind: AgreementKind): Promise<AgreementTemplate> {
  const all = await templateStore.getAll();
  /* Pick the most recently updated row of this kind. The data layer
   * returns rows in descending created_at order so the first hit is
   * already the newest, but checking updated_at handles edits too. */
  const existing = all
    .filter((t) => t.kind === kind)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))[0];
  if (existing) return existing;
  const now = nowISO();
  const seeded: AgreementTemplate = {
    id: uid(),
    kind,
    body:
      kind === "nda"
        ? structuredClone(DEFAULT_NDA_TEMPLATE)
        : structuredClone(DEFAULT_CONTRACT_TEMPLATE),
    revision: "v1.0 – seeded default",
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
