/* Spawn an engagement (pods-v2 Client + initial Project) from an
 * OnboardingSubmission. Called by the onboarding-inbox approval flow once
 * the PM signs off on an intake — single operation creates the canonical
 * row that both the pod board and the engagement portal read from.
 *
 * Field mapping is intentionally 1:1 with ClientBrief so the engagement
 * portal Brief panel shows the captured intake context immediately.
 * Once spawned the brief is decoupled — edits in the engagement portal
 * stay on the Client row, never write back to the original submission.
 */

import type { OnboardingSubmission } from "@/lib/onboarding";
import {
  createClient as createPodsClient,
  createProject as createPodsProject,
  getPods,
} from "@/lib/pods-v2/data";
import type {
  Client,
  ClientBrief,
  PageType,
  PageWeight,
  RetainerTier,
} from "@/lib/pods-v2/types";
import { PAGE_DEFAULT_WEIGHT } from "@/lib/pods-v2/types";

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

/** Sum the page weights to compute the engagement's total points and
 * derive the bucket size. 1-7pts = A · 8-12 = B · 13+ = C. */
function bucketFromPoints(pts: number): "A" | "B" | "C" | "Bespoke" {
  if (pts <= 7) return "A";
  if (pts <= 12) return "B";
  if (pts <= 18) return "C";
  return "Bespoke";
}

const POINT_VALUE: Record<PageWeight, number> = { heavy: 3, medium: 2, light: 1 };

/** Pick the pod with the most headroom for new work. Simple stub: returns
 * the first pod when capacity tracking isn't yet wired through. */
function pickPodWithCapacity(): string | null {
  const pods = getPods();
  return pods[0]?.id ?? null;
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

/** Create a pods-v2 Client + initial Project from an approved
 * OnboardingSubmission. Returns the created ids so the caller (the
 * onboarding-inbox approval flow) can mark the submission with the
 * `assigned_*` fields and redirect to the new engagement. */
export function spawnEngagementFromOnboarding(
  submission: OnboardingSubmission,
  opts: { podId?: string; retainerTier?: RetainerTier } = {},
): SpawnResult {
  const podId = opts.podId ?? pickPodWithCapacity();
  if (!podId) {
    throw new Error("No pods available — seed pods-v2 first");
  }

  const tier: RetainerTier = opts.retainerTier ?? "none";

  /* Build the brief snapshot from the submission fields. */
  const brief = onboardingToBrief(submission);

  /* Create the Client row first — that's the canonical record. */
  const client: Client = createPodsClient({
    name: submission.company_name,
    pod_id: podId,
    brand_warm: false,
    retainer_tier: tier,
    kickoff_date: nextMonday(),
    brief,
  });

  /* Translate the PM-scoped deliverables → pages on the initial Project.
   * Falls back to a single-page Bespoke project if no deliverables were
   * scoped during PM review. */
  const pages =
    submission.deliverables && submission.deliverables.length > 0
      ? submission.deliverables.map((d) => {
          const type = d.type as PageType;
          const weight: PageWeight = PAGE_DEFAULT_WEIGHT[type] ?? "medium";
          return { type, weight };
        })
      : [];

  let projectId: string | null = null;
  if (pages.length > 0) {
    const pts = pages.reduce((sum, p) => sum + POINT_VALUE[p.weight], 0);
    const bucket = bucketFromPoints(pts);
    const project = createPodsProject({
      name: `${submission.company_name} · Initial build`,
      client_id: client.id,
      pod_id: podId,
      bucket,
      kickoff_date: client.kickoff_date ?? nextMonday(),
      is_rush: false,
      pages,
    });
    projectId = project.id;
  }

  return { clientId: client.id, projectId };
}
