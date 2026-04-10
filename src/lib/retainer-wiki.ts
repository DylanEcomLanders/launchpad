import fs from "fs";
import path from "path";

const contentDir = path.join(process.cwd(), "src/content/retainer-wiki");

export interface WikiModule {
  slug: string;
  title: string;
  shortTitle: string;
  icon: string;
  content: string;
  category: "process" | "toolkit" | "reference";
  toolHref?: string; // link to a Launchpad tool if this section has one
}

const moduleMap: Record<
  string,
  { title: string; shortTitle: string; icon: string; category: WikiModule["category"]; toolHref?: string }
> = {
  "00-overview": {
    title: "Retainer Model & Positioning",
    shortTitle: "Overview",
    icon: "map",
    category: "process",
  },
  "01-sales-process": {
    title: "Sales Process — Two-Call Close",
    shortTitle: "Sales Process",
    icon: "phone",
    category: "process",
  },
  "02-onboarding": {
    title: "Onboarding & Audit Framework",
    shortTitle: "Onboarding",
    icon: "clipboard",
    category: "process",
  },
  "03-delivery": {
    title: "Delivery Framework & Cadence",
    shortTitle: "Delivery",
    icon: "calendar",
    category: "process",
  },
  "04-conversion-matrix": {
    title: "Conversion Matrix — Funnel Scoring",
    shortTitle: "Conversion Matrix",
    icon: "grid",
    category: "toolkit",
    toolHref: "/tools/cro-audit",
  },
  "05-revenue-projector": {
    title: "Revenue Projector — OTE Calculator",
    shortTitle: "Revenue Projector",
    icon: "calculator",
    category: "toolkit",
  },
  "06-slide-deck": {
    title: "Slide Deck Generator",
    shortTitle: "Slide Deck",
    icon: "presentation",
    category: "toolkit",
  },
  "07-positioning": {
    title: "Positioning & Language Guide",
    shortTitle: "Positioning",
    icon: "megaphone",
    category: "reference",
  },
};

export function getWikiModule(slug: string): WikiModule | null {
  const meta = moduleMap[slug];
  if (!meta) return null;
  const filePath = path.join(contentDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  return { slug, ...meta, content };
}

export function getAllWikiModules(): WikiModule[] {
  return Object.keys(moduleMap)
    .map((slug) => getWikiModule(slug))
    .filter((m): m is WikiModule => m !== null);
}
