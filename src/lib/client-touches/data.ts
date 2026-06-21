/* ── Client touches data layer + at-risk computation ── */

import { createStore } from "@/lib/supabase-store";
import type { AbTest } from "@/lib/tests/types";
import type { ClientOnboarding } from "@/lib/client-onboarding/types";
import { overdueItems } from "@/lib/client-onboarding/data";
import type { ClientTouch, TouchKind } from "./types";

export const clientTouchesStore = createStore<ClientTouch>({
  table: "client_touches",
  lsKey: "launchpad-client-touches",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}

export function emptyTouch(clientName: string, kind: TouchKind = "channel_message"): ClientTouch {
  return {
    id: uid(),
    client_name: clientName,
    kind,
    at: nowISO(),
    by: "",
    summary: "",
    awaiting_reply: false,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

/* Days since the most recent touch for a client. null if none. */
export function daysSinceLastTouch(clientName: string, touches: ClientTouch[]): number | null {
  const latest = touches
    .filter((t) => t.client_name === clientName)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!latest) return null;
  return Math.floor((Date.now() - new Date(latest.at).getTime()) / 86_400_000);
}

/* The three at-risk signals from the playbook:
 *   1. Channel silence: 3+ days no touch
 *   2. Missed onboarding deadlines: any overdue checklist items
 *   3. Test yield drought: 3+ consecutive inconclusive tests
 */
export type RiskKind = "silence" | "missed_deadline" | "yield_drought";

export interface ClientRisk {
  kind: RiskKind;
  severity: "warn" | "danger";
  label: string;
  detail: string;
}

export function risksForClient(
  clientName: string,
  touches: ClientTouch[],
  onboardings: ClientOnboarding[],
  tests: AbTest[],
): ClientRisk[] {
  const risks: ClientRisk[] = [];

  /* Silence */
  const days = daysSinceLastTouch(clientName, touches);
  if (days === null) {
    risks.push({ kind: "silence", severity: "warn", label: "No touches logged", detail: "Log a touch when you next ping them." });
  } else if (days >= 7) {
    risks.push({ kind: "silence", severity: "danger", label: `${days}d silence`, detail: "Channel quiet over a week." });
  } else if (days >= 3) {
    risks.push({ kind: "silence", severity: "warn", label: `${days}d silence`, detail: "Cadence slipping." });
  }

  /* Missed deadlines (from onboarding) */
  const myOnboardings = onboardings.filter((o) => o.client_name === clientName);
  for (const o of myOnboardings) {
    const ov = overdueItems(o);
    if (ov.length > 0) {
      risks.push({
        kind: "missed_deadline",
        severity: ov.length > 1 ? "danger" : "warn",
        label: `${ov.length} onboarding overdue`,
        detail: ov.map((i) => i.title).join(", "),
      });
    }
  }

  /* Yield drought - last 3+ concluded tests all inconclusive */
  const concluded = tests
    .filter((t) => t.client_name === clientName && t.outcome)
    .sort((a, b) => (b.ended_at || "").localeCompare(a.ended_at || ""));
  if (concluded.length >= 3) {
    const last3 = concluded.slice(0, 3);
    if (last3.every((t) => t.outcome === "inconclusive")) {
      risks.push({
        kind: "yield_drought",
        severity: "danger",
        label: "3+ inconclusive tests in a row",
        detail: "Programme isn't yielding - rethink the hypothesis queue.",
      });
    } else if (last3.every((t) => t.outcome !== "winner")) {
      risks.push({
        kind: "yield_drought",
        severity: "warn",
        label: "No winners in last 3 tests",
        detail: "Pattern check - shift the queue toward higher-confidence ideas.",
      });
    }
  }

  return risks;
}
