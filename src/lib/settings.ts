/* ── Business Settings ──
 * Configurable values that drive project timelines, deliverable estimates,
 * and working day calculations. Stored in localStorage (Supabase later).
 */

const LS_KEY = "launchpad-business-settings";

export interface DeliverableEstimate {
  name: string;
  designDays: number;
  devDays: number;
}

export interface BusinessSettings {
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

export function getSettings(): BusinessSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const stored = localStorage.getItem(LS_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: BusinessSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
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
