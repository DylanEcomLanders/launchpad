// ---------------------------------------------------------------------------
// Delivery Engine — PREVIEW mock data (Pod OS spec §1.2–1.7)
// Two-product pipeline, points/buckets, and the P1→P2→P3 phase tracker with
// Tue/Thu slots, Wed review gate, client review windows + revision caps.
// Throwaway mock; reuses engagements + page-weight engine.
// ---------------------------------------------------------------------------

import { PAGE_TYPE_BY_KEY, WEIGHT_POINTS, bucketFor, pointsForPages, type SprintBucket } from "../mock-data";

export { PAGE_TYPE_BY_KEY, WEIGHT_POINTS, bucketFor, pointsForPages };
export type { SprintBucket };

export type Phase = "P1" | "P2" | "P3";

export const PHASE_META: Record<Phase, { label: string; sub: string; duration: string; owner: string }> = {
  P1: { label: "Strategy + Design", sub: "P1", duration: "4 working days", owner: "Strategist + Designer" },
  P2: { label: "Development", sub: "P2", duration: "bucket-scaled (A 4d / B 7d / C 10d)", owner: "Developer + Pod Lead" },
  P3: { label: "Test + Validate", sub: "P3", duration: "2–4 weeks runtime", owner: "Strategist" },
};

/** Dev days by bucket — spec §1.4 Phase 2. */
export const P2_DAYS: Record<SprintBucket, number | null> = { A: 4, B: 7, C: 10, Bespoke: null };

export type Slot = "Tue" | "Thu";

export interface ReviewState {
  phase: "P1" | "P2";
  windowDays: number; // 5 for P1, 3 for P2
  daysUsed: number;
  revisionsUsed: number;
  revisionsAllowed: number; // 2 for P1, 1 for P2
}

export interface GateState {
  podLead: boolean;
  strategist: boolean;
}

export type ProductType = "sprint" | "retainer";

export interface Deliverable {
  id: string;
  name: string;
  clientName: string;
  podId: string;
  product: ProductType;
  pageKeys: string[];
  phase: Phase;
  phaseProgress: string; // e.g. "Day 3 of 4"
  slot?: Slot;
  /** Wednesday review gate co-sign (null once past the gate / not yet at it). */
  gate?: GateState;
  review?: ReviewState;
  status: string;
}

export const DELIVERABLES: Deliverable[] = [
  {
    id: "d-nw-pdp",
    name: "PDP redesign",
    clientName: "Northwind Apparel",
    podId: "pod-1",
    product: "retainer",
    pageKeys: ["pdp"],
    phase: "P2",
    phaseProgress: "Day 2 of 4",
    slot: "Thu",
    gate: { podLead: true, strategist: true },
    review: { phase: "P2", windowDays: 3, daysUsed: 0, revisionsUsed: 0, revisionsAllowed: 1 },
    status: "In development · co-signed · ships Thu",
  },
  {
    id: "d-lum-coll",
    name: "Collection page",
    clientName: "Lumen Skincare",
    podId: "pod-1",
    product: "retainer",
    pageKeys: ["collection"],
    phase: "P1",
    phaseProgress: "Day 3 of 4",
    slot: "Thu",
    gate: { podLead: false, strategist: true },
    status: "Design · awaiting Pod Lead co-sign (Wed 3pm)",
  },
  {
    id: "d-brly-pdp",
    name: "PDP refresh",
    clientName: "Brly Coffee",
    podId: "pod-1",
    product: "sprint",
    pageKeys: ["pdp", "faq"],
    phase: "P1",
    phaseProgress: "Client review",
    review: { phase: "P1", windowDays: 5, daysUsed: 2, revisionsUsed: 1, revisionsAllowed: 2 },
    status: "Client review · day 2 of 5 · 1 revision used",
  },
  {
    id: "d-pace-upsell",
    name: "Post-purchase upsell",
    clientName: "Pace Athletic",
    podId: "pod-2",
    product: "retainer",
    pageKeys: ["cart"],
    phase: "P3",
    phaseProgress: "Day 8 of ~21",
    status: "Test live · monitoring",
  },
  {
    id: "d-nomad-quiz",
    name: "Quiz funnel",
    clientName: "Nomad Gear",
    podId: "pod-3",
    product: "sprint",
    pageKeys: ["quiz"],
    phase: "P3",
    phaseProgress: "Day 5 of ~21",
    status: "Test live · monitoring",
  },
  {
    id: "d-hal-home",
    name: "Homepage + PDP",
    clientName: "Halcyon",
    podId: "pod-2",
    product: "retainer",
    pageKeys: ["homepage", "pdp"],
    phase: "P1",
    phaseProgress: "Brief deep-dive",
    slot: "Thu",
    gate: { podLead: false, strategist: false },
    status: "Onboarding · first deliverable in brief stack",
  },
];

export function deliverablePoints(d: Deliverable): number {
  return pointsForPages(d.pageKeys);
}
