"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Splits the deck markdown on horizontal-rule separators (`---`) so each
 * "Slide N — Title" block renders as its own full-viewport slide.
 *
 * Drops the editor-facing intro (first chunk) and the `## Designer notes`
 * chunk — those aren't real slides.
 */
function splitSlides(markdown: string): string[] {
  const parts = markdown
    .split(/\n---+\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts
    .slice(1)
    .filter(
      (s) =>
        s.includes("/conversion-engine-logo.svg") ||
        /^##\s+Slide\s+\d/m.test(s)
    );
}

// ── Calculator state shared between Slide 3 and Slide 9 ──
interface CalcInputs {
  traffic: number; // monthly sessions
  cvr: number; // current CVR (%)
  aov: number; // £
  lift: number; // CVR lift target (%)
}

const DEFAULT_CALC: CalcInputs = {
  traffic: 150000,
  cvr: 1.8,
  aov: 55,
  lift: 1.0,
};

const RETAINER = 8000;

function formatGBP(n: number): string {
  if (!Number.isFinite(n)) return "£0";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));
}

function monthlyRecovered(c: CalcInputs): number {
  return c.traffic * (c.lift / 100) * c.aov;
}

// ── Marquee (outskirts on cover) ──
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

function CoverBackdrop({ images, visible }: { images: string[]; visible: boolean }) {
  if (images.length === 0) return null;
  const columns: string[][] = [[], [], [], []];
  images.forEach((url, i) => columns[i % 4].push(url));
  const safe = columns.map((c) => (c.length ? c : images));
  return (
    <div
      className={`cover-backdrop ${visible ? "is-visible" : "is-hidden"}`}
      aria-hidden="true"
    >
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

// ── Slider row ──
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider-row">
      <div className="slider-row-head">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="deck-slider"
      />
    </div>
  );
}

// ── Slide: Revenue calculator ──
function RevenueCalculatorSlide({
  inputs,
  setInputs,
}: {
  inputs: CalcInputs;
  setInputs: (v: CalcInputs) => void;
}) {
  const monthly = monthlyRecovered(inputs);
  const annual = monthly * 12;
  return (
    <div className="slide-calc">
      <h2>What you&rsquo;re leaving on the table</h2>
      <div className="slide-calc-body">
        <div className="slide-calc-sliders">
          <SliderRow
            label="Monthly traffic"
            value={inputs.traffic}
            min={10000}
            max={1000000}
            step={5000}
            format={(v) => `${(v / 1000).toFixed(0)}K sessions`}
            onChange={(v) => setInputs({ ...inputs, traffic: v })}
          />
          <SliderRow
            label="Current CVR"
            value={inputs.cvr}
            min={0.5}
            max={5}
            step={0.1}
            format={(v) => `${v.toFixed(1)}%`}
            onChange={(v) => setInputs({ ...inputs, cvr: v })}
          />
          <SliderRow
            label="Average order value"
            value={inputs.aov}
            min={20}
            max={300}
            step={5}
            format={(v) => `£${v}`}
            onChange={(v) => setInputs({ ...inputs, aov: v })}
          />
          <SliderRow
            label="CVR lift target"
            value={inputs.lift}
            min={0.5}
            max={2}
            step={0.1}
            format={(v) => `+${v.toFixed(1)}%`}
            onChange={(v) => setInputs({ ...inputs, lift: v })}
          />
        </div>
        <div className="slide-calc-output">
          <div className="calc-out-block">
            <p className="calc-out-label">Monthly revenue recovered</p>
            <p className="calc-out-value">{formatGBP(monthly)}</p>
          </div>
          <div className="calc-out-block calc-out-block-big">
            <p className="calc-out-label">Annual opportunity</p>
            <p className="calc-out-value calc-out-accent">{formatGBP(annual)}</p>
          </div>
        </div>
      </div>
      <p className="slide-calc-foot">
        Drag the sliders. Those are the numbers you&rsquo;re living with right now — and the revenue you&rsquo;re not.
      </p>
    </div>
  );
}

