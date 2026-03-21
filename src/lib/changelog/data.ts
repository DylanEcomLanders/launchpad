/* ── Changelog & Roadmap data layer (Supabase + localStorage fallback) ── */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { createStore } from "@/lib/supabase-store";

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
    id: "cl-14",
    date: "21 Mar 2026",
    version: "0.13.0",
    title: "Sales Engine — Separate Growth Dashboard",
    changes: [
      { type: "added", text: "Sales Engine: new dashboard at /sales-engine with own sidebar and layout" },
      { type: "added", text: "App switcher in both sidebars to toggle between Launchpad and Sales Engine" },
      { type: "added", text: "Pipeline CRM: Kanban board with drag-and-drop deal management (lead → won)" },
      { type: "added", text: "Content Calendar: plan, draft, schedule content with board view and account filtering (Dylan/Ajay)" },
      { type: "added", text: "Migrated tools: Content Engine, Hooks, Repurpose, Leads, Outreach, Revenue, Audit Engine, Portfolio, Price Lists" },
      { type: "added", text: "Command Centre dashboard with pipeline value, content stats, follow-up tracking" },
      { type: "added", text: "Deal form with stage, value, owner, source, follow-up date, notes" },
      { type: "added", text: "Content form with platform, account, funnel stage, schedule date, body editor" },
    ],
  },
  {
    id: "cl-13",
    date: "20 Mar 2026",
    version: "0.12.0",
    title: "Retainer vs Project Portal Modes",
    changes: [
      { type: "added", text: "Two portal modes: Retainer Client (weekly test cycle) and Project Client (linear page build)" },
      { type: "added", text: "New portal creation flow — two-card selection for client type with tailored fields" },
      { type: "added", text: "Retainer creation includes testing tier (T1/T2/T3) and optional Intelligems API key" },
      { type: "added", text: "client_type field on PortalData — drives entire portal UX (retainer vs regular)" },
      { type: "added", text: "Auto-migration for existing portals — detects retainer from project_type" },
      { type: "improved", text: "Admin portal default tab is Testing for retainer clients, Overview for project clients" },
      { type: "improved", text: "Tab order adapts to client type — Testing first for retainers" },
      { type: "improved", text: "Client portal sidebar adapts — retainers see Testing instead of Timeline" },
      { type: "improved", text: "Portal cards show Retainer/Project badge with client type" },
      { type: "fixed", text: "Changelog entries now auto-merge from seed data into localStorage" },
    ],
  },
  {
    id: "cl-12",
    date: "20 Mar 2026",
    version: "0.11.0",
    title: "Multi-Project Portals & Client Evolution",
    changes: [
      { type: "added", text: "Multi-project per client — one portal holds all work (page builds, retainers, audits)" },
      { type: "added", text: "PortalProject type with per-project phases, scope, deliverables, documents" },
      { type: "added", text: "Project selector pills in admin portal — switch between projects for the same client" },
      { type: "added", text: "Add Project modal — create page builds or retainers within an existing portal" },
      { type: "added", text: "Retainer view — weekly test cadence with tier selector (replaces linear timeline)" },
      { type: "added", text: "Client portal project selector — clients with 2+ projects can switch between them" },
      { type: "added", text: "Funnels tab in admin portal — view/create funnels linked to client" },
      { type: "added", text: "Funnels tab in client portal — read-only view of funnel nodes" },
      { type: "added", text: "Auto-migration — legacy single-project portals automatically get projects[0] on load" },
      { type: "improved", text: "Testing tab dashboard redesign — card layout with big RPV lift numbers instead of dense table" },
      { type: "improved", text: "Results summary — winners/underperformed/inconclusive as big number cards" },
      { type: "improved", text: "Client dashboard adapts per project type (retainer shows test stats, build shows progress)" },
    ],
  },
  {
    id: "cl-11",
    date: "19 Mar 2026",
    version: "0.10.0",
    title: "Intelligems Integration & Portal Improvements",
    changes: [
      { type: "added", text: "Intelligems API integration — auto-pulls live A/B test data (CVR, AOV, RPV, visitors, orders, revenue) per client" },
      { type: "added", text: "API proxy route for secure Intelligems data fetching from client portals" },
      { type: "added", text: "Intelligems API key field per portal in admin Testing tab" },
      { type: "added", text: "Live test cards with variation metrics table, lift indicators, and baseline comparisons" },
      { type: "added", text: "Portal soft-delete with trash bin — deleted portals recoverable for 30 days" },
      { type: "added", text: "Two-step delete confirmation on portal cards" },
      { type: "added", text: "Designs tab always visible in client portal with placeholder state" },
      { type: "improved", text: "Development tab — page reviews with staging URLs, version tracking, and inline feedback" },
      { type: "improved", text: "Scope tab shows deliverable type alongside description" },
      { type: "added", text: "Intelligems cherry-pick — select which tests are yours, only selected show in client portal" },
      { type: "improved", text: "Client Development tab — clean version-controlled staging links with Review Page buttons, no iframe" },
      { type: "fixed", text: "Page reviews not appearing after creation — activeReviewId sync issue" },
      { type: "fixed", text: "Deleted portals reappearing — now uses Supabase soft-delete with deleted_at column" },
      { type: "added", text: "Page Copy Audit tool — paste brief + screenshots, AI analyses copy section by section against DTC framework with VOC research" },
      { type: "added", text: "DTC Copywriting Guide training data — 7-part framework covering mindset, tone, page architecture, trust building, advanced techniques" },
      { type: "added", text: "Figma API + Claude Vision integration for reading page designs" },
      { type: "added", text: "VOC scraping — Trustpilot + Reddit research with brief-aware product filtering" },
      { type: "added", text: "Clipboard paste support (Cmd+V) for screenshots in copy audit" },
      { type: "improved", text: "Copy audit output is suggestive not prescriptive — explains why copy is weak and gives directional guidance" },
      { type: "improved", text: "Brief-first workflow — must lock brief before analysing, AI respects multi-angle vs single-angle briefs" },
      { type: "improved", text: "Team Hub promoted to top-level nav below Mission Control" },
      { type: "improved", text: "Admin Development tab simplified to clean version control (no iframe/pin viewer)" },
      { type: "added", text: "Business Settings page — configurable deliverable turnaround times, revision/support durations, working days" },
      { type: "added", text: "Centralised date helpers in src/lib/dates.ts — all tools now share addBusinessDays with configurable working days" },
      { type: "improved", text: "Sidebar version bumped to v0.10" },
      { type: "improved", text: "Copy Checker rebuild — replaced subjective 1-10 scoring with flag-based system (red flags, warnings, passing)" },
      { type: "added", text: "Banned phrase detection — hardcoded list of weak DTC phrases auto-flagged as red flags" },
      { type: "added", text: "Structural checklists per section type — Hero, Benefits, Trust, CTA, FAQ" },
      { type: "added", text: "VOC gaps panel — shows customer language not used on the page" },
      { type: "improved", text: "Chat refocused as senior CRO advisor for nuanced creative guidance" },
      { type: "fixed", text: "Design review V1 auto-loads after creation (no more create V1 prompt)" },
      { type: "fixed", text: "Intelligems now fetches ALL tests in parallel batches (was capped/sequential)" },
      { type: "removed", text: "Wins tab removed from client portal" },
      { type: "added", text: "Phase dates editable via date pickers in admin portal" },
      { type: "added", text: "startDate/endDate fields on PortalPhase type" },
    ],
  },
  {
    id: "cl-10",
    date: "18 Mar 2026",
    version: "0.9.0",
    title: "Funnel Builder, Business Settings & Full Supabase Migration",
    changes: [
      { type: "added", text: "Visual Funnel Builder — drag-and-drop e-commerce funnel mapping with React Flow canvas, custom traffic/page nodes, arrow connections" },
      { type: "added", text: "4 funnel templates — Standard DTC, Quiz Funnel, Advertorial, Organic Content" },
      { type: "added", text: "Funnel performance mode — overlay traffic, CVR, AOV, drop-off metrics on each node with colour-coded indicators" },
      { type: "added", text: "Traffic warmth selector — tag traffic sources as Cold/Warm/Hot with colour badges" },
      { type: "added", text: "Ad preview + page URL links on funnel nodes — clickable links to view ad creatives or live pages" },
      { type: "added", text: "Undo/redo in Funnel Builder — Cmd+Z / Cmd+Shift+Z with 50-level history" },
      { type: "added", text: "PNG export for funnels" },
      { type: "added", text: "Business Settings page — configurable deliverable turnaround times, revision/support phase durations, working day toggles" },
      { type: "added", text: "Centralised date helpers — all date formatting and business day logic in one module" },
      { type: "improved", text: "Full Supabase migration — all data layers now persist to Supabase with localStorage fallback (prospects, roadmap, portfolio, settings, pulse, content DB, feedback, outreach, funnels)" },
      { type: "improved", text: "Generic supabase-store helper for consistent data persistence pattern" },
      { type: "improved", text: "Funnel node cards restyled — more spacious, separated header bar, hover shadows, pill-style preview links" },
      { type: "improved", text: "Ecomlanders logomark favicon" },
    ],
  },
  {
    id: "cl-9",
    date: "18 Mar 2026",
    version: "0.8.1",
    title: "Project Kickoff → Portal Pipeline & Data Persistence",
    changes: [
      { type: "added", text: "Project Kickoff now creates a client portal — one-click 'Create Client Portal' button auto-populates phases, scope, documents, and touchpoints from the kickoff form" },
      { type: "added", text: "CRO test results — A/B testing with week-based grouping, CVR/AOV/RPV snapshots with % lift indicators, Figma design preview popups" },
      { type: "improved", text: "Current phase synced with timeline — admin uses dropdown selector from phases, auto-updates when phase status changes" },
      { type: "improved", text: "Client portal timeline — complete phase tags now green, online/offline indicator green/red" },
      { type: "improved", text: "Touchpoint date format — shows '19 Mar' instead of ISO dates" },
      { type: "fixed", text: "Supabase data persistence — added missing wins, testing_tier, blocker columns. Portals now persist across all browsers and devices" },
      { type: "fixed", text: "localStorage-only portals now visible in portal list even when Supabase is configured" },
      { type: "removed", text: "Removed 'What You're Getting' scope box from client dashboard" },
      { type: "improved", text: "Renamed 'Project Documents' to 'Project Kickoff' in sidebar" },
    ],
  },
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
// Roadmap store (data jsonb pattern)
// ═══════════════════════════════════════════════════════════════════

