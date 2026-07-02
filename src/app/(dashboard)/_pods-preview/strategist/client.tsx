"use client";

import { useMemo, useState } from "react";
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
import { fmtDayMonth, LEAD_STRATEGIST } from "../mock-data";
import { AnnotationStrip, SectionHeader, Avatar, Card } from "../components";
import {
  TESTS,
  HYPOTHESES,
  ENGAGEMENTS,
  BRIEFS,
  BRIEF_LOCK_LABEL,
  PRODUCT_LABEL,
  callTest,
  needsCall,
  daysToRefresh,
  clientName,
  type Test,
  type TestStatus,
  type CallTone,
  type HypOutcome,
} from "./strategist-data";

const STATUS_META: Record<TestStatus, { label: string; cls: string }> = {
  setup: { label: "Setup", cls: "bg-surface-raised text-subtle border-border" },
  live: { label: "Live", cls: "bg-info/10 text-info border-info/20" },
  analysing: { label: "Analysing", cls: "bg-info/10 text-info border-info/20" },
  won: { label: "Won", cls: "bg-success/10 text-success border-success/20" },
  lost: { label: "Lost", cls: "bg-danger/10 text-danger border-danger/20" },
  inconclusive: { label: "Inconclusive", cls: "bg-warning/10 text-warning border-warning/20" },
  archived: { label: "Archived", cls: "bg-surface-raised text-subtle border-border" },
};

const CALL_META: Record<CallTone, string> = {
  ship: "bg-success/10 text-success border-success/20",
  revert: "bg-danger/10 text-danger border-danger/20",
  inconclusive: "bg-warning/10 text-warning border-warning/20",
  continue: "bg-surface-raised text-subtle border-border",
  setup: "bg-surface-raised text-subtle border-border",
};

const OUTCOME_META: Record<HypOutcome, { label: string; cls: string }> = {
  untested: { label: "Untested", cls: "bg-surface-raised text-subtle border-border" },
  testing: { label: "Testing", cls: "bg-info/10 text-info border-info/20" },
  won: { label: "Won", cls: "bg-success/10 text-success border-success/20" },
  lost: { label: "Lost", cls: "bg-danger/10 text-danger border-danger/20" },
  inconclusive: { label: "Inconclusive", cls: "bg-warning/10 text-warning border-warning/20" },
};