// ── Slide: Investment ROI ──
function InvestmentRoiSlide({ inputs }: { inputs: CalcInputs }) {
  const monthly = monthlyRecovered(inputs);
  const ratio = monthly > 0 ? monthly / RETAINER : 0;
  const annualGain = monthly * 12;
  // Visual scaling: cap the big bar so wild values don't break layout
  const clampedRatio = Math.min(ratio, 15);
  const investPct = 100 / (clampedRatio + 1);
  const recoverPct = 100 - investPct;

  return (
    <div className="slide-roi">
      <h2>The investment</h2>

      <div className="roi-bars">
        <div className="roi-row">
          <span className="roi-tag">You invest</span>
          <div className="roi-bar-track">
            <div
              className="roi-bar roi-bar-invest"
              style={{ width: `${investPct}%` }}
            >
              <span className="roi-bar-label">{formatGBP(RETAINER)}/mo</span>
            </div>
          </div>
        </div>
        <div className="roi-row">
          <span className="roi-tag">You recover</span>
          <div className="roi-bar-track">
            <div
              className="roi-bar roi-bar-recover"
              style={{ width: `${recoverPct}%` }}
            >
              <span className="roi-bar-label">{formatGBP(monthly)}/mo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="roi-summary">
        <div className="roi-summary-block">
          <p className="roi-summary-label">Return multiple</p>
          <p className="roi-summary-value">
            {ratio > 0 ? ratio.toFixed(1) : "0.0"}×
          </p>
        </div>
        <div className="roi-summary-block">
          <p className="roi-summary-label">Annual gain</p>
          <p className="roi-summary-value">{formatGBP(annualGain)}</p>
        </div>
        <div className="roi-summary-block">
          <p className="roi-summary-label">Breakeven CVR lift</p>
          <p className="roi-summary-value">
            {(() => {
              const monthlyRev = inputs.traffic * inputs.aov;
              const be = monthlyRev > 0 ? (RETAINER / monthlyRev) * 100 : 0;
              return `${be.toFixed(2)}%`;
            })()}
          </p>
        </div>
      </div>

      <ul className="roi-terms">
        <li><strong>£8,000/month</strong> — single rate, no tiered pricing</li>
        <li><strong>90-day minimum</strong> — enough to ship, test, measure a full cycle</li>
        <li><strong>Month 4 onwards</strong> — rolling, 30-day notice</li>
        <li><strong>No setup fees.</strong> No per-page upcharges.</li>
      </ul>

      <p className="slide-roi-foot">
        At a conservative 1% CVR lift, the partnership pays for itself in the first week of the month.
      </p>
    </div>
  );
}

// ── Markdown slide (default) ──
function MarkdownSlide({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => {
          // Strip "Slide N — " prefix from on-screen rendering
          const text = Array.isArray(children) ? children.join("") : String(children);
          const cleaned = text.replace(/^Slide\s+\d+\s*[—–-]\s*/, "");
          return <h2>{cleaned}</h2>;
        },
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
      {content}
    </ReactMarkdown>
  );
}

