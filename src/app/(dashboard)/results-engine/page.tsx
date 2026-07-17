"use client";

/* ── Results Engine ── Surface B ──
 * The strategist's optimisation surface. Surfaces (live pages under test) are
 * created by the seam at go-live; tests run against them and move Backlog → Live
 * → Reading → Won / Lost. Wins are a human declaration (hard gate). Everything
 * reads the single canonical test record (src/lib/results-engine). Client
 * identity resolves off kanban_clients via the surface's project (decision 1).
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { XMarkIcon, TrophyIcon, EyeIcon, EyeSlashIcon, PlusIcon, ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { Segmented, Table, THead, TBody, TR, TH, TD, Num } from "@/components/ui";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import {
  getSurfaces,
  getTests,
  addTest,
  updateTest,
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

const EYEBROW = "text-4xs font-semibold uppercase tracking-wider text-subtle";

export default function ResultsEnginePage() {
  const { clients } = useKanbanData();
  const [surfaces, setSurfaces] = useState<ResultsSurface[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "library">("board");
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
  /* Orphan surfaces: the projectId no longer resolves to a client — a deleted
   * project, or a seed pointing at ids this workspace doesn't have. They render
   * client "—" and would still inflate Surfaces / Wins / win rate, so drop them
   * and their tests. Only once the kanban clients have actually loaded, or a
   * slow load would blank the whole board. */
  const liveSurfaces = useMemo(
    () =>
      clients.length === 0
        ? surfaces
        : surfaces.filter((s) => projectToClient.has(s.projectId)),
    [surfaces, projectToClient, clients.length],
  );
  const liveTests = useMemo(() => {
    if (clients.length === 0) return tests;
    const ids = new Set(liveSurfaces.map((s) => s.id));
    return tests.filter((t) => ids.has(t.surfaceId));
  }, [tests, liveSurfaces, clients.length]);

  const surfaceById = useMemo(() => new Map(liveSurfaces.map((s) => [s.id, s])), [liveSurfaces]);

  const clientForSurface = useCallback(
    (s: ResultsSurface | undefined) => (s ? projectToClient.get(s.projectId) : undefined),
    [projectToClient],
  );

  const clientOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of liveSurfaces) {
      const c = clientForSurface(s);
      if (c) seen.set(c.id, c.name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [liveSurfaces, clientForSurface]);

  const shown = useMemo(() => {
    if (clientFilter === "all") return liveTests;
    return liveTests.filter((t) => {
      const c = clientForSurface(surfaceById.get(t.surfaceId));
      return c?.id === clientFilter;
    });
  }, [liveTests, clientFilter, surfaceById, clientForSurface]);

  const byStatus = useMemo(() => {
    const m = new Map<TestStatus, Test[]>();
    TEST_STATUS_ORDER.forEach((s) => m.set(s, []));
    shown.forEach((t) => m.get(t.status)?.push(t));
    return m;
  }, [shown]);

  // Surfaces respect the client filter too, so the Library table matches the board.
  const shownSurfaces = useMemo(
    () =>
      clientFilter === "all"
        ? liveSurfaces
        : liveSurfaces.filter((s) => clientForSurface(s)?.id === clientFilter),
    [liveSurfaces, clientFilter, clientForSurface],
  );

  const selected = selectedId ? liveTests.find((t) => t.id === selectedId) ?? null : null;
  const selectedSurface = selected ? surfaceById.get(selected.surfaceId) : undefined;

  // ── drag between columns ── Free-move, EXCEPT Won: a win is a human
  // declaration (§6 hard gate), so dropping onto Won opens the card's panel to
  // record it, never a silent status flip.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TestStatus | null>(null);
  const handleDrop = useCallback(
    async (status: TestStatus) => {
      const id = draggingId;
      setDraggingId(null);
      setDragOverStatus(null);
      if (!id) return;
      const t = liveTests.find((x) => x.id === id);
      if (!t || t.status === status) return;
      // Won AND Lost are both recorded conclusions, never a silent drop — open
      // the panel so the strategist records the win / the reason it lost.
      if (status === "won" || status === "lost") {
        setSelectedId(id);
        return;
      }
      await setTestStatus(id, status);
      await load();
    },
    [draggingId, tests, load],
  );

  // Results Engine KPIs (its own small set, §4)
  const liveCount = byStatus.get("live")!.length + byStatus.get("reading")!.length;
  const won = liveTests.filter((t) => t.status === "won").length;
  const concluded = liveTests.filter((t) => t.status === "won" || t.status === "lost").length;
  const winRate = concluded > 0 ? Math.round((won / concluded) * 100) : null;

  return (
    <div className="px-6 pb-24 pt-10 md:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Results Engine</h1>
          <p className="mt-1 text-sm text-muted">
            {view === "board"
              ? "Every live page under optimisation and the tests running against it."
              : "Every page under optimisation: tests run, wins, and win rate."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={view}
            onChange={(v) => setView(v as "board" | "library")}
            options={[
              { value: "board", label: "Board" },
              { value: "library", label: "Library" },
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
          {liveSurfaces.length > 0 && (
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
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Surfaces" value={liveSurfaces.length} />
        <Kpi label="Tests live" value={liveCount} />
        <Kpi label="Wins" value={won} tone="ok" />
        <Kpi label="Win rate" value={winRate === null ? "–" : `${winRate}%`} />
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-subtle">Loading…</p>
      ) : view === "library" ? (
        <LibraryView
          surfaces={shownSurfaces}
          tests={shown}
          clientForSurface={clientForSurface}
          onOpen={setSelectedId}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-5">
          {TEST_STATUS_ORDER.map((status) => {
            const items = byStatus.get(status)!;
            const meta = TEST_STATUS_META[status];
            const isDropTarget = dragOverStatus === status && draggingId !== null;
            const isWonGate = isDropTarget && status === "won";
            const isLostGate = isDropTarget && status === "lost";
            return (
              <section
                key={status}
                onDragOver={(e) => {
                  if (draggingId === null) return;
                  e.preventDefault();
                  setDragOverStatus(status);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDragOverStatus((s) => (s === status ? null : s));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleDrop(status);
                }}
                className={`rounded border bg-surface transition-colors ${
                  isWonGate
                    ? "border-status-ontrack/60 bg-status-ontrack/[0.04]"
                    : isLostGate
                      ? "border-status-late/60 bg-status-late/[0.04]"
                      : isDropTarget
                        ? "border-border-strong bg-surface-raised"
                        : "border-border-faint"
                }`}
              >
                <div className="flex items-center gap-2 border-b border-border-faint px-3 py-3">
                  <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
                  <span className="text-2xs font-medium uppercase tracking-wider text-foreground">
                    {meta.label}
                  </span>
                  <span className="ml-auto font-mono text-2xs tabular-nums text-subtle">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  {isWonGate && (
                    <p className="rounded border border-status-ontrack/30 bg-status-ontrack/[0.06] px-2 py-1.5 text-3xs text-status-ontrack">
                      Drop to declare a win, then record the outcome.
                    </p>
                  )}
                  {isLostGate && (
                    <p className="rounded border border-status-late/30 bg-status-late/[0.06] px-2 py-1.5 text-3xs text-status-late">
                      Drop to conclude, then record why it lost.
                    </p>
                  )}
                  {items.length === 0 ? (
                    <p className="px-1 py-3 text-2xs text-subtle">—</p>
                  ) : (
                    items.map((t) => {
                      const surface = surfaceById.get(t.surfaceId);
                      const client = clientForSurface(surface);
                      return (
                        <button
                          key={t.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggingId(t.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverStatus(null);
                          }}
                          onClick={() => setSelectedId(t.id)}
                          className={`cursor-grab rounded border border-border-faint bg-surface-raised p-3 text-left transition-all hover:border-border active:cursor-grabbing ${
                            draggingId === t.id ? "opacity-40" : ""
                          }`}
                        >
                          <p className="line-clamp-3 text-xs font-medium leading-snug text-foreground">
                            {t.hypothesis ?? "Untitled test"}
                          </p>
                          <p className="mt-2 truncate text-2xs text-muted">
                            {surface?.title ?? "—"}
                            {client ? ` · ${client.name}` : ""}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
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
          surfaces={liveSurfaces}
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

/* ── Library — the page inventory (§4) ──
 * One row per surface (a client page under optimisation), with the test record
 * rolled up: how many tests it's carried, how many won, its win rate, its best
 * uplift, and when it last moved. Every column is real — no traffic/revenue
 * analytics we don't hold. Matches the app's other table surfaces (DESIGN.md). */
function LibraryView({
  surfaces,
  tests,
  clientForSurface,
  onOpen,
}: {
  surfaces: ResultsSurface[];
  tests: Test[];
  clientForSurface: (s: ResultsSurface | undefined) => { id: string; name: string } | undefined;
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const rows = useMemo(() => {
    // The Library is the RESULTS ARCHIVE: only concluded tests (won / lost /
    // inconclusive) belong here. In-flight tests (ideating / live / reading)
    // live on the Board, never here.
    const isConcluded = (t: Test) => t.status === "won" || t.status === "lost";
    const bySurface = new Map<string, Test[]>();
    for (const t of tests) {
      if (!isConcluded(t)) continue;
      const arr = bySurface.get(t.surfaceId) ?? [];
      arr.push(t);
      bySurface.set(t.surfaceId, arr);
    }
    return surfaces
      .map((s) => {
        const ts = (bySurface.get(s.id) ?? [])
          .slice()
          .sort((a, b) =>
            (b.concludedAt ?? b.updated_at ?? "").localeCompare(a.concludedAt ?? a.updated_at ?? ""),
          );
        const wins = ts.filter((t) => t.status === "won" || t.outcome === "winner");
        const bestUplift = wins.reduce<number | null>(
          (m, t) => (typeof t.upliftPct === "number" && (m === null || t.upliftPct > m) ? t.upliftPct : m),
          null,
        );
        const lastChange = ts
          .map((t) => t.concludedAt || t.updated_at || t.declaredAt || "")
          .filter(Boolean)
          .sort()
          .at(-1);
        return {
          surface: s,
          testList: ts,
          client: clientForSurface(s),
          results: ts.length,
          wins: wins.length,
          winRate: ts.length > 0 ? Math.round((wins.length / ts.length) * 100) : null,
          bestUplift,
          lastChange,
        };
      })
      // Archive only lists pages that have actually concluded something.
      .filter((r) => r.results > 0)
      .sort((a, b) => b.results - a.results || b.wins - a.wins);
  }, [surfaces, tests, clientForSurface]);

  if (rows.length === 0) {
    return (
      <div className="rounded border border-dashed border-border-faint px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">No concluded results yet</p>
        <p className="mt-1 text-xs text-subtle">
          Wins, losses, and inconclusives land here as tests conclude on the board.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-border-faint bg-surface">
      <Table>
        <THead>
          <TR hover={false}>
            <TH>Page</TH>
            <TH>Client</TH>
            <TH align="right">Results</TH>
            <TH align="right">Wins</TH>
            <TH align="right">Win rate</TH>
            <TH align="right">Best uplift</TH>
            <TH align="right">Last change</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => {
            const isOpen = expanded.has(r.surface.id);
            return (
              <Fragment key={r.surface.id}>
                <TR className="cursor-pointer" onClick={() => toggle(r.surface.id)}>
                  <TD className="text-foreground">
                    <span className="inline-flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDownIcon className="size-3.5 text-subtle" />
                      ) : (
                        <ChevronRightIcon className="size-3.5 text-subtle" />
                      )}
                      <span className="font-medium">{r.surface.title}</span>
                    </span>
                  </TD>
                  <TD className="text-muted">{r.client?.name ?? "—"}</TD>
                  <TD align="right"><Num className="text-muted">{r.results}</Num></TD>
                  <TD align="right">
                    <Num className={r.wins > 0 ? "text-status-ontrack" : "text-subtle"}>{r.wins || "—"}</Num>
                  </TD>
                  <TD align="right">
                    <Num className="text-muted">{r.winRate === null ? "—" : `${r.winRate}%`}</Num>
                  </TD>
                  <TD align="right">
                    {r.bestUplift === null ? (
                      <Num className="text-subtle">—</Num>
                    ) : (
                      <Num className="text-status-ontrack">{r.bestUplift > 0 ? "+" : ""}{r.bestUplift}%</Num>
                    )}
                  </TD>
                  <TD align="right"><Num className="text-subtle">{fmtLibDate(r.lastChange)}</Num></TD>
                </TR>
                {isOpen &&
                  r.testList.map((t) => {
                    const om = t.outcome ? TEST_OUTCOME_META[t.outcome] : TEST_STATUS_META[t.status];
                    return (
                      <TR key={t.id} className="cursor-pointer" onClick={() => onOpen(t.id)}>
                        <TD className="text-muted">
                          <span className="flex items-center gap-2 pl-6">
                            <span className="truncate">{t.hypothesis ?? "Untitled test"}</span>
                          </span>
                        </TD>
                        <TD>
                          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: om.color }}>
                            <span className="size-1.5 rounded-full" style={{ background: om.color }} />
                            {om.label}
                          </span>
                        </TD>
                        <TD align="right"><Num className="text-subtle">—</Num></TD>
                        <TD align="right"><Num className="text-subtle">—</Num></TD>
                        <TD align="right">
                          <Num className="text-subtle">
                            {typeof t.significanceReachedPct === "number" ? `${t.significanceReachedPct}%` : "—"}
                          </Num>
                        </TD>
                        <TD align="right">
                          {typeof t.upliftPct === "number" ? (
                            <Num className={t.upliftPct >= 0 ? "text-status-ontrack" : "text-status-late"}>
                              {t.upliftPct > 0 ? "+" : ""}{t.upliftPct}%
                            </Num>
                          ) : (
                            <Num className="text-subtle">—</Num>
                          )}
                        </TD>
                        <TD align="right">
                          <Num className="text-subtle">{fmtLibDate(t.concludedAt || t.updated_at || t.declaredAt)}</Num>
                        </TD>
                      </TR>
                    );
                  })}
              </Fragment>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

function fmtLibDate(iso?: string) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
  const [expLift, setExpLift] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!surfaceId || !hypothesis.trim()) return;
    setBusy(true);
    try {
      const n = expLift.trim() ? Number(expLift) : undefined;
      await addTest({
        surfaceId,
        hypothesis: hypothesis.trim(),
        primaryMetric: metric.trim() || undefined,
        expectedLiftPct: n != null && Number.isFinite(n) ? n : undefined,
      });
      await onAdded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6" onClick={onClose}>
      <div
        className="w-full max-w-md rounded border border-border bg-surface-raised p-5"
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-3xs uppercase tracking-wider text-subtle">Primary metric</span>
              <input
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder="CVR"
                className="w-full rounded border border-border-faint bg-surface px-2.5 py-1.5 text-sm text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-3xs uppercase tracking-wider text-subtle">Expected lift %</span>
              <input
                value={expLift}
                onChange={(e) => setExpLift(e.target.value)}
                inputMode="numeric"
                placeholder="12"
                className="w-full rounded border border-border-faint bg-surface px-2.5 py-1.5 text-sm text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none"
              />
            </label>
          </div>
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
  const [concluding, setConcluding] = useState(false);
  const [cOutcome, setCOutcome] = useState<"loser" | "inconclusive">("loser");
  const [cLearning, setCLearning] = useState("");
  const [cUplift, setCUplift] = useState("");
  const [cConf, setCConf] = useState("");
  const [pubSummary, setPubSummary] = useState(test.clientSummary ?? "");
  const [pubResult, setPubResult] = useState(test.clientResult ?? "");
  const [learning, setLearning] = useState(test.whyItWorked ?? "");
  const learningDirty = learning.trim() !== (test.whyItWorked ?? "").trim();
  // Re-sync when the record changes underneath us (e.g. a loss recorded via the
  // conclude form writes whyItWorked) so this field never shows a stale value.
  useEffect(() => {
    setLearning(test.whyItWorked ?? "");
  }, [test.whyItWorked]);

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
    <div className="fixed inset-0 z-50 flex justify-end bg-background/70" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6">
          <button onClick={onClose} className="absolute right-6 top-6 text-subtle transition-colors hover:text-foreground">
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
            <dl className="space-y-2 text-xs">
              <Row k="Variant" v={test.variantDesc} />
              <Row k="Metric" v={test.primaryMetric} />
              <Row k="Split" v={test.trafficSplit} />
              <Row k="Expected lift" v={typeof test.expectedLiftPct === "number" ? `${test.expectedLiftPct > 0 ? "+" : ""}${test.expectedLiftPct}%` : undefined} />
              <Row k="Actual lift" v={typeof test.upliftPct === "number" ? `${test.upliftPct > 0 ? "+" : ""}${test.upliftPct}%` : undefined} />
              <Row k="Confidence" v={typeof test.significanceReachedPct === "number" ? `${test.significanceReachedPct}%` : undefined} />
              {surface?.controlBenchmark && (
                <Row k="Control" v={Object.entries(surface.controlBenchmark).map(([m, val]) => `${m} ${val}`).join(" · ")} />
              )}
            </dl>
            {test.notes && <p className="mt-3 text-xs leading-relaxed text-muted">{test.notes}</p>}
          </Section>

          {/* What we learned — the reusable knowledge (§4). Free-text, always
              editable; this is the point of keeping the archive. */}
          <Section label="What we learned">
            <textarea
              value={learning}
              onChange={(e) => setLearning(e.target.value)}
              rows={3}
              placeholder="Why it moved (or didn't): the insight we'd carry into the next test."
              className="w-full resize-y rounded border border-border-faint bg-surface px-2.5 py-1.5 text-xs leading-relaxed text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none"
            />
            {learningDirty && (
              <div className="mt-2 flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => run(() => updateTest(test.id, { whyItWorked: learning.trim() || undefined }))}
                  className="rounded bg-foreground px-3 py-1.5 text-2xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Save learning
                </button>
                <button
                  onClick={() => setLearning(test.whyItWorked ?? "")}
                  className="rounded border border-border-faint px-3 py-1.5 text-2xs text-muted transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
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

              {/* Conclude a test — win OR loss both carry a recorded reason. Win
                  is the only path to Won (§6); a loss must record why it didn't
                  work, so the archive keeps the learning either way. */}
              {declaring ? (
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
              ) : concluding ? (
                <div className="mt-3 rounded border border-status-late/30 bg-status-late/5 p-3">
                  <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-status-late">
                    Record the result
                  </p>
                  <div className="mb-2 flex gap-2">
                    {(["loser", "inconclusive"] as const).map((o) => (
                      <button
                        key={o}
                        onClick={() => setCOutcome(o)}
                        className={`rounded border px-2.5 py-1 text-2xs font-medium capitalize transition-colors ${
                          cOutcome === o
                            ? "border-border bg-surface-raised text-foreground"
                            : "border-border-faint text-muted hover:text-foreground"
                        }`}
                      >
                        {TEST_OUTCOME_META[o].label}
                      </button>
                    ))}
                  </div>
                  <label className="mb-1 block text-3xs uppercase tracking-wider text-subtle">
                    What we learned (required)
                  </label>
                  <textarea
                    value={cLearning}
                    onChange={(e) => setCLearning(e.target.value)}
                    rows={2}
                    placeholder="Why it didn't win, and what we'd try next."
                    className="mb-2 w-full resize-y rounded border border-border-faint bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Uplift %" v={cUplift} set={setCUplift} placeholder="-3" />
                    <Field label="Confidence %" v={cConf} set={setCConf} placeholder="92" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={busy || !cLearning.trim()}
                      onClick={() =>
                        run(async () => {
                          await concludeTest(test.id, cOutcome, {
                            metric: test.primaryMetric,
                            upliftPct: cUplift.trim() ? Number(cUplift) : undefined,
                            confidencePct: cConf.trim() ? Number(cConf) : undefined,
                            whyItWorked: cLearning.trim(),
                          });
                          setConcluding(false);
                        })
                      }
                      className="rounded bg-status-late px-3 py-1.5 text-2xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      Record result
                    </button>
                    <button
                      onClick={() => setConcluding(false)}
                      className="rounded border border-border-faint px-3 py-1.5 text-2xs text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
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
                    onClick={() => setConcluding(true)}
                    className="rounded border border-border-faint px-3 py-1.5 text-2xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    Conclude, no win
                  </button>
                </div>
              )}
            </Section>
          )}

          {isTerminal && test.winEvidence && (
            <Section label="Declared win">
              <p className="text-xs text-foreground">{test.winEvidence.what}{test.winEvidence.magnitude ? ` · ${test.winEvidence.magnitude}` : ""}</p>
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
                <><EyeSlashIcon className="size-3.5" /> Not published, nothing leaks automatically</>
              )}
            </p>
            <label className="mb-1 block text-3xs uppercase tracking-wider text-subtle">What we&apos;re testing (client)</label>
            <textarea
              value={pubSummary}
              onChange={(e) => setPubSummary(e.target.value)}
              rows={2}
              className="mb-2 w-full resize-y rounded border border-border-faint bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-subtle focus:outline-none"
              placeholder="Plain-English description for the client…"
            />
            <label className="mb-1 block text-3xs uppercase tracking-wider text-subtle">Result (client)</label>
            <textarea
              value={pubResult}
              onChange={(e) => setPubResult(e.target.value)}
              rows={2}
              className="mb-2 w-full resize-y rounded border border-border-faint bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-subtle focus:outline-none"
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
    <section className="mt-6 border-t border-dashed border-border pt-6">
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
        className="w-full rounded border border-border-faint bg-surface px-2 py-1 text-xs text-foreground focus:border-subtle focus:outline-none"
      />
    </label>
  );
}
