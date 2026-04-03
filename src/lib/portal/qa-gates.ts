/* ── QA Gate Helpers ── */

import type { QAGate, QAGateItem, PortalProject } from "./types";

export const CRO_BRIEF_ITEMS = [
  "Target audience defined",
  "Key angles/hooks identified",
  "Competitor pages reviewed",
  "Page structure/flow recommended",
  "Copy direction provided",
  "KPIs defined",
];

export const DESIGN_HANDOFF_ITEMS = [
  "Annotations added to Figma for developers",
  "All content is in Figma — carousel slides, tabs, hidden sections, popups, etc.",
  "No placeholder copy — all copy is final",
];

export const DEV_HANDOFF_ITEMS = [
  "Matches Figma pixel-perfect",
  "Mobile responsive tested",
  "Cross-browser tested (Chrome, Safari, Firefox)",
  "Page speed acceptable",
  "No console errors",
  "All links/CTAs working",
  "Staging URL provided",
];

/** Create a fresh gate with all items unchecked */
export function createDefaultGate(labels: string[]): QAGate {
  return {
    items: labels.map((label) => ({ label, checked: false })),
    notes: "",
    submitted_by: "",
    status: "pending",
  };
}

/** Count checked items */
export function getGateProgress(gate: QAGate): { checked: number; total: number } {
  return {
    checked: gate.items.filter((i) => i.checked).length,
    total: gate.items.length,
  };
}

/** All items checked */
export function isGateComplete(gate: QAGate): boolean {
  return gate.items.every((i) => i.checked);
}

/** Design handoff requires form fields + checklist */
export function isDesignHandoffComplete(gate: QAGate): boolean {
  return (
    isGateComplete(gate) &&
    !!gate.figma_url?.trim() &&
    !!gate.loom_url?.trim()
  );
}

/** Check if prerequisites are met for a gate */
export function arePrerequisitesMet(project: PortalProject, gateKey: "cro_brief" | "design_handoff" | "dev_handoff"): boolean {
  const gates = project.qa_gates;
  if (!gates) return gateKey === "cro_brief"; // First gate always available

  switch (gateKey) {
    case "cro_brief":
      return true; // No prerequisites
    case "design_handoff":
      // CRO brief must be submitted OR disabled
      if (gates.cro_brief_enabled === false || !gates.cro_brief_enabled) return true;
      return gates.cro_brief?.status === "submitted";
    case "dev_handoff":
      // Design handoff must be submitted
      return gates.design_handoff?.status === "submitted";
    default:
      return false;
  }
}

/** Gate display config */
export const GATE_CONFIG: Record<string, { title: string; color: string; role: string }> = {
  cro_brief: { title: "CRO Pre-Design Brief", color: "#DC2626", role: "CRO Strategist" },
  design_handoff: { title: "Design → Dev Handoff", color: "#7C3AED", role: "Designer" },
  dev_handoff: { title: "Dev → Senior Dev QA", color: "#059669", role: "Developer" },
};
