/* ── Results Engine data layer ──
 * The single source of truth for tests + surfaces (createStore: Supabase +
 * localStorage fallback, so it works locally before migration 055 is pasted).
 * Domain helpers enforce the brief's invariants in code, since the blob-store
 * schema can't express them as CHECKs:
 *   §6 hard gate — a test can't be `won` without a recorded declaration.
 *   §7 two faces — publishing to the client is an explicit, curated action.
 */

import { createStore } from "@/lib/supabase-store";
import type { ResultsSurface, Test, TestStatus, TestOutcome } from "./types";

const surfaceStore = createStore<ResultsSurface>({
  table: "results_surfaces",
  lsKey: "launchpad-results-surfaces",
});
const testStore = createStore<Test>({ table: "tests", lsKey: "launchpad-tests" });

function nowISO(): string {
  return new Date().toISOString();
}

/* ── Seed ──
 * A few realistic surfaces + tests tied to live mock projects (pdp-build /
 * full-site / hero-refresh) so the Results Engine renders before the seam is
 * wired to real launches. Seeded once when both stores are empty; editable and
 * deletable like anything else. Replaced by real seam-created surfaces later. */
const SEED_NOW = "2026-07-05T09:00:00Z";
const SEED_SURFACES: ResultsSurface[] = [
  {
    id: "surface-harvestory-pdp",
    projectId: "pdp-build",
    sourceTaskId: "h-live1",
    title: "PDP",
    liveUrl: "https://harvestory.com/products/daily-greens",
    controlBenchmark: { CVR: 3.1, AOV: 148, RPV: 4.59 },
    status: "active",
    created_at: SEED_NOW,
    updated_at: SEED_NOW,
  },
  {
    id: "surface-ironpaws-home",
    projectId: "full-site",
    sourceTaskId: "i1",
    title: "Homepage",
    liveUrl: "https://ironpaws.com",
    controlBenchmark: { CVR: 2.4, AOV: 96 },
    status: "active",
    created_at: SEED_NOW,
    updated_at: SEED_NOW,
  },
  {
    id: "surface-acme-hero",
    projectId: "hero-refresh",
    sourceTaskId: "a1",
    title: "Hero",
    liveUrl: "https://acmeskincare.com",
    controlBenchmark: { CVR: 1.9, AOV: 172 },
    status: "active",
    created_at: SEED_NOW,
    updated_at: SEED_NOW,
  },
];
const SEED_TESTS: Test[] = [
  {
    id: "test-h-hero-cta", surfaceId: "surface-harvestory-pdp", status: "won",
    hypothesis: "A benefit-led hero CTA (\"Feel the difference\") beats the generic \"Shop now\".",
    variantDesc: "Benefit-led CTA copy + sticky ATC on mobile", primaryMetric: "Add-to-cart rate",
    upliftPct: 8, significanceReachedPct: 96, outcome: "winner",
    declaredBy: "Aanchal", declaredAt: "2026-06-09T10:00:00Z",
    winEvidence: { what: "Add-to-cart rate", magnitude: "+8% (mobile +12%)", link: "https://harvestory.com/?cta=v2" },
    concludedAt: "2026-06-09",
    clientPublished: true, clientSummary: "Testing a clearer, benefit-led call-to-action on the product page.",
    clientResult: "The new wording lifted add-to-cart by 8% — now live for everyone.",
    created_at: SEED_NOW, updated_at: SEED_NOW,
  },
  {
    id: "test-h-bundle", surfaceId: "surface-harvestory-pdp", status: "reading",
    hypothesis: "Inline bundle cards convert better than the dropdown picker.",
    variantDesc: "Inline bundle selector", primaryMetric: "CVR", startedAt: "2026-06-20",
    significanceReachedPct: 88, clientPublished: false,
    created_at: SEED_NOW, updated_at: SEED_NOW,
  },
  {
    id: "test-h-reviews", surfaceId: "surface-harvestory-pdp", status: "backlog",
    hypothesis: "Moving reviews above the fold builds trust earlier and lifts CVR.",
    primaryMetric: "CVR", clientPublished: false,
    created_at: SEED_NOW, updated_at: SEED_NOW,
  },
  {
    id: "test-i-home-hero", surfaceId: "surface-ironpaws-home", status: "live",
    hypothesis: "A quiz-first homepage hero drives more qualified sessions than the product grid.",
    variantDesc: "Quiz-first hero", primaryMetric: "RPV", startedAt: "2026-06-12", trafficSplit: "50/50",
    clientPublished: false, created_at: SEED_NOW, updated_at: SEED_NOW,
  },
  {
    id: "test-i-pricing", surfaceId: "surface-ironpaws-home", status: "lost",
    hypothesis: "Showing per-month subscription pricing lifts conversion.",
    variantDesc: "Per-month price breakdown", primaryMetric: "CVR",
    upliftPct: -7, significanceReachedPct: 92, outcome: "loser", concludedAt: "2026-05-12",
    notes: "Customers anchored on the smaller number and bounced. Reverted to total price.",
    clientPublished: true, clientSummary: "Tested a per-month price breakdown on the subscription.",
    clientResult: "It didn't help conversion, so we kept the clearer total price. A useful rule-out.",
    created_at: SEED_NOW, updated_at: SEED_NOW,
  },
  {
    id: "test-a-adv", surfaceId: "surface-acme-hero", status: "backlog",
    hypothesis: "A clinical-study advertorial pre-sells better than the standard hero.",
    primaryMetric: "CVR", clientPublished: false,
    created_at: SEED_NOW, updated_at: SEED_NOW,
  },
];

