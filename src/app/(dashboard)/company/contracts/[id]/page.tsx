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
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 pb-24">
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
        <div className="mb-6 p-4 bg-[#181818] border border-[#2A2A2A] rounded-xl">
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
        <div className="mb-6 p-4 bg-[#181818] border border-white rounded-xl">
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

      {/* Rendered document */}
      <RenderedDocument agreement={agreement} />

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Link
          href={`/company/people/${agreement.person_id}`}
          className="text-[12px] text-[#71757D] hover:text-[#E5E5EA] hover:underline transition-colors"
        >
          View person profile →
        </Link>
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
        <div className="mt-4 p-4 bg-[#181818] border border-[#FCE4E4] rounded-xl">
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
