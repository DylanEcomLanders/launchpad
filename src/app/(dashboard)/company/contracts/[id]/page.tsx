"use client";

/* ── Contract detail (admin) ──
 * /company/contracts/[id]. Renders the document with placeholders
 * resolved, surfaces signing status + signing URL, and provides:
 *   - Copy signing URL (for sharing with the team member)
 *   - Mark as Sent (flips draft → sent, sets sent_at)
 *   - Counter-sign (when status is team_signed)
 *   - Terminate (when active)
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  PaperAirplaneIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { agreementStore, nowISO } from "@/lib/agreements/data";
import type { Agreement } from "@/lib/agreements/types";
import { AGREEMENT_STATUS_META, AGREEMENT_KIND_LABEL } from "@/lib/agreements/types";
import { RenderedDocument } from "@/components/agreements/rendered-document";
import { SignaturePad } from "@/components/signature-pad";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingUrl, setSigningUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCounterSign, setShowCounterSign] = useState(false);
  const [counterName, setCounterName] = useState("");
  const [counterSig, setCounterSig] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [terminateReason, setTerminateReason] = useState("");
  const [showTerminate, setShowTerminate] = useState(false);

  useEffect(() => {
    agreementStore.getById(id).then((a) => {
      setAgreement(a);
      setLoading(false);
    });
    if (typeof window !== "undefined") {
      setSigningUrl(`${window.location.origin}/agreement/${id}`);
    }
  }, [id]);

  async function patch(updates: Partial<Agreement>) {
    if (!agreement) return;
    const now = nowISO();
    const next = { ...agreement, ...updates, updated_at: now };
    setAgreement(next);
    await agreementStore.update(agreement.id, { ...updates, updated_at: now });
  }
  async function markAsSent() {
    if (!agreement) return;
    await patch({ status: "sent", sent_at: nowISO() });
  }
  async function copySigningUrl() {
    try {
      await navigator.clipboard.writeText(signingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input
    }
  }
  async function counterSign() {
    if (!agreement || !counterName.trim() || !counterSig || submitting) return;
    setSubmitting(true);
    const now = nowISO();
    await patch({
      status: "active",
      counter_signed_at: now,
      counter_signed_name: counterName.trim(),
      counter_signature_image: counterSig,
    });
    setSubmitting(false);
    setShowCounterSign(false);
  }
  async function terminate() {
    if (!agreement || submitting) return;
    setSubmitting(true);
    await patch({
      status: "terminated",
      terminated_at: nowISO(),
      terminated_reason: terminateReason.trim() || undefined,
    });
    setSubmitting(false);
    setShowTerminate(false);
  }
  async function deleteAgreement() {
    if (!agreement) return;
    if (!confirm("Delete this agreement permanently? This can't be undone.")) return;
    await agreementStore.remove(agreement.id);
    router.push("/company/contracts");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-12">
        <div className="text-sm text-[#71757D]">Loading agreement...</div>
      </div>
    );
  }
  if (!agreement) {
    return (
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-12">
        <Link
          href="/company/contracts"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] transition-colors mb-6"
        >
          <ArrowLeftIcon className="size-4" />
          Back to contracts
        </Link>
        <div className="text-[15px] text-[#E5E5EA]">Agreement not found.</div>
      </div>
    );
  }

  const meta = AGREEMENT_STATUS_META[agreement.status];

  return (
    <div className="max-w-[940px] mx-auto px-4 md:px-8 py-8 pb-24">
      {/* Back */}
      <Link
        href="/company/contracts"
        className="inline-flex items-center gap-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] transition-colors mb-6"
      >
        <ArrowLeftIcon className="size-4" />
        Back to contracts
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded"
            style={{ background: meta.bg, color: meta.fg }}
          >
            {meta.label}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-[#222222] text-[#E5E5EA]">
            {AGREEMENT_KIND_LABEL[agreement.kind]}
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-[#E5E5EA]">
          {agreement.person_full_name}
        </h1>
        <div className="text-[13px] text-[#71757D] mt-1">
          {agreement.person_job_title || "—"} ·{" "}
          {agreement.person_employment_type === "employee" ? "Employee" : "Contractor"}
        </div>
      </div>

      {/* Signing URL */}
      {agreement.status !== "terminated" && (
        <div className="mb-6 p-4 bg-[#0F0F10] border border-white/[0.04] rounded-xl">
          <div className={labelClass}>Signing link</div>
          <div className="flex gap-2">
            <input readOnly value={signingUrl} className={inputClass} />
            <button
              onClick={copySigningUrl}
              className="inline-flex items-center gap-1.5 px-3 bg-white text-[#0C0C0C] text-[13px] font-medium rounded-lg hover:bg-[#F3F4F6] transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-3.5" /> Copied
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="size-3.5" /> Copy
                </>
              )}
            </button>
            {/* Download = browser print-to-PDF. The .printable-document
             * wrapper + the @media print stylesheet (globals.css) hide
             * the rest of the page and render just the contract on a
             * clean A4 white page. The Save-as-PDF option in every
             * modern browser does the rest. */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 bg-[#0F0F10] ring-1 ring-white/[0.08] text-[#E5E5EA] text-[13px] font-medium rounded-lg hover:ring-white/[0.16] transition-all shrink-0"
              title="Download PDF (Cmd+P → Save as PDF)"
            >
              <ArrowDownTrayIcon className="size-3.5" /> PDF
            </button>
          </div>
          <p className="text-[11px] text-[#71757D] mt-2 leading-relaxed">
            Share this URL with{" "}
            <span className="text-[#E5E5EA] font-medium">{agreement.person_full_name}</span>{" "}
            via Slack, email, or however you usually reach them. They open it, read,
            and sign in their browser.
          </p>
          {agreement.status === "draft" && (
            <button
              onClick={markAsSent}
              className="inline-flex items-center gap-1.5 mt-3 text-[12px] text-[#E5E5EA] hover:underline"
            >
              <PaperAirplaneIcon className="size-3.5" />
              Mark as sent
            </button>
          )}
        </div>
      )}

      {/* Counter-sign CTA */}
      {agreement.status === "team_signed" && !showCounterSign && (
        <div className="mb-6 p-4 bg-[#FFE4D6] border border-[#F0BB8E] rounded-xl">
          <div className="text-[13px] font-medium text-[#9A4A1F] mb-1">
            {agreement.person_full_name} has signed
          </div>
          <div className="text-[12px] text-[#7A4B0A] mb-3">
            Counter-sign to finalise the agreement.
          </div>
          <button
            onClick={() => setShowCounterSign(true)}
            className="px-3 py-1.5 bg-white text-[#0C0C0C] text-[13px] font-medium rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            Counter-sign now
          </button>
        </div>
      )}

      {/* Counter-sign form */}
      {showCounterSign && (
        <div className="mb-6 p-4 bg-[#0F0F10] border border-white rounded-xl">
          <div className="text-[13px] font-medium text-[#E5E5EA] mb-4">
            Counter-sign
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Your full name</label>
              <input
                className={inputClass}
                value={counterName}
                onChange={(e) => setCounterName(e.target.value)}
                placeholder="Dylan Evans"
              />
            </div>
            <div>
              <label className={labelClass}>Signature</label>
              <SignaturePad
                value={counterSig}
                onChange={setCounterSig}
                label="Your signature"
              />
              <button
                onClick={() => setCounterSig("")}
                className="text-[11px] text-[#71757D] hover:underline mt-1"
                type="button"
              >
                Clear signature
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCounterSign(false)}
                className="px-3 py-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={counterSign}
                disabled={!counterName.trim() || !counterSig || submitting}
                className="px-3 py-1.5 bg-white text-[#0C0C0C] text-[13px] font-medium rounded-lg hover:bg-[#F3F4F6] transition-colors disabled:opacity-40"
              >
                {submitting ? "Signing..." : "Sign and finalise"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Engagement details (inline-edit base fields) ──
       * Sits above the rendered preview. Edits patch the Agreement
       * row + the doc below re-renders live. */}
      <EngagementDetailsPanel agreement={agreement} onPatch={patch} />

      {/* ── Per-contract clause editor ──
       * The template_body was SNAPSHOTTED into this agreement at
       * creation. Editing here only affects THIS contract - the
       * master template at /company/contracts/templates is left
       * alone. Use this when a specific contractor needs slightly
       * different terms vs the template they were created from. */}
      <ClausesEditor agreement={agreement} onPatch={patch} />

      {/* Rendered document. Wrapped in .printable-document so the
       * @media print stylesheet (globals.css) hides everything else
       * on the page when you Cmd+P → Save as PDF. */}
      <div className="printable-document">
        <RenderedDocument agreement={agreement} />
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            href={`/company/people/${agreement.person_id}`}
            className="text-[12px] text-[#71757D] hover:text-[#E5E5EA] hover:underline transition-colors"
          >
            View person profile →
          </Link>
          <Link
            href="/company/contracts/templates"
            className="text-[12px] text-[#71757D] hover:text-[#E5E5EA] hover:underline transition-colors"
          >
            Edit master clauses →
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {agreement.status === "active" && !showTerminate && (
            <button
              onClick={() => setShowTerminate(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#B22B2B] hover:bg-[#FCE4E4] rounded-lg transition-colors"
            >
              <XCircleIcon className="size-3.5" />
              Terminate
            </button>
          )}
          <button
            onClick={deleteAgreement}
            className="text-[12px] text-[#71757D] hover:text-[#B22B2B] hover:underline transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Terminate form */}
      {showTerminate && (
        <div className="mt-4 p-4 bg-[#0F0F10] border border-[#FCE4E4] rounded-xl">
          <div className="text-[13px] font-medium text-[#B22B2B] mb-3">
            Terminate this agreement
          </div>
          <textarea
            className={`${textareaClass} text-[13px]`}
            rows={3}
            value={terminateReason}
            onChange={(e) => setTerminateReason(e.target.value)}
            placeholder="Reason (optional, for your records)"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setShowTerminate(false)}
              className="px-3 py-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={terminate}
              disabled={submitting}
              className="px-3 py-1.5 bg-[#B22B2B] text-white text-[13px] font-medium rounded-lg hover:bg-[#8B1F1F] transition-colors disabled:opacity-40"
            >
              {submitting ? "Terminating..." : "Confirm terminate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Engagement details panel ──
 * Inline-edit base fields. Renders above the contract preview so
 * changes show up live in the rendered doc below.
 *
 * Writes happen on blur (or change for selects) so the keystroke
 * doesn't trigger a Supabase round-trip per character. The patch
 * func is passed in from the parent and handles localStorage +
 * Supabase mirror.
 *
 * Read-only when status is anything other than draft, because
 * editing a contract the contractor has already signed is a
 * different workflow (terminate + re-issue). */
function EngagementDetailsPanel({
  agreement,
  onPatch,
}: {
  agreement: Agreement;
  onPatch: (updates: Partial<Agreement>) => Promise<void>;
}) {
  const [open, setOpen] = useState(agreement.status === "draft");
  const isDraft = agreement.status === "draft";

  /* Local form state - lets the user keep typing without the parent
   * re-rendering on every keystroke. Syncs to parent on blur. */
  const [form, setForm] = useState({
    person_full_name: agreement.person_full_name || "",
    person_email: agreement.person_email || "",
    person_job_title: agreement.person_job_title || "",
    person_employment_type: agreement.person_employment_type,
    start_date: agreement.start_date || "",
    comp_amount: agreement.comp_amount?.toString() || "",
    comp_currency: agreement.comp_currency || "GBP",
    comp_frequency: agreement.comp_frequency || "monthly",
    contractor_address: agreement.contractor_address || "",
    operating_as: agreement.operating_as || "Sole trader",
    reporting_to: agreement.reporting_to || "Dylan Evans",
    services_description: agreement.services_description || "",
    vat_status: agreement.vat_status || "Not VAT registered",
    restriction_months: agreement.restriction_months?.toString() || "6",
    contractor_company: agreement.contractor_company || "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function commit<K extends keyof Agreement>(
    key: K,
    value: Agreement[K] | string | number | undefined,
  ) {
    if (!isDraft) return;
    onPatch({ [key]: value } as Partial<Agreement>);
  }

  return (
    <div className="mb-6 bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.35)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
      >
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold">
            Engagement details
          </div>
          <div className="text-[13px] text-[#E5E5EA] mt-0.5">
            {isDraft
              ? "Edit the base fields - the contract below updates live"
              : "Locked: contract is past draft status"}
          </div>
        </div>
        <span className="text-[#71757D] text-[18px]">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-white/[0.04] space-y-4">
          {/* Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Full name">
              <input
                disabled={!isDraft}
                className={inputClass}
                value={form.person_full_name}
                onChange={(e) => set("person_full_name", e.target.value)}
                onBlur={(e) => commit("person_full_name", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                disabled={!isDraft}
                className={inputClass}
                value={form.person_email}
                onChange={(e) => set("person_email", e.target.value)}
                onBlur={(e) => commit("person_email", e.target.value || undefined)}
                placeholder="alex@ecomlanders.com"
              />
            </Field>
          </div>

          {/* Role + type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Role / title" className="md:col-span-2">
              <input
                disabled={!isDraft}
                className={inputClass}
                value={form.person_job_title}
                onChange={(e) => set("person_job_title", e.target.value)}
                onBlur={(e) => commit("person_job_title", e.target.value || undefined)}
                placeholder="Conversion Strategist"
              />
            </Field>
            <Field label="Type">
              <select
                disabled={!isDraft}
                className={inputClass}
                value={form.person_employment_type}
                onChange={(e) => {
                  const v = e.target.value as "employee" | "contractor";
                  set("person_employment_type", v);
                  commit("person_employment_type", v);
                }}
              >
                <option value="contractor">Contractor</option>
                <option value="employee">Employee</option>
              </select>
            </Field>
          </div>

          {/* Comp + start */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Comp amount">
              <input
                disabled={!isDraft}
                type="number"
                className={inputClass}
                value={form.comp_amount}
                onChange={(e) => set("comp_amount", e.target.value)}
                onBlur={(e) => commit("comp_amount", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="500"
              />
            </Field>
            <Field label="Currency">
              <select
                disabled={!isDraft}
                className={inputClass}
                value={form.comp_currency}
                onChange={(e) => {
                  set("comp_currency", e.target.value);
                  commit("comp_currency", e.target.value);
                }}
              >
                <option value="GBP">GBP £</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </select>
            </Field>
            <Field label="Frequency">
              <select
                disabled={!isDraft}
                className={inputClass}
                value={form.comp_frequency}
                onChange={(e) => {
                  set("comp_frequency", e.target.value);
                  commit("comp_frequency", e.target.value);
                }}
              >
                <option value="monthly">month</option>
                <option value="weekly">week</option>
                <option value="per_invoice">invoice</option>
              </select>
            </Field>
            <Field label="Start date">
              <input
                disabled={!isDraft}
                type="date"
                className={inputClass}
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                onBlur={(e) => commit("start_date", e.target.value || undefined)}
              />
            </Field>
          </div>

          {/* Engagement Schedule extras */}
          <div className="pt-2 border-t border-white/[0.04]">
            <div className="text-[10px] uppercase tracking-wider text-[#71757D] font-semibold mb-3">
              Engagement Schedule
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Operating as">
                <select
                  disabled={!isDraft}
                  className={inputClass}
                  value={form.operating_as}
                  onChange={(e) => {
                    set("operating_as", e.target.value);
                    commit("operating_as", e.target.value);
                  }}
                >
                  <option value="Sole trader">Sole trader</option>
                  <option value="Limited company">Limited company</option>
                  <option value="Overseas contractor">Overseas contractor</option>
                </select>
              </Field>
              <Field label="Contractor company (if Ltd)">
                <input
                  disabled={!isDraft}
                  className={inputClass}
                  value={form.contractor_company}
                  onChange={(e) => set("contractor_company", e.target.value)}
                  onBlur={(e) => commit("contractor_company", e.target.value || undefined)}
                  placeholder="Acme Ltd"
                />
              </Field>
              <Field label="Contractor address" className="md:col-span-2">
                <input
                  disabled={!isDraft}
                  className={inputClass}
                  value={form.contractor_address}
                  onChange={(e) => set("contractor_address", e.target.value)}
                  onBlur={(e) => commit("contractor_address", e.target.value || undefined)}
                  placeholder="123 Acacia Avenue, Manchester M1 1AA"
                />
              </Field>
              <Field label="Reporting to">
                <input
                  disabled={!isDraft}
                  className={inputClass}
                  value={form.reporting_to}
                  onChange={(e) => set("reporting_to", e.target.value)}
                  onBlur={(e) => commit("reporting_to", e.target.value || undefined)}
                />
              </Field>
              <Field label="VAT status">
                <input
                  disabled={!isDraft}
                  className={inputClass}
                  value={form.vat_status}
                  onChange={(e) => set("vat_status", e.target.value)}
                  onBlur={(e) => commit("vat_status", e.target.value || undefined)}
                  placeholder="Not VAT registered"
                />
              </Field>
              <Field label="Restriction months">
                <input
                  disabled={!isDraft}
                  type="number"
                  className={inputClass}
                  value={form.restriction_months}
                  onChange={(e) => set("restriction_months", e.target.value)}
                  onBlur={(e) => commit("restriction_months", e.target.value ? Number(e.target.value) : undefined)}
                />
              </Field>
              <Field label="Services description" className="md:col-span-2">
                <textarea
                  disabled={!isDraft}
                  className={textareaClass}
                  rows={3}
                  value={form.services_description}
                  onChange={(e) => set("services_description", e.target.value)}
                  onBlur={(e) => commit("services_description", e.target.value || undefined)}
                  placeholder="Conversion design, strategy, build-out for Shopify clients..."
                />
              </Field>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

/* ── Per-contract clauses editor ──
 *
 * Edits the snapshotted template_body.clauses on THIS agreement
 * only. Doesn't touch the master template. Use when a contractor
 * needs different terms vs the template they were created from
 * (extra IP carve-out, different restriction window, custom comp
 * clause, etc.).
 *
 * Add / edit / remove / reorder clauses. Body is plain text; the
 * existing render pipeline preserves whitespace + placeholder
 * substitution at display time. Edits write to template_body on
 * blur; rendered doc below updates live.
 *
 * Locked when status > draft because editing a signed contract
 * changes what the contractor agreed to. */
function ClausesEditor({
  agreement,
  onPatch,
}: {
  agreement: Agreement;
  onPatch: (updates: Partial<Agreement>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const isDraft = agreement.status === "draft";
  const clauses = agreement.template_body.clauses;

  async function commitClauses(next: Agreement["template_body"]["clauses"]) {
    if (!isDraft) return;
    await onPatch({
      template_body: { ...agreement.template_body, clauses: next },
    });
  }

  function patchClause(idx: number, updates: { heading?: string; body?: string }) {
    const next = clauses.map((c, i) => (i === idx ? { ...c, ...updates } : c));
    commitClauses(next);
  }

  function addClause() {
    const newClause = {
      id: `cl-${Math.random().toString(36).slice(2, 10)}`,
      heading: "New clause",
      body: "Clause body...",
    };
    commitClauses([...clauses, newClause]);
  }

  function removeClause(idx: number) {
    if (!window.confirm("Remove this clause from this contract?")) return;
    commitClauses(clauses.filter((_, i) => i !== idx));
  }

  function moveClause(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= clauses.length) return;
    const next = [...clauses];
    [next[idx], next[target]] = [next[target], next[idx]];
    commitClauses(next);
  }

  return (
    <div className="mb-6 bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.35)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
      >
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold">
            Clauses ({clauses.length})
          </div>
          <div className="text-[13px] text-[#E5E5EA] mt-0.5">
            {isDraft
              ? "Edit clauses on THIS contract only - master template unchanged"
              : "Locked: contract is past draft status"}
          </div>
        </div>
        <span className="text-[#71757D] text-[18px]">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-white/[0.04] space-y-3">
          {clauses.map((c, idx) => (
            <div
              key={c.id}
              className="bg-black/30 rounded-lg ring-1 ring-white/[0.04] p-3"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-[10px] font-mono text-[#71757D] pt-1.5 shrink-0 w-6 text-right">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <input
                  disabled={!isDraft}
                  defaultValue={c.heading}
                  onBlur={(e) => {
                    if (e.target.value !== c.heading) {
                      patchClause(idx, { heading: e.target.value });
                    }
                  }}
                  className="flex-1 h-8 px-2 bg-transparent text-[13px] font-semibold text-[#E5E5EA] focus:outline-none focus:bg-white/[0.04] rounded"
                />
                {isDraft && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveClause(idx, -1)}
                      disabled={idx === 0}
                      title="Move up"
                      className="px-1.5 text-[#71757D] hover:text-[#E5E5EA] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveClause(idx, 1)}
                      disabled={idx === clauses.length - 1}
                      title="Move down"
                      className="px-1.5 text-[#71757D] hover:text-[#E5E5EA] disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeClause(idx)}
                      title="Remove clause"
                      className="px-1.5 text-[#71757D] hover:text-rose-400"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <textarea
                disabled={!isDraft}
                defaultValue={c.body}
                onBlur={(e) => {
                  if (e.target.value !== c.body) {
                    patchClause(idx, { body: e.target.value });
                  }
                }}
                rows={Math.min(12, Math.max(3, c.body.split("\n").length))}
                className="w-full ml-8 px-2 py-1.5 bg-transparent text-[12px] text-[#C7C9CD] leading-relaxed focus:outline-none focus:bg-white/[0.04] rounded resize-y font-mono"
                style={{ width: "calc(100% - 2rem)" }}
              />
            </div>
          ))}
          {isDraft && (
            <button
              onClick={addClause}
              className="w-full py-2 text-[12px] text-[#71757D] hover:text-[#E5E5EA] hover:bg-white/[0.04] rounded-lg ring-1 ring-dashed ring-white/[0.08] transition-colors"
            >
              + Add clause
            </button>
          )}
        </div>
      )}
    </div>
  );
}
