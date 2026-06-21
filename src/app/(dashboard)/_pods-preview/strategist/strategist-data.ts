// ---------------------------------------------------------------------------
// Strategist Dashboard — PREVIEW mock data
//
// Models the Pod OS spec (§1.8 testing framework + §4.1 Strategist dashboard)
// as throwaway mock data. No persistence, no real model changes. Reuses the
// existing preview clients/pods so the dashboard reads as one system.
// ---------------------------------------------------------------------------

import { CLIENT_BY_ID, POD_BY_ID, TODAY, daysUntil, type Client } from "../mock-data";

export { CLIENT_BY_ID, POD_BY_ID };

/** Names for sprint-only engagements that aren't in the retainer client list. */
const EXTRA_NAMES: Record<string, string> = {
  "c-nomad": "Nomad Gear",
};

export function clientName(clientId?: string): string {
  if (!clientId) return "—";
  return CLIENT_BY_ID[clientId]?.name ?? EXTRA_NAMES[clientId] ?? clientId;
}

// ---- Tests (spec §1.8) ------------------------------------------------------

export type TestStatus = "setup" | "live" | "analysing" | "won" | "lost" | "inconclusive" | "archived";

export interface Guardrail {
  name: string; // e.g. "RPV", "Bounce"
  status: "ok" | "breach";
}

export interface Test {
  id: string;
  name: string;
  clientId: string;
  podId: string;
  hypothesisId?: string;
  hypothesis: string; // short form
  status: TestStatus;
  /** Statistical confidence 0-100; null while in setup. */
  confidence: number | null;
  daysRunning: number;
  minRuntimeDays: number; // target minimum runtime
  primaryMetric: string; // e.g. "ATC rate"
  guardrails: Guardrail[];
  variant: "A/B" | "Split URL" | "Multivariate";
  traffic: string; // "50/50", "90/10"
  tool: "Intelligems" | "Visually";
  sampleTargetPct: number; // 0-100 progress to sample target
  liftPct?: number; // when called
}

export const TESTS: Test[] = [
  {
    id: "t-1",
    name: "PDP review-count above fold",
    clientId: "c-northwind",
    podId: "pod-1",
    hypothesisId: "h-1",
    hypothesis: "Surfacing review count above the fold lifts PDP add-to-cart",
    status: "live",
    confidence: 91,
    daysRunning: 9,
    minRuntimeDays: 14,
    primaryMetric: "ATC rate",
    guardrails: [{ name: "RPV", status: "ok" }, { name: "Bounce", status: "ok" }],
    variant: "A/B",
    traffic: "50/50",
    tool: "Intelligems",
    sampleTargetPct: 64,
  },
  {
    id: "t-2",
    name: "Low-stock indicator on PDP",
    clientId: "c-pace",
    podId: "pod-2",
    hypothesisId: "h-2",
    hypothesis: "A low-stock indicator compresses the purchase decision",
    status: "analysing",
    confidence: 96,
    daysRunning: 16,
    minRuntimeDays: 14,
    primaryMetric: "CVR",
    guardrails: [{ name: "RPV", status: "ok" }, { name: "Returns", status: "ok" }],
    variant: "A/B",
    traffic: "50/50",
    tool: "Intelligems",
    sampleTargetPct: 100,
    liftPct: 9.2,
  },
  {
    id: "t-3",
    name: "One-tap post-purchase upsell",
    clientId: "c-pace",
    podId: "pod-2",
    hypothesisId: "h-5",
    hypothesis: "One-tap post-purchase upsell raises AOV without hurting RPV",
    status: "live",
    confidence: 62,
    daysRunning: 8,
    minRuntimeDays: 21,
    primaryMetric: "AOV",
    guardrails: [{ name: "RPV", status: "ok" }, { name: "Refund rate", status: "ok" }],
    variant: "A/B",
    traffic: "50/50",
    tool: "Visually",
    sampleTargetPct: 38,
  },
  {
    id: "t-4",
    name: "Skin-concern collection filters",
    clientId: "c-lumen",
    podId: "pod-1",
    hypothesisId: "h-4",
    hypothesis: "Skin-concern filters lift collection → PDP click-through",
    status: "live",
    confidence: 47,
    daysRunning: 30,
    minRuntimeDays: 21,
    primaryMetric: "Collection CTR",
    guardrails: [{ name: "Bounce", status: "breach" }, { name: "RPV", status: "ok" }],
    variant: "A/B",
    traffic: "50/50",
    tool: "Visually",
    sampleTargetPct: 100,
  },
  {
    id: "t-5",
    name: "Guarantee badge near buy box",
    clientId: "c-northwind",
    podId: "pod-1",
    hypothesisId: "h-3",
    hypothesis: "A guarantee badge near the buy box reduces bounce",
    status: "setup",
    confidence: null,
    daysRunning: 0,
    minRuntimeDays: 14,
    primaryMetric: "Bounce rate",
    guardrails: [{ name: "RPV", status: "ok" }],
    variant: "A/B",
    traffic: "50/50",
    tool: "Intelligems",
    sampleTargetPct: 0,
  },
  {
    id: "t-6",
    name: "Quiz funnel personalisation",
    clientId: "c-nomad",
    podId: "pod-3",
    hypothesisId: "h-10",
    hypothesis: "Quiz-driven personalisation lifts CVR vs static PDP",
    status: "live",
    confidence: 80,
    daysRunning: 5,
    minRuntimeDays: 21,
    primaryMetric: "CVR",
    guardrails: [{ name: "RPV", status: "ok" }, { name: "Bounce", status: "ok" }],
    variant: "Split URL",
    traffic: "50/50",
    tool: "Visually",
    sampleTargetPct: 22,
  },
  {
    id: "t-7",
    name: "Sticky add-to-cart (mobile)",
    clientId: "c-pace",
    podId: "pod-2",
    hypothesisId: "h-6",
    hypothesis: "Sticky add-to-cart on mobile lifts conversion",
    status: "won",
    confidence: 97,
    daysRunning: 18,
    minRuntimeDays: 14,
    primaryMetric: "Mobile CVR",
    guardrails: [{ name: "RPV", status: "ok" }],
    variant: "A/B",
    traffic: "50/50",
    tool: "Intelligems",
    sampleTargetPct: 100,
    liftPct: 6.1,
  },
  {
    id: "t-8",
    name: "Urgency banner on cart",
    clientId: "c-lumen",
    podId: "pod-1",
    hypothesisId: "h-9",
    hypothesis: "Urgency banner on cart reduces abandonment",
    status: "lost",
    confidence: 55,
    daysRunning: 21,
    minRuntimeDays: 21,
    primaryMetric: "Cart abandonment",
    guardrails: [{ name: "Bounce", status: "breach" }],
    variant: "A/B",
    traffic: "50/50",
    tool: "Visually",
    sampleTargetPct: 100,
    liftPct: -2.0,
  },
  {
    id: "t-9",
    name: "Hero video vs static",
    clientId: "c-northwind",
    podId: "pod-1",
    hypothesis: "A hero video lifts engagement over a static hero",
    status: "archived",
    confidence: 60,
    daysRunning: 28,
    minRuntimeDays: 21,
    primaryMetric: "Scroll depth",
    guardrails: [{ name: "LCP", status: "ok" }],
    variant: "A/B",
    traffic: "50/50",
    tool: "Visually",
    sampleTargetPct: 100,
  },
];

