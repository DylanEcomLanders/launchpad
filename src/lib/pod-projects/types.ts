/* ── Pod Projects: types ──
 *
 * A pod-owned project workspace. The Google Doc "Pod 1 Projects" becomes
 * structured docs: one per client engagement, grouped by pod in the left rail.
 *
 * Each doc is rich HTML (TipTap output) seeded from a template skeleton so the
 * spine — First Week Wins → Baseline → Test Results → Reports → ICE — is always
 * there without anyone rebuilding it by hand.
 */

/** Retainer vs one-time. Decides which template skeleton the doc spins up with
 *  and the header chip; it is NOT a grouping (pods are the grouping). */
export type DocType = "retainer" | "project";

/** Retainer tier — the Lite/Core/Growth/Scale line from the source doc. */
export type RetainerTier = "lite" | "core" | "growth" | "scale";

/** One navigable section of a doc — a "tab". Sections isolate: the editor
 *  shows one section's body at a time. A section may nest children (e.g.
 *  Reports → Week 1 / Week 2 / Month 1); a pure container has an empty body and
 *  clicking it drops into its first child. */
/** A test-results row — the rigid, structured alternative to a free table. */
export type TestStatus = "backlog" | "running" | "won" | "lost" | "flat";

export interface TestRow {
  id: string;
  test: string;
  hypothesis: string;
  metric: string;
  uplift: string;
  status: TestStatus;
  /** @deprecated single screenshot — read via `images` (kept for back-compat). */
  image?: string;
  /** Screenshots (downscaled data URLs) — variants / before-after / result shots. */
  images?: string[];
}

/** A dated journal entry on the Notes page. */
export interface NoteEntry {
  id: string;
  /** ISO timestamp — when it was logged. */
  at: string;
  text: string;
  /** Flagged as an upsell opportunity → highlighted. */
  upsell?: boolean;
}

export interface DocSection {
  /** Stable within a doc, e.g. "overview", "reports", "reports/week-1". */
  id: string;
  title: string;
  /** How this page renders: a free doc, the structured results grid, the dated
   *  Updates journal, or the read-only Delivery reflection of the kanban. */
  kind?: "doc" | "results" | "journal" | "wip";
  /** TipTap HTML for THIS section only. "" for pure container sections.
   *  For a "results" page this is a derived HTML mirror of `rows` (for the PDF). */
  body: string;
  /** Structured rows for a "results" page. */
  rows?: TestRow[];
  /** Dated entries for a "journal" (Notes) page. */
  entries?: NoteEntry[];
  /** Marked complete by the pod. Groups derive completion from their children. */
  done?: boolean;
  children?: DocSection[];
}

export interface PodDoc {
  id: string;
  /** Which pod owns this doc — the left-rail grouping key. */
  podId: string;
  /** Client / project name — the rail label + doc title. */
  title: string;
  type: DocType;
  tier?: RetainerTier;
  /** True for the two editable templates new clients clone from. */
  isTemplate?: boolean;
  /** The section tree — each entry is a navigable tab. Replaces the old single
   *  `body` blob so sections can be isolated + navigated. */
  sections: DocSection[];
  /** ISO date the engagement started — drives the "Day X/90" chip. */
  startDate?: string;
  created_at: string;
  updated_at: string;
}

export interface Pod {
  id: string;
  name: string;
}
