/* ── Hero Offer data layer ──
 *
 * Six stores backed by the createStore() pattern: try Supabase first,
 * fall through to localStorage. Each table is { id, data, updated_at }
 * with data carrying the typed row body.
 *
 * Helpers:
 *   - uid() generates a stable-enough id for new rows
 *   - nowISO() / todayISO() match the other modules
 *   - nextOrder() computes a sensible sort key for the next added row
 *     so admins don't manually number sections
 */

import { createStore } from "@/lib/supabase-store";
import type {
  OfferSection,
  OfferObjection,
  OfferLayer,
  OfferMilestone,
  OfferResource,
  OfferPricingTier,
} from "./types";

export const offerSectionsStore = createStore<OfferSection>({
  table: "offer_sections",
  lsKey: "launchpad-offer-sections",
});

export const offerObjectionsStore = createStore<OfferObjection>({
  table: "offer_objections",
  lsKey: "launchpad-offer-objections",
});

export const offerLayersStore = createStore<OfferLayer>({
  table: "offer_layers",
  lsKey: "launchpad-offer-layers",
});

export const offerMilestonesStore = createStore<OfferMilestone>({
  table: "offer_milestones",
  lsKey: "launchpad-offer-milestones",
});

export const offerResourcesStore = createStore<OfferResource>({
  table: "offer_resources",
  lsKey: "launchpad-offer-resources",
});

export const offerPricingStore = createStore<OfferPricingTier>({
  table: "offer_pricing",
  lsKey: "launchpad-offer-pricing",
});

export function uid(): string {
  /* Random base36 is enough - these tables max out around 50 rows
   * each. No collision risk in practice. */
  return Math.random().toString(36).slice(2, 12);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/* Walk an existing list of ordered rows + return the next sensible
 * sort key. Used by "Add X" flows so admin doesn't pick numbers. */
export function nextOrder(rows: Array<{ order: number }>): number {
  if (rows.length === 0) return 0;
  return Math.max(...rows.map((r) => r.order)) + 10;
}
