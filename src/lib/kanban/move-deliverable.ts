/* ── The one card-move function ──
 * Both the delivery board and /my-work move cards. They used to do it two
 * different ways: the board through its gated handler, /my-work by mutating
 * state directly — which silently skipped the design→dev handover gate, the
 * Launch seam, the activity log, the hoursInPhase reset and subtask seeding.
 *
 * This is the single source. It's PURE: current clients in → next clients plus
 * the side effects the caller should fire (activity entry, Launch seam payload).
 * Callers apply the state and dispatch the effects; nobody re-implements the
 * rules. Mirrors activeAssigneeFor being the single source for ownership.
 */

import {
  checklistFor,
  type MockClient,
  type MockDeliverable,
  type MockPod,
} from "@/lib/projects/mock-data";
import {
  MOCK_TODAY,
  PREVIEW_PHASES,
  activeAssigneeFor,
  type PreviewPhase,
} from "@/lib/projects/preview-phases";

/** The build columns (Phase 2). Entering these from outside requires a
 *  submitted design handover — the playbook's only hard gate. */
export const PHASE_2_ORDER: PreviewPhase[] = ["development", "qa", "launch"];

/** Columns an audit card may never enter (audit = Setup → Strategy → Done). */
export const AUDIT_BLOCKED_PHASES = new Set<PreviewPhase>([
  "design",
  "internal-revisions",
  "external-revisions",
  "development",
  "qa",
  "client-approval",
  "launch",
]);

/** Phases outside the build flow — they don't count for revision bookkeeping. */
const OUT_OF_FLOW = ["tickets", "documents", "not-started"];

export interface MovedInfo {
  cardId: string;
  cardTitle: string;
  clientName: string;
  projectName: string;
  projectId: string;
  fromPhase: PreviewPhase;
  toPhase: PreviewPhase;
  /** True when the phase change handed the card to a different person. */
  assigneeChanged: boolean;
}

export interface SeamPayload {
  projectId: string;
  sourceTaskId: string;
  title: string;
  liveUrl?: string;
  controlBenchmark?: Record<string, string | number>;
}

export type MoveOutcome =
  /** A gate refused the move — show `reason` to the user, change nothing. */
  | { ok: false; reason: string }
  /** The move is legal. `moved` is null for a no-op (same phase / ticket). */
  | { ok: true; clients: MockClient[]; moved: MovedInfo | null; seam: SeamPayload | null };

function cloneClients(src: MockClient[]): MockClient[] {
  return src.map((c) => ({
    ...c,
    projects: c.projects.map((p) => ({
      ...p,
      deliverables: p.deliverables.map((d) => ({
        ...d,
        phaseHistory: d.phaseHistory ? d.phaseHistory.map((h) => ({ ...h })) : undefined,
        testResult: d.testResult ? { ...d.testResult } : undefined,
      })),
    })),
  }));
}

/* Live role resolution — the pod roster wins over the card's stamped names,
 * the same precedence the board and /my-work use, so the owner this computes
 * matches the badge everywhere. */
function rolesFor(card: MockDeliverable, pod: MockPod | undefined) {
  return {
    designer: pod?.designer ?? card.designer,
    secondaryDesigner: pod?.secondaryDesigner ?? card.secondaryDesigner,
    developer: pod?.developer ?? card.developer,
    secondaryDeveloper: pod?.secondaryDeveloper ?? card.secondaryDeveloper,
  };
}

