import fs from "fs";
import path from "path";

const contentDir = path.join(process.cwd(), "src/content/funnel-knowledge");

export interface FunnelModule {
  slug: string;
  title: string;
  shortTitle: string;
  layer: string;
  icon: string;
  content: string;
  category: "layer" | "reference";
}

const moduleMap: Record<
  string,
  { title: string; shortTitle: string; layer: string; icon: string; category: "layer" | "reference" }
> = {
  "00-overview": {
    title: "Complete Funnel Map & Overview",
    shortTitle: "Overview",
    layer: "0",
    icon: "map",
    category: "layer",
  },
  "01-traffic": {
    title: "Traffic & Audience",
    shortTitle: "Traffic",
    layer: "1",
    icon: "signal",
    category: "layer",
  },
  "02-ad-creative": {
    title: "Ad Creative & Messaging",
    shortTitle: "Ad Creative",
    layer: "2",
    icon: "target",
    category: "layer",
  },
  "03-landing-page": {
    title: "Landing Page / Homepage",
    shortTitle: "Landing Page",
    layer: "3",
    icon: "home",
    category: "layer",
  },
  "04-pdp": {
    title: "Product Detail Page (PDP)",
    shortTitle: "PDP",
    layer: "4",
    icon: "cube",
    category: "layer",
  },
  "05-cart": {
    title: "Cart",
    shortTitle: "Cart",
    layer: "5",
    icon: "cart",
    category: "layer",
  },
  "06-checkout": {
    title: "Checkout",
    shortTitle: "Checkout",
    layer: "6",
    icon: "credit-card",
    category: "layer",
  },
  "07-post-purchase": {
    title: "Post-Purchase",
    shortTitle: "Post-Purchase",
    layer: "7",
    icon: "inbox",
    category: "layer",
  },
  "08-retention": {
    title: "Retention & LTV",
    shortTitle: "Retention",
    layer: "8",
    icon: "refresh",
    category: "layer",
  },
  "09-offer-architecture": {
    title: "Offer Architecture",
    shortTitle: "Offers",
    layer: "9",
    icon: "stack",
    category: "layer",
  },
  "10-analytics": {
    title: "Analytics & Measurement",
    shortTitle: "Analytics",
    layer: "10",
    icon: "chart",
    category: "layer",
  },
  "AUDIT-CHECKLIST": {
    title: "Master Audit Checklist",
    shortTitle: "Audit Checklist",
    layer: "",
    icon: "check",
    category: "reference",
  },
  "TEST-HYPOTHESES": {
    title: "Test Hypothesis Bank",
    shortTitle: "Test Ideas",
    layer: "",
    icon: "beaker",
    category: "reference",
  },
  GLOSSARY: {
    title: "Glossary of Terms",
    shortTitle: "Glossary",
    layer: "",
    icon: "book",
    category: "reference",
  },
};

export function getFunnelModule(slug: string): FunnelModule | null {
  const meta = moduleMap[slug];
  if (!meta) return null;

  const filePath = path.join(contentDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8");

  return { slug, ...meta, content };
}

export function getAllFunnelModules(): FunnelModule[] {
  return Object.keys(moduleMap)
    .map((slug) => getFunnelModule(slug))
    .filter((m): m is FunnelModule => m !== null);
}

export function getFunnelModuleSlugs(): string[] {
  return Object.keys(moduleMap);
}

export type FunnelModuleMeta = Omit<FunnelModule, "content">;

export function getAllFunnelModuleMeta(): FunnelModuleMeta[] {
  return Object.entries(moduleMap).map(([slug, meta]) => ({ slug, ...meta }));
}
