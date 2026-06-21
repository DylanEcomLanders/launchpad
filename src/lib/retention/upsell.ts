// "What to sell next" — rule-based v1 for the CSM.
//
// The product ladder is Project → Core → Pro → Custom. Suggestions are
// deliberately conservative: we do NOT push an upsell every month. A client is
// only "ripe" when they're healthy AND getting results; anyone at risk is a
// HOLD (stabilise before selling). Rules are config — tune freely.
//
// NOTE: the "Project → Core" convert step needs single-page-project clients,
// which `sales_clients` doesn't model yet (all rows are retainers). Until that
// data exists the engine works the retainer rungs (Core → Pro → Custom) + hold.

import type { DealPlan } from "@/lib/sales-dashboard/types";
import type { HealthBand } from "./types";

export type UpsellMove = "hold" | "steady" | "upsell" | "expand";

export interface UpsellSuggestion {
  move: UpsellMove;
  /** Short label, e.g. "Upsell → Pro". */
  label: string;
  reason: string;
  /** True when the client is healthy + getting results. */
  ripe: boolean;
}

export interface UpsellInput {
  plan: DealPlan;
  band: HealthBand;
  winningTests: number;
  cadenceGood: boolean;
  /** Delivery is backed up (2+ late deliverables) — don't sell more capacity. */
  ontimeBad: boolean;
  daysToRenewal: number;
  resultsInLookback: number;
}

function renewalTiming(days: number): string {
  if (days < 0 || days > 60) return "";
  return ` Raise at renewal (${days}d).`;
}

export function suggestUpsell(i: UpsellInput): UpsellSuggestion {
  // At risk → never sell into a fire.
  if (i.band === "red") {
    return { move: "hold", label: "Hold — stabilise", reason: "Health critical. Fix delivery and re-engage before any upsell.", ripe: false };
  }
  // Delivery backed up → clear it before selling more capacity.
  if (i.ontimeBad) {
    return { move: "steady", label: "Steady", reason: "Delivery is backed up — clear the backlog before adding scope.", ripe: false };
  }

  // Ripe = not on fire (handled above) + actually getting results. We don't
  // demand a perfect green band, just a win on record.
  const ripe = i.winningTests >= 1;

  if (i.plan === "core") {
    if (ripe) {
      return { move: "upsell", label: "Upsell → Pro", reason: `Healthy and getting wins — capacity to do more.${renewalTiming(i.daysToRenewal)}`, ripe: true };
    }
    return { move: "steady", label: "Steady", reason: i.band === "green" ? "Healthy; land a clear win before proposing Pro." : "Stabilise cadence before upselling.", ripe: false };
  }

  if (i.plan === "pro") {
    if (ripe && i.cadenceGood) {
      return { move: "expand", label: "Expand → Custom", reason: `Maxing Pro with results — scope an expanded partnership.${renewalTiming(i.daysToRenewal)}`, ripe: true };
    }
    return { move: "steady", label: "Steady", reason: i.band === "green" ? "Healthy on Pro; keep delivering wins." : "Tighten delivery before expanding scope.", ripe: false };
  }

  // custom / top of ladder
  if (i.band === "green") {
    return { move: "steady", label: "Maintain", reason: "Top tier and healthy — protect the account, explore added scope.", ripe: false };
  }
  return { move: "steady", label: "Steady", reason: "Stabilise before any scope conversation.", ripe: false };
}
