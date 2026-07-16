"use client";

/* ── Results Engine ── Surface B ──
 * The strategist's optimisation surface. Surfaces (live pages under test) are
 * created by the seam at go-live; tests run against them and move Backlog → Live
 * → Reading → Won / Lost. Wins are a human declaration (hard gate). Everything
 * reads the single canonical test record (src/lib/results-engine). Client
 * identity resolves off kanban_clients via the surface's project (decision 1).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { XMarkIcon, TrophyIcon, EyeIcon, EyeSlashIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Segmented } from "@/components/ui";
import { OptimisationFeed } from "@/components/client-portal/optimisation-feed";
import type { ClientOptimisation } from "@/lib/results-engine/data";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import {
  getSurfaces,
  getTests,
  addTest,
  setTestStatus,
  declareWin,
  concludeTest,
  setClientPublished,
  backfillResultsEngine,
} from "@/lib/results-engine/data";
import {
  TEST_STATUS_ORDER,
  TEST_STATUS_META,
  TEST_OUTCOME_META,
  type ResultsSurface,
  type Test,
  type TestStatus,
} from "@/lib/results-engine/types";

const EYEBROW = "text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle";

export default function ResultsEnginePage() {
  const { clients } = useKanbanData();
  const [surfaces, setSurfaces] = useState<ResultsSurface[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "library" | "client">("board");
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([getSurfaces(), getTests()]);
    setSurfaces(s);
    setTests(t);
    setLoading(false);
  }, []);
  useEffect(() => {
    (async () => {
      // Consolidate existing kanban delivery tests into the canonical record
      // (idempotent) once the live clients are available, then load.
      if (clients.length) await backfillResultsEngine(clients).catch(() => {});
      await load();
    })();
  }, [clients, load]);

  // project → client, so a surface (and its tests) resolve to a client name.
  const projectToClient = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const c of clients) for (const p of c.projects) m.set(p.id, { id: c.id, name: c.name });
    return m;
  }, [clients]);
  const surfaceById = useMemo(() => new Map(surfaces.map((s) => [s.id, s])), [surfaces]);

  const clientForSurface = useCallback(
    (s: ResultsSurface | undefined) => (s ? projectToClient.get(s.projectId) : undefined),
    [projectToClient],
  );

  const clientOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of surfaces) {
      const c = clientForSurface(s);
      if (c) seen.set(c.id, c.name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [surfaces, clientForSurface]);

  const shown = useMemo(() => {
    if (clientFilter === "all") return tests;
    return tests.filter((t) => {
      const c = clientForSurface(surfaceById.get(t.surfaceId));
      return c?.id === clientFilter;
    });
  }, [tests, clientFilter, surfaceById, clientForSurface]);

  const byStatus = useMemo(() => {
    const m = new Map<TestStatus, Test[]>();
    TEST_STATUS_ORDER.forEach((s) => m.set(s, []));
    shown.forEach((t) => m.get(t.status)?.push(t));
    return m;
  }, [shown]);

  const selected = selectedId ? tests.find((t) => t.id === selectedId) ?? null : null;
  const selectedSurface = selected ? surfaceById.get(selected.surfaceId) : undefined;

  // Results Engine KPIs (its own small set, §4)
  const liveCount = byStatus.get("live")!.length + byStatus.get("reading")!.length;
  const won = tests.filter((t) => t.status === "won").length;
  const concluded = tests.filter((t) => t.status === "won" || t.status === "lost").length;
  const winRate = concluded > 0 ? Math.round((won / concluded) * 100) : null;

  // Library = the won records as a view (§4), not a second store.
  const wonTests = useMemo(
    () => shown.filter((t) => t.status === "won").sort((a, b) => (b.declaredAt ?? "").localeCompare(a.declaredAt ?? "")),
    [shown],
  );

  // Client view = the §7 projection preview: the client-face journey for the
  // filtered client (published tests only, wins + losses oldest → newest).
  const clientGroups = useMemo<ClientOptimisation[]>(() => {
    const published = tests.filter((t) => t.clientPublished);
    const dateKey = (t: Test) => t.concludedAt ?? t.startedAt ?? t.created_at ?? "";
    return surfaces
      .filter((s) => clientFilter === "all" || clientForSurface(s)?.id === clientFilter)
      .map((surface) => ({
        surface,
        journey: published
          .filter((t) => t.surfaceId === surface.id)
          .sort((a, b) => dateKey(a).localeCompare(dateKey(b))),
      }))
      .filter((g) => g.journey.length > 0);
  }, [surfaces, tests, clientFilter, clientForSurface]);

  return (
    <div className="px-6 pb-24 pt-10 md:px-10">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Results Engine</h1>
          <p className="mt-1 text-sm text-muted">
            {view === "board"
              ? "Every live page under optimisation and the tests running against it."
              : view === "library"
                ? "Won tests — the proof shelf. Every win, ready to reuse."
                : "What the client sees — the published optimisation journey."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={view}
            onChange={(v) => setView(v as "board" | "library" | "client")}
            options={[
              { value: "board", label: "Board" },
              { value: "library", label: "Library" },
              { value: "client", label: "Client view" },
            ]}
          />
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded border border-border-faint bg-surface px-3 py-1.5 text-sm text-foreground focus:border-subtle focus:outline-none"
          >
            <option value="all">All clients</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {view === "board" && surfaces.length > 0 && (
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded bg-foreground px-3 py-2 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              <PlusIcon className="size-3.5" />
              New test
            </button>
          )}
        </div>
      </header>

      {/* KPI strip — the Results Engine's own small set (internal; hidden in the client preview) */}
      <div className={`mb-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4 ${view === "client" ? "hidden" : ""}`}>
        <Kpi label="Surfaces" value={surfaces.length} />
        <Kpi label="Tests live" value={liveCount} />
        <Kpi label="Wins" value={won} tone="ok" />
        <Kpi label="Win rate" value={winRate === null ? "–" : `${winRate}%`} />
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-subtle">Loading…</p>
      ) : view === "client" ? (
        <div className="max-w-2xl">
          <div className="mb-5 rounded-lg border border-border-faint bg-surface px-4 py-3 text-2xs text-subtle">
            Preview only — this is the curated client face. Publish a test from the board to add it here.
          </div>
          <OptimisationFeed groups={clientGroups} />
        </div>
      ) : view === "library" ? (
        <LibraryView
          tests={wonTests}
          surfaceById={surfaceById}
          clientForSurface={clientForSurface}
          onOpen={setSelectedId}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-5">
          {TEST_STATUS_ORDER.map((status) => {
            const items = byStatus.get(status)!;
            const meta = TEST_STATUS_META[status];
            return (
              <section
                key={status}
                className="rounded-lg border border-border-faint bg-surface"
              >
                <div className="flex items-center gap-2 border-b border-border-faint px-3 py-2.5">
                  <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
                  <span className="text-2xs font-medium uppercase tracking-wider text-foreground">
                    {meta.label}
                  </span>
                  <span className="ml-auto font-mono text-2xs tabular-nums text-subtle">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-2.5">
                  {items.length === 0 ? (
                    <p className="px-1 py-3 text-2xs text-subtle">—</p>
                  ) : (
                    items.map((t) => {
                      const surface = surfaceById.get(t.surfaceId);
                      const client = clientForSurface(surface);
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedId(t.id)}
                          className="rounded-md border border-border-faint bg-card px-2.5 py-2 text-left transition-colors hover:border-border"
                          style={{ background: "var(--color-surface-raised)" }}
                        >
                          <p className="line-clamp-3 text-[13px] font-medium leading-snug text-foreground">
                            {t.hypothesis ?? "Untitled test"}
                          </p>
                          <p className="mt-1.5 truncate text-2xs text-muted">
                            {surface?.title ?? "—"}
                            {client ? ` · ${client.name}` : ""}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            {t.primaryMetric && (
                              <span className="text-3xs text-subtle">{t.primaryMetric}</span>
                            )}
                            {typeof t.upliftPct === "number" && (
                              <span
                                className="font-mono text-3xs tabular-nums"
                                style={{
                                  color: t.upliftPct >= 0 ? "var(--color-status-ontrack)" : "var(--color-status-late)",
                                }}
                              >
                                {t.upliftPct > 0 ? "+" : ""}
                                {t.upliftPct}%
                              </span>
                            )}
                            {t.clientPublished && (
                              <EyeIcon className="ml-auto size-3 text-subtle" title="Published to client" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selected && (
        <TestPanel
          test={selected}
          surface={selectedSurface}
          clientName={clientForSurface(selectedSurface)?.name}
          onClose={() => setSelectedId(null)}
          onChanged={async () => {
            await load();
          }}
        />
      )}

      {addOpen && (
        <AddTestModal
          surfaces={surfaces}
          clientForSurface={clientForSurface}
          onClose={() => setAddOpen(false)}
          onAdded={async () => {
            setAddOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

/* ── Library — the won proof shelf (a view over won records, §4) ── */
function LibraryView({
  tests,
  surfaceById,
  clientForSurface,
  onOpen,
}: {
  tests: Test[];
  surfaceById: Map<string, ResultsSurface>;
  clientForSurface: (s: ResultsSurface | undefined) => { id: string; name: string } | undefined;
  onOpen: (id: string) => void;
}) {
  if (tests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-faint px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">No wins yet</p>
        <p className="mt-1 text-xs text-subtle">
          Declared wins graduate here automatically as proof assets.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {tests.map((t) => {
        const surface = surfaceById.get(t.surfaceId);
        const client = clientForSurface(surface);
        return (
          <button
            key={t.id}
            onClick={() => onOpen(t.id)}
            className="flex flex-col rounded-lg border border-border-faint bg-surface p-4 text-left transition-colors hover:border-border"
          >
            <div className="flex items-center gap-2">
              <TrophyIcon className="size-3.5 text-status-ontrack" />
              <span className="text-2xs font-medium uppercase tracking-wider text-status-ontrack">Won</span>
              {t.clientPublished && <EyeIcon className="ml-auto size-3.5 text-subtle" title="Published to client" />}
            </div>
            <p className="mt-2.5 text-sm font-medium leading-snug text-foreground">
              {t.hypothesis ?? "Untitled test"}
            </p>
            <p className="mt-1.5 text-2xs text-muted">
              {surface?.title ?? "—"}
              {client ? ` · ${client.name}` : ""}
            </p>
            <div className="mt-3 flex items-baseline gap-2 border-t border-border-faint pt-3">
              {t.primaryMetric && <span className="text-xs text-muted">{t.primaryMetric}</span>}
              {typeof t.upliftPct === "number" && (
                <span className="font-mono text-sm font-semibold tabular-nums text-status-ontrack">
                  {t.upliftPct > 0 ? "+" : ""}
                  {t.upliftPct}%
                </span>
              )}
              {typeof t.significanceReachedPct === "number" && (
                <span className="ml-auto text-2xs tabular-nums text-subtle">{t.significanceReachedPct}% conf.</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Add a test to a surface's Backlog ── */
function AddTestModal({
  surfaces,
  clientForSurface,
  onClose,
  onAdded,
}: {
  surfaces: ResultsSurface[];
  clientForSurface: (s: ResultsSurface | undefined) => { id: string; name: string } | undefined;
  onClose: () => void;
  onAdded: () => Promise<void>;
}) {
  const [surfaceId, setSurfaceId] = useState(surfaces[0]?.id ?? "");
  const [hypothesis, setHypothesis] = useState("");
  const [metric, setMetric] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!surfaceId || !hypothesis.trim()) return;
    setBusy(true);
    try {
      await addTest({ surfaceId, hypothesis: hypothesis.trim(), primaryMetric: metric.trim() || undefined });
      await onAdded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-border bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">New test</h2>
          <button onClick={onClose} className="text-subtle transition-colors hover:text-foreground">
            <XMarkIcon className="size-5" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-3xs uppercase tracking-wider text-subtle">Surface</span>
            <select
              value={surfaceId}
              onChange={(e) => setSurfaceId(e.target.value)}
              className="w-full rounded border border-border-faint bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-subtle focus:outline-none"
            >
              {surfaces.map((s) => {
                const c = clientForSurface(s);
                return (
                  <option key={s.id} value={s.id}>
                    {s.title}
                    {c ? ` · ${c.name}` : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-3xs uppercase tracking-wider text-subtle">Hypothesis</span>
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              rows={3}
              placeholder="What you believe + why, in one sentence."
              className="w-full resize-y rounded border border-border-faint bg-surface px-2.5 py-1.5 text-sm text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-3xs uppercase tracking-wider text-subtle">Primary metric (optional)</span>
            <input
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="CVR"
              className="w-full rounded border border-border-faint bg-surface px-2.5 py-1.5 text-sm text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none"
            />
          </label>
        </div>
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={save}
            disabled={busy || !surfaceId || !hypothesis.trim()}
            className="rounded bg-foreground px-4 py-2 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Add to backlog
          </button>
          <button onClick={onClose} className="rounded border border-border-faint px-4 py-2 text-xs text-muted hover:text-foreground">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: "ok" }) {
  return (
    <div className="rounded border border-border-faint bg-surface px-4 py-3.5">
      <div className={EYEBROW}>{label}</div>
      <div
        className={`mt-2 text-xl font-semibold tabular-nums ${tone === "ok" ? "text-status-ontrack" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

function TestPanel({
  test,
  surface,
  clientName,
  onClose,
  onChanged,
}: {
  test: Test;
  surface: ResultsSurface | undefined;
  clientName: string | undefined;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [dMetric, setDMetric] = useState(test.primaryMetric ?? "");
  const [dUplift, setDUplift] = useState("");
  const [dConf, setDConf] = useState("");
  const [dWhat, setDWhat] = useState("");
  const [pubSummary, setPubSummary] = useState(test.clientSummary ?? "");
  const [pubResult, setPubResult] = useState(test.clientResult ?? "");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const isTerminal = test.status === "won" || test.status === "lost";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-7">
          <button onClick={onClose} className="absolute right-5 top-5 text-subtle transition-colors hover:text-foreground">
            <XMarkIcon className="size-5" />
          </button>

          <div className="flex items-center gap-2">
            <span
              className="text-2xs font-medium uppercase tracking-wider"
              style={{ color: TEST_STATUS_META[test.status].color }}
            >
              {TEST_STATUS_META[test.status].label}
            </span>
            {test.outcome && (
              <span className="text-2xs" style={{ color: TEST_OUTCOME_META[test.outcome].color }}>
                · {TEST_OUTCOME_META[test.outcome].label}
              </span>
            )}
          </div>
          <h2 className="mt-2 text-xl font-semibold leading-snug text-foreground">
            {test.hypothesis ?? "Untitled test"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {surface?.title ?? "—"}
            {clientName ? ` · ${clientName}` : ""}
          </p>

          {/* experiment */}
          <Section label="Experiment">
            <dl className="space-y-2 text-[13px]">
              <Row k="Variant" v={test.variantDesc} />
              <Row k="Metric" v={test.primaryMetric} />
              <Row k="Split" v={test.trafficSplit} />
              <Row k="Uplift" v={typeof test.upliftPct === "number" ? `${test.upliftPct > 0 ? "+" : ""}${test.upliftPct}%` : undefined} />
              <Row k="Confidence" v={typeof test.significanceReachedPct === "number" ? `${test.significanceReachedPct}%` : undefined} />
              {surface?.controlBenchmark && (
                <Row k="Control" v={Object.entries(surface.controlBenchmark).map(([m, val]) => `${m} ${val}`).join(" · ")} />
              )}
            </dl>
            {test.notes && <p className="mt-3 text-[13px] leading-relaxed text-muted">{test.notes}</p>}
          </Section>

          {/* move + conclude */}
          {!isTerminal && (
            <Section label="Move">
              <div className="flex flex-wrap gap-2">
                {(["backlog", "live", "reading"] as TestStatus[]).map((s) => (
                  <button
                    key={s}
                    disabled={busy || test.status === s}
                    onClick={() => run(() => setTestStatus(test.id, s))}
                    className={`rounded border px-2.5 py-1 text-2xs font-medium transition-colors disabled:opacity-40 ${
                      test.status === s
                        ? "border-border bg-surface-raised text-foreground"
                        : "border-border-faint text-muted hover:text-foreground"
                    }`}
                  >
                    {TEST_STATUS_META[s].label}
                  </button>
                ))}
              </div>

              {/* the win declaration — the only path to Won */}
              {!declaring ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={() => setDeclaring(true)}
                    className="inline-flex items-center gap-1.5 rounded bg-status-ontrack/15 px-3 py-1.5 text-2xs font-medium text-status-ontrack transition-colors hover:bg-status-ontrack/25 disabled:opacity-40"
                  >
                    <TrophyIcon className="size-3.5" /> Declare win
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => run(() => concludeTest(test.id, "loser", { metric: test.primaryMetric }))}
                    className="rounded border border-border-faint px-3 py-1.5 text-2xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    Conclude — no win
                  </button>
                </div>
              ) : (
                <div className="mt-3 rounded border border-status-ontrack/30 bg-status-ontrack/5 p-3">
                  <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-status-ontrack">
                    Record the win
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Metric" v={dMetric} set={setDMetric} placeholder="CVR" />
                    <Field label="Uplift %" v={dUplift} set={setDUplift} placeholder="8" />
                    <Field label="Confidence %" v={dConf} set={setDConf} placeholder="96" />
                    <Field label="What moved" v={dWhat} set={setDWhat} placeholder="Add-to-cart +8%" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await declareWin(test.id, {
                            declaredBy: "Aanchal",
                            metric: dMetric.trim() || undefined,
                            upliftPct: dUplift.trim() ? Number(dUplift) : undefined,
                            confidencePct: dConf.trim() ? Number(dConf) : undefined,
                            evidence: dWhat.trim() ? { what: dWhat.trim(), magnitude: dUplift.trim() ? `${dUplift}%` : undefined } : undefined,
                          });
                          setDeclaring(false);
                        })
                      }
                      className="rounded bg-status-ontrack px-3 py-1.5 text-2xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      Confirm win
                    </button>
                    <button
                      onClick={() => setDeclaring(false)}
                      className="rounded border border-border-faint px-3 py-1.5 text-2xs text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}

          {isTerminal && test.winEvidence && (
            <Section label="Declared win">
              <p className="text-[13px] text-foreground">{test.winEvidence.what}{test.winEvidence.magnitude ? ` · ${test.winEvidence.magnitude}` : ""}</p>
              {test.declaredBy && (
                <p className="mt-1 text-2xs text-subtle">
                  Declared by {test.declaredBy}
                  {test.declaredAt ? ` · ${new Date(test.declaredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
                </p>
              )}
            </Section>
          )}

          {/* client face — §7 two-faced card, curated + gated */}
          <Section label="Client portal">
            <p className="mb-2 flex items-center gap-1.5 text-2xs text-subtle">
              {test.clientPublished ? (
                <><EyeIcon className="size-3.5 text-status-ontrack" /> Visible to the client</>
              ) : (
                <><EyeSlashIcon className="size-3.5" /> Not published — nothing leaks automatically</>
              )}
            </p>
            <label className="mb-1 block text-3xs uppercase tracking-wider text-subtle">What we&apos;re testing (client)</label>
            <textarea
              value={pubSummary}
              onChange={(e) => setPubSummary(e.target.value)}
              rows={2}
              className="mb-2 w-full resize-y rounded border border-border-faint bg-surface px-2.5 py-1.5 text-[13px] text-foreground focus:border-subtle focus:outline-none"
              placeholder="Plain-English description for the client…"
            />
            <label className="mb-1 block text-3xs uppercase tracking-wider text-subtle">Result (client)</label>
            <textarea
              value={pubResult}
              onChange={(e) => setPubResult(e.target.value)}
              rows={2}
              className="mb-2 w-full resize-y rounded border border-border-faint bg-surface px-2.5 py-1.5 text-[13px] text-foreground focus:border-subtle focus:outline-none"
              placeholder="What the client sees as the outcome…"
            />
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => run(() => setClientPublished(test.id, !test.clientPublished, { clientSummary: pubSummary, clientResult: pubResult }))}
                className={`rounded px-3 py-1.5 text-2xs font-medium transition-colors disabled:opacity-40 ${
                  test.clientPublished
                    ? "border border-border-faint text-muted hover:text-foreground"
                    : "bg-foreground text-background hover:opacity-90"
                }`}
              >
                {test.clientPublished ? "Unpublish" : "Publish to client"}
              </button>
              {test.clientPublished && (
                <button
                  disabled={busy}
                  onClick={() => run(() => setClientPublished(test.id, true, { clientSummary: pubSummary, clientResult: pubResult }))}
                  className="rounded border border-border-faint px-3 py-1.5 text-2xs text-muted hover:text-foreground disabled:opacity-40"
                >
                  Save
                </button>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 border-t border-border-faint pt-6">
      <p className={`${EYEBROW} mb-4`}>{label}</p>
      {children}
    </section>
  );
}
function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-2xs uppercase tracking-wider text-subtle">{k}</dt>
      <dd className="text-foreground">{v}</dd>
    </div>
  );
}
function Field({ label, v, set, placeholder }: { label: string; v: string; set: (s: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-3xs uppercase tracking-wider text-subtle">{label}</span>
      <input
        value={v}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-border-faint bg-surface px-2 py-1 text-[13px] text-foreground focus:border-subtle focus:outline-none"
      />
    </label>
  );
}
