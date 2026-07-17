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

import {
  subtaskStatuses,
  subtaskAssigneeName,
  type MockClient,
  type MockDeliverable,
  type MockPod,
  type Subtask,
  type SubtaskStatus,
} from "@/lib/projects/mock-data";
import type { Pod as PodV2 } from "@/lib/pods-v2/types";
import {
  DOCUMENTS_TEAM_PRIMARY,
  DOCUMENTS_TEAM_SECONDARY,
  STRATEGY_OWNER,
  PREVIEW_PHASES,
  activeAssigneeFor,
  ownerLaneForPhase,
  type PreviewPhase,
  type RolePool,
} from "@/lib/projects/preview-phases";

/* The delivery chain in order — used to tell "handed off past me" (Done) from
 * "not reached me yet" (hidden) for cards I'm attached to but don't currently
 * own. */
const PHASE_ORDER: PreviewPhase[] = PREVIEW_PHASES.map((p) => p.value);

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

/* Which named slot the user occupies on a card — used only for the display
 * `role` tag. Ownership + lane come from activeAssigneeFor, not this. */
function roleForUser(card: MockDeliverable, name: string): MyWorkRole | null {
  const needle = name.trim().toLowerCase();
  const eq = (v: string | undefined) => !!v && v.trim().toLowerCase() === needle;
  if (eq(card.designer)) return "senior_designer";
  if (eq(card.secondaryDesigner)) return "junior_designer";
  if (eq(card.developer)) return "senior_developer";
  if (eq(card.secondaryDeveloper)) return "junior_developer";
  if (needle === STRATEGY_OWNER.trim().toLowerCase()) return "strategist";
  return null;
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

/* Resolve a card's effective assignees the same way the kanban does:
 * pod roster takes priority over what was stamped on the deliverable
 * at creation, and document cards always override to the docs team
 * (Alister primary, Aanchal secondary). Keeps /my-work in lockstep
 * with the kanban so nobody sees a card the kanban routes elsewhere. */
function resolveCardAssignees(
  card: MockDeliverable,
  pod: MockPod | undefined,
): MockDeliverable {
  if (card.phase === "documents") {
    return {
      ...card,
      designer: DOCUMENTS_TEAM_PRIMARY,
      secondaryDesigner: DOCUMENTS_TEAM_SECONDARY,
    };
  }
  if (!pod) return card;
  return {
    ...card,
    designer: pod.designer ?? card.designer,
    secondaryDesigner: pod.secondaryDesigner ?? card.secondaryDesigner,
    developer: pod.developer ?? card.developer,
    secondaryDeveloper: pod.secondaryDeveloper ?? card.secondaryDeveloper,
  };
}

/* Walk every client → project → card and emit the cards this user owns or has
 * owned. Ownership is the SAME function the board badge uses (activeAssigneeFor),
 * so /my-work and the kanban can never disagree about who a card belongs to:
 *   - active owner now       → actionable (ownerLaneForPhase → todo/in_progress)
 *   - handed off past me      → Done (context / recent completions)
 *   - not reached me yet      → hidden (not my card)
 * Strategy resolves to the strategist (STRATEGY_OWNER) and QA to the secondary
 * dev, exactly as on the board. */
export function classifyClientsForUser(
  clients: MockClient[],
  identity: MyWorkIdentity,
  pods: MockPod[],
): ClassifiedCard[] {
  const podById = new Map(pods.map((p) => [p.id, p]));
  const me = identity.name.trim().toLowerCase();
  const out: ClassifiedCard[] = [];
  for (const client of clients) {
    for (const project of client.projects) {
      const pod = project.podId ? podById.get(project.podId) : undefined;
      for (const rawCard of project.deliverables) {
        const card = resolveCardAssignees(rawCard, pod);
        const roles: RolePool = {
          designer: card.designer,
          secondaryDesigner: card.secondaryDesigner,
          developer: card.developer,
          secondaryDeveloper: card.secondaryDeveloper,
          // strategist is global for now → activeAssigneeFor falls back to
          // STRATEGY_OWNER; pod-level strategists slot in here later.
        };
        // Phase indices where I'm the active owner on this card.
        const myIdxs: number[] = [];
        PHASE_ORDER.forEach((ph, i) => {
          if (activeAssigneeFor(ph, roles).name.trim().toLowerCase() === me) myIdxs.push(i);
        });
        if (myIdxs.length === 0) continue;

        const curIdx = PHASE_ORDER.indexOf(card.phase);
        if (curIdx < 0) continue;

        let lane: MyWorkLane;
        if (myIdxs.includes(curIdx)) {
          lane = ownerLaneForPhase(card.phase, card.revisionRequested);
        } else if (curIdx > Math.max(...myIdxs)) {
          lane = "done"; // fully handed off past every phase I own
        } else {
          continue; // upcoming, or a gap between my phases — not mine right now
        }

        out.push({
          card,
          clientId: client.id,
          clientName: client.name,
          projectId: project.id,
          projectName: project.name,
          role: roleForUser(card, identity.name) ?? "senior_designer",
          lane,
        });
      }
    }
  }
  return out;
}

/* The user's own granular subtasks across every card - the "on track with
 * everything" layer under the card-level view. Same roster resolution as the
 * cards, so ownership matches the board exactly. Only surfaces UNLOCKED steps
 * (locked ones aren't actionable yet); done ones are kept so progress reads. */
export interface MySubtask {
  subtask: Subtask;
  status: SubtaskStatus;
  cardId: string;
  cardTitle: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
}

export function subtasksForUser(
  clients: MockClient[],
  identity: MyWorkIdentity,
  pods: MockPod[],
): MySubtask[] {
  const podById = new Map(pods.map((p) => [p.id, p]));
  const needle = identity.name.trim().toLowerCase();
  const out: MySubtask[] = [];
  for (const client of clients) {
    for (const project of client.projects) {
      const pod = project.podId ? podById.get(project.podId) : undefined;
      // Strategist is global for now — the one STRATEGY_OWNER owns strategist
      // subtasks on every pod, matching activeAssigneeFor.
      const isStrategist = needle === STRATEGY_OWNER.trim().toLowerCase();
      for (const rawCard of project.deliverables) {
        const card = resolveCardAssignees(rawCard, pod);
        const subs = card.subtasks ?? [];
        if (subs.length === 0) continue;
        const statuses = subtaskStatuses(card);
        subs.forEach((s, i) => {
          if (statuses[i] === "locked") return; // not yet actionable
          const mine =
            s.role === "strategist"
              ? isStrategist
              : (() => {
                  const owner = subtaskAssigneeName(card, s.role);
                  return !!owner && owner.trim().toLowerCase() === needle;
                })();
          if (!mine) return;
          out.push({
            subtask: s,
            status: statuses[i],
            cardId: card.id,
            cardTitle: card.title,
            clientId: client.id,
            clientName: client.name,
            projectId: project.id,
            projectName: project.name,
          });
        });
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

  /* Forward (todo → in_progress): advance the card into the role's
   * primary active phase. Designer's "in_progress" is design, so
   * dragging from todo (strategy / not-started) lands the card in
   * design. Same for developer (→ development). Strategist's
   * in_progress is "live test running" which can only happen via
   * the conclude flow, so leave it as a no-op for them. */
  if (lane === "todo" && toLane === "in_progress") {
    if (role === "senior_designer" || role === "junior_designer") {
      if (card.phase === "design") {
        /* Already in design but classifier put it in todo - happens
         * with revisionRequested edge cases. Clear the flag. */
        return { kind: "patch", patch: { revisionRequested: false } };
      }
      return { kind: "phase_move", phase: "design" };
    }
    if (role === "senior_developer" || role === "junior_developer") {
      if (card.phase === "development") {
        return { kind: "patch", patch: { revisionRequested: false } };
      }
      return { kind: "phase_move", phase: "development" };
    }
    return { kind: "noop", reason: "role doesn't drag todo→in_progress" };
  }

  /* Todo → Done: skip the design/dev step and land straight in the
   * next handoff phase. Useful when the work was done elsewhere and
   * you're just signalling completion. */
  if (lane === "todo" && toLane === "done") {
    if (role === "senior_designer" || role === "junior_designer") {
      return { kind: "phase_move", phase: "internal-revisions" };
    }
    if (role === "senior_developer" || role === "junior_developer") {
      return { kind: "phase_move", phase: "qa" };
    }
    if (role === "strategist" && card.phase === "strategy") {
      // Strategy done → hand the card to design.
      return { kind: "phase_move", phase: "design" };
    }
    return { kind: "noop", reason: "role doesn't drag todo→done" };
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
      if (card.phase === "qa") {
        // Kicked back → re-submit (clear flag); otherwise QA passed → hand to
        // the client-approval hold.
        return card.revisionRequested
          ? { kind: "patch", patch: { revisionRequested: false } }
          : { kind: "phase_move", phase: "client-approval" };
      }
      if (card.phase === "launch") {
        // Go-live complete → Done. (The Results Engine surface was already
        // created when the card ENTERED Launch on the board, not here.)
        return { kind: "phase_move", phase: "done" };
      }
    }
    if (role === "strategist") {
      if (card.phase === "strategy") {
        return { kind: "phase_move", phase: "design" };
      }
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
