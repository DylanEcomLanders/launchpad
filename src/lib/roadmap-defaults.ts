import {
  roadmapPhaseNames,
  type RoadmapPhaseName,
  type RoadmapPhase,
} from "./config";

/* ── Touchpoint type ── */

export interface Touchpoint {
  label: string;
  date: string;
}

/* ── Date helpers ── */

/** Add `days` calendar days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Return the midpoint date between two YYYY-MM-DD strings. */
function midpointDate(startStr: string, endStr: string): string {
  const s = new Date(startStr + "T00:00:00").getTime();
  const e = new Date(endStr + "T00:00:00").getTime();
  const d = new Date(s + (e - s) * 0.5);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
        "We align on project goals, technical requirements, and success metrics. This includes a kickoff call, stakeholder interviews, and a review of your current Shopify setup.",
      clientTouchpoint:
        "You'll join the kickoff call and provide brand assets, access credentials, and any reference materials. Expect a follow-up summary document within 2 business days.",
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
 * Compute all 6 phases from the 3 manual date inputs.
 *
 * Cascade:
 *   Kickoff          = kickoffDate (point)
 *   Design           = kickoffDate → designEndDate
 *   Revision         = designEndDate + 1 → +4 calendar days
 *   Development      = revisionEnd + 1 → devEndDate
 *   Launch           = devEndDate + 1 (point)
 *   30-Day Support   = launchDate → launchDate + 29
 */
export function computeAllPhases(
  kickoffDate: string,
  designEndDate: string,
  devEndDate: string
): RoadmapPhase[] {
  const revisionStart = addDays(designEndDate, 1);
  const revisionEnd = addDays(revisionStart, 3);
  const devStart = addDays(revisionEnd, 1);
  const launchDate = addDays(devEndDate, 1);
  const supportEnd = addDays(launchDate, 29);

  const dateMap: Record<RoadmapPhaseName, { start: string; end: string }> = {
    Kickoff: { start: kickoffDate, end: kickoffDate },
    Design: { start: kickoffDate, end: designEndDate },
    Revision: { start: revisionStart, end: revisionEnd },
    Development: { start: devStart, end: devEndDate },
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

/* ── Touchpoint computation ── */

/** Return client touchpoints for a phase. */
export function computePhaseTouchpoints(phase: RoadmapPhase): Touchpoint[] {
  switch (phase.name) {
    case "Kickoff":
      return phase.startDate
        ? [{ label: "Kickoff Call", date: phase.startDate }]
        : [];

    case "Design":
      return phase.startDate && phase.endDate
        ? [
            {
              label: "Design Touchpoint",
              date: midpointDate(phase.startDate, phase.endDate),
            },
          ]
        : [];

    case "Development":
      return phase.startDate && phase.endDate
        ? [
            {
              label: "50% Check-in",
              date: midpointDate(phase.startDate, phase.endDate),
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
