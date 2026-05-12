export type OwnerRole = "CRO" | "Pod" | "Design" | "PM" | "Dylan";
export type DeliverableStatus = "todo" | "in_progress" | "blocked" | "done";
export type CycleNumber = 1 | 2 | 3;
/** Retainer stages run the full strategy → build → test rhythm; bucket
 * stages skip the audit stack (PM's onboarding checklist covers it) and
 * focus on shipping the project. */
export type RetainerStageId = "audit" | "build" | "test";
export type BucketStageId = "design" | "development" | "testing";
export type StageId = RetainerStageId | BucketStageId;
export type WeekInCycle = 1 | 2 | 3 | 4;

export type EngagementKind = "retainer" | "bucket";
export type BucketSize = "A" | "B" | "C" | "Bespoke";

export interface BucketDefinition {
  size: BucketSize;
  label: string;
  workingDays: number | null; // null for Bespoke
  weeks: number;
  tagline: string;
}

export const BUCKETS: BucketDefinition[] = [
  { size: "A", label: "Bucket A", workingDays: 10, weeks: 2, tagline: "Single page or surface · ~10 working days" },
  { size: "B", label: "Bucket B", workingDays: 15, weeks: 3, tagline: "Multi-page lever · ~15 working days" },
  { size: "C", label: "Bucket C", workingDays: 20, weeks: 4, tagline: "Funnel-wide build · ~20 working days" },
  { size: "Bespoke", label: "Bespoke", workingDays: null, weeks: 4, tagline: "Custom scope + timeline" },
];

/** Editable brief snapshot lifted from the onboarding submission and
 * decoupled per-engagement so PMs can refine context per client without
 * mutating the original intake record. */
export interface EngagementBrief {
  websiteUrl?: string;
  shopifyUrl?: string;
  primaryContact?: string;
  timezone?: string;
  primaryGoal?: string;
  successMetric?: string;
  timelineExpectation?: string;
  toneOfVoice?: string;
  wordsToAvoid?: string;
  usps?: string;
  valueProps?: string;
  targetCustomer?: string;
  competitors?: string;
  challenges?: string;
  notes?: string;
}

export const BRIEF_FIELDS: { key: keyof EngagementBrief; label: string; multiline?: boolean; group: "core" | "voice" | "context" }[] = [
  { key: "websiteUrl", label: "Website", group: "core" },
  { key: "shopifyUrl", label: "Shopify admin", group: "core" },
  { key: "primaryContact", label: "Primary contact", group: "core" },
  { key: "timezone", label: "Timezone", group: "core" },
  { key: "primaryGoal", label: "Primary goal", multiline: true, group: "core" },
  { key: "successMetric", label: "Success metric", multiline: true, group: "core" },
  { key: "timelineExpectation", label: "Timeline expectation", group: "core" },
  { key: "toneOfVoice", label: "Tone of voice", multiline: true, group: "voice" },
  { key: "wordsToAvoid", label: "Words to avoid", multiline: true, group: "voice" },
  { key: "usps", label: "USPs", multiline: true, group: "voice" },
  { key: "valueProps", label: "Value props", multiline: true, group: "voice" },
  { key: "targetCustomer", label: "Target customer", multiline: true, group: "context" },
  { key: "competitors", label: "Competitors", multiline: true, group: "context" },
  { key: "challenges", label: "Conversion challenges", multiline: true, group: "context" },
  { key: "notes", label: "PM notes", multiline: true, group: "context" },
];

export interface CycleDefinition {
  number: CycleNumber;
  name: string;
  tagline: string;
  startDay: number;
  endDay: number;
}

export interface StageDefinition {
  id: StageId;
  name: string;
  shortLabel: string;
  weeks: WeekInCycle[];
  description: string;
  accent: string;
}

export interface DeliverableTemplate {
  id: string;
  name: string;
  cycle: CycleNumber;
  stage: StageId;
  weekInCycle: WeekInCycle;
  owner: OwnerRole;
  dueDay: number;
}

export interface AssetCategory {
  id: string;
  label: string;
  description: string;
}

export const ENGAGEMENT_CYCLES: CycleDefinition[] = [
  { number: 1, name: "Month 1", tagline: "Onboard, audit, ship first major lever.", startDay: 1, endDay: 30 },
  { number: 2, name: "Month 2", tagline: "Compound on Month 1 learnings.", startDay: 31, endDay: 60 },
  { number: 3, name: "Month 3", tagline: "Stack wins, plan next 90.", startDay: 61, endDay: 90 },
];

