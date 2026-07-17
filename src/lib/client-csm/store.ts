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
import {
  instantiateChecklist,
  itemDone,
  type ChecklistItem,
  type Group,
  type Cadence,
  type OwnerRole,
} from "@/lib/command-centre/model";
import type { TierName } from "@/lib/projects/mock-data";

export interface ClientCsm {
  /** = kanban_clients.id — the canonical client identity. One record per client. */
  id: string;
  /** Renewal date for this client's active retainer (ISO yyyy-mm-dd). */
  renewalDate?: string;
  /** MRR for this client's active retainer. Entered by the CSM per account so the
   *  commercial number is one they own and stay familiar with — not fabricated. */
  mrr?: number;
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

/** CSM enters the MRR per account. Undefined/NaN clears it. */
export async function setMrr(clientId: string, mrr: number | undefined): Promise<void> {
  const clean = mrr != null && Number.isFinite(mrr) ? mrr : undefined;
  await store.update(clientId, { mrr: clean, updated_at: now() });
}

/** Tick a one-off item, or log/clear this cycle's touch on a recurring one.
 *  Mirrors command-centre toggleItem so the checklist behaves identically. */
export async function toggleChecklistItem(clientId: string, key: string): Promise<void> {
  const csm = await store.getById(clientId);
  if (!csm) return;
  const start = csm.startDate ?? "";
  const items = csm.items.map((it) => {
    if (it.key !== key) return it;
    if (it.cadence === "once") {
      return it.status === "done"
        ? { ...it, status: "pending" as const, completedAt: undefined }
        : { ...it, status: "done" as const, completedAt: now() };
    }
    return { ...it, lastDoneAt: itemDone(it, start) ? undefined : now() };
  });
  await store.update(clientId, { items, updated_at: now() });
}

/** Add a custom checklist item (the CSM tailors the seeded list per account). */
export async function addChecklistItem(
  clientId: string,
  spec: { label: string; group: Group; cadence: Cadence; ownerRole: OwnerRole },
): Promise<void> {
  const csm = await store.getById(clientId);
  if (!csm) return;
  const item: ChecklistItem = {
    key: `custom-${Math.random().toString(36).slice(2, 9)}`,
    label: spec.label,
    group: spec.group,
    ownerRole: spec.ownerRole,
    cadence: spec.cadence,
    status: spec.cadence === "once" ? "pending" : undefined,
  };
  await store.update(clientId, { items: [...csm.items, item], updated_at: now() });
}

/** Remove a checklist item (drop one that doesn't apply to this account). */
export async function removeChecklistItem(clientId: string, key: string): Promise<void> {
  const csm = await store.getById(clientId);
  if (!csm) return;
  await store.update(clientId, {
    items: csm.items.filter((it) => it.key !== key),
    updated_at: now(),
  });
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
