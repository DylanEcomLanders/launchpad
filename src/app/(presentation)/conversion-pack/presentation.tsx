"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Logo } from "@/components/logo";

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
  aov: number; // current £
  target: number; // target CVR (%) — the CVR we'd hit together
  targetAov: number; // target AOV (£) — uplifted via bundles, upsells
}

const DEFAULT_CALC: CalcInputs = {
  traffic: 150000,
  cvr: 1.8,
  aov: 55,
  target: 2.8,
  targetAov: 70,
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
  const currentRev = c.traffic * (c.cvr / 100) * c.aov;
  const newRev = c.traffic * (c.target / 100) * (c.targetAov || c.aov);
  return Math.max(0, newRev - currentRev);
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
  const currentMonthly = inputs.traffic * (inputs.cvr / 100) * inputs.aov;
  const newMonthly = currentMonthly + monthly;
  const liftMultiplier = currentMonthly > 0 ? newMonthly / currentMonthly : 1;
  const liftPct = currentMonthly > 0 ? ((newMonthly - currentMonthly) / currentMonthly) * 100 : 0;
  const roi = monthly > 0 ? monthly / 8000 : 0;
  return (
    <div className="slide-calc-v2">
      <p className="slide-kicker">The opportunity</p>
      <h2 className="calc-v2-headline">
        Make every bit of ad spend count.{" "}
        <span className="calc-v2-headline-accent">
          So when you scale, it compounds.
        </span>
      </h2>
      <p className="calc-v2-sub">
        Let&rsquo;s see where you are right now — and what you could be leaving on the table.
      </p>

      <div className="calc-v2-body">
        <div className="calc-v2-left">
          <div className="calc-v2-sliders">
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
              label="Target CVR"
              value={inputs.target}
              min={0.5}
              max={6}
              step={0.1}
              format={(v) => `${v.toFixed(1)}%`}
              onChange={(v) => setInputs({ ...inputs, target: v })}
            />
            <SliderRow
              label="Current AOV"
              value={inputs.aov}
              min={20}
              max={400}
              step={5}
              format={(v) => `£${v}`}
              onChange={(v) => setInputs({ ...inputs, aov: v })}
            />
            <SliderRow
              label="Target AOV"
              value={inputs.targetAov}
              min={20}
              max={400}
              step={5}
              format={(v) => `£${v}`}
              onChange={(v) => setInputs({ ...inputs, targetAov: v })}
            />
          </div>

          <div className="calc-v2-values">
            <div className="calc-v2-values-row calc-v2-values-row-hero">
              <p className="calc-v2-values-label">Annual opportunity</p>
              <p className="calc-v2-values-amount calc-v2-values-amount-hero">
                <span className="calc-v2-values-arrow" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7" />
                    <path d="M9 7h8v8" />
                  </svg>
                </span>
                +{formatGBP(annual)}
              </p>
              <p className="calc-v2-values-note">
                {roi.toFixed(1)}× return on retainer · existing traffic
              </p>
            </div>
          </div>
        </div>

        <div className="calc-v2-right">
          <RevenueBucket
            currentRev={currentMonthly}
            newRev={newMonthly}
            currentLabel={formatGBP(currentMonthly)}
            newLabel={formatGBP(newMonthly)}
            liftAmount={formatGBP(monthly)}
            liftLabel={`+${liftPct.toFixed(0)}%`}
          />
        </div>
      </div>
    </div>
  );
}

// ── Revenue split: two cards (lift + today) sized proportionally to revenue ──
function RevenueBucket({
  currentRev,
  newRev,
  liftAmount,
  currentLabel,
  newLabel,
  liftLabel,
}: {
  currentRev: number;
  newRev: number;
  liftAmount: string;
  currentLabel: string;
  newLabel: string;
  liftLabel: string;
}) {
  const total = Math.max(newRev, 1);
  const liftAmt = Math.max(0, newRev - currentRev);
  // Use a minimum proportion so very small cards don't collapse to invisible
  const liftRaw = liftAmt / total;
  const todayRaw = currentRev / total;
  const minRatio = 0.12;
  const liftRatio = Math.max(minRatio, liftRaw);
  const todayRatio = Math.max(minRatio, todayRaw);

  return (
    <div className="rev-bucket" aria-hidden>
      <div className="rev-bucket-cards">
        <div
          className="rev-bucket-card rev-bucket-card-lift"
          style={{ flexGrow: liftRatio }}
        >
          <span className="rev-bucket-card-arrow" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </span>
          <p className="rev-bucket-card-tag rev-bucket-card-tag-lift">Monthly lift</p>
          <p className="rev-bucket-card-value rev-bucket-card-value-lift">
            +{liftAmount}
          </p>
          <p className="rev-bucket-card-note rev-bucket-card-note-lift">
            {liftLabel} vs today
          </p>
        </div>
        <div
          className="rev-bucket-card rev-bucket-card-today"
          style={{ flexGrow: todayRatio }}
        >
          <p className="rev-bucket-card-tag">Today</p>
          <p className="rev-bucket-card-value">{currentLabel}</p>
        </div>
      </div>
      <p className="rev-bucket-axis">Same ad spend, recovered revenue</p>
    </div>
  );
}

// ── Slide: Investment ROI ──
function InvestmentRoiSlide({ inputs }: { inputs: CalcInputs }) {
  const monthly = monthlyRecovered(inputs);
  const ratio = monthly > 0 ? monthly / RETAINER : 0;
  const annualGain = monthly * 12;
  const monthlyRev = inputs.traffic * inputs.aov;
  const breakeven = monthlyRev > 0 ? (RETAINER / monthlyRev) * 100 : 0;

  return (
    <div className="slide-roi-v2">
      <p className="slide-kicker">Investment vs return</p>
      <h2 className="roi-v2-headline">
        For every £1 in,{" "}
        <span className="roi-v2-headline-accent">
          you pull back £{ratio.toFixed(1)}.
        </span>
      </h2>
      <p className="roi-v2-sub">
        The retainer is fixed. The recovered revenue compounds across your
        existing traffic, every month.
      </p>

      <div className="roi-v2-cards">
        <div className="roi-v2-card roi-v2-card-invest">
          <p className="roi-v2-card-tag">You invest</p>
          <p className="roi-v2-card-value">{formatGBP(RETAINER)}<span className="roi-v2-card-unit">/mo</span></p>
          <p className="roi-v2-card-note">Flat retainer, no per-page upcharges.</p>
          <p className="roi-v2-card-anchor">
            <span className="roi-v2-card-anchor-label">Or scale to</span>
            <span className="roi-v2-card-anchor-value">£12K/mo</span>
            <span className="roi-v2-card-anchor-note">for accelerated cadence</span>
          </p>
        </div>
        <div className="roi-v2-card roi-v2-card-recover">
          <span className="roi-v2-card-arrow" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </span>
          <p className="roi-v2-card-tag roi-v2-card-tag-recover">You recover</p>
          <p className="roi-v2-card-value roi-v2-card-value-recover">
            {formatGBP(monthly)}<span className="roi-v2-card-unit roi-v2-card-unit-recover">/mo</span>
          </p>
          <p className="roi-v2-card-note roi-v2-card-note-recover">
            Compounding lift from existing traffic.
          </p>
        </div>
      </div>

      <div className="roi-v2-summary">
        <div className="roi-v2-summary-block">
          <p className="roi-v2-summary-label">Return multiple</p>
          <p className="roi-v2-summary-value roi-v2-summary-value-accent">
            {ratio > 0 ? ratio.toFixed(1) : "0.0"}×
          </p>
        </div>
        <div className="roi-v2-summary-block">
          <p className="roi-v2-summary-label">Annual gain</p>
          <p className="roi-v2-summary-value">{formatGBP(annualGain)}</p>
        </div>
        <div className="roi-v2-summary-block">
          <p className="roi-v2-summary-label">Breakeven CVR lift</p>
          <p className="roi-v2-summary-value">{breakeven.toFixed(2)}%</p>
        </div>
      </div>

      <div className="roi-v2-pills">
        <span className="roi-v2-pill">£8K/mo flat</span>
        <span className="roi-v2-pill">90-day minimum</span>
        <span className="roi-v2-pill">No setup, no upcharges</span>
      </div>
    </div>
  );
}

// ── Markdown slide (default) ──
// ─────────── Slide 1: Cover ───────────
function CoverSlide() {
  return (
    <div className="slide-cover-v2">
      <div className="cover-v2-brand">
        <Logo height={26} className="text-foreground" />
      </div>
      <div className="cover-v2-body">
        <h1 className="cover-v2-headline">Conversion Engine Partnership</h1>
        <p className="cover-v2-sub">
          Compounding funnel-wide wins that recover the revenue you&rsquo;re losing — week after week.
        </p>
      </div>
      <div className="cover-v2-foot">
        <span className="cover-v2-foot-mark" />
        Funnel Conversion Layer, Optimised Weekly
      </div>
    </div>
  );
}

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
    <div className="slide-what">
      <p className="slide-kicker">What it is</p>
      <h2 className="what-headline">
        A monthly partnership built to{" "}
        <span className="what-headline-accent">recover the revenue</span>{" "}
        leaking from every stage of your funnel.
      </h2>

      <div className="what-pillars">
        <WhatPillar
          num="01"
          title="Strategy"
          desc="Continuous funnel audits pinpoint your biggest leaks — so we always know where to attack next."
        />
        <WhatPillar
          num="02"
          title="Build"
          desc="Pages, components, flows — we ship every conversion asset, week after week."
        />
        <WhatPillar
          num="03"
          title="Test"
          desc="Powered by Intelligems. Every change is A/B tested, so wins are proven, not guessed."
        />
        <WhatPillar
          num="04"
          title="Learn"
          desc="Wins compound. The more we learn, the more we build — the more you make."
        />
      </div>

      <div className="what-zones">
        <div className="what-zone what-zone-faded">
          <span className="what-zone-label">Pre-click</span>
          <span className="what-zone-owner">Ad agency owns this</span>
        </div>

        <div className="what-zone-ours">
          <div className="what-zone-ours-head">
            <span className="what-zone-ours-tag">Our zone</span>
            <span className="what-zone-ours-title">
              Conversion — every stage between click and sale
            </span>
          </div>
          <div className="what-funnel">
            <div className="what-funnel-header">
              <span className="what-funnel-header-stage">Funnel stage</span>
              <span className="what-funnel-header-bar">Sessions reaching this stage</span>
              <span className="what-funnel-header-metric">Drop</span>
              <span className="what-funnel-header-own">What we own</span>
            </div>
            <WhatFunnelRow
              stage="Land"
              count="100K"
              width={100}
              metric="Paid sessions"
              owned="Landing pages, hero, page speed"
            />
            <WhatFunnelRow
              stage="Engage"
              count="60K"
              width={60}
              metric="−40% bounce"
              owned="PDPs, collection, social proof"
            />
            <WhatFunnelRow
              stage="Add to cart"
              count="15K"
              width={15}
              metric="−75% drop"
              owned="Cart drawer, bundles, urgency"
            />
            <WhatFunnelRow
              stage="Checkout"
              count="6K"
              width={6}
              metric="−60% abandon"
              owned="Checkout flow, form, trust signals"
            />
            <WhatFunnelRow
              stage="Buy"
              count="2.5K"
              width={2.5}
              metric="↑ Where we lift"
              owned="Order confirmation, immediate upsells"
              final
            />
          </div>
        </div>

        <div className="what-zone what-zone-faded">
          <span className="what-zone-label">Post-sale</span>
          <span className="what-zone-owner">Retention / email agency owns this</span>
        </div>
      </div>

      <p className="what-takeaway">
        Our team handles the full roadmap end to end, improving week after week.
      </p>
    </div>
  );
}

function WhatFunnelRow({
  stage,
  count,
  width,
  metric,
  owned,
  final,
}: {
  stage: string;
  count: string;
  width: number;
  metric: string;
  owned: string;
  final?: boolean;
}) {
  return (
    <div className="what-funnel-row">
      <div className="what-funnel-row-stage">{stage}</div>
      <div className="what-funnel-row-bar-wrap">
        <div
          className={`what-funnel-row-bar ${final ? "what-funnel-row-bar-final" : ""}`}
          style={{ width: `${Math.max(width, 1.5)}%` }}
        >
          <span className="what-funnel-row-count">{count}</span>
        </div>
      </div>
      <div className={`what-funnel-row-metric ${final ? "what-funnel-row-metric-final" : ""}`}>
        {metric}
      </div>
      <div className="what-funnel-row-own">
        <span className="what-funnel-row-own-dot" />
        {owned}
      </div>
    </div>
  );
}

function WhatPillar({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="what-pillar">
      <div className="what-pillar-head">
        <span className="what-pillar-num">{num}</span>
        <h3 className="what-pillar-title">{title}</h3>
      </div>
      <p className="what-pillar-desc">{desc}</p>
    </div>
  );
}

