/* ── My Work classifier ──
 *
 * Maps a kanban deliverable + the signed-in user's identity to:
 *   - mine: boolean   (does this card belong on their My Work?)
 *   - lane: "todo" | "in_progress" | "done"
 *   - role: which slot match fired (senior/junior designer, dev, strategist)
 *   - nextLane: where dragging this card forward leads (or null)
 *
 * The lane mapping is role-aware:
 *   Designer (senior=primary, junior=secondary):
 *     design          → in_progress
 *     internal-rev    → done (waiting on Dylan) OR in_progress (kicked back)
 *     external-rev    → done (with client)
 *     dev / qa / live → done (out of designer hands)
 *     anything before → todo
 *   Developer:
 *     development     → in_progress
 *     qa              → done (waiting on QA) OR in_progress (kicked back)
 *     launch-testing  → done
 *     anything before → todo
 *   Strategist (cro_lead of the project's pod):
 *     strategy        → todo
 *     launch-testing  not started → todo
 *     launch-testing  live (started, no testResult) → in_progress
 *     launch-testing  concluded (testResult set) → done
 *
 * Drag → kanban transition:
 *   Designer in_progress → done from `design` → move card to internal-revisions
 *   Designer in_progress → done from kicked-back internal-rev → clear revision flag
 *   Developer in_progress → done from `development` → move to qa
 *   Developer in_progress → done from kicked-back qa → clear revision flag
 *   Strategist: no drag (conclude is a modal flow on the kanban card itself)
 */

import type { MockClient, MockDeliverable } from "@/lib/projects/mock-data";
import type { Pod as PodV2 } from "@/lib/pods-v2/types";

export type MyWorkLane = "todo" | "in_progress" | "done";

export type MyWorkRole =
  | "senior_designer"
  | "junior_designer"
  | "senior_developer"
  | "junior_developer"
  | "strategist";

export interface MyWorkIdentity {
  /** The user's display name (matches against free-text kanban slots). */
  name: string;
  /** Pods where this user holds the cro_lead role (drives strategist
   * scope). Empty array if they're not a strategist anywhere. */
  croLeadPodIds: string[];
}

/* Derive identity from the user's name + the pods-v2 snapshot.
 * Looks up every PodMember whose linked Person name matches; collects
 * the pods where the user is cro_lead. Designer/dev role isn't on the
 * identity itself - it's per-card (one user could be senior on Pod 1
 * and junior on Pod 2). */
export function buildMyWorkIdentity(
  displayName: string | undefined,
  pods: PodV2[],
): MyWorkIdentity | null {
  if (!displayName) return null;
  const needle = displayName.trim().toLowerCase();
  const croLeadPodIds: string[] = [];
  for (const pod of pods) {
    for (const m of pod.members) {
      if (!m.name) continue;
      if (m.name.trim().toLowerCase() !== needle) continue;
      if (m.role === "cro_lead") croLeadPodIds.push(pod.id);
    }
  }
  return { name: displayName, croLeadPodIds };
}

/* Which slot on the card matches the user (if any). Senior = primary,
 * junior = secondary. */
function detectAssignmentRole(
  card: MockDeliverable,
  name: string,
): MyWorkRole | null {
  const needle = name.trim().toLowerCase();
  const eq = (v: string | undefined) =>
    !!v && v.trim().toLowerCase() === needle;
  if (eq(card.designer)) return "senior_designer";
  if (eq(card.secondaryDesigner)) return "junior_designer";
  if (eq(card.developer)) return "senior_developer";
  if (eq(card.secondaryDeveloper)) return "junior_developer";
  return null;
}

/* Designer + Developer share the in_progress logic almost verbatim - just
 * different "active phase" names. */
function designerLane(card: MockDeliverable): MyWorkLane {
  const phase = card.phase;
  if (phase === "design") return "in_progress";
  if (phase === "internal-revisions") {
    /* Kicked back by Dylan = back in their hands = in_progress.
     * Otherwise (waiting on Dylan OR approved) = done from their POV. */
    return card.revisionRequested ? "in_progress" : "done";
  }
  if (phase === "external-revisions") {
    /* Client kicked back = in_progress; otherwise out with client = done. */
    return card.revisionRequested ? "in_progress" : "done";
  }
  if (
    phase === "development" ||
    phase === "qa" ||
    phase === "launch-testing"
  ) {
    return "done";
  }
  return "todo";
}

function developerLane(card: MockDeliverable): MyWorkLane {
  const phase = card.phase;
  if (phase === "development") return "in_progress";
  if (phase === "qa") {
    return card.revisionRequested ? "in_progress" : "done";
  }
  if (phase === "launch-testing") return "done";
  return "todo";
}

