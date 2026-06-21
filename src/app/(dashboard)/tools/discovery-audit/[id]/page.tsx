"use client";

/* ── Discovery Audit detail / editor ──
 *
 * Single working draft, debounced auto-save back to Supabase. Six
 * collapsible sections mirror the slide spine of the output deck.
 * Status pill + action buttons (Mark ready / Send / Credited /
 * Passed) live in the header so the strategist sees the audit's
 * stage at a glance.
 */

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  DocumentMagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  discoveryAuditsStore,
  emptyFinding,
  iceScore,
  nowISO,
  slugify,
  STAGES,
  STAGE_META,
  STATUS_LABEL,
  STATUS_TINT,
} from "@/lib/discovery-audits/data";
import type {
  AuditFinding,
  AuditFunnelStage,
  AuditStatus,
  DiscoveryAudit,
  RecommendedTier,
} from "@/lib/discovery-audits/types";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

const TIERS: RecommendedTier[] = ["", "Entry", "Core", "VIP"];

const STATUS_NEXT: Record<AuditStatus, AuditStatus | null> = {
  draft: "ready",
  ready: "sent",
  sent: "credited",
  credited: null,
  passed: null,
};

const STATUS_ACTION_LABEL: Record<AuditStatus, string> = {
  draft: "Mark ready to send",
  ready: "Mark sent",
  sent: "Mark credited (client signed)",
  credited: "—",
  passed: "—",
};

