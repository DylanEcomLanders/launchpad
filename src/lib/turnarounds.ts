/* ── Turnaround Times ──
 * Canonical source of truth for every deliverable we sell.
 *
 *   Internal target  — what the team is actually working to.
 *   Client-quoted    — internal target + buffer, rounded up to the nearest business day.
 *
 * The internal number must NEVER reach a client. Anywhere a client sees a
 * turnaround (price calculator, offers page, proposals, agreements), pull
 * it through `getClientQuotedDays` / `getClientQuotedForId`.
 */

export type TurnaroundCategory =
  | "Builds"
  | "Audits"
  | "Phases"
  | "Revisions";

export interface TurnaroundDeliverable {
  id: string;
  name: string;
  category: TurnaroundCategory;
  /** Internal target in business days. Never expose to clients. */
  internalDays: number;
  /** Caveats / preconditions for the quoted timeline. */
  notes?: string;
}

export interface TurnaroundConfig {
  /** Buffer added on top of internal target, e.g. 30 = 30%. */
  bufferPercent: number;
  deliverables: TurnaroundDeliverable[];
}

export const DEFAULT_BUFFER_PERCENT = 30;

export const DEFAULT_DELIVERABLES: TurnaroundDeliverable[] = [
  {
    id: "frame-page",
    name: "Frame page (design + dev)",
    category: "Builds",
    internalDays: 5,
    notes: "Assumes copy + assets provided day 1.",
  },
  {
    id: "pdp-build",
    name: "PDP build",
    category: "Builds",
    internalDays: 8,
    notes: "Assumes product copy, imagery, and Shopify access on kickoff.",
  },
  {
    id: "cart-build",
    name: "Cart build",
    category: "Builds",
    internalDays: 4,
    notes: "Standard cart drawer / cart page; upsell logic adds time.",
  },
  {
    id: "full-funnel-build",
    name: "Full funnel build",
    category: "Builds",
    internalDays: 15,
    notes: "PDP + cart + checkout + 1 supporting page. Assets day 1.",
  },
  {
    id: "single-section-design",
    name: "Single section (design only)",
    category: "Builds",
    internalDays: 1,
    notes: "1 section, 1 round of feedback.",
  },
  {
    id: "single-section-design-dev",
    name: "Single section (design + dev)",
    category: "Builds",
    internalDays: 2,
    notes: "1 section, 1 round of feedback, deployed to theme.",
  },
  {
    id: "cro-audit",
    name: "CRO audit",
    category: "Audits",
    internalDays: 5,
    notes: "Site access + GA / heatmap data granted day 1.",
  },
  {
    id: "discovery-phase",
    name: "Discovery phase",
    category: "Phases",
    internalDays: 7,
    notes: "Stakeholder interviews booked in week 1.",
  },
  {
    id: "test-build-retainer",
    name: "Test build (within retainer)",
    category: "Builds",
    internalDays: 3,
    notes: "Hypothesis approved before build kicks off.",
  },
  {
    id: "strategic-review",
    name: "Strategic review deliverables",
    category: "Phases",
    internalDays: 5,
    notes: "Includes prioritised roadmap + walkthrough doc.",
  },
  {
    id: "revisions-r1",
    name: "Revisions — Round 1",
    category: "Revisions",
    internalDays: 2,
    notes: "Consolidated feedback delivered in a single thread.",
  },
  {
    id: "revisions-r2",
    name: "Revisions — Round 2",
    category: "Revisions",
    internalDays: 1,
    notes: "Final pass. Anything beyond is out of scope.",
  },
];

export const DEFAULT_TURNAROUND_CONFIG: TurnaroundConfig = {
  bufferPercent: DEFAULT_BUFFER_PERCENT,
  deliverables: DEFAULT_DELIVERABLES,
};

/* ── Pure helpers (safe to call from anywhere) ────────────────────────── */

/** Buffer in business days, rounded up. */
export function getBufferDays(internalDays: number, bufferPercent: number): number {
  if (internalDays <= 0 || bufferPercent <= 0) return 0;
  return Math.ceil((internalDays * bufferPercent) / 100);
}

/** Total business days quoted to a client. Always use this externally. */
export function getClientQuotedDays(internalDays: number, bufferPercent: number): number {
  return internalDays + getBufferDays(internalDays, bufferPercent);
}

/** Shortcut: client-quoted days for a known deliverable id. */
export function getClientQuotedForId(
  id: string,
  config: TurnaroundConfig = DEFAULT_TURNAROUND_CONFIG,
): number | null {
  const d = config.deliverables.find((x) => x.id === id);
  if (!d) return null;
  return getClientQuotedDays(d.internalDays, config.bufferPercent);
}

/* ── Persistence (localStorage; promote to Supabase if needed later) ───── */

const LS_KEY = "launchpad-turnarounds";

export function loadTurnaroundConfig(): TurnaroundConfig {
  if (typeof window === "undefined") return DEFAULT_TURNAROUND_CONFIG;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_TURNAROUND_CONFIG;
    const parsed = JSON.parse(raw) as Partial<TurnaroundConfig>;
    return {
      bufferPercent: parsed.bufferPercent ?? DEFAULT_BUFFER_PERCENT,
      deliverables: parsed.deliverables?.length ? parsed.deliverables : DEFAULT_DELIVERABLES,
    };
  } catch {
    return DEFAULT_TURNAROUND_CONFIG;
  }
}

export function saveTurnaroundConfig(config: TurnaroundConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
  } catch {
    /* storage full — ignore */
  }
}
