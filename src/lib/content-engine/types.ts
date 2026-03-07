// ── Platform Types ──

export type Platform = "twitter" | "linkedin" | "tiktok" | "instagram";

export interface PlatformConfig {
  id: Platform;
  label: string;
  icon: string;
  maxLength?: number;
  formats: ContentFormat[];
}

export interface ContentFormat {
  id: string;
  label: string;
  description: string;
  maxLength?: number;
  structure: string;
}

// ── Funnel Types ──

export type FunnelStage = "tofu" | "mofu" | "bofu";

export interface FunnelStageConfig {
  id: FunnelStage;
  label: string;
  fullLabel: string;
  description: string;
  goal: string;
  color: string;
  bgColor: string;
  borderColor: string;
  contentTypes: string[];
  ctas: string[];
}

export type ContentStatus = "idea" | "drafted" | "scheduled" | "published";

export interface ContentPiece {
  id: string;
  title: string;
  platform: Platform;
  funnelStage: FunnelStage;
  format: string;
  status: ContentStatus;
  topic: string;
  hook: string;
  cta: string;
  notes: string;
  createdAt: string;
}

// ── Repurposer Types ──

export type SourceFormat =
  | "case-study"
  | "blog-post"
  | "video-script"
  | "twitter-thread"
  | "linkedin-article"
  | "podcast-notes"
  | "client-result";

export interface SourceContent {
  format: SourceFormat;
  title: string;
  body: string;
  keyPoints: string[];
  clientName: string;
  metric: string;
  topic: string;
}

export interface RepurposedOutput {
  platform: Platform;
  format: string;
  content: string;
  tips: string[];
  charCount: number;
}

// ── Hook Generator Types ──

export type HookFormula =
  | "contrarian"
  | "stat-lead"
  | "question"
  | "story-open"
  | "hot-take"
  | "before-after"
  | "curiosity-gap"
  | "social-proof"
  | "myth-bust"
  | "direct-value";

export interface HookFormulaConfig {
  id: HookFormula;
  label: string;
  description: string;
  template: string;
  bestFor: Platform[];
}

export interface HookInput {
  topic: string;
  clientName: string;
  metric: string;
  painPoint: string;
  solution: string;
  industry: string;
}

export interface GeneratedHook {
  id: string;
  platform: Platform;
  formula: HookFormula;
  text: string;
  charCount: number;
  saved: boolean;
}
