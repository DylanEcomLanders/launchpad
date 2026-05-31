"use client";

// Strategist Dashboard — spec §4.1 (+ §2.1 authority, §3.5 test lifecycle).
// Real + wired: reads the live pods-v2 data layer (tests, hypotheses,
// clients) plus strategy_briefs. The _pods-preview mock was the design spec
// (DECISIONS.md #2); this is the persisted version.
//
// Four panels per §4.1:
//   • Tests in Flight   — every live test, confidence + days-running, §1.8
//                         calling-rule recommendation, no system cap.
//   • My Engagements    — retainers + sprints, status, Day-75 countdown.
//   • Brief Intake Queue— strategy briefs awaiting lock (Friday-anchored).
//   • Hypothesis Library— searchable by text/tag, linked to results.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  XMarkIcon,
  BeakerIcon,
  RectangleStackIcon,
  InboxArrowDownIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  ensureSeed,
  getTests,
  getHypotheses,
  getClients,
} from "@/lib/pods-v2/data";
import { bootstrapPodsSync } from "@/lib/pods-v2/sync";
import { seedPodOsV2DemoData } from "@/lib/pods-v2/demo-seed";
import {
  callTest,
  needsCall,
  engagementKindOf,
  engagementDay,
  daysToRefresh,
  engagementWindow,
  ENGAGEMENT_WINDOW_LABEL,
  type CallTone,
} from "@/lib/pods-v2/calc";
import {
  TEST_STATUS_LABEL,
  HYPOTHESIS_OUTCOME_LABEL,
  RETAINER_VALUE_GBP,
  type PodTest,
  type PodHypothesis,
  type Client,
  type TestStatus,
  type HypothesisOutcome,
} from "@/lib/pods-v2/types";
import { listBriefs } from "@/lib/strategy/data";
import type { StrategyBrief } from "@/lib/strategy/types";
import { Card, SectionHeader, StatTile, Pill, Meter, EmptyState, fmtDayMonth } from "@/components/pod-os/ui";

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_TONE: Record<TestStatus, Parameters<typeof Pill>[0]["tone"]> = {
  setup: "default",
  live: "blue",
  analysing: "purple",
  won: "emerald",
  lost: "rose",
  inconclusive: "amber",
  archived: "muted",
};

const CALL_TONE: Record<CallTone, Parameters<typeof Pill>[0]["tone"]> = {
  ship: "emerald",
  revert: "rose",
  inconclusive: "amber",
  continue: "default",
  setup: "muted",
};

const OUTCOME_TONE: Record<HypothesisOutcome, Parameters<typeof Pill>[0]["tone"]> = {
  untested: "default",
  testing: "blue",
  won: "emerald",
  lost: "rose",
  inconclusive: "amber",
};

