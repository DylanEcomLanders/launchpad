"use client";

/* ── Proposal detail / editor ── */

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  DEFAULT_GUARANTEE,
  defaultMonthlyFee,
  defaultScopeItems,
  formatMoney,
  nowISO,
  proposalsStore,
  quotedTotal,
  slugify,
  uid,
} from "@/lib/proposals/data";
import {
  STATUS_LABEL,
  STATUS_NEXT,
  STATUS_TINT,
  type Proposal,
  type ProposalLineItem,
  type ProposalStatus,
  type ProposalTier,
} from "@/lib/proposals/types";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

const TIERS: ProposalTier[] = ["Entry", "Core", "VIP", "Custom"];

const STATUS_ACTION_LABEL: Record<ProposalStatus, string> = {
  draft: "Mark sent",
  sent: "Mark signed",
  signed: "Mark paid",
  paid: "Mark kicked off",
  kicked_off: "—",
  declined: "—",
};

export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await proposalsStore.getAll();
      if (cancelled) return;
      const found = rows.find((r) => r.id === id);
      if (!found) setNotFound(true);
      else setProposal(found);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const isFirstSave = useRef(true);
  useEffect(() => {
    if (!proposal) return;
    if (isFirstSave.current) { isFirstSave.current = false; return; }
    const t = setTimeout(async () => {
      setSaving(true);
      const stamped = { ...proposal, updated_at: nowISO() };
      await proposalsStore.update(proposal.id, stamped);
      setSaving(false);
      setSavedAt(stamped.updated_at);
    }, 600);
    return () => clearTimeout(t);
  }, [proposal]);

  function patch(p: Partial<Proposal>) {
    setProposal((prev) => (prev ? { ...prev, ...p } : prev));
  }

  function changeTier(tier: ProposalTier) {
    if (!proposal) return;
    /* Resetting scope + fee from defaults when admin picks a new
     * standard tier saves them re-typing the playbook items. Skip
     * scope reset for Custom (admin's own list). */
    if (tier === "Custom") {
      patch({ tier });
      return;
    }
    patch({
      tier,
      monthly_fee: defaultMonthlyFee(tier),
      scope_items: defaultScopeItems(tier).map((s) => ({
        id: uid(),
        label: s.label,
        detail: s.detail,
      })),
    });
  }

  function transition(next: ProposalStatus) {
    if (!proposal) return;
    const stamp: Partial<Proposal> = { status: next };
    if (next === "sent" && !proposal.sent_at) stamp.sent_at = nowISO();
    if (next === "signed" && !proposal.signed_at) stamp.signed_at = nowISO();
    if (next === "paid" && !proposal.paid_at) stamp.paid_at = nowISO();
    if (next === "kicked_off" && !proposal.kicked_off_at) stamp.kicked_off_at = nowISO();
    if (next === "declined" && !proposal.declined_at) stamp.declined_at = nowISO();
    patch(stamp);
  }

  async function copyShareLink() {
    if (!proposal) return;
    const url = `${window.location.origin}/proposal-output/${proposal.output_slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* deny */ }
  }

  async function deleteProposal() {
    if (!proposal) return;
    if (!window.confirm("Delete this proposal? Can't be undone.")) return;
    await proposalsStore.remove(proposal.id);
    router.push("/tools/proposals");
  }

  if (!isAdmin) {
    return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D]">Admin / CRO only.</p></div></div>);
  }
  if (!hydrated) {
    return (<div className="p-6 space-y-3 max-w-5xl mx-auto">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-32 bg-[#0C0C0C] rounded-xl animate-pulse" />))}</div>);
  }
  if (notFound || !proposal) {
    return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D] mb-3">Proposal not found.</p><Link href="/tools/proposals" className="text-[12px] uppercase tracking-wider text-emerald-300 hover:text-emerald-200">← Back</Link></div></div>);
  }

  const sharePath = `/proposal-output/${proposal.output_slug}`;
  const nextStatus = STATUS_NEXT[proposal.status];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/tools/proposals" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA] mb-3">
            <ArrowLeftIcon className="size-3.5" />
            All proposals
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.3)] shrink-0">
              <DocumentTextIcon className="size-4 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#E5E5EA] truncate">
              {proposal.brand_name || "Untitled proposal"}
            </h1>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[proposal.status]}`}>
              {STATUS_LABEL[proposal.status]}
            </span>
          </div>
          <div className="text-[12px] text-[#71757D] flex items-center gap-2 flex-wrap">
            <span>{saving ? "Saving…" : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loaded"}</span>
            <span>·</span>
            <button onClick={copyShareLink} className="inline-flex items-center gap-1 hover:text-[#E5E5EA]">
              {copied ? <CheckIcon className="size-3.5" /> : <ClipboardIcon className="size-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <span>·</span>
            <Link href={sharePath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-emerald-300">
              Open proposal
              <ArrowTopRightOnSquareIcon className="size-3" />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {nextStatus && (
            <button onClick={() => transition(nextStatus)} className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
              {STATUS_ACTION_LABEL[proposal.status]}
            </button>
          )}
          {proposal.status !== "declined" && proposal.status !== "kicked_off" && (
            <button onClick={() => transition("declined")} className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222] hover:text-rose-300">
              Declined
            </button>
          )}
          <button onClick={deleteProposal} className="p-1.5 rounded-md text-[#71757D] hover:text-rose-400 hover:bg-rose-500/[0.1]" title="Delete">
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Quoted total summary */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 ring-1 ring-emerald-500/20 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold mb-1">Quoted total</div>
          <div className="text-3xl font-semibold bg-gradient-to-br from-emerald-200 to-cyan-200 bg-clip-text text-transparent">
            {formatMoney(quotedTotal(proposal), proposal.fee_currency)}
          </div>
          <div className="text-[11px] text-[#71757D] mt-1">
            {formatMoney(proposal.monthly_fee, proposal.fee_currency)}/mo × {proposal.term_months}
            {proposal.prepay && ` − ${proposal.prepay_discount_pct}% prepay`}
          </div>
        </div>
        {proposal.declined_at && (
          <div className="text-[11px] text-rose-300">Declined {new Date(proposal.declined_at).toLocaleDateString()}</div>
        )}
      </div>

      {/* Identity */}
      <Section title="Identity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Brand name">
            <input value={proposal.brand_name} onChange={(e) => {
              const brand_name = e.target.value;
              const next: Partial<Proposal> = { brand_name };
              if (proposal.output_slug === proposal.id) next.output_slug = slugify(brand_name);
              patch(next);
            }} className={inputClass} />
          </Field>
          <Field label="Brand URL">
            <input value={proposal.brand_url} onChange={(e) => patch({ brand_url: e.target.value })} className={inputClass} placeholder="brand.com" />
          </Field>
          <Field label="Contact name">
            <input value={proposal.contact_name} onChange={(e) => patch({ contact_name: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Contact email">
            <input type="email" value={proposal.contact_email} onChange={(e) => patch({ contact_email: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Prepared by">
            <input value={proposal.prepared_by} onChange={(e) => patch({ prepared_by: e.target.value })} className={inputClass} placeholder="Dylan" />
          </Field>
          <Field label="Output slug">
            <input value={proposal.output_slug} onChange={(e) => patch({ output_slug: slugify(e.target.value || proposal.brand_name) })} className={inputClass} />
          </Field>
        </div>
      </Section>

      {/* Tier + scope */}
      <Section title="Tier + scope">
        <div className="grid grid-cols-1 md:grid-cols-[200px_180px_120px] gap-3">
          <Field label="Tier">
            <select value={proposal.tier} onChange={(e) => changeTier(e.target.value as ProposalTier)} className={inputClass}>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Monthly fee">
            <div className="flex gap-2">
              <input value={proposal.fee_currency} onChange={(e) => patch({ fee_currency: e.target.value })} className={`${inputClass} w-20`} />
              <input type="number" value={proposal.monthly_fee} onChange={(e) => patch({ monthly_fee: Number(e.target.value) || 0 })} className={inputClass} />
            </div>
          </Field>
          <Field label="Term (months)">
            <input type="number" value={proposal.term_months} onChange={(e) => patch({ term_months: Math.max(1, Number(e.target.value) || 1) })} className={inputClass} />
          </Field>
        </div>

        <div className="space-y-2 mt-2">
          <label className={labelClass}>What this tier includes (line items)</label>
          {proposal.scope_items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                value={item.label}
                onChange={(e) => {
                  const next = [...proposal.scope_items];
                  next[i] = { ...item, label: e.target.value };
                  patch({ scope_items: next });
                }}
                className={`${inputClass} flex-1`}
                placeholder="Line item"
              />
              <button onClick={() => patch({ scope_items: proposal.scope_items.filter((_, j) => j !== i) })} className="p-1 text-[#71757D] hover:text-rose-400">
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          ))}
          <button onClick={() => patch({ scope_items: [...proposal.scope_items, { id: uid(), label: "" } as ProposalLineItem] })} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA]">
            <PlusIcon className="size-3" />
            Add item
          </button>
        </div>

        <Field label="Custom scope notes (markdown, optional)">
          <textarea value={proposal.custom_scope_notes} onChange={(e) => patch({ custom_scope_notes: e.target.value })} rows={3} className={`${textareaClass} font-mono text-[13px]`} placeholder="Anything that varies from the standard tier scope." />
        </Field>
      </Section>

      {/* Terms */}
      <Section title="Terms">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Kickoff date">
            <input type="date" value={proposal.kickoff_date || ""} onChange={(e) => patch({ kickoff_date: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Payment method">
            <input value={proposal.payment_method} onChange={(e) => patch({ payment_method: e.target.value })} className={inputClass} placeholder="Whop / Stripe" />
          </Field>
          <Field label="Prepay (10% off term)">
            <label className="inline-flex items-center gap-2 mt-2">
              <input type="checkbox" checked={proposal.prepay} onChange={(e) => patch({ prepay: e.target.checked })} className="accent-emerald-500" />
              <span className="text-[13px] text-[#E5E5EA]">Prepaid {proposal.term_months}-mo term</span>
            </label>
          </Field>
        </div>
        <Field label="Guarantee (markdown)">
          <textarea value={proposal.guarantee_text} onChange={(e) => patch({ guarantee_text: e.target.value })} rows={4} className={`${textareaClass} font-mono text-[13px]`} />
          {proposal.guarantee_text !== DEFAULT_GUARANTEE && (
            <button onClick={() => patch({ guarantee_text: DEFAULT_GUARANTEE })} className="text-[10px] uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA] mt-1">
              Reset to playbook default
            </button>
          )}
        </Field>
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
  return (<div><label className={labelClass}>{label}</label>{children}</div>);
}
