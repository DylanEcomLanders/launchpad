/* ── Client lifecycle milestone types ── */

export type MilestoneDay = 30 | 90 | 180 | 365;
export type MilestoneStatus = "upcoming" | "due" | "in_progress" | "completed" | "skipped";

export interface MilestoneChecklistItem {
  id: string;
  title: string;
  done_at?: string;
}

export interface ClientMilestone {
  id: string;
  client_name: string;
  day: MilestoneDay;
  /* engagement_start_date - basis for due_at computation. ISO. */
  engagement_started_at: string;
  /* due_at = engagement_started_at + day*86400000. Cached for sorting. */
  due_at: string;

  status: MilestoneStatus;
  owner: string;
  notes: string;                // markdown

  items: MilestoneChecklistItem[];

  completed_at?: string;

  created_at: string;
  updated_at: string;
}

export const MILESTONE_TITLE: Record<MilestoneDay, string> = {
  30: "Day 30 - pages live, tests live, kickoff retro",
  90: "Day 90 - pattern of wins, roadmap refresh, expansion check",
  180: "Day 180 - case study angle, renewal anchor",
  365: "Day 365 - annual review, multi-year, referral, second pod",
};

export const STATUS_LABEL: Record<MilestoneStatus, string> = {
  upcoming: "Upcoming",
  due: "Due",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped",
};

export const STATUS_TINT: Record<MilestoneStatus, string> = {
  upcoming: "bg-[#222222] text-[#9CA3AF]",
  due: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  in_progress: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
  completed: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  skipped: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
};
