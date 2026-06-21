"use client";

/* ── Lead detail / editor ──
 *
 * Single working draft, debounced auto-save. Identity, stage +
 * path, next-action enforcement, touches log (append-only), notes,
 * and linked artefacts (Discovery Audit + proposal). Risk callouts
 * live at the top so closers can act on the playbook's pipeline
 * rules without parsing dates by hand.
 */

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  SignalIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { discoveryAuditsStore, emptyAudit } from "@/lib/discovery-audits/data";
import type { DiscoveryAudit } from "@/lib/discovery-audits/types";
import {
  leadsStore,
  nowISO,
  risksFor,
  stageTransitionStamp,
  tierFromRevenueBand,
  uid,
} from "@/lib/leads/data";
import {
  PATH_LABEL,
  PATH_ORDER,
  STAGE_LABEL,
  STAGE_ORDER,
  TOUCH_LABEL,
  type Lead,
  type LeadPath,
  type LeadStage,
  type LeadTouch,
  type LeadTouchKind,
} from "@/lib/leads/types";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

const TOUCH_KIND_ORDER: LeadTouchKind[] = [
  "outreach_sent",
  "reply_received",
  "call_booked",
  "call_done",
  "audit_sent",
  "audit_delivered",
  "proposal_sent",
  "follow_up",
  "internal_note",
];

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [lead, setLead] = useState<Lead | null>(null);
  const [audits, setAudits] = useState<DiscoveryAudit[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [leads, auds] = await Promise.all([
        leadsStore.getAll(),
        discoveryAuditsStore.getAll(),
      ]);
      if (cancelled) return;
      const found = leads.find((l) => l.id === id);
      if (!found) setNotFound(true);
      else setLead(found);
      setAudits(auds);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* Debounced auto-save. */
  const isFirstSave = useRef(true);
  useEffect(() => {
    if (!lead) return;
    if (isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }
    const t = setTimeout(async () => {
      setSaving(true);
      const stamped = { ...lead, updated_at: nowISO() };
      await leadsStore.update(lead.id, stamped);
      setSaving(false);
      setSavedAt(stamped.updated_at);
    }, 600);
    return () => clearTimeout(t);
  }, [lead]);

  function patch(p: Partial<Lead>) {
    setLead((prev) => (prev ? { ...prev, ...p } : prev));
  }

  function transition(next: LeadStage) {
    if (!lead) return;
    patch(stageTransitionStamp(lead.stage, next));
  }

  function logTouch(kind: LeadTouchKind, summary: string) {
    if (!lead) return;
    const t: LeadTouch = {
      id: uid(),
      kind,
      at: nowISO(),
      by: lead.owner || "—",
      summary,
    };
    patch({
      touches: [t, ...lead.touches],
      last_touched_at: t.at,
      /* Stamp first-touch if this is the first one logged. */
      first_touch_at: lead.first_touch_at || t.at,
    });
  }

  async function linkExistingAudit(auditId: string) {
    if (!lead) return;
    /* Cross-link both sides so the audit detail knows its lead. */
    const audit = audits.find((a) => a.id === auditId);
    if (audit) {
      await discoveryAuditsStore.update(auditId, {
        credited_to_retainer_ref: lead.brand_name || lead.full_name,
      });
    }
    patch({ discovery_audit_id: auditId });
    if (lead.stage === "new" || lead.stage === "qualified") {
      transition("discovery_audit");
    }
  }

  async function createNewAudit() {
    if (!lead) return;
    const a = emptyAudit();
    a.brand_name = lead.brand_name;
    a.brand_url = lead.brand_url;
    a.contact_name = lead.full_name;
    a.contact_email = lead.email;
    a.revenue_band = lead.revenue_band;
    a.ran_by = lead.owner;
    a.credited_to_retainer_ref = lead.brand_name || lead.full_name;
    await discoveryAuditsStore.create(a);
    setAudits((prev) => [a, ...prev]);
    patch({ discovery_audit_id: a.id });
    if (lead.stage === "new" || lead.stage === "qualified") {
      transition("discovery_audit");
    }
  }

  async function deleteLead() {
    if (!lead) return;
    if (!window.confirm(`Delete "${lead.brand_name || lead.full_name || "untitled"}"? This can't be undone.`)) return;
    await leadsStore.remove(lead.id);
    router.push("/pipeline");
  }

  const risks = useMemo(() => (lead ? risksFor(lead) : []), [lead]);
  const tierHint = useMemo(
    () => (lead ? tierFromRevenueBand(lead.revenue_band) : null),
    [lead],
  );
  const linkedAudit = useMemo(
    () => (lead?.discovery_audit_id ? audits.find((a) => a.id === lead.discovery_audit_id) : null),
    [lead?.discovery_audit_id, audits],
  );

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-[#71757D]">Pipeline access is admin / CRO only.</p>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="p-6 space-y-3 max-w-5xl mx-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-[#0C0C0C] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div className="p-6">
        <div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-[#71757D] mb-3">Lead not found.</p>
          <Link href="/pipeline" className="text-[12px] uppercase tracking-wider text-emerald-300 hover:text-emerald-200">
            ← Back to pipeline
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/pipeline" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA] mb-3">
            <ArrowLeftIcon className="size-3.5" />
            All leads
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.3)] shrink-0">
              <SignalIcon className="size-4 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#E5E5EA] truncate">
              {lead.brand_name || lead.full_name || "Untitled lead"}
            </h1>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-[#1A1A1A] text-[#9CA3AF]">
              {STAGE_LABEL[lead.stage]}
            </span>
          </div>
          <div className="text-[12px] text-[#71757D]">
            {saving ? "Saving…" : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loaded"}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={lead.stage}
            onChange={(e) => transition(e.target.value as LeadStage)}
            className={`${inputClass} w-auto`}
          >
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{STAGE_LABEL[s]}</option>
            ))}
            <option value="nurture">Long-term nurture</option>
          </select>
          <button
            onClick={deleteLead}
            className="p-1.5 rounded-md text-[#71757D] hover:text-rose-400 hover:bg-rose-500/[0.1]"
            title="Delete lead"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Risk callouts */}
      {risks.length > 0 && (
        <div className="space-y-2">
          {risks.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[12px] ring-1 ${
                r.severity === "danger"
                  ? "bg-rose-500/10 text-rose-200 ring-rose-500/30"
                  : "bg-amber-500/10 text-amber-200 ring-amber-500/30"
              }`}
            >
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              {r.label}
            </div>
          ))}
        </div>
      )}

      {/* Identity */}
      <Section title="Identity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Contact name">
            <input value={lead.full_name} onChange={(e) => patch({ full_name: e.target.value })} className={inputClass} placeholder="Founder / CMO" />
          </Field>
          <Field label="Brand name">
            <input value={lead.brand_name} onChange={(e) => patch({ brand_name: e.target.value })} className={inputClass} placeholder="Brand" />
          </Field>
          <Field label="Brand URL">
            <input value={lead.brand_url} onChange={(e) => patch({ brand_url: e.target.value })} className={inputClass} placeholder="brand.com" />
          </Field>
          <Field label="Email">
            <input type="email" value={lead.email} onChange={(e) => patch({ email: e.target.value })} className={inputClass} placeholder="founder@brand.com" />
          </Field>
          <Field label="Phone (optional)">
            <input value={lead.phone || ""} onChange={(e) => patch({ phone: e.target.value })} className={inputClass} placeholder="+44…" />
          </Field>
          <Field label="Monthly revenue band">
            <div>
              <input
                value={lead.revenue_band}
                onChange={(e) => patch({ revenue_band: e.target.value })}
                className={inputClass}
                placeholder="£300k/mo"
              />
              {tierHint && (
                <div className="text-[10px] text-emerald-300/80 mt-1">
                  Suggested tier: <span className="font-semibold">{tierHint}</span>
                </div>
              )}
            </div>
          </Field>
        </div>
      </Section>

      {/* Pipeline */}
      <Section title="Pipeline">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Path in">
            <select
              value={lead.path}
              onChange={(e) => patch({ path: e.target.value as LeadPath })}
              className={inputClass}
            >
              {PATH_ORDER.map((p) => (
                <option key={p} value={p}>{PATH_LABEL[p]}</option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <input
              value={lead.source}
              onChange={(e) => patch({ source: e.target.value })}
              className={inputClass}
              placeholder="Outbound agency / X DM / Referral"
            />
          </Field>
          <Field label="Owner (closer / strategist)">
            <input
              value={lead.owner}
              onChange={(e) => patch({ owner: e.target.value })}
              className={inputClass}
              placeholder="Dylan / Ajay / etc."
            />
          </Field>
          <Field label="Next action date">
            <input
              type="date"
              value={lead.next_action_date || ""}
              onChange={(e) => patch({ next_action_date: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Next action (what's the explicit next step?)">
          <input
            value={lead.next_action}
            onChange={(e) => patch({ next_action: e.target.value })}
            className={inputClass}
            placeholder="Send audit · Book discovery call · Follow up on proposal"
          />
        </Field>
        {(lead.stage === "closed_won" || lead.stage === "closed_lost") && (
          <Field label="Close reason">
            <input
              value={lead.closed_reason || ""}
              onChange={(e) => patch({ closed_reason: e.target.value })}
              className={inputClass}
              placeholder={lead.stage === "closed_won" ? "Signed Core tier" : "Pricing / timing / no fit"}
            />
          </Field>
        )}
      </Section>

      {/* Linked Discovery Audit */}
      <Section title="Discovery Audit">
        {linkedAudit ? (
          <div className="bg-black/40 rounded-xl p-4 ring-1 ring-emerald-500/30 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.3)] shrink-0">
              <DocumentMagnifyingGlassIcon className="size-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#E5E5EA] truncate">
                {linkedAudit.brand_name || "Untitled audit"}
              </div>
              <div className="text-[11px] text-[#71757D]">
                {linkedAudit.findings.length} findings · {linkedAudit.status}
              </div>
            </div>
            <Link
              href={`/tools/discovery-audit/${linkedAudit.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA] shrink-0"
            >
              Open
              <ArrowTopRightOnSquareIcon className="size-3" />
            </Link>
            <button
              onClick={() => patch({ discovery_audit_id: undefined })}
              className="text-[10px] uppercase tracking-wider text-[#71757D] hover:text-rose-400"
              title="Unlink audit"
            >
              Unlink
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-[#71757D]">
              Start a Discovery Audit for this lead, or link one you&apos;ve already started.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={createNewAudit}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
              >
                <PlusIcon className="size-3.5" />
                New audit for this lead
              </button>
              {audits.filter((a) => a.status === "draft").length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) linkExistingAudit(e.target.value);
                  }}
                  defaultValue=""
                  className={`${inputClass} w-auto`}
                >
                  <option value="">Link existing draft…</option>
                  {audits
                    .filter((a) => a.status === "draft" && !a.credited_to_retainer_ref)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.brand_name || "Untitled"}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* Touches log */}
      <Section title={`Touches (${lead.touches.length})`}>
        <TouchLogger onLog={logTouch} />
        {lead.touches.length === 0 ? (
          <p className="text-[11px] italic text-[#71757D] mt-3">
            No touches logged. Every call / send / reply should land here.
          </p>
        ) : (
          <ul className="space-y-2 mt-3">
            {lead.touches.map((t) => (
              <li key={t.id} className="bg-black/40 rounded-lg p-3 ring-1 ring-white/[0.04]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300">
                    {TOUCH_LABEL[t.kind]}
                  </span>
                  <span className="text-[10px] text-[#71757D]">
                    {new Date(t.at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  {t.by && <span className="text-[10px] text-[#71757D]">· {t.by}</span>}
                </div>
                {t.summary && (
                  <p className="text-[13px] text-[#E5E5EA] whitespace-pre-wrap">{t.summary}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Notes */}
      <Section title="Notes">
        <textarea
          value={lead.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          rows={6}
          className={`${textareaClass} font-mono text-[13px]`}
          placeholder="Free-form notes - context, qualifying answers, intel."
        />
        {lead.notes.trim() && (
          <details className="mt-2">
            <summary className="text-[10px] uppercase tracking-wider text-[#71757D] cursor-pointer hover:text-[#E5E5EA]">
              Preview
            </summary>
            <div className="mt-2 prose prose-invert prose-sm max-w-none prose-p:text-[#9CA3AF] prose-li:text-[#9CA3AF]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{lead.notes}</ReactMarkdown>
            </div>
          </details>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
      <h2 className="text-sm font-semibold text-[#E5E5EA] mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
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

function TouchLogger({ onLog }: { onLog: (kind: LeadTouchKind, summary: string) => void }) {
  const [kind, setKind] = useState<LeadTouchKind>("follow_up");
  const [summary, setSummary] = useState("");

  return (
    <div className="bg-black/40 rounded-xl p-3 ring-1 ring-white/[0.04] space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as LeadTouchKind)}
          className={`${inputClass} h-9 text-[12px]`}
        >
          {TOUCH_KIND_ORDER.map((k) => (
            <option key={k} value={k}>{TOUCH_LABEL[k]}</option>
          ))}
        </select>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What happened. One line."
          className={`${inputClass} h-9 text-[12px]`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && summary.trim()) {
              onLog(kind, summary.trim());
              setSummary("");
            }
          }}
        />
        <button
          onClick={() => {
            if (!summary.trim()) return;
            onLog(kind, summary.trim());
            setSummary("");
          }}
          disabled={!summary.trim()}
          className="inline-flex items-center gap-1 px-3 h-9 rounded text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircleIcon className="size-4" />
          Log
        </button>
      </div>
    </div>
  );
}