/** Test calling rules — spec §1.8. Returns the recommended action. */
export type CallTone = "ship" | "revert" | "inconclusive" | "continue" | "setup";
export function callTest(t: Test): { action: string; tone: CallTone; why: string } {
  if (t.status === "setup") return { action: "Not live yet", tone: "setup", why: "In setup / QA" };
  const breach = t.guardrails.some((g) => g.status === "breach");
  if (breach) return { action: "Stop & revert", tone: "revert", why: "Guardrail breach" };
  if (t.confidence != null && t.confidence >= 95 && t.daysRunning >= t.minRuntimeDays)
    return { action: "Stop & ship variant", tone: "ship", why: "95%+ confidence, runtime met" };
  if (t.confidence != null && t.confidence < 50 && t.daysRunning > 28)
    return { action: "Stop & revert", tone: "revert", why: "<50% confidence past 4 weeks" };
  if (t.daysRunning >= t.minRuntimeDays && (t.confidence == null || t.confidence < 95))
    return { action: "Stop inconclusive", tone: "inconclusive", why: "Runtime hit, no significance" };
  return { action: "Continue running", tone: "continue", why: "Directional, under runtime target" };
}

/** A test needs the strategist's attention now: guardrail breach or a clear call to make. */
export function needsCall(t: Test): boolean {
  const c = callTest(t);
  return c.tone === "revert" || c.tone === "ship" || c.tone === "inconclusive";
}

// ---- Hypothesis library (spec §4.1) ----------------------------------------

export type HypOutcome = "untested" | "testing" | "won" | "lost" | "inconclusive";

export interface Hypothesis {
  id: string;
  statement: string;
  tags: string[];
  clientId?: string;
  outcome: HypOutcome;
  linkedTestId?: string;
  resultNote?: string;
}