export default function DiscoveryAuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [audit, setAudit] = useState<DiscoveryAudit | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* Load once. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await discoveryAuditsStore.getAll();
      if (cancelled) return;
      const found = rows.find((r) => r.id === id);
      if (!found) {
        setNotFound(true);
      } else {
        setAudit(found);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* Debounced auto-save when the audit object changes. The first
   * effect run (right after load) sets the baseline so we don't
   * write straight after reading. */
  const isFirstSave = useRef(true);
  useEffect(() => {
    if (!audit) return;
    if (isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }
    const t = setTimeout(async () => {
      setSaving(true);
      const stamped = { ...audit, updated_at: nowISO() };
      await discoveryAuditsStore.update(audit.id, stamped);
      setSaving(false);
      setSavedAt(stamped.updated_at);
    }, 600);
    return () => clearTimeout(t);
  }, [audit]);

  function patch(p: Partial<DiscoveryAudit>) {
    setAudit((prev) => (prev ? { ...prev, ...p } : prev));
  }

  async function copyShareLink() {
    if (!audit) return;
    const url = `${window.location.origin}/audit-output/${audit.output_slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard denied; fall back to no-op */
    }
  }

  async function transitionStatus(next: AuditStatus) {
    if (!audit) return;
    const stamp: Partial<DiscoveryAudit> = { status: next };
    if (next === "sent" && !audit.sent_at) stamp.sent_at = nowISO();
    if (next === "credited" && !audit.credited_at) stamp.credited_at = nowISO();
    patch(stamp);
  }

  async function deleteAudit() {
    if (!audit) return;
    if (!window.confirm(`Delete "${audit.brand_name || "untitled"}" audit? This can't be undone.`)) {
      return;
    }
    await discoveryAuditsStore.remove(audit.id);
    router.push("/tools/discovery-audit");
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-[#71757D]">Strategist tool. Admin/CRO only.</p>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="p-6 space-y-3 max-w-5xl mx-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 bg-[#0C0C0C] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (notFound || !audit) {
    return (
      <div className="p-6">
        <div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-[#71757D] mb-3">Audit not found.</p>
          <Link
            href="/tools/discovery-audit"
            className="text-[12px] uppercase tracking-wider text-emerald-300 hover:text-emerald-200"
          >
            ← Back to audits
          </Link>
        </div>
      </div>
    );
  }

  const sharePath = `/audit-output/${audit.output_slug}`;
  const nextStatus = STATUS_NEXT[audit.status];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/tools/discovery-audit"
            className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA] mb-3"
          >
            <ArrowLeftIcon className="size-3.5" />
            All audits
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.3)] shrink-0">
              <DocumentMagnifyingGlassIcon className="size-4 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#E5E5EA] truncate">
              {audit.brand_name || "Untitled audit"}
            </h1>
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[audit.status]}`}
            >
              {STATUS_LABEL[audit.status]}
            </span>
          </div>
          <div className="text-[12px] text-[#71757D] flex items-center gap-2 flex-wrap">
            <span>
              {saving
                ? "Saving…"
                : savedAt
                  ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Loaded"}
            </span>
            <span>·</span>
            <button
              onClick={copyShareLink}
              className="inline-flex items-center gap-1 hover:text-[#E5E5EA] transition-colors"
              title="Copy public deck URL"
            >
              {copied ? <CheckIcon className="size-3.5" /> : <ClipboardIcon className="size-3.5" />}
              {copied ? "Copied" : "Copy deck link"}
            </button>
            <span>·</span>
            <Link
              href={sharePath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-emerald-300 transition-colors"
            >
              Open deck
              <ArrowTopRightOnSquareIcon className="size-3" />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {nextStatus && (
            <button
              onClick={() => transitionStatus(nextStatus)}
              className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
            >
              {STATUS_ACTION_LABEL[audit.status]}
            </button>
          )}
          {audit.status !== "passed" && audit.status !== "credited" && (
            <button
              onClick={() => transitionStatus("passed")}
              className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222] hover:text-rose-300"
            >
              Mark passed
            </button>
          )}
          <button
            onClick={deleteAudit}
            className="p-1.5 rounded-md text-[#71757D] hover:text-rose-400 hover:bg-rose-500/[0.1]"
            title="Delete audit"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Identity */}
      <Section title="Identity" defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Brand name">
            <input
              value={audit.brand_name}
              onChange={(e) => {
                const brand_name = e.target.value;
                /* Auto-derive output slug from brand on first edit -
                 * stops being auto-derived as soon as admin manually
                 * sets the slug field. */
                const next: Partial<DiscoveryAudit> = { brand_name };
                if (audit.output_slug === audit.id || audit.output_slug === "") {
                  next.output_slug = slugify(brand_name);
                }
                patch(next);
              }}
              className={inputClass}
              placeholder="Brand"
            />
          </Field>
          <Field label="Brand URL">
            <input
              value={audit.brand_url}
              onChange={(e) => patch({ brand_url: e.target.value })}
              className={inputClass}
              placeholder="brand.com"
            />
          </Field>
          <Field label="Monthly revenue band">
            <input
              value={audit.revenue_band}
              onChange={(e) => patch({ revenue_band: e.target.value })}
              className={inputClass}
              placeholder="£300k/mo"
            />
          </Field>
          <Field label="Strategist (ran by)">
            <input
              value={audit.ran_by}
              onChange={(e) => patch({ ran_by: e.target.value })}
              className={inputClass}
              placeholder="Dylan / Ajay / etc."
            />
          </Field>
          <Field label="Contact name">
            <input
              value={audit.contact_name}
              onChange={(e) => patch({ contact_name: e.target.value })}
              className={inputClass}
              placeholder="Founder / CMO"
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              value={audit.contact_email}
              onChange={(e) => patch({ contact_email: e.target.value })}
              className={inputClass}
              placeholder="founder@brand.com"
            />
          </Field>
          <Field label="Fee">
            <div className="flex gap-2">
              <input
                value={audit.fee_currency}
                onChange={(e) => patch({ fee_currency: e.target.value })}
                className={`${inputClass} w-20`}
                placeholder="GBP"
              />
              <input
                type="number"
                value={audit.fee}
                onChange={(e) => patch({ fee: Number(e.target.value) || 0 })}
                className={inputClass}
                placeholder="1000"
              />
            </div>
          </Field>
          <Field label="Output slug">
            <input
              value={audit.output_slug}
              onChange={(e) =>
                patch({ output_slug: slugify(e.target.value || audit.brand_name) })
              }
              className={inputClass}
              placeholder="brand-name-2026"
            />
          </Field>
        </div>
      </Section>

      {/* Funnel snapshot */}
      <Section title="Funnel snapshot" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="Current CR">
            <input
              value={audit.current_conversion_rate}
              onChange={(e) => patch({ current_conversion_rate: e.target.value })}
              className={inputClass}
              placeholder="1.8%"
            />
          </Field>
          <Field label="Current AOV">
            <input
              value={audit.current_aov}
              onChange={(e) => patch({ current_aov: e.target.value })}
              className={inputClass}
              placeholder="£68"
            />
          </Field>
          <Field label="Primary traffic source">
            <input
              value={audit.primary_traffic_source}
              onChange={(e) => patch({ primary_traffic_source: e.target.value })}
              className={inputClass}
              placeholder="Paid social, Organic, Email"
            />
          </Field>
          <Field label="Primary device">
            <select
              value={audit.primary_device}
              onChange={(e) =>
                patch({ primary_device: e.target.value as DiscoveryAudit["primary_device"] })
              }
              className={inputClass}
            >
              <option value="">—</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
              <option value="mixed">Mixed</option>
            </select>
          </Field>
        </div>
        <Field label="Funnel overview (markdown)">
          <textarea
            value={audit.funnel_overview}
            onChange={(e) => patch({ funnel_overview: e.target.value })}
            rows={5}
            className={`${textareaClass} font-mono text-[13px]`}
            placeholder="Where they are now and the key metrics we can see from the outside."
          />
        </Field>
      </Section>

      {/* Findings */}
      <Section title={`Findings (${audit.findings.length})`} defaultOpen>
        <FindingsEditor
          findings={audit.findings}
          onChange={(findings) => patch({ findings })}
        />
      </Section>

      {/* Executive summary */}
      <Section title="Executive summary" defaultOpen>
        <p className="text-[11px] text-[#71757D] mb-2">
          3-5 bullets up top of the deck. A busy founder gets the value in 60s.
        </p>
        <textarea
          value={audit.executive_summary}
          onChange={(e) => patch({ executive_summary: e.target.value })}
          rows={5}
          className={`${textareaClass} font-mono text-[13px]`}
          placeholder={"- Headline opportunity one\n- Headline opportunity two\n- Headline opportunity three"}
        />
      </Section>

      {/* 30/60/90 plan */}
      <Section title="30 / 60 / 90 plan" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PlanColumn
            label="First 30 days"
            body={audit.plan_30.body}
            onChange={(body) => patch({ plan_30: { body } })}
          />
          <PlanColumn
            label="Day 30-60"
            body={audit.plan_60.body}
            onChange={(body) => patch({ plan_60: { body } })}
          />
          <PlanColumn
            label="Day 60-90"
            body={audit.plan_90.body}
            onChange={(body) => patch({ plan_90: { body } })}
          />
        </div>
      </Section>

      {/* Recommendation */}
      <Section title="Recommendation" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
          <Field label="Recommended tier">
            <select
              value={audit.recommended_tier}
              onChange={(e) =>
                patch({ recommended_tier: e.target.value as RecommendedTier })
              }
              className={inputClass}
            >
              {TIERS.map((t) => (
                <option key={t || "none"} value={t}>
                  {t || "—"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Why this tier (markdown)">
            <textarea
              value={audit.recommendation_notes}
              onChange={(e) => patch({ recommendation_notes: e.target.value })}
              rows={4}
              className={`${textareaClass} font-mono text-[13px]`}
              placeholder="Why this tier given the brand's traffic, ambition, internal capacity."
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

/* ─── Collapsible section ─── */
function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] rounded-2xl transition-colors"
      >
        <span className="text-sm font-semibold text-[#E5E5EA]">{title}</span>
        <ChevronDownIcon
          className={`size-4 text-[#71757D] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function PlanColumn({
  label,
  body,
  onChange,
}: {
  label: string;
  body: string;
  onChange: (body: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className={`${textareaClass} font-mono text-[13px]`}
        placeholder={"- What gets shipped\n- Sequenced from the findings"}
      />
    </div>
  );
}

