import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  PortalData,
  PortalInsert,
  PortalTestResult,
  PortalUpdate,
  PortalUpdateInsert,
  PortalApproval,
  PortalApprovalInsert,
} from "./types";

/* ── Local-storage keys ── */
const LS_PORTALS = "portal-portals";
const LS_UPDATES = "portal-updates";
const LS_APPROVALS = "portal-approvals";

/* ── Demo seed data ── */
// Creates a fully-populated portal for demo / showcase purposes

const DEMO_PHASES = [
  { id: "phase-kickoff", name: "Kickoff", status: "complete" as const, dates: "3 Mar", description: "Discovery call, brand asset collection, and technical requirements documentation", tasks: 3, completed: 3 },
  { id: "phase-design", name: "Design", status: "complete" as const, dates: "4 Mar – 13 Mar", description: "Wireframes and high-fidelity mockups for all key pages including mobile responsive designs", tasks: 5, completed: 5 },
  { id: "phase-revision", name: "Revision", status: "complete" as const, dates: "16 Mar – 19 Mar", description: "Design feedback round and final sign-off before development begins", tasks: 2, completed: 2 },
  { id: "phase-dev", name: "Development", status: "in-progress" as const, dates: "20 Mar – 4 Apr", description: "Full build of all pages, app integrations, and cross-browser quality assurance", tasks: 7, completed: 4 },
  { id: "phase-launch", name: "Launch", status: "upcoming" as const, dates: "7 Apr", description: "DNS configuration, deployment, and post-launch smoke testing", tasks: 2, completed: 0 },
  { id: "phase-support", name: "30-Day Support", status: "upcoming" as const, dates: "7 Apr – 7 May", description: "Ongoing monitoring, bug fixes, and performance support", tasks: 1, completed: 0 },
];

const DEMO_DELIVERABLES = [
  { id: "d-1", name: "Discovery & stakeholder interview", phase: "Kickoff", status: "complete" as const, assignee: "DE" },
  { id: "d-2", name: "Brand asset collection", phase: "Kickoff", status: "complete" as const, assignee: "DE" },
  { id: "d-3", name: "Technical requirements doc", phase: "Kickoff", status: "complete" as const, assignee: "JL" },
  { id: "d-4", name: "Homepage wireframe", phase: "Design", status: "complete" as const, assignee: "AK" },
  { id: "d-5", name: "PDP mockup v1", phase: "Design", status: "complete" as const, assignee: "AK" },
  { id: "d-6", name: "Collection page mockup", phase: "Design", status: "complete" as const, assignee: "AK" },
  { id: "d-7", name: "Landing page mockup", phase: "Design", status: "complete" as const, assignee: "AK" },
  { id: "d-8", name: "Mobile responsive pass", phase: "Design", status: "complete" as const, assignee: "AK" },
  { id: "d-9", name: "Design review & feedback", phase: "Revision", status: "complete" as const, assignee: "DE" },
  { id: "d-10", name: "Final design sign-off", phase: "Revision", status: "complete" as const, assignee: "DE" },
  { id: "d-11", name: "Theme scaffold & config", phase: "Development", status: "complete" as const, assignee: "JL" },
  { id: "d-12", name: "Homepage build", phase: "Development", status: "complete" as const, assignee: "MR" },
  { id: "d-13", name: "PDP build", phase: "Development", status: "complete" as const, assignee: "MR" },
  { id: "d-14", name: "Collection page build", phase: "Development", status: "in-progress" as const, assignee: "JL" },
  { id: "d-15", name: "Landing page build", phase: "Development", status: "in-progress" as const, assignee: "MR" },
  { id: "d-16", name: "App integrations (Klaviyo, Yotpo, Recharge)", phase: "Development", status: "not-started" as const, assignee: "JL" },
  { id: "d-17", name: "Cross-browser QA", phase: "Development", status: "not-started" as const, assignee: "MR" },
  { id: "d-18", name: "DNS & deployment", phase: "Launch", status: "not-started" as const, assignee: "JL" },
  { id: "d-19", name: "Post-launch smoke test", phase: "Launch", status: "not-started" as const, assignee: "MR" },
  { id: "d-20", name: "30-day monitoring & support", phase: "30-Day Support", status: "not-started" as const, assignee: "DE" },
];

const DEMO_SCOPE = [
  "Homepage (custom sections)",
  "Product page (PDP) — performance-first build",
  "Collection page with dynamic filters",
  "Landing page — campaign-ready",
  "Mobile responsive pass across all templates",
  "App integrations (Klaviyo, Yotpo, Recharge)",
  "Cross-browser QA (Chrome, Safari, Firefox, Edge)",
  "Post-launch support (30 days)",
];

