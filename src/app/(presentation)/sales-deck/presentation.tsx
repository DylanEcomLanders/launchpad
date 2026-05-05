"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MegaphoneIcon,
  EnvelopeIcon,
  PaintBrushIcon,
  MapIcon,
  DocumentTextIcon,
  BeakerIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  ArrowLongRightIcon,
  SparklesIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

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
  target: number; // target CVR (%) — the CVR we'd hit together
}

const DEFAULT_CALC: CalcInputs = {
  traffic: 150000,
  cvr: 1.8,
  aov: 55,
  target: 2.8,
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
  const gapPp = Math.max(0, c.target - c.cvr);
  return c.traffic * (gapPp / 100) * c.aov;
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
  const pct = ((value - min) / (max - min)) * 100;
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
        style={{ ["--progress" as string]: `${pct}%` }}
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
      <p className="slide-kicker">Drag to model your numbers</p>
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
            label="Target CVR"
            value={inputs.target}
            min={0.5}
            max={6}
            step={0.1}
            format={(v) => `${v.toFixed(1)}%`}
            onChange={(v) => setInputs({ ...inputs, target: v })}
          />
        </div>
        <div className="slide-calc-output">
          <div className="calc-out-block">
            <p className="calc-out-label">Monthly recovered</p>
            <p className="calc-out-value">{formatGBP(monthly)}</p>
          </div>
          <div className="calc-out-block calc-out-block-big">
            <p className="calc-out-label calc-out-label-accent">Annual opportunity</p>
            <p className="calc-out-value calc-out-value-accent">{formatGBP(annual)}</p>
          </div>
        </div>
      </div>
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

  const monthlyRev = inputs.traffic * inputs.aov;
  const breakeven = monthlyRev > 0 ? (RETAINER / monthlyRev) * 100 : 0;

  return (
    <div className="slide-roi">
      <p className="slide-kicker">Investment vs return</p>
      <h2>The investment.</h2>

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
          <span className="roi-tag roi-tag-accent">You recover</span>
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
          <p className="roi-summary-value roi-summary-value-accent">
            {ratio > 0 ? ratio.toFixed(1) : "0.0"}×
          </p>
        </div>
        <div className="roi-summary-block">
          <p className="roi-summary-label">Annual gain</p>
          <p className="roi-summary-value">{formatGBP(annualGain)}</p>
        </div>
        <div className="roi-summary-block">
          <p className="roi-summary-label">Breakeven CVR lift</p>
          <p className="roi-summary-value">{breakeven.toFixed(2)}%</p>
        </div>
      </div>

      <div className="roi-pills">
        <span className="roi-pill">£8K/mo flat</span>
        <span className="roi-pill">90-day minimum</span>
        <span className="roi-pill">30-day notice from M4</span>
        <span className="roi-pill">No setup, no upcharges</span>
      </div>
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

// ─────────── Slide 2: Leak nobody owns ───────────
function LeakDiagramSlide() {
  return (
    <div className="slide-leak">
      <p className="slide-kicker">The entire post-click layer</p>
      <h2>
        <span className="h2-muted">Take the traffic you&rsquo;re paying for.</span><br />
        Make it work harder.
      </h2>

      <div className="stack-row">
        <div className="stack-node">
          <p className="stack-label">Acquisition</p>
          <p className="stack-sub">Ads — the spend that brings traffic in</p>
          <p className="stack-tag">Ads agency</p>
        </div>
        <div className="stack-arrow" aria-hidden>
          <ArrowLongRightIcon />
        </div>
        <div className="stack-node stack-node-us">
          <span className="stack-node-badge">This is where we come in</span>
          <p className="stack-label">Conversion</p>
          <p className="stack-sub">
            Every click, working harder — we supercharge the entire post-click experience
          </p>
          <p className="stack-tag stack-tag-us">The layer we own</p>
        </div>
        <div className="stack-arrow" aria-hidden>
          <ArrowLongRightIcon />
        </div>
        <div className="stack-node">
          <p className="stack-label">Retention</p>
          <p className="stack-sub">Email / SMS — the list that brings them back</p>
          <p className="stack-tag">Email agency</p>
        </div>
      </div>

      <div className="benefits-row">
        <p className="benefits-kicker">What our layer unlocks</p>
        <div className="benefits-grid">
          <div className="benefit">
            <ArrowTrendingUpIcon className="benefit-icon" />
            <p className="benefit-title">Higher LTV</p>
            <p className="benefit-desc">Bundles, upsells &amp; post-purchase flows that grow order value</p>
          </div>
          <div className="benefit">
            <ArrowTrendingDownIcon className="benefit-icon" />
            <p className="benefit-title">Fight rising CAC</p>
            <p className="benefit-desc">Same ad spend, more customers — conversion beats acquisition cost</p>
          </div>
          <div className="benefit">
            <LinkIcon className="benefit-icon" />
            <p className="benefit-title">Funnel congruency</p>
            <p className="benefit-desc">Ad → landing → offer aligned end-to-end, no mixed messages</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────── Slide 4: Page build vs Conversion Engine ───────────
function PageBuildVsCESlide() {
  const stack = [
    "Roadmap",
    "Landing pages",
    "PDPs",
    "Cart",
    "Checkout",
    "Post-purchase",
    "Bundles + AOV",
    "A/B tests",
    "Reporting",
  ];
  return (
    <div className="slide-compare">
      <p className="slide-kicker">Where this fits next to a page build</p>
      <h2>One precision tool, or the whole system.</h2>

      <div className="compare-row">
        <div className="compare-side">
          <span className="compare-tag">One page</span>
          <div className="compare-stack compare-stack-single">
            {stack.map((s, i) => (
              <div
                key={s}
                className={`stack-tile ${i === 2 ? "stack-tile-on" : "stack-tile-off"}`}
              >
                {s}
              </div>
            ))}
          </div>
          <p className="compare-sub">Scoped brief → polished asset → live.</p>
        </div>

        <div className="compare-arrow" aria-hidden>
          <span className="compare-arrow-label">Graduates to</span>
          <ArrowLongRightIcon className="compare-arrow-icon" />
        </div>

        <div className="compare-side compare-side-accent">
          <span className="compare-tag compare-tag-accent">Whole stack</span>
          <div className="compare-stack">
            {stack.map((s) => (
              <div key={s} className="stack-tile stack-tile-on stack-tile-accent">
                {s}
              </div>
            ))}
          </div>
          <p className="compare-sub">We own the roadmap. CVR keeps climbing.</p>
        </div>
      </div>
    </div>
  );
}

// ─────────── Slide 5: Partner, not vendor ───────────
function PartnerDiagramSlide() {
  return (
    <div className="slide-partner">
      <p className="slide-kicker">How we sit in your stack</p>
      <h2>Conversion partner, not vendor.</h2>

      <div className="partner-diagram">
        <div className="partner-brand">
          <span className="partner-brand-tag">Owner</span>
          <p className="partner-brand-label">Your brand</p>
        </div>
        <div className="partner-lines" aria-hidden>
          <span /> <span /> <span />
        </div>
        <div className="partner-row">
          <div className="partner-node">
            <MegaphoneIcon className="partner-node-icon" />
            <p className="partner-node-label">Ads agency</p>
            <p className="partner-node-scope">Traffic in</p>
          </div>
          <div className="partner-node partner-node-accent">
            <span className="partner-node-badge">Peer</span>
            <SparklesIcon className="partner-node-icon" />
            <p className="partner-node-label">Conversion Engine</p>
            <p className="partner-node-scope">Click → buy</p>
          </div>
          <div className="partner-node">
            <EnvelopeIcon className="partner-node-icon" />
            <p className="partner-node-label">Email agency</p>
            <p className="partner-node-scope">Retain + LTV</p>
          </div>
        </div>
      </div>

      <p className="slide-foot slide-foot-emphasis">
        We sit beside, not underneath. One owner for everything post-click.
      </p>
    </div>
  );
}

// ─────────── Slide 6: Monthly scope ───────────
function ScopeGridSlide() {
  const items = [
    { icon: MapIcon, title: "Rolling roadmap", desc: "Live in Miro, updated weekly", group: "Strategy" },
    { icon: DocumentTextIcon, title: "Page builds", desc: "PDPs, landers, advertorials", group: "Execution" },
    { icon: BeakerIcon, title: "A/B testing", desc: "Cadence tiered to your traffic", group: "Execution" },
    { icon: ShoppingCartIcon, title: "AOV + LTV", desc: "Bundles, upsells, post-purchase", group: "Optimisation" },
    { icon: SparklesIcon, title: "Offer + positioning", desc: "Hero, value props, proof", group: "Optimisation" },
    { icon: ChartBarIcon, title: "Monthly readout", desc: "What shipped. What moved. What's next.", group: "Reporting" },
  ];
  return (
    <div className="slide-scope">
      <p className="slide-kicker">Everything post-click, one retainer</p>
      <h2>What&rsquo;s in the monthly scope.</h2>

      <div className="scope-grid">
        {items.map((it) => (
          <div key={it.title} className="scope-card">
            <span className="scope-group">{it.group}</span>
            <it.icon className="scope-icon" />
            <p className="scope-title">{it.title}</p>
            <p className="scope-desc">{it.desc}</p>
          </div>
        ))}
      </div>

      <p className="slide-foot">
        No à la carte. No per-page upcharges. One retainer, one team.
      </p>
    </div>
  );
}

// ─────────── Slide 7: The rhythm ───────────
function RhythmTimelineSlide() {
  const weeks = [
    { label: "Week 1", title: "Strategy", desc: "Roadmap update, priority review" },
    { label: "Weeks 2–3", title: "Design + build", desc: "Figma → dev → staging" },
    { label: "Week 4", title: "Live, test, learn", desc: "Ship, measure, feed next cycle" },
  ];
  return (
    <div className="slide-rhythm">
      <p className="slide-kicker">Every month, on cadence</p>
      <h2>The rhythm.</h2>

      <div className="rhythm-track">
        <div className="rhythm-line" aria-hidden />
        {weeks.map((w, i) => (
          <div key={w.label} className="rhythm-step">
            <span className="rhythm-dot" aria-hidden>{i + 1}</span>
            <span className="rhythm-week">{w.label}</span>
            <p className="rhythm-title">{w.title}</p>
            <p className="rhythm-desc">{w.desc}</p>
          </div>
        ))}
        <div className="rhythm-loop" aria-hidden>
          <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.25">
            <path
              d="M 16 8 A 28 28 0 1 1 16 72"
              strokeLinecap="round"
            />
            <path d="M 8 60 L 16 72 L 24 60" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="rhythm-loop-label">Repeats monthly</span>
        </div>
      </div>

      <p className="slide-foot slide-foot-emphasis">
        Every week you see progress. Every month you see numbers. Every quarter, the lift compounds.
      </p>
    </div>
  );
}

// ─────────── Slide 8: Proof ───────────
function ProofStatsSlide() {
  const wins = [
    {
      metric: "+22%",
      brand: "Anglo Spirit",
      lever: "Hero lander",
      detail: "Cold-traffic CVR on a rebuilt hero lander",
      // sparkline points (left baseline → right peak), normalized 0-100
      spark: [22, 28, 26, 35, 42, 48, 60, 72, 88],
    },
    {
      metric: "+14%",
      brand: "Client Y",
      lever: "Cart bundle",
      detail: "AOV via a cart-level bundle",
      spark: [40, 38, 45, 50, 48, 58, 64, 70, 78],
    },
    {
      metric: "+7%",
      brand: "Client Z",
      lever: "Sticky ATC",
      detail: "Mobile PDP CVR with sticky ATC",
      spark: [50, 52, 56, 54, 60, 62, 66, 68, 72],
    },
  ];
  return (
    <div className="slide-proof">
      <p className="slide-kicker">Real brands · real lifts · compounding</p>
      <h2>Proof.</h2>

      <div className="proof-grid">
        {wins.map((w) => {
          const points = w.spark
            .map((y, i) => `${(i / (w.spark.length - 1)) * 100},${100 - y}`)
            .join(" ");
          return (
            <div key={w.brand} className="proof-card">
              <p className="proof-metric">{w.metric}</p>
              <svg
                className="proof-spark"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <polyline
                  points={points}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="proof-meta">
                <span className="proof-brand-chip">{w.brand}</span>
                <span className="proof-lever">{w.lever}</span>
              </div>
              <p className="proof-detail">{w.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────── Slide 10: Next step ───────────
function NextStepSlide() {
  return (
    <div className="slide-next">
      <p className="slide-kicker">One step from here</p>
      <h2>Next step.</h2>

      <div className="next-hero">
        <div className="next-hero-left">
          <span className="next-hero-tag">Strategy call</span>
          <p className="next-hero-title">
            Align on the first 90 days.
          </p>
          <p className="next-hero-desc">
            No deck, no pitch — just the plan. We walk through the roadmap, the leak points, the math.
          </p>
          <div className="next-hero-meta">
            <span>30 min</span>
            <span aria-hidden>·</span>
            <span>Google Meet</span>
            <span aria-hidden>·</span>
            <span>No prep needed</span>
          </div>
          <a
            href="https://cal.com/ecomlanders"
            target="_blank"
            rel="noopener noreferrer"
            className="next-hero-cta"
          >
            Book a slot →
          </a>
        </div>
        <div className="next-hero-right" aria-hidden>
          <div className="next-cal">
            <div className="next-cal-head">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
            </div>
            <div className="next-cal-body">
              {Array.from({ length: 20 }).map((_, i) => {
                const lit = [2, 4, 7, 10, 12, 14, 18].includes(i);
                const hot = i === 7;
                return (
                  <span
                    key={i}
                    className={`next-cal-cell ${lit ? "next-cal-cell-lit" : ""} ${
                      hot ? "next-cal-cell-hot" : ""
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="slide-foot next-foot-secondary">
        Want the full revenue model first? <a href="mailto:dylan@ecomlanders.com">Email us for a deep-dive audit</a> — custom-built from your analytics, includes a 90-day roadmap draft.
      </p>
    </div>
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
  if (content.includes("::leak-diagram::")) return <LeakDiagramSlide />;
  if (content.includes("::page-build-vs-ce::")) return <PageBuildVsCESlide />;
  if (content.includes("::partner-diagram::")) return <PartnerDiagramSlide />;
  if (content.includes("::scope-grid::")) return <ScopeGridSlide />;
  if (content.includes("::rhythm-timeline::")) return <RhythmTimelineSlide />;
  if (content.includes("::proof-stats::")) return <ProofStatsSlide />;
  if (content.includes("::next-step::")) return <NextStepSlide />;
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
  const [exitingContent, setExitingContent] = useState<string | null>(null);
  const enterTimer = useRef<number | null>(null);
  const [calcInputs, setCalcInputs] = useState<CalcInputs>(DEFAULT_CALC);

  const goNext = useCallback(() => {
    if (entering) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (index === 0 && slides.length > 1 && !reduce) {
      // Cross-fade: render cover as overlay, swap to slide 2 immediately so it enters underneath
      setExitingContent(slides[0]);
      setEntering(true);
      setIndex(1);
      enterTimer.current = window.setTimeout(() => {
        setExitingContent(null);
        setEntering(false);
      }, 520);
      return;
    }
    setIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [index, slides, entering]);

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
      <CoverBackdrop images={coverImages} visible={isCover && !entering} />

      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none dot-pattern ${
          isCover && !entering ? "dot-pattern-hidden" : "dot-pattern-visible"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      {/* Slide */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-10 md:px-24 py-16">
        <div className="max-w-5xl w-full relative">
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

          {exitingContent && (
            <article className="deck-slide deck-slide-cover slide-exiting-overlay">
              <SlideBody
                content={exitingContent}
                calcInputs={calcInputs}
                setCalcInputs={setCalcInputs}
              />
            </article>
          )}
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
          font-size: 4.5rem;
          font-weight: 800;
          letter-spacing: -0.028em;
          margin-bottom: 1.5rem;
          line-height: 1.02;
          color: white;
        }
        .deck-slide h2 {
          font-size: 3.5rem;
          font-weight: 700;
          letter-spacing: -0.028em;
          margin-bottom: 2.25rem;
          line-height: 1.04;
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

        /* Enter-engine transition (cover exit).
           Mark uses a keyframe animation so it can blow up to 22× for drama
           while the opacity curve forces it invisible before it gets past ~5×. */
        .deck-slide .ce-logo-mark {
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
          animation: mark-exit 520ms cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }
        @keyframes mark-exit {
          0%   { transform: scale3d(1, 1, 1);     opacity: 1; }
          25%  { transform: scale3d(4, 4, 1);     opacity: 0.85; }
          50%  { transform: scale3d(9, 9, 1);     opacity: 0.25; }
          65%  { transform: scale3d(14, 14, 1);   opacity: 0; }
          100% { transform: scale3d(22, 22, 1);   opacity: 0; }
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
          animation: deck-slide-enter 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: transform, opacity;
        }
        @keyframes deck-slide-enter {
          from { opacity: 0;    transform: translate3d(0, 10px, 0); }
          to   { opacity: 1;    transform: translate3d(0, 0, 0); }
        }

        /* Cross-fade overlay: the exiting cover stays on top while the next slide rises in underneath */
        .slide-exiting-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          pointer-events: none;
          z-index: 2;
        }

        /* ─────────── Shared slide bits ─────────── */
        .slide-kicker {
          font-size: 0.72rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.45) !important;
          font-weight: 500;
          margin: 0 0 1.25rem 0 !important;
        }
        .slide-foot {
          margin-top: 3rem !important;
          font-size: 1rem !important;
          color: rgba(255,255,255,0.55) !important;
          max-width: 48rem;
        }
        .slide-foot-emphasis {
          color: white !important;
          font-weight: 600;
          font-size: 1.1rem !important;
        }

        /* ─────────── Slide 3: revenue calculator ─────────── */
        .slide-calc-body {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 4rem;
          align-items: center;
        }
        .slide-calc-sliders {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }
        .slider-row-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.6rem;
        }
        .slider-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
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
          height: 6px;
          background: linear-gradient(
            to right,
            white 0%,
            white var(--progress, 0%),
            rgba(255,255,255,0.12) var(--progress, 0%),
            rgba(255,255,255,0.12) 100%
          );
          border-radius: 999px;
          outline: none;
          cursor: pointer;
        }
        .deck-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.08), 0 2px 10px rgba(0,0,0,0.4);
          transition: transform 150ms ease, box-shadow 150ms ease;
          margin-top: 0;
        }
        .deck-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 0 0 8px rgba(255,255,255,0.14), 0 2px 12px rgba(0,0,0,0.5);
        }
        .deck-slider:active::-webkit-slider-thumb {
          transform: scale(1.15);
          box-shadow: 0 0 0 10px rgba(255,255,255,0.2), 0 2px 14px rgba(0,0,0,0.5);
        }
        .deck-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.08), 0 2px 10px rgba(0,0,0,0.4);
          transition: transform 150ms ease, box-shadow 150ms ease;
        }
        .deck-slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 0 0 8px rgba(255,255,255,0.14), 0 2px 12px rgba(0,0,0,0.5);
        }
        .slide-calc-output {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .calc-out-block p { margin: 0; }
        .calc-out-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.4);
          margin-bottom: 0.6rem !important;
          font-weight: 600;
        }
        .calc-out-label-accent { color: #34D399 !important; }
        .calc-out-value {
          font-size: 3rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: white;
          font-variant-numeric: tabular-nums;
          line-height: 0.95;
        }
        .calc-out-block-big .calc-out-value {
          font-size: 6.5rem;
        }
        .calc-out-value-accent {
          color: #34D399 !important;
          text-shadow: 0 0 60px rgba(52, 211, 153, 0.25);
        }

        /* ─────────── Slide 9: investment ROI ─────────── */
        .slide-roi h2 { margin-bottom: 2.5rem; }
        .roi-bars {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }
        .roi-row {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 1.5rem;
          align-items: center;
        }
        .roi-tag {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.45);
          font-weight: 600;
        }
        .roi-tag-accent { color: #34D399; }
        .roi-bar-track {
          width: 100%;
          height: 80px;
          background: transparent;
          position: relative;
        }
        .roi-bar {
          height: 100%;
          display: flex;
          align-items: center;
          padding: 0 1.4rem;
          border-radius: 6px;
          transition: width 450ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .roi-bar-invest {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.1);
          min-width: 120px;
        }
        .roi-bar-recover {
          background: linear-gradient(90deg, #34D399 0%, #10B981 100%);
          box-shadow: 0 12px 40px -12px rgba(16,185,129,0.5);
        }
        .roi-bar-label {
          font-size: 1.15rem;
          font-weight: 700;
          color: white;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          letter-spacing: -0.01em;
        }
        .roi-bar-recover .roi-bar-label { color: #052E22; }
        .roi-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-bottom: 2rem;
          padding: 1.75rem 0;
          border-top: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .roi-summary-block p { margin: 0; }
        .roi-summary-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.4);
          margin-bottom: 0.65rem !important;
          font-weight: 600;
        }
        .roi-summary-value {
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.025em;
          color: white;
          font-variant-numeric: tabular-nums;
          line-height: 0.95;
        }
        .roi-summary-value-accent { color: #34D399; }
        .roi-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .roi-pill {
          font-size: 0.72rem;
          padding: 0.4rem 0.85rem;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          color: rgba(255,255,255,0.7);
          letter-spacing: -0.005em;
          font-weight: 500;
          background: rgba(255,255,255,0.02);
        }

        /* ─────────── Slide 2: Missing layer ─────────── */
        .slide-leak { text-align: center; }
        .slide-leak h2 {
          max-width: 54rem;
          margin: 0 auto 3rem;
          text-align: center;
        }
        .slide-leak .slide-kicker { text-align: center; }
        .slide-leak .h2-muted { color: rgba(255,255,255,0.5); font-weight: 700; }
        .stack-row {
          display: grid;
          grid-template-columns: 0.85fr auto 1.5fr auto 0.85fr;
          align-items: stretch;
          gap: 0.9rem;
          margin: 0 -2.5rem 1rem;
        }
        .stack-node {
          position: relative;
          padding: 1.75rem 1.5rem 1.5rem;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          background: rgba(255,255,255,0.015);
          display: flex;
          flex-direction: column;
          opacity: 0.5;
        }
        .stack-node-us {
          border: 1px solid rgba(52, 211, 153, 0.5);
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.11) 0%, rgba(16, 185, 129, 0.02) 100%);
          opacity: 1;
          box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.06), 0 12px 40px -20px rgba(16, 185, 129, 0.25);
        }
        .stack-node-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #34D399;
          color: #0A0A0A;
          font-size: 0.66rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          padding: 0.3rem 0.85rem;
          border-radius: 4px;
          white-space: nowrap;
        }
        .stack-icon {
          width: 22px;
          height: 22px;
          color: rgba(255,255,255,0.5);
          margin-bottom: 1rem;
        }
        .stack-node-us .stack-icon { color: #34D399; }
        .stack-label {
          margin: 0 0 0.4rem 0 !important;
          font-size: 2rem !important;
          font-weight: 700 !important;
          color: white !important;
          letter-spacing: -0.025em;
          line-height: 1;
        }
        .stack-sub {
          margin: 0 0 1.5rem 0 !important;
          font-size: 0.95rem !important;
          color: rgba(255,255,255,0.6) !important;
          line-height: 1.45;
        }
        .stack-node-us .stack-sub { color: rgba(255,255,255,0.75) !important; }
        .stack-tag {
          margin: auto 0 0 0 !important;
          font-size: 0.68rem !important;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4) !important;
          font-weight: 600;
          padding-top: 1rem;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .stack-tag-us {
          color: #34D399 !important;
          border-top: 1px solid rgba(52, 211, 153, 0.25) !important;
        }
        .stack-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stack-arrow svg {
          width: 24px;
          height: 24px;
          color: rgba(255,255,255,0.3);
        }

        .benefits-row {
          margin: 3rem -2.5rem 0;
          padding: 2rem 0 0;
          border-top: 1px solid rgba(52, 211, 153, 0.22);
          position: relative;
        }
        .benefits-row::before {
          content: "";
          position: absolute;
          top: -5px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          background: #34D399;
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(10,10,10,1);
        }
        .benefits-kicker {
          font-size: 0.7rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #34D399 !important;
          font-weight: 600;
          margin: 0 0 1.25rem 0 !important;
          text-align: center;
        }
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2.5rem;
        }
        .benefit {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .benefit-icon {
          width: 28px;
          height: 28px;
          color: #34D399;
          margin: 0 auto 1rem;
        }
        .benefit-title {
          margin: 0 0 0.5rem 0 !important;
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: white !important;
          letter-spacing: -0.02em;
        }
        .benefit-desc {
          margin: 0 !important;
          font-size: 0.92rem !important;
          color: rgba(255,255,255,0.6) !important;
          line-height: 1.5;
          max-width: 16rem;
        }

        /* ─────────── Slide 4: Page build vs CE ─────────── */
        .slide-compare h2 { max-width: 36rem; margin-bottom: 3rem; }
        .compare-row {
          display: grid;
          grid-template-columns: 1fr auto 1.5fr;
          gap: 2.5rem;
          align-items: stretch;
        }
        .compare-side {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .compare-tag {
          display: inline-block;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
          margin: 0;
          align-self: flex-start;
        }
        .compare-tag-accent { color: #34D399; }
        .compare-stack {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          padding: 1rem;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          background: rgba(255,255,255,0.012);
          flex: 1;
        }
        .compare-side-accent .compare-stack {
          border-color: rgba(52,211,153,0.3);
          background: linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.01) 100%);
          box-shadow: 0 12px 40px -20px rgba(16,185,129,0.25);
        }
        .stack-tile {
          padding: 0.85rem 0.6rem;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          font-size: 0.78rem;
          text-align: center;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
          letter-spacing: -0.005em;
          background: transparent;
          line-height: 1.2;
        }
        .stack-tile-off { opacity: 0.35; }
        .stack-tile-on {
          color: white;
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.18);
        }
        .stack-tile-accent {
          color: white;
          background: rgba(52,211,153,0.08);
          border-color: rgba(52,211,153,0.35);
        }
        .compare-sub {
          font-size: 0.92rem !important;
          color: rgba(255,255,255,0.55) !important;
          margin: 0 !important;
          line-height: 1.45;
        }
        .compare-side-accent .compare-sub { color: rgba(255,255,255,0.75) !important; }

        .compare-arrow {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding-top: 2.5rem;
        }
        .compare-arrow-label {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.35);
          font-weight: 600;
          white-space: nowrap;
        }
        .compare-arrow-icon {
          width: 28px;
          height: 28px;
          color: rgba(52,211,153,0.6);
        }

        /* ─────────── Slide 5: Partner diagram ─────────── */
        .slide-partner h2 { margin-bottom: 3rem; text-align: center; }
        .slide-partner .slide-kicker { text-align: center; }
        .partner-diagram {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 3rem;
        }
        .partner-brand {
          position: relative;
          padding: 1rem 2.5rem;
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 999px;
          background: rgba(255,255,255,0.025);
        }
        .partner-brand-tag {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.6);
          background: #0A0A0A;
          padding: 0 0.6rem;
          font-weight: 600;
        }
        .partner-brand-label {
          margin: 0 !important;
          font-size: 0.95rem !important;
          letter-spacing: -0.01em;
          color: white !important;
          font-weight: 700;
        }
        .partner-lines {
          position: relative;
          width: 70%;
          max-width: 720px;
          height: 64px;
          margin: 0 auto;
        }
        .partner-lines span {
          position: absolute;
          top: 0;
          width: 1px;
          height: 100%;
          background: rgba(255,255,255,0.14);
        }
        .partner-lines span:nth-child(1) { left: 16.67%; }
        .partner-lines span:nth-child(2) { left: 50%; background: rgba(52,211,153,0.4); }
        .partner-lines span:nth-child(3) { left: 83.33%; }
        .partner-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          width: 70%;
          max-width: 720px;
        }
        .partner-node {
          position: relative;
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 1.5rem 1.25rem;
          text-align: center;
          opacity: 0.6;
        }
        .partner-node-accent {
          opacity: 1;
          border-color: rgba(52,211,153,0.5);
          background: linear-gradient(180deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%);
          box-shadow: 0 12px 40px -20px rgba(16,185,129,0.3);
        }
        .partner-node-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: #34D399;
          color: #0A0A0A;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          padding: 0.25rem 0.7rem;
          border-radius: 4px;
          white-space: nowrap;
        }
        .partner-node-icon {
          width: 22px;
          height: 22px;
          color: rgba(255,255,255,0.5);
          margin: 0 auto 0.75rem;
        }
        .partner-node-accent .partner-node-icon { color: #34D399; }
        .partner-node-label {
          margin: 0 0 0.3rem 0 !important;
          font-size: 1rem !important;
          font-weight: 700 !important;
          color: white !important;
          letter-spacing: -0.01em;
        }
        .partner-node-scope {
          margin: 0 !important;
          font-size: 0.72rem !important;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(255,255,255,0.4) !important;
          font-weight: 500;
        }
        .partner-node-accent .partner-node-scope { color: #34D399 !important; }

        /* ─────────── Slide 6: Scope ─────────── */
        .scope-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .scope-card {
          position: relative;
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 1.5rem 1.4rem 1.4rem;
          transition: border-color 200ms ease, background 200ms ease;
        }
        .scope-card:hover {
          border-color: rgba(52,211,153,0.3);
          background: rgba(52,211,153,0.03);
        }
        .scope-group {
          display: inline-block;
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #34D399;
          font-weight: 600;
          margin-bottom: 0.85rem;
        }
        .scope-icon {
          width: 26px;
          height: 26px;
          color: rgba(255,255,255,0.65);
          margin-bottom: 0.85rem;
        }
        .scope-title {
          margin: 0 0 0.35rem 0 !important;
          font-size: 1.1rem !important;
          font-weight: 700 !important;
          color: white !important;
          letter-spacing: -0.015em;
        }
        .scope-desc {
          margin: 0 !important;
          font-size: 0.88rem !important;
          color: rgba(255,255,255,0.55) !important;
          line-height: 1.45;
        }

        /* ─────────── Slide 7: Rhythm ─────────── */
        .rhythm-track {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, 1fr) auto;
          gap: 2rem;
          padding-top: 1.5rem;
          margin-bottom: 2.5rem;
          align-items: start;
        }
        .rhythm-line {
          position: absolute;
          top: 16px;
          left: 8%;
          right: 22%;
          height: 1px;
          background: rgba(255,255,255,0.16);
          z-index: 0;
        }
        .rhythm-step {
          position: relative;
          padding-top: 1.25rem;
          z-index: 1;
        }
        .rhythm-dot {
          position: absolute;
          top: -16px;
          left: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #0A0A0A;
          border: 1px solid rgba(52,211,153,0.6);
          color: #34D399;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .rhythm-week {
          display: block;
          font-size: 0.7rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #34D399 !important;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 1.5rem;
        }
        .rhythm-title {
          margin: 0 0 0.4rem 0 !important;
          font-size: 1.4rem !important;
          font-weight: 700 !important;
          color: white !important;
          letter-spacing: -0.02em;
        }
        .rhythm-desc {
          margin: 0 !important;
          font-size: 0.92rem !important;
          color: rgba(255,255,255,0.55) !important;
        }
        .rhythm-loop {
          position: relative;
          padding: 0.5rem 0 0 1rem;
          color: rgba(52,211,153,0.55);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          width: 88px;
        }
        .rhythm-loop svg {
          width: 56px;
          height: 56px;
        }
        .rhythm-loop-label {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #34D399;
          font-weight: 600;
          text-align: center;
          line-height: 1.2;
        }

        /* ─────────── Slide 8: Proof ─────────── */
        .slide-proof h2 { margin-bottom: 2.5rem; }
        .proof-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2.5rem;
          margin-bottom: 2rem;
          padding-top: 0;
        }
        .proof-card {
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 1.75rem 1.5rem 1.5rem;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .proof-metric {
          margin: 0 0 0.5rem 0 !important;
          font-size: 4.5rem !important;
          font-weight: 800 !important;
          letter-spacing: -0.04em;
          color: #34D399 !important;
          line-height: 0.9;
          font-variant-numeric: tabular-nums;
        }
        .proof-spark {
          width: 100%;
          height: 48px;
          color: #34D399;
          opacity: 0.55;
          margin-bottom: 1.25rem;
        }
        .proof-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.6rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .proof-brand-chip {
          font-size: 0.78rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.005em;
        }
        .proof-lever {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px;
          margin-left: auto;
        }
        .proof-detail {
          margin: 0 !important;
          font-size: 0.85rem !important;
          color: rgba(255,255,255,0.55) !important;
          line-height: 1.45;
        }

        /* ─────────── Slide 10: Next ─────────── */
        .slide-next h2 { margin-bottom: 2.5rem; }
        .next-hero {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 3rem;
          align-items: center;
          margin-bottom: 2rem;
          padding: 2rem;
          border: 1px solid rgba(52,211,153,0.25);
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.01) 100%);
        }
        .next-hero-left {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .next-hero-tag {
          display: inline-block;
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #34D399;
          font-weight: 700;
          align-self: flex-start;
        }
        .next-hero-title {
          margin: 0 !important;
          font-size: 2.25rem !important;
          font-weight: 700 !important;
          color: white !important;
          letter-spacing: -0.025em;
          line-height: 1.05;
        }
        .next-hero-desc {
          margin: 0 !important;
          font-size: 0.95rem !important;
          color: rgba(255,255,255,0.6) !important;
          line-height: 1.55;
        }
        .next-hero-meta {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
          margin-top: 0.4rem;
        }
        .next-hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.95rem 1.5rem;
          background: #34D399;
          color: #052E22 !important;
          font-weight: 700;
          font-size: 1rem;
          text-decoration: none !important;
          border-radius: 8px;
          transition: background 150ms ease, transform 150ms ease;
          letter-spacing: -0.01em;
          margin-top: 1rem;
          align-self: flex-start;
          box-shadow: 0 12px 40px -12px rgba(16,185,129,0.5);
        }
        .next-hero-cta:hover {
          background: #10B981;
          transform: translateY(-1px);
        }
        .next-hero-right {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .next-cal {
          width: 100%;
          padding: 1rem 1.1rem;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
        }
        .next-cal-head {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.5rem;
          margin-bottom: 0.65rem;
        }
        .next-cal-head span {
          font-size: 0.55rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(255,255,255,0.35);
          text-align: center;
          font-weight: 600;
        }
        .next-cal-body {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.5rem;
        }
        .next-cal-cell {
          aspect-ratio: 1;
          border-radius: 4px;
          background: rgba(255,255,255,0.04);
        }
        .next-cal-cell-lit {
          background: rgba(52,211,153,0.25);
        }
        .next-cal-cell-hot {
          background: #34D399;
          box-shadow: 0 0 0 2px rgba(52,211,153,0.25), 0 0 24px rgba(52,211,153,0.5);
        }
        .next-foot-secondary {
          margin-top: 1.5rem !important;
          font-size: 0.85rem !important;
          color: rgba(255,255,255,0.5) !important;
        }
        .next-foot-secondary a {
          color: rgba(255,255,255,0.85) !important;
          text-decoration: underline !important;
          text-decoration-color: rgba(255,255,255,0.3);
        }
        .next-foot-secondary a:hover {
          text-decoration-color: rgba(255,255,255,0.7);
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