export default function StrategistClient() {
  const [openTestId, setOpenTestId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const liveTests = TESTS.filter((t) => t.status === "live" || t.status === "analysing" || t.status === "setup");
  const sortedTests = useMemo(
    () => [...liveTests].sort((a, b) => Number(needsCall(b)) - Number(needsCall(a)) || (b.confidence ?? -1) - (a.confidence ?? -1)),
    [liveTests],
  );
  const needsCallCount = liveTests.filter(needsCall).length;
  const incompleteBriefs = BRIEFS.filter((b) => !b.complete).length;

  const openTest = TESTS.find((t) => t.id === openTestId) ?? null;

  const filteredHyps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HYPOTHESES;
    return HYPOTHESES.filter(
      (h) => h.statement.toLowerCase().includes(q) || h.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <AnnotationStrip title="What this is — Strategist Dashboard (spec §4.1)">
        <p>
          The Phase-1 Strategist home for {LEAD_STRATEGIST.name}, built to the operating-system spec:
          <strong> Tests in Flight</strong>, <strong>My Engagements</strong> (with Day 75 countdown),
          <strong> Brief Intake Queue</strong>, and a searchable <strong>Hypothesis Library</strong>.
        </p>
        <p>
          Per spec §1.8 there is <strong>no system cap on live tests</strong> — full visibility,
          strategist judgement. Calling-rule recommendations are computed from confidence, runtime and
          guardrails. Mock data; nothing here writes to live systems.
        </p>
      </AnnotationStrip>

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Strategist</h1>
        <span className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[11px] text-subtle">
          {LEAD_STRATEGIST.name} · Lead Strategist
        </span>
      </div>
      <p className="mb-5 text-sm text-subtle">Across all engagements and pods.</p>

      {/* summary strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryStat label="Tests live" value={liveTests.filter((t) => t.status !== "setup").length} />
        <SummaryStat label="Need a call" value={needsCallCount} tone={needsCallCount > 0 ? "amber" : "default"} />
        <SummaryStat label="Engagements" value={ENGAGEMENTS.length} />
        <SummaryStat label="Briefs to lock" value={incompleteBriefs} tone={incompleteBriefs > 0 ? "amber" : "default"} />
      </div>

      {/* Tests in Flight */}
      <Card className="mb-6">
        <SectionHeader right={<span className="text-[11px] text-subtle">No system cap · full visibility</span>}>
          <span className="inline-flex items-center gap-1.5">
            <BeakerIcon className="size-4" /> Tests in Flight
          </span>
        </SectionHeader>
        <div className="space-y-1.5">
          {sortedTests.map((t) => {
            const call = callTest(t);
            const breach = t.guardrails.some((g) => g.status === "breach");
            return (
              <button
                key={t.id}
                onClick={() => setOpenTestId(t.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-surface-raised bg-background px-3 py-2.5 text-left transition-all hover:border-muted hover:bg-surface"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-foreground">{t.name}</span>
                    {breach && <ExclamationTriangleIcon className="size-4 shrink-0 text-danger" />}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-subtle">
                    {clientName(t.clientId)} · {t.primaryMetric} · {t.tool}
                  </div>
                </div>
                {/* confidence */}
                <div className="hidden w-24 shrink-0 sm:block">
                  {t.confidence == null ? (
                    <span className="text-[11px] text-subtle">in setup</span>
                  ) : (
                    <div>
                      <div className="flex justify-between text-[10px] text-subtle">
                        <span>conf</span>
                        <span className="font-semibold tabular-nums text-foreground">{t.confidence}%</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className={`h-full ${t.confidence >= 95 ? "bg-success" : t.confidence >= 80 ? "bg-info" : "bg-muted"}`}
                          style={{ width: `${t.confidence}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="hidden w-20 shrink-0 text-right text-[11px] tabular-nums text-subtle sm:block">
                  {t.daysRunning}/{t.minRuntimeDays}d
                </div>
                <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_META[t.status].cls}`}>
                  {STATUS_META[t.status].label}
                </span>
                <span className={`hidden shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium md:inline ${CALL_META[call.tone]}`}>
                  {call.action}
                </span>
              </button>
            );
          })}
        </div>
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
            {ENGAGEMENTS.map((e) => {
              const refresh = daysToRefresh(e);
              return (
                <div key={e.id} className="rounded-lg border border-surface-raised bg-background p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-foreground">{e.name}</span>
                    <span className="shrink-0 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-subtle">
                      {e.product === "sprint" ? `Sprint · ${e.bucket}` : PRODUCT_LABEL[e.product]}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-subtle">{e.status}</div>
                  <div className="mt-1 text-[12px] text-foreground">→ {e.nextAction}</div>
                  {refresh != null && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className={`h-full ${refresh <= 10 ? "bg-danger" : refresh <= 20 ? "bg-warning" : "bg-success"}`}
                          style={{ width: `${Math.min(100, ((e.dayInCycle ?? 0) / 90) * 100)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] tabular-nums ${refresh <= 10 ? "font-semibold text-danger" : "text-subtle"}`}>
                        Day {e.dayInCycle}/90 · refresh in {refresh}d
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader right={<span className="text-[11px] text-subtle">{BRIEF_LOCK_LABEL}</span>}>
            <span className="inline-flex items-center gap-1.5">
              <InboxArrowDownIcon className="size-4" /> Brief Intake Queue
            </span>
          </SectionHeader>
          <div className="space-y-1.5">
            {BRIEFS.map((b) => (
              <div key={b.id} className="rounded-lg border border-surface-raised bg-background p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-foreground">{b.name}</span>
                  {b.complete ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-success">
                      <CheckCircleIcon className="size-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-warning">
                      <ExclamationTriangleIcon className="size-3.5" /> Asset gaps
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-subtle">Starts {fmtDayMonth(b.forStart)}</div>
                {b.assetGaps.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {b.assetGaps.map((g) => (
                      <span key={g} className="rounded-md border border-warning/20 bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Hypothesis Library */}
      <Card>
        <SectionHeader right={<span className="text-[11px] text-subtle">{filteredHyps.length} of {HYPOTHESES.length}</span>}>
          <span className="inline-flex items-center gap-1.5">
            <BookOpenIcon className="size-4" /> Hypothesis Library
          </span>
        </SectionHeader>
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hypotheses by text or tag (e.g. pdp, scarcity)…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-8 pr-3 text-[13px] shadow-[var(--shadow-soft)] focus:border-border focus:outline-none focus:ring-1 focus:ring-surface/10"
          />
        </div>
        <div className="divide-y divide-border">
          {filteredHyps.map((h) => (
            <div key={h.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[13px] text-foreground">{h.statement}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {h.tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => setQuery(t)}
                      className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-subtle hover:text-foreground"
                    >
                      {t}
                    </button>
                  ))}
                  {h.resultNote && <span className="text-[11px] text-subtle">· {h.resultNote}</span>}
                </div>
              </div>
              <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${OUTCOME_META[h.outcome].cls}`}>
                {OUTCOME_META[h.outcome].label}
              </span>
            </div>
          ))}
          {filteredHyps.length === 0 && (
            <p className="py-4 text-center text-[12px] text-muted">No hypotheses match &quot;{query}&quot;.</p>
          )}
        </div>
      </Card>

      {openTest && <TestPanel test={openTest} onClose={() => setOpenTestId(null)} />}
    </div>
  );
}

function SummaryStat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "amber" }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "amber" && value > 0 ? "text-warning" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function TestPanel({ test, onClose }: { test: Test; onClose: () => void }) {
  const call = callTest(test);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-subtle">
              {clientName(test.clientId)} · {STATUS_META[test.status].label}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{test.name}</h3>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-foreground">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* calling recommendation */}
        <div
          className={`mt-4 rounded-lg border p-3 ${CALL_META[call.tone]}`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Recommended call</div>
          <div className="mt-0.5 text-sm font-semibold">{call.action}</div>
          <div className="text-[12px] opacity-80">{call.why}</div>
        </div>

        <div className="mt-5">
          <SectionHeader>Hypothesis</SectionHeader>
          <p className="rounded-lg border border-border bg-background p-3 text-[13px] leading-relaxed text-subtle">
            {test.hypothesis}
          </p>
        </div>

        <div className="mt-5">
          <SectionHeader>Configuration</SectionHeader>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <Field label="Variant" value={test.variant} />
            <Field label="Traffic" value={test.traffic} />
            <Field label="Primary metric" value={test.primaryMetric} />
            <Field label="Tool" value={test.tool} />
            <Field label="Confidence" value={test.confidence == null ? "—" : `${test.confidence}%`} />
            <Field label="Runtime" value={`${test.daysRunning} / ${test.minRuntimeDays} days`} />
          </div>
        </div>

        <div className="mt-5">
          <SectionHeader>Guardrails</SectionHeader>
          <div className="space-y-1.5">
            {test.guardrails.map((g) => (
              <div key={g.name} className="flex items-center justify-between rounded-lg border border-surface-raised bg-surface px-3 py-2 text-[13px]">
                <span className="text-subtle">{g.name}</span>
                {g.status === "ok" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                    <CheckCircleIcon className="size-3.5" /> OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger">
                    <ExclamationTriangleIcon className="size-3.5" /> Breach
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionHeader>Sample target</SectionHeader>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
            <div className="h-full bg-surface" style={{ width: `${test.sampleTargetPct}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-subtle">{test.sampleTargetPct}% of target sample collected</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-raised bg-background px-2.5 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
      <div className="text-[13px] text-foreground">{value}</div>
    </div>
  );
}
