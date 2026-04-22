"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Splits the deck markdown on horizontal-rule separators (`---`) so each
 * "Slide N — Title" block renders as its own full-viewport slide.
 *
 * The first chunk above the first `---` is the editor-facing intro (title,
 * description, fullscreen link) — drop it so slide 1 = the real cover.
 */
function splitSlides(markdown: string): string[] {
  const parts = markdown
    .split(/\n---+\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.slice(1);
}

function MarqueeColumn({
  images,
  direction,
  duration,
  offset,
}: {
  images: string[];
  direction: "up" | "down";
  duration: number;
  offset: number;
}) {
  // Duplicate so the loop is seamless
  const list = [...images, ...images];
  return (
    <div
      className="marquee-col"
      style={{
        animation: `marquee-${direction} ${duration}s linear infinite`,
        animationDelay: `-${offset}s`,
      }}
    >
      {list.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={url}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="marquee-tile"
        />
      ))}
    </div>
  );
}

function CoverBackdrop({ images }: { images: string[] }) {
  if (images.length === 0) return null;

  // Shuffle-ish split across 4 columns
  const columns: string[][] = [[], [], [], []];
  images.forEach((url, i) => columns[i % 4].push(url));
  // Fall back so no column is empty
  const safe = columns.map((c) => (c.length ? c : images));

  return (
    <div className="cover-backdrop" aria-hidden="true">
      <div className="backdrop-col-group backdrop-left">
        <MarqueeColumn images={safe[0]} direction="up" duration={95} offset={0} />
        <MarqueeColumn images={safe[1]} direction="down" duration={115} offset={20} />
      </div>
      <div className="backdrop-col-group backdrop-right">
        <MarqueeColumn images={safe[2]} direction="down" duration={105} offset={10} />
        <MarqueeColumn images={safe[3]} direction="up" duration={125} offset={30} />
      </div>
    </div>
  );
}

export function SalesDeckPresentation({
  markdown,
  coverImages = [],
}: {
  markdown: string;
  coverImages?: string[];
}) {
  const slides = useMemo(() => splitSlides(markdown), [markdown]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        setIndex((i) => Math.min(i + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End") {
        setIndex(slides.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <p className="text-sm text-white/60">Deck content not found.</p>
      </div>
    );
  }

  const current = slides[index];
  const isCover = current.includes("/conversion-engine-logo.svg");

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {/* Cover backdrop — vertical page marquees on the outskirts */}
      {isCover && <CoverBackdrop images={coverImages} />}

      {/* Subtle dot pattern (hidden on cover so the backdrop breathes) */}
      {!isCover && (
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
      )}

      {/* Slide */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-10 md:px-24 py-16">
        <div className="max-w-4xl w-full">
          <article className={`deck-slide ${isCover ? "deck-slide-cover" : ""}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ src, alt }) => {
                  if (src === "/conversion-engine-logo.svg") {
                    return (
                      <span className="ce-logo">
                        <img
                          src="/conversion-engine-mark.svg"
                          alt=""
                          aria-hidden="true"
                          className="ce-logo-mark"
                        />
                        <img
                          src="/conversion-engine-wordmark.svg"
                          alt={alt || "Conversion Engine"}
                          className="ce-logo-wordmark"
                        />
                      </span>
                    );
                  }
                  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                  return <img src={src} alt={alt} />;
                },
              }}
            >
              {current}
            </ReactMarkdown>
          </article>
        </div>
      </div>

      {/* Slide counter */}
      <div className="fixed bottom-6 left-6 z-20 text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
        {index + 1} / {slides.length}
      </div>

      {/* Nav arrows */}
      <div className="fixed bottom-6 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0}
          className="size-9 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous slide"
        >
          <svg className="size-4 text-white/80" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => setIndex((i) => Math.min(i + 1, slides.length - 1))}
          disabled={index === slides.length - 1}
          className="size-9 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next slide"
        >
          <svg className="size-4 text-white/80" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Help hint */}
      <div className="fixed top-6 right-6 z-20 text-[10px] text-white/30 font-medium tracking-wider uppercase">
        ← → arrow keys to navigate
      </div>

      <style>{`
        .deck-slide h1 {
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 1.5rem;
          line-height: 1.1;
          color: white;
        }
        .deck-slide h2 {
          font-size: 2.25rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 1.25rem;
          line-height: 1.15;
          color: white;
        }
        .deck-slide h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          margin-bottom: 1rem;
        }
        .deck-slide p {
          font-size: 1.125rem;
          line-height: 1.6;
          color: rgba(255,255,255,0.85);
          margin-bottom: 1rem;
        }
        .deck-slide strong { color: white; }
        .deck-slide em { color: rgba(255,255,255,0.6); font-style: italic; }
        .deck-slide ul {
          list-style: none;
          padding: 0;
          margin: 1rem 0;
        }
        .deck-slide ul li {
          position: relative;
          padding-left: 1.5rem;
          font-size: 1.125rem;
          line-height: 1.6;
          color: rgba(255,255,255,0.85);
          margin-bottom: 0.75rem;
        }
        .deck-slide ul li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.65em;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
        }
        .deck-slide blockquote {
          border-left: 3px solid rgba(255,255,255,0.3);
          padding-left: 1.25rem;
          margin: 1.25rem 0;
          color: rgba(255,255,255,0.7);
          font-style: italic;
        }
        .deck-slide hr { display: none; }
        .deck-slide a { color: #60A5FA; text-decoration: underline; }
        .deck-slide img {
          max-width: 520px;
          width: 100%;
          height: auto;
          margin: 0 auto 2rem;
          display: block;
        }

        /* Cover slide — centered logo + tagline */
        .deck-slide-cover {
          text-align: center;
        }
        .deck-slide-cover p {
          text-align: center;
          font-size: 1rem;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.01em;
        }
        .deck-slide-cover em {
          font-style: normal;
          color: rgba(255,255,255,0.55);
        }

        .deck-slide .ce-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          margin: 0 auto 1.5rem;
        }
        .deck-slide .ce-logo-mark {
          width: 88px;
          height: 88px;
          margin: 0;
          display: block;
        }
        .deck-slide .ce-logo-wordmark {
          width: 240px;
          max-width: 60vw;
          height: auto;
          margin: 0;
          display: block;
        }

        /* Cover backdrop — vertical marquees on both edges */
        .cover-backdrop {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .backdrop-col-group {
          position: absolute;
          top: -6vh;
          bottom: -6vh;
          width: 24vw;
          display: flex;
          gap: 14px;
          padding: 0 16px;
        }
        .backdrop-left { left: 0; }
        .backdrop-right { right: 0; }

        .marquee-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
          will-change: transform;
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%);
                  mask-image: linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%);
        }
        .marquee-tile {
          width: 100%;
          height: auto;
          display: block;
          margin: 0;
          max-width: none;
          border-radius: 6px;
          opacity: 0.22;
          filter: grayscale(1) brightness(0.95) contrast(1.05);
        }

        @keyframes marquee-up {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
        @keyframes marquee-down {
          from { transform: translateY(-50%); }
          to   { transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .marquee-col { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
