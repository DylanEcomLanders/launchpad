"use client";

import { useState, useEffect } from "react";

export default function AuditLandingPage() {
  const [email, setEmail] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("direct");

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
  const portfolioImages = Array.from({ length: 10 }, (_, i) => i);

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Nav ── */}
      <nav className="w-full border-b border-[#F0F0F0]">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#1B1B1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-[#1B1B1B] text-lg tracking-tight">ecomlanders</span>
          </div>
          <a
            href="#form"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1B1B1B] border border-[#E5E5E5] rounded-lg hover:bg-[#F9F9F9] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            FREE Shopify Audit
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-2xl mx-auto px-6 md:px-10 pt-12 md:pt-20 pb-12 text-center">
          {/* Badges */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="flex items-center gap-1.5 text-sm text-[#666]">
              <span className="text-amber-500">&#9889;</span> 30 Second Form
            </span>
            <span className="text-[#DDD]">&middot;</span>
            <span className="flex items-center gap-1.5 text-sm text-[#666]">
              <span className="text-amber-500">&#9889;</span> 48 Hour Delivery
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-[3.2rem] font-bold text-[#1B1B1B] leading-[1.1] tracking-tight mb-6 uppercase">
            Claim Your <span className="bg-[#D1FF4C] px-2 py-0.5 rounded">Free</span> 8-Point
            <br className="hidden md:block" />{" "}Shopify Product Page Audit
          </h1>

          {/* Subtext */}
          <p className="text-base text-[#666] leading-relaxed max-w-xl mx-auto mb-10">
            We&apos;ve built and delivered over <strong className="text-[#1B1B1B]">3,500+ product pages</strong> to some of the fastest growing DTC ecom brands in the world. Now we&apos;re giving away the same auditing framework - completely free - so you can find exactly what&apos;s stopping you from reaching &pound;100k+ / month.
          </p>

          {/* ── Form ── */}
          <form id="form" onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5">
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
              <span className="text-[#999]">delivered as of {new Date().toLocaleDateString("en-GB", { month: "long", day: "numeric" })}</span>
            </p>
          </form>
        </div>

        {/* ── Portfolio Strip ── */}
        <div className="w-full overflow-hidden py-8">
          <div className="flex gap-4 animate-scroll">
            {[...portfolioImages, ...portfolioImages].map((i, idx) => (
              <div
                key={idx}
                className="shrink-0 w-[160px] h-[240px] bg-[#F5F5F5] rounded-xl border border-[#EBEBEB]"
              />
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="w-full border-t border-[#F0F0F0]">
          <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-lg md:text-xl font-semibold text-[#1B1B1B] tracking-tight">
              The Funnel Architects Behind <em className="not-italic font-semibold">Shopify&apos;s Fastest-Growing Brands.</em>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-[#95BF47] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <div className="text-[10px] leading-tight font-semibold text-[#1B1B1B] uppercase tracking-wider">
                Shopify<br />Select<br />Partner
              </div>
            </div>
          </div>
        </div>

        {/* ── Big Brand Text ── */}
        <div className="w-full bg-[#1B1B1B] py-6 overflow-hidden">
          <p className="text-[8rem] md:text-[12rem] font-bold text-white leading-none tracking-tighter text-center whitespace-nowrap select-none" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
            ecomlanders
          </p>
        </div>
      </div>

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