export const HYPOTHESES: Hypothesis[] = [
  { id: "h-1", statement: "Surfacing review count above the fold lifts PDP add-to-cart", tags: ["pdp", "social-proof"], clientId: "c-northwind", outcome: "testing", linkedTestId: "t-1" },
  { id: "h-2", statement: "A low-stock indicator compresses the purchase decision", tags: ["pdp", "scarcity"], clientId: "c-pace", outcome: "won", linkedTestId: "t-2", resultNote: "+11.4% CVR, 96% conf" },
  { id: "h-3", statement: "A guarantee badge near the buy box reduces bounce", tags: ["pdp", "trust"], clientId: "c-northwind", outcome: "untested", linkedTestId: "t-5" },
  { id: "h-4", statement: "Skin-concern filters lift collection → PDP click-through", tags: ["collection", "navigation"], clientId: "c-lumen", outcome: "testing", linkedTestId: "t-4" },
  { id: "h-5", statement: "One-tap post-purchase upsell raises AOV without hurting RPV", tags: ["checkout", "aov"], clientId: "c-pace", outcome: "testing", linkedTestId: "t-3" },
  { id: "h-6", statement: "Sticky add-to-cart on mobile lifts conversion", tags: ["pdp", "mobile"], outcome: "won", resultNote: "+6.1% mobile CVR — promoted to library" },
  { id: "h-7", statement: "Editorial PDP layout suits a considered purchase better than a dense one", tags: ["pdp", "layout"], clientId: "c-halcyon", outcome: "untested" },
  { id: "h-8", statement: "A 'build a routine' bundle raises AOV", tags: ["collection", "aov", "bundle"], clientId: "c-lumen", outcome: "untested" },
  { id: "h-9", statement: "Urgency banner on cart reduces abandonment", tags: ["cart", "urgency"], outcome: "lost", resultNote: "No lift, bounce up — reverted" },
  { id: "h-10", statement: "Quiz-driven personalisation lifts CVR vs static PDP", tags: ["quiz", "personalisation"], clientId: "c-nomad", outcome: "testing", linkedTestId: "t-6" },
];

// ---- Engagements: retainers + sprints (spec §4.1 My Engagements) ------------

export type ProductType = "retainer_core" | "retainer_pro" | "sprint";

export const PRODUCT_LABEL: Record<ProductType, string> = {
  retainer_core: "Retainer · Core £8k",
  retainer_pro: "Retainer · Pro £12k",
  sprint: "Sprint",
};

export interface Engagement {
  id: string;
  name: string;
  clientId?: string; // links to a preview client where one exists
  podId: string;
  product: ProductType;
  /** Retainer day in the 90-day cycle (sprints leave undefined). */
  dayInCycle?: number;
  bucket?: "A" | "B" | "C";
  status: string;
  nextAction: string;
}

export const ENGAGEMENTS: Engagement[] = [
  { id: "e-nw", name: "Northwind Apparel", clientId: "c-northwind", podId: "pod-1", product: "retainer_pro", dayInCycle: 34, status: "Active · month 2", nextAction: "Map month 2 deliverable stack" },
  { id: "e-pace", name: "Pace Athletic", clientId: "c-pace", podId: "pod-2", product: "retainer_pro", dayInCycle: 68, status: "Active · approaching refresh", nextAction: "Draft Day 75 strategy refresh doc" },
  { id: "e-lum", name: "Lumen Skincare", clientId: "c-lumen", podId: "pod-1", product: "retainer_core", dayInCycle: 15, status: "Active · first wave", nextAction: "Brief collection-filter iteration" },
  { id: "e-ver", name: "Verdant Home", clientId: "c-verdant", podId: "pod-3", product: "retainer_core", dayInCycle: 9, status: "Onboarding · audit blocked", nextAction: "Chase brand assets to unblock audit" },
  { id: "e-hal", name: "Halcyon", clientId: "c-halcyon", podId: "pod-2", product: "retainer_pro", dayInCycle: 2, status: "Onboarding", nextAction: "Run baseline audit + hypothesis stack" },
  { id: "e-nomad", name: "Nomad Gear — Quiz funnel", clientId: "c-nomad", podId: "pod-3", product: "sprint", bucket: "B", status: "Phase 3 · test live", nextAction: "Monitor quiz test (day 5 of 21)" },
  { id: "e-brly", name: "Brly Coffee — PDP refresh", podId: "pod-1", product: "sprint", bucket: "A", status: "Phase 1 · design review", nextAction: "Review client feedback (2 of 5 days)" },
];

/** Days remaining to the Day-75 refresh conversation (retainers only). */
export function daysToRefresh(e: Engagement): number | null {
  if (e.dayInCycle == null) return null;
  return 75 - e.dayInCycle;
}

// ---- Brief intake queue (spec §4.1 — Friday-anchored, asset gaps) -----------

export interface BriefIntake {
  id: string;
  name: string;
  clientId?: string;
  podId: string;
  forStart: string; // Monday it would start
  complete: boolean;
  assetGaps: string[]; // empty = ready
}

export const BRIEFS: BriefIntake[] = [
  {
    id: "b-hal",
    name: "Halcyon — homepage + PDP",
    clientId: "c-halcyon",
    podId: "pod-2",
    forStart: "2026-06-01",
    complete: false,
    assetGaps: ["Brand guidelines", "Shopify collaborator access"],
  },
  {
    id: "b-ver",
    name: "Verdant Home — homepage rebuild",
    clientId: "c-verdant",
    podId: "pod-3",
    forStart: "2026-06-01",
    complete: false,
    assetGaps: ["Product photography", "Logo (vector)"],
  },
  {
    id: "b-nw",
    name: "Northwind — collection page",
    clientId: "c-northwind",
    podId: "pod-1",
    forStart: "2026-06-01",
    complete: true,
    assetGaps: [],
  },
];

/** Whether the Friday brief-lock (5pm) is today or past for context. */
export const BRIEF_LOCK_LABEL = "Briefs lock Friday 5pm";

// re-exports used by the dashboard
export { TODAY, daysUntil };
export type { Client };
