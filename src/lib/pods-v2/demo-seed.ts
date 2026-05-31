// ─── Pod OS v2 — demo seed (explicit, reversible) ─────────────────
// ensureSeed() seeds the 3 pods but NOT clients, so a clean install has
// nothing for the Strategist / CSM dashboards to show. This module
// populates a representative demo set (clients + lifecycle + tests +
// hypotheses) so Dylan can see the surfaces working. It is NOT
// auto-run — it's triggered by an explicit "Load demo data" button so a
// clean production start is never polluted (BLOCKERS.md B2).
//
// Everything created here uses a stable `demo-` id prefix so it can be
// cleanly removed again via clearPodOsV2DemoData(). Mirrors the
// _pods-preview examples for continuity.

"use client";

import {
  getPods,
  getClients,
  createClient,
  updateClientLifecycle,
  getTests,
  createTest,
  getHypotheses,
  createHypothesis,
} from "./data";
import type { Client, HealthSignals } from "./types";

const DEMO_PREFIX = "demo-";

interface DemoClientSpec {
  id: string;
  name: string;
  podIndex: number; // 0..2 → maps onto the real seeded pods
  retainer_tier: Client["retainer_tier"];
  engagement_kind: NonNullable<Client["engagement_kind"]>;
  /** Days into the engagement (used to derive engagement_start from today). */
  dayInCycle: number;
  cvr_baseline?: number;
  cvr_current?: number;
  renewal_status: NonNullable<Client["renewal_status"]>;
  strategy_thesis: string;
  onboarding_notes: string[];
  risk_flags: string[];
  health: HealthSignals;
}

const DEMO_CLIENTS: DemoClientSpec[] = [
  {
    id: `${DEMO_PREFIX}northwind`,
    name: "Northwind Apparel",
    podIndex: 0,
    retainer_tier: "12k",
    engagement_kind: "retainer",
    dayInCycle: 34,
    cvr_baseline: 1.8,
    cvr_current: 2.3,
    renewal_status: "active",
    strategy_thesis:
      "Trust is the bottleneck, not desire. Lead with proof (reviews, guarantees) on PDP before pushing AOV.",
    onboarding_notes: [
      "Founder (Claire) is the sole decision-maker — route all approvals through her.",
      "Brand voice: warm, plain-spoken, no hype. Avoid the word 'luxury'.",
    ],
    risk_flags: ["Approvals routinely sit 3+ days with founder"],
    health: { client_delay_days: 5, approval_lag_days: 3.2, engagement_gap_days: 2, open_blockers: 0 },
  },
  {
    id: `${DEMO_PREFIX}lumen`,
    name: "Lumen Skincare",
    podIndex: 0,
    retainer_tier: "8k",
    engagement_kind: "retainer",
    dayInCycle: 15,
    cvr_baseline: 2.1,
    cvr_current: 2.2,
    renewal_status: "active",
    strategy_thesis:
      "Discovery is weak — shoppers can't find the right product. Win on collection/filter UX before PDP.",
    onboarding_notes: ["Compliance: skincare claims must avoid 'cure'/'treat' language."],
    risk_flags: [],
    health: { client_delay_days: 1, approval_lag_days: 1.5, engagement_gap_days: 1, open_blockers: 1 },
  },
  {
    id: `${DEMO_PREFIX}pace`,
    name: "Pace Athletic",
    podIndex: 1,
    retainer_tier: "12k",
    engagement_kind: "retainer",
    dayInCycle: 68,
    cvr_baseline: 1.5,
    cvr_current: 2.0,
    renewal_status: "refresh_due",
    strategy_thesis:
      "High intent, low urgency. Use scarcity + social proof to compress the decision, then test relentlessly.",
    onboarding_notes: ["Data-driven team — every change wants an A/B test and a hypothesis."],
    risk_flags: [],
    health: { client_delay_days: 1, approval_lag_days: 0.8, engagement_gap_days: 1, open_blockers: 0 },
  },
  {
    id: `${DEMO_PREFIX}verdant`,
    name: "Verdant Home",
    podIndex: 2,
    retainer_tier: "8k",
    engagement_kind: "retainer",
    dayInCycle: 9,
    cvr_baseline: 1.2,
    cvr_current: 1.2,
    renewal_status: "active",
    strategy_thesis:
      "Brand-new store with no data. First job is a clean, fast baseline — don't optimise on noise yet.",
    onboarding_notes: ["New brand, assets still being produced — expect asset delays early on."],
    risk_flags: ["Brand assets 6 days late — homepage design stalled", "No client response in 9 days"],
    health: { client_delay_days: 9, approval_lag_days: 5.0, engagement_gap_days: 9, open_blockers: 1 },
  },
  {
    id: `${DEMO_PREFIX}nomad`,
    name: "Nomad Gear — Quiz funnel",
    podIndex: 2,
    retainer_tier: "none",
    engagement_kind: "sprint",
    dayInCycle: 12,
    renewal_status: "active",
    strategy_thesis: "Quiz-led personalisation should beat a static PDP for a considered-gear purchase.",
    onboarding_notes: ["One-off Sprint (Bucket B). Single validation test on the quiz funnel."],
    risk_flags: [],
    health: { client_delay_days: 0, approval_lag_days: 1.0, engagement_gap_days: 2, open_blockers: 0 },
  },
];

