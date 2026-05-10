"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import {
  DEFAULT_TURNAROUND_CONFIG,
  getClientQuotedForId,
  loadTurnaroundConfig,
  type TurnaroundConfig,
} from "@/lib/turnarounds";
import { itemFor, formatPrice } from "@/lib/pricing";

const ENGINE_PRICE = formatPrice(itemFor("conversion-partnership"));
const FRAME_PRICE = formatPrice(itemFor("page-build-1")).split(" / ")[0];
const PDP_CART_PRICE = formatPrice(itemFor("page-build-2")).split(" / ")[0];
const FULL_FUNNEL_PRICE = formatPrice(itemFor("page-build-3")).split(" / ")[0];

const CALL_URL = "https://cal.com/dylanevans";

function formatBusinessDays(days: number | null): string {
  if (!days || days <= 0) return "—";
  if (days <= 5) return `${days} business days`;
  const weeks = Math.round(days / 5);
  return `~${weeks} week${weeks === 1 ? "" : "s"}`;
}

const ENGINE_INCLUDES = [
  {
    group: "Strategy",
    items: [
      "Rolling 60–90 day conversion roadmap",
      "Audit-led prioritisation — no guesswork briefs",
      "Monthly strategic review on what shipped, what moved",
    ],
  },
  {
    group: "Execution",
    items: [
      "Page builds — PDPs, landers, advertorials",
      "Continuous A/B test cycle, cadence tiered to traffic",
      "AOV + LTV — bundles, upsells, post-purchase",
    ],
  },
  {
    group: "Reporting",
    items: [
      "Weekly progress notes inside your roadmap",
      "Test results, learnings, next-cycle plan",
      "One owner for everything post-click",
    ],
  },
];

function buildFunnelBuilds(config: TurnaroundConfig) {
  const frame = getClientQuotedForId("frame-page", config);
  const pdp = getClientQuotedForId("pdp-build", config);
  const cart = getClientQuotedForId("cart-build", config);
  const fullFunnel = getClientQuotedForId("full-funnel-build", config);

  // PDP + Cart paired = sum of both client-quoted figures (overlapping QA already
  // baked into each item's buffer).
  const pdpCart = pdp != null && cart != null ? pdp + cart : null;

  return [
    {
      title: "Frame Page",
      positioning: "A single high-converting landing or frame page.",
      includes: [
        "1 custom-coded page",
        "Copy, design, dev & QA",
        "Mobile-first responsive build",
      ],
      turnaround: formatBusinessDays(frame),
      priceFrom: FRAME_PRICE,
      href: CALL_URL,
    },
    {
      title: "PDP + Cart",
      positioning: "Product page and cart, optimised as a paired build.",
      includes: [
        "PDP + Cart pages, built to convert together",
        "Copy, design, dev & QA",
        "10% volume saving vs single-page rate",
      ],
      turnaround: formatBusinessDays(pdpCart),
      priceFrom: PDP_CART_PRICE,
      featured: true,
      href: CALL_URL,
    },
    {
      title: "Full Funnel Build",
      positioning: "Landing → PDP → Cart. The complete post-click funnel.",
      includes: [
        "Landing, PDP & Cart — built as one funnel",
        "Copy, design, dev & QA",
        "15% volume saving vs single-page rate",
      ],
      turnaround: formatBusinessDays(fullFunnel),
      priceFrom: FULL_FUNNEL_PRICE,
      href: CALL_URL,
    },
  ];
}