// Cache the seed as ONE shared promise so concurrent callers (the page loads
// surfaces + tests via Promise.all) all await the same completion — otherwise
// the second caller reads before the first finishes writing.
let seedPromise: Promise<void> | null = null;
function seedIfEmpty(): Promise<void> {
  if (!seedPromise) seedPromise = doSeed();
  return seedPromise;
}
async function doSeed(): Promise<void> {
  const [surfaces, tests] = await Promise.all([surfaceStore.getAll(), testStore.getAll()]);
  if (surfaces.length > 0 || tests.length > 0) return;
  // Per-item guard: create() writes to localStorage even when the Supabase
  // insert throws (table not yet migrated), so each seed still lands locally.
  for (const s of SEED_SURFACES) {
    try { await surfaceStore.create(s); } catch { /* supabase table absent — LS still written */ }
  }
  for (const t of SEED_TESTS) {
    try { await testStore.create(t); } catch { /* supabase table absent — LS still written */ }
  }
}
function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${rand}`;
}

/* ── Surfaces ── */

export async function getSurfaces(): Promise<ResultsSurface[]> {
  await seedIfEmpty();
  return surfaceStore.getAll();
}

export async function getSurfacesForProject(projectId: string): Promise<ResultsSurface[]> {
  return (await surfaceStore.getAll()).filter((s) => s.projectId === projectId);
}

export async function getSurface(id: string): Promise<ResultsSurface | null> {
  return surfaceStore.getById(id);
}

/** The delivery→Results-Engine SEAM. Called when a build hits Launch: creates
 *  the surface carrying its control benchmark + portal link. Idempotent per
 *  source deliverable — a second launch of the same card returns the existing
 *  surface rather than duplicating it, so the seam can fire safely. */
export async function createSurfaceForLaunch(input: {
  projectId: string;
  sourceTaskId?: string;
  title: string;
  liveUrl?: string;
  controlBenchmark?: Record<string, string | number>;
  portalId?: string;
}): Promise<ResultsSurface> {
  if (input.sourceTaskId) {
    const existing = (await surfaceStore.getAll()).find(
      (s) => s.sourceTaskId === input.sourceTaskId,
    );
    if (existing) return existing;
  }
  const now = nowISO();
  const surface: ResultsSurface = {
    id: newId("surface"),
    projectId: input.projectId,
    sourceTaskId: input.sourceTaskId,
    title: input.title,
    liveUrl: input.liveUrl,
    controlBenchmark: input.controlBenchmark,
    portalId: input.portalId,
    status: "active",
    created_at: now,
    updated_at: now,
  };
  await surfaceStore.create(surface);
  return surface;
}

export async function updateSurface(
  id: string,
  patch: Partial<Omit<ResultsSurface, "id" | "created_at">>,
): Promise<void> {
  await surfaceStore.update(id, { ...patch, updated_at: nowISO() });
}

/* ── Tests ── */

export async function getTests(): Promise<Test[]> {
  await seedIfEmpty();
  return testStore.getAll();
}

export async function getTestsForSurface(surfaceId: string): Promise<Test[]> {
  return (await testStore.getAll()).filter((t) => t.surfaceId === surfaceId);
}

export async function getTest(id: string): Promise<Test | null> {
  return testStore.getById(id);
}

export async function addTest(input: {
  surfaceId: string;
  hypothesis?: string;
  primaryMetric?: string;
  variantDesc?: string;
}): Promise<Test> {
  const now = nowISO();
  const test: Test = {
    id: newId("test"),
    surfaceId: input.surfaceId,
    status: "backlog",
    hypothesis: input.hypothesis,
    primaryMetric: input.primaryMetric,
    variantDesc: input.variantDesc,
    clientPublished: false,
    created_at: now,
    updated_at: now,
  };
  await testStore.create(test);
  return test;
}

export async function updateTest(
  id: string,
  patch: Partial<Omit<Test, "id" | "created_at">>,
): Promise<void> {
  await testStore.update(id, { ...patch, updated_at: nowISO() });
}

/** Move a test between Results Engine columns. Refuses `won` here — a win must
 *  go through declareWin so a declaration is always recorded (§6 hard gate). */
export async function setTestStatus(id: string, status: TestStatus): Promise<void> {
  if (status === "won") {
    throw new Error(
      "A test can't be moved to Won directly — use declareWin so the declaration is recorded.",
    );
  }
  const patch: Partial<Test> = { status, updated_at: nowISO() };
  if (status === "live") {
    const t = await testStore.getById(id);
    if (t && !t.startedAt) patch.startedAt = nowISO().slice(0, 10);
  }
  await testStore.update(id, patch);
}

/** The win declaration — the strategist's authority call (§4/§6). This is the
 *  ONLY path to `won`; it stamps declaredBy/declaredAt + evidence so the win is
 *  defensible, reusable, and can't exist without a record. */
export async function declareWin(
  id: string,
  declaration: {
    declaredBy: string;
    metric?: string;
    upliftPct?: number;
    confidencePct?: number;
    evidence?: { what?: string; magnitude?: string; link?: string };
    notes?: string;
  },
): Promise<void> {
  await testStore.update(id, {
    status: "won",
    outcome: "winner",
    declaredBy: declaration.declaredBy,
    declaredAt: nowISO(),
    primaryMetric: declaration.metric,
    upliftPct: declaration.upliftPct,
    significanceReachedPct: declaration.confidencePct,
    winEvidence: declaration.evidence,
    notes: declaration.notes,
    concludedAt: nowISO().slice(0, 10),
    updated_at: nowISO(),
  });
}

/** Conclude a non-winning test (loser / inconclusive / shipped). Losses stay in
 *  the record so the client journey (§7) can render them as steps toward a win. */
export async function concludeTest(
  id: string,
  outcome: Exclude<TestOutcome, "winner">,
  detail?: { metric?: string; upliftPct?: number; confidencePct?: number; notes?: string },
): Promise<void> {
  await testStore.update(id, {
    status: "lost",
    outcome,
    primaryMetric: detail?.metric,
    upliftPct: detail?.upliftPct,
    significanceReachedPct: detail?.confidencePct,
    notes: detail?.notes,
    concludedAt: nowISO().slice(0, 10),
    updated_at: nowISO(),
  });
}

/** Publish / unpublish the CLIENT face (§7). Nothing reaches the portal until
 *  the strategist calls this; the curated summary/result is what shows. */
export async function setClientPublished(
  id: string,
  published: boolean,
  face?: { clientSummary?: string; clientResult?: string },
): Promise<void> {
  await testStore.update(id, {
    clientPublished: published,
    ...(face?.clientSummary !== undefined ? { clientSummary: face.clientSummary } : {}),
    ...(face?.clientResult !== undefined ? { clientResult: face.clientResult } : {}),
    updated_at: nowISO(),
  });
}

export async function deleteTest(id: string): Promise<void> {
  await testStore.remove(id);
}

/* ── The Results library — a VIEW over won records, not a second store (§4). ── */
export async function getWonTests(): Promise<Test[]> {
  return (await testStore.getAll()).filter((t) => t.status === "won");
}
