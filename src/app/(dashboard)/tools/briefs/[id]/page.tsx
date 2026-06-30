"use client";

/* ── Brief detail / editor ── */

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { briefsStore, iceScore, nowISO, slugify } from "@/lib/briefs/data";
import {
  KIND_LABEL,
  KIND_TINT,
  STATUS_LABEL,
  STATUS_TINT,
  type Brief,
  type BriefStatus,
} from "@/lib/briefs/types";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

const STATUSES: BriefStatus[] = ["draft", "sent", "accepted", "in_progress", "done", "blocked"];

export default function BriefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [brief, setBrief] = useState<Brief | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await briefsStore.getAll();
      if (cancelled) return;
      const found = rows.find((r) => r.id === id);
      if (!found) setNotFound(true);
      else setBrief(found);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const isFirstSave = useRef(true);
  useEffect(() => {
    if (!brief) return;
    if (isFirstSave.current) { isFirstSave.current = false; return; }
    const t = setTimeout(async () => {
      setSaving(true);
      const stamped = { ...brief, updated_at: nowISO() };
      if (brief.status === "sent" && !brief.sent_at) stamped.sent_at = nowISO();
      await briefsStore.update(brief.id, stamped);
      setSaving(false);
      setSavedAt(stamped.updated_at);
    }, 600);
    return () => clearTimeout(t);
  }, [brief]);

  function patch(p: Partial<Brief>) {
    setBrief((prev) => (prev ? { ...prev, ...p } : prev));
  }

  async function copyShareLink() {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/brief-output/${brief.output_slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* deny */ }
  }
  async function deleteBrief() {
    if (!brief) return;
    if (!window.confirm("Delete this brief?")) return;
    await briefsStore.remove(brief.id);
    router.push("/tools/briefs");
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-background rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle">Admin / CRO only.</p></div></div>);
  if (!hydrated) return (<div className="p-6 space-y-3 max-w-5xl mx-auto">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-background rounded-xl animate-pulse" />)}</div>);
  if (notFound || !brief) return (<div className="p-6"><div className="bg-background rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle mb-3">Brief not found.</p><Link href="/tools/briefs" className="text-[12px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200">← Back</Link></div></div>);

  const sharePath = `/brief-output/${brief.output_slug}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/tools/briefs" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-subtle hover:text-foreground mb-3">
            <ArrowLeftIcon className="size-3.5" />
            All briefs
          </Link>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="size-8 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(6,182,212,0.3)] shrink-0">
              <DocumentDuplicateIcon className="size-4 text-white" />
            </div>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${KIND_TINT[brief.kind]}`}>
              {KIND_LABEL[brief.kind]}
            </span>
            <h1 className="text-2xl font-semibold text-foreground truncate">
              {brief.title || "Untitled"}
            </h1>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[brief.status]}`}>
              {STATUS_LABEL[brief.status]}
            </span>
          </div>
          <div className="text-[12px] text-subtle flex items-center gap-2 flex-wrap">
            <span>{saving ? "Saving…" : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loaded"}</span>
            <span>·</span>
            <button onClick={copyShareLink} className="inline-flex items-center gap-1 hover:text-foreground">
              {copied ? <CheckIcon className="size-3.5" /> : <ClipboardIcon className="size-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <span>·</span>
            <Link href={sharePath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-emerald-300">
              Open output
              <ArrowTopRightOnSquareIcon className="size-3" />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={brief.status} onChange={(e) => patch({ status: e.target.value as BriefStatus })} className={`${inputClass} w-auto`}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button onClick={deleteBrief} className="p-1.5 rounded-md text-subtle hover:text-rose-400 hover:bg-rose-500/[0.1]"><TrashIcon className="size-4" /></button>
        </div>
      </div>

      {/* Common header */}
      <Section title="Brief">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Title">
            <input value={brief.title} onChange={(e) => {
              const title = e.target.value;
              const next: Partial<Brief> = { title };
              if (brief.output_slug === brief.id) next.output_slug = slugify(title);
              patch(next);
            }} className={inputClass} />
          </Field>
          <Field label="Owner / assignee">
            <input value={brief.owner} onChange={(e) => patch({ owner: e.target.value })} className={inputClass} placeholder="Designer / dev name" />
          </Field>
          <Field label="Client">
            <input value={brief.client_name} onChange={(e) => patch({ client_name: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Project / page">
            <input value={brief.project_label} onChange={(e) => patch({ project_label: e.target.value })} className={inputClass} placeholder="e.g. New PDP" />
          </Field>
          <Field label="Deadline">
            <input type="date" value={brief.deadline || ""} onChange={(e) => patch({ deadline: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Audience">
            <input value={brief.audience} onChange={(e) => patch({ audience: e.target.value })} className={inputClass} placeholder="Who the work is for" />
          </Field>
        </div>
        <Field label="Objective (what this is meant to move)">
          <textarea value={brief.objective} onChange={(e) => patch({ objective: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} />
        </Field>
        <Field label="References + inspiration (markdown, links)">
          <textarea value={brief.references} onChange={(e) => patch({ references: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} />
        </Field>
      </Section>

      {/* Per-kind fields */}
      {brief.kind === "design" && (
        <Section title="Design">
          <Field label="Key message + hierarchy">
            <textarea value={brief.design_key_message || ""} onChange={(e) => patch({ design_key_message: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} />
          </Field>
          <Field label="Must-include elements (markdown)">
            <textarea value={brief.design_must_include || ""} onChange={(e) => patch({ design_must_include: e.target.value })} rows={4} className={`${textareaClass} font-mono text-[13px]`} placeholder="- Hero with USP\n- Reviews above fold\n- Trust markers in cart" />
          </Field>
          <Field label="Brand constraints">
            <textarea value={brief.design_brand_constraints || ""} onChange={(e) => patch({ design_brand_constraints: e.target.value })} rows={2} className={`${textareaClass} font-mono text-[13px]`} />
          </Field>
        </Section>
      )}

      {brief.kind === "dev" && (
        <Section title="Build">
          <Field label="What's being built (markdown)">
            <textarea value={brief.dev_what_built || ""} onChange={(e) => patch({ dev_what_built: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} />
          </Field>
          <Field label="Design link (Figma)">
            <input value={brief.dev_design_link || ""} onChange={(e) => patch({ dev_design_link: e.target.value })} className={inputClass} placeholder="https://figma.com/…" />
          </Field>
          <Field label="Functionality + interactions (markdown)">
            <textarea value={brief.dev_functionality || ""} onChange={(e) => patch({ dev_functionality: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Testing tool">
              <select value={brief.dev_testing_tool || ""} onChange={(e) => patch({ dev_testing_tool: e.target.value as Brief["dev_testing_tool"] })} className={inputClass}>
                <option value="">—</option>
                <option value="intelligems">Intelligems</option>
                <option value="visually">Visually</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Browsers / devices">
              <input value={brief.dev_browsers || ""} onChange={(e) => patch({ dev_browsers: e.target.value })} className={inputClass} placeholder="iOS Safari, Chrome desktop+mobile" />
            </Field>
          </div>
          <Field label="Variant logic (markdown)">
            <textarea value={brief.dev_variant_logic || ""} onChange={(e) => patch({ dev_variant_logic: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} placeholder="Control vs variant - how the testing tool branches users" />
          </Field>
          <Field label="Tracking + events">
            <textarea value={brief.dev_tracking_events || ""} onChange={(e) => patch({ dev_tracking_events: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} placeholder="GA4 events, Shopify events, Klaviyo triggers" />
          </Field>
          <Field label="QA criteria">
            <textarea value={brief.dev_qa_criteria || ""} onChange={(e) => patch({ dev_qa_criteria: e.target.value })} rows={2} className={`${textareaClass} font-mono text-[13px]`} />
          </Field>
        </Section>
      )}

      {brief.kind === "hypothesis" && (
        <Section title="Hypothesis">
          <Field label="Hypothesis (one line)">
            <textarea value={brief.hyp_hypothesis_line || ""} onChange={(e) => patch({ hyp_hypothesis_line: e.target.value })} rows={2} className={`${textareaClass} font-mono text-[13px]`} placeholder="Because we observed [data], we believe [change] will [outcome], measured by [metric]." />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Primary metric">
              <input value={brief.hyp_primary_metric || ""} onChange={(e) => patch({ hyp_primary_metric: e.target.value })} className={inputClass} placeholder="Conversion rate" />
            </Field>
            <Field label="Tool">
              <select value={brief.hyp_tool || ""} onChange={(e) => patch({ hyp_tool: e.target.value as Brief["hyp_tool"] })} className={inputClass}>
                <option value="">—</option>
                <option value="intelligems">Intelligems</option>
                <option value="visually">Visually</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
          <div>
            <label className={labelClass}>ICE</label>
            <div className="grid grid-cols-4 gap-2 items-end">
              <ScoreField label="Impact" value={brief.hyp_impact ?? 7} onChange={(v) => patch({ hyp_impact: v })} />
              <ScoreField label="Confidence" value={brief.hyp_confidence ?? 6} onChange={(v) => patch({ hyp_confidence: v })} />
              <ScoreField label="Ease" value={brief.hyp_ease ?? 5} onChange={(v) => patch({ hyp_ease: v })} />
              <div className="bg-emerald-500/15 ring-1 ring-emerald-500/30 rounded-md p-2 text-center">
                <div className="text-[9px] uppercase tracking-wider text-subtle">Score</div>
                <div className="text-xl font-mono text-emerald-300">{iceScore(brief)}</div>
              </div>
            </div>
          </div>
          <Field label="Control (current state, markdown)">
            <textarea value={brief.hyp_control_desc || ""} onChange={(e) => patch({ hyp_control_desc: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} />
          </Field>
          <Field label="Variant (proposed change, markdown)">
            <textarea value={brief.hyp_variant_desc || ""} onChange={(e) => patch({ hyp_variant_desc: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Traffic split">
              <input value={brief.hyp_traffic_split || ""} onChange={(e) => patch({ hyp_traffic_split: e.target.value })} className={inputClass} placeholder="50/50" />
            </Field>
            <Field label="Min runtime">
              <input value={brief.hyp_min_runtime || ""} onChange={(e) => patch({ hyp_min_runtime: e.target.value })} className={inputClass} placeholder="Until 95% significance / 2 weeks" />
            </Field>
          </div>
          <Field label="Success criteria">
            <textarea value={brief.hyp_success_criteria || ""} onChange={(e) => patch({ hyp_success_criteria: e.target.value })} rows={2} className={`${textareaClass} font-mono text-[13px]`} placeholder="What proves the hypothesis." />
          </Field>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="bg-background rounded-2xl ring-1 ring-white/[0.04] p-5"><h2 className="text-sm font-semibold text-foreground mb-4">{title}</h2><div className="space-y-3">{children}</div></div>);
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className={labelClass}>{label}</label>{children}</div>);
}
function ScoreField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (<div><div className="text-[9px] uppercase tracking-wider text-subtle mb-1">{label}</div><input type="number" min={1} max={10} value={value} onChange={(e) => onChange(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} className={`${inputClass} h-9 text-center`} /></div>);
}