const DEMO_DOCUMENTS = [
  { name: "Lumière – Project Roadmap", type: "Roadmap" as const, date: "3 Mar 2026" },
  { name: "Lumière – Scope of Work", type: "Scope" as const, date: "3 Mar 2026" },
  { name: "Lumière – Service Agreement", type: "Agreement" as const, date: "3 Mar 2026" },
  { name: "Lumière – QA Checklist", type: "QA Checklist" as const, date: "20 Mar 2026" },
];

const DEMO_RESULTS: PortalTestResult[] = [
  { id: "test-4", name: "Sticky add-to-cart bar", status: "scheduled", metric: "Conversion rate", week: "W12 — 17 Mar", startDate: "17 Mar" },
  { id: "test-3", name: "Collection page filter position", status: "live", metric: "Collection click-through", cvr: { a: "2.6%", b: "2.9%" }, aov: { a: "$78", b: "$81" }, rpv: { a: "$2.03", b: "$2.35" }, week: "W11 — 10 Mar", startDate: "10 Mar" },
  { id: "test-1", name: "Homepage hero CTA copy test", status: "complete", result: "winner", metric: "Click-through rate", cvr: { a: "2.1%", b: "2.8%" }, aov: { a: "$84", b: "$86" }, rpv: { a: "$1.76", b: "$2.41" }, week: "W10 — 3 Mar", startDate: "5 Mar", endDate: "12 Mar" },
  { id: "test-2", name: "PDP image gallery layout", status: "complete", result: "winner", metric: "Add-to-cart rate", cvr: { a: "3.4%", b: "3.9%" }, aov: { a: "$92", b: "$97" }, rpv: { a: "$3.13", b: "$3.78" }, week: "W9 — 24 Feb", startDate: "28 Feb", endDate: "8 Mar" },
];

const DEMO_WINS = [
  { id: "win-1", title: "Homepage hero CTA uplift", metric: "Click-through rate", before: "2.1%", after: "3.9%", lift: "+85.7%", date: "8 Mar", description: "New CTA copy and button placement drove significantly more clicks from the hero section" },
  { id: "win-2", title: "PDP gallery redesign", metric: "Add-to-cart rate", before: "4.8%", after: "5.4%", lift: "+12.4%", date: "5 Mar", description: "Larger product images with lifestyle shots improved engagement and purchase intent" },
  { id: "win-3", title: "Mobile checkout simplification", metric: "Mobile conversion rate", before: "1.2%", after: "1.8%", lift: "+50.0%", date: "1 Mar", description: "Reduced checkout form fields and added Apple Pay — major mobile conversion jump" },
];

const DEMO_UPDATES = [
  {
    title: "Week 3 update — Development progress",
    description: "Homepage and PDP builds are complete. Starting collection page and landing page this week. App integrations queued for next sprint.",
    loom_url: "https://www.loom.com/share/example-dev-update",
    posted_by: "Dylan",
  },
  {
    title: "Design sign-off complete",
    description: "All mockups approved — moving into development. Final designs for homepage, PDP, collection, and landing page are locked in.",
    loom_url: "https://www.loom.com/share/example-design-signoff",
    posted_by: "Dylan",
  },
  {
    title: "Kickoff recap & next steps",
    description: "Great kickoff call! Brand assets received, technical requirements documented. Design phase begins Monday — expect wireframes by end of week.",
    loom_url: "https://www.loom.com/share/example-kickoff-recap",
    posted_by: "Dylan",
  },
];

export async function seedDemoPortal(): Promise<PortalData> {
  const portal = await createPortal({
    client_name: "Lumière Skincare",
    client_email: "sarah@lumiere-skin.com",
    project_type: "Full Page Build + CRO Retainer",
    current_phase: "Development",
    progress: 58,
    next_touchpoint: {
      date: "14 Mar",
      description: "Development progress review — homepage & PDP preview ready for walkthrough",
    },
    phases: DEMO_PHASES,
    scope: DEMO_SCOPE,
    deliverables: DEMO_DELIVERABLES,
    documents: DEMO_DOCUMENTS,
    results: DEMO_RESULTS,
    testing_tier: "T2",
    wins: DEMO_WINS,
    show_results: true,
    slack_channel_url: "",
    ad_hoc_requests: [],
  });

  // Seed demo updates (Loom videos) with staggered dates
  const now = Date.now();
  for (let i = 0; i < DEMO_UPDATES.length; i++) {
    const update = DEMO_UPDATES[i];
    const createdAt = new Date(now - i * 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week apart
    const id = uid();
    const row = {
      id,
      portal_id: portal.id,
      title: update.title,
      description: update.description,
      loom_url: update.loom_url,
      posted_by: update.posted_by,
      created_at: createdAt,
    };

    let saved = false;
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("portal_updates").insert(row);
        if (error) throw error;
        saved = true;
      } catch {
        // ignore
      }
    }
    if (!saved) {
      const stored = localStorage.getItem(LS_UPDATES);
      const all: PortalUpdate[] = stored ? JSON.parse(stored) : [];
      all.unshift(row);
      localStorage.setItem(LS_UPDATES, JSON.stringify(all));
    }
  }

  return portal;
}

