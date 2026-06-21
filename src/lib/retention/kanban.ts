// Kanban adapter — the single place Retention reads the kanban (Mission
// Control). Sources two things per client:
//   1. Shipped tests (deliverables with `testResult` set → Results bank).
//   2. Live delivery KPI signals (lateness, rework, results track record)
//      that feed the health pillars.
//
// ⚠️  SWAP POINT — the kanban is mock-only today (src/lib/projects/mock-data.ts).
//     This file is the ONLY place Retention reads it. When the kanban gets its
//     Supabase read adapter, repoint `loadKanbanClients()` and nothing else in
//     the Retention module changes. Clients are matched by normalized name
//     (no shared IDs yet).

import { MOCK_CLIENTS, type MockClient } from "@/lib/projects/mock-data";
import { revisionRoundCount, statusForHoursInPhase } from "@/lib/projects/preview-phases";

export interface ShippedTest {
  id: string;
  title: string;
  outcome: string; // winner | loser | inconclusive | shipped
  metric: string;
  upliftPct: number;
  concludedAt: string;
}

/** Delivery KPI signals for one client, derived from the kanban. */
export interface DeliverySignals {
  /** Deliverables still in flight (not concluded). */
  active: number;
  /** In-flight deliverables sitting in a phase past its SLA (the kanban's own
   *  "stuck" status). This is our on-time signal. */
  late: number;
  /** Titles of the late deliverables (for alerts). */
  lateTitles: string[];
  /** Deliverables with heavy rework (3+ revision rounds). */
  reworkHeavy: number;
  /** Deliverables warming up on rework (2 rounds). */
  reworkWarming: number;
  /** Concluded tests on record. */
  concludedTests: number;
  winningTests: number;
  losingTests: number;
}

function loadKanbanClients(): MockClient[] {
  return MOCK_CLIENTS;
}

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchKanbanClient(clientName: string): MockClient | null {
  const key = normalizeName(clientName);
  return loadKanbanClients().find((c) => normalizeName(c.name) === key) ?? null;
}

export function shippedTestsForClient(clientName: string): ShippedTest[] {
  const kc = matchKanbanClient(clientName);
  if (!kc) return [];
  const out: ShippedTest[] = [];
  for (const project of kc.projects) {
    for (const d of project.deliverables) {
      if (d.testResult?.concludedAt) {
        out.push({
          id: d.id,
          title: d.title,
          outcome: d.testResult.outcome,
          metric: d.testResult.metric ?? "",
          upliftPct: d.testResult.upliftPct ?? 0,
          concludedAt: d.testResult.concludedAt,
        });
      }
    }
  }
  return out.sort((a, b) => b.concludedAt.localeCompare(a.concludedAt));
}

export function shippedTestCount(clientName: string, sinceISO: string, untilISO: string): number {
  return shippedTestsForClient(clientName).filter(
    (t) => t.concludedAt >= sinceISO && t.concludedAt <= untilISO,
  ).length;
}

export function deliverySignalsForClient(clientName: string): DeliverySignals {
  const empty: DeliverySignals = {
    active: 0, late: 0, lateTitles: [], reworkHeavy: 0, reworkWarming: 0,
    concludedTests: 0, winningTests: 0, losingTests: 0,
  };
  const kc = matchKanbanClient(clientName);
  if (!kc) return empty;

  const s = { ...empty, lateTitles: [] as string[] };
  for (const project of kc.projects) {
    for (const d of project.deliverables) {
      if (d.testResult) {
        s.concludedTests++;
        if (d.testResult.outcome === "winner") s.winningTests++;
        else if (d.testResult.outcome === "loser") s.losingTests++;
        continue; // concluded deliverables have left the board
      }
      if (d.phase === "not-started") continue;
      s.active++;
      if (statusForHoursInPhase(d.phase, d.hoursInPhase) === "stuck") {
        s.late++;
        s.lateTitles.push(d.title);
      }
      const rounds = revisionRoundCount(d.phaseHistory);
      if (rounds >= 3) s.reworkHeavy++;
      else if (rounds >= 2) s.reworkWarming++;
    }
  }
  return s;
}
