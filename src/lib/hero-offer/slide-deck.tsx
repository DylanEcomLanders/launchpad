"use client";

/* ── SlideDeck ──
 *
 * Editorial HTML slideshow for every Hero Offer presentation. Visual
 * language mirrors the Ecom Landers proposal PDF: black covers, white
 * body pages, Inter Tight headings, Articulat CF body, light-grey
 * mono eyebrows + page numbers.
 *
 * Components:
 *   - <SlideDeck>  : the host (preview list + present mode + share)
 *   - <SlideCover> : black hero slide with optional meta row
 *   - <SlideBody>  : white body slide with chrome (logo + page x/y)
 *
 * Each slide passes through SlideContext so SlideBody can render its
 * own page number / deck title without the caller threading them.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ShareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

/* ── Brand tokens (mirrors the proposal PDF) ───────────────── */
export const BRAND = {
  cover: { bg: "#0A0A0A", fg: "#FAFAF7", muted: "rgba(250,250,247,0.55)", line: "rgba(250,250,247,0.18)" },
  body:  { bg: "#FFFFFF", fg: "#0E0D0B", muted: "#6E6E6E", line: "#E5E5E5" },
};

const FONT_HEADING = '"Inter Tight", "Helvetica Neue", system-ui, sans-serif';
const FONT_BODY = '"Articulat CF", "Inter Tight", system-ui, sans-serif';
const FONT_MONO = '"Inter Tight", ui-monospace, monospace';

/* ── Context: SlideDeck supplies page index / total + deck title ── */
interface SlideCtx {
  index: number;
  total: number;
  deckTitle: string;
  client?: string;
}
const SlideContext = createContext<SlideCtx>({ index: 0, total: 0, deckTitle: "" });

/* ── SlideCover ───────────────────────────────────────────────
 * Black hero slide. Used as the first slide of every deck.
 * Mirrors the proposal PDF cover: ecomlanders mark top-left, badge
 * top-right, REF/DATE/etc meta strip, massive title, optional
 * "PREPARED FOR / PREPARED BY" footer row.
 */