function uid(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════════
// Portals
// ═══════════════════════════════════════════════════════════════════

export async function getPortals(): Promise<PortalData[]> {
  // Read all localStorage portals (overrides + locally-created portals)
  let lsPortals: PortalData[] = [];
  const lsOverrides: Record<string, Partial<PortalData>> = {};
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(LS_PORTALS);
    if (stored) {
      lsPortals = JSON.parse(stored);
      for (const p of lsPortals) {
        const overrides: Partial<PortalData> = {};
        if (p.blocker) overrides.blocker = p.blocker;
        if (p.results) overrides.results = migrateTestResults(p.results);
        if (p.testing_tier) overrides.testing_tier = p.testing_tier;
        if (Object.keys(overrides).length > 0) lsOverrides[p.id] = overrides;
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("client_portals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const supabaseIds = new Set((data ?? []).map((r) => r.id));
      const supabasePortals = (data ?? []).map((row) => {
        const portal = mapPortalRow(row);
        // Merge localStorage overrides
        const overrides = lsOverrides[portal.id];
        if (overrides) Object.assign(portal, overrides);
        return portal;
      });
      // Include localStorage-only portals (not in Supabase)
      const localOnly = lsPortals.filter((p) => !supabaseIds.has(p.id));
      return [...localOnly, ...supabasePortals];
    } catch {
      // fall through to localStorage
    }
  }
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LS_PORTALS);
  return stored ? JSON.parse(stored) : [];
}

export async function getPortalById(id: string): Promise<PortalData | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("client_portals")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      if (data) {
        const portal = mapPortalRow(data);
        // Merge localStorage overrides (blocker, etc.)
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(LS_PORTALS);
          if (stored) {
            const lsPortal = (JSON.parse(stored) as PortalData[]).find((p) => p.id === id);
            if (lsPortal?.blocker) portal.blocker = lsPortal.blocker;
            if (lsPortal?.results) portal.results = migrateTestResults(lsPortal.results);
            if (lsPortal?.testing_tier) portal.testing_tier = lsPortal.testing_tier;
          }
        }
        return portal;
      }
    } catch {
      // fall through to localStorage
    }
  }
  // Check localStorage (fallback or localStorage-only portals)
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(LS_PORTALS);
  if (stored) {
    const found = (JSON.parse(stored) as PortalData[]).find((p) => p.id === id);
    if (found) return found;
  }
  return null;
}

export async function getPortalByToken(token: string): Promise<PortalData | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("client_portals")
        .select("*")
        .eq("token", token)
        .single();
      if (error) throw error;
      if (data) {
        const portal = mapPortalRow(data);
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(LS_PORTALS);
          if (stored) {
            const lsPortal = (JSON.parse(stored) as PortalData[]).find((p) => p.token === token);
            if (lsPortal?.blocker) portal.blocker = lsPortal.blocker;
            if (lsPortal?.results) portal.results = migrateTestResults(lsPortal.results);
            if (lsPortal?.testing_tier) portal.testing_tier = lsPortal.testing_tier;
          }
        }
        return portal;
      }
      return null;
    } catch {
      // fall through to localStorage
    }
  }
  if (typeof window === "undefined") return null;
  const all = await getPortals();
  return all.find((p) => p.token === token) ?? null;
}

export async function createPortal(input: PortalInsert): Promise<PortalData> {
  const now = new Date().toISOString();
  const token = uid();
  const id = uid();

  const row = {
    id,
    token,
    client_name: input.client_name,
    client_email: input.client_email || "",
    project_type: input.project_type || "",
    current_phase: input.current_phase || "",
    progress: input.progress || 0,
    next_touchpoint: input.next_touchpoint || {},
    phases: input.phases || [],
    scope: input.scope || [],
    deliverables: input.deliverables || [],
    documents: input.documents || [],
    results: input.results || [],
    wins: input.wins || [],
    show_results: input.show_results ?? false,
    slack_channel_url: input.slack_channel_url || "",
    ad_hoc_requests: input.ad_hoc_requests || [],
    created_at: now,
    updated_at: now,
    view_count: 0,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("client_portals")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapPortalRow(data);
    } catch {
      // fall through to localStorage
    }
  }
  const portal = row as PortalData;
  const existing = await getPortals();
  existing.unshift(portal);
  localStorage.setItem(LS_PORTALS, JSON.stringify(existing));
  return portal;
}

