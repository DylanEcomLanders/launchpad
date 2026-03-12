// ── Store Intelligence Types ─────────────────────────────────────

export type FindingCategory =
  | "cro_gaps"
  | "quick_wins"
  | "dev_issues"
  | "ux_content"
  | "strategic";

export type FindingSeverity = "high" | "medium" | "low";

export interface Finding {
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  page?: string;
}

// ── Category display metadata ────────────────────────────────────

export const CATEGORY_ORDER: FindingCategory[] = [
  "cro_gaps",
  "quick_wins",
  "dev_issues",
  "ux_content",
  "strategic",
];

export const CATEGORY_META: Record<
  FindingCategory,
  { label: string; border: string; bg: string; pillBg: string; text: string; dot: string }
> = {
  cro_gaps: {
    label: "CRO Gaps",
    border: "border-l-red-500",
    bg: "bg-red-50",
    pillBg: "bg-red-100",
    text: "text-red-800",
    dot: "bg-red-500",
  },
  quick_wins: {
    label: "Quick Wins",
    border: "border-l-emerald-500",
    bg: "bg-emerald-50",
    pillBg: "bg-emerald-100",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  dev_issues: {
    label: "Dev & Technical",
    border: "border-l-blue-500",
    bg: "bg-blue-50",
    pillBg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
  ux_content: {
    label: "UX & Content",
    border: "border-l-amber-500",
    bg: "bg-amber-50",
    pillBg: "bg-amber-100",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  strategic: {
    label: "Strategic Plays",
    border: "border-l-violet-500",
    bg: "bg-violet-50",
    pillBg: "bg-violet-100",
    text: "text-violet-800",
    dot: "bg-violet-500",
  },
};

export const SEVERITY_META: Record<
  FindingSeverity,
  { label: string; pillBg: string; text: string }
> = {
  high: { label: "HIGH", pillBg: "bg-red-100", text: "text-red-700" },
  medium: { label: "MED", pillBg: "bg-amber-100", text: "text-amber-700" },
  low: { label: "LOW", pillBg: "bg-gray-100", text: "text-gray-600" },
};

// ── Result types ─────────────────────────────────────────────────

export interface ProductAnalysis {
  totalProducts: number;
  priceRange: { min: number; max: number; median: number; average: number };
  discounting: { count: number; percent: string; avgDiscount: string };
  productTypes: Record<string, number>;
  multiVariantPercent: string;
}

export interface StoreIntelResult {
  brand: string;
  storeUrl: string;
  products: number;
  collections: number;
  pagesCrawled: number;
  appsDetected: string[];
  theme: string;
  summary: string;
  funnelMaturity: number;
  findings: Finding[];
  productAnalysis: ProductAnalysis | null;
}

export interface PageAuditResult {
  mode: "page";
  pageUrl: string;
  pageType: string;
  title: string;
  appsDetected: string[];
  theme: string;
  summary: string;
  effectivenessScore: number;
  findings: Finding[];
  elements: {
    h1: string;
    heroText: string;
    ctaCount: number;
    ctas: string[];
    imageCount: number;
    scriptCount: number;
    wordCount: number;
    headingStructure: string[];
    persuasionElements: Record<string, boolean>;
    forms: number;
    videos: number;
    links: { internal: number; external: number };
  };
}

// ── Helpers ──────────────────────────────────────────────────────

export function generateMarkdownReport(
  result: StoreIntelResult | PageAuditResult,
): string {
  const isStore = !("mode" in result);
  const name = isStore
    ? (result as StoreIntelResult).brand
    : (result as PageAuditResult).title;
  const score = isStore
    ? `Funnel Maturity: ${(result as StoreIntelResult).funnelMaturity}/10`
    : `Effectiveness: ${(result as PageAuditResult).effectivenessScore}/10`;

  const lines: string[] = [];
  lines.push(`# Audit Machine: ${name}`);
  lines.push("");
  lines.push(`> ${result.summary}`);
  lines.push("");
  lines.push(score);
  lines.push("");

  for (const cat of CATEGORY_ORDER) {
    const catFindings = result.findings.filter((f) => f.category === cat);
    if (!catFindings.length) continue;
    lines.push(`## ${CATEGORY_META[cat].label}`);
    lines.push("");
    catFindings.forEach((f, i) => {
      const sev = f.severity.toUpperCase();
      const page = f.page ? ` — ${f.page}` : "";
      lines.push(`### ${i + 1}. ${f.title} [${sev}]${page}`);
      lines.push("");
      lines.push(f.description);
      lines.push("");
    });
  }

  return lines.join("\n");
}

export function generateFindingsText(findings: Finding[]): string {
  const lines: string[] = [];
  for (const cat of CATEGORY_ORDER) {
    const catFindings = findings.filter((f) => f.category === cat);
    if (!catFindings.length) continue;
    lines.push(`${CATEGORY_META[cat].label.toUpperCase()}`);
    lines.push("─".repeat(40));
    catFindings.forEach((f) => {
      const sev = `[${f.severity.toUpperCase()}]`;
      const page = f.page ? ` (${f.page})` : "";
      lines.push(`${sev} ${f.title}${page}`);
      lines.push(`  ${f.description}`);
      lines.push("");
    });
  }
  return lines.join("\n");
}
