/* ── Client Portal types + mock data ── */

export type PhaseStatus = "complete" | "in-progress" | "upcoming";
export type DeliverableStatus = "complete" | "in-progress" | "not-started";

export interface PortalPhase {
  name: string;
  status: PhaseStatus;
  dates: string;
  description: string;
  tasks: number;
  completed: number;
}

export interface PortalDeliverable {
  name: string;
  phase: string;
  status: DeliverableStatus;
  assignee: string;
}

export interface PortalDocument {
  name: string;
  type: "Roadmap" | "Scope" | "Agreement" | "QA Checklist" | "Other";
  date: string;
}

export interface PortalTestResult {
  name: string;
  status: "running" | "winner" | "loser" | "scheduled";
  metric: string;
  lift?: string;
  startDate: string;
}

export interface PortalData {
  token: string;
  clientName: string;
  projectType: string;
  currentPhase: string;
  progress: number;
  nextTouchpoint: { date: string; description: string };
  phases: PortalPhase[];
  scope: string[];
  deliverables: PortalDeliverable[];
  documents: PortalDocument[];
  results: PortalTestResult[];
  createdAt: string;
  viewCount: number;
}

/* ── Demo data ── */

export const DEMO_PORTALS: PortalData[] = [
  {
    token: "demo-nutribloom",
    clientName: "Nutribloom",
    projectType: "Full Page Build",
    currentPhase: "Design",
    progress: 26,
    createdAt: "2026-03-03",
    viewCount: 12,
    nextTouchpoint: {
      date: "13 Mar",
      description: "Design review — we'll walk you through all mockups for feedback",
    },
    scope: [
      "Homepage",
      "Product page (PDP)",
      "Collection page",
      "Landing page",
      "Mobile responsive pass",
      "App integrations",
      "Cross-browser QA",
      "Post-launch support (30 days)",
    ],
    phases: [
      { name: "Kickoff", status: "complete", dates: "3 Mar", description: "Discovery call, brand asset collection, and technical requirements documentation", tasks: 3, completed: 3 },
      { name: "Design", status: "in-progress", dates: "4 Mar – 13 Mar", description: "Wireframes and high-fidelity mockups for all key pages including mobile responsive designs", tasks: 5, completed: 2 },
      { name: "Revision", status: "upcoming", dates: "16 Mar – 19 Mar", description: "Design feedback round and final sign-off before development begins", tasks: 2, completed: 0 },
      { name: "Development", status: "upcoming", dates: "20 Mar – 31 Mar", description: "Full build of all pages, app integrations, and cross-browser quality assurance", tasks: 6, completed: 0 },
      { name: "Launch", status: "upcoming", dates: "1 Apr", description: "DNS configuration, deployment, and post-launch smoke testing", tasks: 2, completed: 0 },
      { name: "30-Day Support", status: "upcoming", dates: "1 Apr – 1 May", description: "Ongoing monitoring and support to ensure everything runs smoothly", tasks: 1, completed: 0 },
    ],
    deliverables: [
      { name: "Discovery & stakeholder interview", phase: "Kickoff", status: "complete", assignee: "DE" },
      { name: "Brand asset collection", phase: "Kickoff", status: "complete", assignee: "DE" },
      { name: "Technical requirements doc", phase: "Kickoff", status: "complete", assignee: "JL" },
      { name: "Homepage wireframe", phase: "Design", status: "complete", assignee: "AK" },
      { name: "PDP mockup v1", phase: "Design", status: "complete", assignee: "AK" },
      { name: "Collection page mockup", phase: "Design", status: "in-progress", assignee: "AK" },
      { name: "Landing page mockup", phase: "Design", status: "in-progress", assignee: "AK" },
      { name: "Mobile responsive pass", phase: "Design", status: "not-started", assignee: "AK" },
      { name: "Design review & feedback", phase: "Revision", status: "not-started", assignee: "DE" },
      { name: "Final design sign-off", phase: "Revision", status: "not-started", assignee: "DE" },
      { name: "Homepage build", phase: "Development", status: "not-started", assignee: "MR" },
      { name: "PDP build", phase: "Development", status: "not-started", assignee: "MR" },
      { name: "Collection page build", phase: "Development", status: "not-started", assignee: "MR" },
      { name: "Landing page build", phase: "Development", status: "not-started", assignee: "JL" },
      { name: "App integrations", phase: "Development", status: "not-started", assignee: "JL" },
      { name: "Cross-browser QA", phase: "Development", status: "not-started", assignee: "MR" },
      { name: "DNS & deployment", phase: "Launch", status: "not-started", assignee: "JL" },
      { name: "Post-launch smoke test", phase: "Launch", status: "not-started", assignee: "MR" },
      { name: "30-day monitoring", phase: "30-Day Support", status: "not-started", assignee: "DE" },
    ],
    documents: [
      { name: "Nutribloom – Project Roadmap", type: "Roadmap", date: "3 Mar 2026" },
      { name: "Nutribloom – Scope of Work", type: "Scope", date: "3 Mar 2026" },
      { name: "Nutribloom – Service Agreement", type: "Agreement", date: "3 Mar 2026" },
    ],
    results: [],
  },
  {
    token: "demo-peakform",
    clientName: "PeakForm Athletics",
    projectType: "Full Theme Rebuild",
    currentPhase: "Development",
    progress: 62,
    createdAt: "2026-02-10",
    viewCount: 34,
    nextTouchpoint: {
      date: "12 Mar",
      description: "Development progress update — homepage and PDP preview ready for review",
    },
    scope: [
      "Homepage",
      "Product page (PDP)",
      "Collection page",
      "About page",
      "Blog template",
      "Mobile responsive pass",
      "App migrations",
      "Cross-browser QA",
      "Post-launch support (30 days)",
    ],
    phases: [
      { name: "Kickoff", status: "complete", dates: "10 Feb", description: "Discovery workshop, competitor analysis, and technical audit", tasks: 3, completed: 3 },
      { name: "Design", status: "complete", dates: "11 Feb – 24 Feb", description: "Full wireframe and mockup suite across all page templates including mobile", tasks: 6, completed: 6 },
      { name: "Revision", status: "complete", dates: "25 Feb – 28 Feb", description: "Design revision round and final client sign-off", tasks: 2, completed: 2 },
      { name: "Development", status: "in-progress", dates: "3 Mar – 18 Mar", description: "Theme build, page development, app migrations, and cross-browser QA", tasks: 8, completed: 4 },
      { name: "Launch", status: "upcoming", dates: "19 Mar", description: "DNS configuration, deployment, and post-launch smoke testing", tasks: 2, completed: 0 },
      { name: "30-Day Support", status: "upcoming", dates: "19 Mar – 18 Apr", description: "Ongoing monitoring and support to ensure everything runs smoothly", tasks: 1, completed: 0 },
    ],
    deliverables: [
      { name: "Discovery & brand workshop", phase: "Kickoff", status: "complete", assignee: "DE" },
      { name: "Competitor analysis", phase: "Kickoff", status: "complete", assignee: "DE" },
      { name: "Technical audit", phase: "Kickoff", status: "complete", assignee: "JL" },
      { name: "Homepage wireframe", phase: "Design", status: "complete", assignee: "AK" },
      { name: "PDP wireframe", phase: "Design", status: "complete", assignee: "AK" },
      { name: "Collection page wireframe", phase: "Design", status: "complete", assignee: "AK" },
      { name: "About page wireframe", phase: "Design", status: "complete", assignee: "AK" },
      { name: "Blog template", phase: "Design", status: "complete", assignee: "AK" },
      { name: "Mobile responsive pass", phase: "Design", status: "complete", assignee: "AK" },
      { name: "Design revision round", phase: "Revision", status: "complete", assignee: "AK" },
      { name: "Final sign-off", phase: "Revision", status: "complete", assignee: "DE" },
      { name: "Theme scaffold & config", phase: "Development", status: "complete", assignee: "JL" },
      { name: "Homepage build", phase: "Development", status: "complete", assignee: "MR" },
      { name: "PDP build", phase: "Development", status: "complete", assignee: "MR" },
      { name: "Collection page build", phase: "Development", status: "complete", assignee: "JL" },
      { name: "About page build", phase: "Development", status: "in-progress", assignee: "MR" },
      { name: "Blog template build", phase: "Development", status: "in-progress", assignee: "JL" },
      { name: "App migrations", phase: "Development", status: "not-started", assignee: "JL" },
      { name: "Cross-browser QA", phase: "Development", status: "not-started", assignee: "MR" },
      { name: "DNS & deployment", phase: "Launch", status: "not-started", assignee: "JL" },
      { name: "Post-launch smoke test", phase: "Launch", status: "not-started", assignee: "MR" },
      { name: "30-day monitoring", phase: "30-Day Support", status: "not-started", assignee: "DE" },
    ],
    documents: [
      { name: "PeakForm – Project Roadmap", type: "Roadmap", date: "10 Feb 2026" },
      { name: "PeakForm – Scope of Work", type: "Scope", date: "10 Feb 2026" },
      { name: "PeakForm – Service Agreement", type: "Agreement", date: "10 Feb 2026" },
      { name: "PeakForm – QA Checklist", type: "QA Checklist", date: "5 Mar 2026" },
    ],
    results: [
      { name: "Homepage hero CTA copy test", status: "running", metric: "Add-to-cart rate", startDate: "5 Mar" },
      { name: "PDP image gallery layout", status: "winner", metric: "Conversion rate", lift: "+12.4%", startDate: "28 Feb" },
      { name: "Collection page filter position", status: "running", metric: "Collection click-through", startDate: "3 Mar" },
      { name: "Sticky add-to-cart bar", status: "scheduled", metric: "Add-to-cart rate", startDate: "12 Mar" },
    ],
  },
];

export function getPortalByToken(token: string): PortalData | undefined {
  return DEMO_PORTALS.find((p) => p.token === token);
}