export const STAGES_RETAINER: StageDefinition[] = [
  { id: "audit", name: "Audit & strategy", shortLabel: "Audit", weeks: [1], description: "Week 1 - findings, leak prioritisation, this cycle's strategy.", accent: "#1976D2" },
  { id: "build", name: "Design & build", shortLabel: "Build", weeks: [2, 3], description: "Weeks 2-3 - Figma to dev to staging. Whatever Week 1 prioritised gets built.", accent: "#7B1FA2" },
  { id: "test", name: "Test, learn, prep", shortLabel: "Test", weeks: [4], description: "Week 4 - ship, A/B test, readout, prep next cycle.", accent: "#00897B" },
];

/* Bucket stage templates · week ranges sized to the bucket duration so
 * a 2-week Bucket A doesn't show "Testing W3-4" for weeks it doesn't have. */
export const STAGES_BUCKET_A: StageDefinition[] = [
  { id: "design", name: "Design", shortLabel: "Design", weeks: [1, 2], description: "Figma exploration through to signed-off comp.", accent: "#7B1FA2" },
  { id: "development", name: "Development", shortLabel: "Dev", weeks: [2], description: "Build to staging, QA, push live.", accent: "#1976D2" },
  { id: "testing", name: "Testing", shortLabel: "Test", weeks: [2], description: "QA + post-launch check.", accent: "#00897B" },
];

export const STAGES_BUCKET_B: StageDefinition[] = [
  { id: "design", name: "Design", shortLabel: "Design", weeks: [1, 2], description: "Figma exploration through to signed-off comp.", accent: "#7B1FA2" },
  { id: "development", name: "Development", shortLabel: "Dev", weeks: [2, 3], description: "Build to staging, QA, push live.", accent: "#1976D2" },
  { id: "testing", name: "Testing", shortLabel: "Test", weeks: [3], description: "QA + post-launch check.", accent: "#00897B" },
];

export const STAGES_BUCKET_C: StageDefinition[] = [
  { id: "design", name: "Design", shortLabel: "Design", weeks: [1, 2], description: "Figma exploration through to signed-off comp.", accent: "#7B1FA2" },
  { id: "development", name: "Development", shortLabel: "Dev", weeks: [3, 4], description: "Build to staging, QA, push live.", accent: "#1976D2" },
  { id: "testing", name: "Testing", shortLabel: "Test", weeks: [4], description: "QA + UAT + post-launch check.", accent: "#00897B" },
];

/** Default export for places that haven't migrated to kind-aware lookup yet.
 * Retainer-only consumers can keep importing STAGES; bucket-aware code should
 * call stagesForKind(kind, bucket). */
export const STAGES = STAGES_RETAINER;

export function stagesForKind(kind: EngagementKind, bucket?: BucketSize): StageDefinition[] {
  if (kind === "retainer") return STAGES_RETAINER;
  switch (bucket) {
    case "A": return STAGES_BUCKET_A;
    case "B": return STAGES_BUCKET_B;
    case "C": return STAGES_BUCKET_C;
    default: return STAGES_BUCKET_C; // Bespoke defaults to a 4-week timeline shape
  }
}

function dueDayFor(cycle: CycleNumber, dayInCycle: number): number {
  return (cycle - 1) * 30 + dayInCycle;
}

export function weekInCycleForDay(day: number): WeekInCycle {
  const dayInCycle = ((day - 1) % 30) + 1;
  if (dayInCycle <= 7) return 1;
  if (dayInCycle <= 14) return 2;
  if (dayInCycle <= 21) return 3;
  return 4;
}

export function cycleForDay(day: number): CycleNumber {
  if (day <= 30) return 1;
  if (day <= 60) return 2;
  return 3;
}

export function stageForWeek(week: WeekInCycle): StageId {
  if (week === 1) return "audit";
  if (week === 2 || week === 3) return "build";
  return "test";
}

export function stageForDay(day: number): StageId {
  return stageForWeek(weekInCycleForDay(day));
}

