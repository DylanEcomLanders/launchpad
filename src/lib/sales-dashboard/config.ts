// Sales Dashboard — tunable thresholds, all in one place.
// Wire-up note: these become the single source of truth for alert logic;
// surface them in a settings panel later if the team wants to tune them.

/** A lead with no contact in this many days is flagged "cold". */
export const COLD_LEAD_DAYS = 5;

/** A deal sitting in the same stage longer than this is flagged "stale". */
export const STALE_DEAL_DAYS = 7;

/**
 * Frozen "today" so the mock preview is deterministic (matches the
 * _pods-preview convention). Replace with `new Date()` at wire-up.
 */
export const MOCK_TODAY = "2026-06-19";

/** Stage names that the conversion funnel reports on, in order. */
export const FUNNEL_STEPS = [
  "New",
  "Call Booked",
  "Proposal Sent",
  "Closed Won",
] as const;
