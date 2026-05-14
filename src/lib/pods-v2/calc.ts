// ─── Pure calculation helpers, pod operating-system rules ──────────

import {
  Bucket,
  BUCKET_DURATIONS,
  PAGE_VALUE_GBP,
  PAGE_WEIGHT_POINTS,
  Project,
  ProjectPage,
  RETAINER_VALUE_GBP,
  RetainerTier,
  Task,
} from "./types";

/* Per-page effective points after the same-type discount: the first
 * page of each type is full price, subsequent ones (e.g. 2nd PDP, 3rd
 * PDP) are half because the design system + dev infrastructure get
 * reused. Order matters, caller passes pages in their final order. */
export function effectivePagePoints(pages: ProjectPage[]): number[] {
  const seen = new Set<string>();
  return pages.map((p) => {
    const full = PAGE_WEIGHT_POINTS[p.weight];
    const value = seen.has(p.type) ? full * 0.5 : full;
    seen.add(p.type);
    return value;
  });
}

/** Calculate raw points from page mix (no brand-warm adjustment),
 * accounting for the same-type half-rule. */
export function rawPoints(pages: ProjectPage[]): number {
  return effectivePagePoints(pages).reduce((sum, p) => sum + p, 0);
}

/** Brand-warm halves the points (returning brand = faster work). */
export function adjustedPoints(pages: ProjectPage[], brandWarm: boolean): number {
  const raw = rawPoints(pages);
  return brandWarm ? raw * 0.5 : raw;
}

/** Auto-bucket from points: ≤6=A, 7,10=B, 11,20=C, 21+=Bespoke. */
export function bucketFromPoints(points: number): Bucket {
  if (points <= 6) return "A";
  if (points <= 10) return "B";
  if (points <= 20) return "C";
  return "Bespoke";
}

/** Day-of-week numbers: 0 = Sunday, 1 = Monday … 4 = Thursday … 6 = Saturday. */
const MONDAY = 1;
const THURSDAY = 4;

/** Parse YYYY-MM-DD as local-noon to dodge DST edge cases. */
function parseDate(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Resolve kickoff Monday from a sign-off date.
 * Rule: kickoffs only happen on Mondays. If signed before Friday 5pm,
 * the next Monday counts. If signed Friday after 5pm or weekend, push to
 * the Monday after that.
 *
 * Rush mode bypasses the Monday rule, kickoff = signoff_date, snapped
 * forward to the next weekday if signoff lands on Sat/Sun. Used by the
 * Rush exception flow on Assign-to-Pod when a project genuinely can't
 * wait for the next Monday window.
 */
export function kickoffMondayFor(
  signoffYMD: string,
  signoffHour = 12,
  rush = false,
): string {
  const d = parseDate(signoffYMD);
  const dow = d.getDay();

  if (rush) {
    // Skip the Mon-rounding. Sat → Mon, Sun → Mon (weekends have no
    // working hours so we still bump forward to the next weekday).
    if (dow === 6) d.setDate(d.getDate() + 2);
    else if (dow === 0) d.setDate(d.getDate() + 1);
    return formatYMD(d);
  }

  // If sign-off IS Monday and before 5pm, kick off same day.
  if (dow === MONDAY && signoffHour < 17) return formatYMD(d);

  // Otherwise advance to next Monday.
  const lateFriday = dow === 5 && signoffHour >= 17;
  const weekend = dow === 0 || dow === 6;

  // Days to add to land on Monday.
  let add = (8 - dow) % 7; // next Monday (1..7)
  if (add === 0) add = 7;

  // If late Friday or weekend, ensure we skip THIS week's Monday and grab the next.
  if (lateFriday || weekend) {
    if (dow === 5) add = 3; // Fri → Mon (3 days)
    if (dow === 6) add = 2; // Sat → Mon
    if (dow === 0) add = 1; // Sun → Mon
  }

  d.setDate(d.getDate() + add);
  return formatYMD(d);
}

/**
 * Calculate delivery Thursday from kickoff Monday + bucket duration.
 * Bucket A = +10 calendar days = the Thursday of week 2.
 * Bucket B = +15 → Thursday of week 3. Bucket C = +20 → Thursday of week 4.
 *
 * Rush mode halves the bucket duration (rounded up). Kickoff doesn't
 * have to be a Monday in rush mode; we still snap delivery to the
 * nearest Thursday forward of (kickoff + halved duration).
 */
export function deliveryThursdayFor(
  kickoffYMD: string,
  bucket: Bucket,
  rush = false,
): string | null {
  const dur = BUCKET_DURATIONS[bucket];
  if (dur === null) return null; // Bespoke, no auto delivery
  const effective = rush ? Math.ceil(dur / 2) : dur;
  const d = parseDate(kickoffYMD);
  d.setDate(d.getDate() + effective);
  // Snap to nearest Thursday (forward), defensive in case durations drift.
  while (d.getDay() !== THURSDAY) d.setDate(d.getDate() + 1);
  return formatYMD(d);
}

/** True if a YYYY-MM-DD string is a Monday. */
export function isMonday(ymd: string): boolean {
  return parseDate(ymd).getDay() === MONDAY;
}

/** True if a YYYY-MM-DD string is a Thursday. */
export function isThursday(ymd: string): boolean {
  return parseDate(ymd).getDay() === THURSDAY;
}

/** Project value (project pages) in GBP. */
export function projectValueGbp(pages: ProjectPage[]): number {
  return pages.reduce((sum, p) => sum + PAGE_VALUE_GBP[p.weight], 0);
}

/** Monday-Friday window for the week containing `ymd`. Returns array of YMD strings. */
export function weekDays(ymd: string): string[] {
  const d = parseDate(ymd);
  const dow = d.getDay();
  // Distance back to Monday.
  const back = dow === 0 ? 6 : dow - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - back);
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return formatYMD(day);
  });
}

