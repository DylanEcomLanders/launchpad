/* ── Engagement configuration (the parameter table) ──
 *
 * The ONLY place engagement types differ. Onboarding reads this to scaffold;
 * nothing downstream should branch on `type`. To add or retune a tier, edit
 * this map - not the scaffold, the views, or the schema.
 *
 * Token pools: retainers only (projects are null). Numbers per the offer ladder
 * (Core 30 / Growth 50 / Scale 70; Lite is "light" - placeholder, tune freely).
 * Package = strategy, never tokenised - it is described here, not metered. */

import type {
  EngagementType,
  PackageInclusions,
} from "./types";

export interface EngagementConfig {
  label: string;
  isRetainer: boolean;
  /** Null for terminal projects. */
  tokenPoolTotal: number | null;
  /** How many monthly cycles the scaffold seeds up front. Projects = 1
   *  compressed run; retainers seed month 1 (full) and we roll forward. */
  seededCycles: number;
  package: PackageInclusions;
  /** One-line nature, for display. */
  nature: string;
}

export const ENGAGEMENT_CONFIG: Record<EngagementType, EngagementConfig> = {
  audit: {
    label: "Audit",
    isRetainer: false,
    tokenPoolTotal: null,
    seededCycles: 1,
    nature: "Terminal. Diagnostic + roadmap, credited toward first build.",
    package: { strategyScope: "pages", seniorLead: false, qbr: false, founderInvolvement: false },
  },
  single_page: {
    label: "Single Page",
    isRetainer: false,
    tokenPoolTotal: null,
    seededCycles: 1,
    nature: "Terminal one-off page build.",
    package: { strategyScope: "pages", seniorLead: false, qbr: false, founderInvolvement: false },
  },
  funnel: {
    label: "Funnel Build",
    isRetainer: false,
    tokenPoolTotal: null,
    seededCycles: 1,
    nature: "Terminal. Advertorial + page + cart.",
    package: { strategyScope: "pages", seniorLead: false, qbr: false, founderInvolvement: false },
  },
  lite: {
    label: "Lite",
    isRetainer: true,
    tokenPoolTotal: 15, // "light" - placeholder, tune when the tier firms up
    seededCycles: 1,
    nature: "Rolling. Retention net / step-down.",
    package: { strategyScope: "pages", seniorLead: false, qbr: false, founderInvolvement: false },
  },
  core: {
    label: "Core",
    isRetainer: true,
    tokenPoolTotal: 30,
    seededCycles: 1,
    nature: "Rolling. Strategy on the client's pages.",
    package: { strategyScope: "pages", seniorLead: false, qbr: false, founderInvolvement: false },
  },
  growth: {
    label: "Growth",
    isRetainer: true,
    tokenPoolTotal: 50,
    seededCycles: 1,
    nature: "Rolling. Strategy on the whole business, senior lead, QBRs. Flagship.",
    package: { strategyScope: "business", seniorLead: true, qbr: true, founderInvolvement: false },
  },
  scale: {
    label: "Scale",
    isRetainer: true,
    tokenPoolTotal: 70,
    seededCycles: 1,
    nature: "Rolling. Higher volume, founder involvement, portfolio-wide.",
    package: { strategyScope: "business", seniorLead: true, qbr: true, founderInvolvement: true },
  },
};

export function configFor(type: EngagementType): EngagementConfig {
  return ENGAGEMENT_CONFIG[type];
}
