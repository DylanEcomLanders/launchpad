"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ModalPortal } from "@/components/modal-portal";
import type { WorkCatalog, WorkPiece } from "@/lib/work/types";
import { WorkChrome } from "./chrome";
import { PageFrame } from "./page-frame";
import { StageView } from "./stage-view";

export function Lookbook({ catalog }: { catalog: WorkCatalog }) {
  const { featured, frames, pieces } = catalog;
  const [focus, setFocus] = useState(0);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const openPiece = pieces.find((p) => p.slug === openSlug) ?? null;
  const openIndex = openPiece ? pieces.findIndex((p) => p.slug === openPiece.slug) : -1;

  const move = useCallback(
    (delta: number) => {
      setFocus((current) => {
        const next = (current + delta + pieces.length) % pieces.length;
        const node = rootRef.current?.querySelector<HTMLElement>(`[data-film-index="${next}"]`);
        node?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        return next;
      });
    },
    [pieces.length]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.key === "Escape") {
        if (openSlug) {
          event.preventDefault();
          setOpenSlug(null);
        }
        return;
      }
      if (openSlug) {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const dir = event.key === "ArrowLeft" ? -1 : 1;
          const next = pieces[(openIndex + dir + pieces.length) % pieces.length];
          setOpenSlug(next.slug);
          setFocus((openIndex + dir + pieces.length) % pieces.length);
        }
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const piece = pieces[focus];
        if (piece) setOpenSlug(piece.slug);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, move, openIndex, openSlug, pieces]);

  return (
    <div ref={rootRef}>
      <WorkChrome />

      <section className="relative px-5 md:px-8 pt-14 md:pt-20 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-12 lg:gap-16 items-end">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.22em] text-[var(--work-mute)] mb-5"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {featured.story?.eyebrow}
            </p>
            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[0.9]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {featured.name}
            </h1>
            <p className="mt-7 text-xl md:text-3xl leading-[1.15] max-w-xl text-[var(--work-ink)]/85">
              {featured.story?.lead}
            </p>
            <button
              type="button"
              onClick={() => {
                setFocus(0);
                setOpenSlug(featured.slug);
              }}
              className="mt-8 text-sm text-[var(--work-ink)] border-b border-[var(--work-ink)] pb-0.5 hover:opacity-70 transition-opacity"
            >
              Open the page
            </button>
          </div>

          <button
            type="button"
            data-film-index={0}
            onClick={() => {
              setFocus(0);
              setOpenSlug(featured.slug);
            }}
            className="text-left"
            aria-label={`Open ${featured.name}`}
          >
            <PageFrame
              project={featured.project}
              label={featured.name}
              eager
              focused={focus === 0 && !openSlug}
              aspect="4 / 5"
            />
          </button>
        </div>

        {featured.story && (
          <ol className="mt-16 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl">
            {featured.story.beats.map((beat) => (
              <li key={beat.label}>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] text-[var(--work-mute)] mb-3"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {beat.label}
                </p>
                <p className="text-sm leading-relaxed text-[var(--work-ink)]/70">{beat.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="border-t border-[var(--work-faint)] px-5 md:px-8 pt-10 pb-20">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.22em] text-[var(--work-mute)] mb-2"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              The film
            </p>
            <h2
              className="text-2xl md:text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Other pages
            </h2>
          </div>
          <p
            className="hidden md:block text-[10px] uppercase tracking-[0.18em] text-[var(--work-dim)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            ← → move · enter open · esc close
          </p>
        </div>

        {frames.length === 0 ? (
          <p className="text-sm text-[var(--work-mute)] max-w-md leading-relaxed">
            The film fills as pages are synced from the library. Hound is the public case today.
          </p>
        ) : (
          <div className="work-film">
            {frames.map((piece, i) => {
              const index = i + 1;
              return (
                <div key={piece.slug} className="work-film-cell" data-film-index={index}>
                  <button
                    type="button"
                    onClick={() => {
                      setFocus(index);
                      setOpenSlug(piece.slug);
                    }}
                    onFocus={() => setFocus(index)}
                    className="w-full text-left"
                    aria-label={`Open ${piece.name}`}
                  >
                    <PageFrame
                      project={piece.project}
                      label={piece.name}
                      focused={focus === index && !openSlug}
                      eager={i < 2}
                    />
                  </button>
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <p
                      className="text-sm tracking-tight truncate"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {piece.name}
                    </p>
                    <p
                      className="text-[10px] uppercase tracking-[0.16em] text-[var(--work-dim)] shrink-0"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {piece.category}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="px-5 md:px-8 py-8 border-t border-[var(--work-faint)] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--work-mute)]">
        <p>Pages, not decks.</p>
        <Link href="/portfolio" className="hover:text-[var(--work-ink)]">
          Prefer the Figma archive →
        </Link>
      </footer>

      {openPiece && (
        <ModalPortal>
          <StageView
            key={openPiece.slug}
            piece={openPiece}
            overlay
            onClose={() => setOpenSlug(null)}
            prev={neighbor(pieces, openIndex, -1)}
            next={neighbor(pieces, openIndex, 1)}
          />
        </ModalPortal>
      )}
    </div>
  );
}

function neighbor(
  pieces: WorkPiece[],
  index: number,
  delta: number
): { slug: string; name: string } | null {
  if (pieces.length < 2 || index < 0) return null;
  const piece = pieces[(index + delta + pieces.length) % pieces.length];
  return { slug: piece.slug, name: piece.name };
}
