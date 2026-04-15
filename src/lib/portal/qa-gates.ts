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
  "Functionality comments left for all key functions",
  "All carousel, dropdown and extra off-screen content added",
  "6-8 optimised product page images included",
  "Copy finalised and no placeholders left",
];

export const DEV_HANDOFF_ITEMS = [
  // Figma Accuracy
  "Spacing and padding matches Figma exactly",
  "Font sizes, weights, and line heights match Figma",
  "Colours match design system — no wrong shades or textures",
  "Layout structure matches Figma on desktop (1440px)",
  "Layout structure matches Figma on mobile (375px)",
  // Images & Assets
  "All images are high quality — no blurry or pixelated assets",
  "Images optimised (WebP, lazy-loaded, correct dimensions)",
  "Product images are correct and display properly in all sections",
  "Icons and graphics are SVG where applicable",
  // Functionality
  "All carousels and sliders swipe correctly with proper controls",
  "Bundle selector works — correct quantities, variants, and pricing",
  "Add to cart works and adds the correct items",
  "Cart item removal works",
  "Upsells and cross-sells function correctly",
  "All dropdowns, tabs, and accordion sections work",
  "Sticky elements appear and disappear at correct scroll positions",
  // Responsive & Devices
  "Tested on a real mobile device (not just Chrome devtools)",
  "No layout breaks between 320px and 1600px",
  "No horizontal scroll at any viewport",
  "Pinch-to-zoom doesn't break the layout",
  // Performance & Code
  "Page loads under 3 seconds on mobile (Lighthouse check)",
  "No console errors",
  "No broken links or dead CTAs",
  "Theme changes haven't broken other pages on the site",
  // Pre-Handover
  "Staging URL provided and accessible",
  "Copy matches approved design exactly — no typos or missing text",
];

export interface GateCategory {
  label: string;
  startIndex: number;
  count: number;
}

export const DEV_HANDOFF_CATEGORIES: GateCategory[] = [
  { label: "Figma Accuracy", startIndex: 0, count: 5 },
  { label: "Images & Assets", startIndex: 5, count: 4 },
  { label: "Functionality", startIndex: 9, count: 7 },
  { label: "Responsive & Devices", startIndex: 16, count: 4 },
  { label: "Performance & Code", startIndex: 20, count: 4 },
  { label: "Pre-Handover", startIndex: 24, count: 2 },
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

/** Design handoff requires form fields + checklist + font files */
export function isDesignHandoffComplete(gate: QAGate): boolean {
  return (
    isGateComplete(gate) &&
    !!gate.figma_url?.trim() &&
    !!gate.loom_url?.trim() &&
    (gate.font_files_uploads?.length ?? 0) > 0
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
  cro_brief: { title: "CRO Design", color: "#DC2626", role: "CRO Strategist" },
  design_handoff: { title: "Design Handoff", color: "#7C3AED", role: "Designer" },
  dev_handoff: { title: "Dev to Senior Dev QA", color: "#059669", role: "Developer" },
};