/* ─── Findings editor ─── */
function FindingsEditor({
  findings,
  onChange,
}: {
  findings: AuditFinding[];
  onChange: (findings: AuditFinding[]) => void;
}) {
  const sorted = useMemo(
    () =>
      [...findings].sort(
        (a, b) =>
          STAGE_META[a.stage].order - STAGE_META[b.stage].order ||
          a.order - b.order,
      ),
    [findings],
  );

  function add(stage: AuditFunnelStage) {
    const order = findings.length === 0 ? 0 : Math.max(...findings.map((f) => f.order)) + 10;
    onChange([...findings, emptyFinding(stage, order)]);
  }
  function update(id: string, patch: Partial<AuditFinding>) {
    onChange(findings.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function remove(id: string) {
    onChange(findings.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <p className="text-[11px] italic text-[#71757D]">
          No findings yet. Add per funnel stage.
        </p>
      ) : (
        sorted.map((f) => (
          <FindingCard
            key={f.id}
            finding={f}
            onChange={(p) => update(f.id, p)}
            onDelete={() => remove(f.id)}
          />
        ))
      )}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <span className="text-[10px] uppercase tracking-wider text-[#71757D] mr-1">
          + Add finding:
        </span>
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => add(s)}
            className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222] hover:text-[#E5E5EA] transition-colors"
          >
            <PlusIcon className="size-3 inline-block mr-1 -translate-y-px" />
            {STAGE_META[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  onChange,
  onDelete,
}: {
  finding: AuditFinding;
  onChange: (patch: Partial<AuditFinding>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ice = iceScore(finding);

  return (
    <div className="bg-black/40 rounded-xl ring-1 ring-white/[0.06]">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 text-left flex items-center gap-3"
        >
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#71757D] shrink-0 px-2 py-0.5 rounded-full bg-[#1A1A1A]">
            {STAGE_META[finding.stage].label}
          </span>
          <span className="text-sm text-[#E5E5EA] truncate">
            {finding.title || <span className="italic text-[#71757D]">Untitled finding</span>}
          </span>
        </button>
        <span
          className="text-[11px] font-mono text-cyan-300 shrink-0"
          title="ICE score (Impact × Confidence × Ease)"
        >
          ICE {ice}
        </span>
        <button
          onClick={onDelete}
          className="p-1 text-[#71757D] hover:text-rose-400"
          title="Delete finding"
        >
          <TrashIcon className="size-3.5" />
        </button>
        <ChevronDownIcon
          onClick={() => setOpen((v) => !v)}
          className={`size-4 text-[#71757D] transition-transform cursor-pointer ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <div className="border-t border-white/[0.04] p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
            <Field label="Title">
              <input
                value={finding.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className={inputClass}
                placeholder="What's wrong, in one line"
              />
            </Field>
            <Field label="Funnel stage">
              <select
                value={finding.stage}
                onChange={(e) =>
                  onChange({ stage: e.target.value as AuditFunnelStage })
                }
                className={inputClass}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Observation (markdown)">
            <textarea
              value={finding.observation}
              onChange={(e) => onChange({ observation: e.target.value })}
              rows={3}
              className={`${textareaClass} font-mono text-[13px]`}
              placeholder="What we see + why it costs them."
            />
          </Field>
          <Field label="Recommended fix (markdown)">
            <textarea
              value={finding.recommended_fix}
              onChange={(e) => onChange({ recommended_fix: e.target.value })}
              rows={3}
              className={`${textareaClass} font-mono text-[13px]`}
              placeholder="What we'd do about it."
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Revenue cost estimate">
              <input
                value={finding.revenue_cost}
                onChange={(e) => onChange({ revenue_cost: e.target.value })}
                className={inputClass}
                placeholder="≈ £8k / month at current traffic"
              />
            </Field>
            <Field label="Screenshot URL (optional)">
              <input
                value={finding.screenshot_url || ""}
                onChange={(e) => onChange({ screenshot_url: e.target.value })}
                className={inputClass}
                placeholder="https://..."
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ScoreField
              label="Impact (1-10)"
              value={finding.impact}
              onChange={(v) => onChange({ impact: v })}
            />
            <ScoreField
              label="Confidence (1-10)"
              value={finding.confidence}
              onChange={(v) => onChange({ confidence: v })}
            />
            <ScoreField
              label="Ease (1-10)"
              value={finding.ease}
              onChange={(v) => onChange({ ease: v })}
            />
          </div>
          {finding.observation && (
            <details className="mt-2">
              <summary className="text-[10px] uppercase tracking-wider text-[#71757D] cursor-pointer hover:text-[#E5E5EA]">
                Preview observation
              </summary>
              <div className="mt-2 prose prose-invert prose-sm max-w-none prose-p:text-[#9CA3AF] prose-li:text-[#9CA3AF]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {finding.observation}
                </ReactMarkdown>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
        className={inputClass}
      />
    </Field>
  );
}
