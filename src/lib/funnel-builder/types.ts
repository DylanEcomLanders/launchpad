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

export type FunnelNodeStatus = "planned" | "in-progress" | "live";
export type TrafficWarmth = "cold" | "warm" | "hot";

export interface FunnelNodeMetrics {
  traffic?: number;
  cvr?: number;
  dropOff?: number;
  aov?: number;
}

export interface FunnelNodeData {
  nodeType: "traffic" | "page";
  subType: TrafficSource | PageNodeType;
  label: string;
  status: FunnelNodeStatus;
  warmth?: TrafficWarmth;
  metrics?: FunnelNodeMetrics;
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
