/* ── Funnel Roadmap ──
 * Replaces the legacy node-canvas funnel builder. Roadmap is a strictly
 * linear, ordered shape: traffic sources fan into the first page, pages
 * flow left → right, lead gen sits as an optional parallel track.
 *
 * No positions, no drag-drop, no health scores, no performance tabs.
 * Pure pick-and-render. The whole point is replicability — anyone on
 * the team can build a client roadmap in <3 minutes.
 *
 * Persistence: `roadmaps` Supabase table. Public sharing via shareToken
 * UUID at /funnel/{token}.
 */

import type {
  TrafficSource,
  PageNodeType,
  FunnelStage,
  LeadMagnetFormat,
} from "./types";

export type RoadmapStepStatus =
  | "planned"
  | "in-build"
  | "live"
  | "optimising";

export const ROADMAP_STATUS_LABELS: Record<RoadmapStepStatus, string> = {
  planned: "Planned",
  "in-build": "In build",
  live: "Live",
  optimising: "Optimising",
};

export const ROADMAP_STATUS_COLORS: Record<
  RoadmapStepStatus,
  { bg: string; text: string; dot: string; ring: string }
> = {
  planned: {
    bg: "#F3F3F5",
    text: "#7A7A7A",
    dot: "#C5C5C5",
    ring: "#E5E5EA",
  },
  "in-build": {
    bg: "#FEF3C7",
    text: "#A16207",
    dot: "#F59E0B",
    ring: "#FDE68A",
  },
  live: {
    bg: "#D1FAE5",
    text: "#059669",
    dot: "#10B981",
    ring: "#A7F3D0",
  },
  optimising: {
    bg: "#DBEAFE",
    text: "#2563EB",
    dot: "#3B82F6",
    ring: "#BFDBFE",
  },
};

interface BaseStep {
  id: string;
  status: RoadmapStepStatus;
  /** 1-2 line note shown below the node + in the client list. */
  note?: string;
  /** Free-text KPI target — "≥3% CVR", "100 leads/mo", etc. */
  kpiTarget?: string;
  /** Optional override for the default node label. */
  customLabel?: string;
}

export interface TrafficStep extends BaseStep {
  kind: "traffic";
  source: TrafficSource;
}

export interface PageStep extends BaseStep {
  kind: "page";
  pageType: PageNodeType;
  /** Stage classification (TOFU / MOFU / BOFU). Auto-suggested from
   * pageType; user can override. */
  stage?: FunnelStage;
}

export interface LeadMagnetStep extends BaseStep {
  kind: "lead-magnet";
  format: LeadMagnetFormat;
}

export interface EmailSequenceStep extends BaseStep {
  kind: "email-sequence";
  emailCount?: number;
}

export type RoadmapStep =
  | TrafficStep
  | PageStep
  | LeadMagnetStep
  | EmailSequenceStep;

export interface LeadGenTrack {
  magnet: LeadMagnetStep;
  sequence: EmailSequenceStep;
}

export interface RoadmapData {
  id: string;
  shareToken: string; // UUID for public link
  name: string;
  clientId?: string;
  clientName: string;

  trafficSources: TrafficStep[];
  pages: PageStep[];
  leadGen?: LeadGenTrack;

  created_at: string;
  updated_at: string;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

export function newRoadmapId(): string {
  return `rm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newStepId(): string {
  return `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function newShareToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Array.from({ length: 32 })
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
}

/** Default stage suggestion from page type. User can override. */
export function defaultStageForPage(p: PageNodeType): FunnelStage {
  switch (p) {
    case "Landing Page":
    case "Advertorial":
    case "About / Header / Blog":
      return "tofu";
    case "Homepage":
    case "Collection Page":
      return "mofu";
    case "PDP (Product Page)":
    case "Cart":
    case "Checkout":
    case "Upsell":
    case "Thank You":
      return "bofu";
    default:
      return "mofu";
  }
}

/** Count steps in a state — used by progress summary. */
export function countByStatus(roadmap: RoadmapData): Record<RoadmapStepStatus, number> {
  const counts: Record<RoadmapStepStatus, number> = {
    planned: 0,
    "in-build": 0,
    live: 0,
    optimising: 0,
  };
  const allSteps: RoadmapStep[] = [
    ...roadmap.trafficSources,
    ...roadmap.pages,
    ...(roadmap.leadGen ? [roadmap.leadGen.magnet, roadmap.leadGen.sequence] : []),
  ];
  for (const s of allSteps) counts[s.status]++;
  return counts;
}

export function totalStepCount(roadmap: RoadmapData): number {
  return (
    roadmap.trafficSources.length +
    roadmap.pages.length +
    (roadmap.leadGen ? 2 : 0)
  );
}
