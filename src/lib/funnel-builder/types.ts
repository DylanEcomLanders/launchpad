/* ── Funnel Builder Types ── */

export type TrafficSource =
  | "meta-ads"
  | "google-ads"
  | "tiktok"
  | "email"
  | "organic"
  | "referral"
  | "direct";

export type PageNodeType =
  | "PDP (Product Page)"
  | "Collection Page"
  | "Landing Page"
  | "Homepage"
  | "Advertorial"
  | "About / Header / Blog"
  | "Cart"
  | "Checkout"
  | "Upsell"
  | "Thank You";

export type LeadMagnetFormat = "pdf" | "video" | "tool" | "quiz" | "other";

export type FunnelNodeStatus = "planned" | "in-progress" | "live";
export type TrafficWarmth = "cold" | "warm" | "hot";
export type FunnelStage = "tofu" | "mofu" | "bofu";

export interface FunnelNodeMetrics {
  traffic?: number;
  cvr?: number;
  dropOff?: number;
  aov?: number;
}

export interface LeadMagnetMetrics {
  optInCvr?: number; // %
}

export interface EmailSequenceMetrics {
  emailCount?: number;
  openRate?: number; // %
  clickRate?: number; // %
}

export interface ContentSlot {
  headline: boolean;
  hook: boolean;
  offer: boolean;
  cta: boolean;
  socialProof: boolean;
}

export const DEFAULT_CONTENT_SLOTS: ContentSlot = {
  headline: false,
  hook: false,
  offer: false,
  cta: false,
  socialProof: false,
};

export interface FunnelNodeData {
  nodeType: "traffic" | "page" | "lead-magnet" | "email-sequence";
  subType: TrafficSource | PageNodeType | string;
  label: string;
  status: FunnelNodeStatus;
  warmth?: TrafficWarmth;
  stage?: FunnelStage;
  previewUrl?: string;
  metrics?: FunnelNodeMetrics;
  // Lead Magnet specific
  leadMagnetFormat?: LeadMagnetFormat;
  leadMagnetMetrics?: LeadMagnetMetrics;
  // Email Sequence specific
  emailSequenceMetrics?: EmailSequenceMetrics;
  // Content slots (page + lead magnet nodes)
  contentSlots?: ContentSlot;
}

export interface FunnelEdgeData {
  label?: string;
}

export type FunnelMode = "strategy" | "performance";

export interface FunnelData {
  id: string;
  name: string;
  clientId?: string;
  clientName: string;
  mode: FunnelMode;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  created_at: string;
  updated_at: string;
}

/** Serialised node for storage (React Flow node shape) */
export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: FunnelNodeData;
}

/** Serialised edge for storage */
export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: FunnelEdgeData;
}

export interface FunnelTemplate {
  id: string;
  name: string;
  description: string;
  nodes: Omit<SerializedNode, "id">[];
  edges: { source: number; target: number }[]; // index-based for templates
}
