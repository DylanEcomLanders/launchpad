"use client";

/* ── ToolShell + DeckShell ──
 *
 * Shared chrome for Hero Offer sub-tools. ToolShell is the generic shell
 * (header + content). DeckShell is the specialised host for deck-style
 * tools (sales deck, pitch deck, 30/90/180/365 day decks): embed URL,
 * download link, current-version notes.
 *
 * All sub-tools across Acquisition / Execution / Retention render
 * inside one of these so the chrome stays consistent and Dylan only
 * has to polish content, not layout.
 */

import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import type { ToolStatus, Accent } from "./tool-card-grid";

const STATUS_TINT: Record<ToolStatus, string> = {
  live: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  shell: "bg-zinc-500/20 text-zinc-200 ring-1 ring-zinc-500/30",
  wip: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  soon: "bg-[#222222] text-[#71757D]",
};
const STATUS_LABEL: Record<ToolStatus, string> = {
  live: "Live",
  shell: "Shell - polish later",
  wip: "WIP",
  soon: "Coming soon",
};

const ACCENT_GRADIENT: Record<Accent, string> = {
  emerald: "from-emerald-500 to-teal-600 shadow-[0_8px_24px_rgba(16,185,129,0.3)]",
  cyan: "from-cyan-500 to-teal-600 shadow-[0_8px_24px_rgba(6,182,212,0.3)]",
  sky: "from-sky-500 to-blue-600 shadow-[0_8px_24px_rgba(14,165,233,0.3)]",
};

export function ToolShell({
  title,
  blurb,
  parentHref,
  parentLabel,
  status,
  accent,
  icon,
  children,
}: {
  title: string;
  blurb: string;
  parentHref: string;
  parentLabel: string;
  status: ToolStatus;
  accent: Accent;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={parentHref}
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA] mb-3"
        >
          <ArrowLeftIcon className="size-3.5" />
          {parentLabel}
        </Link>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <div className={`size-9 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT[accent]} flex items-center justify-center shrink-0`}>
            <span className="text-white">{icon}</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#E5E5EA]">{title}</h1>
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <p className="text-sm text-[#9CA3AF] max-w-2xl">{blurb}</p>
      </div>
      {children}
    </div>
  );
}

/* DeckShell - the standard layout for deck-host tools. Three sections:
 * "When to send", "Current version" (embed/link), "Notes". Polish per
 * deck later; this gets the structure visible today. */
export function DeckShell({
  whenToSend,
  embedUrl,
  downloadUrl,
  notes,
  accent,
  children,
}: {
  whenToSend: string;
  embedUrl?: string;
  downloadUrl?: string;
  notes?: string;
  accent: Accent;
  children?: ReactNode;
}) {
  const accentText: Record<Accent, string> = {
    emerald: "text-emerald-300",
    cyan: "text-cyan-300",
    sky: "text-sky-300",
  };

  return (
    <div className="space-y-4">
      {/* When to send */}
      <section className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
        <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${accentText[accent]}`}>
          When to send
        </div>
        <p className="text-sm text-[#E5E5EA] leading-relaxed">{whenToSend}</p>
      </section>

      {/* Current version */}
      <section className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
        <div className={`text-[10px] uppercase tracking-wider font-semibold mb-3 ${accentText[accent]}`}>
          Current version
        </div>
        {embedUrl || downloadUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            {embedUrl && (
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA]"
              >
                Open deck
                <ArrowTopRightOnSquareIcon className="size-3.5" />
              </a>
            )}
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-[#1A1A1A] text-[#E5E5EA] hover:bg-[#222222]"
              >
                Download PDF
              </a>
            )}
            {embedUrl && (
              <button
                onClick={() => {
                  if (navigator.clipboard) navigator.clipboard.writeText(embedUrl);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-[#1A1A1A] text-[#9CA3AF] hover:text-[#E5E5EA]"
              >
                <ClipboardDocumentIcon className="size-3.5" />
                Copy link
              </button>
            )}
          </div>
        ) : (
          <div className="bg-black/40 rounded-lg p-4 ring-1 ring-dashed ring-white/[0.06]">
            <p className="text-[12px] text-[#71757D] italic">
              No deck linked yet. Build the deck in Tome / Pitch / Figma / Canva, then paste the share URL here in the future polish pass.
            </p>
          </div>
        )}
      </section>

      {/* Notes */}
      {notes && (
        <section className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
          <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${accentText[accent]}`}>
            Notes
          </div>
          <p className="text-sm text-[#9CA3AF] leading-relaxed whitespace-pre-line">{notes}</p>
        </section>
      )}

      {/* Extra content the caller might add (e.g. talking points, scripts). */}
      {children}
    </div>
  );
}
