/* ── Onboarding → kanban front door ──
 * Promotes an approved OnboardingSubmission into the CANONICAL delivery model
 * (kanban_clients + kanban_projects), so the client flows to the board, /clients,
 * and /kpi automatically. Replaces the old pods-v2 "purgatory" spawn, which wrote
 * a store nothing downstream reads.
 *
 * Idempotent: keyed on the submission id, so re-approval / double-click / a
 * cross-device replay upserts the same rows instead of duplicating.
 */

import type { OnboardingSubmission } from "@/lib/onboarding";
import { upsertClients, upsertProjects } from "@/lib/kanban/data";
import type { MockClient, MockProject, OnboardingBrief } from "@/lib/projects/mock-data";

function onboardingToBrief(s: OnboardingSubmission): OnboardingBrief {
  return {
    websiteUrl: s.website_url || undefined,
    shopifyUrl: s.myshopify_url || undefined,
    primaryContact: s.primary_contact || undefined,
    timezone: s.timezone || undefined,
    primaryGoal: s.primary_goal || undefined,
    successMetric: s.success_definition || undefined,
    timelineExpectation: s.timeline_expectations || undefined,
    toneOfVoice: s.tone_of_voice || undefined,
    wordsToAvoid: s.words_to_avoid || undefined,
    usps: s.usps || undefined,
    valueProps: s.core_value_props || undefined,
    targetCustomer: s.target_customer || undefined,
    competitors: s.top_competitors || undefined,
    challenges: s.conversion_challenges || undefined,
    notes: s.additional_info || undefined,
  };
}

/** This week's Monday (YYYY-MM-DD) — the delivery start anchor. */
function thisMonday(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

export interface PromoteResult {
  clientId: string;
  projectId: string;
}

/** Create (or return the existing) canonical kanban client + first project for an
 *  approved onboarding submission. Deterministic ids keep it idempotent.
 *
 *  Commercial fields (tier / MRR) are intentionally left unset — the CSM enters
 *  those per account on the /clients page (they own that number), never faked
 *  here. The project is a `build` starting this Monday; the PM scopes its
 *  deliverables on the board. */
export async function promoteOnboardingToKanban(
  submission: OnboardingSubmission,
): Promise<PromoteResult> {
  const clientId = submission.assigned_client_id ?? `onb-${submission.id}`;
  const projectId = submission.assigned_project_id ?? `onb-proj-${submission.id}`;

  const project: MockProject = {
    id: projectId,
    name: `${submission.company_name} build`,
    type: "build",
    startDate: thisMonday(),
    engagementStatus: "active",
    brief: submission.brief_description || undefined,
    deliverables: [],
  };

  const client: MockClient = {
    id: clientId,
    name: submission.company_name,
    projects: [project],
    onboardingBrief: onboardingToBrief(submission),
  };

  // Additive single-row upserts — never clobber the rest of the board.
  await upsertClients([client]);
  await upsertProjects([{ clientId, project }]);

  return { clientId, projectId };
}