export default function OffersClient({ portfolioImages = [] }: { portfolioImages?: string[] }) {
  const [funnelBuilds, setFunnelBuilds] = useState(() =>
    buildFunnelBuilds(DEFAULT_TURNAROUND_CONFIG),
  );

  useEffect(() => {
    setFunnelBuilds(buildFunnelBuilds(loadTurnaroundConfig()));
  }, []);

  useEffect(() => {
    const body = document.body;
    const main = body.querySelector("main");
    const prevBodyBg = body.style.backgroundColor;
    const prevMainBg = main?.style.backgroundColor || "";
    body.style.backgroundColor = "#F7F8FA";
    if (main) main.style.backgroundColor = "#F7F8FA";
    return () => {
      body.style.backgroundColor = prevBodyBg;
      if (main) main.style.backgroundColor = prevMainBg;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* ── Nav ── */}
      <nav className="w-full border-b border-[#EDEDEF] bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Logo height={18} className="text-[#1B1B1B]" />
          <a
            href={CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs md:text-sm font-semibold px-4 py-2 bg-[#1B1B1B] text-white rounded-full hover:bg-[#2D2D2D] transition-colors"
          >
            Book a call
          </a>
        </div>
      </nav>

      {/* ── Hero: Conversion Engine ── */}
      <section className="bg-[#1B1B1B] text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 md:px-10 pt-24 pb-20 md:pt-36 md:pb-28 text-center relative">
          <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.18em] bg-[#D1FF4C] text-[#1B1B1B] px-3 py-1.5 rounded-full">
            The flagship · Post-click partnership
          </span>
          <h1
            className="text-5xl md:text-[6.5rem] font-semibold tracking-tight leading-[0.95] mt-10"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            The Conversion
            <br />
            Engine.
          </h1>
          <p
            className="text-xl md:text-3xl text-white leading-[1.3] mt-10 max-w-3xl mx-auto font-medium tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Same ad spend.{" "}
            <span className="bg-[#D1FF4C] text-[#1B1B1B] px-2 py-0.5 rounded">
              Significantly more revenue.
            </span>
          </p>
          <p
            className="text-base md:text-lg text-[#B5B5B5] leading-[1.6] mt-8 max-w-2xl mx-auto"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Most DTC brands spend £50–100K/mo driving traffic to pages that don't convert.
            We plug in as your conversion partner — audit the funnel, own the roadmap, build
            the pages, run the tests, compound the results.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <a
              href={CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#D1FF4C] text-[#1B1B1B] text-sm font-semibold rounded-full hover:bg-[#C5F441] transition-colors"
            >
              Book your audit call
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </a>
            <Link
              href="/deck"
              className="inline-flex items-center gap-2 px-8 py-4 text-white/80 text-sm font-semibold rounded-full hover:text-white transition-colors"
            >
              See the full deck →
            </Link>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.16em] text-[#7A7A7A]">
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#D1FF4C]" />
              Quick wins live · Week 1
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#D1FF4C]" />
              Most retainers pay back · 60 days
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#D1FF4C]" />
              {ENGINE_PRICE}/mo
            </span>
          </div>
        </div>
      </section>

      {/* ── The Gap (tension) ── */}
      <section className="bg-[#0F0F0F] text-white border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D1FF4C] mb-4">
              The gap
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] max-w-3xl mx-auto"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Every day a leaky funnel runs,
              <br />
              <span className="text-[#7A7A7A]">money walks out the door.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
            <div className="bg-[#0F0F0F] p-8 md:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-3">
                Sample brand
              </p>
              <p className="text-sm text-[#B5B5B5] leading-[1.5]">
                150K monthly visits · 1.8% CVR · £55 AOV
              </p>
              <p className="text-3xl md:text-4xl font-semibold tracking-tight mt-6 tabular-nums">
                £148,500<span className="text-base text-[#7A7A7A] font-normal">/mo</span>
              </p>
              <p className="text-xs text-[#7A7A7A] mt-2">Today's revenue</p>
            </div>
            <div className="bg-[#0F0F0F] p-8 md:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-3">
                Industry benchmark
              </p>
              <p className="text-sm text-[#B5B5B5] leading-[1.5]">
                Same traffic · 3.2% CVR · £55 AOV
              </p>
              <p className="text-3xl md:text-4xl font-semibold tracking-tight mt-6 tabular-nums">
                £264,000<span className="text-base text-[#7A7A7A] font-normal">/mo</span>
              </p>
              <p className="text-xs text-[#7A7A7A] mt-2">If they hit benchmark</p>
            </div>
            <div className="bg-[#D1FF4C] text-[#1B1B1B] p-8 md:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3">
                The gap
              </p>
              <p className="text-sm leading-[1.5] opacity-70">
                Annual = £1.38M · ~£3,800/day
              </p>
              <p className="text-3xl md:text-4xl font-semibold tracking-tight mt-6 tabular-nums">
                £115,500<span className="text-base font-normal opacity-70">/mo</span>
              </p>
              <p className="text-xs mt-2 font-semibold uppercase tracking-[0.14em]">
                Left on the table
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-[#7A7A7A] leading-[1.6] mt-10 max-w-2xl mx-auto">
            Breakeven on the partnership = a{" "}
            <strong className="text-white">0.11% CVR lift</strong>. Our 90-day target is{" "}
            <strong className="text-white">0.5–2%</strong>.
          </p>
        </div>
      </section>

      {/* ── Why a partner (positioning) ── */}
      <section className="bg-white border-y border-[#EDEDEF]">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="text-center mb-14 md:mb-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-4">
              Why this isn't a vendor relationship
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-[#1B1B1B] max-w-3xl mx-auto"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              You don't brief us.
              <br />
              <span className="text-[#7A7A7A]">We own the roadmap.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#EDEDEF] rounded-2xl overflow-hidden border border-[#EDEDEF]">
            <div className="bg-white p-8 md:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-4">
                Vendor
              </p>
              <p className="text-base text-[#3A3A3A] leading-[1.55]">
                Briefed, builds the page, hands it back. You're the strategist.
              </p>
            </div>
            <div className="bg-white p-8 md:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-4">
                Agency
              </p>
              <p className="text-base text-[#3A3A3A] leading-[1.55]">
                Writes reports and recommendations. Hands you a doc, not a result.
              </p>
            </div>
            <div className="bg-[#1B1B1B] text-white p-8 md:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D1FF4C] mb-4">
                Conversion partner
              </p>
              <p className="text-base text-white leading-[1.55]">
                Diagnoses, strategises, builds, tests, compounds. One owner for the result.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 90 days timeline ── */}
      <section className="bg-[#F7F8FA]">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="text-center mb-14 md:mb-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-4">
              The first 90 days
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-[#1B1B1B]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Quick wins fast.
              <br />
              <span className="text-[#7A7A7A]">Compounding from Month 3.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                label: "Week 1",
                title: "Audit + first wins live",
                desc: "Score every layer, find the 3 biggest leaks. Quick wins ship Week 1 — before the retainer's first invoice clears.",
              },
              {
                label: "Month 2",
                title: "First major build live",
                desc: "Build, ship, measure, iterate. ICE-prioritised. 2-week test minimum on every cycle.",
              },
              {
                label: "Month 3+",
                title: "Compounding kicks in",
                desc: "Wins stack. Most retainers pay back inside 60 days. Roadmap rolls 60–90 days ahead.",
              },
            ].map((step) => (
              <div
                key={step.label}
                className="rounded-2xl bg-white border border-[#EDEDEF] p-8 md:p-10"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1B1B1B] mb-4 pb-3 border-b border-[#EDEDEF]">
                  {step.label}
                </p>
                <h3
                  className="text-xl font-semibold text-[#1B1B1B] tracking-tight leading-[1.2]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {step.title}
                </h3>
                <p className="text-[15px] text-[#5A5A5A] leading-[1.55] mt-4">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proof bar ── */}
      <section className="bg-[#1B1B1B] text-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="text-center mb-14 md:mb-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D1FF4C] mb-4">
              Wins from the field
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] max-w-3xl mx-auto"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              3,500+ pages shipped.
              <br />
              <span className="text-[#7A7A7A]">Here's what they moved.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
            {[
              { vert: "Supplements", stat: "2.1% → 4.3%", note: "CVR · 90 days" },
              { vert: "Apparel", stat: "+£42K", note: "/mo recovered · PDP rebuild" },
              { vert: "Skincare", stat: "+38%", note: "AOV · bundle + upsell" },
              { vert: "Pet food", stat: "+14%", note: "Checkout completion" },
              { vert: "Home goods", stat: "+£18", note: "Per order · post-purchase" },
            ].map((item) => (
              <div key={item.vert} className="bg-[#1B1B1B] p-6 md:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D1FF4C] mb-3">
                  {item.vert}
                </p>
                <p
                  className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums leading-[1]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {item.stat}
                </p>
                <p className="text-xs text-[#7A7A7A] mt-3 leading-[1.4]">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Engine: what's included ── */}
      <section className="bg-white border-y border-[#EDEDEF]">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="text-center mb-14 md:mb-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-4">
              What's included
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-[#1B1B1B]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Everything post-click,
              <br />
              one retainer.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            {ENGINE_INCLUDES.map((col) => (
              <div key={col.group}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1B1B1B] mb-5 pb-4 border-b border-[#EDEDEF]">
                  {col.group}
                </p>
                <ul className="space-y-4">
                  {col.items.map((item) => (
                    <li
                      key={item}
                      className="text-base text-[#3A3A3A] leading-[1.5]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 md:mt-20 text-center">
            <a
              href={CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#1B1B1B] text-white text-sm font-semibold rounded-full hover:bg-[#2D2D2D] transition-colors"
            >
              Book a 30-min audit call
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </a>
            <p className="text-xs text-[#7A7A7A] mt-5 uppercase tracking-[0.16em]">
              We'll show you the gap on your funnel — live
            </p>
          </div>
        </div>
      </section>

      {/* ── Tier 2: Funnel Builds ── */}
      <section className="bg-[#F7F8FA]">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-32">
          <div className="text-center mb-14 md:mb-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-4">
              Or — Project-based
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-[#1B1B1B]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Funnel Builds.
            </h2>
            <p
              className="text-base md:text-lg text-[#5A5A5A] leading-[1.6] mt-5 max-w-xl mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              One-off, fixed-scope projects. Same team, same standards — no retainer commitment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {funnelBuilds.map((build) => (
              <div
                key={build.title}
                className={`relative flex flex-col rounded-2xl border bg-white p-8 md:p-10 ${
                  build.featured
                    ? "border-[#1B1B1B] shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
                    : "border-[#EDEDEF]"
                }`}
              >
                {build.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.18em] bg-[#1B1B1B] text-white px-3 py-1.5 rounded-full">
                    Most picked
                  </span>
                )}
                <h3
                  className="text-2xl font-semibold text-[#1B1B1B] tracking-tight"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {build.title}
                </h3>
                <p className="text-base text-[#5A5A5A] mt-3 leading-[1.5]">{build.positioning}</p>

                <ul className="mt-8 space-y-3.5 text-[15px] text-[#3A3A3A] flex-1">
                  {build.includes.map((item) => (
                    <li key={item} className="leading-[1.5]">
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-10 pt-6 border-t border-[#EDEDEF]">
                  <div className="flex items-baseline justify-between mb-6">
                    <span className="text-xs uppercase tracking-[0.14em] text-[#7A7A7A]">
                      {build.turnaround}
                    </span>
                    <span className="text-xl font-semibold text-[#1B1B1B] tabular-nums tracking-tight">
                      From {build.priceFrom}
                    </span>
                  </div>

                  <a
                    href={build.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-2 w-full px-4 py-3.5 text-sm font-semibold rounded-full transition-colors ${
                      build.featured
                        ? "bg-[#1B1B1B] text-white hover:bg-[#2D2D2D]"
                        : "border border-[#1B1B1B] text-[#1B1B1B] hover:bg-[#1B1B1B] hover:text-white"
                    }`}
                  >
                    Start a build
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proof strip ── */}
      {portfolioImages.length > 0 && (
        <section className="bg-white border-t border-[#EDEDEF] py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6 md:px-10 mb-12 md:mb-16 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-4">
              Recent work
            </p>
            <h3
              className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-[#1B1B1B]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              3,500+ pages shipped for DTC brands.
            </h3>
            <Link
              href="/portfolio-v2"
              className="inline-block mt-6 text-sm font-semibold text-[#1B1B1B] hover:underline"
            >
              See full portfolio →
            </Link>
          </div>
          <div className="relative w-full overflow-hidden">
            <div className="flex gap-6 animate-scroll-offers">
              {[...portfolioImages, ...portfolioImages].map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt=""
                  loading={idx < 4 ? "eager" : "lazy"}
                  decoding="async"
                  width={240}
                  height={360}
                  className="shrink-0 w-[240px] h-[360px] object-cover rounded-xl border border-[#EDEDEF]"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final: not sure which fits ── */}
      <section className="bg-[#F7F8FA] border-t border-[#EDEDEF]">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-24 md:py-36 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-5">
            Not sure which fits?
          </p>
          <h3
            className="text-3xl md:text-5xl font-semibold tracking-tight text-[#1B1B1B] leading-[1.1]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Book a discovery call.
          </h3>
          <p className="text-base md:text-lg text-[#5A5A5A] mt-6 leading-[1.6] max-w-xl mx-auto">
            30 minutes. We'll look at your funnel, talk through what's leaking, and tell you straight
            whether the Engine or a focused build is the right next move.
          </p>
          <a
            href={CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-10 px-8 py-4 bg-[#1B1B1B] text-white text-sm font-semibold rounded-full hover:bg-[#2D2D2D] transition-colors"
          >
            Book discovery call
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#1B1B1B] text-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 flex items-center justify-between gap-4 flex-wrap">
          <p
            className="text-sm md:text-base font-medium tracking-tight"
            style={{ fontFamily: "var(--font-body)" }}
          >
            The Funnel Architects Behind{" "}
            <em className="font-medium">Shopify's Fastest-Growing Brands.</em>
          </p>
          <img
            src="/shopify-select-partner.svg"
            alt="Shopify Select Partner"
            className="h-10 w-auto"
          />
        </div>
      </footer>

      <style jsx>{`
        @keyframes scroll-offers {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll-offers {
          animation: scroll-offers 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
