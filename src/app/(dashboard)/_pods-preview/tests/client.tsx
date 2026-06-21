"use client";

import { useState } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon, PlusIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckSolid } from "@heroicons/react/24/solid";
import { AnnotationStrip, SectionHeader, Card } from "../components";
import { TESTS, callTest, clientName, type Test, type TestStatus, type CallTone } from "../strategist/strategist-data";

const STATUS_META: Record<TestStatus, { label: string; cls: string }> = {
  setup: { label: "Setup", cls: "bg-[#222222] text-[#71757D] border-[#2A2A2A]" },
  live: { label: "Live", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  analysing: { label: "Analysing", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  won: { label: "Won", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost: { label: "Lost", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  inconclusive: { label: "Inconclusive", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  archived: { label: "Archived", cls: "bg-[#222222] text-[#71757D] border-[#2A2A2A]" },
};
const CALL_META: Record<CallTone, string> = {
  ship: "bg-emerald-50 text-emerald-700 border-emerald-200",
  revert: "bg-rose-50 text-rose-700 border-rose-200",
  inconclusive: "bg-amber-50 text-amber-800 border-amber-200",
  continue: "bg-[#222222] text-[#71757D] border-[#2A2A2A]",
  setup: "bg-[#222222] text-[#71757D] border-[#2A2A2A]",
};

const QA_ITEMS = ["Variant displays correctly", "Tracking fires (events + revenue)", "No analytics breakage", "Mobile + desktop checked"];

export default function TestsClient() {
  const [tool, setTool] = useState<"Intelligems" | "Visually">("Intelligems");
  const [traffic, setTraffic] = useState<"50/50" | "90/10">("50/50");
  const [qa, setQa] = useState<Set<string>>(new Set());

  const inFlight = TESTS.filter((t) => t.status === "live" || t.status === "analysing" || t.status === "setup");
  const completed = TESTS.filter((t) => !(t.status === "live" || t.status === "analysing" || t.status === "setup"));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <AnnotationStrip title="What this is — Test Management (spec §1.8)">
        <p>
          Every deliverable ships with a test. <strong>No system cap</strong> on live tests — full
          visibility, strategist judgement. Status runs Setup → Live → Analysing → Won / Lost /
          Inconclusive → Archived, with calling-rule recommendations computed from confidence,
          runtime and guardrails.
        </p>
        <p>Standardised on <strong>Intelligems + Visually</strong> — strategist picks per engagement.</p>
      </AnnotationStrip>

      <h1 className="text-2xl font-semibold text-[#E5E5EA]">Test Management</h1>
      <p className="mb-6 text-sm text-[#71757D]">Every test across every engagement.</p>

      {/* New test setup */}
      <SectionHeader>
        <span className="inline-flex items-center gap-1.5">
          <PlusIcon className="size-4" /> New test setup
        </span>
      </SectionHeader>
      <Card className="mb-7">
        <div className="grid gap-4 md:grid-cols-2">
          <Step n={1} title="Hypothesis">
            <p className="rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] p-2.5 text-[12px] italic text-[#3A3A3A]">
              &quot;If we change X, then Y will improve, because Z.&quot;
            </p>
          </Step>
          <Step n={2} title="Variant configuration">
            <div className="flex gap-1.5">
              {["A/B", "Multivariate", "Split URL"].map((v, i) => (
                <span key={v} className={`rounded-md border px-2 py-1 text-[12px] ${i === 0 ? "border-white bg-white text-[#0C0C0C]" : "border-[#2A2A2A] text-[#71757D]"}`}>
                  {v}
                </span>
              ))}
            </div>
          </Step>
          <Step n={3} title="Traffic allocation">
            <div className="flex gap-1.5">
              {(["50/50", "90/10"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTraffic(t)}
                  className={`rounded-md border px-2 py-1 text-[12px] ${traffic === t ? "border-white bg-white text-[#0C0C0C]" : "border-[#2A2A2A] text-[#71757D] hover:text-[#E5E5EA]"}`}
                >
                  {t}
                </button>
              ))}
              <span className="self-center text-[11px] text-[#71757D]">90/10 for high-risk</span>
            </div>
          </Step>
          <Step n={4} title="Success metric + guardrails">
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-md border border-white bg-[#1B1B1B] px-1.5 py-0.5 text-white">Primary: ATC rate</span>
              <span className="rounded-md border border-[#2A2A2A] bg-[#181818] px-1.5 py-0.5 text-[#71757D]">Guardrail: RPV</span>
              <span className="rounded-md border border-[#2A2A2A] bg-[#181818] px-1.5 py-0.5 text-[#71757D]">Guardrail: Bounce</span>
            </div>
          </Step>
          <Step n={5} title="Sample size + min runtime">
            <p className="text-[12px] text-[#71757D]">Target from baseline traffic · min 14 days runtime</p>
          </Step>
          <Step n={6} title="QA checklist">
            <div className="space-y-1">
              {QA_ITEMS.map((q) => {
                const on = qa.has(q);
                return (
                  <button
                    key={q}
                    onClick={() => setQa((p) => { const n = new Set(p); n.has(q) ? n.delete(q) : n.add(q); return n; })}
                    className="flex items-center gap-1.5 text-left text-[12px]"
                  >
                    {on ? <CheckSolid className="size-4 text-emerald-500" /> : <CheckCircleIcon className="size-4 text-[#C5C5C5]" />}
                    <span className={on ? "text-[#71757D] line-through" : "text-[#3A3A3A]"}>{q}</span>
                  </button>
                );
              })}
            </div>
          </Step>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#F0F0F2] pt-3">
          <div className="flex items-center gap-2 text-[12px] text-[#71757D]">
            Tool:
            {(["Intelligems", "Visually"] as const).map((tname) => (
              <button
                key={tname}
                onClick={() => setTool(tname)}
                className={`rounded-md border px-2 py-1 text-[12px] font-medium ${tool === tname ? "border-white bg-white text-[#0C0C0C]" : "border-[#2A2A2A] text-[#71757D] hover:text-[#E5E5EA]"}`}
              >
                {tname}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[#71757D]">{qa.size}/{QA_ITEMS.length} QA · {traffic} · {tool}</span>
        </div>
      </Card>

      {/* In flight */}
      <SectionHeader right={<span className="text-[11px] text-[#71757D]">no system cap</span>}>
        In flight ({inFlight.length})
      </SectionHeader>
      <div className="mb-6 space-y-1.5">
        {inFlight.map((t) => (
          <TestRow key={t.id} t={t} />
        ))}
      </div>

      {/* Completed */}
      <SectionHeader>Completed ({completed.length})</SectionHeader>
      <div className="space-y-1.5">
        {completed.map((t) => (
          <TestRow key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#F0F0F2] bg-[#0C0C0C] p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="grid size-4 place-items-center rounded-full bg-[#1B1B1B] text-[9px] font-semibold text-white">{n}</span>
        <span className="text-[12px] font-semibold text-[#E5E5EA]">{title}</span>
      </div>
      {children}
    </div>
  );
}

function TestRow({ t }: { t: Test }) {
  const call = callTest(t);
  const breach = t.guardrails.some((g) => g.status === "breach");
  const terminal = t.status === "won" || t.status === "lost" || t.status === "inconclusive" || t.status === "archived";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#F0F0F2] bg-[#181818] px-3 py-2.5 shadow-[var(--shadow-soft)]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-[#E5E5EA]">{t.name}</span>
          {breach && !terminal && <ExclamationTriangleIcon className="size-4 shrink-0 text-rose-500" />}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-[#71757D]">
          {clientName(t.clientId)} · {t.primaryMetric} · {t.variant} · {t.tool}
        </div>
      </div>
      {t.confidence != null && (
        <span className="hidden w-16 shrink-0 text-right text-[11px] tabular-nums text-[#71757D] sm:block">{t.confidence}% conf</span>
      )}
      <span className="hidden w-16 shrink-0 text-right text-[11px] tabular-nums text-[#71757D] sm:block">{t.daysRunning}/{t.minRuntimeDays}d</span>
      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_META[t.status].cls}`}>
        {STATUS_META[t.status].label}
      </span>
      {terminal ? (
        t.liftPct != null ? (
          <span className={`hidden w-20 shrink-0 text-right text-[11px] font-semibold md:block ${t.liftPct >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {t.liftPct >= 0 ? "+" : ""}{t.liftPct}%
          </span>
        ) : (
          <span className="hidden w-20 shrink-0 text-right text-[11px] text-[#71757D] md:block">—</span>
        )
      ) : (
        <span className={`hidden shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium md:inline ${CALL_META[call.tone]}`}>
          {call.action}
        </span>
      )}
    </div>
  );
}
