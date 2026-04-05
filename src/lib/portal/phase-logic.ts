/* ── Phase movement logic with proper gating ── */

import type { PortalPhase } from "./types";

interface PhaseResult {
  phases: PortalPhase[];
  current_phase: string;
  changed: boolean; // false if the transition was blocked
}

/**
 * Advance a phase's status with proper gating rules:
 * 1. Only ONE phase can be "in-progress" at a time
 * 2. A phase can only start if the previous phase is complete
 * 3. Completing a phase auto-advances the next to "in-progress"
 * 4. Complete can be undone ONLY if no later phase has progressed
 */
export function cyclePhaseStatus(
  phases: PortalPhase[],
  phaseId: string
): PhaseResult {
  const idx = phases.findIndex((p) => p.id === phaseId);
  if (idx === -1) return { phases, current_phase: deriveCurrentPhase(phases), changed: false };

  const phase = phases[idx];
  const updated = phases.map((p) => ({ ...p })); // shallow clone all

  if (phase.status === "upcoming") {
    // ── Transition: upcoming → in-progress ──
    // Gate: previous phase must be complete (or this is the first phase)
    if (idx > 0 && updated[idx - 1].status !== "complete") {
      return { phases, current_phase: deriveCurrentPhase(phases), changed: false };
    }
    // Clear any other in-progress phase (safety net)
    updated.forEach((p, i) => {
      if (i !== idx && p.status === "in-progress") p.status = "upcoming";
    });
    updated[idx].status = "in-progress";
  } else if (phase.status === "in-progress") {
    // ── Transition: in-progress → complete ──
    updated[idx].status = "complete";
    updated[idx].completedDate = new Date().toISOString().split("T")[0];
    // Auto-advance: next upcoming phase → in-progress
    if (idx + 1 < updated.length && updated[idx + 1].status === "upcoming") {
      updated[idx + 1].status = "in-progress";
    }
  } else if (phase.status === "complete") {
    // ── Transition: complete → in-progress (undo) ──
    // Gate: no later phase can be in-progress or complete
    const laterPhases = updated.slice(idx + 1);
    if (laterPhases.some((p) => p.status !== "upcoming")) {
      return { phases, current_phase: deriveCurrentPhase(phases), changed: false };
    }
    // Clear any other in-progress phase
    updated.forEach((p, i) => {
      if (i !== idx && p.status === "in-progress") p.status = "upcoming";
    });
    updated[idx].status = "in-progress";
    delete updated[idx].completedDate;
  }

  return {
    phases: updated,
    current_phase: deriveCurrentPhase(updated),
    changed: true,
  };
}

/** Derive the current_phase label from the phases array */
function deriveCurrentPhase(phases: PortalPhase[]): string {
  const inProgress = phases.find((p) => p.status === "in-progress");
  if (inProgress) return inProgress.name;
  // All complete? Return last completed
  const completed = phases.filter((p) => p.status === "complete");
  if (completed.length > 0) return completed[completed.length - 1].name;
  // Nothing started — return first phase
  return phases[0]?.name || "";
}

/**
 * Check if a phase can advance from its current status.
 * Useful for disabling buttons in the UI.
 */
export function canPhaseAdvance(phases: PortalPhase[], phaseId: string): boolean {
  const result = cyclePhaseStatus(phases, phaseId);
  return result.changed;
}
