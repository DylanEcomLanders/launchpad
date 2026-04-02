/* ── SOP Library Types ── */

export type SOPCategory = "design" | "development" | "cro" | "operations" | "client" | "qa";

export const SOP_CATEGORIES: { key: SOPCategory; label: string; color: string }[] = [
  { key: "design", label: "Design", color: "#7C3AED" },
  { key: "development", label: "Development", color: "#059669" },
  { key: "cro", label: "CRO", color: "#DC2626" },
  { key: "operations", label: "Operations", color: "#2563EB" },
  { key: "client", label: "Client", color: "#E37400" },
  { key: "qa", label: "QA", color: "#6B7280" },
];

export interface SOP {
  id: string;
  title: string;
  description: string;
  category: SOPCategory;
  tags: string[];
  loomUrl?: string;
  content: string; // Markdown
  createdBy: string;
  created_at: string;
  updated_at: string;
}