// Audit deliverables are the same for every engagement (templated).
// Build + test are defined per-engagement based on what the audit + brief produced.
//
// Cadence assumption: Day 1 of cycle = Monday. Each cycle runs as a 4-week sprint
// where Day 4 = Thursday (the main delivery beat, matching pod weekly rhythm).
// Week boundaries: W1 = days 1-7, W2 = 8-14, W3 = 15-21, W4 = 22-30.
export const ENGAGEMENT_DELIVERABLES: DeliverableTemplate[] = [
  // ── Cycle 1 audit · Monday access, Thursday deliverables ──
  { id: "c1-a1", name: "Kickoff call", cycle: 1, stage: "audit", weekInCycle: 1, owner: "PM", dueDay: dueDayFor(1, 1) },
  { id: "c1-a2", name: "Shopify access", cycle: 1, stage: "audit", weekInCycle: 1, owner: "PM", dueDay: dueDayFor(1, 1) },
  { id: "c1-a3", name: "Analytics + ad access", cycle: 1, stage: "audit", weekInCycle: 1, owner: "PM", dueDay: dueDayFor(1, 1) },
  { id: "c1-a4", name: "Prior data check (heatmaps + tests)", cycle: 1, stage: "audit", weekInCycle: 1, owner: "PM", dueDay: dueDayFor(1, 1) },
  { id: "c1-a5", name: "Deep funnel audit", cycle: 1, stage: "audit", weekInCycle: 1, owner: "CRO", dueDay: dueDayFor(1, 4) },
  { id: "c1-a6", name: "90-day roadmap", cycle: 1, stage: "audit", weekInCycle: 1, owner: "CRO", dueDay: dueDayFor(1, 4) },
  { id: "c1-a7", name: "Month 1 build brief", cycle: 1, stage: "audit", weekInCycle: 1, owner: "CRO", dueDay: dueDayFor(1, 4) },

  // ── Cycle 2 audit · all Thursday (no access needed) ──
  { id: "c2-a1", name: "Month 1 results review", cycle: 2, stage: "audit", weekInCycle: 1, owner: "CRO", dueDay: dueDayFor(2, 4) },
  { id: "c2-a2", name: "Updated leak priorities", cycle: 2, stage: "audit", weekInCycle: 1, owner: "CRO", dueDay: dueDayFor(2, 4) },
  { id: "c2-a3", name: "Month 2 build brief", cycle: 2, stage: "audit", weekInCycle: 1, owner: "CRO", dueDay: dueDayFor(2, 4) },

  // ── Cycle 3 audit · all Thursday ──
  { id: "c3-a1", name: "Month 2 results review", cycle: 3, stage: "audit", weekInCycle: 1, owner: "CRO", dueDay: dueDayFor(3, 4) },
  { id: "c3-a2", name: "Month 3 build brief", cycle: 3, stage: "audit", weekInCycle: 1, owner: "CRO", dueDay: dueDayFor(3, 4) },
];

/* QA gates · structured checks each build/dev deliverable should pass
 * before it ships. Each gate is a boolean; UI shows them as small chips
 * the pod ticks off in order. */
export type QAGateKey = "design_qa" | "client_review" | "dev_qa";
export type QAGates = Partial<Record<QAGateKey, boolean>>;

export const QA_GATE_LABEL: Record<QAGateKey, string> = {
  design_qa: "Design QA",
  client_review: "Client review",
  dev_qa: "Dev QA",
};

export type TestResultStatus = "pending" | "winner" | "loser" | "inconclusive";

export interface DeliverableTestResult {
  status: TestResultStatus;
  liftPct?: number;
  significancePct?: number;
  notes?: string;
}

export interface CustomDeliverable {
  id: string;
  name: string;
  cycle: CycleNumber;
  stage: Exclude<StageId, "audit">;
  weekInCycle: WeekInCycle;
  owner: OwnerRole;
  dueDay: number;
  gates?: QAGates;
  testResult?: DeliverableTestResult;
}

export interface EngagementMetrics {
  cvrBaseline?: number;
  cvrCurrent?: number;
  aovBaseline?: number;
  aovCurrent?: number;
  metricsUpdatedAt?: string;
}

export interface EngagementWin {
  id: string;
  shippedAtDay: number;
  title: string;
  metric?: string;
  notes?: string;
}

export const ASSET_CATEGORIES_RETAINER: AssetCategory[] = [
  { id: "figma", label: "Figma", description: "Design files + builds" },
  { id: "miro", label: "Roadmap", description: "Strategy + planning boards" },
  { id: "audit", label: "Audit", description: "Funnel audits + leak findings" },
  { id: "brief", label: "Monthly brief", description: "Build briefs + readouts" },
  { id: "preview", label: "Preview URLs", description: "Staging + live builds" },
  { id: "analytics", label: "Analytics", description: "GA, Shopify, Intelligems" },
];

export const ASSET_CATEGORIES_BUCKET: AssetCategory[] = [
  { id: "figma", label: "Figma", description: "Design files + builds" },
  { id: "preview", label: "Preview URLs", description: "Staging + live builds" },
  { id: "analytics", label: "Analytics", description: "GA, Shopify, Intelligems" },
];

export const ASSET_CATEGORIES = ASSET_CATEGORIES_RETAINER;

export function assetCategoriesForKind(kind: EngagementKind): AssetCategory[] {
  return kind === "bucket" ? ASSET_CATEGORIES_BUCKET : ASSET_CATEGORIES_RETAINER;
}

export function ownerColor(_owner: OwnerRole): { bg: string; fg: string } {
  return { bg: "#F5F5F5", fg: "#1B1B1B" };
}
