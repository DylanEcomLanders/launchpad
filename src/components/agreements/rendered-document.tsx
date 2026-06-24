"use client";

/* ── Rendered agreement document ──
 *
 * Shared between /company/contracts/[id] (admin view) and
 * /agreement/[id] (public signing). Renders as a clean white-paper
 * document with black ink + a formal heading hierarchy so the
 * contractor sees an actual legal-document look rather than a dark
 * dashboard card. The admin sees the exact same render so what they
 * preview is what gets signed.
 *
 * Intentionally framework-light: no buttons, no state. The signing
 * UI sits OUTSIDE this component so the same render also works for
 * Cmd+P → Save as PDF without any chrome bleed-through.
 */

import type { Agreement } from "@/lib/agreements/types";
import { renderDocument } from "@/lib/agreements/render";

export function RenderedDocument({ agreement }: { agreement: Agreement }) {
  const doc = renderDocument(agreement);
  return (
    <article
      className="bg-white text-[#111] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] mx-auto"
      style={{
        maxWidth: "820px",
        padding: "56px 64px",
        fontFamily:
          '"Georgia", "Times New Roman", "Iowan Old Style", "Source Serif Pro", serif',
        lineHeight: 1.65,
      }}
    >
      {/* Document header */}
      <header className="mb-8 pb-6 border-b border-[#D5D5D5]">
        <h1
          className="text-[28px] font-bold tracking-tight mb-2 text-center"
          style={{ fontFamily: '"Inter Tight", "Helvetica Neue", sans-serif' }}
        >
          {doc.title}
        </h1>
        <p
          className="text-[10px] text-[#8A8A8A] uppercase tracking-[0.18em] text-center"
          style={{ fontFamily: '"Inter Tight", monospace' }}
        >
          Revision · {agreement.template_revision}
        </p>
      </header>

      {/* Intro paragraph(s) */}
      {doc.intro && (
        <div className="text-[14px] leading-[1.7] mb-8 whitespace-pre-wrap text-[#222]">
          {doc.intro}
        </div>
      )}

      {/* Numbered clauses */}
      <ol className="space-y-7 mb-10">
        {doc.clauses.map((c) => (
          <li key={c.id}>
            <h2
              className="text-[15px] font-bold text-[#000] mb-2.5 tracking-tight"
              style={{ fontFamily: '"Inter Tight", "Helvetica Neue", sans-serif' }}
            >
              {c.heading}
            </h2>
            <div className="text-[13.5px] text-[#222] leading-[1.7] whitespace-pre-wrap">
              {c.body}
            </div>
          </li>
        ))}
      </ol>

      {/* Outro / closing */}
      {doc.outro && (
        <div className="text-[13.5px] text-[#222] leading-[1.7] mb-10 whitespace-pre-wrap pt-6 border-t border-[#D5D5D5]">
          {doc.outro}
        </div>
      )}

      {/* Signature block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8 border-t border-[#D5D5D5]">
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
      <div
        className="text-[10px] uppercase tracking-[0.16em] text-[#8A8A8A] mb-3 font-semibold"
        style={{ fontFamily: '"Inter Tight", "Helvetica Neue", sans-serif' }}
      >
        {label}
      </div>
      <div
        className={`h-20 border-b-2 ${
          signed ? "border-[#1A1A1A]" : "border-dashed border-[#B5B5B5]"
        } flex items-end px-1 mb-1.5`}
      >
        {signed && signatureImage ? (
          <img
            src={signatureImage}
            alt="Signature"
            className="max-h-16 max-w-full object-contain"
          />
        ) : signed ? (
          <span
            className="text-[20px] italic text-[#1A1A1A] pb-1"
            style={{ fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive' }}
          >
            {signedName}
          </span>
        ) : (
          <span className="text-[11px] text-[#999] pb-1 italic">
            Awaiting signature
          </span>
        )}
      </div>
      <div
        className="text-[10px] text-[#8A8A8A] mt-1 leading-relaxed"
        style={{ fontFamily: '"Inter Tight", "Helvetica Neue", sans-serif' }}
      >
        {signed ? (
          <>
            Signed by <span className="text-[#111] font-medium">{signedName}</span> on{" "}
            {fmtDateTime(signedAt!)}
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
