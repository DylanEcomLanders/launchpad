"use client";

/* ── Public agreement signing page ──
 * /agreement/[id]. Public, unauthenticated. Anyone with the link can
 * sign on behalf of the agreement's named team member. The id IS the
 * signing token — guessing requires the full crypto.randomUUID-style
 * id, and we expose nothing else on the URL.
 *
 * Single route serves both NDAs and Contracts; the page adapts copy
 * based on agreement.kind. After the team member signs the page
 * shows a confirmation telling them Dylan will counter-sign and the
 * final document will land in their team hub.
 */

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { Logo } from "@/components/logo";
import { agreementStore, nowISO } from "@/lib/agreements/data";
import type { Agreement } from "@/lib/agreements/types";
import { AGREEMENT_KIND_LABEL } from "@/lib/agreements/types";
import { RenderedDocument } from "@/components/agreements/rendered-document";
import { SignaturePad } from "@/components/signature-pad";
import { inputClass } from "@/lib/form-styles";

export default function PublicAgreementPage() {
  const params = useParams();
  const id = params.id as string;
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [agreed, setAgreed] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    agreementStore.getById(id).then((a) => {
      if (!a) setNotFound(true);
      else {
        setAgreement(a);
        setSignerName(a.person_full_name);
      }
      setLoading(false);
    });
  }, [id]);

  async function sign() {
    if (!agreement) return;
    if (!agreed) return setError("Please tick the agreement checkbox first.");
    if (!signerName.trim()) return setError("Please type your full name.");
    if (!signature) return setError("Please draw your signature.");
    setSubmitting(true);
    setError("");
    const now = nowISO();
    try {
      await agreementStore.update(agreement.id, {
        status: "team_signed",
        team_signed_at: now,
        team_signed_name: signerName.trim(),
        team_signature_image: signature,
        updated_at: now,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-[#7A7A7A]">Loading agreement...</div>
      </div>
    );
  }
  if (notFound || !agreement) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-[#1B1B1B] mb-2">
            Agreement not found
          </h1>
          <p className="text-[13px] text-[#7A7A7A]">
            This link may have expired or been deleted. Check with the person
            who shared it.
          </p>
        </div>
      </div>
    );
  }

  /* If already signed by the team member, hide the form and show a
   * confirmation + the rendered document so they have visual proof
   * the sign went through. */
  const alreadySigned = agreement.status !== "draft" && agreement.status !== "sent";

  if (submitted || alreadySigned) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Header kind={agreement.kind} />
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 pb-16">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 flex items-start gap-3">
            <CheckCircleIcon className="size-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-[14px] font-medium text-emerald-900">
                Signed and submitted.
              </div>
              <div className="text-[13px] text-emerald-800 mt-0.5 leading-relaxed">
                Thanks {agreement.team_signed_name || agreement.person_full_name}.
                Ecom Landers will counter-sign shortly and the final document
                will be your reference copy.
              </div>
            </div>
          </div>
          <RenderedDocument agreement={agreement} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header kind={agreement.kind} />
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 pb-32">
        {/* Pre-amble */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B1B1B] tracking-tight mb-2">
            {AGREEMENT_KIND_LABEL[agreement.kind]} to sign
          </h1>
          <p className="text-[13px] text-[#7A7A7A] leading-relaxed max-w-lg">
            Take your time, read everything, and sign at the bottom when you&apos;re
            ready. If anything looks off, message{" "}
            <span className="text-[#1B1B1B] font-medium">Dylan</span> before
            signing.
          </p>
        </div>

        {/* Rendered document */}
        <RenderedDocument agreement={agreement} />

        {/* Sign block */}
        <div className="mt-8 bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-[15px] font-semibold text-[#1B1B1B] mb-4">
            Sign below
          </h2>

          <label className="flex items-start gap-3 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-[#1B1B1B]"
            />
            <span className="text-[13px] text-[#444] leading-relaxed">
              I have read and agree to be bound by the terms of this{" "}
              {AGREEMENT_KIND_LABEL[agreement.kind]}.
            </span>
          </label>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-[#1B1B1B] mb-1.5">
              Your full name
            </label>
            <input
              className={inputClass}
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="First and last name"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-[#1B1B1B] mb-1.5">
              Your signature
            </label>
            <SignaturePad value={signature} onChange={setSignature} label="" />
            <button
              type="button"
              onClick={() => setSignature("")}
              className="text-[11px] text-[#7A7A7A] hover:underline mt-1"
            >
              Clear signature
            </button>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 bg-[#FDECEA] border border-[#F5BFBA] rounded-lg text-[13px] text-[#B22B2B]">
              {error}
            </div>
          )}

          <button
            onClick={sign}
            disabled={submitting || !agreed || !signerName.trim() || !signature}
            className="w-full py-3 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing..." : "Sign and submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ kind }: { kind: Agreement["kind"] }) {
  return (
    <div className="bg-white border-b border-[#E5E5EA]">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <Logo height={20} />
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-[#F3F3F5] text-[#1B1B1B]">
          {AGREEMENT_KIND_LABEL[kind]}
        </span>
      </div>
    </div>
  );
}
