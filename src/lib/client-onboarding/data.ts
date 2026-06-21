/* ── Client onboarding data layer + default checklist ── */

import { createStore } from "@/lib/supabase-store";
import type {
  ClientOnboarding,
  OnboardingChecklistItem,
} from "./types";

export const clientOnboardingsStore = createStore<ClientOnboarding>({
  table: "client_onboardings",
  lsKey: "launchpad-client-onboardings",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}

/* Default checklist from the playbook (Retention / First-week wow).
 * Order + due_offset_days enforce the cadence. */
export function defaultChecklist(): OnboardingChecklistItem[] {
  return [
    { id: uid(), title: "Onboarding pack sent",
      description: "Branded welcome doc with pod, cadence, 90-day term + guarantee, what week one looks like.",
      owner_role: "csm", order: 0, due_offset_days: 1 },
    { id: uid(), title: "Kickoff call booked + held",
      description: "Align on goals, access, priorities. Recording shared.",
      owner_role: "csm", order: 1, due_offset_days: 3 },
    { id: uid(), title: "Access + tooling collected",
      description: "Shopify + GA4 + Klaviyo + ad accounts + Intelligems / Visually access.",
      owner_role: "client", order: 2, due_offset_days: 4 },
    { id: uid(), title: "Week-one deep dive complete",
      description: "Strategist runs Shopify + GA4 reconciliation + recordings + ad library audit.",
      owner_role: "strategist", order: 3, due_offset_days: 5 },
    { id: uid(), title: "30/60/90 roadmap delivered",
      description: "ICE-scored opportunity list mapped into horizons; client signs off.",
      owner_role: "strategist", order: 4, due_offset_days: 5 },
    { id: uid(), title: "First test live",
      description: "First hypothesis built, QAed, live in Intelligems/Visually. Test card linked.",
      owner_role: "pod", order: 5, due_offset_days: 7 },
    { id: uid(), title: "Dedicated client channel created",
      description: "Slack/whatever - pod + leads + client all in. Pinned message: cadence + SLA.",
      owner_role: "csm", order: 6, due_offset_days: 1 },
  ];
}

export function emptyOnboarding(): ClientOnboarding {
  return {
    id: uid(),
    client_name: "",
    csm_name: "",
    strategist_name: "",
    started_at: nowISO(),
    status: "in_progress",
    notes: "",
    items: defaultChecklist(),
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

export function completionPct(o: ClientOnboarding): number {
  if (o.items.length === 0) return 0;
  const done = o.items.filter((i) => i.done_at).length;
  return Math.round((done / o.items.length) * 100);
}

/* Days since start. */
export function dayNumber(o: ClientOnboarding): number {
  return Math.max(1, Math.floor((Date.now() - new Date(o.started_at).getTime()) / 86_400_000) + 1);
}

/* Items overdue: due_offset_days passed AND not done. */
export function overdueItems(o: ClientOnboarding): OnboardingChecklistItem[] {
  if (o.status !== "in_progress") return [];
  const now = Date.now();
  const start = new Date(o.started_at).getTime();
  return o.items.filter((i) => {
    if (i.done_at) return false;
    const dueAt = start + i.due_offset_days * 86_400_000;
    return now > dueAt;
  });
}
