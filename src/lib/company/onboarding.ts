/* ── Default team-member onboarding checklist ──
 *
 * Seeded onto Person.onboarding_checklist the first time their status
 * flips to 'onboarding'. due_offset_days is relative to
 * onboarding_started_at (which defaults to start_date when set). The
 * checklist can be ticked / extended per-person from the Onboarding
 * tab; this is just the starting template.
 *
 * Keep it short. Long checklists go ignored. Add to this list only
 * when there's a recurring step every new contractor hits.
 */

import type { OnboardingTask } from "./types";

/* Generates a fresh copy with new ids - dont reuse object references
 * across persons or status edits on one person leak into another. */
export function defaultOnboardingChecklist(uid: () => string): OnboardingTask[] {
  const items: Array<Omit<OnboardingTask, "id">> = [
    {
      order: 1,
      title: "Welcome message + intro to the agency",
      description:
        "Slack DM with the 5-min intro: how we run pods, where the work lives, who's who.",
      due_offset_days: 0,
    },
    {
      order: 2,
      title: "Contract signed",
      description:
        "Generate the master Ecom Landers contract (covers comp + confidentiality + IP). Counter-sign when returned.",
      due_offset_days: 3,
    },
    {
      order: 4,
      title: "Tools access granted",
      description:
        "Slack channels added, Figma seat assigned, Notion shared, Vercel access if dev.",
      due_offset_days: 3,
    },
    {
      order: 5,
      title: "Pod assignment + first 1:1",
      description:
        "Confirm pod, primary + secondary roles, link Person to PodMember on the Overview tab.",
      due_offset_days: 5,
    },
    {
      order: 6,
      title: "First build assigned",
      description:
        "Something small + finite so the new contractor can ship in week one.",
      due_offset_days: 7,
    },
    {
      order: 7,
      title: "First invoice submitted + paid",
      description:
        "Closes the loop on payment terms. Link the invoice to their Person via linked_person_id.",
      due_offset_days: 21,
    },
    {
      order: 8,
      title: "30-day review + active status",
      description:
        "Short call. If keeping them on, flip status from 'onboarding' to 'active'.",
      due_offset_days: 30,
    },
  ];
  return items.map((i) => ({ ...i, id: uid() }));
}

/* How long the onboarding clock runs. Used by the tab for progress
 * bar + the "X days remaining" copy. */
export const ONBOARDING_PERIOD_DAYS = 30;
