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
  // ── COMMON SENSE (Section 0) ──
  "Opened the page on desktop AND mobile — everything looks finished and polished",
  "All images are sharp — nothing blurry or pixelated",
  "Font sizes are consistent and readable across the page",
  "All animations and transitions are smooth — no jank or glitches",
  "Product page images scroll/navigate correctly",
  "Clicked every button — they all work",
  "Hover states present — cursor changes on all clickable elements",
  "Full buying flow tested: Add to Cart → Cart → Checkout",
  "Content the client needs to edit is editable from Theme Editor (not hardcoded)",
  // ── CODE STANDARDS (Sections 1–5) ──
  "All files use el- prefix, kebab-case, correct naming",
  "Section files under 400 lines, snippets under 200",
  "Schema: clear labels, info text, correct order, defaults, image dimensions",
  "Schema: settings preview correctly in Theme Editor",
  "Liquid: snake_case variables, no deprecated tags, early returns",
  "CSS: BEM naming, scoped to section ID, no broad selectors",
  "JS: no jQuery, external files, data attributes, event delegation",
  "Images: one fetchpriority=\"high\", lazy loading, responsive widths, alt text",
  // ── VISUAL & FUNCTIONAL (Sections 6–17) ──
  "Every section matches latest Figma (spacing, colours, fonts, icons)",
  "Correct fonts loaded — no demo/placeholder fonts",
  "Tested on Desktop, Tablet, Mobile",
  "Tested in Chrome + Safari",
  "All links working — no # placeholders",
  "PDP: variants, pricing, Add to Cart functional",
  "Cart drawer / cart page working",
  "Subscriptions tested (if applicable)",
  "Multi-currency tested (if applicable)",
  "All forms submit correctly",
  "PageSpeed / Lighthouse run, scores noted",
  "Zero console errors",
  "SEO basics (title, meta, H1, headings, alt text)",
  "Accessibility basics (semantic HTML, keyboard nav, contrast, ARIA)",
  "No placeholder copy, lorem ipsum, or TODO text",
  // ── DEPLOYMENT (Sections 18–19) ──
  "Working on duplicate theme — not live",
  "#dev-updates posted today",
  "Any errors logged in #dev-error-log with solution",
];

export interface GateCategory {
  label: string;
  startIndex: number;
  count: number;
}

export const DEV_HANDOFF_CATEGORIES: GateCategory[] = [
  { label: "Common Sense Checks", startIndex: 0, count: 9 },
  { label: "Code Standards", startIndex: 9, count: 8 },
  { label: "Visual & Functional", startIndex: 17, count: 15 },
  { label: "Deployment", startIndex: 32, count: 3 },
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
