"use client";

import { useEffect } from "react";
import { Logo } from "@/components/logo";

const CALL_URL = "https://cal.com/dylanevans";

export default function ConversionEngineClient() {
  useEffect(() => {
    const body = document.body;
    const main = body.querySelector("main");
    const prevBodyBg = body.style.backgroundColor;
    const prevMainBg = main?.style.backgroundColor || "";
    body.style.backgroundColor = "#1B1B1B";
    if (main) main.style.backgroundColor = "#1B1B1B";
    return () => {
      body.style.backgroundColor = prevBodyBg;
      if (main) main.style.backgroundColor = prevMainBg;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1B1B1B] flex flex-col">
      {/* ── Nav ── */}
      <nav className="w-full border-b border-[#F0F0F0] bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Logo height={18} className="text-[#1B1B1B]" />
          <a
            href={CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
          >
            Book a Conversion Audit
          </a>
        </div>
      </nav>

      <div className="flex-1 bg-white">
        {/* ── Hero ── */}
        <section className="w-full">
          <div className="max-w-5xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-16 text-center">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#666] mb-8" style={{ fontFamily: "var(--font-body)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D1FF4C]" />
              Conversion Engine — £8k/mo retainer
            </span>

            <h1 className="text-4xl md:text-[4rem] font-bold text-[#1B1B1B] leading-[1.05] tracking-tight mb-8 uppercase" style={{ fontFamily: "var(--font-heading)" }}>
              Conversion lifts when one team
              <br className="hidden md:inline" />{" "}
              owns <span className="bg-[#D1FF4C] px-3 py-0.5 rounded">the full funnel</span>
              <br className="hidden md:inline" />{" "}
              and ships every week.
            </h1>

            <p className="text-base md:text-xl text-[#666] leading-[1.65] max-w-3xl mx-auto mb-10" style={{ fontFamily: "var(--font-body)" }}>
              Conversion Engine is a monthly retainer for Shopify brands doing <strong className="text-[#1B1B1B]">£300k+/month</strong>. One pod owns ads to post-purchase. You get a weekly test ship and a fortnightly strategic review.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
              >
                Book a Conversion Audit
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-[#E5E5E5] text-[#1B1B1B] text-sm font-semibold rounded-lg hover:border-[#1B1B1B] transition-colors"
              >
                See pricing
              </a>
            </div>

            <p className="text-xs text-[#999] mt-6" style={{ fontFamily: "var(--font-body)" }}>
              500+ Shopify brands · £8k & £12k tiers · 90-day initial term
            </p>
          </div>
        </section>

        {/* ── Problem ── */}
        <section className="w-full bg-[#FAFAFA] border-y border-[#EEE]">
          <div className="max-w-4xl mx-auto px-6 md:px-10 py-20">
            <h2 className="text-xs uppercase tracking-[0.18em] text-[#999] mb-6" style={{ fontFamily: "var(--font-body)" }}>
              The problem
            </h2>
            <p className="text-2xl md:text-[2rem] text-[#1B1B1B] leading-[1.4] tracking-tight font-medium" style={{ fontFamily: "var(--font-heading)" }}>
              At £300k+/month, the funnel is the bottleneck. Ad costs climb. CR sits flat. The in-house designer is buried in BAU. The CRO agency you tried last year ran six tests and shipped two. None of them moved the number.
            </p>
            <p className="text-lg text-[#666] mt-6" style={{ fontFamily: "var(--font-body)" }}>
              You can feel where the leak is. You can&apos;t pinpoint it.
            </p>
          </div>
        </section>

        {/* ── Why The Funnel Is Stuck ── */}
        <section className="w-full">
          <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">
            <div className="text-center mb-14">
              <h2 className="text-xs uppercase tracking-[0.18em] text-[#999] mb-4" style={{ fontFamily: "var(--font-body)" }}>
                Why the funnel is stuck
              </h2>
              <p className="text-3xl md:text-5xl font-bold text-[#1B1B1B] tracking-tight uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                Three reasons CR plateaus
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  num: "01",
                  head: "Tests run in isolation, not as a system.",
                  body: "Most CRO agencies pull a hypothesis from a backlog and ship it without a view of the funnel above and below it. The lift dies in the next step.",
                },
                {
                  num: "02",
                  head: "Design and dev sit in different buildings from CRO.",
                  body: "By the time a winning variant is repackaged into a production page, the test has lost its momentum and the calendar has moved on.",
                },
                {
                  num: "03",
                  head: "Nobody owns the number end to end.",
                  body: "Your media buyer owns CAC. Your designer owns the page. Your developer owns the build. Conversion sits in the gaps between them.",
                },
              ].map((item) => (
                <div
                  key={item.num}
                  className="border border-[#EBEBEB] rounded-2xl p-7 bg-white hover:border-[#1B1B1B] transition-colors"
                >
                  <div className="text-xs font-mono text-[#999] mb-4">{item.num}</div>
                  <h3 className="text-lg font-semibold text-[#1B1B1B] tracking-tight leading-tight mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                    {item.head}
                  </h3>
                  <p className="text-[15px] text-[#666] leading-[1.65]" style={{ fontFamily: "var(--font-body)" }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── The Offer ── */}
        <section className="w-full bg-[#1B1B1B] text-white">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-24">
            <h2 className="text-xs uppercase tracking-[0.18em] text-[#D1FF4C] mb-6" style={{ fontFamily: "var(--font-body)" }}>
              The offer
            </h2>
            <h3 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight uppercase mb-10" style={{ fontFamily: "var(--font-heading)" }}>
              Conversion Engine is the operating system that runs your funnel.
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg leading-[1.7] text-white/80" style={{ fontFamily: "var(--font-body)" }}>
              <p>
                One pod owns ads, landing pages, PDPs, cart, checkout adjacencies, and post-purchase. <span className="text-white">Weekly test cycle:</span> hypothesis Monday, ship Friday. <span className="text-white">Fortnightly strategic review</span> with the CRO Lead.
              </p>
              <p>
                <span className="text-white">Full funnel ownership</span>, accountable to revenue and not deliverables. This is what £300k+/month brands need and almost nobody sells.
              </p>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="w-full">
          <div className="max-w-6xl mx-auto px-6 md:px-10 py-24">
            <div className="text-center mb-16">
              <h2 className="text-xs uppercase tracking-[0.18em] text-[#999] mb-4" style={{ fontFamily: "var(--font-body)" }}>
                How it works
              </h2>
              <p className="text-3xl md:text-5xl font-bold text-[#1B1B1B] tracking-tight uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                Four phases. One operating cadence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-0 md:gap-px bg-[#EBEBEB] rounded-2xl overflow-hidden border border-[#EBEBEB]">
              {[
                {
                  num: "1",
                  head: "Audit",
                  duration: "3 days",
                  body: "Your funnel gets mapped end to end and benchmarked against our library of 500+ Shopify brands. You leave with a prioritised test roadmap and a £-weighted opportunity score.",
                },
                {
                  num: "2",
                  head: "Build",
                  duration: "Week 1–2",
                  body: "Pod assembled. Design system audited. ClickUp board live. Slack channel open. The first variant ships inside 14 days.",
                },
                {
                  num: "3",
                  head: "Test",
                  duration: "Weekly cadence",
                  body: "One variant goes live every 7 days. Hypothesis on Monday. Build mid-week. Ship by Friday. Read results in the dashboard, not in a deck.",
                },
                {
                  num: "4",
                  head: "Compound",
                  duration: "Fortnightly review",
                  body: "Every two weeks the CRO Lead walks the data with you. Winning variants roll into the production funnel. Losing tests inform the next hypothesis. The roadmap reprices.",
                },
              ].map((p) => (
                <div key={p.num} className="bg-white p-7 md:p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-full bg-[#D1FF4C] flex items-center justify-center text-sm font-bold text-[#1B1B1B]">
                      {p.num}
                    </div>
                    <span className="text-xs uppercase tracking-[0.12em] text-[#999]" style={{ fontFamily: "var(--font-body)" }}>
                      {p.duration}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1B1B1B] tracking-tight uppercase mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                    {p.head}
                  </h3>
                  <p className="text-[15px] text-[#666] leading-[1.65]" style={{ fontFamily: "var(--font-body)" }}>
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── What You Get ── */}
        <section className="w-full bg-[#FAFAFA] border-y border-[#EEE]">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-24">
            <div className="text-center mb-14">
              <h2 className="text-xs uppercase tracking-[0.18em] text-[#999] mb-4" style={{ fontFamily: "var(--font-body)" }}>
                What you get
              </h2>
              <p className="text-3xl md:text-5xl font-bold text-[#1B1B1B] tracking-tight uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                Concrete deliverables. No vagueness.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "Weekly test ship — minimum one variant live every 7 days",
                "Fortnightly strategic review with the CRO Lead",
                "Full Figma access to your design system, owned by you",
                "A pod of 4: CRO strategist, designer, developer, PM",
                "Slack channel and ClickUp board, live from day one",
                "Access to the Ecom Landers Design Library and PDP section library",
                "Monthly funnel health report, every step benchmarked",
                "Direct line to the CRO Lead for in-flight calls",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 bg-white border border-[#EBEBEB] rounded-xl p-5">
                  <svg className="w-5 h-5 text-[#1B1B1B] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-[15px] text-[#1B1B1B] leading-[1.55]" style={{ fontFamily: "var(--font-body)" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Proof ── */}
        <section className="w-full">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-24 text-center">
            <h2 className="text-xs uppercase tracking-[0.18em] text-[#999] mb-6" style={{ fontFamily: "var(--font-body)" }}>
              Proof
            </h2>

            <div className="grid grid-cols-3 gap-6 md:gap-12 mb-14 max-w-3xl mx-auto">
              {[
                { stat: "500+", label: "Shopify brands" },
                { stat: "3,500+", label: "Pages shipped" },
                { stat: "£100M+", label: "Funnel revenue influenced" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-3xl md:text-5xl font-bold text-[#1B1B1B] tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                    {s.stat}
                  </div>
                  <div className="text-xs md:text-sm text-[#666] mt-2 uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-body)" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xl md:text-2xl text-[#1B1B1B] leading-[1.5] max-w-3xl mx-auto" style={{ fontFamily: "var(--font-body)" }}>
              The PDP section library powering Conversion Engine is the same one used by some of the highest-volume DTC brands in the UK. Every play has been tested at scale before it runs on yours.
            </p>

            <div className="mt-12 inline-block bg-[#FAFAFA] border border-dashed border-[#CCC] rounded-2xl px-8 py-6 max-w-2xl">
              <div className="text-xs uppercase tracking-[0.12em] text-[#999] mb-2" style={{ fontFamily: "var(--font-body)" }}>
                Featured result · placeholder
              </div>
              <p className="text-xl text-[#1B1B1B] font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                +34% PDP CR for [Brand] in 90 days at £420k/mo revenue.
              </p>
            </div>
          </div>
        </section>

        {/* ── For / Not For ── */}
        <section className="w-full bg-[#1B1B1B] text-white">
          <div className="max-w-6xl mx-auto px-6 md:px-10 py-24">
            <div className="text-center mb-14">
              <h2 className="text-xs uppercase tracking-[0.18em] text-[#D1FF4C] mb-4" style={{ fontFamily: "var(--font-body)" }}>
                Fit
              </h2>
              <p className="text-3xl md:text-5xl font-bold tracking-tight uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                Who this is for. Who it isn&apos;t.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-[#D1FF4C]" />
                  <span className="text-xs uppercase tracking-[0.12em] text-[#D1FF4C]" style={{ fontFamily: "var(--font-body)" }}>
                    For
                  </span>
                </div>
                <ul className="space-y-3 text-[15px] text-white/85" style={{ fontFamily: "var(--font-body)" }}>
                  {[
                    "Shopify brands doing £300k+/month",
                    "Spending £80k+/month on paid acquisition",
                    "A clear hero product or range",
                    "Teams ready to stop being the bottleneck on creative",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <svg className="w-4 h-4 text-[#D1FF4C] shrink-0 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-white/40" />
                  <span className="text-xs uppercase tracking-[0.12em] text-white/60" style={{ fontFamily: "var(--font-body)" }}>
                    Not for
                  </span>
                </div>
                <ul className="space-y-3 text-[15px] text-white/70" style={{ fontFamily: "var(--font-body)" }}>
                  {[
                    "Brands under £300k/month — the test volume doesn't compound yet",
                    "Brands looking for one-off page builds — that's a different agency",
                    "Brands without a paid acquisition engine — there's nothing to convert",
                    "Anyone wanting a strategy deck without ship velocity",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <svg className="w-4 h-4 text-white/40 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="w-full bg-white scroll-mt-20">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-24">
            <div className="text-center mb-14">
              <h2 className="text-xs uppercase tracking-[0.18em] text-[#999] mb-4" style={{ fontFamily: "var(--font-body)" }}>
                Pricing
              </h2>
              <p className="text-3xl md:text-5xl font-bold text-[#1B1B1B] tracking-tight uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                Two tiers. Both transparent.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* £8k */}
              <div className="border border-[#EBEBEB] rounded-2xl p-8 flex flex-col">
                <div className="text-xs uppercase tracking-[0.12em] text-[#999] mb-3" style={{ fontFamily: "var(--font-body)" }}>
                  Conversion Engine
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-[#1B1B1B] tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                    £8k
                  </span>
                  <span className="text-[#666]" style={{ fontFamily: "var(--font-body)" }}>
                    /month
                  </span>
                </div>
                <p className="text-[15px] text-[#666] mb-7" style={{ fontFamily: "var(--font-body)" }}>
                  One pod. Weekly test cycle. Fortnightly review. Full funnel ownership.
                </p>
                <ul className="space-y-2.5 text-[14px] text-[#1B1B1B] mb-8 flex-1" style={{ fontFamily: "var(--font-body)" }}>
                  {[
                    "1 variant shipped per week",
                    "Pod of 4 (CRO, design, dev, PM)",
                    "Fortnightly review with CRO Lead",
                    "Full funnel ownership",
                    "Slack + ClickUp + Figma",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-[#1B1B1B] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href={CALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center w-full py-3 bg-white border border-[#1B1B1B] text-[#1B1B1B] text-sm font-semibold rounded-lg hover:bg-[#1B1B1B] hover:text-white transition-colors"
                >
                  Book audit
                </a>
              </div>

              {/* £12k Anchor */}
              <div className="border-2 border-[#1B1B1B] rounded-2xl p-8 flex flex-col bg-[#1B1B1B] text-white relative">
                <div className="absolute -top-3 right-6 bg-[#D1FF4C] text-[#1B1B1B] text-xs font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-full" style={{ fontFamily: "var(--font-body)" }}>
                  Anchor
                </div>
                <div className="text-xs uppercase tracking-[0.12em] text-[#D1FF4C] mb-3" style={{ fontFamily: "var(--font-body)" }}>
                  Conversion Engine Anchor
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                    £12k
                  </span>
                  <span className="text-white/60" style={{ fontFamily: "var(--font-body)" }}>
                    /month
                  </span>
                </div>
                <p className="text-[15px] text-white/75 mb-7" style={{ fontFamily: "var(--font-body)" }}>
                  Everything in Conversion Engine, plus more cycles per sprint and a dedicated CRO Lead.
                </p>
                <ul className="space-y-2.5 text-[14px] text-white mb-8 flex-1" style={{ fontFamily: "var(--font-body)" }}>
                  {[
                    "2 variants shipped per week",
                    "Dedicated CRO Lead allocation",
                    "Priority dev queue",
                    "Quarterly executive review",
                    "Roadmap repriced monthly",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-[#D1FF4C] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href={CALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center w-full py-3 bg-[#D1FF4C] text-[#1B1B1B] text-sm font-semibold rounded-lg hover:bg-white transition-colors"
                >
                  Book audit
                </a>
              </div>
            </div>

            <p className="text-center text-sm text-[#999] mt-8" style={{ fontFamily: "var(--font-body)" }}>
              No setup fees. No &quot;starts at.&quot; 90-day initial term, monthly rolling thereafter.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="w-full bg-[#FAFAFA] border-t border-[#EEE]">
          <div className="max-w-3xl mx-auto px-6 md:px-10 py-24">
            <div className="text-center mb-14">
              <h2 className="text-xs uppercase tracking-[0.18em] text-[#999] mb-4" style={{ fontFamily: "var(--font-body)" }}>
                FAQ
              </h2>
              <p className="text-3xl md:text-5xl font-bold text-[#1B1B1B] tracking-tight uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                Founder questions, answered
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: "How is this different from a generic CRO agency?",
                  a: "Most CRO agencies sell tests. We sell funnel ownership. The pod is accountable to revenue, not to a deliverables list, which means the work compounds instead of decorating a slide.",
                },
                {
                  q: "What if a test loses?",
                  a: "Most tests lose. That's the job. Losing tests narrow the hypothesis space and inform the next sprint. Wins, losses and inconclusives report the same way — in the dashboard, every Friday.",
                },
                {
                  q: "Do we own the work?",
                  a: "Yes. Every page, asset and Figma file is yours. Nothing is gated. If the retainer ends tomorrow, your team keeps the design library and the production code.",
                },
                {
                  q: "What's the contract length?",
                  a: "90-day initial term so the audit and first sprint cycle have room to compound. Monthly rolling after that.",
                },
                {
                  q: "Can we pause?",
                  a: "Yes. Pause with 30 days' notice. The pod gets reallocated and your slot is held for 60 days at no charge.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group bg-white border border-[#EBEBEB] rounded-xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none">
                    <span className="text-[16px] md:text-[17px] font-semibold text-[#1B1B1B] tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                      {item.q}
                    </span>
                    <svg
                      className="w-5 h-5 text-[#999] shrink-0 transition-transform group-open:rotate-45"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-6 -mt-1 text-[15px] text-[#666] leading-[1.7]" style={{ fontFamily: "var(--font-body)" }}>
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="w-full bg-white">
          <div className="max-w-4xl mx-auto px-6 md:px-10 py-24 text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-[#1B1B1B] leading-[1.05] tracking-tight uppercase mb-8" style={{ fontFamily: "var(--font-heading)" }}>
              Stop running tests.
              <br />
              Start owning <span className="bg-[#D1FF4C] px-3 py-0.5 rounded">the funnel.</span>
            </h2>
            <p className="text-lg md:text-xl text-[#666] leading-[1.65] max-w-2xl mx-auto mb-10" style={{ fontFamily: "var(--font-body)" }}>
              £8k/month against an £80k+ ad spend is the easiest leverage in the P&amp;L. The Conversion Audit is three days and tells you whether we&apos;re a fit before you commit.
            </p>
            <a
              href={CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1B1B1B] text-white text-base font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
            >
              Book a Conversion Audit
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="w-full bg-[#1B1B1B]">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 flex items-center justify-between gap-4">
          <p className="text-sm md:text-base font-medium text-white tracking-tight" style={{ fontFamily: "var(--font-body)" }}>
            The Funnel Architects Behind <em className="font-medium">Shopify&apos;s Fastest-Growing Brands.</em>
          </p>
          <img src="/shopify-select-partner.svg" alt="Shopify Select Partner" className="h-10 w-auto shrink-0" />
        </div>
      </footer>
    </div>
  );
}
