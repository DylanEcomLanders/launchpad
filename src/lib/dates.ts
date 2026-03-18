/* ── Centralised date helpers ──
 * All date formatting and business-day logic lives here.
 * Import from "@/lib/dates" instead of defining local helpers.
 */

/* ── Formatting ── */

/** "2026-03-18" → "18 Mar 2026" */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "2026-03-18" → "18 Mar" (no year) */
export function formatDayMonth(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "2026-03-18" → "Wednesday, 18 March 2026" */
export function formatLongDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** "2026-03-18" → "18 March 2026" (for PDFs / formal docs) */
export function formatFormalDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Date → "2026-03-18" (ISO date string) */
export function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Now → "2026-03-18" */
export function todayYMD(): string {
  return formatYMD(new Date());
}

/** Now → "2026-03-18" (for filenames) */
export function formatFilenameDate(): string {
  return todayYMD();
}

/* ── Business day arithmetic ── */

/** Default working days: Mon–Fri */
const DEFAULT_WORKING = new Set([1, 2, 3, 4, 5]);

/** Add `n` working days to a YYYY-MM-DD string. Optionally pass custom working day numbers. */
export function addBusinessDays(dateStr: string, n: number, workingDays?: Set<number>): string {
  const wd = workingDays || DEFAULT_WORKING;
  const d = new Date(dateStr + "T00:00:00");
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (wd.has(d.getDay())) added++;
  }
  return formatYMD(d);
}

/** Add `days` calendar days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return formatYMD(d);
}

/** Count working days between two YYYY-MM-DD strings (inclusive). */
export function businessDaysBetween(startStr: string, endStr: string, workingDays?: Set<number>): number {
  const wd = workingDays || DEFAULT_WORKING;
  const current = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  let count = 0;
  while (current <= end) {
    if (wd.has(current.getDay())) count++;
    current.setDate(current.getDate() + 1);
  }
  return Math.max(1, count);
}

/** Count calendar days between two YYYY-MM-DD strings (inclusive). */
export function calendarDaysBetween(startStr: string, endStr: string): number {
  const a = new Date(startStr + "T00:00:00").getTime();
  const b = new Date(endStr + "T00:00:00").getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1);
}
