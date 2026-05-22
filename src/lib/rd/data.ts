/* ── R&D Tracker data layer ──
 * Wraps createStore() for each rd_* table. Identical pattern to
 * onboarding.ts, company/data.ts, changelog/data.ts.
 *
 * Multi-device sync posture: we only call create / update / remove
 * (additive), never saveAll (destructive diff). That matches the
 * MEMORY note about solo-store vs multi-device. The whole team writes
 * here, so additive-only is mandatory.
 */

import { createStore } from "@/lib/supabase-store";
import type { Initiative, Subpoint, Idea } from "./types";

export const initiativeStore = createStore<Initiative>({
  table: "rd_initiatives",
  lsKey: "launchpad-rd-initiatives",
});

export const subpointStore = createStore<Subpoint>({
  table: "rd_subpoints",
  lsKey: "launchpad-rd-subpoints",
});

export const ideaStore = createStore<Idea>({
  table: "rd_ideas",
  lsKey: "launchpad-rd-ideas",
});

/* ── Helpers ──────────────────────────────────────────────────── */

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/* Local "who am I" — text fallback while there's no users table.
 * Read by the modals to pre-fill owner / submitted_by. Anyone can
 * overwrite it from the field; we just want a sensible default so
 * the form doesn't feel anonymous. */
const CURRENT_USER_KEY = "launchpad-current-user-name";
export function getCurrentUserName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CURRENT_USER_KEY) || "";
}
export function setCurrentUserName(name: string): void {
  if (typeof window === "undefined") return;
  if (name.trim()) localStorage.setItem(CURRENT_USER_KEY, name.trim());
}

/* Derived: percent of sub-points completed. Zero sub-points returns 0
 * (per spec) so the dashboard card shows "0%" rather than NaN. */
export function progressPct(subpoints: Subpoint[]): number {
  if (subpoints.length === 0) return 0;
  const done = subpoints.filter((s) => s.done).length;
  return Math.round((done / subpoints.length) * 100);
}

/* Derived: most recent timestamp across the initiative row and its
 * children. Compared against now() to drive the stale flag and the
 * "last touched" label. */
export function lastTouchedISO(
  initiative: Initiative,
  subpoints: Subpoint[],
): string {
  let latest = initiative.updated_at || initiative.created_at;
  for (const s of subpoints) {
    if (s.updated_at && s.updated_at > latest) latest = s.updated_at;
  }
  return latest;
}

/* Stale flag: active initiative not touched in 14+ days. Computed
 * client-side for V1 (TODO(stale-cron): nightly job that writes a
 * persisted flag so the dashboard doesn't need to recompute). */
const STALE_DAYS = 14;
export function isStale(
  initiative: Initiative,
  subpoints: Subpoint[],
  now: number = Date.now(),
): boolean {
  if (initiative.status !== "active") return false;
  const last = new Date(lastTouchedISO(initiative, subpoints)).getTime();
  if (Number.isNaN(last)) return false;
  return now - last > STALE_DAYS * 24 * 60 * 60 * 1000;
}

/* Relative time formatter — same shape as the helper in /tools/issues
 * to keep the visual language consistent. Returns "today" for <24h. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = now - ts;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return "today";
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/* Convenience: first name (or full string if no space). Used on the
 * dashboard cards where space is tight. */
export function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

/* Sub-points for one initiative, sorted by position then created_at. */
export function sortSubpoints(subpoints: Subpoint[]): Subpoint[] {
  return [...subpoints].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return (a.created_at || "").localeCompare(b.created_at || "");
  });
}

/* Next position to use when appending a sub-point to an initiative.
 * One higher than the current max so a new row falls in at the bottom. */
export function nextPosition(subpoints: Subpoint[]): number {
  if (subpoints.length === 0) return 0;
  return Math.max(...subpoints.map((s) => s.position)) + 1;
}
