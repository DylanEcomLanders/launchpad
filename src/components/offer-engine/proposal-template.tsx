"use client";

import { useEffect, useRef, useState } from "react";
import type { ProposalContent } from "@/lib/offer-engine/types";

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

export function ProposalTemplate({ content }: { content: ProposalContent }) {
  const { brandName, date, validDays, heroEyebrow, heroTitle, heroSubtitle, opportunity, plugIn, pricing, principles, timeline, signoff } = content;

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      {/* HEADER */}
      <header className="border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/el-logo.svg" alt="Ecomlanders" className="w-5 h-5 block" />
            <span className="text-xs font-semibold text-[#1A1A1A] tracking-wide leading-none">
              Ecomlanders <span className="text-[#BBB] mx-1">×</span> {brandName}
            </span>
          </div>
          {date && <p className="text-[10px] text-[#AAA] uppercase tracking-widest">{date}</p>}
        </div>
      </header>

      {/* HERO */}
      <section className="px-6 md:px-12 pt-20 md:pt-24 pb-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-6">{heroEyebrow}</p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1] mb-6 text-[#1A1A1A]">{heroTitle}</h1>
          </Reveal>
          <Reveal delay={250}>
            <p className="text-base md:text-lg text-[#555] leading-relaxed max-w-2xl">{heroSubtitle}</p>
          </Reveal>
          <Reveal delay={400}>
            <div className="flex items-center gap-3 mt-10 text-[11px] text-[#AAA]">
              <span>Prepared for {brandName}</span>
              <span className="size-1 rounded-full bg-[#DDD]" />
              <span>Valid for {validDays} days</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 01 OPPORTUNITY */}
      <section className="px-6 md:px-12 py-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">{opportunity.eyebrow}</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight text-[#1A1A1A]">
              <span className="text-[#AAA]">{opportunity.titleLead}</span> {opportunity.titleMain}
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-base text-[#555] leading-relaxed mb-10 max-w-2xl">{opportunity.body}</p>
          </Reveal>
          {opportunity.stats.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              {opportunity.stats.map((stat, i) => (
                <Reveal key={`${stat.label}-${i}`} delay={150 + i * 80} className="h-full">
                  <div className="p-5 border border-[#E8E8E8] rounded-xl h-full flex flex-col">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-[#AAA] mb-2">{stat.label}</p>
                    <p className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</p>
                    {stat.sub && <p className="text-[11px] text-[#999] mt-1">{stat.sub}</p>}
                  </div>
                </Reveal>
              ))}
            </div>
          )}
          <Reveal delay={400}>
            <div className="p-6 border-l-2 border-[#1A1A1A] bg-[#FAFAFA] rounded-r-xl">
              <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">{opportunity.leak.title}</p>
              {opportunity.leak.paragraphs.map((p, i) => (
                <p key={i} className={`text-sm text-[#555] leading-relaxed ${i < opportunity.leak.paragraphs.length - 1 ? "mb-3" : ""}`}>{p}</p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 02 PLUG IN */}
      <section className="px-6 md:px-12 py-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">{plugIn.eyebrow}</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight text-[#1A1A1A]">
              <span className="text-[#AAA]">{plugIn.titleLead}</span> {plugIn.titleMain}
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-base text-[#555] leading-relaxed mb-10 max-w-2xl">{plugIn.body}</p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-3 mb-10">
            {plugIn.items.map((item, i) => (
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
            <p className="text-sm text-[#777] italic max-w-2xl">{plugIn.closingLine}</p>
          </Reveal>
        </div>
      </section>

      {/* 03 PRICING */}
      <section className="px-6 md:px-12 py-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">{pricing.eyebrow}</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight text-[#1A1A1A]">{pricing.title}</h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-base text-[#555] leading-relaxed mb-10 max-w-2xl">{pricing.body}</p>
          </Reveal>
          {pricing.options.map((opt, i) => (
            <Reveal key={i} delay={150 + i * 100}>
              {opt.dark ? (
                <div className="mb-6 p-8 md:p-10 bg-[#1A1A1A] text-white rounded-2xl">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
                    <div className="md:w-1/2">
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">{opt.label}</p>
                        {opt.badge && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-300 text-[#1A1A1A] text-[9px] font-bold uppercase tracking-wider rounded-full">
                            <svg className="size-2.5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{opt.title}</h3>
                      <p className="text-sm text-white/70 leading-relaxed">{opt.description}</p>
                    </div>
                    <div className="md:w-1/2 md:border-l md:border-white/10 md:pl-8">
                      <p className="text-4xl md:text-5xl font-bold mb-1">
                        {opt.price}
                        {opt.priceSuffix && <span className="text-base font-normal text-white/50">{opt.priceSuffix}</span>}
                      </p>
                      <p className="text-xs text-white/50 mb-5">{opt.priceTerms}</p>
                      <div className="space-y-2">
                        {opt.inclusions.map((item) => (
                          <div key={item} className="flex items-start gap-2 text-xs text-white/80">
                            <div className="size-1 rounded-full bg-white/40 mt-1.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-8 border border-[#E8E8E8] rounded-2xl">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="md:w-1/2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-3">{opt.label}</p>
                      <h3 className="text-xl font-bold mb-3 text-[#1A1A1A]">{opt.title}</h3>
                      <p className="text-sm text-[#555] leading-relaxed">{opt.description}</p>
                    </div>
                    <div className="md:w-1/2 md:border-l md:border-[#E8E8E8] md:pl-8">
                      <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-1">
                        {opt.price}
                        {opt.priceSuffix && <span className="text-base font-normal text-[#999]">{opt.priceSuffix}</span>}
                      </p>
                      <p className="text-xs text-[#999] mb-5">{opt.priceTerms}</p>
                      <div className="space-y-2">
                        {opt.inclusions.map((item) => (
                          <div key={item} className="flex items-start gap-2 text-xs text-[#555]">
                            <div className="size-1 rounded-full bg-[#1A1A1A] mt-1.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {/* 04 PRINCIPLES */}
      <section className="px-6 md:px-12 py-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">{principles.eyebrow}</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-10 leading-tight text-[#1A1A1A]">{principles.title}</h2>
          </Reveal>
          <div className="space-y-0">
            {principles.items.map((item, i) => (
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

      {/* 05 TIMELINE */}
      <section className="px-6 md:px-12 py-20 border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">{timeline.eyebrow}</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-10 leading-tight text-[#1A1A1A]">{timeline.title}</h2>
          </Reveal>
          <div className="space-y-0">
            {timeline.phases.map((phase, i) => (
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
          {timeline.footnote && (
            <Reveal delay={400}>
              <p className="text-xs text-[#999] mt-10 italic">{timeline.footnote}</p>
            </Reveal>
          )}
        </div>
      </section>

      {/* 06 SIGN-OFF */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">{signoff.eyebrow}</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-tight text-[#1A1A1A]">{signoff.title}</h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="p-6 border border-[#E8E8E8] rounded-xl mb-10">
              <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Quote Summary</p>
              <div className="space-y-2 text-sm">
                {signoff.quoteLines.map((line, i) => (
                  <div key={line.label} className={`flex justify-between py-2 ${i < signoff.quoteLines.length - 1 ? "border-b border-[#F0F0F0]" : ""}`}>
                    <span className="text-[#555]">{line.label}</span>
                    <span className="font-semibold text-[#1A1A1A]">{line.amount}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#999] mt-4">{signoff.quoteFootnote}</p>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {signoff.signatories.map((s) => (
                <div key={s.name}>
                  <p className="text-sm text-[#1A1A1A] font-semibold mb-1">{s.name}</p>
                  <p className="text-xs text-[#999]">{s.role}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={300}>
            <p className="text-sm text-[#555] leading-relaxed">{signoff.closing}</p>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#E8E8E8] px-6 md:px-12 py-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/el-logo.svg" alt="Ecomlanders" className="w-4 h-4 opacity-60" />
            <span className="text-[11px] text-[#999]">Ecomlanders</span>
          </div>
          {date && <p className="text-[10px] text-[#CCC]">Prepared for {brandName}, {date}</p>}
        </div>
      </footer>
    </div>
  );
}
