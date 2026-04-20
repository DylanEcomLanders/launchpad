"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 700ms ease-out ${delay}ms, transform 700ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function SmileWhiteProposal() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A]">
      {/* ───────────── Animated gradient backdrop ───────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-100/40 to-transparent blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-emerald-100/30 to-transparent blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
      </div>

      <style jsx global>{`
        @keyframes pulse-slow { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 6s ease infinite;
        }
      `}</style>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative z-10 px-6 md:px-12 pt-20 md:pt-28 pb-24">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="flex items-center gap-3 mb-8">
              <img src="/el-logo.svg" alt="Ecom Landers" className="w-7 h-7" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#7A7A7A]">Ecom Landers × Smile at the Occidental Suite</span>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#AAA] mb-3">Conversion Engine Proposal</p>
          </Reveal>

          <Reveal delay={200}>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] mb-6">
              The layer <br />
              <span className="bg-gradient-to-r from-[#1B1B1B] via-blue-600 to-emerald-600 bg-clip-text text-transparent animate-gradient-x">nobody owns.</span>
            </h1>
          </Reveal>

          <Reveal delay={400}>
            <p className="text-lg md:text-xl text-[#555] leading-relaxed max-w-2xl">
              Your ads team drives traffic. Your phone team converts calls. Nobody obsesses over the <em className="text-[#1A1A1A] not-italic font-semibold">30 seconds between the click and the form</em> — until now.
            </p>
          </Reveal>

          <Reveal delay={600}>
            <div className="flex items-center gap-3 mt-10 text-[11px] text-[#AAA]">
              <span>Prepared 20 April 2026</span>
              <span className="size-1 rounded-full bg-[#CCC]" />
              <span>Valid for 30 days</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ WHERE YOU ARE ═══════════════════ */}
      <section className="relative z-10 bg-white border-y border-[#E8E8E8] px-6 md:px-12 py-24">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">Where You Are Right Now</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-8 leading-tight">
              You've built an excellent bookings engine. <span className="text-[#999]">The bottleneck is upstream.</span>
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <p className="text-base md:text-lg text-[#555] leading-relaxed mb-10">
              The system <em>downstream</em> of the landing page is dialled. Pickup rate up from 40–50% to 80% over the last three months. Different numbers for different times of day. Mobile over landline. A clear cadence.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {[
              { label: "Pickup rate", value: "80%", color: "#10B981" },
              { label: "Booking rate", value: "15-20%", color: "#3B82F6" },
              { label: "Traffic split", value: "50/50", sub: "Google/Meta", color: "#1B1B1B" },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={200 + i * 100}>
                <div className="p-6 bg-[#FAFAFA] border border-[#E8E8E8] rounded-2xl">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#AAA] mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  {stat.sub && <p className="text-xs text-[#999] mt-1">{stat.sub}</p>}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={500}>
            <div className="p-6 md:p-8 bg-gradient-to-br from-red-50 to-amber-50 border border-red-100 rounded-2xl">
              <p className="text-sm font-semibold text-red-700 mb-3 uppercase tracking-wider">The Problem</p>
              <p className="text-base text-[#444] leading-relaxed">
                Google and Meta traffic have <strong className="text-[#1A1A1A]">wildly different intent levels</strong> — but they land on the same page. Google traffic is hot and ready to book. Meta traffic is cold and needs warming up. Sending both to the same inquiry form means you're either under-serving Google or over-complicating Meta.
              </p>
              <p className="text-base text-[#444] leading-relaxed mt-4">
                That's a <strong className="text-[#1A1A1A]">conversion layer problem</strong>. And it's fixable.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ WHAT WE DO ═══════════════════ */}
      <section className="relative z-10 px-6 md:px-12 py-24">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3">What We Do</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
              We are the Conversion Engine.
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <p className="text-base md:text-lg text-[#555] leading-relaxed mb-10">
              The layer between traffic and bookings. Full stop. You have an ad team. You have a dialling team. You don't have a conversion team. <strong className="text-[#1A1A1A]">We plug in as that team.</strong>
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-3 mb-12">
            {[
              "Full funnel audit — every touchpoint from ad click to inquiry",
              "Traffic segmentation — Google-specific and Meta-specific pages",
              "Page redesigns, rebuilds, and A/B testing",
              "Ad-to-page scent-trail alignment",
              "Pre-framing content for Meta traffic",
              "A/B testing + heatmapping + session recording",
              "60-90 day visual roadmap",
              "Monthly reporting tied to revenue, not activity",
            ].map((item, i) => (
              <Reveal key={i} delay={i * 50}>
                <div className="flex items-start gap-3 p-4 bg-white border border-[#E8E8E8] rounded-xl hover:border-[#1B1B1B] transition-colors">
                  <div className="size-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="size-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                  </div>
                  <p className="text-sm text-[#444]">{item}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={500}>
            <div className="p-6 bg-[#1B1B1B] text-white rounded-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-3">What We Don't Do</p>
              <p className="text-base leading-relaxed">
                We don't manage ads. We don't touch your CRM. We don't staff your phones. <span className="text-white/70">Those already work.</span> We make sure every pound your ad team spends converts at the highest possible rate.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ PRICING OPTIONS ═══════════════════ */}
      <section className="relative z-10 bg-white border-y border-[#E8E8E8] px-6 md:px-12 py-24">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#AAA] mb-3">Two Ways Forward</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">Pick your starting line.</h2>
            <p className="text-base text-[#777] max-w-2xl mb-12">
              Option A is the full Conversion Engine — ongoing, compounding, team-led. Option B is a pilot so you can see the work before committing.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ── Retainer ── */}
            <Reveal delay={100}>
              <div className="relative p-8 bg-[#1B1B1B] text-white rounded-3xl h-full flex flex-col overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:from-blue-500/30 group-hover:to-emerald-500/30 transition-all duration-700" />
                <div className="relative">
                  <div className="inline-block px-2.5 py-1 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest rounded-full mb-4">Recommended</div>
                  <h3 className="text-xl font-semibold mb-2">Conversion Engine</h3>
                  <p className="text-white/60 text-sm mb-6">Full retainer. Team-led. Compounding.</p>
                  <div className="mb-6">
                    <p className="text-5xl font-bold">£20,000<span className="text-lg font-normal text-white/50">/mo</span></p>
                  </div>
                  <div className="space-y-2.5 mb-8">
                    {[
                      "Full team: strategist, designer, dev, QA, PM",
                      "60-90 day visual roadmap",
                      "Unlimited page builds within roadmap",
                      "A/B testing software (Intelligems/equivalent)",
                      "Heatmaps + session recording",
                      "Weekly Slack updates + monthly strategy call",
                      "Custom reporting dashboard",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-white/80">
                        <div className="size-1 rounded-full bg-emerald-400 mt-2 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative mt-auto">
                  <a
                    href="https://wa.me/447XXXXXXXXX?text=Hi%20Dylan%2C%20ready%20to%20move%20forward%20with%20the%20Conversion%20Engine%20retainer."
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-[#1B1B1B] text-sm font-bold rounded-xl hover:bg-emerald-50 transition-colors"
                  >
                    Start the Engine
                    <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                  </a>
                </div>
              </div>
            </Reveal>

            {/* ── Pilot ── */}
            <Reveal delay={200}>
              <div className="relative p-8 bg-white border border-[#E8E8E8] rounded-3xl h-full flex flex-col hover:border-[#1B1B1B] transition-colors">
                <h3 className="text-xl font-semibold mb-2 text-[#1A1A1A]">Phase 1 Pilot</h3>
                <p className="text-[#777] text-sm mb-6">One-off. 30 days. No commitment.</p>
                <div className="mb-6">
                  <p className="text-5xl font-bold text-[#1A1A1A]">£6,500</p>
                </div>
                <div className="space-y-2.5 mb-8">
                  {[
                    "Full conversion audit",
                    "Prioritised 30-day roadmap",
                    "Rebuild of your 2 highest-leverage pages",
                    "Pre-framing content strategy for Meta",
                    "Tracking audit + fixes",
                    "Handover report with next steps",
                    "Upgrade path into retainer if it lands",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-[#555]">
                      <div className="size-1 rounded-full bg-[#1A1A1A] mt-2 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto">
                  <a
                    href="https://wa.me/447XXXXXXXXX?text=Hi%20Dylan%2C%20keen%20to%20start%20with%20the%20pilot."
                    className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-[#1B1B1B] text-[#1B1B1B] text-sm font-bold rounded-xl hover:bg-[#1B1B1B] hover:text-white transition-colors"
                  >
                    Start the Pilot
                    <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════ WHY IT WORKS ═══════════════════ */}
      <section className="relative z-10 px-6 md:px-12 py-24">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">Why It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-12 leading-tight">Four things that make us different.</h2>
          </Reveal>

          <div className="space-y-6">
            {[
              {
                title: "We own the roadmap — not your team.",
                body: "You're already running a practice. You don't need another agency asking 'what do you want built next week?' We own prioritisation. You approve direction. We execute.",
              },
              {
                title: "We obsess over the layer nobody else owns.",
                body: "Your ad team cares about CPC. Your dialling team cares about pickup. Nobody cares about the 30 seconds between the click and the form. That's our entire job.",
              },
              {
                title: "Custom code, not templates.",
                body: "No Replo, no page builders, no app bloat. Every page we ship is custom, performant, and lives natively in your existing Framer / Payload / Shopify setup.",
              },
              {
                title: "Results that compound.",
                body: "Month 1 rebuilds. Month 2 iterates on Month 1's data. Month 3 iterates on Month 2. By Month 6 the system is learning in ways a one-off project never could.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="flex gap-5 p-6 bg-white border border-[#E8E8E8] rounded-2xl hover:border-[#1B1B1B] transition-colors">
                  <div className="text-3xl font-bold text-[#E8E8E8] shrink-0">0{i + 1}</div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1A1A1A] mb-1.5">{item.title}</h3>
                    <p className="text-sm text-[#777] leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ TIMELINE ═══════════════════ */}
      <section className="relative z-10 bg-white border-y border-[#E8E8E8] px-6 md:px-12 py-24">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3">Timeline</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-12 leading-tight">How the first 90 days play out.</h2>
          </Reveal>

          <div className="space-y-4">
            {[
              { week: "Week 1", title: "Deep conversion audit", body: "Every funnel stage, every page, every traffic source. Access requested, tracking reviewed, data pulled." },
              { week: "Week 2", title: "60-90 day roadmap", body: "Full visual roadmap delivered. Priorities locked. Quick wins identified and already shipping." },
              { week: "Weeks 3–4", title: "First builds go live", body: "Segmented landing pages (Google + Meta specific). Scent trails aligned. Tracking verified." },
              { week: "Month 2", title: "A/B testing programme", body: "Intelligems live. Pre-framing content in market. First round of data flowing back." },
              { week: "Month 3", title: "Compounding mode", body: "Roadmap iterating on real data. Monthly report shows revenue impact. Next 90 days planned." },
            ].map((phase, i) => (
              <Reveal key={phase.week} delay={i * 80}>
                <div className="flex gap-6 group">
                  <div className="shrink-0 w-24">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#AAA]">{phase.week}</p>
                  </div>
                  <div className="flex-1 pb-4 border-b border-[#F0F0F0] group-last:border-0">
                    <h4 className="text-base font-semibold text-[#1A1A1A] mb-1">{phase.title}</h4>
                    <p className="text-sm text-[#777]">{phase.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="relative z-10 px-6 md:px-12 py-32">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-4xl md:text-6xl font-bold leading-[0.95] mb-6">
              Ready to own the layer <br />
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent animate-gradient-x">nobody else does?</span>
            </h2>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-lg text-[#777] max-w-xl mx-auto mb-10">
              WhatsApp us with your pick. We'll have a payment link back to you in the hour and a kickoff call booked inside 24 hours.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://wa.me/447XXXXXXXXX?text=Hi%20Dylan%2C%20let's%20do%20this."
                className="px-8 py-4 bg-[#1B1B1B] text-white text-sm font-bold rounded-xl hover:bg-[#2D2D2D] transition-colors w-full sm:w-auto"
              >
                Message Us on WhatsApp
              </a>
              <a
                href="mailto:hello@ecomlanders.com?subject=Proposal — Smile at the Occidental Suite"
                className="px-8 py-4 border-2 border-[#1B1B1B] text-[#1B1B1B] text-sm font-bold rounded-xl hover:bg-[#1B1B1B] hover:text-white transition-colors w-full sm:w-auto"
              >
                Email Instead
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="relative z-10 border-t border-[#E8E8E8] px-6 md:px-12 py-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/el-logo.svg" alt="Ecom Landers" className="w-5 h-5 opacity-60" />
            <span className="text-xs text-[#999]">Ecom Landers</span>
          </div>
          <p className="text-[10px] text-[#CCC]">Prepared for Smile at the Occidental Suite · April 2026</p>
        </div>
      </footer>
    </div>
  );
}