const roadmapStore = createStore<RoadmapItem>({
  table: "roadmap_items",
  lsKey: ROADMAP_KEY,
});

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

// ── Local helpers ──

function ensureSeeded<T extends { id: string }>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    const stored = JSON.parse(raw) as T[];
    // Merge any new seed entries not already in localStorage
    const storedIds = new Set(stored.map((s) => s.id));
    const newEntries = seed.filter((s) => !storedIds.has(s.id));
    if (newEntries.length > 0) {
      const merged = [...newEntries, ...stored];
      localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    }
    return stored;
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
  const items = await roadmapStore.getAll();
  if (items.length > 0) return items;
  // Seed if empty
  await roadmapStore.saveAll(seedRoadmap);
  return seedRoadmap;
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Create
// ═══════════════════════════════════════════════════════════════════

export async function addRoadmapItem(
  item: Omit<RoadmapItem, "id" | "addedAt">
): Promise<RoadmapItem> {
  const newItem: RoadmapItem = {
    ...item,
    id: `rm-${Date.now()}`,
    addedAt: new Date().toISOString().slice(0, 10),
  };
  return roadmapStore.create(newItem);
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteRoadmapItem(id: string): Promise<void> {
  await roadmapStore.remove(id);
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Update priority
// ═══════════════════════════════════════════════════════════════════

export async function updateRoadmapPriority(
  id: string,
  priority: RoadmapPriority
): Promise<void> {
  await roadmapStore.update(id, { priority } as Partial<RoadmapItem>);
}