/** Retainer monthly value in GBP. */
export function retainerValueGbp(tier: RetainerTier): number {
  return RETAINER_VALUE_GBP[tier];
}

/**
 * Capacity utilisation for a pod given its in-flight projects + tasks.
 *
 * Task-based: we sum points across the design half of each paired
 * deliverable (the design + dev pair share the same `points` value, so
 * counting design only avoids double-counting). Done tasks still count
 * toward capacity, they represent committed work. Deleting a task
 * removes it from the sum automatically.
 *
 * Tickets (revisions, bugs, asset_prep, etc.) carry no `points` and
 * don't count, they're variable-effort work, not scoped capacity.
 *
 * Optional time window, when `windowStart`/`windowEnd` are passed,
 * only tasks whose due_date falls inside [start, end] (inclusive) are
 * summed. Lets callers compute "this month" vs "next month" capacity
 * forward-projections off the same task graph.
 */
export function capacityUsed(
  projects: Project[],
  tasks: Task[] = [],
  windowStart?: string,
  windowEnd?: string,
): number {
  const liveProjectIds = new Set(
    projects
      .filter((p) => p.status !== "shipped" && p.status !== "slipped")
      .map((p) => p.id),
  );
  return tasks
    .filter(
      (t) =>
        t.discipline === "design" &&
        t.points != null &&
        liveProjectIds.has(t.project_id) &&
        (!windowStart || t.due_date >= windowStart) &&
        (!windowEnd || t.due_date <= windowEnd),
    )
    .reduce((sum, t) => sum + (t.points || 0), 0);
}

/** Inclusive [start, end] YMD window covering 4 weeks starting at `fromYMD`'s
 * Monday. Used for the rolling "this month / next month" capacity meter. */
export function fourWeekWindow(fromYMD: string): { start: string; end: string } {
  const d = parseDate(fromYMD);
  // Roll back to Monday of fromYMD's week.
  const dow = d.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - back);
  const start = formatYMD(d);
  d.setDate(d.getDate() + 27); // +27 = inclusive 4-week span
  return { start, end: formatYMD(d) };
}

/** True if a project is shipping in the same week as `referenceYMD`. */
export function shipsThisWeek(project: Project, referenceYMD: string): boolean {
  const week = weekDays(referenceYMD);
  return week.includes(project.delivery_date);
}

/** True if a project kicks off in the same week as `referenceYMD`. */
export function kicksOffThisWeek(project: Project, referenceYMD: string): boolean {
  const week = weekDays(referenceYMD);
  return week.includes(project.kickoff_date);
}

/** Mid-week kickoff alert: kickoff is not Monday and project is not Rush. */
export function isMidWeekKickoff(project: Project): boolean {
  return !isMonday(project.kickoff_date) && !project.is_rush;
}
