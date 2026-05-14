/* Spawn an engagement (pods-v2 Client) from an OnboardingSubmission.
 * Called by the onboarding-inbox approval flow once the PM signs off on
 * an intake. The Client is parked (pod_id="") so it lands in the
 * /pods-v2 purgatory queue, where the PM picks a pod via the
 * AssignToPodModal. That second step is where the Project gets created
 * and the design + dev tasks are seeded onto the chosen pod.
 *
 * Splitting engagement creation from pod assignment lets the PM
 * scope + prep before committing capacity.
 *
 * Field mapping is intentionally 1:1 with ClientBrief so the engagement
 * portal Brief panel shows the captured intake context immediately.
 * Once spawned the brief is decoupled, edits in the engagement portal
 * stay on the Client row, never write back to the original submission.
 */

import type { OnboardingSubmission } from "@/lib/onboarding";
import {
  createClient as createPodsClient,
  getClients,
  getProjectsForClient,
} from "@/lib/pods-v2/data";
import type {
  Client,
  ClientBrief,
  RetainerTier,
} from "@/lib/pods-v2/types";

function onboardingToBrief(s: OnboardingSubmission): ClientBrief {
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

/** Today's Monday in YYYY-MM-DD format. */
function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

interface SpawnResult {
  clientId: string;
  projectId: string | null;
}

/** Create a parked pods-v2 Client from an approved OnboardingSubmission.
 * Returns the new client id so the caller can mark the submission with
 * the `assigned_*` fields and redirect to the new engagement.
 *
 * The Client sits in /pods-v2 purgatory until the PM uses the "Assign
 * to pod" flow to pick a pod, which then creates the Project + seeds
 * tasks. Idempotent: if a Client already exists for this submission
 * (re-approval, double-click, cross-device replay), the existing
 * engagement is returned. */
export function spawnEngagementFromOnboarding(
  submission: OnboardingSubmission,
  opts: { retainerTier?: RetainerTier } = {},
): SpawnResult {
  const existing = getClients().find(
    (c) => c.onboarding_submission_id === submission.id,
  );
  if (existing) {
    const existingProject = getProjectsForClient(existing.id)[0];
    return { clientId: existing.id, projectId: existingProject?.id ?? null };
  }

  const tier: RetainerTier = opts.retainerTier ?? "none";
  const brief = onboardingToBrief(submission);

  /* Parked Client (pod_id=""). Pod assignment + Project + task seeding
   * happens later via the AssignToPodModal triggered from the /pods-v2
   * purgatory row. */
  const client: Client = createPodsClient({
    name: submission.company_name,
    pod_id: "",
    brand_warm: false,
    retainer_tier: tier,
    kickoff_date: nextMonday(),
    brief,
    onboarding_submission_id: submission.id,
  });

  return { clientId: client.id, projectId: null };
}