export async function updatePortal(
  id: string,
  updates: Partial<PortalInsert>
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("client_portals")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    } catch {
      // Supabase failed — localStorage below will handle it
    }
  }
  // Always update localStorage to keep it in sync
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(LS_PORTALS);
    const all: PortalData[] = stored ? JSON.parse(stored) : [];
    const updated = all.map((p) =>
      p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
    );
    localStorage.setItem(LS_PORTALS, JSON.stringify(updated));
  }
}

export async function deletePortal(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("client_portals")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return;
    } catch {
      // fall through to localStorage
    }
  }
  const all = await getPortals();
  localStorage.setItem(LS_PORTALS, JSON.stringify(all.filter((p) => p.id !== id)));
}

export async function incrementViewCount(token: string): Promise<void> {
  try {
    // Use RPC or raw update — increment atomically
    const { data } = await supabase
      .from("client_portals")
      .select("view_count")
      .eq("token", token)
      .single();
    if (data) {
      await supabase
        .from("client_portals")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("token", token);
    }
  } catch {
    // Silent fail for view counting
  }
}

/* ── Migrate old test results format to new ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateTestResults(results: any[]): PortalTestResult[] {
  return results.map((r, i) => {
    const base = { ...r, id: r.id || `test-${i}`, week: r.week || "" };
    // Already new format
    if (r.status === "live" || r.status === "scheduled" || r.status === "complete") {
      return base;
    }
    // Old format migration
    if (r.status === "running") return { ...base, status: "live" as const };
    if (r.status === "winner") return { ...base, status: "complete" as const, result: "winner" as const };
    if (r.status === "loser") return { ...base, status: "complete" as const, result: "loser" as const };
    return base;
  });
}

/* ── Map Supabase row to PortalData ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPortalRow(row: any): PortalData {
  return {
    id: row.id,
    token: row.token,
    client_name: row.client_name || "",
    client_email: row.client_email || "",
    project_type: row.project_type || "",
    current_phase: row.current_phase || "",
    progress: row.progress || 0,
    next_touchpoint: row.next_touchpoint || { date: "", description: "" },
    phases: row.phases || [],
    scope: row.scope || [],
    deliverables: row.deliverables || [],
    documents: row.documents || [],
    results: migrateTestResults(row.results || []),
    testing_tier: row.testing_tier || null,
    wins: row.wins || [],
    show_results: row.show_results ?? false,
    slack_channel_url: row.slack_channel_url || "",
    ad_hoc_requests: row.ad_hoc_requests || [],
    blocker: row.blocker || null,
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
    view_count: row.view_count || 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Updates (Loom videos)
// ═══════════════════════════════════════════════════════════════════

export async function getUpdates(portalId: string): Promise<PortalUpdate[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("portal_updates")
        .select("*")
        .eq("portal_id", portalId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    } catch {
      // fall through to localStorage
    }
  }
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LS_UPDATES);
  const all: PortalUpdate[] = stored ? JSON.parse(stored) : [];
  return all.filter((u) => u.portal_id === portalId);
}

export async function addUpdate(input: PortalUpdateInsert): Promise<PortalUpdate> {
  const id = uid();
  const now = new Date().toISOString();
  const row = { ...input, id, created_at: now };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("portal_updates")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      // fall through to localStorage
    }
  }
  const stored = localStorage.getItem(LS_UPDATES);
  const all: PortalUpdate[] = stored ? JSON.parse(stored) : [];
  all.unshift(row);
  localStorage.setItem(LS_UPDATES, JSON.stringify(all));
  return row;
}

// ═══════════════════════════════════════════════════════════════════
// Approvals
// ═══════════════════════════════════════════════════════════════════

export async function getApprovals(portalId: string): Promise<PortalApproval[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("portal_approvals")
        .select("*")
        .eq("portal_id", portalId)
        .order("approved_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    } catch {
      // fall through to localStorage
    }
  }
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LS_APPROVALS);
  const all: PortalApproval[] = stored ? JSON.parse(stored) : [];
  return all.filter((a) => a.portal_id === portalId);
}

export async function addApproval(input: PortalApprovalInsert): Promise<PortalApproval> {
  const id = uid();
  const now = new Date().toISOString();
  const row: PortalApproval = { ...input, id, approved_at: now };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("portal_approvals")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      // fall through to localStorage
    }
  }
  const stored = localStorage.getItem(LS_APPROVALS);
  const all: PortalApproval[] = stored ? JSON.parse(stored) : [];
  all.unshift(row);
  localStorage.setItem(LS_APPROVALS, JSON.stringify(all));
  return row;
}