/** Move a card to `targetPhase`, applying every rule once. Pure. */
export function moveDeliverable(
  clients: MockClient[],
  pods: MockPod[],
  id: string,
  targetPhase: PreviewPhase,
  opts?: { bypassHandoffGate?: boolean },
): MoveOutcome {
  // Locate the card + its context.
  let found:
    | { card: MockDeliverable; clientName: string; projectName: string; projectId: string; podId?: string }
    | undefined;
  for (const c of clients) {
    for (const p of c.projects) {
      const d = p.deliverables.find((x) => x.id === id);
      if (d) {
        found = { card: d, clientName: c.name, projectName: p.name, projectId: p.id, podId: p.podId };
        break;
      }
    }
    if (found) break;
  }
  if (!found) return { ok: true, clients, moved: null, seam: null };

  const { card } = found;

  // ── Gates ──
  if (!opts?.bypassHandoffGate) {
    if (card.cardType === "audit" && AUDIT_BLOCKED_PHASES.has(targetPhase)) {
      return {
        ok: false,
        reason: `"${card.title}" is an audit — it stays on the Setup → Strategy → Done path and doesn't enter the build.`,
      };
    }
    if (
      PHASE_2_ORDER.includes(targetPhase) &&
      !PHASE_2_ORDER.includes(card.phase) &&
      !card.designHandoff?.submittedAt
    ) {
      return {
        ok: false,
        reason: `"${card.title}" needs its design handover (Figma, Loom, fonts) submitted before it can enter the build. Open the card to complete it.`,
      };
    }
  }

  // ── No-ops: same phase, or a ticket moving in/out (tickets resolve in place) ──
  if (card.phase === targetPhase) return { ok: true, clients, moved: null, seam: null };
  if (card.phase === "tickets" || targetPhase === "tickets")
    return { ok: true, clients, moved: null, seam: null };

  const fromPhase = card.phase;
  const pod = found.podId ? pods.find((p) => p.id === found!.podId) : undefined;
  const prevAssignee = activeAssigneeFor(fromPhase, rolesFor(card, pod)).name;

  // ── Apply ──
  const next = cloneClients(clients);
  let mutated: MockDeliverable | undefined;
  for (const c of next) {
    for (const p of c.projects) {
      const d = p.deliverables.find((x) => x.id === id);
      if (!d) continue;
      mutated = d;

      const fromIdx = PREVIEW_PHASES.findIndex((x) => x.value === d.phase);
      const toIdx = PREVIEW_PHASES.findIndex((x) => x.value === targetPhase);
      const inFlow =
        fromIdx >= 0 &&
        toIdx >= 0 &&
        !OUT_OF_FLOW.includes(d.phase) &&
        !OUT_OF_FLOW.includes(targetPhase);
      // Backward = needs revisions; forward past the kickback clears it.
      if (inFlow && toIdx < fromIdx) d.revisionRequested = true;
      else if (inFlow && toIdx > fromIdx && d.revisionRequested) d.revisionRequested = false;

      // Internal approval only means something while sitting in Internal Rev.
      if (d.phase === "internal-revisions" && targetPhase !== "internal-revisions") {
        d.approvedAt = undefined;
      }
      // Stamp/clear the send-to-client moment (anchors the client-review clock).
      if (d.phase !== "external-revisions" && targetPhase === "external-revisions") {
        d.sentToClientAt = MOCK_TODAY;
      }
      if (d.phase === "external-revisions" && targetPhase !== "external-revisions") {
        d.sentToClientAt = undefined;
      }

      d.phase = targetPhase;
      d.hoursInPhase = 0;
      // After d.phase is set, so a card landing in Tickets doesn't pick up a
      // build checklist.
      d.subtasks = checklistFor(d);
      d.phaseHistory = [...(d.phaseHistory ?? []), { phase: targetPhase, enteredAt: MOCK_TODAY }];
      break;
    }
    if (mutated) break;
  }

  const nextAssignee = activeAssigneeFor(targetPhase, rolesFor(card, pod)).name;

  // ── The seam: entering Launch creates the Results Engine surface ──
  let seam: SeamPayload | null = null;
  if (targetPhase === "launch" && fromPhase !== "launch") {
    const benchmark: Record<string, string | number> = {};
    for (const m of card.metrics ?? []) if (m.interim) benchmark[m.name] = m.interim;
    seam = {
      projectId: found.projectId,
      sourceTaskId: card.id,
      title: card.title,
      liveUrl: card.liveTestUrl,
      controlBenchmark: Object.keys(benchmark).length ? benchmark : undefined,
    };
  }

  return {
    ok: true,
    clients: next,
    moved: {
      cardId: id,
      cardTitle: card.title,
      clientName: found.clientName,
      projectName: found.projectName,
      projectId: found.projectId,
      fromPhase,
      toPhase: targetPhase,
      assigneeChanged: !!nextAssignee && nextAssignee !== prevAssignee,
    },
    seam,
  };
}