function SlideBody({
  content,
  calcInputs,
  setCalcInputs,
}: {
  content: string;
  calcInputs: CalcInputs;
  setCalcInputs: (v: CalcInputs) => void;
}) {
  if (content.includes("::revenue-calculator::")) {
    return <RevenueCalculatorSlide inputs={calcInputs} setInputs={setCalcInputs} />;
  }
  if (content.includes("::investment-roi::")) {
    return <InvestmentRoiSlide inputs={calcInputs} />;
  }
  return <MarkdownSlide content={content} />;
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
  const [entering, setEntering] = useState(false);
  const enterTimer = useRef<number | null>(null);
  const [calcInputs, setCalcInputs] = useState<CalcInputs>(DEFAULT_CALC);

  const goNext = useCallback(() => {
    if (entering) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (index === 0 && slides.length > 1 && !reduce) {
      setEntering(true);
      enterTimer.current = window.setTimeout(() => {
        setIndex(1);
        setEntering(false);
      }, 340);
      return;
    }
    setIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [index, slides.length, entering]);

  const goPrev = useCallback(() => {
    if (entering) return;
    setIndex((i) => Math.max(i - 1, 0));
  }, [entering]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept arrow keys when user is interacting with a slider
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "INPUT" && (target as HTMLInputElement).type === "range") {
        return;
      }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        goPrev();
      } else if (e.key === "Home") {
        if (!entering) setIndex(0);
      } else if (e.key === "End") {
        if (!entering) setIndex(slides.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, entering, slides.length]);

  useEffect(() => {
    return () => {
      if (enterTimer.current) window.clearTimeout(enterTimer.current);
    };
  }, []);

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
    <div
      className={`relative min-h-screen bg-[#0A0A0A] text-white overflow-hidden ${
        entering ? "is-entering-engine" : ""
      }`}
    >
      <CoverBackdrop images={coverImages} visible={isCover || entering} />

      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none dot-pattern ${
          isCover || entering ? "dot-pattern-hidden" : "dot-pattern-visible"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      {/* Slide */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-10 md:px-24 py-16">
        <div className="max-w-5xl w-full">
          <article
            key={index}
            className={`deck-slide ${isCover ? "deck-slide-cover" : "deck-slide-enter"}`}
          >
            <SlideBody
              content={current}
              calcInputs={calcInputs}
              setCalcInputs={setCalcInputs}
            />
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
          onClick={goPrev}
          disabled={index === 0 || entering}
          className="size-9 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous slide"
        >
          <svg className="size-4 text-white/80" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={goNext}
          disabled={index === slides.length - 1 || entering}
          className="size-9 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next slide"
        >
          <svg className="size-4 text-white/80" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

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
          margin-bottom: 1.5rem;
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
        .deck-slide > img, .deck-slide p > img {
          max-width: 520px;
          width: 100%;
          height: auto;
          margin: 0 auto 2rem;
          display: block;
        }

        /* Cover slide */
        .deck-slide-cover { text-align: center; }
        .deck-slide-cover p {
          text-align: center;
          font-size: 1rem;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.01em;
        }
        .deck-slide-cover em { font-style: normal; color: rgba(255,255,255,0.55); }

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

        /* Cover backdrop */
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

        /* Enter-engine transition (cover exit) */
        .deck-slide .ce-logo-mark {
          transition:
            transform 340ms cubic-bezier(0.55, 0, 0.25, 1),
            opacity 140ms ease-out;
          will-change: transform, opacity;
          transform-origin: 50% 50%;
        }
        .deck-slide .ce-logo-wordmark {
          transition: opacity 200ms ease-out;
          will-change: opacity;
        }
        .deck-slide-cover p {
          transition: opacity 200ms ease-out;
          will-change: opacity;
        }
        .cover-backdrop {
          transition: opacity 380ms ease-out;
          will-change: opacity;
        }
        .is-entering-engine .ce-logo-mark {
          transform: scale3d(8, 8, 1);
          opacity: 0;
        }
        .is-entering-engine .ce-logo-wordmark { opacity: 0; }
        .is-entering-engine .deck-slide-cover p { opacity: 0; }

        .cover-backdrop.is-visible { opacity: 1; }
        .cover-backdrop.is-hidden { opacity: 0; }

        .dot-pattern { transition: opacity 380ms ease-out; }
        .dot-pattern-visible { opacity: 0.3; }
        .dot-pattern-hidden { opacity: 0; }

        /* Slide enter */
        .deck-slide-enter {
          animation: deck-slide-enter 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: transform, opacity;
        }
        @keyframes deck-slide-enter {
          from { opacity: 0.35; transform: translate3d(0, 6px, 0); }
          to   { opacity: 1;    transform: translate3d(0, 0, 0); }
        }

        /* ─────────── Slide 3: revenue calculator ─────────── */
        .slide-calc h2 { margin-bottom: 2rem; }
        .slide-calc-body {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 3rem;
          align-items: center;
        }
        .slide-calc-sliders {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .slider-row-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.5rem;
        }
        .slider-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.45);
          font-weight: 500;
        }
        .slider-value {
          font-size: 1rem;
          font-weight: 600;
          color: white;
          font-variant-numeric: tabular-nums;
        }
        .deck-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.12);
          border-radius: 999px;
          outline: none;
          cursor: pointer;
        }
        .deck-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.08);
          transition: box-shadow 150ms ease;
        }
        .deck-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 6px rgba(255,255,255,0.14);
        }
        .deck-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.08);
        }
        .slide-calc-output {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          border-left: 1px solid rgba(255,255,255,0.08);
          padding-left: 2rem;
        }
        .calc-out-block p { margin: 0; }
        .calc-out-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(255,255,255,0.4);
          margin-bottom: 0.4rem !important;
        }
        .calc-out-value {
          font-size: 2.4rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: white;
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .calc-out-block-big .calc-out-value {
          font-size: 3.4rem;
        }
        .calc-out-accent { color: #34D399; }
        .slide-calc-foot {
          margin-top: 2.25rem;
          font-size: 0.95rem;
          color: rgba(255,255,255,0.5);
        }

        /* ─────────── Slide 9: investment ROI ─────────── */
        .slide-roi h2 { margin-bottom: 2rem; }
        .roi-bars {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }
        .roi-row {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 1.25rem;
          align-items: center;
        }
        .roi-tag {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(255,255,255,0.45);
          font-weight: 500;
        }
        .roi-bar-track {
          width: 100%;
          height: 44px;
          background: rgba(255,255,255,0.04);
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }
        .roi-bar {
          height: 100%;
          display: flex;
          align-items: center;
          padding: 0 0.9rem;
          border-radius: 6px;
          transition: width 450ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .roi-bar-invest { background: rgba(255,255,255,0.18); min-width: 90px; }
        .roi-bar-recover {
          background: linear-gradient(90deg, #10B981 0%, #34D399 100%);
        }
        .roi-bar-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .roi-bar-recover .roi-bar-label { color: #0A0A0A; }
        .roi-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 1.5rem 0;
          border-top: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .roi-summary-block p { margin: 0; }
        .roi-summary-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(255,255,255,0.4);
          margin-bottom: 0.4rem !important;
        }
        .roi-summary-value {
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: white;
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .roi-terms {
          list-style: none !important;
          padding: 0 !important;
          margin: 0 0 1.5rem 0 !important;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem 2rem;
        }
        .roi-terms li {
          padding-left: 0 !important;
          font-size: 0.95rem !important;
          color: rgba(255,255,255,0.72) !important;
          margin-bottom: 0 !important;
        }
        .roi-terms li::before { display: none !important; }
        .roi-terms li strong { color: white; }
        .slide-roi-foot {
          font-size: 0.95rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 1.5rem;
        }

        @media (prefers-reduced-motion: reduce) {
          .marquee-col,
          .deck-slide .ce-logo-mark,
          .deck-slide .ce-logo-wordmark,
          .deck-slide-cover p,
          .cover-backdrop,
          .roi-bar { transition: none !important; animation: none !important; }
          .deck-slide-enter { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