export function SlideCover({
  badge,
  meta,
  title,
  subtitle,
  preparedFor,
  preparedBy,
}: {
  badge?: string;
  meta?: Array<{ label: string; value: string }>;
  title: string;
  subtitle?: string;
  preparedFor?: { label: string; value: string };
  preparedBy?: { label: string; value: string };
}) {
  return (
    <div
      className="rounded-2xl p-10 md:p-14 min-h-[520px] flex flex-col"
      style={{ backgroundColor: BRAND.cover.bg, color: BRAND.cover.fg, fontFamily: FONT_BODY }}
    >
      {/* Top strip: logo + badge */}
      <div className="flex items-start justify-between gap-4">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          <span style={{ color: BRAND.cover.fg }} className="text-xs">✦</span>
          <span style={{ fontFamily: FONT_HEADING, color: BRAND.cover.fg }} className="text-[12px] font-semibold">
            ecomlanders
          </span>
        </div>
        {badge && (
          <span
            className="text-[10px] uppercase font-semibold px-2.5 py-1.5 rounded-md ring-1"
            style={{
              fontFamily: FONT_HEADING,
              letterSpacing: "0.18em",
              color: BRAND.cover.muted,
              borderColor: BRAND.cover.line,
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Meta row (REF · DATE · VALID UNTIL) */}
      {meta && meta.length > 0 && (
        <div className="mt-12 flex flex-wrap gap-8">
          {meta.map((m) => (
            <div key={m.label} className="flex flex-col gap-1">
              <span
                className="text-[10px] uppercase font-semibold"
                style={{ fontFamily: FONT_HEADING, letterSpacing: "0.2em", color: BRAND.cover.muted }}
              >
                {m.label}
              </span>
              <span className="text-[13px]" style={{ color: BRAND.cover.fg }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hero title + subtitle */}
      <div className="mt-8 flex-1 flex flex-col justify-center max-w-3xl">
        <h1
          className="font-semibold tracking-[-0.02em] leading-[1.02] text-4xl md:text-6xl"
          style={{ fontFamily: FONT_HEADING, color: BRAND.cover.fg }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-5 text-[15px] md:text-[17px] leading-relaxed max-w-xl"
            style={{ color: BRAND.cover.muted }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Footer row: prepared for / prepared by */}
      {(preparedFor || preparedBy) && (
        <div
          className="mt-12 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t"
          style={{ borderColor: BRAND.cover.line }}
        >
          {preparedFor && (
            <div>
              <div
                className="text-[10px] uppercase font-semibold mb-1.5"
                style={{ fontFamily: FONT_HEADING, letterSpacing: "0.2em", color: BRAND.cover.muted }}
              >
                {preparedFor.label}
              </div>
              <div className="text-[15px] font-medium" style={{ color: BRAND.cover.fg, fontFamily: FONT_HEADING }}>
                {preparedFor.value}
              </div>
            </div>
          )}
          {preparedBy && (
            <div>
              <div
                className="text-[10px] uppercase font-semibold mb-1.5"
                style={{ fontFamily: FONT_HEADING, letterSpacing: "0.2em", color: BRAND.cover.muted }}
              >
                {preparedBy.label}
              </div>
              <div className="text-[15px] font-medium" style={{ color: BRAND.cover.fg, fontFamily: FONT_HEADING }}>
                {preparedBy.value}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── SlideBody ────────────────────────────────────────────────
 * White body slide. Mirrors proposal PDF interior pages: small mark
 * top-left, page x/y top-right, hairline above + below content, mono
 * footer with deck title.
 */
export function SlideBody({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const ctx = useContext(SlideContext);
  const pageX = ctx.index + 1;
  const pageY = ctx.total;
  return (
    <div
      className="rounded-2xl p-10 md:p-14 min-h-[520px] flex flex-col"
      style={{ backgroundColor: BRAND.body.bg, color: BRAND.body.fg, fontFamily: FONT_BODY }}
    >
      {/* Top strip: ecomlanders + page x/y */}
      <div
        className="flex items-center justify-between pb-4 mb-8 border-b"
        style={{ borderColor: BRAND.body.line }}
      >
        <div className="inline-flex items-center gap-1.5">
          <span style={{ color: BRAND.body.fg }} className="text-xs">✦</span>
          <span style={{ fontFamily: FONT_HEADING }} className="text-[12px] font-semibold">
            ecomlanders
          </span>
        </div>
        <span
          className="text-[10px] uppercase font-semibold tabular-nums"
          style={{ fontFamily: FONT_MONO, letterSpacing: "0.2em", color: BRAND.body.muted }}
        >
          {pageX} / {pageY}
        </span>
      </div>

      {/* Heading block */}
      <div className="mb-6">
        {eyebrow && (
          <div
            className="text-[10px] uppercase font-semibold mb-3"
            style={{ fontFamily: FONT_HEADING, letterSpacing: "0.2em", color: BRAND.body.muted }}
          >
            {eyebrow}
          </div>
        )}
        <h2
          className="text-2xl md:text-4xl font-semibold tracking-[-0.015em] leading-tight"
          style={{ fontFamily: FONT_HEADING, color: BRAND.body.fg }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[14px] md:text-[15px]" style={{ color: BRAND.body.muted }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 text-[14px] md:text-[15px] leading-relaxed space-y-4" style={{ color: "#222" }}>
        {children}
      </div>

      {/* Bottom strip */}
      <div
        className="mt-12 pt-4 flex items-center justify-between border-t"
        style={{ borderColor: BRAND.body.line }}
      >
        <span className="text-[10px]" style={{ fontFamily: FONT_MONO, letterSpacing: "0.04em", color: BRAND.body.muted }}>
          Ecom Landers · ecomlanders.com
        </span>
        <span className="text-[10px]" style={{ fontFamily: FONT_MONO, letterSpacing: "0.04em", color: BRAND.body.muted }}>
          {ctx.deckTitle}
        </span>
        <span className="text-[10px] tabular-nums" style={{ fontFamily: FONT_MONO, letterSpacing: "0.04em", color: BRAND.body.muted }}>
          {pageX} / {pageY}
        </span>
      </div>
    </div>
  );
}

/* ── Reusable building blocks for SlideBody content ─────────── */

/* Numbered list row in proposal style: "01 · LABEL" eyebrow + bold
 * heading + grey body. Used for "Our approach", "Scope" type slides. */
export function NumberedItem({
  n,
  label,
  title,
  children,
}: {
  n: number | string;
  label?: string;
  title: string;
  children?: ReactNode;
}) {
  const num = typeof n === "number" ? String(n).padStart(2, "0") : n;
  return (
    <div className="grid grid-cols-[80px_1fr] gap-6 py-5 border-t" style={{ borderColor: BRAND.body.line }}>
      <div
        className="text-[10px] font-semibold uppercase pt-1"
        style={{ fontFamily: FONT_HEADING, letterSpacing: "0.18em", color: BRAND.body.muted }}
      >
        {num}{label ? ` · ${label}` : ""}
      </div>
      <div>
        <h3 className="text-[16px] md:text-[18px] font-semibold mb-1.5" style={{ fontFamily: FONT_HEADING, color: BRAND.body.fg }}>
          {title}
        </h3>
        {children && (
          <div className="text-[13.5px] md:text-[14px]" style={{ color: "#333" }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/* A card with subtle border + a black pill eyebrow. Mirrors the
 * Scope cards in the proposal PDF. */
export function ScopeCard({
  pill,
  title,
  children,
}: {
  pill: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 mb-3 ring-1"
      style={{ borderColor: BRAND.body.line, backgroundColor: "#FFFFFF", boxShadow: "0 0 0 1px " + BRAND.body.line }}
    >
      <span
        className="inline-block px-2 py-1 rounded-md text-[10px] uppercase font-semibold mb-3"
        style={{
          fontFamily: FONT_HEADING,
          letterSpacing: "0.18em",
          backgroundColor: "#0E0D0B",
          color: "#FAFAF7",
        }}
      >
        {pill}
      </span>
      <h3 className="text-[15px] md:text-[17px] font-semibold mb-2" style={{ fontFamily: FONT_HEADING, color: BRAND.body.fg }}>
        {title}
      </h3>
      {children && (
        <div className="text-[13.5px] space-y-2" style={{ color: "#333" }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* A row with a checkmark bullet (subtle grey) + body. */
export function CheckRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <CheckIcon className="size-3.5 mt-0.5 shrink-0" style={{ color: "#7A7A7A" }} />
      <span className="text-[13.5px] leading-relaxed" style={{ color: "#333" }}>
        {children}
      </span>
    </div>
  );
}

/* Big stat cell. Used on "Month at a glance" / "Numbers" slides. */
export function StatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border rounded-xl p-5" style={{ borderColor: BRAND.body.line }}>
      <div
        className="text-[10px] uppercase font-semibold mb-3"
        style={{ fontFamily: FONT_HEADING, letterSpacing: "0.18em", color: BRAND.body.muted }}
      >
        {label}
      </div>
      <div className="text-3xl md:text-4xl font-semibold tabular-nums" style={{ fontFamily: FONT_HEADING, color: BRAND.body.fg }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] mt-1" style={{ color: BRAND.body.muted }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ── SlideDeck (host) ─────────────────────────────────────── */

export function SlideDeck({
  slides,
  shareUrl,
  deckTitle,
  client,
}: {
  slides: { label: string; content: ReactNode }[];
  shareUrl?: string;
  deckTitle: string;
  client?: string;
}) {
  const sp = useSearchParams();
  const present = sp.get("present") === "1";
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!present) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setActive((i) => Math.min(slides.length - 1, i + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Home") {
        setActive(0);
      } else if (e.key === "End") {
        setActive(slides.length - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, slides.length]);

  function copyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(window.location.origin + shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function togglePresent() {
    const url = new URL(window.location.href);
    if (present) url.searchParams.delete("present");
    else url.searchParams.set("present", "1");
    window.location.href = url.toString();
  }

  function wrap(content: ReactNode, idx: number) {
    return (
      <SlideContext.Provider value={{ index: idx, total: slides.length, deckTitle, client }}>
        {content}
      </SlideContext.Provider>
    );
  }

  if (present) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#16171A" }}>
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="text-[10px] uppercase font-semibold"
            style={{ fontFamily: FONT_HEADING, letterSpacing: "0.2em", color: "rgba(255,255,255,0.55)" }}
          >
            {deckTitle} · {active + 1} / {slides.length}
          </div>
          <div className="flex items-center gap-2">
            {shareUrl && (
              <button
                onClick={copyShareLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}
              >
                {copied ? <CheckIcon className="size-3.5" /> : <ShareIcon className="size-3.5" />}
                {copied ? "Copied" : "Share"}
              </button>
            )}
            <button
              onClick={togglePresent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}
            >
              <ArrowsPointingInIcon className="size-3.5" />
              Exit
            </button>
          </div>
        </div>

        {/* Slide */}
        <div className="flex-1 flex items-center justify-center px-8 py-8 overflow-auto">
          <div className="max-w-5xl w-full">{wrap(slides[active]?.content, active)}</div>
        </div>

        {/* Bottom nav */}
        <div
          className="flex items-center justify-between px-6 py-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <button
            onClick={() => setActive((i) => Math.max(0, i - 1))}
            disabled={active === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}
          >
            <ChevronLeftIcon className="size-3.5" />
            Prev
          </button>
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`size-1.5 rounded-full transition-all ${i === active ? "w-6" : "hover:opacity-80"}`}
                style={{ backgroundColor: i === active ? "#FAFAF7" : "rgba(255,255,255,0.18)" }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setActive((i) => Math.min(slides.length - 1, i + 1))}
            disabled={active === slides.length - 1}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}
          >
            Next
            <ChevronRightIcon className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold">
          {slides.length} slide{slides.length === 1 ? "" : "s"} · {deckTitle}
        </div>
        <div className="flex items-center gap-2">
          {shareUrl && (
            <button
              onClick={copyShareLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] uppercase tracking-wider font-semibold bg-[#1A1A1A] text-[#9CA3AF] hover:text-white"
            >
              {copied ? <CheckIcon className="size-3.5" /> : <ShareIcon className="size-3.5" />}
              {copied ? "Copied" : "Copy share link"}
            </button>
          )}
          <button
            onClick={togglePresent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] uppercase tracking-wider font-semibold bg-white text-[#0E0D0B] hover:bg-[#E5E5E5]"
          >
            <ArrowsPointingOutIcon className="size-3.5" />
            Present
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {slides.map((s, i) => (
          <div key={i} className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] hover:ring-white/[0.12] transition-all overflow-hidden">
            <div className="flex items-center gap-3 px-5 pt-4">
              <div className="size-6 rounded-md bg-white text-[#0E0D0B] flex items-center justify-center text-[10px] font-bold shrink-0">
                {i + 1}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold">
                {s.label}
              </div>
            </div>
            <div className="px-5 pb-5 pt-3">{wrap(s.content, i)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Backwards-compat shim ─────────────────────────────────────
 * The first cut of SlideDeck shipped a single <SlideFrame> with an
 * `accent` prop. Keep the export so any deck still pointing at the
 * old API renders as a body slide; new decks should use SlideCover
 * + SlideBody directly. */
export function SlideFrame({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  accent?: "emerald" | "cyan" | "sky";
}) {
  return (
    <SlideBody eyebrow={eyebrow} title={title ?? ""}>
      {children}
    </SlideBody>
  );
}
