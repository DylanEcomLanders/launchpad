"use client";

import { useState, useEffect } from "react";
import { Logo } from "@/components/logo";

export default function AuditLandingPage() {
  const [email, setEmail] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("direct");

  // Force dark bg on body/main to prevent white strip below footer
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

  // Capture UTM/ref param on mount + fire view event
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("utm_source") || "direct";
    setSource(ref);

    // Track page view
    fetch("/api/leads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        funnel: "audit",
        event_type: "view",
        source: ref,
        referrer: document.referrer || "",
      }),
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !storeUrl.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          store_url: storeUrl.trim(),
          name: name.trim(),
          funnel: "audit",
          source,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      // Track submission event
      fetch("/api/leads/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel: "audit",
          event_type: "submission",
          source,
          referrer: document.referrer || "",
        }),
      }).catch(() => {});

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Portfolio images for the scrolling strip
  // Drop screenshots into /public/audit-portfolio/ as 1.png, 2.png, etc.
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/audit-portfolio")
      .then((r) => r.json())
      .then((data) => setPortfolioImages(data.images || []))
      .catch(() => setPortfolioImages([]));
  }, []);

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6" style={{ background: "white" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#D1FF4C]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#1B1B1B]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#1B1B1B] tracking-tight mb-3">You&apos;re in.</h1>
          <p className="text-[#666] leading-relaxed text-lg">
            We&apos;ll review your product page and send over a detailed 8-point audit within 48 hours. Keep an eye on your inbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1B1B1B] flex flex-col">
      {/* ── Nav ── */}
      <nav className="w-full border-b border-[#F0F0F0] bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-center">
          <Logo height={18} className="text-[#1B1B1B]" />
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="flex-1 flex flex-col items-center bg-white">
        <div className="w-full max-w-5xl mx-auto px-6 md:px-10 pt-12 md:pt-20 pb-12 text-center">
          {/* Badges */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="flex items-center gap-1.5 text-sm text-[#666]">
              <svg className="w-3.5 h-3.5 text-[#1B1B1B]" viewBox="0 0 20 20" fill="currentColor"><path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" /></svg>
              30 Second Form
            </span>
            <span className="text-[#DDD]">&middot;</span>
            <span className="flex items-center gap-1.5 text-sm text-[#666]">
              <svg className="w-3.5 h-3.5 text-[#1B1B1B]" viewBox="0 0 20 20" fill="currentColor"><path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" /></svg>
              48 Hour Delivery
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-[3.5rem] font-bold text-[#1B1B1B] leading-[1.08] tracking-tight mb-8 uppercase" style={{ fontFamily: "var(--font-heading)" }}>
            Claim Your <span className="bg-[#D1FF4C] px-2 py-0.5 rounded">Free</span> 8-Point Shopify Product Page Audit
          </h1>

          {/* Subtext */}
          <p className="text-[15px] md:text-lg text-[#666] leading-[1.7] max-w-3xl mx-auto mb-10" style={{ fontFamily: "var(--font-body)" }}>
            We&apos;ve built and delivered over <strong className="text-[#1B1B1B]">3,500+ product pages</strong> to some of the fastest growing DTC ecom brands in the world. Now we&apos;re giving away the same auditing framework - completely free - so you can find exactly what&apos;s stopping you from reaching &pound;100k+ / month.
          </p>

          {/* ── Form ── */}
          <form id="form" onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5" style={{ fontFamily: "var(--font-body)" }}>
            <div>
              <label className="block text-sm font-medium text-[#1B1B1B] mb-2">What&apos;s your name?</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded-lg text-sm text-[#1B1B1B] outline-none placeholder:text-[#CCC] focus:border-[#1B1B1B] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B1B1B] mb-2">Where should we send your audit?</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded-lg text-sm text-[#1B1B1B] outline-none placeholder:text-[#CCC] focus:border-[#1B1B1B] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B1B1B] mb-2">Which page should we audit?</label>
              <input
                type="text"
                required
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="Enter your brand URL"
                className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded-lg text-sm text-[#1B1B1B] outline-none placeholder:text-[#CCC] focus:border-[#1B1B1B] transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !storeUrl.trim()}
              className="w-full py-3.5 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? "Submitting..." : (
                <>
                  Get My Free Audit
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Social proof counter */}
            <p className="text-sm text-center pt-2">
              <strong className="text-[#1B1B1B]">456+ audits</strong>{" "}
              <span className="text-[#999]">delivered as of </span>
              <strong className="text-[#1B1B1B]">{new Date().toLocaleDateString("en-GB", { month: "long", day: "numeric" })}</strong>
            </p>
          </form>
        </div>

        {/* ── Portfolio Strip ── */}
        <div className="relative z-10 w-full overflow-hidden pt-8 pb-0">
          <div className="flex gap-4 animate-scroll">
            {portfolioImages.length > 0
              ? [...portfolioImages, ...portfolioImages].map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt=""
                    className="shrink-0 w-[160px] h-[472px] object-cover rounded-xl border border-[#EBEBEB]"
                  />
                ))
              : Array.from({ length: 20 }, (_, idx) => (
                  <div
                    key={idx}
                    className="shrink-0 w-[160px] h-[472px] bg-[#F5F5F5] rounded-xl border border-[#EBEBEB]"
                  />
                ))}
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <footer className="relative w-full -mt-[160px]" style={{ backgroundColor: "#1B1B1B", boxShadow: "0 100px 0 0 #1B1B1B, 0 200px 0 0 #1B1B1B" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-[180px] pb-6 flex items-center justify-between">
          <p className="text-sm md:text-base font-medium text-white tracking-tight" style={{ fontFamily: "var(--font-body)" }}>
            The Funnel Architects Behind <em className="font-medium">Shopify&apos;s Fastest-Growing Brands.</em>
          </p>
          <div className="flex items-center shrink-0">
            <img src="/shopify-select-partner.svg" alt="Shopify Select Partner" className="h-10 w-auto" />
          </div>
        </div>
      </footer>

      {/* Scroll animation */}
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
