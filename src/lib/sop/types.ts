/* ── SOP Library Types ── */

export type SOPCategory = "design" | "development" | "cro" | "operations" | "client" | "qa";

export const SOP_CATEGORIES: { key: SOPCategory; label: string; color: string }[] = [
  { key: "design", label: "Design", color: "#7C3AED" },
  { key: "development", label: "Development", color: "#059669" },
  { key: "cro", label: "CRO", color: "#DC2626" },
  { key: "operations", label: "Operations", color: "#2563EB" },
  { key: "client", label: "Client", color: "#E37400" },
  { key: "qa", label: "QA", color: "#6B7280" },
];

/** A single directional step in an SOP. Structured so the library reads like a
 *  runbook, not a wall of prose. */
export interface SOPStep {
  id: string;
  title: string;
  body: string;
  /** Optional visual for the step - a public image URL (uploaded to the
   *  sop-images bucket) or a pasted link, shown as a thumbnail + click-to-zoom. */
  image?: string;
}

export interface SOP {
  id: string;
  /** Sequential library number, shown in mono (#001, #042). Auto-assigned on
   *  create (highest existing + 1). Optional for legacy rows. */
  number?: number;
  title: string;
  description: string;
  category: SOPCategory;
  tags: string[];
  /** A Loom share link OR a direct video file URL (.mp4/.webm/...). */
  loomUrl?: string;
  /** Directional steps - the primary content. */
  steps?: SOPStep[];
  /** "Done when" checks - how a new hire knows they ran this correctly. One
   *  line per criterion. Rendered as a checklist at the foot of the SOP. */
  exitCriteria?: string[];
  /** Freeform notes / markdown. Kept for legacy SOPs + optional appendix. */
  content: string;
  draft?: boolean; // true = only visible to admin, not published yet
  createdBy: string;
  created_at: string;
  updated_at: string;
}
