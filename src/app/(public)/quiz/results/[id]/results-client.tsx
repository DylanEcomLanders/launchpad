"use client";

import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { ResultCard } from "@/components/quiz/result-card";
import type { QuizSubmission } from "@/lib/quiz/types";

export default function ResultsClient({ submission }: { submission: QuizSubmission }) {
  // Match audit-page chrome — white hero, dark footer
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
      <nav className="w-full border-b border-[#F0F0F0] bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-center">
          <Logo height={18} className="text-[#1B1B1B]" />
        </div>
      </nav>

      <div className="flex-1 bg-white">
        <div className="px-6 md:px-10 pt-12 md:pt-16 pb-20">
          <ResultCard submission={submission} />
        </div>
      </div>

      <footer className="w-full" style={{ backgroundColor: "#1B1B1B" }}>
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
