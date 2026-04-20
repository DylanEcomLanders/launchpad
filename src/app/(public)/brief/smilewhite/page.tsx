"use client";

import { useEffect, useRef, useState } from "react";

/* ── Reveal on scroll ── */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 600ms ease-out ${delay}ms, transform 600ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function SmileWhiteProposal() {
  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header className="border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/el-logo.svg" alt="Ecomlanders" className="w-6 h-6" />
            <span className="text-xs font-semibold text-[#1A1A1A] tracking-wide">
              Ecomlanders <span className="text-[#BBB] mx-1">×</span> SmileWhite
            </span>
          </div>
          <p className="text-[10px] text-[#AAA] uppercase tracking-widest">20 April 2026</p>
        </div>
      </header>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="px-6 md:px-12 pt-20 md:pt-24 pb-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-6">Conversion Engine Proposal</p>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1] mb-6 text-[#1A1A1A]">
              Proposed Scope of Work
            </h1>
          </Reveal>

          <Reveal delay={250}>
            <p className="text-base md:text-lg text-[#555] leading-relaxed max-w-2xl">
              Following our call, we've prepared this proposal outlining how we'd support SmileWhite in closing the gap between paid traffic and inquiry submissions. The bookings engine downstream is already strong — this work focuses on the conversion layer sitting between your ads and your inquiry form.
            </p>
          </Reveal>

          <Reveal delay={400}>
            <div className="flex items-center gap-3 mt-10 text-[11px] text-[#AAA]">
              <span>Prepared for Smile at the Occidental Suite</span>
              <span className="size-1 rounded-full bg-[#DDD]" />
              <span>Valid for 30 days</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ 01 — THE OPPORTUNITY ═══════════════════ */}
      <section className="px-6 md:px-12 py-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">01 — The Opportunity</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight text-[#1A1A1A]">
              <span className="text-[#AAA]">Your bookings engine is strong.</span> The inquiry layer needs work.
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <p className="text-base text-[#555] leading-relaxed mb-10 max-w-2xl">
              Over the last three months you've taken pickup rates from 40-50% to 80% and hold a steady 15-20% booking rate once on the phone. That's a well-oiled machine. The bottleneck sits earlier — in the space between ad click and form submission.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {[
              { label: "Pickup rate", value: "80%", sub: "Up from 40-50%" },
              { label: "Booking rate", value: "15-20%", sub: "Consultation converts" },
              { label: "Traffic split", value: "50/50", sub: "Google / Meta" },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={150 + i * 80} className="h-full">
                <div className="p-5 border border-[#E8E8E8] rounded-xl h-full flex flex-col">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-[#AAA] mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</p>
                  {stat.sub && <p className="text-[11px] text-[#999] mt-1">{stat.sub}</p>}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={400}>
            <div className="p-6 border-l-2 border-[#1A1A1A] bg-[#FAFAFA] rounded-r-xl">
              <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Where the leak sits</p>
              <p className="text-sm text-[#555] leading-relaxed mb-3">
                Google and Meta traffic arrive at the same inquiry page, despite having very different intent levels. Google visitors are searching actively — ready to book. Meta visitors are in discovery mode — they need more context and reassurance before submitting their details.
              </p>
              <p className="text-sm text-[#555] leading-relaxed">
                A single page can't serve both well. The £65 consultation fee also drops in earlier than ideal for colder traffic, creating friction before desire is built. Resolving these is a matter of segmentation and sequencing, not a full rebuild.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ 02 — HOW WE PLUG IN ═══════════════════ */}
      <section className="px-6 md:px-12 py-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">02 — How We Plug In</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight text-[#1A1A1A]">
              <span className="text-[#AAA]">A conversion layer</span> that works with your existing setup.
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <p className="text-base text-[#555] leading-relaxed mb-10 max-w-2xl">
              We slot in between your ad team and your bookings team without disrupting either. No replatforming, no changes to your inquiry system, no interference with how your calls are run. Our role is to make every pound of ad spend work harder by the time it hits your form.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-3 mb-10">
            {[
              "Funnel audit across every touchpoint from ad click to inquiry",
              "Traffic segmentation — separate pages for Google and Meta intent levels",
              "Iterative page redesigns that build on what's already performing",
              "Ad-to-page alignment so the scent trail stays consistent",
              "Pre-framing content for Meta traffic to warm prospects before the form",
              "A/B testing programme with structured hypothesis chains",
              "Heatmapping and session recording to surface friction points",
              "Monthly reporting tied to inquiry and booking impact",
            ].map((item, i) => (
              <Reveal key={i} delay={i * 40}>
                <div className="flex items-start gap-3 p-4 border border-[#E8E8E8] rounded-xl">
                  <div className="size-4 rounded-full border border-[#1A1A1A] flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="size-2.5 text-[#1A1A1A]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                  </div>
                  <p className="text-sm text-[#444] leading-snug">{item}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={500}>
            <p className="text-sm text-[#777] italic max-w-2xl">
              We don't manage ads, we don't touch your CRM, and we don't staff your phone lines. Those already work. Our remit starts at the click and ends at the submitted form.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ 03 — SCOPE & INVESTMENT ═══════════════════ */}
      <section className="px-6 md:px-12 py-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">03 — Scope & Investment</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight text-[#1A1A1A]">
              Two ways to start.
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <p className="text-base text-[#555] leading-relaxed mb-10 max-w-2xl">
              The retainer is the full engagement — ongoing, compounding, team-led. The pilot is a scoped project covering the three pages you shared, designed as a standalone piece of work or a stepping stone into the retainer.
            </p>
          </Reveal>

          {/* Option A — Retainer (horizontal featured) */}
          <Reveal delay={150}>
            <div className="mb-6 p-8 md:p-10 bg-[#1A1A1A] text-white rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
                <div className="md:w-1/2">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Option A</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-300 text-[#1A1A1A] text-[9px] font-bold uppercase tracking-wider rounded-full">
                      <svg className="size-2.5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      Highest Return
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Conversion Engine Retainer</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Full conversion team embedded alongside SmileWhite. Deep audit, full roadmap, ongoing builds, tests, and monthly reporting. Ideal for compounding results over a 6-12 month horizon.
                  </p>
                </div>
                <div className="md:w-1/2 md:border-l md:border-white/10 md:pl-8">
                  <p className="text-4xl md:text-5xl font-bold mb-1">£20,000<span className="text-base font-normal text-white/50">/mo</span></p>
                  <p className="text-xs text-white/50 mb-5">Billed monthly · Cancel with 30 days' notice</p>
                  <div className="space-y-2">
                    {[
                      "Full team: strategist, designer, developer, QA, PM",
                      "60-90 day visual roadmap",
                      "Ongoing page builds, rebuilds, and testing",
                      "A/B testing software + heatmapping",
                      "Regular updates in your preferred channel",
                      "Monthly strategic review + reporting",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 text-xs text-white/80">
                        <div className="size-1 rounded-full bg-white/40 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Option B — Pilot */}
          <Reveal delay={250}>
            <div className="p-8 border border-[#E8E8E8] rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="md:w-1/2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-3">Option B — Phase 1 Pilot</p>
                  <h3 className="text-xl font-bold mb-3 text-[#1A1A1A]">Three-Page Rebuild</h3>
                  <p className="text-sm text-[#555] leading-relaxed">
                    A scoped project covering the three pages you shared. Full redesign and rebuild, with the audit and recommendations feeding into a broader roadmap should you choose to move into the retainer afterwards.
                  </p>
                </div>
                <div className="md:w-1/2 md:border-l md:border-[#E8E8E8] md:pl-8">
                  <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-1">£15,000</p>
                  <p className="text-xs text-[#999] mb-5">One-time · 30-day delivery</p>
                  <div className="space-y-2">
                    {[
                      "Conversion audit covering the three pages",
                      "Rebuild of all three pages, segmented by traffic source",
                      "Pre-framing content strategy for Meta traffic",
                      "Tracking audit and recommendations",
                      "Handover report with prioritised next steps",
                      "Credit toward the retainer if upgraded within 30 days",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 text-xs text-[#555]">
                        <div className="size-1 rounded-full bg-[#1A1A1A] mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ 04 — HOW WE WORK ═══════════════════ */}
      <section className="px-6 md:px-12 py-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">04 — How We Work</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-10 leading-tight text-[#1A1A1A]">
              Four principles that shape every engagement.
            </h2>
          </Reveal>

          <div className="space-y-0">
            {[
              {
                title: "We lead the roadmap.",
                body: "You shouldn't need to direct us page by page. We prioritise based on impact, present a clear plan, and execute against it. Your role is to approve the direction and flag anything that doesn't fit.",
              },
              {
                title: "We focus on the layer nobody else owns.",
                body: "Your ad team cares about CPC. Your team on the phones cares about pickup rate. Nobody else is watching the space between click and form. That becomes our entire focus.",
              },
              {
                title: "We plug into your existing process.",
                body: "Framer, Payload, Shopify — whatever you're running, we work within it. No platform migrations, no forcing you off tools that already work. We adapt to your stack.",
              },
              {
                title: "Compounding over cosmetic.",
                body: "Month one is foundational. Month two iterates on month one's data. Month three builds on both. The engagement gets sharper over time because each decision is informed by what's already been tested.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="flex gap-6 py-6 border-t border-[#E8E8E8] first:border-t-0">
                  <div className="text-sm font-semibold text-[#AAA] shrink-0 tabular-nums w-6">0{i + 1}</div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1A1A1A] mb-1.5">{item.title}</h3>
                    <p className="text-sm text-[#555] leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ 05 — TIMELINE ═══════════════════ */}
      <section className="px-6 md:px-12 py-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">05 — Timeline</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-10 leading-tight text-[#1A1A1A]">
              First month, mapped out.
            </h2>
          </Reveal>

          <div className="space-y-0">
            {[
              { week: "Week 1", title: "Deep-dive audit & roadmap", body: "Full review of the funnel, current pages, tracking, and traffic behaviour. Findings compiled into a prioritised roadmap." },
              { week: "Week 2", title: "Design & build begins", body: "Highest-priority pages move into design based on the audit. Copy, structure, and visual direction locked in." },
              { week: "Week 3", title: "Internal review & refinement", body: "Designs go through internal review, client feedback incorporated, and development begins on approved pages." },
              { week: "Week 4", title: "Pages go live", body: "First pages shipped to production with tracking in place. Baseline metrics captured, testing programme begins." },
            ].map((phase, i) => (
              <Reveal key={phase.week} delay={i * 80}>
                <div className="flex gap-6 py-5 border-t border-[#E8E8E8] first:border-t-0">
                  <div className="shrink-0 w-20">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#AAA]">{phase.week}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#1A1A1A] mb-1">{phase.title}</h4>
                    <p className="text-sm text-[#555] leading-relaxed">{phase.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={400}>
            <p className="text-xs text-[#999] mt-10 italic">
              Ecomlanders is a partner of Intelligems and can provide access to their testing platform if needed during the engagement.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ 06 — SIGN-OFF ═══════════════════ */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">06 — Sign-Off</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-tight text-[#1A1A1A]">
              This proposal is valid for 30 days from the date above.
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="p-6 border border-[#E8E8E8] rounded-xl mb-10">
              <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Quote Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-[#F0F0F0]">
                  <span className="text-[#555]">Conversion Engine Retainer</span>
                  <span className="font-semibold text-[#1A1A1A]">£20,000 / month</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#555]">Phase 1 Pilot — Three Pages</span>
                  <span className="font-semibold text-[#1A1A1A]">£15,000 one-time</span>
                </div>
              </div>
              <p className="text-[11px] text-[#999] mt-4">All figures GBP, inclusive of VAT where applicable. Invoices issued monthly in advance for retainer.</p>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div>
                <p className="text-sm text-[#1A1A1A] font-semibold mb-1">Dylan Evans</p>
                <p className="text-xs text-[#999]">Founder · Ecomlanders</p>
              </div>
              <div>
                <p className="text-sm text-[#1A1A1A] font-semibold mb-1">Ajay Daniel</p>
                <p className="text-xs text-[#999]">Founder · Ecomlanders</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={300}>
            <p className="text-sm text-[#555] leading-relaxed">
              To confirm either option, a reply via WhatsApp or email is sufficient to begin. We'll issue the relevant invoice or payment link, and the kickoff call will be scheduled within 24 hours of confirmation.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-[#E8E8E8] px-6 md:px-12 py-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/el-logo.svg" alt="Ecomlanders" className="w-4 h-4 opacity-60" />
            <span className="text-[11px] text-[#999]">Ecomlanders</span>
          </div>
          <p className="text-[10px] text-[#CCC]">Prepared for SmileWhite · April 2026</p>
        </div>
      </footer>
    </div>
  );
}
