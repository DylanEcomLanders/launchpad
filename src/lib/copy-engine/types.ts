/* ── Copy Engine Types ── */

export type CopyMode = "Page" | "Advertorial" | "Listicle";

export type ContextBlockLabel = "Ad Copy" | "Inspo Page" | "Competitor Page" | "Other";

export interface ContextBlock {
  id: string;
  label: ContextBlockLabel;
  content: string;
}

export const contextBlockLabels: ContextBlockLabel[] = [
  "Ad Copy",
  "Inspo Page",
  "Competitor Page",
  "Other",
];

export interface CopySection {
  id: string;
  label: string;
  content: string;
}
