/* ── Engagement spine types ──
 *
 * ONE parameterised Engagement is the canonical record. Everything that used to
 * be a bespoke "tier" or "product" is just different DATA on this one shape:
 * token pool size, which builds/tests are scoped, how deep the strategy package
 * goes. Do not branch on type for structure - branch on parameters.
 *
 * The kanban is delivery, the portal is the client view, finance is billing -
 * they are satellites referenced by id from here. pods_v2 is out of scope. */

export type EngagementType =
  | "audit"
  | "single_page"
  | "funnel"
  | "lite"
  | "core"
  | "growth"
  | "scale";

/* Terminal projects run the cycle once, compressed, then end. Retainers roll
 * monthly. is_retainer is stored (not just derived) so queries stay trivial. */
export const RETAINER_TYPES: EngagementType[] = ["lite", "core", "growth", "scale"];
export const PROJECT_TYPES: EngagementType[] = ["audit", "single_page", "funnel"];

export type EngagementStatus = "active" | "paused" | "completed" | "churned";

/* Token menu (retainer production only). Kept as a constant, not on the kanban:
 * the ledger is a manual tally in the client area. */
export type BuildUnit = "primary" | "secondary" | "tertiary" | "ab_test";
export const TOKEN_COST: Record<BuildUnit, number> = {
  primary: 10,
  secondary: 5,
  tertiary: 3,
  ab_test: 2,
};

export type TokenLedgerKind =
  | "allocation"
  | "spend"
  | "rollover"
  | "topup"
  | "adjustment";

export interface TokenLedgerEntry {
  id: string;
  engagementId: string;
  kind: TokenLedgerKind;
  /** +30 allocation, -10 primary build, -2 A/B test, etc. */
  delta: number;
  label?: string;
  occurredOn: string; // ISO yyyy-mm-dd
  createdBy?: string;
  createdAt: string;
}

export type KnowledgeType =
  | "strategy"
  | "brief"
  | "hypothesis"
  | "test_result"
  | "insight"
  | "research"
  | "report";

export type KnowledgeAudience = "client" | "team" | "both";

/** Append-only. The compounding retention asset. */
export interface KnowledgeEntry {
  id: string;
  engagementId: string;
  type: KnowledgeType;
  title: string;
  summary?: string;
  contentRef?: unknown; // url / pointer / inline snapshot
  theme?: string;
  audience: KnowledgeAudience;
  createdAt: string;
}

export type ArtifactType =
  | "onboarding_report"
  | "monthly_readout"
  | "qbr"
  | "renewal_checkpoint"
  | "roadmap_refresh";

/** The guardrail: strategy never drops to zero. Month 1 = full, month 2+ =
 *  compressed. There is no "none". */
export type StrategyScope = "full" | "compressed";

export type ArtifactStatus = "scheduled" | "generated" | "sent";

export interface EngagementArtifact {
  id: string;
  engagementId: string;
  artifactType: ArtifactType;
  cycleMonth?: number;
  strategyScope?: StrategyScope;
  dueOn?: string; // ISO
  status: ArtifactStatus;
  generatedRef?: unknown;
  createdAt: string;
  updatedAt: string;
}

/** The strategy package that comes included by tier (never tokenised). Snapshot
 *  of the config constant, stamped onto the engagement at scaffold time. */
export interface PackageInclusions {
  /** How deep strategy goes: the client's pages, or the whole business. */
  strategyScope: "pages" | "business";
  seniorLead: boolean;
  qbr: boolean;
  founderInvolvement: boolean;
  /** Free-form extras for the record / display. */
  notes?: string;
}

export interface Baseline {
  cvr?: number;
  aov?: number;
  rpv?: number;
  capturedAt?: string;
}

export interface Engagement {
  id: string;
  clientName: string;
  kanbanClientId?: string;
  kanbanProjectId?: string;
  portalId?: string;
  onboardingSubmissionId?: string;
  type: EngagementType;
  isRetainer: boolean;
  /** NULL for terminal projects; a number for retainers. */
  tokenPoolTotal?: number;
  buildUnitLabel: string;
  packageInclusions?: PackageInclusions;
  startDate?: string;
  status: EngagementStatus;
  baseline?: Baseline;
  createdAt: string;
  updatedAt: string;
}