// ─────────── Slide 4: Page build vs Conversion Engine ───────────
function PageBuildVsCESlide() {
  const singleItems = ["Strategy", "Page build", "Copy", "Dev + launch"];
  const engineItems = [
    "Rolling 90-day roadmap",
    "Page builds across the funnel",
    "Copy + design + dev",
    "Continuous A/B test programme",
    "Deep funnel audits",
    "Monthly reports & reviews",
    "Full-funnel coverage — every stage owned",
  ];
  return (
    <div className="slide-compare-v2">
      <p className="slide-kicker">Where this fits next to a page build</p>
      <h2 className="compare-v2-headline">
        Ownership of your entire conversion layer,{" "}
        <span className="compare-v2-headline-accent">not just single points.</span>
      </h2>
      <p className="compare-v2-sub">
        Single page builds deliver a one-off win. The Engine compounds them, week after week.
      </p>

      <div className="compare-v2-row">
        <div className="compare-v2-card compare-v2-card-single">
          <div className="compare-v2-card-head">
            <span className="compare-v2-card-tag">One page</span>
            <span className="compare-v2-card-meta">
              One-off · a high-impact page, scoped &amp; shipped end-to-end.
            </span>
          </div>
          <ul className="compare-v2-list">
            {singleItems.map((s) => (
              <li key={s} className="compare-v2-item">
                <span className="compare-v2-item-dot" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="compare-v2-card compare-v2-card-engine">
          <span className="compare-v2-card-arrow" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </span>
          <div className="compare-v2-card-head">
            <span className="compare-v2-card-tag compare-v2-card-tag-engine">
              The Conversion Engine
            </span>
            <span className="compare-v2-card-meta compare-v2-card-meta-engine">
              Ongoing · every funnel stage owned weekly, compounding lift.
            </span>
          </div>
          <ul className="compare-v2-list">
            {engineItems.map((s) => (
              <li key={s} className="compare-v2-item compare-v2-item-engine">
                <span className="compare-v2-item-dot compare-v2-item-dot-engine" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─────────── Slide 5: We sit between ───────────
function PartnerDiagramSlide() {
  return (
    <div className="slide-partner-v2">
      <p className="slide-kicker">How we sit in your stack</p>
      <h2 className="partner-v2-headline">
        We hold your funnel together,{" "}
        <span className="partner-v2-headline-accent">
          across acquisition and retention.
        </span>
      </h2>
      <p className="partner-v2-sub">
        We work <em>with</em> your ad agency and email team — never against —
        as the conversion layer that ties every stage of your funnel into one
        compounding system.
      </p>

      <div className="partner-v2-stage">
        <div className="partner-v2-satellites">
          <div className="partner-v2-satellite">
            <span className="partner-v2-satellite-tag">Acquisition</span>
            <span className="partner-v2-icon-badge">
              <MegaphoneIcon className="partner-v2-card-icon" />
            </span>
            <p className="partner-v2-satellite-title">Ads agency</p>
            <p className="partner-v2-satellite-desc">
              Drives cold traffic in — Meta, Google, TikTok.
            </p>
            <span className="partner-v2-satellite-flow">
              <span className="partner-v2-flow-dots">
                <span className="partner-v2-flow-dot" />
                <span className="partner-v2-flow-dot" />
                <span className="partner-v2-flow-dot" />
              </span>
              <span className="partner-v2-flow-pill">Raw traffic</span>
            </span>
          </div>
          <div className="partner-v2-satellite">
            <span className="partner-v2-satellite-tag">Retention</span>
            <span className="partner-v2-icon-badge">
              <EnvelopeIcon className="partner-v2-card-icon" />
            </span>
            <p className="partner-v2-satellite-title">Email agency</p>
            <p className="partner-v2-satellite-desc">
              Keeps buyers coming back — Klaviyo, Attentive, Postscript.
            </p>
            <span className="partner-v2-satellite-flow">
              <span className="partner-v2-flow-dots">
                <span className="partner-v2-flow-dot" />
                <span className="partner-v2-flow-dot" />
                <span className="partner-v2-flow-dot" />
              </span>
              <span className="partner-v2-flow-pill">Quality buyers</span>
            </span>
          </div>
        </div>

        <div className="partner-v2-hero">
          <span className="partner-v2-card-arrow-badge" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </span>
          <div className="partner-v2-hero-head">
            <span className="partner-v2-hero-tag">The Conversion Engine</span>
            <h3 className="partner-v2-hero-title">
              We hold the funnel together.
            </h3>
            <p className="partner-v2-hero-sub">
              Both sides only work as hard as the layer in the middle.
              Without us, ad spend leaks and retention starves.
            </p>
          </div>

          <div className="partner-v2-hero-grid">
            <div className="partner-v2-hero-col">
              <p className="partner-v2-hero-col-tag">For acquisition</p>
              <ul className="partner-v2-list partner-v2-list-us">
                <li className="partner-v2-list-item partner-v2-list-item-us">
                  <span className="partner-v2-list-dot partner-v2-list-dot-us" />
                  Convert ad traffic with intent
                </li>
                <li className="partner-v2-list-item partner-v2-list-item-us">
                  <span className="partner-v2-list-dot partner-v2-list-dot-us" />
                  Lift AOV with smart offers + bundles
                </li>
                <li className="partner-v2-list-item partner-v2-list-item-us">
                  <span className="partner-v2-list-dot partner-v2-list-dot-us" />
                  Drive down CAC by raising CVR
                </li>
              </ul>
            </div>
            <div className="partner-v2-hero-divider" aria-hidden />
            <div className="partner-v2-hero-col">
              <p className="partner-v2-hero-col-tag">For retention</p>
              <ul className="partner-v2-list partner-v2-list-us">
                <li className="partner-v2-list-item partner-v2-list-item-us">
                  <span className="partner-v2-list-dot partner-v2-list-dot-us" />
                  Hand over high-LTV buyers, not bargain hunters
                </li>
                <li className="partner-v2-list-item partner-v2-list-item-us">
                  <span className="partner-v2-list-dot partner-v2-list-dot-us" />
                  Post-purchase flows + repeat-rate setup
                </li>
                <li className="partner-v2-list-item partner-v2-list-item-us">
                  <span className="partner-v2-list-dot partner-v2-list-dot-us" />
                  Continuous funnel testing &amp; audits
                </li>
              </ul>
            </div>
          </div>

          <div className="partner-v2-hero-foot">
            <span className="partner-v2-card-foot-label partner-v2-card-foot-label-us">
              Our stack
            </span>
            <span className="partner-v2-card-foot-pills">
              <span className="partner-v2-foot-pill partner-v2-foot-pill-us">Shopify</span>
              <span className="partner-v2-foot-pill partner-v2-foot-pill-us">Intelligems</span>
              <span className="partner-v2-foot-pill partner-v2-foot-pill-us">Figma</span>
              <span className="partner-v2-foot-pill partner-v2-foot-pill-us">Clarity</span>
            </span>
          </div>
        </div>
      </div>

      <p className="partner-v2-foot">
        Acquisition + retention only compound when the middle holds.
        <span className="partner-v2-foot-emph"> That&rsquo;s us.</span>
      </p>
    </div>
  );
}

// ─────────── Slide 6: Monthly scope ───────────
function ScopeGridSlide() {
  const items = [
    {
      icon: MapIcon,
      title: "Rolling roadmap",
      subs: ["Funnel audits", "Priority matrix", "Weekly review"],
    },
    {
      icon: DocumentTextIcon,
      title: "Page builds",
      subs: ["PDPs", "Landers", "Advertorials", "Components"],
    },
    {
      icon: BeakerIcon,
      title: "A/B testing",
      subs: ["Test design", "Variant builds", "Stat-sig analysis"],
    },
    {
      icon: ShoppingCartIcon,
      title: "AOV + LTV",
      subs: ["Bundles", "Upsells", "Post-purchase", "Cross-sells"],
    },
    {
      icon: SparklesIcon,
      title: "Offer + positioning",
      subs: ["Hero", "Value props", "Social proof", "USP framing"],
    },
    {
      icon: ChartBarIcon,
      title: "Monthly readout",
      subs: ["What shipped", "What moved", "Next month plan"],
    },
  ];
  return (
    <div className="slide-scope-v2 slide-scope-v2-centered">
      <p className="slide-kicker scope-v2-kicker-centered">Everything post-click, one retainer</p>
      <h2 className="scope-v2-headline scope-v2-headline-centered">
        Your entire conversion engine,
        <br />
        <span className="scope-v2-headline-accent">all under one roof.</span>
      </h2>
      <p className="scope-v2-sub scope-v2-sub-centered">
        We go beyond just slotting pages into your existing funnel.
        <br />
        We dive deeper to find the biggest levers worth pulling.
      </p>

      <div className="scope-v2-orbit-stage">
        <svg
          className="scope-v2-orbit-lines"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <ellipse
            cx="50"
            cy="50"
            rx="34"
            ry="38"
            fill="none"
            stroke="rgba(0, 180, 100, 0.18)"
            strokeWidth="0.15"
            strokeDasharray="0.8 1.2"
          />
          {items.map((_, idx) => {
            const angle = (idx / items.length) * Math.PI * 2 - Math.PI / 2;
            const hubRx = 14;
            const hubRy = 18;
            const nodeRx = 31;
            const nodeRy = 35;
            const x1 = 50 + hubRx * Math.cos(angle);
            const y1 = 50 + hubRy * Math.sin(angle);
            const x2 = 50 + nodeRx * Math.cos(angle);
            const y2 = 50 + nodeRy * Math.sin(angle);
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(0, 180, 100, 0.32)"
                strokeWidth="0.18"
                strokeDasharray="0.6 0.8"
              />
            );
          })}
        </svg>

        <div className="scope-v2-orbit-hub">
          <span className="scope-v2-orbit-hub-glow" aria-hidden />
          <img
            src="/conversion-engine-mark.svg"
            alt=""
            aria-hidden
            className="scope-v2-orbit-hub-mark"
          />
        </div>

        {items.map((it, idx) => {
          const Icon = it.icon;
          const angle = (idx / items.length) * Math.PI * 2 - Math.PI / 2;
          const xPct = 50 + 34 * Math.cos(angle);
          const yPct = 50 + 38 * Math.sin(angle);
          return (
            <div
              key={it.title}
              className="scope-v2-orbit-node"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              <span className="scope-v2-icon-badge scope-v2-orbit-node-badge">
                <Icon className="scope-v2-card-icon" />
              </span>
              <p className="scope-v2-orbit-node-title">{it.title}</p>
            </div>
          );
        })}

        {items.flatMap((it, idx) => {
          const angle = (idx / items.length) * Math.PI * 2 - Math.PI / 2;
          const count = it.subs.length;
          const subSpacing = 0.22;
          return it.subs.map((sub, sIdx) => {
            const offset = (sIdx - (count - 1) / 2) * subSpacing;
            const subAngle = angle + offset;
            const stagger = sIdx % 2 === 0 ? 0 : 3;
            const subRx = 43 + stagger;
            const subRy = 46 + stagger;
            const sx = 50 + subRx * Math.cos(subAngle);
            const sy = 50 + subRy * Math.sin(subAngle);
            return (
              <span
                key={`${it.title}-${sub}`}
                className="scope-v2-orbit-subnode"
                style={{ left: `${sx}%`, top: `${sy}%` }}
              >
                {sub}
              </span>
            );
          });
        })}
      </div>
    </div>
  );
}

// ─────────── Slide 7: The rhythm ───────────
function RhythmTimelineSlide() {
  const weeks = [
    {
      num: "01",
      label: "Week 1",
      title: "Strategy",
      desc: "Roadmap update, priority review, audit findings into the queue.",
      ships: "1 roadmap · 5+ prioritised leak fixes",
    },
    {
      num: "02",
      label: "Weeks 2–3",
      title: "Design + build",
      desc: "Figma → dev → staging. Whatever week 1 prioritised gets built and shipped.",
      ships: "Every leak in the queue · pages, components, flows",
    },
    {
      num: "03",
      label: "Week 4",
      title: "Live, test, learn",
      desc: "Ship, measure, feed the next cycle. Wins logged, next month planned.",
      ships: "Live A/B tests · monthly readout · lifts logged",
    },
  ];
  return (
    <div className="slide-rhythm-v2">
      <p className="slide-kicker">Every month, on cadence</p>
      <h2 className="rhythm-v2-headline">
        Built to compound,{" "}
        <span className="rhythm-v2-headline-accent">month after month.</span>
      </h2>
      <p className="rhythm-v2-sub">
        Three phases, one cycle, with lift that compounds month after month.
      </p>

      <div className="rhythm-v2-row">
        {weeks.map((w, i) => (
          <Fragment key={w.label}>
            <div
              className={`rhythm-v2-card ${i === 2 ? "rhythm-v2-card-hero" : ""}`}
            >
              {i === 2 && (
                <span className="rhythm-v2-card-arrow" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7" />
                    <path d="M9 7h8v8" />
                  </svg>
                </span>
              )}
              <div className="rhythm-v2-card-head">
                <span className={`rhythm-v2-card-num ${i === 2 ? "rhythm-v2-card-num-hero" : ""}`}>
                  {w.num}
                </span>
                <span className={`rhythm-v2-card-week ${i === 2 ? "rhythm-v2-card-week-hero" : ""}`}>
                  {w.label}
                </span>
              </div>
              <h3 className={`rhythm-v2-card-title ${i === 2 ? "rhythm-v2-card-title-hero" : ""}`}>
                {w.title}
              </h3>
              <p className={`rhythm-v2-card-desc ${i === 2 ? "rhythm-v2-card-desc-hero" : ""}`}>
                {w.desc}
              </p>
              <div className={`rhythm-v2-card-ships ${i === 2 ? "rhythm-v2-card-ships-hero" : ""}`}>
                <span className={`rhythm-v2-card-ships-label ${i === 2 ? "rhythm-v2-card-ships-label-hero" : ""}`}>
                  Ships this cycle
                </span>
                <span className={`rhythm-v2-card-ships-value ${i === 2 ? "rhythm-v2-card-ships-value-hero" : ""}`}>
                  {w.ships}
                </span>
              </div>
            </div>
            {i < weeks.length - 1 && (
              <div className="rhythm-v2-arrow" aria-hidden>
                <ArrowLongRightIcon />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <div className="rhythm-v2-loop">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="rhythm-v2-loop-icon">
          <path d="M3 12a9 9 0 0 1 15-6.7" />
          <polyline points="18 2 18 6 14 6" />
          <path d="M21 12a9 9 0 0 1-15 6.7" />
          <polyline points="6 22 6 18 10 18" />
        </svg>
        <span>Repeats monthly</span>
      </div>
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
      detail: "Cold-traffic CVR on a rebuilt hero lander.",
      spark: [22, 28, 26, 35, 42, 48, 60, 72, 88],
      hero: true,
    },
    {
      metric: "+14%",
      brand: "Client Y",
      lever: "Cart bundle",
      detail: "AOV via a cart-level bundle.",
      spark: [40, 38, 45, 50, 48, 58, 64, 70, 78],
    },
    {
      metric: "+7%",
      brand: "Client Z",
      lever: "Sticky ATC",
      detail: "Mobile PDP CVR with sticky ATC.",
      spark: [50, 52, 56, 54, 60, 62, 66, 68, 72],
    },
  ];
  return (
    <div className="slide-proof-v2">
      <p className="slide-kicker">Real brands · real lifts · compounding</p>
      <h2 className="proof-v2-headline">
        Wins we&rsquo;ve already shipped,{" "}
        <span className="proof-v2-headline-accent">for brands like yours.</span>
      </h2>
      <p className="proof-v2-sub">
        Single-lever lifts from real client work. The Engine compounds these
        across every stage, every month.
      </p>

      <div className="proof-v2-grid">
        {wins.map((w) => {
          const points = w.spark
            .map((y, i) => `${(i / (w.spark.length - 1)) * 100},${100 - y}`)
            .join(" ");
          return (
            <div
              key={w.brand}
              className={`proof-v2-card ${w.hero ? "proof-v2-card-hero" : ""}`}
            >
              {w.hero && (
                <span className="proof-v2-card-arrow" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7" />
                    <path d="M9 7h8v8" />
                  </svg>
                </span>
              )}
              <p
                className={`proof-v2-metric ${w.hero ? "proof-v2-metric-hero" : ""}`}
              >
                {w.metric}
              </p>
              <svg
                className={`proof-v2-spark ${w.hero ? "proof-v2-spark-hero" : ""}`}
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
              <div
                className={`proof-v2-meta ${w.hero ? "proof-v2-meta-hero" : ""}`}
              >
                <span
                  className={`proof-v2-brand ${w.hero ? "proof-v2-brand-hero" : ""}`}
                >
                  {w.brand}
                </span>
                <span
                  className={`proof-v2-lever ${w.hero ? "proof-v2-lever-hero" : ""}`}
                >
                  {w.lever}
                </span>
              </div>
              <p
                className={`proof-v2-detail ${w.hero ? "proof-v2-detail-hero" : ""}`}
              >
                {w.detail}
              </p>
            </div>
          );
        })}
      </div>

      <p className="proof-v2-foot">
        One lever moved one number. The Engine moves
        <span className="proof-v2-foot-emph"> every lever, every month.</span>
      </p>
    </div>
  );
}

// ─────────── Slide 10: Next step ───────────
function NextStepSlide() {
  return (
    <div className="slide-next-v2">
      <p className="slide-kicker">One step from here</p>
      <h2 className="next-v2-headline">
        <span className="next-v2-headline-accent">Let&rsquo;s find your</span>{" "}
        biggest leaks.
      </h2>
      <p className="next-v2-sub">
        Curious where revenue&rsquo;s leaking out of your funnel? Drop us a line —
        we&rsquo;ll dig in and pull a free audit together. No pitch, no pressure.
      </p>

      <div className="next-v2-row">
        <a
          href="https://calendly.com/hello-ecomlanders/demo-call"
          target="_blank"
          rel="noopener noreferrer"
          className="next-v2-hero no-underline"
          style={{ textDecoration: "none" }}
        >
          <span className="next-v2-hero-arrow" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </span>
          <span className="next-v2-hero-tag">Book a call · Free funnel audit</span>
          <h3 className="next-v2-hero-title">We&rsquo;ll dig in and map the leaks.</h3>
          <ul className="next-v2-hero-list">
            <li className="next-v2-hero-item">
              <span className="next-v2-hero-dot" />
              A look across your full funnel
            </li>
            <li className="next-v2-hero-item">
              <span className="next-v2-hero-dot" />
              Leaks ranked by revenue impact
            </li>
            <li className="next-v2-hero-item">
              <span className="next-v2-hero-dot" />
              The 3 biggest leaks worth fixing first
            </li>
          </ul>
          <div className="next-v2-hero-meta">
            <span>Custom to your data</span>
            <span aria-hidden>·</span>
            <span>No commitment</span>
            <span aria-hidden>·</span>
            <span>30 min</span>
          </div>
        </a>

        <div className="next-v2-side">
          <p className="next-v2-side-tag">Prefer to chat first?</p>
          <a
            href="https://api.whatsapp.com/send/?phone=447457414032&text&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            className="next-v2-contact"
          >
            <span className="next-v2-contact-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.47-.149-.669.15-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.371-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
              </svg>
            </span>
            <div className="next-v2-contact-body">
              <span className="next-v2-contact-title">WhatsApp us</span>
              <span className="next-v2-contact-sub">Fastest way to get a reply.</span>
            </div>
            <span className="next-v2-contact-arrow" aria-hidden>→</span>
          </a>

          <a
            href="mailto:dylan@ecomlanders.com"
            className="next-v2-contact"
          >
            <span className="next-v2-contact-icon next-v2-contact-icon-email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
            <div className="next-v2-contact-body">
              <span className="next-v2-contact-title">Email for an audit</span>
              <span className="next-v2-contact-sub">Custom deep-dive + 90-day roadmap draft.</span>
            </div>
            <span className="next-v2-contact-arrow" aria-hidden>→</span>
          </a>
        </div>
      </div>
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
  if (content.includes("/conversion-engine-logo.svg")) {
    return <CoverSlide />;
  }
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
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <p className="text-sm text-white/60">Deck content not found.</p>
      </div>
    );
  }

  const current = slides[index];
  const isCover = current.includes("/conversion-engine-logo.svg");

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-white text-foreground ${
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
            "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      {/* Slide */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 md:px-24 py-6 md:py-8">
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
      <div className="fixed bottom-6 left-6 z-20 text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">
        {index + 1} / {slides.length}
      </div>

      {/* Nav arrows */}
      <div className="fixed bottom-6 right-6 z-20 flex items-center gap-2">
        <button
          onClick={goPrev}
          disabled={index === 0 || entering}
          className="size-9 rounded-full border border-foreground bg-white hover:bg-surface-raised flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous slide"
        >
          <svg className="size-4 text-subtle" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={goNext}
          disabled={index === slides.length - 1 || entering}
          className="size-9 rounded-full border border-foreground bg-white hover:bg-surface-raised flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next slide"
        >
          <svg className="size-4 text-subtle" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
        </button>
      </div>

      <div className="hidden md:block fixed top-6 right-6 z-20 text-[10px] font-medium tracking-wider uppercase text-muted">
        ← → arrow keys to navigate
      </div>

      <style>{`
        .deck-slide h1 {
          font-size: 4.5rem;
          font-weight: 800;
          letter-spacing: -0.028em;
          margin-bottom: 1.5rem;
          line-height: 1.02;
          color: #1B1B1B;
        }
        .deck-slide h2 {
          font-size: 3.5rem;
          font-weight: 700;
          letter-spacing: -0.028em;
          margin-bottom: 2.25rem;
          line-height: 1.04;
          color: #1B1B1B;
        }
        .deck-slide h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #555;
          margin-bottom: 1rem;
        }
        .deck-slide p {
          font-size: 1.125rem;
          line-height: 1.6;
          color: #1B1B1B;
          margin-bottom: 1rem;
        }
        .deck-slide strong { color: #1B1B1B; }
        .deck-slide em { color: #666; font-style: italic; }
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
          color: #1B1B1B;
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
          background: #CCC;
        }
        .deck-slide blockquote {
          border-left: 3px solid #E5E5EA;
          padding-left: 1.25rem;
          margin: 1.25rem 0;
          color: #555;
          font-style: italic;
        }
        .deck-slide hr { display: none; }
        .deck-slide a { color: #00C853; text-decoration: underline; }
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
          color: #999;
          letter-spacing: 0.01em;
        }
        .deck-slide-cover em { font-style: normal; color: #999; }

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
        /* When transitioning out of the cover, hold the new slide hidden until
           the cover has finished exiting — otherwise both headlines overlap. */
        .is-entering-engine .deck-slide-enter {
          animation: deck-slide-enter 320ms cubic-bezier(0.16, 1, 0.3, 1) 240ms both;
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
          animation: cover-exit-fade 260ms cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }
        @keyframes cover-exit-fade {
          from { opacity: 1; transform: translate3d(0, 0, 0); }
          to   { opacity: 0; transform: translate3d(0, -2.5vh, 0); }
        }

        /* ─────────── Shared slide bits ─────────── */
        .slide-kicker {
          font-size: 0.72rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999 !important;
          font-weight: 600;
          margin: 0 0 1.25rem 0 !important;
        }
        .slide-foot {
          margin-top: 3rem !important;
          font-size: 1rem !important;
          color: #666 !important;
          max-width: 48rem;
        }
        .slide-foot-emphasis {
          color: #1B1B1B !important;
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
          color: #999;
          font-weight: 600;
        }
        .slider-value {
          font-size: 1rem;
          font-weight: 600;
          color: #1B1B1B;
          font-variant-numeric: tabular-nums;
        }
        .deck-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: linear-gradient(
            to right,
            #1B1B1B 0%,
            #1B1B1B var(--progress, 0%),
            #E5E5EA var(--progress, 0%),
            #E5E5EA 100%
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
          background: #1B1B1B;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.18);
          transition: transform 150ms ease, box-shadow 150ms ease;
          margin-top: 0;
        }
        .deck-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 14px rgba(0,0,0,0.25);
        }
        .deck-slider:active::-webkit-slider-thumb {
          transform: scale(1.15);
          box-shadow: 0 4px 18px rgba(0,0,0,0.3);
        }
        .deck-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #1B1B1B;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.18);
          transition: transform 150ms ease, box-shadow 150ms ease;
        }
        .deck-slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 14px rgba(0,0,0,0.25);
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
          color: #999;
          margin-bottom: 0.6rem !important;
          font-weight: 600;
        }
        .calc-out-label-accent { color: #1B1B1B !important; }
        .calc-out-value {
          font-size: 3rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #1B1B1B;
          font-variant-numeric: tabular-nums;
          line-height: 0.95;
        }
        .calc-out-block-big .calc-out-value {
          font-size: 6.5rem;
        }
        .calc-out-value-accent {
          color: #1B1B1B !important;
        }

        /* ─────────── Slide 3 v2: Revenue calculator ─────────── */
        .slide-calc-v2 { width: 100%; }
        .slide-calc-v2 .slide-kicker { text-align: left; }
        .calc-v2-headline {
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.028em !important;
          line-height: 1.08 !important;
          color: #1B1B1B !important;
          margin: 0 0 0.65rem 0 !important;
          max-width: 60rem;
        }
        .calc-v2-headline-accent { color: #BBB; font-weight: 700; }
        .calc-v2-sub {
          font-size: 1rem !important;
          line-height: 1.5 !important;
          color: #666 !important;
          margin: 0 0 2.5rem 0 !important;
          max-width: 44rem;
        }
        .calc-v2-body {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 3.5rem;
          align-items: stretch;
        }
        .calc-v2-left {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }
        .calc-v2-sliders {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .calc-v2-values {
          display: flex;
          flex-direction: column;
          padding-top: 1.25rem;
          border-top: 1px solid #F0F0F0;
          gap: 0.85rem;
        }
        .calc-v2-values-row {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .calc-v2-values-row-hero {
          padding: 1.25rem 1.4rem 1.25rem;
          margin-top: 0.4rem;
          border-radius: 12px;
          border: 1px solid rgba(0, 180, 100, 0.25);
          background-color: rgba(0, 180, 100, 0.06);
          background-image: radial-gradient(
            circle,
            rgba(0, 160, 90, 0.14) 1.2px,
            transparent 1.7px
          );
          background-size: 13px 13px;
          position: relative;
        }
        .calc-v2-values-label {
          margin: 0 !important;
          font-size: 0.62rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999 !important;
          font-weight: 700 !important;
        }
        .calc-v2-values-amount {
          margin: 0 !important;
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
          line-height: 1;
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        .calc-v2-values-amount-muted {
          color: #BBB !important;
          font-weight: 600 !important;
          font-size: 1.25rem !important;
        }
        .calc-v2-values-amount-hero {
          font-size: 2.8rem !important;
          letter-spacing: -0.035em !important;
          color: #00633A !important;
          align-items: baseline;
        }
        .calc-v2-values-arrow {
          position: absolute;
          top: 1rem;
          right: 1.1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 50%;
          background: #00A35F;
          color: white;
          box-shadow: 0 6px 20px -8px rgba(0, 163, 95, 0.45);
        }
        .calc-v2-values-arrow svg {
          width: 1.4rem;
          height: 1.4rem;
        }
        .calc-v2-values-row-hero .calc-v2-values-label {
          color: #00633A !important;
        }
        .calc-v2-values-row-hero .calc-v2-values-note {
          color: #00633A !important;
          opacity: 0.7;
        }
        .calc-v2-values-mo {
          font-size: 0.7rem;
          font-weight: 500;
          color: #999;
          letter-spacing: 0;
        }
        .calc-v2-values-delta {
          font-size: 0.7rem;
          color: #666;
          font-weight: 600;
          letter-spacing: -0.005em;
        }
        .calc-v2-values-note {
          margin: 0.45rem 0 0 0 !important;
          font-size: 0.72rem !important;
          color: #999 !important;
          letter-spacing: -0.005em;
        }
        .calc-v2-right {
          padding: 0 0 0 2.5rem;
          border-left: 1px solid #F0F0F0;
          min-height: 420px;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: stretch;
          justify-content: center;
        }
        .rev-bucket {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: stretch;
        }
        .rev-bucket-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 0 0.25rem 0.65rem;
          border-bottom: 1px solid #1B1B1B;
        }
        .rev-bucket-top-tag {
          margin: 0 !important;
          font-size: 0.6rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #1B1B1B !important;
          font-weight: 700 !important;
        }
        .rev-bucket-top-value {
          margin: 0 !important;
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.025em;
          line-height: 1;
        }
        .rev-bucket-cards {
          flex: 1 1 auto;
          min-height: 320px;
          max-height: 56vh;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .rev-bucket-card {
          position: relative;
          border-radius: 12px;
          padding: 1.1rem 1.3rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.25rem;
          transition: flex-grow 360ms cubic-bezier(0.22, 1, 0.36, 1);
          overflow: hidden;
        }
        .rev-bucket-card-lift {
          border: 1px solid rgba(0, 180, 100, 0.25);
          background-color: rgba(0, 180, 100, 0.06);
          background-image: radial-gradient(
            circle,
            rgba(0, 160, 90, 0.14) 1.2px,
            transparent 1.7px
          );
          background-size: 13px 13px;
        }
        .rev-bucket-card-today {
          border: 1px solid #E5E5EA;
          background: #FAFAFA;
        }
        .rev-bucket-card-arrow {
          position: absolute;
          top: 1rem;
          right: 1.1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 50%;
          background: #00A35F;
          color: white;
          box-shadow: 0 6px 20px -8px rgba(0, 163, 95, 0.45);
        }
        .rev-bucket-card-arrow svg {
          width: 1.25rem;
          height: 1.25rem;
        }
        .rev-bucket-card-tag {
          margin: 0 !important;
          font-size: 0.6rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #666 !important;
          font-weight: 700 !important;
        }
        .rev-bucket-card-tag-lift {
          color: #00633A !important;
        }
        .rev-bucket-card-value {
          margin: 0 !important;
          font-size: 2rem !important;
          font-weight: 800 !important;
          color: #1B1B1B !important;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .rev-bucket-card-value-lift {
          color: #00633A !important;
        }
        .rev-bucket-card-note {
          margin: 0 !important;
          font-size: 0.7rem !important;
          color: #999 !important;
          font-weight: 600 !important;
          letter-spacing: -0.005em;
        }
        .rev-bucket-card-note-lift {
          color: #00633A !important;
          opacity: 0.75;
        }
        .rev-bucket-axis {
          margin: 0 !important;
          font-size: 0.62rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999 !important;
          font-weight: 600 !important;
          text-align: center;
        }
        .calc-v2-output-vis {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid #F0F0F0;
        }
        .rev-dot-bars {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.5rem;
          align-items: end;
          height: 140px;
          padding: 0 0.5rem;
        }
        .rev-dot-col {
          display: flex;
          flex-direction: column-reverse;
          gap: 4px;
          align-items: center;
          width: 100%;
        }
        .rev-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .rev-dot-empty { background: #EEE; }
        .rev-dot-filled-muted { background: #CCC; }
        .rev-dot-filled { background: #1B1B1B; }
        .rev-dot-lift {
          background: transparent;
          border: 1.5px solid #1B1B1B;
          width: 6px;
          height: 6px;
        }
        .calc-v2-output-vis-axis {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.5rem;
          padding: 0 0.5rem;
        }
        .calc-v2-output-vis-axis-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }
        .calc-v2-output-vis-axis-label {
          margin: 0 !important;
          font-size: 0.6rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999 !important;
          font-weight: 700 !important;
        }
        .calc-v2-output-vis-axis-value {
          margin: 0 !important;
          font-size: 1.1rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }
        .calc-v2-output-vis-axis-value-muted {
          color: #BBB !important;
        }
        .calc-v2-output-headline {
          margin: 0 !important;
          font-size: 0.95rem !important;
          font-weight: 500 !important;
          color: #999 !important;
          letter-spacing: -0.005em;
        }
        .calc-v2-output-headline-strong {
          color: #1B1B1B !important;
          font-weight: 700 !important;
        }
        .calc-v2-output-compare {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 2rem;
          align-items: end;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #F0F0F0;
        }
        .calc-v2-output-compare-col {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .calc-v2-output-compare-label {
          margin: 0 !important;
          font-size: 0.6rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999 !important;
          font-weight: 700 !important;
        }
        .calc-v2-output-compare-value {
          margin: 0 !important;
          font-size: 2.1rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.025em;
          line-height: 1;
        }
        .calc-v2-output-compare-value-muted {
          color: #BBB !important;
          font-size: 1.6rem !important;
          font-weight: 600 !important;
        }
        .calc-v2-output-compare-delta {
          margin: 0 !important;
          font-size: 0.72rem !important;
          color: #666 !important;
          font-weight: 600 !important;
          letter-spacing: -0.005em;
        }
        .calc-v2-output-drivers {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .calc-v2-output-driver {
          display: flex;
          align-items: baseline;
          gap: 0.65rem;
          font-size: 0.82rem;
          font-variant-numeric: tabular-nums;
        }
        .calc-v2-output-driver-key {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 700;
          min-width: 2.4rem;
        }
        .calc-v2-output-driver-from {
          color: #BBB;
          font-weight: 500;
        }
        .calc-v2-output-driver-arrow {
          color: #CCC;
        }
        .calc-v2-output-driver-to {
          color: #1B1B1B;
          font-weight: 600;
        }
        .calc-v2-output-annual {
          padding-top: 1rem;
          border-top: 1px solid #F0F0F0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .calc-v2-output-annual-label {
          margin: 0 !important;
          font-size: 0.62rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999 !important;
          font-weight: 700 !important;
        }
        .calc-v2-output-annual-value {
          margin: 0 !important;
          font-size: 3.2rem !important;
          font-weight: 800 !important;
          color: #1B1B1B !important;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.035em;
          line-height: 1;
        }
        .calc-v2-output-annual-note {
          margin: 0 !important;
          font-size: 0.7rem !important;
          color: #999 !important;
          letter-spacing: -0.005em;
        }

        /* ─────────── Slide 9 v2: Investment ROI ─────────── */
        .slide-roi-v2 { width: 100%; }
        .slide-roi-v2 .slide-kicker { text-align: left; }
        .roi-v2-headline {
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.028em !important;
          line-height: 1.08 !important;
          color: #1B1B1B !important;
          margin: 0 0 0.65rem 0 !important;
          max-width: 58rem;
        }
        .roi-v2-headline-accent { color: #BBB; font-weight: 700; }
        .roi-v2-sub {
          font-size: 1rem !important;
          line-height: 1.55 !important;
          color: #666 !important;
          margin: 0 0 1.75rem 0 !important;
          max-width: 50rem;
        }
        .roi-v2-cards {
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: 1rem;
          align-items: stretch;
          margin-bottom: 2rem;
        }
        .roi-v2-card {
          position: relative;
          border-radius: 14px;
          padding: 1.5rem 1.6rem 1.35rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .roi-v2-card-invest {
          border: 1px solid #E5E5EA;
          background: #FAFAFA;
        }
        .roi-v2-card-recover {
          border: 1px solid rgba(0, 180, 100, 0.25);
          background-color: rgba(0, 180, 100, 0.06);
          background-image: radial-gradient(
            circle,
            rgba(0, 160, 90, 0.14) 1.2px,
            transparent 1.7px
          );
          background-size: 13px 13px;
        }
        .roi-v2-card-arrow {
          position: absolute;
          top: 1rem;
          right: 1.1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 50%;
          background: #00A35F;
          color: white;
          box-shadow: 0 6px 20px -8px rgba(0, 163, 95, 0.45);
        }
        .roi-v2-card-arrow svg {
          width: 1.3rem;
          height: 1.3rem;
        }
        .roi-v2-card-tag {
          font-size: 0.62rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999 !important;
          font-weight: 700 !important;
        }
        .roi-v2-card-tag-recover { color: #00633A !important; }
        .roi-v2-card-value {
          margin: 0 !important;
          font-size: 2.6rem !important;
          font-weight: 800 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.035em !important;
          line-height: 1 !important;
          font-variant-numeric: tabular-nums;
        }
        .roi-v2-card-value-recover { color: #00633A !important; }
        .roi-v2-card-unit {
          font-size: 0.9rem;
          font-weight: 500;
          color: #999;
          letter-spacing: 0;
        }
        .roi-v2-card-unit-recover { color: #00633A; opacity: 0.7; }
        .roi-v2-card-note {
          margin: 0 !important;
          font-size: 0.85rem !important;
          color: #666 !important;
          line-height: 1.45 !important;
        }
        .roi-v2-card-note-recover { color: #00633A !important; opacity: 0.78; }
        .roi-v2-card-anchor {
          margin: 0.5rem 0 0 0 !important;
          padding-top: 0.85rem;
          border-top: 1px dashed #E5E5EA;
          display: flex;
          align-items: baseline;
          gap: 0.45rem;
          flex-wrap: wrap;
          font-size: 0.78rem !important;
          line-height: 1.3 !important;
        }
        .roi-v2-card-anchor-label {
          font-size: 0.58rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 700;
        }
        .roi-v2-card-anchor-value {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1B1B1B;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }
        .roi-v2-card-anchor-note {
          font-size: 0.72rem;
          color: #999;
          font-weight: 500;
        }
        .roi-v2-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          padding: 1.25rem 0;
          border-top: 1px solid #F0F0F0;
          border-bottom: 1px solid #F0F0F0;
          margin-bottom: 1.5rem;
        }
        .roi-v2-summary-block {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .roi-v2-summary-label {
          margin: 0 !important;
          font-size: 0.62rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999 !important;
          font-weight: 700 !important;
        }
        .roi-v2-summary-value {
          margin: 0 !important;
          font-size: 2.1rem !important;
          font-weight: 800 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.025em !important;
          line-height: 1 !important;
          font-variant-numeric: tabular-nums;
        }
        .roi-v2-summary-value-accent { color: #00633A !important; }
        .roi-v2-pills {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .roi-v2-pill {
          font-size: 0.7rem;
          color: #555;
          background: white;
          border: 1px solid #E5E5EA;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          font-weight: 600;
          letter-spacing: -0.005em;
        }

        /* ─────────── Slide 9: investment ROI (legacy) ─────────── */
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
          color: #999;
          font-weight: 600;
        }
        .roi-tag-accent { color: #00C853; }
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
          background: #F0F0F0;
          border: 1px solid #E5E5EA;
          min-width: 120px;
        }
        .roi-bar-recover {
          background: #00C853;
          box-shadow: 0 12px 40px -12px rgba(0,200,83,0.4);
        }
        .roi-bar-label {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1B1B1B;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          letter-spacing: -0.01em;
        }
        .roi-bar-recover .roi-bar-label { color: white; }
        .roi-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-bottom: 2rem;
          padding: 1.75rem 0;
          border-top: 1px solid #F0F0F0;
          border-bottom: 1px solid #F0F0F0;
        }
        .roi-summary-block p { margin: 0; }
        .roi-summary-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          margin-bottom: 0.65rem !important;
          font-weight: 600;
        }
        .roi-summary-value {
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.025em;
          color: #1B1B1B;
          font-variant-numeric: tabular-nums;
          line-height: 0.95;
        }
        .roi-summary-value-accent { color: #00C853; }
        .roi-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .roi-pill {
          font-size: 0.72rem;
          padding: 0.4rem 0.85rem;
          border: 1px solid #E5E5EA;
          border-radius: 999px;
          color: #555;
          letter-spacing: -0.005em;
          font-weight: 500;
          background: #FAFAFA;
        }

        /* ─────────── Slide 2 v4: What it is ─────────── */
        .slide-what {
          width: 100%;
        }
        .slide-what .slide-kicker { text-align: left; }
        .what-headline {
          font-size: 3rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.028em !important;
          line-height: 1.08 !important;
          color: #1B1B1B !important;
          margin: 0 0 3rem 0 !important;
          max-width: 60rem;
        }
        .what-headline-accent {
          color: #BBB;
          font-weight: 700;
        }
        .what-zones {
          display: flex;
          flex-direction: column;
          margin-bottom: 2.5rem;
        }
        .what-zone {
          display: flex;
          align-items: baseline;
          gap: 0.85rem;
          padding: 0.85rem 1.25rem;
        }
        .what-zone-faded {
          border-left: 2px dashed #E5E5EA;
          margin-left: 0.5rem;
        }
        .what-zone-label {
          font-size: 0.66rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #BBB;
          font-weight: 700;
          min-width: 6.5rem;
        }
        .what-zone-owner {
          font-size: 0.82rem;
          color: #BBB;
          font-style: italic;
        }
        .what-zone-ours {
          position: relative;
          padding: 1.25rem 1.5rem 1.5rem;
          border: 1px solid #1B1B1B;
          border-radius: 12px;
          background: white;
          margin: 0.35rem 0;
        }
        .what-zone-ours-head {
          display: flex;
          align-items: baseline;
          gap: 0.85rem;
          padding-bottom: 1rem;
          margin-bottom: 0.85rem;
          border-bottom: 1px solid #F0F0F0;
        }
        .what-zone-ours-tag {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: white;
          font-weight: 700;
          background: #1B1B1B;
          padding: 0.3rem 0.6rem;
          border-radius: 4px;
        }
        .what-zone-ours-title {
          font-size: 0.92rem;
          font-weight: 600;
          color: #1B1B1B;
          letter-spacing: -0.005em;
        }
        .what-funnel {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .what-funnel-header {
          display: grid;
          grid-template-columns: 7rem 1fr 7rem 16rem;
          gap: 1.25rem;
          align-items: center;
          padding-bottom: 0.6rem;
          border-bottom: 1px solid #F0F0F0;
          margin-bottom: 0.3rem;
        }
        .what-funnel-header span {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #BBB;
          font-weight: 600;
        }
        .what-funnel-header-own {
          color: #1B1B1B !important;
        }
        .what-funnel-row {
          display: grid;
          grid-template-columns: 7rem 1fr 7rem 16rem;
          gap: 1.25rem;
          align-items: center;
        }
        .what-funnel-row-own {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          color: #333;
          font-weight: 500;
          letter-spacing: -0.005em;
        }
        .what-funnel-row-own-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #1B1B1B;
          flex-shrink: 0;
        }
        .what-funnel-row-stage {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 600;
        }
        .what-funnel-row-bar-wrap {
          position: relative;
          height: 26px;
          background: repeating-linear-gradient(
            -45deg,
            #FAFAFA 0,
            #FAFAFA 6px,
            #F5F5F5 6px,
            #F5F5F5 12px
          );
          border: 1px solid #F0F0F0;
          border-radius: 5px;
          overflow: hidden;
        }
        .what-funnel-row-bar {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 0 0.85rem;
          border-radius: 4px;
          background: #1B1B1B;
          min-width: 44px;
        }
        .what-funnel-row-bar-final {
          background: #1B1B1B;
        }
        .what-funnel-row-count {
          font-size: 0.78rem;
          font-weight: 700;
          color: white;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }
        .what-funnel-row-metric {
          font-size: 0.78rem !important;
          font-weight: 600;
          color: #999;
          font-variant-numeric: tabular-nums;
        }
        .what-funnel-row-metric-final {
          color: #1B1B1B;
        }

        .what-pillars {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid #F0F0F0;
        }
        .what-pillar {
          padding: 0.4rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .what-pillar-head {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        .what-pillar-num {
          font-size: 0.62rem;
          font-weight: 700;
          color: #999;
          letter-spacing: 0.18em;
          font-variant-numeric: tabular-nums;
        }
        .what-pillar-title {
          margin: 0 !important;
          font-size: 1.05rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.02em;
        }
        .what-pillar-desc {
          margin: 0 !important;
          font-size: 0.8rem !important;
          color: #666 !important;
          line-height: 1.4 !important;
        }
        .what-takeaway {
          font-size: 0.95rem !important;
          line-height: 1.4 !important;
          color: #555 !important;
          margin: 0 !important;
          padding-top: 1rem;
          border-top: 1px solid #F0F0F0;
        }
        .what-takeaway-emph {
          color: #1B1B1B !important;
          font-weight: 600;
        }

        /* ─────────── Slide 2 v3: Why CE ─────────── */
        .slide-leak-v3 {
          width: 100%;
        }
        .slide-leak-v3 .slide-kicker { text-align: left; }
        .leak-v3-headline {
          font-size: 3.25rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.03em !important;
          line-height: 1.06 !important;
          color: #1B1B1B !important;
          margin: 0 0 3rem 0 !important;
          max-width: 58rem;
        }
        .leak-v3-headline-accent {
          color: #00C853;
        }
        .funnel-staircase {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          margin-bottom: 2.5rem;
        }
        .funnel-row {
          display: grid;
          grid-template-columns: 8rem 1fr 9rem 14rem;
          gap: 1.25rem;
          align-items: center;
        }
        .funnel-row-stage {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 600;
        }
        .funnel-row-bar-wrap {
          position: relative;
          height: 42px;
          background: repeating-linear-gradient(
            -45deg,
            #FAFAFA 0,
            #FAFAFA 6px,
            #F5F5F5 6px,
            #F5F5F5 12px
          );
          border: 1px solid #F0F0F0;
          border-radius: 6px;
          overflow: hidden;
        }
        .funnel-row-bar {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 0 1rem;
          border-radius: 5px;
          background: #1B1B1B;
          transition: width 320ms ease;
          min-width: 50px;
        }
        .funnel-row-bar-loss { background: #1B1B1B; }
        .funnel-row-bar-neutral { background: #1B1B1B; }
        .funnel-row-bar-win {
          background: #00C853;
          box-shadow: 0 8px 24px -8px rgba(0,200,83,0.5);
        }
        .funnel-row-count {
          font-size: 0.95rem;
          font-weight: 700;
          color: white;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }
        .funnel-row-metric {
          font-size: 0.85rem !important;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.005em;
        }
        .funnel-row-metric-neutral { color: #999; }
        .funnel-row-metric-loss { color: #B85959; }
        .funnel-row-metric-win { color: #00C853; }
        .funnel-row-action {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          color: #555;
          font-weight: 500;
          letter-spacing: -0.005em;
        }
        .funnel-row-action-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00C853;
          flex-shrink: 0;
        }
        .leak-v3-takeaway {
          font-size: 1.15rem !important;
          line-height: 1.5 !important;
          color: #555 !important;
          max-width: 56rem;
          margin: 0 !important;
          padding-top: 1.5rem;
          border-top: 1px solid #F0F0F0;
        }
        .leak-v3-takeaway-emph {
          color: #1B1B1B !important;
          font-weight: 600;
        }

        /* ─────────── Slide 2 v2: The Leak ─────────── */
        .slide-leak-v2 {
          width: 100%;
        }
        .slide-leak-v2 .slide-kicker { text-align: left; }
        .leak-v2-headline {
          font-size: 3.75rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.03em !important;
          line-height: 1.04 !important;
          color: #1B1B1B !important;
          margin: 0 0 3rem 0 !important;
          max-width: 56rem;
        }
        .leak-v2-headline-accent {
          color: #00C853;
        }
        .leak-bar-wrap {
          margin-bottom: 3rem;
        }
        .leak-bar {
          display: flex;
          width: 100%;
          height: 64px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #E5E5EA;
          background: white;
        }
        .leak-bar-loss {
          position: relative;
          background:
            repeating-linear-gradient(
              -45deg,
              #FAFAFA 0,
              #FAFAFA 8px,
              #F0F0F0 8px,
              #F0F0F0 16px
            );
          display: flex;
          align-items: center;
          padding-left: 1.25rem;
        }
        .leak-bar-loss-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #666;
          letter-spacing: -0.005em;
        }
        .leak-bar-win {
          background: #00C853;
          box-shadow: -8px 0 24px -8px rgba(0,200,83,0.4);
        }
        .leak-bar-axis {
          display: flex;
          justify-content: space-between;
          margin-top: 0.65rem;
          font-size: 0.66rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #BBB;
          font-weight: 600;
        }
        .leak-bar-axis span:nth-child(2) {
          color: #999;
        }
        .leak-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #F0F0F0;
        }
        .leak-stat p { margin: 0; }
        .leak-stat-num {
          font-size: 2.75rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.03em !important;
          line-height: 1 !important;
          color: #1B1B1B !important;
          margin-bottom: 0.4rem !important;
          font-variant-numeric: tabular-nums;
        }
        .leak-stat-label {
          font-size: 0.7rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em !important;
          color: #999 !important;
          font-weight: 600 !important;
        }
        .leak-stat-loss .leak-stat-num { color: #666 !important; }
        .leak-stat-win .leak-stat-num { color: #00C853 !important; }
        .leak-takeaway {
          font-size: 1.15rem !important;
          line-height: 1.5 !important;
          color: #555 !important;
          max-width: 50rem;
          margin: 0 !important;
        }
        .leak-takeaway-emph {
          color: #1B1B1B !important;
          font-weight: 600;
        }

        /* ─────────── Slide 2 (legacy): Missing layer ─────────── */
        .slide-leak { text-align: center; }
        .slide-leak h2 {
          max-width: 54rem;
          margin: 0 auto 3rem;
          text-align: center;
        }
        .slide-leak .slide-kicker { text-align: center; }
        .slide-leak .h2-muted { color: #999; font-weight: 700; }
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
          border: 1px solid #E5E5EA;
          border-radius: 14px;
          background: #FAFAFA;
          display: flex;
          flex-direction: column;
          opacity: 0.7;
        }
        .stack-node-us {
          border: 1px solid rgba(0, 200, 83, 0.45);
          background: linear-gradient(180deg, rgba(0, 200, 83, 0.07) 0%, rgba(0, 200, 83, 0.01) 100%);
          opacity: 1;
          box-shadow: 0 0 0 1px rgba(0, 200, 83, 0.05), 0 12px 40px -20px rgba(0, 200, 83, 0.25);
        }
        .stack-node-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #00C853;
          color: white;
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
          color: #999;
          margin-bottom: 1rem;
        }
        .stack-node-us .stack-icon { color: #00C853; }
        .stack-label {
          margin: 0 0 0.4rem 0 !important;
          font-size: 2rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.025em;
          line-height: 1;
        }
        .stack-sub {
          margin: 0 0 1.5rem 0 !important;
          font-size: 0.95rem !important;
          color: #666 !important;
          line-height: 1.45;
        }
        .stack-node-us .stack-sub { color: #333 !important; }
        .stack-tag {
          margin: auto 0 0 0 !important;
          font-size: 0.68rem !important;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #999 !important;
          font-weight: 600;
          padding-top: 1rem;
          border-top: 1px solid #E5E5EA;
        }
        .stack-tag-us {
          color: #00C853 !important;
          border-top: 1px solid rgba(0, 200, 83, 0.25) !important;
        }
        .stack-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stack-arrow svg {
          width: 24px;
          height: 24px;
          color: #CCC;
        }

        .benefits-row {
          margin: 3rem -2.5rem 0;
          padding: 2rem 0 0;
          border-top: 1px solid rgba(0, 200, 83, 0.22);
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
          background: #00C853;
          border-radius: 50%;
          box-shadow: 0 0 0 4px white;
        }
        .benefits-kicker {
          font-size: 0.7rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #00C853 !important;
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
          color: #00C853;
          margin: 0 auto 1rem;
        }
        .benefit-title {
          margin: 0 0 0.5rem 0 !important;
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.02em;
        }
        .benefit-desc {
          margin: 0 !important;
          font-size: 0.92rem !important;
          color: #666 !important;
          line-height: 1.5;
          max-width: 16rem;
        }

        /* ─────────── Slide 4 v2: Page build vs CE ─────────── */
        .slide-compare-v2 { width: 100%; }
        .slide-compare-v2 .slide-kicker { text-align: left; }
        .compare-v2-headline {
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.028em !important;
          line-height: 1.08 !important;
          color: #1B1B1B !important;
          margin: 0 0 0.65rem 0 !important;
          max-width: 56rem;
        }
        .compare-v2-headline-accent { color: #BBB; font-weight: 700; }
        .compare-v2-sub {
          font-size: 1rem !important;
          line-height: 1.5 !important;
          color: #666 !important;
          margin: 0 0 2.5rem 0 !important;
          max-width: 44rem;
        }
        .compare-v2-row {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 1.25rem;
          align-items: stretch;
        }
        .compare-v2-card {
          position: relative;
          border-radius: 14px;
          padding: 1.4rem 1.5rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .compare-v2-card-single {
          border: 1px solid #E5E5EA;
          background: #FAFAFA;
        }
        .compare-v2-card-engine {
          border: 1px solid rgba(0, 180, 100, 0.25);
          background-color: rgba(0, 180, 100, 0.06);
          background-image: radial-gradient(
            circle,
            rgba(0, 160, 90, 0.14) 1.2px,
            transparent 1.7px
          );
          background-size: 13px 13px;
        }
        .compare-v2-card-arrow {
          position: absolute;
          top: 1rem;
          right: 1.1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 50%;
          background: #00A35F;
          color: white;
          box-shadow: 0 6px 20px -8px rgba(0, 163, 95, 0.45);
        }
        .compare-v2-card-arrow svg {
          width: 1.25rem;
          height: 1.25rem;
        }
        .compare-v2-card-head {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .compare-v2-card-tag {
          font-size: 0.78rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #1B1B1B !important;
          font-weight: 700;
        }
        .compare-v2-card-tag-engine { color: #00633A !important; }
        .compare-v2-card-meta {
          font-size: 0.95rem !important;
          line-height: 1.4 !important;
          color: #555 !important;
          letter-spacing: -0.005em;
        }
        .compare-v2-card-meta-engine { color: #00633A !important; opacity: 0.78; }
        .compare-v2-list {
          list-style: none !important;
          padding: 0 !important;
          margin: 0 !important;
          display: flex;
          flex-direction: column;
          gap: 0.7rem !important;
        }
        .compare-v2-item {
          display: flex !important;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.05rem !important;
          color: #1B1B1B !important;
          padding-left: 0 !important;
          margin: 0 !important;
          line-height: 1.3 !important;
        }
        .compare-v2-item::before {
          display: none !important;
        }
        .compare-v2-item-engine {
          color: #00633A !important;
        }
        .compare-v2-item-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #1B1B1B;
          flex-shrink: 0;
        }
        .compare-v2-item-dot-engine { background: #00A35F; }
        .compare-v2-card-note {
          margin: 0 !important;
          font-size: 0.78rem !important;
          color: #666 !important;
          letter-spacing: -0.005em;
          padding-top: 0.85rem;
          border-top: 1px solid #E5E5EA;
        }
        .compare-v2-card-note-engine {
          color: #00633A !important;
          opacity: 0.75;
          border-top: 1px solid rgba(0, 180, 100, 0.25);
        }

        /* ─────────── Slide 4: Page build vs CE (legacy) ─────────── */
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
          color: #999;
          font-weight: 600;
          margin: 0;
          align-self: flex-start;
        }
        .compare-tag-accent { color: #00C853; }
        .compare-stack {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          padding: 1rem;
          border: 1px solid #E5E5EA;
          border-radius: 14px;
          background: #FAFAFA;
          flex: 1;
        }
        .compare-side-accent .compare-stack {
          border-color: rgba(0,200,83,0.3);
          background: linear-gradient(180deg, rgba(0,200,83,0.05) 0%, rgba(0,200,83,0.01) 100%);
          box-shadow: 0 12px 40px -20px rgba(0,200,83,0.2);
        }
        .stack-tile {
          padding: 0.85rem 0.6rem;
          border: 1px solid #E5E5EA;
          border-radius: 8px;
          font-size: 0.78rem;
          text-align: center;
          color: #999;
          font-weight: 500;
          letter-spacing: -0.005em;
          background: white;
          line-height: 1.2;
        }
        .stack-tile-off { opacity: 0.45; }
        .stack-tile-on {
          color: #1B1B1B;
          background: white;
          border-color: #CCC;
        }
        .stack-tile-accent {
          color: #1B1B1B;
          background: rgba(0,200,83,0.08);
          border-color: rgba(0,200,83,0.35);
        }
        .compare-sub {
          font-size: 0.92rem !important;
          color: #666 !important;
          margin: 0 !important;
          line-height: 1.45;
        }
        .compare-side-accent .compare-sub { color: #333 !important; }

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
          color: #BBB;
          font-weight: 600;
          white-space: nowrap;
        }
        .compare-arrow-icon {
          width: 28px;
          height: 28px;
          color: rgba(0,200,83,0.6);
        }

        /* ─────────── Slide 5 v2: We sit between ─────────── */
        .slide-partner-v2 { width: 100%; }
        .slide-partner-v2 .slide-kicker { text-align: left; }
        .partner-v2-headline {
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.028em !important;
          line-height: 1.08 !important;
          color: #1B1B1B !important;
          margin: 0 0 0.65rem 0 !important;
          max-width: 58rem;
        }
        .partner-v2-headline-accent { color: #BBB; font-weight: 700; }
        .partner-v2-sub {
          font-size: 1rem !important;
          line-height: 1.55 !important;
          color: #666 !important;
          margin: 0 0 1.75rem 0 !important;
          max-width: 50rem;
        }
        .partner-v2-stage {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          align-items: center;
          width: 100%;
        }
        .partner-v2-satellites {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          width: 100%;
          max-width: 64rem;
        }
        .partner-v2-satellite {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          padding: 1.1rem 1.25rem 0.95rem;
          border: 1px solid #E5E5EA;
          background: #FAFAFA;
          border-radius: 12px;
        }
        .partner-v2-satellite-tag {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #666;
          font-weight: 700;
        }
        .partner-v2-satellite-title {
          margin: 0 !important;
          font-size: 1.05rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.02em !important;
        }
        .partner-v2-satellite-desc {
          margin: 0 !important;
          font-size: 0.82rem !important;
          color: #666 !important;
          line-height: 1.4 !important;
        }
        .partner-v2-satellite-flow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-top: 0.65rem;
          margin-top: 0.25rem;
          border-top: 1px solid #E5E5EA;
        }
        .partner-v2-hero {
          position: relative;
          width: 100%;
          max-width: 64rem;
          border-radius: 16px;
          border: 1px solid rgba(0, 180, 100, 0.32);
          background-color: rgba(0, 180, 100, 0.06);
          background-image: radial-gradient(
            circle,
            rgba(0, 160, 90, 0.14) 1.2px,
            transparent 1.7px
          );
          background-size: 13px 13px;
          padding: 1.5rem 1.75rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          box-shadow: 0 14px 44px -20px rgba(0, 163, 95, 0.3);
        }
        .partner-v2-hero-spine {
          position: absolute;
          top: -1.2rem;
          left: 50%;
          width: 2px;
          height: 1.2rem;
          background: linear-gradient(to bottom, transparent, rgba(0, 180, 100, 0.55));
          transform: translateX(-50%);
        }
        .partner-v2-hero-head {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          max-width: 48rem;
          padding-right: 4.5rem;
        }
        .partner-v2-hero-tag {
          font-size: 0.66rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #00633A;
          font-weight: 700;
        }
        .partner-v2-hero-title {
          margin: 0 !important;
          font-size: 1.85rem !important;
          font-weight: 700 !important;
          color: #00633A !important;
          letter-spacing: -0.025em !important;
          line-height: 1.1 !important;
        }
        .partner-v2-hero-sub {
          margin: 0 !important;
          font-size: 0.92rem !important;
          color: #00633A !important;
          opacity: 0.78;
          line-height: 1.5 !important;
        }
        .partner-v2-hero-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 1.25rem;
          padding: 0.4rem 0;
        }
        .partner-v2-hero-col {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .partner-v2-hero-col-tag {
          margin: 0 0 0.25rem 0 !important;
          font-size: 0.58rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #00633A !important;
          font-weight: 700 !important;
          opacity: 0.7;
        }
        .partner-v2-hero-divider {
          width: 1px;
          background: rgba(0, 180, 100, 0.3);
          margin: 0 0.5rem;
        }
        .partner-v2-hero-foot {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding-top: 0.9rem;
          border-top: 1px solid rgba(0, 180, 100, 0.25);
          flex-wrap: wrap;
        }
        .partner-v2-card-arrow-badge {
          position: absolute;
          top: 1rem;
          right: 1.1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 50%;
          background: #00A35F;
          color: white;
          box-shadow: 0 6px 20px -8px rgba(0, 163, 95, 0.45);
        }
        .partner-v2-card-arrow-badge svg {
          width: 1.25rem;
          height: 1.25rem;
        }
        .partner-v2-card-tag {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #666;
          font-weight: 700;
        }
        .partner-v2-card-tag-us { color: #00633A; }
        .partner-v2-icon-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          background: white;
          border: 1px solid #E5E5EA;
          color: #1B1B1B;
          margin-top: 0.4rem;
          flex-shrink: 0;
          align-self: flex-start;
        }
        .partner-v2-icon-badge-us {
          background: white;
          border: 1px solid rgba(0, 180, 100, 0.3);
          color: #00A35F;
          box-shadow: 0 6px 20px -8px rgba(0, 163, 95, 0.25);
        }
        .partner-v2-card-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: currentColor;
        }
        .partner-v2-card-title {
          margin: 0 !important;
          font-size: 1.2rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .partner-v2-card-title-us { color: #00633A !important; }
        .partner-v2-card-desc {
          margin: 0 !important;
          font-size: 0.88rem !important;
          color: #666 !important;
          line-height: 1.45 !important;
        }
        .partner-v2-card-desc-us {
          color: #00633A !important;
          opacity: 0.78;
        }
        .partner-v2-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CCC;
        }
        .partner-v2-arrow svg {
          width: 1.6rem;
          height: 1.6rem;
        }
        .partner-v2-flow {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #BBB;
          padding: 0 0.25rem;
        }
        .partner-v2-flow-pill {
          font-size: 0.58rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-weight: 700;
          color: #555;
          background: white;
          border: 1px solid #E5E5EA;
          padding: 0.3rem 0.55rem;
          border-radius: 999px;
          white-space: nowrap;
        }
        .partner-v2-flow-dots {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .partner-v2-flow-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #CCC;
        }
        .partner-v2-flow-dot:nth-child(2) { background: #999; }
        .partner-v2-flow-dot:nth-child(3) { background: #666; }
        .partner-v2-flow-icon {
          width: 1.4rem;
          height: 1.4rem;
          color: #999;
        }
        .partner-v2-list {
          list-style: none !important;
          padding: 0 !important;
          margin: 0.5rem 0 0 0 !important;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .partner-v2-list-item {
          display: flex !important;
          align-items: flex-start;
          gap: 0.6rem;
          font-size: 0.88rem !important;
          line-height: 1.35 !important;
          color: #333 !important;
          padding-left: 0 !important;
          margin: 0 !important;
        }
        .partner-v2-list-item::before { display: none !important; }
        .partner-v2-list-item-us { color: #00633A !important; }
        .partner-v2-list-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #1B1B1B;
          flex-shrink: 0;
          margin-top: 0.5em;
        }
        .partner-v2-list-dot-us { background: #00A35F; }
        .partner-v2-card-foot {
          margin-top: auto;
          padding-top: 0.85rem;
          border-top: 1px solid #E5E5EA;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }
        .partner-v2-card-foot-us {
          border-top: 1px solid rgba(0, 180, 100, 0.25);
        }
        .partner-v2-card-foot-label {
          font-size: 0.56rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 700;
        }
        .partner-v2-card-foot-label-us { color: #00633A; opacity: 0.7; }
        .partner-v2-card-foot-pills {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
        }
        .partner-v2-foot-pill {
          font-size: 0.66rem;
          font-weight: 600;
          color: #555;
          background: white;
          border: 1px solid #E5E5EA;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          letter-spacing: -0.005em;
        }
        .partner-v2-foot-pill-us {
          color: #00633A;
          background: white;
          border: 1px solid rgba(0, 180, 100, 0.3);
        }
        .partner-v2-foot {
          margin: 2.5rem 0 0 0 !important;
          font-size: 1rem !important;
          color: #666 !important;
          line-height: 1.5 !important;
          text-align: center;
        }
        .partner-v2-foot-emph {
          color: #1B1B1B !important;
          font-weight: 700 !important;
        }

        /* ─────────── Slide 5: Partner diagram (legacy) ─────────── */
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
          border: 1px solid #E5E5EA;
          border-radius: 999px;
          background: #FAFAFA;
        }
        .partner-brand-tag {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          background: white;
          padding: 0 0.6rem;
          font-weight: 600;
        }
        .partner-brand-label {
          margin: 0 !important;
          font-size: 0.95rem !important;
          letter-spacing: -0.01em;
          color: #1B1B1B !important;
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
          background: #E5E5EA;
        }
        .partner-lines span:nth-child(1) { left: 16.67%; }
        .partner-lines span:nth-child(2) { left: 50%; background: rgba(0,200,83,0.5); }
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
          background: #FAFAFA;
          border: 1px solid #E5E5EA;
          border-radius: 14px;
          padding: 1.5rem 1.25rem;
          text-align: center;
          opacity: 0.7;
        }
        .partner-node-accent {
          opacity: 1;
          border-color: rgba(0,200,83,0.45);
          background: linear-gradient(180deg, rgba(0,200,83,0.06) 0%, rgba(0,200,83,0.01) 100%);
          box-shadow: 0 12px 40px -20px rgba(0,200,83,0.25);
        }
        .partner-node-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: #00C853;
          color: white;
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
          color: #999;
          margin: 0 auto 0.75rem;
        }
        .partner-node-accent .partner-node-icon { color: #00C853; }
        .partner-node-label {
          margin: 0 0 0.3rem 0 !important;
          font-size: 1rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.01em;
        }
        .partner-node-scope {
          margin: 0 !important;
          font-size: 0.72rem !important;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: #999 !important;
          font-weight: 600;
        }
        .partner-node-accent .partner-node-scope { color: #00C853 !important; }

        /* ─────────── Slide 6: Scope ─────────── */
        /* ─────────── Slide 6 v2: Monthly scope ─────────── */
        .slide-scope-v2 { width: 100%; }
        .slide-scope-v2 .slide-kicker { text-align: left; }
        .scope-v2-headline {
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.028em !important;
          line-height: 1.08 !important;
          color: #1B1B1B !important;
          margin: 0 0 0.65rem 0 !important;
          max-width: 58rem;
        }
        .scope-v2-headline-accent { color: #BBB; font-weight: 700; }
        .scope-v2-sub {
          font-size: 1rem !important;
          line-height: 1.55 !important;
          color: #666 !important;
          margin: 0 0 1.75rem 0 !important;
          max-width: 48rem;
        }
        .slide-scope-v2-centered { text-align: center; }
        .scope-v2-kicker-centered { text-align: center !important; }
        .scope-v2-headline-centered {
          text-align: center !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .scope-v2-sub-centered {
          text-align: center !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .scope-v2-orbit-stage {
          position: relative;
          width: 100%;
          max-width: 48rem;
          height: 32rem;
          margin: 2rem auto 0;
          overflow: visible;
        }
        .scope-v2-orbit-lines {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
          overflow: visible;
        }
        .scope-v2-orbit-hub {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 11rem;
          height: 11rem;
          border-radius: 50%;
          border: 1px solid rgba(0, 180, 100, 0.4);
          background-color: rgba(0, 180, 100, 0.08);
          background-image: radial-gradient(
            circle,
            rgba(0, 160, 90, 0.18) 1.3px,
            transparent 1.8px
          );
          background-size: 13px 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 1.5rem;
          text-align: center;
          box-shadow:
            0 24px 64px -28px rgba(0, 163, 95, 0.55),
            0 8px 24px -12px rgba(0, 163, 95, 0.2);
          z-index: 2;
        }
        .scope-v2-orbit-hub::before {
          content: "";
          position: absolute;
          inset: 0.75rem;
          border-radius: 50%;
          border: 1px dashed rgba(0, 180, 100, 0.32);
          pointer-events: none;
        }
        .scope-v2-orbit-hub-glow {
          position: absolute;
          inset: -2.5rem;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(0, 180, 100, 0.18) 0%,
            rgba(0, 180, 100, 0.05) 45%,
            transparent 70%
          );
          z-index: -1;
          pointer-events: none;
        }
        .scope-v2-orbit-hub-mark {
          width: 4.5rem;
          height: 4.5rem;
          filter: invert(1);
          opacity: 0.92;
        }
        .scope-v2-orbit-node {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          width: 8.5rem;
          text-align: center;
        }
        .scope-v2-orbit-node-badge {
          width: 3rem;
          height: 3rem;
        }
        .scope-v2-orbit-node-badge .scope-v2-card-icon {
          width: 1.3rem;
          height: 1.3rem;
        }
        .scope-v2-orbit-node-title {
          margin: 0 !important;
          font-size: 0.85rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.015em !important;
          line-height: 1.2 !important;
        }
        .scope-v2-orbit-subnode {
          position: absolute;
          transform: translate(-50%, -50%);
          font-size: 0.66rem;
          color: #888;
          font-weight: 500;
          letter-spacing: -0.005em;
          white-space: nowrap;
          opacity: 0.55;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          background: rgba(245, 245, 245, 0.6);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }
        .scope-v2-orbit-hub-tag {
          font-size: 0.64rem;
          text-transform: uppercase;
          letter-spacing: 0.24em;
          color: #00633A;
          font-weight: 700;
        }
        .scope-v2-orbit-hub-title {
          margin: 0 !important;
          font-size: 2.2rem !important;
          font-weight: 800 !important;
          color: #00633A !important;
          letter-spacing: -0.035em !important;
          line-height: 1 !important;
        }
        .scope-v2-orbit-hub-sub {
          font-size: 0.78rem;
          color: #00633A;
          opacity: 0.72;
          font-weight: 600;
          letter-spacing: -0.005em;
        }

        /* ─────────── Slide 6 v2 grid (legacy fallback) ─────────── */
        .scope-v2-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
        .scope-v2-card {
          padding: 1.1rem 1.25rem 1.1rem;
          border: 1px solid #E5E5EA;
          background: #FAFAFA;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .scope-v2-card-head {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .scope-v2-icon-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 50%;
          background: white;
          border: 1px solid #E5E5EA;
          color: #1B1B1B;
          flex-shrink: 0;
        }
        .scope-v2-card-icon {
          width: 1.15rem;
          height: 1.15rem;
        }
        .scope-v2-card-group {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 700;
        }
        .scope-v2-card-title {
          margin: 0 !important;
          font-size: 1.1rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.02em !important;
        }
        .scope-v2-card-desc {
          margin: 0 !important;
          font-size: 0.85rem !important;
          color: #666 !important;
          line-height: 1.4 !important;
        }

        /* ─────────── Slide 6 (legacy) ─────────── */
        .scope-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .scope-card {
          position: relative;
          background: #FAFAFA;
          border: 1px solid #E5E5EA;
          border-radius: 14px;
          padding: 1.5rem 1.4rem 1.4rem;
          transition: border-color 200ms ease, background 200ms ease;
        }
        .scope-card:hover {
          border-color: rgba(0,200,83,0.3);
          background: rgba(0,200,83,0.03);
        }
        .scope-group {
          display: inline-block;
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #00C853;
          font-weight: 600;
          margin-bottom: 0.85rem;
        }
        .scope-icon {
          width: 26px;
          height: 26px;
          color: #555;
          margin-bottom: 0.85rem;
        }
        .scope-title {
          margin: 0 0 0.35rem 0 !important;
          font-size: 1.1rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.015em;
        }
        .scope-desc {
          margin: 0 !important;
          font-size: 0.88rem !important;
          color: #666 !important;
          line-height: 1.45;
        }

        /* ─────────── Slide 7 v2: Rhythm ─────────── */
        .slide-rhythm-v2 { width: 100%; }
        .slide-rhythm-v2 .slide-kicker { text-align: left; }
        .rhythm-v2-headline {
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.028em !important;
          line-height: 1.08 !important;
          color: #1B1B1B !important;
          margin: 0 0 0.65rem 0 !important;
          max-width: 58rem;
        }
        .rhythm-v2-headline-accent { color: #BBB; font-weight: 700; }
        .rhythm-v2-sub {
          font-size: 1rem !important;
          line-height: 1.55 !important;
          color: #666 !important;
          margin: 0 0 1.75rem 0 !important;
          max-width: 50rem;
        }
        .rhythm-v2-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr auto 1.2fr;
          gap: 0.75rem;
          align-items: stretch;
          margin-bottom: 2rem;
        }
        .rhythm-v2-card {
          position: relative;
          border-radius: 14px;
          padding: 1.4rem 1.4rem 1.25rem;
          border: 1px solid #E5E5EA;
          background: #FAFAFA;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .rhythm-v2-card-hero {
          border: 1px solid rgba(0, 180, 100, 0.25);
          background-color: rgba(0, 180, 100, 0.06);
          background-image: radial-gradient(
            circle,
            rgba(0, 160, 90, 0.14) 1.2px,
            transparent 1.7px
          );
          background-size: 13px 13px;
        }
        .rhythm-v2-card-arrow {
          position: absolute;
          top: 1rem;
          right: 1.1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 50%;
          background: #00A35F;
          color: white;
          box-shadow: 0 6px 20px -8px rgba(0, 163, 95, 0.45);
        }
        .rhythm-v2-card-arrow svg {
          width: 1.25rem;
          height: 1.25rem;
        }
        .rhythm-v2-card-head {
          display: flex;
          align-items: baseline;
          gap: 0.65rem;
        }
        .rhythm-v2-card-num {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .rhythm-v2-card-num-hero { color: #00633A; }
        .rhythm-v2-card-week {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #BBB;
          font-weight: 600;
        }
        .rhythm-v2-card-week-hero { color: #00633A; opacity: 0.7; }
        .rhythm-v2-card-title {
          margin: 0 !important;
          font-size: 1.35rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.02em !important;
          line-height: 1.15 !important;
        }
        .rhythm-v2-card-title-hero { color: #00633A !important; }
        .rhythm-v2-card-desc {
          margin: 0 !important;
          font-size: 0.88rem !important;
          color: #666 !important;
          line-height: 1.45 !important;
        }
        .rhythm-v2-card-desc-hero {
          color: #00633A !important;
          opacity: 0.78;
        }
        .rhythm-v2-card-ships {
          margin-top: auto;
          padding-top: 0.85rem;
          border-top: 1px solid #E5E5EA;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .rhythm-v2-card-ships-hero {
          border-top: 1px solid rgba(0, 180, 100, 0.25);
        }
        .rhythm-v2-card-ships-label {
          font-size: 0.56rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 700;
        }
        .rhythm-v2-card-ships-label-hero { color: #00633A; opacity: 0.7; }
        .rhythm-v2-card-ships-value {
          font-size: 0.78rem;
          color: #1B1B1B;
          font-weight: 600;
          letter-spacing: -0.005em;
          line-height: 1.35;
        }
        .rhythm-v2-card-ships-value-hero { color: #00633A; }
        .rhythm-v2-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CCC;
        }
        .rhythm-v2-arrow svg {
          width: 1.6rem;
          height: 1.6rem;
        }
        .rhythm-v2-loop {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #00633A;
          font-weight: 700;
        }
        .rhythm-v2-loop-icon {
          width: 1.2rem;
          height: 1.2rem;
          color: #00A35F;
        }

        /* ─────────── Slide 7: Rhythm (legacy) ─────────── */
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
          background: #E5E5EA;
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
          background: white;
          border: 1px solid rgba(0,200,83,0.5);
          color: #00C853;
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
          color: #00C853 !important;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 1.5rem;
        }
        .rhythm-title {
          margin: 0 0 0.4rem 0 !important;
          font-size: 1.4rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.02em;
        }
        .rhythm-desc {
          margin: 0 !important;
          font-size: 0.92rem !important;
          color: #666 !important;
        }
        .rhythm-loop {
          position: relative;
          padding: 0.5rem 0 0 1rem;
          color: rgba(0,200,83,0.6);
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
          color: #00C853;
          font-weight: 600;
          text-align: center;
          line-height: 1.2;
        }

        /* ─────────── Slide 8 v2: Proof ─────────── */
        .slide-proof-v2 { width: 100%; }
        .slide-proof-v2 .slide-kicker { text-align: left; }
        .proof-v2-headline {
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.028em !important;
          line-height: 1.08 !important;
          color: #1B1B1B !important;
          margin: 0 0 0.65rem 0 !important;
          max-width: 58rem;
        }
        .proof-v2-headline-accent { color: #BBB; font-weight: 700; }
        .proof-v2-sub {
          font-size: 1rem !important;
          line-height: 1.55 !important;
          color: #666 !important;
          margin: 0 0 1.75rem 0 !important;
          max-width: 50rem;
        }
        .proof-v2-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .proof-v2-card {
          position: relative;
          border-radius: 14px;
          padding: 1.5rem 1.5rem 1.25rem;
          border: 1px solid #E5E5EA;
          background: #FAFAFA;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .proof-v2-card-hero {
          border: 1px solid rgba(0, 180, 100, 0.25);
          background-color: rgba(0, 180, 100, 0.06);
          background-image: radial-gradient(
            circle,
            rgba(0, 160, 90, 0.14) 1.2px,
            transparent 1.7px
          );
          background-size: 13px 13px;
        }
        .proof-v2-card-arrow {
          position: absolute;
          top: 1rem;
          right: 1.1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 50%;
          background: #00A35F;
          color: white;
          box-shadow: 0 6px 20px -8px rgba(0, 163, 95, 0.45);
        }
        .proof-v2-card-arrow svg {
          width: 1.25rem;
          height: 1.25rem;
        }
        .proof-v2-metric {
          margin: 0 !important;
          font-size: 3.5rem !important;
          font-weight: 800 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.035em !important;
          line-height: 1 !important;
          font-variant-numeric: tabular-nums;
        }
        .proof-v2-metric-hero { color: #00633A !important; }
        .proof-v2-spark {
          width: 100%;
          height: 44px;
          color: #CCC;
          opacity: 0.7;
        }
        .proof-v2-spark-hero {
          color: #00A35F;
          opacity: 0.85;
        }
        .proof-v2-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-top: 0.85rem;
          border-top: 1px solid #E5E5EA;
        }
        .proof-v2-meta-hero {
          border-top: 1px solid rgba(0, 180, 100, 0.25);
        }
        .proof-v2-brand {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1B1B1B;
          letter-spacing: -0.005em;
        }
        .proof-v2-brand-hero { color: #00633A; }
        .proof-v2-lever {
          margin-left: auto;
          font-size: 0.58rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 700;
          padding: 0.25rem 0.55rem;
          border: 1px solid #E5E5EA;
          border-radius: 999px;
          background: white;
        }
        .proof-v2-lever-hero {
          color: #00633A;
          border: 1px solid rgba(0, 180, 100, 0.3);
        }
        .proof-v2-detail {
          margin: 0 !important;
          font-size: 0.85rem !important;
          color: #666 !important;
          line-height: 1.45 !important;
        }
        .proof-v2-detail-hero { color: #00633A !important; opacity: 0.78; }
        .proof-v2-foot {
          margin: 0 !important;
          padding-top: 1.5rem;
          font-size: 1rem !important;
          color: #666 !important;
          line-height: 1.5 !important;
          text-align: center;
          border-top: 1px solid #F0F0F0;
        }
        .proof-v2-foot-emph {
          color: #1B1B1B !important;
          font-weight: 700 !important;
        }

        /* ─────────── Slide 8: Proof (legacy) ─────────── */
        .slide-proof h2 { margin-bottom: 2.5rem; }
        .proof-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2.5rem;
          margin-bottom: 2rem;
          padding-top: 0;
        }
        .proof-card {
          background: #FAFAFA;
          border: 1px solid #E5E5EA;
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
          color: #00C853 !important;
          line-height: 0.9;
          font-variant-numeric: tabular-nums;
        }
        .proof-spark {
          width: 100%;
          height: 48px;
          color: #00C853;
          opacity: 0.7;
          margin-bottom: 1.25rem;
        }
        .proof-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.6rem;
          padding-top: 1rem;
          border-top: 1px solid #E5E5EA;
        }
        .proof-brand-chip {
          font-size: 0.78rem;
          font-weight: 700;
          color: #1B1B1B;
          letter-spacing: -0.005em;
        }
        .proof-lever {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border: 1px solid #E5E5EA;
          border-radius: 999px;
          margin-left: auto;
        }
        .proof-detail {
          margin: 0 !important;
          font-size: 0.85rem !important;
          color: #666 !important;
          line-height: 1.45;
        }

        /* ─────────── Slide 10 v2: Next step ─────────── */
        .slide-next-v2 { width: 100%; }
        .slide-next-v2 .slide-kicker { text-align: left; }
        .next-v2-headline {
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.028em !important;
          line-height: 1.08 !important;
          color: #1B1B1B !important;
          margin: 0 0 0.65rem 0 !important;
          max-width: 58rem;
        }
        .next-v2-headline-accent { color: #BBB; font-weight: 700; }
        .next-v2-sub {
          font-size: 1rem !important;
          line-height: 1.55 !important;
          color: #666 !important;
          margin: 0 0 1.75rem 0 !important;
          max-width: 50rem;
        }
        .next-v2-row {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 1.25rem;
          align-items: stretch;
        }
        .next-v2-hero {
          position: relative;
          border-radius: 16px;
          padding: 1.6rem 1.75rem 1.5rem;
          border: 1px solid rgba(0, 180, 100, 0.28);
          background-color: rgba(0, 180, 100, 0.06);
          background-image: radial-gradient(
            circle,
            rgba(0, 160, 90, 0.14) 1.2px,
            transparent 1.7px
          );
          background-size: 13px 13px;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          box-shadow: 0 14px 44px -20px rgba(0, 163, 95, 0.3);
        }
        .next-v2-hero-arrow {
          position: absolute;
          top: 1.1rem;
          right: 1.2rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 50%;
          background: #00A35F;
          color: white;
          box-shadow: 0 6px 20px -8px rgba(0, 163, 95, 0.45);
        }
        .next-v2-hero-arrow svg {
          width: 1.3rem;
          height: 1.3rem;
        }
        .next-v2-hero-tag {
          font-size: 0.66rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #00633A;
          font-weight: 700;
        }
        .next-v2-hero-title {
          margin: 0 !important;
          font-size: 1.85rem !important;
          font-weight: 700 !important;
          color: #00633A !important;
          letter-spacing: -0.025em !important;
          line-height: 1.1 !important;
        }
        .next-v2-hero-list {
          list-style: none !important;
          padding: 0 !important;
          margin: 0.4rem 0 0.5rem 0 !important;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .next-v2-hero-item {
          display: flex !important;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.92rem !important;
          color: #00633A !important;
          padding-left: 0 !important;
          margin: 0 !important;
          line-height: 1.3 !important;
        }
        .next-v2-hero-item::before { display: none !important; }
        .next-v2-hero-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #00A35F;
          flex-shrink: 0;
        }
        .next-v2-hero-meta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: #00633A;
          opacity: 0.7;
          font-weight: 600;
          margin-top: 0.4rem;
        }
        .next-v2-hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.85rem 1.4rem;
          background: #1B1B1B;
          color: white !important;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none !important;
          border-radius: 8px;
          transition: background 150ms ease, transform 150ms ease;
          letter-spacing: -0.005em;
          margin-top: 0.75rem;
          align-self: flex-start;
        }
        .next-v2-hero-cta:hover {
          background: #000;
          transform: translateY(-1px);
        }
        .next-v2-side {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          justify-content: center;
        }
        .next-v2-side-tag {
          margin: 0 0 0.25rem 0 !important;
          font-size: 0.62rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999 !important;
          font-weight: 700 !important;
        }
        .next-v2-contact {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 1.1rem 1.25rem;
          border: 1px solid #E5E5EA;
          background: #FAFAFA;
          border-radius: 14px;
          text-decoration: none !important;
          color: inherit !important;
          transition: border-color 150ms ease, background 150ms ease, transform 150ms ease;
        }
        .next-v2-contact:hover {
          border-color: #1B1B1B;
          background: white;
          transform: translateY(-1px);
        }
        .next-v2-contact-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 50%;
          background: #25D366;
          color: white;
          flex-shrink: 0;
        }
        .next-v2-contact-icon-email {
          background: #1B1B1B;
        }
        .next-v2-contact-icon svg {
          width: 1.3rem;
          height: 1.3rem;
        }
        .next-v2-contact-body {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          flex: 1;
          min-width: 0;
        }
        .next-v2-contact-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1B1B1B;
          letter-spacing: -0.01em;
        }
        .next-v2-contact-sub {
          font-size: 0.78rem;
          color: #666;
          letter-spacing: -0.005em;
        }
        .next-v2-contact-arrow {
          font-size: 1.1rem;
          color: #CCC;
          font-weight: 400;
          transition: color 150ms ease, transform 150ms ease;
        }
        .next-v2-contact:hover .next-v2-contact-arrow {
          color: #1B1B1B;
          transform: translateX(2px);
        }

        /* ─────────── Slide 10: Next (legacy) ─────────── */
        .slide-next h2 { margin-bottom: 2.5rem; }
        .next-hero {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 3rem;
          align-items: center;
          margin-bottom: 2rem;
          padding: 2rem;
          border: 1px solid rgba(0,200,83,0.25);
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(0,200,83,0.05) 0%, rgba(0,200,83,0.01) 100%);
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
          color: #00C853;
          font-weight: 700;
          align-self: flex-start;
        }
        .next-hero-title {
          margin: 0 !important;
          font-size: 2.25rem !important;
          font-weight: 700 !important;
          color: #1B1B1B !important;
          letter-spacing: -0.025em;
          line-height: 1.05;
        }
        .next-hero-desc {
          margin: 0 !important;
          font-size: 0.95rem !important;
          color: #666 !important;
          line-height: 1.55;
        }
        .next-hero-meta {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: #999;
          font-weight: 600;
          margin-top: 0.4rem;
        }
        .next-hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.95rem 1.5rem;
          background: #00C853;
          color: white !important;
          font-weight: 700;
          font-size: 1rem;
          text-decoration: none !important;
          border-radius: 8px;
          transition: background 150ms ease, transform 150ms ease;
          letter-spacing: -0.01em;
          margin-top: 1rem;
          align-self: flex-start;
          box-shadow: 0 12px 40px -12px rgba(0,200,83,0.4);
        }
        .next-hero-cta:hover {
          background: #00A040;
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
          background: #FAFAFA;
          border: 1px solid #E5E5EA;
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
          color: #999;
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
          background: #EEE;
        }
        .next-cal-cell-lit {
          background: rgba(0,200,83,0.25);
        }
        .next-cal-cell-hot {
          background: #00C853;
          box-shadow: 0 0 0 2px rgba(0,200,83,0.25), 0 0 24px rgba(0,200,83,0.35);
        }
        .next-foot-secondary {
          margin-top: 1.5rem !important;
          font-size: 0.85rem !important;
          color: #999 !important;
        }
        .next-foot-secondary a {
          color: #1B1B1B !important;
          text-decoration: underline !important;
          text-decoration-color: #CCC;
        }
        .next-foot-secondary a:hover {
          text-decoration-color: #666;
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

        /* ─────────── Light cover slide overrides ─────────── */
        /* Marquee tiles tuned for light bg */
        .cover-backdrop.is-visible .marquee-tile {
          opacity: 0.42;
          filter: grayscale(1) brightness(0.72) contrast(1.08);
        }

        /* ─────────── Slide 1: New cover v2 ─────────── */
        .slide-cover-v2 {
          position: relative;
          width: 100%;
          min-height: 64vh;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 3rem;
          padding: 0;
          text-align: center;
        }
        .cover-v2-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1B1B1B;
        }
        .cover-v2-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center !important;
        }
        .cover-v2-kicker {
          font-size: 0.72rem !important;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999 !important;
          font-weight: 600;
          margin: 0 0 1.5rem 0 !important;
          text-align: center !important;
        }
        .cover-v2-headline {
          font-size: 4.75rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.035em !important;
          line-height: 1 !important;
          color: #1B1B1B !important;
          margin: 0 0 1.75rem 0 !important;
          text-align: center !important;
          max-width: 52rem;
        }
        .cover-v2-sub {
          font-size: 1.5rem !important;
          line-height: 1.35 !important;
          color: #555 !important;
          font-weight: 400 !important;
          max-width: 42rem;
          margin: 0 !important;
          text-align: center !important;
        }
        .cover-v2-foot {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #999;
          font-weight: 600;
          text-align: center;
        }
        .cover-v2-foot-mark {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00C853;
        }

        /* ─────────── Mobile ─────────── */
        @media (max-width: 768px) {
          /* Hide noisy backdrop on mobile */
          .cover-backdrop { display: none !important; }

          /* Base typography */
          .deck-slide h1 { font-size: 2.25rem; line-height: 1.05; margin-bottom: 1rem; }
          .deck-slide h2 { font-size: 1.6rem; line-height: 1.1; margin-bottom: 1.25rem; }
          .deck-slide h3 { font-size: 0.95rem; margin-bottom: 0.75rem; }
          .deck-slide p { font-size: 0.95rem; line-height: 1.55; margin-bottom: 0.85rem; }
          .deck-slide ul { margin: 0.75rem 0; }
          .deck-slide ul li { font-size: 0.95rem; padding-left: 1.1rem; margin-bottom: 0.5rem; }
          .deck-slide blockquote { padding-left: 0.9rem; margin: 1rem 0; }
          .deck-slide > img, .deck-slide p > img { margin: 0 auto 1.25rem; }

          /* Shared kicker / foot */
          .slide-kicker { font-size: 0.62rem !important; margin: 0 0 0.85rem 0 !important; letter-spacing: 0.2em; }
          .slide-foot { margin-top: 1.5rem !important; font-size: 0.85rem !important; }
          .slide-foot-emphasis { font-size: 0.95rem !important; }

          /* Cover slide v2 */
          .slide-cover-v2 { gap: 1.5rem; min-height: 70vh; }
          .cover-v2-headline { font-size: 2.25rem !important; line-height: 1.05 !important; max-width: 100%; margin: 0 0 1rem 0 !important; }
          .cover-v2-sub { font-size: 1rem !important; line-height: 1.4 !important; max-width: 100%; }
          .cover-v2-kicker { font-size: 0.6rem !important; margin: 0 0 0.9rem 0 !important; }
          .cover-v2-foot { font-size: 0.58rem; letter-spacing: 0.2em; flex-wrap: wrap; }

          /* CE logo */
          .deck-slide .ce-logo { gap: 1rem; margin: 0 auto 1rem; }
          .deck-slide .ce-logo-mark { width: 64px; height: 64px; }
          .deck-slide .ce-logo-wordmark { width: 180px; max-width: 70vw; }

          /* Calc slide */
          .calc-v2-headline { font-size: 1.55rem !important; line-height: 1.1 !important; }
          .calc-v2-sub { font-size: 0.9rem !important; margin: 0 0 1.5rem 0 !important; }
          .calc-v2-body { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
          .calc-v2-sliders { gap: 1rem; }
          .calc-v2-values-row-hero { padding: 1rem !important; }
          .calc-v2-values-amount-hero { font-size: 1.6rem !important; }
          .calc-v2-values-arrow { width: 1.4rem; height: 1.4rem; }
          .calc-v2-values-arrow svg { width: 0.9rem; height: 0.9rem; }
          .calc-out-value { font-size: 2rem; }
          .calc-out-block-big .calc-out-value { font-size: 3rem; }
          .slide-calc-body { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
          .calc-v2-output-vis-axis { grid-template-columns: 1fr !important; gap: 0.75rem; }
          .calc-v2-output-compare { grid-template-columns: 1fr !important; gap: 0.75rem; }
          .rev-dot-bars { grid-template-columns: 1fr !important; gap: 0.5rem; }
          .rev-bucket-cards { flex-direction: column; gap: 0.75rem; }
          .rev-bucket-card { padding: 1rem; }
          .rev-bucket-card-value { font-size: 1.5rem; }

          /* Slider */
          .slider-label { font-size: 0.65rem; letter-spacing: 0.16em; }
          .slider-value { font-size: 0.9rem; }
          .slider-row-head { margin-bottom: 0.45rem; }

          /* ROI slide */
          .roi-v2-headline { font-size: 1.55rem !important; line-height: 1.1 !important; }
          .roi-v2-sub { font-size: 0.9rem !important; margin: 0 0 1.5rem 0 !important; }
          .roi-v2-cards { grid-template-columns: 1fr !important; gap: 1rem !important; }
          .roi-v2-card { padding: 1.1rem; }
          .roi-v2-card-value { font-size: 1.85rem; }
          .roi-v2-card-arrow { width: 1.6rem; height: 1.6rem; }
          .roi-v2-card-arrow svg { width: 1rem; height: 1rem; }
          .roi-v2-summary { grid-template-columns: 1fr !important; gap: 1rem !important; }
          .roi-row { grid-template-columns: 1fr !important; gap: 0.4rem !important; }
          .roi-summary { grid-template-columns: 1fr !important; }
          .roi-v2-pills { flex-wrap: wrap; gap: 0.5rem; }

          /* Leak / What / Stack rows */
          .what-funnel-header,
          .what-funnel-row { grid-template-columns: 1fr !important; gap: 0.4rem !important; }
          .what-pillars { grid-template-columns: 1fr 1fr !important; gap: 0.75rem !important; }
          .funnel-row { grid-template-columns: 1fr !important; gap: 0.4rem !important; padding: 0.75rem 0; }
          .leak-stats { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
          .leak-v2-headline,
          .leak-v3-headline { font-size: 1.55rem !important; line-height: 1.1 !important; }
          .leak-bar-wrap { flex-wrap: wrap; }

          /* Partner / Stack diagram */
          .stack-row { grid-template-columns: 1fr !important; gap: 0.5rem !important; margin: 0 0 1rem !important; }
          .stack-row > .stack-arrow,
          .stack-row > svg { display: none; }
          .stack-node { padding: 1rem; }
          .stack-label { font-size: 1.4rem !important; }
          .stack-sub { font-size: 0.85rem !important; margin: 0 0 1rem 0 !important; }
          .partner-v2-satellites { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
          .partner-v2-hero-grid { grid-template-columns: 1fr !important; gap: 0.5rem !important; }
          .partner-row { grid-template-columns: 1fr !important; gap: 0.75rem !important; }

          /* Scope */
          .scope-v2-grid,
          .scope-grid { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
          .scope-v2-orbit-stage {
            height: auto !important;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
            margin: 1.25rem auto 0 !important;
            max-width: 100% !important;
          }
          .scope-v2-orbit-lines { display: none !important; }
          .scope-v2-orbit-hub {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            transform: none !important;
            width: 5rem !important;
            height: 5rem !important;
            padding: 0.75rem !important;
            margin: 0 auto 0.5rem !important;
          }
          .scope-v2-orbit-hub::before { display: none; }
          .scope-v2-orbit-hub-glow { display: none !important; }
          .scope-v2-orbit-hub-mark { width: 2.5rem !important; height: 2.5rem !important; }
          .scope-v2-orbit-node {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            transform: none !important;
            width: 100% !important;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            gap: 0.75rem !important;
            text-align: left !important;
            padding: 0.6rem 0.75rem;
            border: 1px solid #E5E5EA;
            border-radius: 10px;
            background: #FAFAFA;
          }
          .scope-v2-orbit-node-badge { width: 2.25rem !important; height: 2.25rem !important; flex-shrink: 0; }
          .scope-v2-orbit-subnode { display: none !important; }

          /* Rhythm */
          .rhythm-v2-headline { font-size: 1.55rem !important; line-height: 1.1 !important; }
          .rhythm-v2-sub { font-size: 0.9rem !important; }
          .rhythm-v2-row { grid-template-columns: 1fr !important; gap: 0.5rem !important; }
          .rhythm-v2-row > svg,
          .rhythm-v2-row-arrow { display: none; }
          .rhythm-v2-card { padding: 1rem; }
          .rhythm-track { grid-template-columns: 1fr !important; gap: 1rem !important; }
          .rhythm-line { display: none; }

          /* Proof */
          .proof-v2-grid,
          .proof-grid { grid-template-columns: 1fr !important; gap: 0.75rem !important; }

          /* Compare */
          .compare-v2-row { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
          .compare-row { grid-template-columns: 1fr !important; gap: 0.5rem !important; }
          .compare-stack { grid-template-columns: 1fr !important; }
          .benefits-grid { grid-template-columns: 1fr !important; gap: 0.75rem !important; }

          /* Next step */
          .next-v2-row,
          .next-hero { grid-template-columns: 1fr !important; gap: 1rem !important; }
          .next-cal-head,
          .next-cal-body { gap: 4px; }
          .next-foot-secondary { font-size: 0.78rem !important; }
        }

        @media (max-width: 480px) {
          .deck-slide h1 { font-size: 1.9rem; }
          .cover-v2-headline { font-size: 1.9rem !important; }
          .calc-v2-headline,
          .roi-v2-headline,
          .leak-v2-headline,
          .leak-v3-headline,
          .rhythm-v2-headline { font-size: 1.4rem !important; }
        }
      `}</style>
    </div>
  );
}
