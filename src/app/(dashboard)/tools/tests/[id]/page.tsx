"use client";

/* ── Test detail / editor ── */

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BeakerIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { daysRunning, nowISO, sigProgress, testsStore } from "@/lib/tests/data";
import {
  OUTCOME_LABEL,
  STATUS_LABEL,
  STATUS_TINT,
  type AbTest,
  type TestOutcome,
  type TestStatus,
  type TestTool,
} from "@/lib/tests/types";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

const STATUSES: TestStatus[] = ["drafting", "live", "paused", "concluded", "killed"];

export default function TestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [test, setTest] = useState<AbTest | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await testsStore.getAll();
      if (cancelled) return;
      const found = rows.find((r) => r.id === id);
      if (!found) setNotFound(true);
      else setTest(found);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const isFirstSave = useRef(true);
  useEffect(() => {
    if (!test) return;
    if (isFirstSave.current) { isFirstSave.current = false; return; }
    const t = setTimeout(async () => {
      setSaving(true);
      const stamped = { ...test, updated_at: nowISO() };
      await testsStore.update(test.id, stamped);
      setSaving(false);
      setSavedAt(stamped.updated_at);
    }, 600);
    return () => clearTimeout(t);
  }, [test]);

  function patch(p: Partial<AbTest>) {
    setTest((prev) => (prev ? { ...prev, ...p } : prev));
  }

  function setLive() {
    if (!test) return;
    patch({ status: "live", started_at: test.started_at || nowISO() });
  }
  function setConcluded(outcome: TestOutcome) {
    if (!test) return;
    patch({ status: "concluded", outcome, ended_at: nowISO() });
  }

  async function deleteTest() {
    if (!test) return;
    if (!window.confirm("Delete this test?")) return;
    await testsStore.remove(test.id);
    router.push("/tools/tests");
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-surface rounded-2xl p-8 text-center border border-border"><p className="text-sm text-subtle">Admin / CRO only.</p></div></div>);
  if (!hydrated) return (<div className="p-6 space-y-3 max-w-5xl mx-auto">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-surface rounded-xl animate-pulse" />)}</div>);
  if (notFound || !test) return (<div className="p-6"><div className="bg-surface rounded-2xl p-8 text-center border border-border"><p className="text-sm text-subtle mb-3">Test not found.</p><Link href="/tools/tests" className="text-[12px] uppercase tracking-wider text-success">← Back</Link></div></div>);

  const days = daysRunning(test);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/tools/tests" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-subtle hover:text-foreground mb-3">
            <ArrowLeftIcon className="size-3.5" />
            All tests
          </Link>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="size-8 rounded-xl bg-surface-raised border border-border flex items-center justify-center shrink-0">
              <BeakerIcon className="size-4 text-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground truncate">
              {test.client_name || "Untitled"} {test.surface && `· ${test.surface}`}
            </h1>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[test.status]}`}>
              {STATUS_LABEL[test.status]}
            </span>
          </div>
          <div className="text-[12px] text-subtle">
            {saving ? "Saving…" : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loaded"}
            {days !== null && ` · ${days}d running`}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {test.status === "drafting" && (
            <button onClick={setLive} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-success text-white hover:bg-success">
              <PlayIcon className="size-3.5" />
              Go live
            </button>
          )}
          {test.status === "live" && (
            <>
              <button onClick={() => setConcluded("winner")} className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-success text-white hover:bg-success">Winner</button>
              <button onClick={() => setConcluded("loser")} className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-danger text-white hover:bg-danger">Loser</button>
              <button onClick={() => setConcluded("inconclusive")} className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-surface-raised text-foreground hover:bg-surface-hover">Inconclusive</button>
              <button onClick={() => patch({ status: "killed", ended_at: nowISO() })} className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-surface text-muted hover:text-danger" title="Kill the test">
                <StopIcon className="size-3.5 inline" />
              </button>
            </>
          )}
          <select value={test.status} onChange={(e) => patch({ status: e.target.value as TestStatus })} className={`${inputClass} w-auto text-[12px]`}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button onClick={deleteTest} className="p-1.5 rounded-md text-subtle hover:text-danger"><TrashIcon className="size-4" /></button>
        </div>
      </div>

      {/* Live progress */}
      {test.status === "live" && (
        <div className="bg-success/10 rounded-2xl p-5 border border-success/20">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-success font-semibold">
              Live · {days !== null ? `${days} days` : ""}
            </div>
            <div className="text-[11px] font-mono text-success">
              {test.significance_reached_pct ?? 0}% / {test.significance_target_pct}%
            </div>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-success rounded-full transition-all" style={{ width: `${sigProgress(test)}%` }} />
          </div>
        </div>
      )}

      {/* Setup */}
      <Section title="Setup">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Client"><input value={test.client_name} onChange={(e) => patch({ client_name: e.target.value })} className={inputClass} /></Field>
          <Field label="Surface (page / element)"><input value={test.surface} onChange={(e) => patch({ surface: e.target.value })} className={inputClass} placeholder="PDP / cart / etc." /></Field>
          <Field label="Tool">
            <select value={test.tool} onChange={(e) => patch({ tool: e.target.value as TestTool })} className={inputClass}>
              <option value="">—</option>
              <option value="intelligems">Intelligems</option>
              <option value="visually">Visually</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Traffic split"><input value={test.traffic_split} onChange={(e) => patch({ traffic_split: e.target.value })} className={inputClass} placeholder="50/50" /></Field>
          <Field label="Primary metric"><input value={test.primary_metric} onChange={(e) => patch({ primary_metric: e.target.value })} className={inputClass} /></Field>
          <Field label="Significance target (%)"><input type="number" value={test.significance_target_pct} onChange={(e) => patch({ significance_target_pct: Number(e.target.value) || 95 })} className={inputClass} /></Field>
        </div>
        <Field label="Hypothesis (one line)"><textarea value={test.hypothesis_line} onChange={(e) => patch({ hypothesis_line: e.target.value })} rows={2} className={`${textareaClass} font-mono text-[13px]`} placeholder="Because we observed X, we believe Y will Z." /></Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Control (markdown)"><textarea value={test.control_desc} onChange={(e) => patch({ control_desc: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} /></Field>
          <Field label="Variant (markdown)"><textarea value={test.variant_desc} onChange={(e) => patch({ variant_desc: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} /></Field>
        </div>
      </Section>

      {/* Live data + result */}
      <Section title="Result">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Baseline value"><input value={test.baseline_value} onChange={(e) => patch({ baseline_value: e.target.value })} className={inputClass} placeholder="1.82%" /></Field>
          <Field label="Variant value"><input value={test.variant_value} onChange={(e) => patch({ variant_value: e.target.value })} className={inputClass} placeholder="2.11%" /></Field>
          <Field label="Uplift (%)"><input type="number" value={test.uplift_pct ?? ""} onChange={(e) => patch({ uplift_pct: e.target.value ? Number(e.target.value) : undefined })} className={inputClass} placeholder="e.g. 15.9" /></Field>
          <Field label="Significance reached (%)"><input type="number" value={test.significance_reached_pct ?? ""} onChange={(e) => patch({ significance_reached_pct: e.target.value ? Number(e.target.value) : undefined })} className={inputClass} placeholder="e.g. 96" /></Field>
        </div>
        {test.outcome && (
          <div className="text-[12px] text-muted">
            Called <span className="text-success font-semibold">{OUTCOME_LABEL[test.outcome]}</span>
            {test.ended_at && ` on ${new Date(test.ended_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
          </div>
        )}
      </Section>

      {/* Write-up */}
      <Section title="Write-up + learnings">
        <Field label="Write-up (markdown)"><textarea value={test.write_up} onChange={(e) => patch({ write_up: e.target.value })} rows={5} className={`${textareaClass} font-mono text-[13px]`} placeholder="What we changed, what we saw, the result." /></Field>
        <Field label="Learnings - what this feeds next"><textarea value={test.learnings} onChange={(e) => patch({ learnings: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} /></Field>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="bg-surface rounded-2xl border border-border p-5"><h2 className="text-sm font-semibold text-foreground mb-4">{title}</h2><div className="space-y-3">{children}</div></div>);
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className={labelClass}>{label}</label>{children}</div>);
}
