/* ── Changelog & Roadmap data layer (localStorage) ── */

export type ChangeType = "added" | "improved" | "fixed" | "removed";
export type RoadmapPriority = "next" | "planned" | "exploring";

export interface ChangeItem {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  id: string;
  date: string;
  version: string;
  title: string;
  changes: ChangeItem[];
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  priority: RoadmapPriority;
  addedBy?: string;
  addedAt: string;
}

// ── Storage keys ──

const CHANGELOG_KEY = "launchpad-changelog";
const ROADMAP_KEY = "launchpad-roadmap";

// ── Seed data ──

const seedChangelog: ChangelogEntry[] = [
  {
    id: "cl-6",
    date: "17 Mar 2025",
    version: "0.6.0",
    title: "Voice Note Cleanup — All Phases",
    changes: [
      { type: "added", text: "Changelog page to track all Launchpad updates" },
      { type: "improved", text: "Mission Control — stats strip (Active Projects, Overdue Tasks, Open Issues, Ad Hoc Requests), Needs Attention section, and Important/All feed filter" },
      { type: "improved", text: "Ops Radar — compact week strip, severity-coded overdue section (expandable by client), color-coded team load bars" },
      { type: "improved", text: "Client Portal — Next Touchpoint card, deliverables grouped by phase, removed assignee input, QA/Dev Check launch buttons" },
      { type: "improved", text: "Content Analytics — visual card grid with performance heatmap, top performer highlights" },
      { type: "improved", text: "QA Checklist & Dev Self-Check — linked to client portals via dropdown, pre-fill support" },
      { type: "improved", text: "Sidebar — removed unfinished tools from nav, moved QA/Dev Check under Team Tools" },
      { type: "removed", text: "Funnel Planner, Content Repurposer, Hook Generator, Upsell Scanner hidden from sidebar (routes still exist)" },
    ],
  },
  {
    id: "cl-5",
    date: "14 Mar 2025",
    version: "0.5.0",
    title: "Issues Tracker & Portal Enhancements",
    changes: [
      { type: "added", text: "Issues tracker — centralised bug & issue reporting system" },
      { type: "added", text: "Ad Hoc Requests on client portals (renamed from Requests)" },
      { type: "improved", text: "Client Portal — Requests renamed to Ad Hoc, promoted in portal overview" },
      { type: "improved", text: "Ops Radar — team load split into Design / Dev / PM sections" },
    ],
  },
  {
    id: "cl-4",
    date: "10 Mar 2025",
    version: "0.4.0",
    title: "Content Analytics & Ops Radar",
    changes: [
      { type: "added", text: "Content Analytics — Twitter sync via TwitterAPI.io with AI categorisation" },
      { type: "added", text: "Ops Radar — ClickUp integration for task tracking" },
      { type: "added", text: "Team timezone clocks in sidebar footer" },
    ],
  },
  {
    id: "cl-3",
    date: "5 Mar 2025",
    version: "0.3.0",
    title: "Client Portal System",
    changes: [
      { type: "added", text: "Client Portal — create, manage, and share project portals" },
      { type: "added", text: "Portal public view with branded token-based URLs" },
      { type: "added", text: "Deliverables tracking with phase management" },
      { type: "added", text: "QA Checklist tool for pre-launch quality checks" },
      { type: "added", text: "Dev Self-Check tool for developer sign-off" },
    ],
  },
  {
    id: "cl-2",
    date: "28 Feb 2025",
    version: "0.2.0",
    title: "Finance & Strategy Tools",
    changes: [
      { type: "added", text: "Price Calculator with tier-based pricing" },
      { type: "added", text: "Dev Hours tracker" },
      { type: "added", text: "Invoice Generator" },
      { type: "added", text: "Proposals tool with AI-assisted generation" },
      { type: "added", text: "Project Setup / Kickoff wizard" },
      { type: "added", text: "Portfolio showcase page" },
    ],
  },
  {
    id: "cl-1",
    date: "20 Feb 2025",
    version: "0.1.0",
    title: "Initial Launch",
    changes: [
      { type: "added", text: "Launchpad dashboard with sidebar navigation" },
      { type: "added", text: "Mission Control home page with workflow lanes" },
      { type: "added", text: "Slack activity feed integration" },
    ],
  },
];

const seedRoadmap: RoadmapItem[] = [
  { id: "rm-1", title: "Approval Workflow", description: "Branded link → Figma → approve/revise → Slack notification. Full client approval flow.", priority: "next", addedAt: "2025-03-17" },
  { id: "rm-2", title: "Client Portal — Live Data", description: "Connect portal deliverables and phases to ClickUp tasks so status updates automatically.", priority: "next", addedAt: "2025-03-17" },
  { id: "rm-3", title: "Wins & Results Tabs", description: "Dedicated sections on client portals to showcase results, metrics, and case study data.", priority: "planned", addedAt: "2025-03-17" },
  { id: "rm-4", title: "Funnel Planner", description: "Visual funnel builder for mapping out client acquisition and conversion flows.", priority: "planned", addedAt: "2025-03-17" },
  { id: "rm-5", title: "Content Repurposer", description: "Take top-performing content and generate variations for different platforms.", priority: "planned", addedAt: "2025-03-17" },
  { id: "rm-6", title: "Hook Generator", description: "AI-powered hook and headline generator for ads, emails, and landing pages.", priority: "exploring", addedAt: "2025-03-17" },
  { id: "rm-7", title: "Upsell Scanner", description: "Analyse client accounts to surface upsell and cross-sell opportunities.", priority: "exploring", addedAt: "2025-03-17" },
  { id: "rm-8", title: "Portfolio Performance", description: "Speed and load time monitoring for portfolio sites.", priority: "exploring", addedAt: "2025-03-17" },
];

// ── Getters ──

function ensureSeeded<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

export function getChangelog(): ChangelogEntry[] {
  return ensureSeeded(CHANGELOG_KEY, seedChangelog);
}

export function getRoadmap(): RoadmapItem[] {
  return ensureSeeded(ROADMAP_KEY, seedRoadmap);
}

// ── Mutators ──

export function addChangelogEntry(entry: Omit<ChangelogEntry, "id">): ChangelogEntry {
  const entries = getChangelog();
  const newEntry: ChangelogEntry = { ...entry, id: `cl-${Date.now()}` };
  entries.unshift(newEntry);
  localStorage.setItem(CHANGELOG_KEY, JSON.stringify(entries));
  return newEntry;
}

export function addRoadmapItem(item: Omit<RoadmapItem, "id" | "addedAt">): RoadmapItem {
  const items = getRoadmap();
  const newItem: RoadmapItem = { ...item, id: `rm-${Date.now()}`, addedAt: new Date().toISOString().slice(0, 10) };
  items.push(newItem);
  localStorage.setItem(ROADMAP_KEY, JSON.stringify(items));
  return newItem;
}

export function deleteRoadmapItem(id: string): void {
  const items = getRoadmap().filter((i) => i.id !== id);
  localStorage.setItem(ROADMAP_KEY, JSON.stringify(items));
}

export function updateRoadmapPriority(id: string, priority: RoadmapPriority): void {
  const items = getRoadmap();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.priority = priority;
    localStorage.setItem(ROADMAP_KEY, JSON.stringify(items));
  }
}