export default function StrategistClient() {
  const [tests, setTests] = useState<PodTest[]>([]);
  const [hypotheses, setHypotheses] = useState<PodHypothesis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [briefs, setBriefs] = useState<StrategyBrief[]>([]);
  const [openTestId, setOpenTestId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [today] = useState(todayYMD);

  const refresh = useCallback(() => {
    setTests(getTests());
    setHypotheses(getHypotheses());
    setClients(getClients());
  }, []);

  useEffect(() => {
    ensureSeed();
    refresh();
    bootstrapPodsSync().then((changed) => {
      if (changed) refresh();
    });
    listBriefs().then(setBriefs).catch(() => setBriefs([]));
  }, [refresh]);

  const clientName = useCallback(
    (id?: string) => (id ? (clients.find((c) => c.id === id)?.name ?? id) : "—"),
    [clients],
  );

  const liveTests = useMemo(
    () => tests.filter((t) => t.status === "live" || t.status === "analysing" || t.status === "setup"),
    [tests],
  );
  const sortedTests = useMemo(
    () =>
      [...liveTests].sort(
        (a, b) => Number(needsCall(b)) - Number(needsCall(a)) || (b.confidence ?? -1) - (a.confidence ?? -1),
      ),
    [liveTests],
  );
  const needsCallCount = liveTests.filter(needsCall).length;

  // My Engagements view-model from live clients.
  const engagements = useMemo(
    () =>
      clients
        .map((c) => {
          const kind = engagementKindOf(c);
          const day = engagementDay(c, today);
          const refreshIn = daysToRefresh(c, today);
          const window = day != null ? engagementWindow(day) : null;
          return { client: c, kind, day, refreshIn, window };
        })
        .sort((a, b) => (a.refreshIn ?? 999) - (b.refreshIn ?? 999)),
    [clients, today],
  );

  const openBriefs = briefs.filter((b) => b.status !== "approved" && !b.done);

  const filteredHyps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hypotheses;
    return hypotheses.filter(
      (h) => h.statement.toLowerCase().includes(q) || h.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [hypotheses, query]);

  const openTest = tests.find((t) => t.id === openTestId) ?? null;
  const isEmpty = tests.length === 0 && clients.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B]">Strategist</h1>
          <Pill tone="default">Lead Strategist · all engagements</Pill>
        </div>
        {isEmpty && (
          <button
            onClick={() => {
              seedPodOsV2DemoData();
              refresh();
            }}
            className="rounded-lg border border-[#1B1B1B] bg-[#1B1B1B] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2D2D2D]"
          >
            Load demo data
          </button>
        )}
      </div>
      <p className="mb-5 text-sm text-[#7A7A7A]">
        Strategic owner of every engagement — tests, hypotheses, briefs and the Day-75 cadence
        across all pods (§2.1, §4.1).
      </p>

      {isEmpty ? (
        <Card>
          <EmptyState>
            No engagements yet. Clients flow in from onboarding once assigned to a pod — or load a
            representative demo set to see the dashboard working.
          </EmptyState>
        </Card>
      ) : (
        <>
          {/* summary strip */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Tests live" value={liveTests.filter((t) => t.status !== "setup").length} />
            <StatTile
              label="Need a call"
              value={needsCallCount}
              tone={needsCallCount > 0 ? "amber" : "default"}
            />
            <StatTile label="Engagements" value={engagements.length} />
            <StatTile
              label="Briefs to lock"
              value={openBriefs.length}
              tone={openBriefs.length > 0 ? "amber" : "default"}
            />
          </div>

          {/* Tests in Flight */}
          <Card className="mb-6">
            <SectionHeader right={<span className="text-[11px] text-[#A0A0A0]">No system cap · full visibility</span>}>
              <span className="inline-flex items-center gap-1.5">
                <BeakerIcon className="size-4" /> Tests in Flight
              </span>
            </SectionHeader>
            {sortedTests.length === 0 ? (
              <EmptyState>No live tests right now.</EmptyState>
            ) : (
              <div className="space-y-1.5">
                {sortedTests.map((t) => {
                  const call = callTest(t);
                  const breach = t.guardrails.some((g) => g.status === "breach");
                  return (
                    <button
                      key={t.id}
                      onClick={() => setOpenTestId(t.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-[#F0F0F2] bg-[#FAFAFB] px-3 py-2.5 text-left transition-all hover:border-[#C5C5C5] hover:bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-[#1B1B1B]">{t.name}</span>
                          {breach && <ExclamationTriangleIcon className="size-4 shrink-0 text-rose-500" />}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-[#7A7A7A]">
                          {clientName(t.client_id)} · {t.primary_metric} · {t.tool}
                        </div>
                      </div>
                      <div className="hidden w-24 shrink-0 sm:block">
                        {t.confidence == null ? (
                          <span className="text-[11px] text-[#A0A0A0]">in setup</span>
                        ) : (
                          <div>
                            <div className="flex justify-between text-[10px] text-[#7A7A7A]">
                              <span>conf</span>
                              <span className="font-semibold tabular-nums text-[#1B1B1B]">{t.confidence}%</span>
                            </div>
                            <Meter
                              className="mt-0.5"
                              pct={t.confidence}
                              tone={t.confidence >= 95 ? "emerald" : t.confidence >= 80 ? "blue" : "ink"}
                            />
                          </div>
                        )}
                      </div>
                      <div className="hidden w-20 shrink-0 text-right text-[11px] tabular-nums text-[#7A7A7A] sm:block">
                        {t.days_running}/{t.min_runtime_days}d
                      </div>
                      <Pill tone={STATUS_TONE[t.status]}>{TEST_STATUS_LABEL[t.status]}</Pill>
                      <span className="hidden md:inline">
                        <Pill tone={CALL_TONE[call.tone]}>{call.action}</Pill>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* My Engagements + Brief Intake */}
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionHeader>
                <span className="inline-flex items-center gap-1.5">
                  <RectangleStackIcon className="size-4" /> My Engagements
                </span>
              </SectionHeader>
              <div className="space-y-1.5">
                {engagements.map(({ client: c, kind, day, refreshIn, window }) => (
                  <div key={c.id} className="rounded-lg border border-[#F0F0F2] bg-[#FAFAFB] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-[#1B1B1B]">{c.name}</span>
                      <Pill tone={kind === "retainer" ? "blue" : "default"}>
                        {kind === "retainer"
                          ? `Retainer · ${RETAINER_VALUE_GBP[c.retainer_tier] ? `£${RETAINER_VALUE_GBP[c.retainer_tier] / 1000}k` : "—"}`
                          : "Sprint"}
                      </Pill>
                    </div>
                    {window && (
                      <div className="mt-1 text-[11px] text-[#7A7A7A]">{ENGAGEMENT_WINDOW_LABEL[window]}</div>
                    )}
                    {kind === "retainer" && day != null && refreshIn != null && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <Meter
                          pct={(day / 90) * 100}
                          tone={refreshIn <= 10 ? "rose" : refreshIn <= 20 ? "amber" : "emerald"}
                        />
                        <span
                          className={`shrink-0 text-[10px] tabular-nums ${refreshIn <= 10 ? "font-semibold text-rose-700" : "text-[#7A7A7A]"}`}
                        >
                          Day {day}/90 · refresh {refreshIn <= 0 ? "due" : `in ${refreshIn}d`}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHeader right={<span className="text-[11px] text-[#A0A0A0]">Briefs lock Friday 5pm</span>}>
                <span className="inline-flex items-center gap-1.5">
                  <InboxArrowDownIcon className="size-4" /> Brief Intake Queue
                </span>
              </SectionHeader>
              {briefs.length === 0 ? (
                <EmptyState>
                  No briefs in the queue. Briefs are auto-created when a client is assigned from
                  onboarding (needs Supabase configured).
                </EmptyState>
              ) : (
                <div className="space-y-1.5">
                  {briefs.map((b) => {
                    const ready = b.status === "approved" || b.done;
                    return (
                      <div key={b.id} className="rounded-lg border border-[#F0F0F2] bg-[#FAFAFB] p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-[#1B1B1B]">{b.client_name}</span>
                          {ready ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-700">
                              <CheckCircleIcon className="size-3.5" /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-amber-700">
                              <ExclamationTriangleIcon className="size-3.5" /> {b.status.replace("_", " ")}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#7A7A7A]">
                          {b.pod_id} · received {b.onboarding_received}
                        </div>
                        {b.deliverables.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {b.deliverables.map((d, i) => (
                              <Pill key={i} tone="default">
                                {d.label ?? d.type}
                              </Pill>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Hypothesis Library */}
          <Card>
            <SectionHeader
              right={<span className="text-[11px] text-[#A0A0A0]">{filteredHyps.length} of {hypotheses.length}</span>}
            >
              <span className="inline-flex items-center gap-1.5">
                <BookOpenIcon className="size-4" /> Hypothesis Library
              </span>
            </SectionHeader>
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#A0A0A0]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hypotheses by text or tag (e.g. pdp, scarcity)…"
                className="w-full rounded-lg border border-[#E5E5EA] bg-white py-2 pl-8 pr-3 text-[13px] shadow-[var(--shadow-soft)] focus:border-[#1B1B1B] focus:outline-none focus:ring-1 focus:ring-[#1B1B1B]/10"
              />
            </div>
            {hypotheses.length === 0 ? (
              <EmptyState>No hypotheses logged yet.</EmptyState>
            ) : (
              <div className="divide-y divide-[#F0F0F2]">
                {filteredHyps.map((h) => (
                  <div key={h.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-[13px] text-[#1B1B1B]">{h.statement}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {h.tags.map((t) => (
                          <button
                            key={t}
                            onClick={() => setQuery(t)}
                            className="rounded-md border border-[#E5E5EA] bg-[#F7F8FA] px-1.5 py-0.5 text-[10px] text-[#7A7A7A] hover:text-[#1B1B1B]"
                          >
                            {t}
                          </button>
                        ))}
                        {h.result_note && <span className="text-[11px] text-[#7A7A7A]">· {h.result_note}</span>}
                      </div>
                    </div>
                    <Pill tone={OUTCOME_TONE[h.outcome]}>{HYPOTHESIS_OUTCOME_LABEL[h.outcome]}</Pill>
                  </div>
                ))}
                {filteredHyps.length === 0 && (
                  <EmptyState>No hypotheses match &quot;{query}&quot;.</EmptyState>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {openTest && (
        <TestDrawer test={openTest} clientName={clientName(openTest.client_id)} onClose={() => setOpenTestId(null)} />
      )}
    </div>
  );
}

function TestDrawer({
  test,
  clientName,
  onClose,
}: {
  test: PodTest;
  clientName: string;
  onClose: () => void;
}) {
  const call = callTest(test);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-[#E5E5EA] bg-white p-6 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#A0A0A0]">
              {clientName} · {TEST_STATUS_LABEL[test.status]}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-[#1B1B1B]">{test.name}</h3>
          </div>
          <button onClick={onClose} className="text-[#A0A0A0] hover:text-[#1B1B1B]">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className={`mt-4 rounded-lg border p-3 ${CALL_BG[call.tone]}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Recommended call (§1.8)</div>
          <div className="mt-0.5 text-sm font-semibold">{call.action}</div>
          <div className="text-[12px] opacity-80">{call.why}</div>
        </div>

        <Field.Section label="Hypothesis">
          <p className="rounded-lg border border-[#E5E5EA] bg-[#F7F8FA] p-3 text-[13px] leading-relaxed text-[#3A3A3A]">
            {test.hypothesis}
          </p>
        </Field.Section>

        <Field.Section label="Configuration">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <Field label="Variant" value={test.variant} />
            <Field label="Traffic" value={test.traffic} />
            <Field label="Primary metric" value={test.primary_metric} />
            <Field label="Tool" value={test.tool} />
            <Field label="Confidence" value={test.confidence == null ? "—" : `${test.confidence}%`} />
            <Field label="Runtime" value={`${test.days_running} / ${test.min_runtime_days} days`} />
          </div>
        </Field.Section>

        <Field.Section label="Guardrails">
          <div className="space-y-1.5">
            {test.guardrails.map((g) => (
              <div
                key={g.name}
                className="flex items-center justify-between rounded-lg border border-[#F0F0F2] bg-white px-3 py-2 text-[13px]"
              >
                <span className="text-[#3A3A3A]">{g.name}</span>
                {g.status === "ok" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <CheckCircleIcon className="size-3.5" /> OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
                    <ExclamationTriangleIcon className="size-3.5" /> Breach
                  </span>
                )}
              </div>
            ))}
          </div>
        </Field.Section>

        <Field.Section label="Sample target">
          <Meter pct={test.sample_target_pct} tone="ink" className="h-2" />
          <div className="mt-1 text-[11px] text-[#7A7A7A]">
            {test.sample_target_pct}% of target sample collected
          </div>
        </Field.Section>
      </div>
    </div>
  );
}

const CALL_BG: Record<CallTone, string> = {
  ship: "border-emerald-200 bg-emerald-50 text-emerald-800",
  revert: "border-rose-200 bg-rose-50 text-rose-800",
  inconclusive: "border-amber-200 bg-amber-50 text-amber-800",
  continue: "border-[#E5E5EA] bg-[#F7F8FA] text-[#3A3A3A]",
  setup: "border-[#E5E5EA] bg-[#F3F3F5] text-[#7A7A7A]",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#F0F0F2] bg-[#FAFAFB] px-2.5 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">{label}</div>
      <div className="text-[13px] text-[#1B1B1B]">{value}</div>
    </div>
  );
}
Field.Section = function FieldSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-sm font-semibold text-[#1B1B1B]">{label}</div>
      {children}
    </div>
  );
};
