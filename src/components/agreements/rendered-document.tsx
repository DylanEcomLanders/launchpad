"use client";

/* ── Rendered agreement document ──
 * Shared between /company/contracts/[id] (admin view) and /agreement/[id]
 * (public signing). Takes an Agreement, resolves placeholders via
 * render.ts, lays out the title + intro + numbered clauses + outro,
 * and optionally renders the signature block when one or both
 * signatures are present.
 *
 * Intentionally framework-light: no buttons, no state. The signing
 * UI sits OUTSIDE this component so the same render can also be
 * print-friendly later.
 */

import type { Agreement } from "@/lib/agreements/types";
import { renderDocument } from "@/lib/agreements/render";

export function RenderedDocument({ agreement }: { agreement: Agreement }) {
  const doc = renderDocument(agreement);
  return (
    <article className="bg-white border border-[#E5E5EA] rounded-2xl px-6 md:px-12 py-10 md:py-14 shadow-[var(--shadow-soft)] text-[#1B1B1B]">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
        {doc.title}
      </h1>
      <p className="text-[11px] text-[#A0A0A0] uppercase tracking-[0.14em] font-mono mb-6">
        Revision · {agreement.template_revision}
      </p>

      {doc.intro && (
        <div className="text-[14px] text-[#444] leading-relaxed mb-8 whitespace-pre-wrap">
          {doc.intro}
        </div>
      )}

      <ol className="space-y-6 mb-8">
        {doc.clauses.map((c, idx) => (
          <li key={c.id} className="grid grid-cols-[28px_1fr] gap-3">
            <div className="text-[12px] font-mono text-[#A0A0A0] pt-0.5">
              {String(idx + 1).padStart(2, "0")}
            </div>
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight text-[#1B1B1B] mb-1.5">
                {c.heading}
              </h3>
              <p className="text-[13px] text-[#444] leading-relaxed whitespace-pre-wrap">
                {c.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {doc.outro && (
        <div className="text-[13px] text-[#444] leading-relaxed mb-10 whitespace-pre-wrap pt-6 border-t border-[#EDEDEF]">
          {doc.outro}
        </div>
      )}

      {/* Signature block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#EDEDEF]">
        <SignatureBlock
          label={`${agreement.person_full_name} (Team Member)`}
          signedAt={agreement.team_signed_at}
          signedName={agreement.team_signed_name}
          signatureImage={agreement.team_signature_image}
        />
        <SignatureBlock
          label="Ecom Landers (Company)"
          signedAt={agreement.counter_signed_at}
          signedName={agreement.counter_signed_name}
          signatureImage={agreement.counter_signature_image}
        />
      </div>
    </article>
  );
}

function SignatureBlock({
  label,
  signedAt,
  signedName,
  signatureImage,
}: {
  label: string;
  signedAt?: string;
  signedName?: string;
  signatureImage?: string;
}) {
  const signed = !!signedAt;
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#7A7A7A] mb-2">
        {label}
      </div>
      <div
        className={`h-20 border-b ${
          signed ? "border-[#1B1B1B]" : "border-dashed border-[#C5C5C5]"
        } flex items-end px-1`}
      >
        {signed && signatureImage ? (
          <img
            src={signatureImage}
            alt="Signature"
            className="max-h-16 max-w-full object-contain"
          />
        ) : signed ? (
          <span className="text-[16px] italic text-[#1B1B1B] pb-1">
            {signedName}
          </span>
        ) : (
          <span className="text-[12px] text-[#C5C5C5] pb-1">Awaiting signature</span>
        )}
      </div>
      <div className="text-[11px] text-[#7A7A7A] mt-1.5 leading-relaxed">
        {signed ? (
          <>
            Signed by <span className="text-[#1B1B1B] font-medium">{signedName}</span>{" "}
            on {fmtDateTime(signedAt!)}
          </>
        ) : (
          <>Not yet signed</>
        )}
      </div>
    </div>
  );
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