function strategistLane(card: MockDeliverable): MyWorkLane {
  if (card.phase === "strategy") return "todo";
  if (card.phase === "launch-testing") {
    if (card.testResult) return "done";
    if (card.liveStartedAt) return "in_progress";
    return "todo";
  }
  /* Defensive fallback - strategist only scopes to those two phases. */
  return "todo";
}

export interface ClassifiedCard {
  card: MockDeliverable;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  role: MyWorkRole;
  lane: MyWorkLane;
}

/* Walk every client → project → card and emit one entry per (card, role)
 * match. One card can produce multiple entries if the user is e.g. the
 * senior designer AND the strategist for the same project's launch-testing
 * card (rare but valid). */
export function classifyClientsForUser(
  clients: MockClient[],
  identity: MyWorkIdentity,
): ClassifiedCard[] {
  const out: ClassifiedCard[] = [];
  for (const client of clients) {
    for (const project of client.projects) {
      for (const card of project.deliverables) {
        /* Drop tests that are concluded and not in launch-testing
         * (defensive - shouldn't happen but keeps the board clean). */
        const assignment = detectAssignmentRole(card, identity.name);
        const isStrategistScope =
          identity.croLeadPodIds.length > 0 &&
          project.podId &&
          identity.croLeadPodIds.includes(project.podId) &&
          (card.phase === "strategy" || card.phase === "launch-testing");

        if (assignment) {
          const lane =
            assignment === "senior_designer" || assignment === "junior_designer"
              ? designerLane(card)
              : developerLane(card);
          out.push({
            card,
            clientId: client.id,
            clientName: client.name,
            projectId: project.id,
            projectName: project.name,
            role: assignment,
            lane,
          });
        }
        if (isStrategistScope) {
          out.push({
            card,
            clientId: client.id,
            clientName: client.name,
            projectId: project.id,
            projectName: project.name,
            role: "strategist",
            lane: strategistLane(card),
          });
        }
      }
    }
  }
  return out;
}

/* Drag handlers: given a card + its current role/lane + the target lane,
 * return the kanban transition to apply (a Partial<MockDeliverable>
 * patch, plus an optional phase move). null = no-op (e.g. strategist
 * can't drag-conclude; they use the card modal). */
export type DragAction =
  | { kind: "patch"; patch: Partial<MockDeliverable> }
  | { kind: "phase_move"; phase: MockDeliverable["phase"] }
  | { kind: "noop"; reason: string };

export function dragActionFor(
  classified: ClassifiedCard,
  toLane: MyWorkLane,
): DragAction {
  const { card, role, lane } = classified;
  if (lane === toLane) return { kind: "noop", reason: "same lane" };

  /* Forward (todo → in_progress) is just a hint for the user; nothing
   * to write to the kanban (the phase already implies the state). */
  if (lane === "todo" && toLane === "in_progress") {
    return { kind: "noop", reason: "no kanban action for start" };
  }

  /* In progress → Done: hand off to the next phase / clear flags. */
  if (lane === "in_progress" && toLane === "done") {
    if (role === "senior_designer" || role === "junior_designer") {
      if (card.phase === "design") {
        return { kind: "phase_move", phase: "internal-revisions" };
      }
      if (card.phase === "internal-revisions" && card.revisionRequested) {
        /* Re-submit after a kickback - clear the flag so Dylan can
         * review again. */
        return { kind: "patch", patch: { revisionRequested: false } };
      }
      if (card.phase === "external-revisions" && card.revisionRequested) {
        return { kind: "patch", patch: { revisionRequested: false } };
      }
    }
    if (role === "senior_developer" || role === "junior_developer") {
      if (card.phase === "development") {
        return { kind: "phase_move", phase: "qa" };
      }
      if (card.phase === "qa" && card.revisionRequested) {
        return { kind: "patch", patch: { revisionRequested: false } };
      }
    }
    if (role === "strategist") {
      return {
        kind: "noop",
        reason: "Open the card to conclude a live test.",
      };
    }
  }

  /* Done → In progress: undo (move back). Useful if a drop was wrong. */
  if (lane === "done" && toLane === "in_progress") {
    if (role === "senior_designer" || role === "junior_designer") {
      if (card.phase === "internal-revisions") {
        return { kind: "phase_move", phase: "design" };
      }
    }
    if (role === "senior_developer" || role === "junior_developer") {
      if (card.phase === "qa") {
        return { kind: "phase_move", phase: "development" };
      }
    }
  }

  return { kind: "noop", reason: "no transition defined" };
}
