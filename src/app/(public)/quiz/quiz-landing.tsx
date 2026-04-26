"use client";

// Quiz landing page — hook + start CTA. Visually mirrors the audit page
// (white hero, dark footer, lime accent) so traffic from the same paid
// channels sees a coherent product, not a different brand.

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { clearAnswers } from "@/lib/quiz/storage";

export default function QuizLanding() {
  // Force dark bg on body to match the audit page chrome (avoids white strip
  // below the dark footer).
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

  // Track view + capture UTM/ref param. Same payload shape as /audit so the
  // funnel-events table aggregates cleanly across both surfaces.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("utm_source") || "direct";
    fetch("/api/leads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        funnel: "quiz",
        event_type: "view",
        source: ref,
        referrer: document.referrer || "",
      }),
    }).catch(() => {});
  }, []);

  // Reset any stale in-progress answers so a returning visitor starts clean
  // when they hit the landing page (vs deep-linking to /quiz/3).
  useEffect(() => {
    clearAnswers();
  }, []);

  return (
    <div className="min-h-screen bg-[#1B1B1B] flex flex-col">
      {/* Nav */}
      <nav className="w-full border-b border-[#F0F0F0] bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-center">
          <Logo height={18} className="text-[#1B1B1B]" />
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center bg-white">
        <div className="w-full max-w-4xl mx-auto px-6 md:px-10 pt-12 md:pt-20 pb-20 text-center">
          {/* Badges */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="flex items-center gap-1.5 text-sm text-[#666]">
              <svg className="w-3.5 h-3.5 text-[#1B1B1B]" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
              </svg>
              60-Second Quiz
            </span>
            <span className="text-[#DDD]">&middot;</span>
            <span className="flex items-center gap-1.5 text-sm text-[#666]">
              <svg className="w-3.5 h-3.5 text-[#1B1B1B]" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
              </svg>
              Personalised Diagnosis
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-3xl md:text-[3.5rem] font-bold text-[#1B1B1B] leading-[1.08] tracking-tight mb-8 uppercase"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Find Out Where Your <span className="bg-[#D1FF4C] px-2 py-0.5 rounded">Funnel</span> Is Leaking — In 60 Seconds
          </h1>

          {/* Subtext */}
          <p
            className="text-[15px] md:text-lg text-[#666] leading-[1.7] max-w-2xl mx-auto mb-10"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Six questions about your store. We&apos;ll diagnose your top 3 conversion priorities — based on your traffic source, vertical, and biggest pain — and tell you exactly where to start.
          </p>

          {/* CTA */}
          <Link
            href="/quiz/1"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Start the quiz
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>

          <p className="text-sm text-[#999] mt-5" style={{ fontFamily: "var(--font-body)" }}>
            No fluff. No newsletter trap. Personalised in real time.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="relative w-full"
        style={{ backgroundColor: "#1B1B1B" }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between">
          <p
            className="text-sm md:text-base font-medium text-white tracking-tight"
            style={{ fontFamily: "var(--font-body)" }}
          >
            The Funnel Architects Behind <em className="font-medium">Shopify&apos;s Fastest-Growing Brands.</em>
          </p>
          <div className="flex items-center shrink-0">
            <img src="/shopify-select-partner.svg" alt="Shopify Select Partner" className="h-10 w-auto" />
          </div>
        </div>
      </footer>
    </div>
  );
}
