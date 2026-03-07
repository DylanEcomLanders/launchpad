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

/* ── Timeline presets ── */

export interface TimelinePreset {
  key: string;
  label: string;
  designDays: number; // business days
  devDays: number; // business days
}

export const timelinePresets: TimelinePreset[] = [
  { key: "standard", label: "Standard (4 weeks)", designDays: 5, devDays: 5 },
  { key: "extended", label: "Extended (6 weeks)", designDays: 10, devDays: 10 },
  {
    key: "full-rebuild",
    label: "Full Rebuild (8 weeks)",
    designDays: 15,
    devDays: 15,
  },
];

const REVISION_BUSINESS_DAYS = 4;

/* ── Date helpers ── */

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add `days` calendar days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return formatYMD(d);
}

/** Add `n` business days (skipping weekends) to a YYYY-MM-DD string. */
export function addBusinessDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return formatYMD(d);
}

/** Count business days between two YYYY-MM-DD strings (inclusive). */
export function businessDaysBetween(
  startStr: string,
  endStr: string
): number {
  const current = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  let count = 0;
  while (current <= end) {
    if (current.getDay() !== 0 && current.getDay() !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return Math.max(1, count);
}

/** Count calendar days between two YYYY-MM-DD strings (inclusive). */
export function calendarDaysBetween(
  startStr: string,
  endStr: string
): number {
  const a = new Date(startStr + "T00:00:00").getTime();
  const b = new Date(endStr + "T00:00:00").getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1);
}

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
