import {
  roadmapPhaseNames,
  deliverableTimeEstimates,
  type RoadmapPhaseName,
  type RoadmapPhase,
  type DeliverableType,
} from "./config";
import {
  formatYMD,
  addDays,
  addBusinessDays,
  businessDaysBetween,
  calendarDaysBetween,
} from "./dates";

/* ── Touchpoint type ── */

export interface Touchpoint {
  label: string;
  date: string;
}

/* ── Deliverable-based timeline computation ── */

/**
 * Compute design & dev day totals from deliverable types.
 *
 * Uses sqrt(n) compression: work is built in parallel so
 * total = rawDays / sqrt(count), rounded up.
 *
 * Example (PDP = 4d each):
 *   1 PDP → 4 / √1 = 4
 *   2 PDP → 8 / √2 = 6
 *   3 PDP → 12 / √3 = 7
 */
export function computeDesignDevDays(
  types: (DeliverableType | "")[]
): { designDays: number; devDays: number } {
  const valid = types.filter(
    (t): t is DeliverableType => t !== "" && t in deliverableTimeEstimates
  );
  if (valid.length === 0) return { designDays: 0, devDays: 0 };

  const rawDesign = valid.reduce(
    (sum, t) => sum + deliverableTimeEstimates[t].designDays,
    0
  );
  const rawDev = valid.reduce(
    (sum, t) => sum + deliverableTimeEstimates[t].devDays,
    0
  );
  const count = valid.length;

  return {
    designDays: Math.max(1, Math.ceil(rawDesign / Math.sqrt(count))),
    devDays: Math.max(1, Math.ceil(rawDev / Math.sqrt(count))),
  };
}

const REVISION_BUSINESS_DAYS = 4;

/* ── Date helpers — re-exported from @/lib/dates ── */
export { addDays, addBusinessDays, businessDaysBetween, calendarDaysBetween } from "./dates";

/** Return the midpoint business day between two YYYY-MM-DD strings. */
function midpointBusinessDay(startStr: string, endStr: string): string {
  const total = businessDaysBetween(startStr, endStr);
  const half = Math.floor(total / 2);
  return addBusinessDays(startStr, half);
}

/* ── Phase defaults (descriptions + client touchpoint prose) ── */

interface PhaseDefault {
  description: string;
  clientTouchpoint: string;
}

export const defaultPhaseDescriptions: Record<RoadmapPhaseName, PhaseDefault> =
  {
    Kickoff: {
      description:
        "We align on project goals, technical requirements, and success metrics. This includes stakeholder interviews, a review of your current Shopify setup, and internal planning to ensure a smooth start.",
      clientTouchpoint:
        "You'll provide brand assets, access credentials, and any reference materials. Expect a follow-up summary document within 2 business days.",
    },
    Design: {
      description:
        "Our design team creates mockups and wireframes based on the discovery findings. Designs are built to your brand guidelines and optimised for conversion.",
      clientTouchpoint:
        "You'll receive a design touchpoint at the midpoint of this phase to review progress and share feedback before we finalise.",
    },
    Revision: {
      description:
        "A focused 4-day revision cycle where we incorporate your design feedback, refining layouts, copy, and visual details before sign-off.",
      clientTouchpoint:
        "You'll review updated designs and provide consolidated feedback. We'll confirm sign-off before moving into development.",
    },
    Development: {
      description:
        "Our developers build the approved designs in Shopify, implementing custom functionality, theme modifications, and third-party integrations as scoped.",
      clientTouchpoint:
        "You'll receive a progress check-in at the halfway mark of the development phase.",
    },
    Launch: {
      description:
        "We deploy the final build to your live Shopify store. This includes DNS updates if needed, final smoke testing, and a post-launch monitoring period.",
      clientTouchpoint:
        "You'll receive a launch-day checklist and a post-launch summary. Our team will be on standby for the first 48 hours to address any issues.",
    },
    "30-Day Support": {
      description:
        "A 30-day post-launch support period where our team monitors performance, addresses any issues, and ensures everything runs smoothly.",
      clientTouchpoint:
        "You'll have direct access to our support team for bug fixes, minor adjustments, and questions during this period.",
    },
  };

/* ── Cascade computation ── */

/**
 * Compute all 6 phases from kickoff date + preset durations (business days).
 *
 * Cascade:
 *   Kickoff          = kickoffDate (point)
 *   Design           = kickoffDate → +designDays business days
 *   Revision         = designEnd + 1bd → +4 business days
 *   Development      = revisionEnd + 1bd → +devDays business days
 *   Launch           = devEnd + 1bd (point)
 *   30-Day Support   = launchDate → +30 calendar days
 */
export function computeAllPhases(
  kickoffDate: string,
  designDays: number,
  devDays: number
): RoadmapPhase[] {
  const designEnd = addBusinessDays(kickoffDate, designDays - 1);
  const revisionStart = addBusinessDays(designEnd, 1);
  const revisionEnd = addBusinessDays(
    revisionStart,
    REVISION_BUSINESS_DAYS - 1
  );
  const devStart = addBusinessDays(revisionEnd, 1);
  const devEnd = addBusinessDays(devStart, devDays - 1);
  const launchDate = addBusinessDays(devEnd, 1);
  const supportEnd = addDays(launchDate, 29);

  const dateMap: Record<RoadmapPhaseName, { start: string; end: string }> = {
    Kickoff: { start: kickoffDate, end: kickoffDate },
    Design: { start: kickoffDate, end: designEnd },
    Revision: { start: revisionStart, end: revisionEnd },
    Development: { start: devStart, end: devEnd },
    Launch: { start: launchDate, end: launchDate },
    "30-Day Support": { start: launchDate, end: supportEnd },
  };

  return roadmapPhaseNames.map((name) => ({
    name,
    startDate: dateMap[name].start,
    endDate: dateMap[name].end,
    description: defaultPhaseDescriptions[name].description,
    notes: "",
  }));
}

/* ── Duration display helper ── */

/** Return a human-readable duration for a phase. */
export function phaseDuration(phase: RoadmapPhase): number {
  if (phase.startDate === phase.endDate) return 0;
  if (phase.name === "30-Day Support") {
    return calendarDaysBetween(phase.startDate, phase.endDate);
  }
  return businessDaysBetween(phase.startDate, phase.endDate);
}

/* ── Touchpoint computation ── */

/** Return client touchpoints for a phase. */
export function computePhaseTouchpoints(phase: RoadmapPhase): Touchpoint[] {
  switch (phase.name) {
    case "Kickoff":
      return phase.startDate
        ? [{ label: "Kickoff", date: phase.startDate }]
        : [];

    case "Design":
      return phase.startDate && phase.endDate
        ? [
            {
              label: "Design Touchpoint",
              date: midpointBusinessDay(phase.startDate, phase.endDate),
            },
          ]
        : [];

    case "Development":
      return phase.startDate && phase.endDate
        ? [
            {
              label: "50% Check-in",
              date: midpointBusinessDay(phase.startDate, phase.endDate),
            },
          ]
        : [];

    case "Launch":
      return phase.startDate
        ? [{ label: "Launch Day", date: phase.startDate }]
        : [];

    default:
      return [];
  }
}
