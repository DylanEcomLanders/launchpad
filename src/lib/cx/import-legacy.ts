/* ── CX Delivery: one-time legacy import ──
 *
 * The ONLY bridge from the legacy kanban into the new cx_* board. It reads the
 * live kanban tables (READ-ONLY, never writes or deletes them) and maps each
 * deliverable to a cx_card, seeding cx_people from the assignees so "filter to
 * me" works straight away.
 *
 * Idempotent: stable ids (`cx-k-<legacy id>`) mean re-running updates rather than
 * duplicates. This is the one place that imports from @/lib/kanban - the board
 * itself stays firewalled. Delete this module once the migration has landed.
 */

import { fetchKanban } from "@/lib/kanban/data";
import { saveCard, savePerson, loadPeople, newPerson } from "./data";
import type { CxCard, CxStage, PersonRole } from "./types";

/** Legacy PreviewPhase -> new board column. `documents` and the post-launch test
 *  phases have no delivery-board home, so they park sensibly. */
const PHASE_MAP: Record<string, CxStage> = {
  tickets: "tickets",
  documents: "setup",
  "not-started": "setup",
  strategy: "strategy",
  design: "design",
  "internal-revisions": "internal-revisions",
  "external-revisions": "external-revisions",
  development: "development",
  qa: "qa",
  "client-approval": "client-approval",
  launch: "launch",
  done: "done",
  "test-backlog": "done",
  "launch-testing": "done",
};

function mapStage(phase?: string): CxStage {
  return (phase && PHASE_MAP[phase]) || "setup";
}
function isoDate(v?: string): string | undefined {
  return v ? String(v).slice(0, 10) : undefined;
}

export interface ImportSummary {
  cards: number;
  peopleAdded: number;
  clients: number;
}

export async function importLegacyKanban(): Promise<ImportSummary> {
  const snap = await fetchKanban();
  if (!snap) {
    throw new Error("Could not read the legacy board (Supabase not reachable, or no data).");
  }

  /* 1. Roster: gather every distinct assignee name and its role (pods carry the
   *    canonical role assignments; deliverables fill in the rest). */
  const roleByName = new Map<string, PersonRole>(); // lowercased -> role
  const displayByName = new Map<string, string>(); // lowercased -> original casing
  const note = (name: string | undefined | null, role: PersonRole) => {
    const n = name?.trim();
    if (!n) return;
    const k = n.toLowerCase();
    if (!roleByName.has(k)) {
      roleByName.set(k, role);
      displayByName.set(k, n);
    }
  };
  for (const pod of snap.pods) {
    note(pod.designer, "designer");
    note(pod.secondaryDesigner, "designer");
    note(pod.developer, "developer");
    note(pod.secondaryDeveloper, "developer");
  }
  for (const client of snap.clients) {
    for (const project of client.projects) {
      for (const d of project.deliverables) {
        note(d.designer, "designer");
        note(d.secondaryDesigner, "designer");
        note(d.developer, "developer");
        note(d.secondaryDeveloper, "developer");
      }
    }
  }

  const existing = await loadPeople();
  const existingLower = new Set(existing.map((p) => p.name.toLowerCase()));
  let peopleAdded = 0;
  for (const [lower, role] of roleByName) {
    if (existingLower.has(lower)) continue;
    await savePerson(newPerson(displayByName.get(lower)!, role));
    peopleAdded++;
  }

  /* 2. Cards: one cx_card per legacy deliverable. */
  const clientIds = new Set<string>();
  let cards = 0;
  const now = new Date().toISOString();
  for (const client of snap.clients) {
    clientIds.add(client.id);
    for (const project of client.projects) {
      for (const d of project.deliverables) {
        const stage = mapStage(d.phase);
        const dueByStage: Partial<Record<CxStage, string>> = {};
        if (d.phaseDeadlines) {
          for (const [phase, date] of Object.entries(d.phaseDeadlines)) {
            const iso = isoDate(date as string | undefined);
            if (iso) dueByStage[mapStage(phase)] = iso;
          }
        }
        const dDue = isoDate(d.dueDate);
        if (dDue && !dueByStage[stage]) dueByStage[stage] = dDue;

        const card: CxCard = {
          id: `cx-k-${d.id}`,
          title: d.title || "Untitled",
          clientId: `cx-k-client-${client.id}`,
          clientName: client.name,
          stage,
          primaryDesigner: d.designer || undefined,
          secondaryDesigner: d.secondaryDesigner || undefined,
          primaryDeveloper: d.developer || undefined,
          secondaryDeveloper: d.secondaryDeveloper || undefined,
          dueByStage,
          created_at: d.startDate ? new Date(d.startDate).toISOString() : now,
          updated_at: now,
        };
        await saveCard(card); // sequential: saveCard rewrites the whole LS array
        cards++;
      }
    }
  }

  return { cards, peopleAdded, clients: clientIds.size };
}
