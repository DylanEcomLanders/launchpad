/* ── Client CSM overlay ──
 * A satellite of the canonical client (kanban_clients), NOT a second client
 * model. Keyed by kanban_client_id, it holds ONLY the CSM-specific layer the
 * kanban/Results-Engine don't: the compliance/cadence checklist + the renewal
 * date. Everything else on /clients (roster, delivery, commercial, optimisation)
 * projects off truth. This is the CSM's private view — it lives only here.
 *
 * createStore (Supabase table `client_csm` + localStorage). Retires the old
 * command-centre Client/Engagement model as the /clients source of truth.
 */

import { createStore } from "@/lib/supabase-store";
import { instantiateChecklist, type ChecklistItem } from "@/lib/command-centre/model";
import type { TierName } from "@/lib/projects/mock-data";

export interface ClientCsm {
  /** = kanban_clients.id — the canonical client identity. One record per client. */
  id: string;
  /** Renewal date for this client's active retainer (ISO yyyy-mm-dd). */
  renewalDate?: string;
  /** The compliance spine + rhythm/renewal cadence items, with their state. */
  items: ChecklistItem[];
  /** Engagement start the cadence counts from (ISO). Falls back to project start. */
  startDate?: string;
  created_at: string;
  updated_at: string;
}

const store = createStore<ClientCsm>({ table: "client_csm", lsKey: "launchpad-client-csm" });

/* Map the kanban tier vocabulary onto the checklist's (5k/10k/15k + one-off).
 * lite→5k, core→10k, growth/scale→15k; audit + single_build use the project
 * (one-off) checklist. */
function checklistScopeFor(tier?: TierName): {
  type: "retainer" | "project";
  tier?: "5k" | "10k" | "15k";
} {
  switch (tier) {
    case "lite":
      return { type: "retainer", tier: "5k" };
    case "core":
      return { type: "retainer", tier: "10k" };
    case "growth":
    case "scale":
      return { type: "retainer", tier: "15k" };
    default:
      return { type: "project" }; // audit / single_build / unset
  }
}

const now = () => new Date().toISOString();

export async function getCsm(clientId: string): Promise<ClientCsm | null> {
  return store.getById(clientId);
}

/** Get (or lazily create) a client's CSM overlay. Seeds the checklist from the
 *  client's tier the first time it's opened. */
export async function ensureCsm(
  clientId: string,
  opts?: { tier?: TierName; startDate?: string },
): Promise<ClientCsm> {
  const existing = await store.getById(clientId);
  if (existing) return existing;
  const scope = checklistScopeFor(opts?.tier);
  const ts = now();
  const csm: ClientCsm = {
    id: clientId,
    items: instantiateChecklist(scope.type, scope.tier),
    startDate: opts?.startDate,
    created_at: ts,
    updated_at: ts,
  };
  try {
    await store.create(csm);
  } catch {
    /* supabase table absent — create() still wrote localStorage */
  }
  return csm;
}

export async function setRenewalDate(clientId: string, date: string | undefined): Promise<void> {
  await store.update(clientId, { renewalDate: date, updated_at: now() });
}

/** Patch one checklist item (tick a one-off, log a recurring touch, add evidence). */
export async function patchChecklistItem(
  clientId: string,
  key: string,
  patch: Partial<ChecklistItem>,
): Promise<void> {
  const csm = await store.getById(clientId);
  if (!csm) return;
  const items = csm.items.map((it) => (it.key === key ? { ...it, ...patch } : it));
  await store.update(clientId, { items, updated_at: now() });
}
