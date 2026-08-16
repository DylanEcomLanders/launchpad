"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ModalPortal } from "@/components/modal-portal";
import type { WorkCatalog, WorkPiece, WorkReel } from "@/lib/work/types";
import { WorkChrome } from "./chrome";
import { PageFrame } from "./page-frame";
import { StageView } from "./stage-view";

export function Lookbook({ catalog }: { catalog: WorkCatalog }) {
  const { featured, reels, pieces } = catalog;
  const [reelSlug, setReelSlug] = useState(reels[0]?.slug ?? "product-pages");
  const [focus, setFocus] = useState(0);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const reel = reels.find((item) => item.slug === reelSlug) ?? reels[0];
  const film = useMemo(
    () => (reel?.frames ?? []).filter((piece) => piece.slug !== featured.slug),
    [reel, featured.slug]
  );
  const sequence = useMemo(() => [featured, ...film], [featured, film]);

  const openPiece = pieces.find((p) => p.slug === openSlug) ?? null;
  const openIndex = openPiece ? sequence.findIndex((p) => p.slug === openPiece.slug) : -1;

  const selectReel = useCallback((next: WorkReel) => {
    setReelSlug(next.slug);
    setFocus(0);
  }, []);

  const move = useCallback(
    (delta: number) => {
      setFocus((current) => {
        const next = (current + delta + sequence.length) % sequence.length;
        const node = rootRef.current?.querySelector<HTMLElement>(`[data-film-index="${next}"]`);
        node?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        return next;
      });
    },
    [sequence.length]
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
          const pool = sequence.length > 1 ? sequence : pieces;
          const idx = pool.findIndex((p) => p.slug === openSlug);
          const next = pool[(idx + dir + pool.length) % pool.length];
          setOpenSlug(next.slug);
          setFocus(Math.max(0, sequence.findIndex((p) => p.slug === next.slug)));
        }
        return;
      }
      if (event.key >= "1" && event.key <= "6") {
        const nextReel = reels[Number(event.key) - 1];
        if (nextReel) {
          event.preventDefault();
          selectReel(nextReel);
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
        const piece = sequence[focus];
        if (piece) setOpenSlug(piece.slug);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, move, openSlug, pieces, reels, selectReel, sequence]);

  return (
    <div ref={rootRef}>
      <WorkChrome />

      <section className="relative px-5 md:px-8 pt-14 md:pt-20 pb-16 md:pb-20">
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

      <section className="border-t border-[var(--work-faint)]">
        <div className="px-5 md:px-8 pt-8 pb-4 flex items-end justify-between gap-6">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.22em] text-[var(--work-mute)] mb-2"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Six files. Instant pages.
            </p>
            <h2
              className="text-2xl md:text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              The lookbook
            </h2>
          </div>
          <p
            className="hidden md:block text-[10px] uppercase tracking-[0.18em] text-[var(--work-dim)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            1–6 files · ← → move · enter open · esc close
          </p>
        </div>

        <nav className="work-reels" aria-label="Work files">
          {reels.map((item) => {
            const active = item.slug === reel?.slug;
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => selectReel(item)}
                className={`work-reel-tab ${active ? "is-active" : ""}`}
                aria-current={active ? "true" : undefined}
              >
                <span className="work-reel-index">{item.index}</span>
                <span className="work-reel-name">{item.category}</span>
                <span className="work-reel-count">
                  {item.frames.length > 0 ? `${item.frames.length}` : "—"}
                </span>
              </button>
            );
          })}
        </nav>

        {reel && (
          <div className="px-5 md:px-8 pt-8 pb-20">
            <p className="text-sm text-[var(--work-mute)] max-w-xl mb-8 leading-relaxed">
              {reel.blurb}
            </p>

            {film.length === 0 ? (
              <EmptyReel reel={reel} featuredHere={reel.category === featured.category} />
            ) : (
              <div className="work-film">
                {film.map((piece, i) => {
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
                        {piece.category !== "Page" && (
                          <p
                            className="text-[10px] uppercase tracking-[0.16em] text-[var(--work-dim)] shrink-0"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {piece.category}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="px-5 md:px-8 py-8 border-t border-[var(--work-faint)] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--work-mute)]">
        <p>Pages, not a Figma wall.</p>
        <Link href="/portfolio" className="hover:text-[var(--work-ink)]">
          Figma archive →
        </Link>
      </footer>

      {openPiece && (
        <ModalPortal>
          <StageView
            key={openPiece.slug}
            piece={openPiece}
            overlay
            onClose={() => setOpenSlug(null)}
            prev={neighbor(sequence.length > 1 ? sequence : pieces, openIndex >= 0 ? openIndex : 0, -1)}
            next={neighbor(sequence.length > 1 ? sequence : pieces, openIndex >= 0 ? openIndex : 0, 1)}
          />
        </ModalPortal>
      )}
    </div>
  );
}

function EmptyReel({ reel, featuredHere }: { reel: WorkReel; featuredHere: boolean }) {
  return (
    <div className="work-empty-reel">
      <PageFrame project={null} label={reel.category} live={false} aspect="16 / 9" />
      <div className="mt-6 max-w-lg">
        <p
          className="text-[10px] uppercase tracking-[0.2em] text-[var(--work-mute)] mb-3"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {reel.index} · {reel.category}
        </p>
        <p
          className="text-xl md:text-2xl font-semibold tracking-tight leading-snug"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {featuredHere
            ? "The public case is on the stage above. More pages from this file land here as they’re synced."
            : "Pages from this file land here as they’re synced. Until then, this is the body of work — not a zoomed-out canvas."}
        </p>
      </div>
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
