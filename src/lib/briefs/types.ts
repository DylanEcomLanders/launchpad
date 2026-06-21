/* ── Brief types ──
 *
 * Three brief kinds matching the Hero Offer playbook (Execution /
 * Roadmap & briefing). One model with optional per-kind fields -
 * simpler than three tables and the renderer switches by kind.
 */

export type BriefKind = "design" | "dev" | "hypothesis";

export type BriefStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "in_progress"
  | "done"
  | "blocked";

export interface Brief {
  id: string;
  kind: BriefKind;

  /* Bind to a client + optional roadmap item / kanban task. */
  client_name: string;
  project_label: string;
  roadmap_item_id?: string;
  kanban_task_id?: string;

  /* Common fields - all kinds carry these. */
  title: string;
  objective: string;        // markdown - what this moves
  audience: string;
  owner: string;            // assignee
  deadline?: string;        // YYYY-MM-DD
  references: string;       // markdown - links + inspiration
  status: BriefStatus;

  /* ── Design-specific ── */
  design_must_include?: string;       // markdown
  design_key_message?: string;
  design_brand_constraints?: string;

  /* ── Dev-specific ── */
  dev_what_built?: string;            // markdown
  dev_design_link?: string;
  dev_functionality?: string;
  dev_testing_tool?: "intelligems" | "visually" | "other" | "";
  dev_variant_logic?: string;
  dev_tracking_events?: string;
  dev_qa_criteria?: string;
  dev_browsers?: string;

  /* ── Hypothesis-specific ── */
  hyp_hypothesis_line?: string;       // "because we observed X, we believe Y will Z"
  hyp_primary_metric?: string;
  hyp_impact?: number;
  hyp_confidence?: number;
  hyp_ease?: number;
  hyp_control_desc?: string;
  hyp_variant_desc?: string;
  hyp_traffic_split?: string;
  hyp_tool?: "intelligems" | "visually" | "other" | "";
  hyp_min_runtime?: string;           // "until 95% sig" / "2 weeks"
  hyp_success_criteria?: string;

  /* Output sharing */
  output_slug: string;

  created_at: string;
  updated_at: string;
  sent_at?: string;
}

export const KIND_LABEL: Record<BriefKind, string> = {
  design: "Design brief",
  dev: "Dev brief",
  hypothesis: "Hypothesis brief",
};

export const KIND_TINT: Record<BriefKind, string> = {
  design: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
  dev: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30",
  hypothesis: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
};

export const STATUS_LABEL: Record<BriefStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
};

export const STATUS_TINT: Record<BriefStatus, string> = {
  draft: "bg-[#222222] text-[#9CA3AF]",
  sent: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  accepted: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
  in_progress: "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-500/40",
  done: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  blocked: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
};
