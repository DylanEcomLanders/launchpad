/* ── Changelog & Roadmap data layer (Supabase + localStorage fallback) ── */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
    id: "cl-8",
    date: "18 Mar 2026",
    version: "0.8.0",
    title: "Client Portal Overhaul",
    changes: [
      { type: "improved", text: "Portal overview redesigned — removed stat cards, added Client Portal pre-header, submit request button, deliverables list, and documents section" },
      { type: "improved", text: "Sidebar simplified — removed avatar icon, just shows client name" },
      { type: "improved", text: "Updates tab — 2-column grid layout with video icon for Loom updates" },
      { type: "improved", text: "Scope tab — now shows deliverables with status indicators" },
      { type: "improved", text: "Requests — inline form replaced with popup modal" },
      { type: "improved", text: "Documents — type text labels replaced with icons, preview in popup, downloadable" },
      { type: "improved", text: "Designs — Figma preview with 'Review & Comment in Figma' overlay link" },
      { type: "improved", text: "Reduced corner radius and switched card backgrounds from grey to white" },
      { type: "improved", text: "Portal overview — 'What You're Getting' shows scope items instead of phase-grouped deliverables" },
      { type: "added", text: "Project blocker flags — mark projects as blocked (client/internal/external) with reason and timestamp on admin dashboard" },
      { type: "added", text: "CRO testing section — testing tiers (T1/T2/T3), tests by status (scheduled/live/complete), result tracking with CVR/AOV/RPV snapshots, Figma design previews" },
      { type: "added", text: "Development nav section placeholder" },
      { type: "added", text: "Next Touchpoint card on portal overview" },
    ],
  },
  {
    id: "cl-7",
    date: "17 Mar 2026",
    version: "0.7.0",
    title: "Design System Overhaul & Nav Restructure",
    changes: [
      { type: "improved", text: "De-blued entire UI — replaced all blue-tinted greys with pure neutral greys across 50+ files" },
      { type: "improved", text: "Sidebar restructured — icons on section headers only, cleaner indented sub-items" },
      { type: "improved", text: "Mission Control — removed Overdue section (redundant with Needs Attention), feed contained in scrollable box, Deadlines This Week shows day numbers and task counts" },
      { type: "improved", text: "Portfolio — all Figma embeds preloaded for instant tab switching" },
      { type: "improved", text: "Scrollbars — minimal 2px thin scrollbar globally" },
      { type: "improved", text: "Border radius tightened — rounded-xl to rounded-lg across tool pages" },
      { type: "improved", text: "Nav renamed — Lead Scraper, Audit Engine, Content Engine, Dev Hours Log, Invoice Generator, Project Documents, Client Portals" },
      { type: "removed", text: "Ops Radar removed from sidebar (data folded into Mission Control, page still accessible)" },
      { type: "removed", text: "Outreach removed from sidebar (will be merged into Lead Scraper)" },
    ],
  },
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

// ═══════════════════════════════════════════════════════════════════
// Row mappers
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChangelogRow(row: any): ChangelogEntry {
  return {
    id: row.id,
    date: row.date || "",
    version: row.version || "",
    title: row.title || "",
    changes: row.changes || [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRoadmapRow(row: any): RoadmapItem {
  return {
    id: row.id,
    title: row.title || "",
    description: row.description || "",
    priority: row.priority || "planned",
    addedBy: row.added_by || row.addedBy,
    addedAt: row.added_at || row.addedAt || "",
  };
}

// ── Local helpers ──

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

// ═══════════════════════════════════════════════════════════════════
// Changelog — Read
// ═══════════════════════════════════════════════════════════════════

export async function getChangelog(): Promise<ChangelogEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("changelog")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) return data.map(mapChangelogRow);
    } catch {
      /* fall through to localStorage */
    }
  }
  return ensureSeeded(CHANGELOG_KEY, seedChangelog);
}

// ═══════════════════════════════════════════════════════════════════
// Changelog — Create
// ═══════════════════════════════════════════════════════════════════

export async function addChangelogEntry(
  entry: Omit<ChangelogEntry, "id">
): Promise<ChangelogEntry> {
  const id = `cl-${Date.now()}`;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("changelog")
        .insert({
          id,
          date: entry.date,
          version: entry.version,
          title: entry.title,
          changes: entry.changes,
        })
        .select()
        .single();
      if (error) throw error;
      return mapChangelogRow(data);
    } catch {
      /* fall through */
    }
  }
  const entries = ensureSeeded(CHANGELOG_KEY, seedChangelog);
  const newEntry: ChangelogEntry = { ...entry, id };
  entries.unshift(newEntry);
  localStorage.setItem(CHANGELOG_KEY, JSON.stringify(entries));
  return newEntry;
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Read
// ═══════════════════════════════════════════════════════════════════

export async function getRoadmap(): Promise<RoadmapItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("roadmap")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) return data.map(mapRoadmapRow);
    } catch {
      /* fall through to localStorage */
    }
  }
  return ensureSeeded(ROADMAP_KEY, seedRoadmap);
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Create
// ═══════════════════════════════════════════════════════════════════

export async function addRoadmapItem(
  item: Omit<RoadmapItem, "id" | "addedAt">
): Promise<RoadmapItem> {
  const id = `rm-${Date.now()}`;
  const addedAt = new Date().toISOString().slice(0, 10);

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("roadmap")
        .insert({
          id,
          title: item.title,
          description: item.description,
          priority: item.priority,
          added_by: item.addedBy || null,
          added_at: addedAt,
        })
        .select()
        .single();
      if (error) throw error;
      return mapRoadmapRow(data);
    } catch {
      /* fall through */
    }
  }
  const items = ensureSeeded(ROADMAP_KEY, seedRoadmap);
  const newItem: RoadmapItem = { ...item, id, addedAt };
  items.push(newItem);
  localStorage.setItem(ROADMAP_KEY, JSON.stringify(items));
  return newItem;
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteRoadmapItem(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("roadmap")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return;
    } catch {
      /* fall through */
    }
  }
  const items = ensureSeeded(ROADMAP_KEY, seedRoadmap).filter((i) => i.id !== id);
  localStorage.setItem(ROADMAP_KEY, JSON.stringify(items));
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Update priority
// ═══════════════════════════════════════════════════════════════════

export async function updateRoadmapPriority(
  id: string,
  priority: RoadmapPriority
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("roadmap")
        .update({ priority })
        .eq("id", id);
      if (error) throw error;
      return;
    } catch {
      /* fall through */
    }
  }
  const items = ensureSeeded(ROADMAP_KEY, seedRoadmap);
  const item = items.find((i) => i.id === id);
  if (item) {
    item.priority = priority;
    localStorage.setItem(ROADMAP_KEY, JSON.stringify(items));
  }
}
