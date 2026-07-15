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
function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${rand}`;
}

/* ── Surfaces ── */

export async function getSurfaces(): Promise<ResultsSurface[]> {
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