/** YYYY-MM-DD `n` days before today (so dayInCycle lands on today). */
function startDateForDay(dayInCycle: number, today: Date): string {
  const d = new Date(today);
  d.setDate(d.getDate() - (dayInCycle - 1));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DemoHyp {
  id: string;
  statement: string;
  tags: string[];
  clientKey: string;
  outcome: "untested" | "testing" | "won" | "lost" | "inconclusive";
  linkedTestKey?: string;
  result_note?: string;
}

const DEMO_HYPS: DemoHyp[] = [
  { id: "h-1", statement: "Surfacing review count above the fold lifts PDP add-to-cart", tags: ["pdp", "social-proof"], clientKey: "northwind", outcome: "testing", linkedTestKey: "t-1" },
  { id: "h-2", statement: "A low-stock indicator compresses the purchase decision", tags: ["pdp", "scarcity"], clientKey: "pace", outcome: "won", linkedTestKey: "t-2", result_note: "+9.2% CVR, 96% conf" },
  { id: "h-3", statement: "A guarantee badge near the buy box reduces bounce", tags: ["pdp", "trust"], clientKey: "northwind", outcome: "untested", linkedTestKey: "t-5" },
  { id: "h-4", statement: "Skin-concern filters lift collection → PDP click-through", tags: ["collection", "navigation"], clientKey: "lumen", outcome: "testing", linkedTestKey: "t-4" },
  { id: "h-5", statement: "One-tap post-purchase upsell raises AOV without hurting RPV", tags: ["checkout", "aov"], clientKey: "pace", outcome: "testing", linkedTestKey: "t-3" },
  { id: "h-6", statement: "Sticky add-to-cart on mobile lifts conversion", tags: ["pdp", "mobile"], clientKey: "pace", outcome: "won", result_note: "+6.1% mobile CVR — promoted to library" },
  { id: "h-7", statement: "Editorial PDP layout suits a considered purchase better than a dense one", tags: ["pdp", "layout"], clientKey: "verdant", outcome: "untested" },
  { id: "h-10", statement: "Quiz-driven personalisation lifts CVR vs static PDP", tags: ["quiz", "personalisation"], clientKey: "nomad", outcome: "testing", linkedTestKey: "t-6" },
];

interface DemoTest {
  key: string;
  name: string;
  clientKey: string;
  hypKey?: string;
  hypothesis: string;
  status: "setup" | "live" | "analysing" | "won" | "lost" | "inconclusive" | "archived";
  confidence: number | null;
  days_running: number;
  min_runtime_days: number;
  primary_metric: string;
  guardrails: { name: string; status: "ok" | "breach" }[];
  variant: "A/B" | "Split URL" | "Multivariate";
  traffic: string;
  tool: "Intelligems" | "Visually";
  sample_target_pct: number;
  lift_pct?: number;
}

const DEMO_TESTS: DemoTest[] = [
  { key: "t-1", name: "PDP review-count above fold", clientKey: "northwind", hypKey: "h-1", hypothesis: "Surfacing review count above the fold lifts PDP add-to-cart", status: "live", confidence: 91, days_running: 9, min_runtime_days: 14, primary_metric: "ATC rate", guardrails: [{ name: "RPV", status: "ok" }, { name: "Bounce", status: "ok" }], variant: "A/B", traffic: "50/50", tool: "Intelligems", sample_target_pct: 64 },
  { key: "t-2", name: "Low-stock indicator on PDP", clientKey: "pace", hypKey: "h-2", hypothesis: "A low-stock indicator compresses the purchase decision", status: "analysing", confidence: 96, days_running: 16, min_runtime_days: 14, primary_metric: "CVR", guardrails: [{ name: "RPV", status: "ok" }, { name: "Returns", status: "ok" }], variant: "A/B", traffic: "50/50", tool: "Intelligems", sample_target_pct: 100, lift_pct: 9.2 },
  { key: "t-3", name: "One-tap post-purchase upsell", clientKey: "pace", hypKey: "h-5", hypothesis: "One-tap post-purchase upsell raises AOV without hurting RPV", status: "live", confidence: 62, days_running: 8, min_runtime_days: 21, primary_metric: "AOV", guardrails: [{ name: "RPV", status: "ok" }, { name: "Refund rate", status: "ok" }], variant: "A/B", traffic: "50/50", tool: "Visually", sample_target_pct: 38 },
  { key: "t-4", name: "Skin-concern collection filters", clientKey: "lumen", hypKey: "h-4", hypothesis: "Skin-concern filters lift collection → PDP click-through", status: "live", confidence: 47, days_running: 30, min_runtime_days: 21, primary_metric: "Collection CTR", guardrails: [{ name: "Bounce", status: "breach" }, { name: "RPV", status: "ok" }], variant: "A/B", traffic: "50/50", tool: "Visually", sample_target_pct: 100 },
  { key: "t-5", name: "Guarantee badge near buy box", clientKey: "northwind", hypKey: "h-3", hypothesis: "A guarantee badge near the buy box reduces bounce", status: "setup", confidence: null, days_running: 0, min_runtime_days: 14, primary_metric: "Bounce rate", guardrails: [{ name: "RPV", status: "ok" }], variant: "A/B", traffic: "50/50", tool: "Intelligems", sample_target_pct: 0 },
  { key: "t-6", name: "Quiz funnel personalisation", clientKey: "nomad", hypKey: "h-10", hypothesis: "Quiz-driven personalisation lifts CVR vs static PDP", status: "live", confidence: 80, days_running: 5, min_runtime_days: 21, primary_metric: "CVR", guardrails: [{ name: "RPV", status: "ok" }, { name: "Bounce", status: "ok" }], variant: "Split URL", traffic: "50/50", tool: "Visually", sample_target_pct: 22 },
  { key: "t-7", name: "Sticky add-to-cart (mobile)", clientKey: "pace", hypothesis: "Sticky add-to-cart on mobile lifts conversion", status: "won", confidence: 97, days_running: 18, min_runtime_days: 14, primary_metric: "Mobile CVR", guardrails: [{ name: "RPV", status: "ok" }], variant: "A/B", traffic: "50/50", tool: "Intelligems", sample_target_pct: 100, lift_pct: 6.1 },
];

/** True if the demo set is currently loaded (any demo-prefixed client). */
export function isDemoDataLoaded(): boolean {
  return getClients().some((c) => c.id.startsWith(DEMO_PREFIX));
}

/** Populate the demo set. Idempotent: skips clients/tests/hypotheses that
 * already exist by id. Returns the number of clients created. */
export function seedPodOsV2DemoData(): void {
  const pods = getPods();
  if (pods.length === 0) return; // ensureSeed hasn't run yet
  const today = new Date();

  const existingClientIds = new Set(getClients().map((c) => c.id));
  const clientIdByKey: Record<string, string> = {};

  for (const spec of DEMO_CLIENTS) {
    const key = spec.id.replace(DEMO_PREFIX, "");
    clientIdByKey[key] = spec.id;
    const pod = pods[spec.podIndex % pods.length];
    const engagement_start = startDateForDay(spec.dayInCycle, today);
    if (!existingClientIds.has(spec.id)) {
      createClient({
        id: spec.id,
        name: spec.name,
        pod_id: pod.id,
        brand_warm: false,
        retainer_tier: spec.retainer_tier,
        cvr_baseline: spec.cvr_baseline,
        cvr_current: spec.cvr_current,
        kickoff_date: engagement_start,
      });
    }
    // Always (re)apply lifecycle so re-seeding refreshes the day math.
    updateClientLifecycle(spec.id, {
      engagement_kind: spec.engagement_kind,
      engagement_start,
      renewal_status: spec.renewal_status,
      strategy_thesis: spec.strategy_thesis,
      onboarding_notes: spec.onboarding_notes,
      risk_flags: spec.risk_flags,
      health_signals: spec.health,
    });
  }

  // Hypotheses
  const existingHypIds = new Set(getHypotheses().map((h) => h.id));
  for (const h of DEMO_HYPS) {
    if (existingHypIds.has(h.id)) continue;
    createHypothesis({
      id: h.id,
      statement: h.statement,
      tags: h.tags,
      client_id: clientIdByKey[h.clientKey],
      outcome: h.outcome,
      linked_test_id: h.linkedTestKey,
      result_note: h.result_note,
    });
  }

  // Tests
  const existingTestIds = new Set(getTests().map((t) => t.id));
  for (const t of DEMO_TESTS) {
    if (existingTestIds.has(t.key)) continue;
    const clientId = clientIdByKey[t.clientKey];
    const spec = DEMO_CLIENTS.find((c) => c.id === clientId);
    const pod = spec ? pods[spec.podIndex % pods.length] : pods[0];
    createTest({
      id: t.key,
      name: t.name,
      client_id: clientId ?? "",
      pod_id: pod.id,
      hypothesis_id: t.hypKey,
      hypothesis: t.hypothesis,
      status: t.status,
      confidence: t.confidence,
      days_running: t.days_running,
      min_runtime_days: t.min_runtime_days,
      primary_metric: t.primary_metric,
      guardrails: t.guardrails,
      variant: t.variant,
      traffic: t.traffic,
      tool: t.tool,
      sample_target_pct: t.sample_target_pct,
      lift_pct: t.lift_pct,
    });
  }
}
