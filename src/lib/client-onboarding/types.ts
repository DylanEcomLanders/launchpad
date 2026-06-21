/* ── Client onboarding types ──
 *
 * Per the playbook's first-week wow checklist. Owner field per
 * item so it's clear who's on the hook for each step.
 */

export type OnboardingStatus = "in_progress" | "completed" | "abandoned";

export interface OnboardingChecklistItem {
  id: string;
  title: string;
  description: string;
  owner_role: "csm" | "strategist" | "pod" | "client";
  /* Order within the checklist for display. */
  order: number;
  /* Target days from started_at the item should be done by. */
  due_offset_days: number;
  done_at?: string;          // ISO when ticked
  done_by?: string;
  notes?: string;
}

export interface ClientOnboarding {
  id: string;
  client_name: string;
  client_id?: string;
  proposal_id?: string;
  tier?: "Entry" | "Core" | "VIP";

  csm_name: string;
  strategist_name: string;

  started_at: string;         // ISO
  status: OnboardingStatus;
  completed_at?: string;
  /* Optional notes - free-form context for the team. */
  notes: string;

  items: OnboardingChecklistItem[];

  created_at: string;
  updated_at: string;
}

export const OWNER_LABEL: Record<OnboardingChecklistItem["owner_role"], string> = {
  csm: "CSM",
  strategist: "Strategist",
  pod: "Pod",
  client: "Client",
};

export const STATUS_LABEL: Record<OnboardingStatus, string> = {
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Abandoned",
};
export const STATUS_TINT: Record<OnboardingStatus, string> = {
  in_progress: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  abandoned: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
};
