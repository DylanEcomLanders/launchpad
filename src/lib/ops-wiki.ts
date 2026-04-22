import fs from "fs";
import path from "path";

const contentDir = path.join(process.cwd(), "src/content/ops-wiki");

export interface OpsWikiModule {
  slug: string;
  title: string;
  shortTitle: string;
  icon: string;
  content: string;
  category: "flow" | "design" | "development" | "cro" | "operations" | "qa" | "client";
  toolHref?: string;
  /** Hide from the /team/ops-wiki view — commercial / sales / finance content the team doesn't need to see. */
  adminOnly?: boolean;
}

const moduleMap: Record<
  string,
  { title: string; shortTitle: string; icon: string; category: OpsWikiModule["category"]; toolHref?: string; adminOnly?: boolean }
> = {
  // ── Project Flows (Layer 1) ──
  "flow-00-inbox": {
    title: "Onboarding Inbox — Intake & Triage",
    shortTitle: "Onboarding Inbox",
    icon: "inbox",
    category: "flow",
  },
  "flow-01-design-only": {
    title: "Flow: Design Only",
    shortTitle: "Design Only",
    icon: "swatch",
    category: "flow",
  },
  "flow-02-design-dev": {
    title: "Flow: Design & Development",
    shortTitle: "Design & Dev",
    icon: "code",
    category: "flow",
  },
  "flow-03-design-dev-cro": {
    title: "Flow: Design, Dev & CRO",
    shortTitle: "D&D + CRO",
    icon: "beaker",
    category: "flow",
  },
  "flow-04-conversion-engine": {
    title: "Flow: Conversion Engine",
    shortTitle: "Conversion Engine",
    icon: "rocket",
    category: "flow",
  },

  // ── Conversion Engine (nested under flow) ──
  "ce-00-overview": {
    title: "The Offer — Pricing & Positioning",
    shortTitle: "The Offer",
    icon: "map",
    category: "flow",
    adminOnly: true,
  },
  "ce-01-sales-process": {
    title: "Sales Process — Two-Stage Audit Close",
    shortTitle: "Sales Process",
    icon: "phone",
    category: "flow",
    toolHref: "/tools/offer-engine",
    adminOnly: true,
  },
  "ce-02-onboarding": {
    title: "Onboarding & System Setup",
    shortTitle: "Onboarding",
    icon: "clipboard",
    category: "flow",
  },
  "ce-03-delivery": {
    title: "Delivery Framework — Team-Led Roadmap",
    shortTitle: "Delivery",
    icon: "calendar",
    category: "flow",
  },
  "ce-04-conversion-matrix": {
    title: "Conversion Matrix — The Diagnostic Engine",
    shortTitle: "Conversion Matrix",
    icon: "grid",
    category: "flow",
  },
  "ce-05-revenue-projector": {
    title: "Revenue Projector — Partnership Economics",
    shortTitle: "Revenue Projector",
    icon: "calculator",
    category: "flow",
    adminOnly: true,
  },
  "ce-06-slide-deck": {
    title: "Slide Decks — Two-Stage Approach",
    shortTitle: "Slide Decks",
    icon: "presentation",
    category: "flow",
    adminOnly: true,
  },
  "ce-07-positioning": {
    title: "Positioning & Language Guide",
    shortTitle: "Positioning",
    icon: "megaphone",
    category: "flow",
    adminOnly: true,
  },
  "ce-08-faq": {
    title: "FAQ — Client & Internal",
    shortTitle: "FAQ",
    icon: "chat",
    category: "flow",
    adminOnly: true,
  },

  // ── Design (Layer 2) ──
  "00-design-process": {
    title: "Design Process & Workflow",
    shortTitle: "Design Process",
    icon: "swatch",
    category: "design",
  },
  "01-figma-workflow": {
    title: "Figma Workflow & File Structure",
    shortTitle: "Figma Workflow",
    icon: "squares",
    category: "design",
    toolHref: "https://www.figma.com/design/QDGh9XLKyvvumKwftUylvi/Ecomlanders-Design-Library?node-id=382-177",
  },
  "02-handoff": {
    title: "Design to Dev Handoff",
    shortTitle: "Handoff to Dev",
    icon: "arrows",
    category: "design",
  },

  // ── Development ──
  "03-build-process": {
    title: "Build Process & Standards",
    shortTitle: "Build Process",
    icon: "code",
    category: "development",
  },
  "04-shopify-workflow": {
    title: "Shopify Development Workflow",
    shortTitle: "Shopify Workflow",
    icon: "cart",
    category: "development",
  },
  "05-deployment": {
    title: "Deployment & Go-Live Checklist",
    shortTitle: "Deployment",
    icon: "rocket",
    category: "development",
  },

  // ── CRO ──
  "06-audit-process": {
    title: "CRO Audit Process",
    shortTitle: "Audit Process",
    icon: "magnify",
    category: "cro",
    toolHref: "/tools/cro-audit",
  },
  "07-testing-framework": {
    title: "Testing & Experimentation Framework",
    shortTitle: "Testing Framework",
    icon: "beaker",
    category: "cro",
  },
  "08-reporting": {
    title: "Reporting & Analytics",
    shortTitle: "Reporting",
    icon: "chart",
    category: "cro",
  },

  // ── Operations ──
  "09-client-onboarding": {
    title: "Client Onboarding — Portal Setup",
    shortTitle: "Client Onboarding",
    icon: "clipboard",
    category: "operations",
    toolHref: "/tools/project-kickoff",
  },
  "10-project-management": {
    title: "Project Management & Delivery Rhythm",
    shortTitle: "Project Management",
    icon: "calendar",
    category: "operations",
  },
  "11-invoicing": {
    title: "Invoicing & Financial Ops",
    shortTitle: "Invoicing",
    icon: "banknotes",
    category: "operations",
    toolHref: "/tools/invoice-generator",
    adminOnly: true,
  },

  // ── QA ──
  "12-qa-checklist": {
    title: "QA Checklist & Browser Testing",
    shortTitle: "QA Checklist",
    icon: "check",
    category: "qa",
    toolHref: "/tools/qa-checklist",
  },
  "13-performance": {
    title: "Performance & Page Speed",
    shortTitle: "Performance",
    icon: "bolt",
    category: "qa",
  },

  // ── Client ──
  "14-client-comms": {
    title: "Client Communication & Updates",
    shortTitle: "Client Comms",
    icon: "chat",
    category: "client",
  },
  "15-scope-management": {
    title: "Scope Management & Change Requests",
    shortTitle: "Scope Management",
    icon: "shield",
    category: "client",
    toolHref: "/tools/scope-generator",
  },
};

export function getOpsWikiModule(slug: string): OpsWikiModule | null {
  const meta = moduleMap[slug];
  if (!meta) return null;
  const filePath = path.join(contentDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  return { slug, ...meta, content };
}

export function getAllOpsWikiModules(): OpsWikiModule[] {
  return Object.keys(moduleMap)
    .map((slug) => getOpsWikiModule(slug))
    .filter((m): m is OpsWikiModule => m !== null);
}
