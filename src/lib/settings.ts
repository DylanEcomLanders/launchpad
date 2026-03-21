/* ── Business Settings ──
 * Configurable values that drive project timelines, deliverable estimates,
 * and working day calculations. Uses Supabase (data jsonb) + localStorage fallback.
 */

import { createStore } from "@/lib/supabase-store";

const LS_KEY = "launchpad-business-settings";
const SETTINGS_ID = "business-settings-singleton";

export interface TeamMember {
  id: string;
  name: string;
  role: string; // e.g. "Developer", "Designer", "CRO Strategist"
  email: string;
  slack_id: string; // Slack user ID (U0XXXXXXX)
  clickup_id: string; // ClickUp user ID
  avatar_url?: string;
}

export interface DeliverableEstimate {
  name: string;
  designDays: number;
  devDays: number;
}

export interface BusinessSettings {
  /* Team directory */
  team: TeamMember[];

  /* Deliverable turnaround times */
  deliverableEstimates: DeliverableEstimate[];

  /* Phase durations */
  revisionDays: number; // business days for revision phase
  supportDays: number; // calendar days for post-launch support

  /* Working days (true = working day) */
  workingDays: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  };
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  team: [],
  deliverableEstimates: [
    { name: "PDP (Product Page)", designDays: 4, devDays: 4 },
    { name: "Collection Page", designDays: 2, devDays: 2 },
    { name: "Landing Page", designDays: 4, devDays: 4 },
    { name: "Homepage", designDays: 4, devDays: 4 },
    { name: "Advertorial", designDays: 2, devDays: 2 },
    { name: "About / Header / Blog", designDays: 1, devDays: 1 },
  ],
  revisionDays: 4,
  supportDays: 30,
  workingDays: {
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  },
};

/* ── Store instance (data jsonb pattern) ── */
const store = createStore<BusinessSettings & { id: string }>({
  table: "business_settings",
  lsKey: LS_KEY,
});

/**
 * Synchronous read — returns from localStorage cache.
 * Call `loadSettings()` once on mount to hydrate from Supabase.
 */
export function getSettings(): BusinessSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const stored = localStorage.getItem(LS_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(stored);
    // Handle both array (store format) and direct object (legacy format)
    if (Array.isArray(parsed)) {
      const item = parsed.find((i: { id: string }) => i.id === SETTINGS_ID);
      if (item) {
        const { id: _id, ...settings } = item;
        return { ...DEFAULT_SETTINGS, ...settings };
      }
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Async load — fetches from Supabase and caches to localStorage.
 * Call once on app/page mount.
 */
export async function loadSettings(): Promise<BusinessSettings> {
  // Try Supabase first
  try {
    const items = await store.getAll();
    const item = items.find((i) => i.id === SETTINGS_ID);
    if (item) {
      const { id: _id, ...settings } = item;
      const merged = { ...DEFAULT_SETTINGS, ...settings };
      // Also update localStorage so getSettings() sync reads work
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_KEY, JSON.stringify([{ ...merged, id: SETTINGS_ID }]));
      }
      return merged;
    }
  } catch {
    /* fall through to sync */
  }
  // Fall back to localStorage
  return getSettings();
}

/**
 * Save settings — writes to both Supabase and localStorage.
 */
export async function saveSettings(settings: BusinessSettings): Promise<void> {
  // Save to localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify([{ ...settings, id: SETTINGS_ID }]));
  }
  // Save to Supabase directly (business_settings uses updated_at not created_at)
  try {
    const { isSupabaseConfigured, supabase } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      const { id: _id, ...rest } = { ...settings, id: SETTINGS_ID };
      await supabase.from("business_settings").upsert({
        id: SETTINGS_ID,
        data: rest,
        updated_at: new Date().toISOString(),
      });
    }
  } catch { /* localStorage fallback */ }
}

/** Convert settings.deliverableEstimates to the Record format used by config.ts */
export function getDeliverableTimeEstimates(
  settings?: BusinessSettings
): Record<string, { designDays: number; devDays: number }> {
  const s = settings || getSettings();
  const map: Record<string, { designDays: number; devDays: number }> = {};
  for (const d of s.deliverableEstimates) {
    map[d.name] = { designDays: d.designDays, devDays: d.devDays };
  }
  return map;
}

/** Get working day numbers (0=Sun, 6=Sat) from settings */
export function getWorkingDayNumbers(settings?: BusinessSettings): Set<number> {
  const s = settings || getSettings();
  const days = new Set<number>();
  if (s.workingDays.sun) days.add(0);
  if (s.workingDays.mon) days.add(1);
  if (s.workingDays.tue) days.add(2);
  if (s.workingDays.wed) days.add(3);
  if (s.workingDays.thu) days.add(4);
  if (s.workingDays.fri) days.add(5);
  if (s.workingDays.sat) days.add(6);
  return days;
}

/** Get team members */
export function getTeam(settings?: BusinessSettings): TeamMember[] {
  const s = settings || getSettings();
  return s.team || [];
}

/** Find team member by ClickUp ID */
export function getTeamMemberByClickupId(clickupId: string, settings?: BusinessSettings): TeamMember | undefined {
  return getTeam(settings).find((m) => m.clickup_id === clickupId);
}

/** Find team member by Slack ID */
export function getTeamMemberBySlackId(slackId: string, settings?: BusinessSettings): TeamMember | undefined {
  return getTeam(settings).find((m) => m.slack_id === slackId);
}
