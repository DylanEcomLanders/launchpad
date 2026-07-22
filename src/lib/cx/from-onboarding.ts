/* ── CX Delivery: create an engagement from an approved onboarding ──
 *
 * The new-model replacement for promoteOnboardingToKanban: when a PM approves an
 * onboarding, spin up the client's Clients doc (blank template pages) AND a
 * Delivery card per scoped deliverable, on the new cx_* board, instead of the
 * legacy kanban. Stable ids keep it idempotent.
 */

import { newCard, saveCard } from "./data";
import { saveDoc, loadDocs, loadPods, loadTemplates } from "@/lib/pod-projects/data";
import { templateSections } from "@/lib/pod-projects/templates";
import type { PodDoc } from "@/lib/pod-projects/types";
import type { OnboardingSubmission } from "@/lib/onboarding";

export interface EngagementResult {
  clientId: string;
  cards: number;
  docCreated: boolean;
}

export async function createEngagementFromOnboarding(sub: OnboardingSubmission): Promise<EngagementResult> {
  const clientId = `cx-onb-${sub.id}`;
  const clientName = sub.company_name?.trim() || "New client";
  const now = new Date().toISOString();

  /* 1. Clients doc (skip if one already exists for this submission). */
  const existing = await loadDocs();
  let docCreated = false;
  if (!existing.some((d) => d.id === clientId)) {
    const pods = loadPods();
    const template = loadTemplates().find((t) => t.type === "retainer");
    const doc: PodDoc = {
      id: clientId,
      podId: pods[0]?.id ?? "pod-1",
      title: clientName,
      type: "retainer",
      tier: "core",
      sections: template ? (JSON.parse(JSON.stringify(template.sections)) as PodDoc["sections"]) : templateSections("retainer"),
      startDate: now.slice(0, 10),
      created_at: now,
      updated_at: now,
    };
    await saveDoc(doc);
    docCreated = true;
  }

  /* 2. One Delivery card per scoped deliverable (or a single starter card). */
  const dels = sub.deliverables ?? [];
  let cards = 0;
  if (dels.length) {
    for (const d of dels) {
      const title = d.label?.trim() || d.type || "Deliverable";
      await saveCard(newCard(clientId, clientName, title));
      cards++;
    }
  } else {
    await saveCard(newCard(clientId, clientName, "New engagement"));
    cards++;
  }

  return { clientId, cards, docCreated };
}
