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

  // Capture UTM/ref param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("utm_source") || "direct";
    setSource(ref);
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

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center animate-fadeInUp">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1B1B1B] mb-3">You&apos;re in.</h1>
          <p className="text-[#7A7A7A] leading-relaxed">
            We&apos;ll review your product page and send over a detailed audit within 48 hours. Keep an eye on your inbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Nav */}
      <nav className="border-b border-[#E5E5EA] bg-white">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1B1B1B] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">E</span>
            </div>
            <span className="font-semibold text-[#1B1B1B] text-sm">Ecom Landers</span>
          </div>
          <a
            href="https://ecomlanders.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            ecomlanders.com
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 md:px-10">
        <div className="py-16 md:py-24">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-full mb-8">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-[#7A7A7A]">Free for Shopify brands</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-[#1B1B1B] leading-[1.1] tracking-tight mb-5">
              Your product page is
              <br />
              <span className="text-[#7A7A7A]">leaking revenue.</span>
            </h1>

            <p className="text-lg text-[#7A7A7A] leading-relaxed mb-4 max-w-xl">
              Most Shopify stores lose 20-40% of potential sales to friction, weak copy, and missing trust signals. We&apos;ll show you exactly where.
            </p>
            <p className="text-base text-[#999] leading-relaxed mb-10 max-w-xl">
              Get a personalised CRO audit of your product page — scoring layout, copy, social proof, CTAs, and mobile experience. No fluff, just actionable fixes ranked by impact.
            </p>
          </div>

          {/* Form card */}
          <div className="max-w-lg">
            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h2 className="text-lg font-bold text-[#1B1B1B] mb-1">Get your free audit</h2>
              <p className="text-sm text-[#7A7A7A] mb-6">Takes 2 minutes. Delivered to your inbox within 48 hours.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1B1B1B] mb-1.5">Your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dylan Evans"
                    className="w-full px-4 py-3 bg-[#F7F8FA] border border-[#E5E5EA] rounded-xl text-sm text-[#1B1B1B] outline-none placeholder:text-[#CCC] focus:border-[#1B1B1B] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1B1B1B] mb-1.5">
                    Email address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dylan@brand.com"
                    className="w-full px-4 py-3 bg-[#F7F8FA] border border-[#E5E5EA] rounded-xl text-sm text-[#1B1B1B] outline-none placeholder:text-[#CCC] focus:border-[#1B1B1B] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1B1B1B] mb-1.5">
                    Product page URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="yourstore.com/products/best-seller"
                    className="w-full px-4 py-3 bg-[#F7F8FA] border border-[#E5E5EA] rounded-xl text-sm text-[#1B1B1B] outline-none placeholder:text-[#CCC] focus:border-[#1B1B1B] transition-colors"
                  />
                  <p className="text-[11px] text-[#AAA] mt-1.5">Paste the URL of the page you want us to audit</p>
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !storeUrl.trim()}
                  className="w-full py-3.5 bg-[#1B1B1B] text-white text-sm font-semibold rounded-xl hover:bg-[#2D2D2D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Submitting..." : "Get my free audit"}
                </button>

                <p className="text-[11px] text-[#CCC] text-center">
                  No spam, no sales pitch. Just a straight-up audit of your page.
                </p>
              </form>
            </div>
          </div>

          {/* Social proof / what you get */}
          <div className="mt-16 max-w-2xl">
            <h3 className="text-sm font-bold text-[#1B1B1B] uppercase tracking-wider mb-6">What you&apos;ll get</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Page Scorecard", desc: "Your page scored across 6 key areas with a clear overall rating" },
                { title: "Issue Breakdown", desc: "Every friction point identified, ranked by revenue impact" },
                { title: "Priority Fixes", desc: "Exactly what to change first for the biggest uplift in CVR" },
              ].map((item) => (
                <div key={item.title} className="bg-white border border-[#E5E5EA] rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-[#1B1B1B] mb-1.5">{item.title}</h4>
                  <p className="text-xs text-[#7A7A7A] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Credentials */}
          <div className="mt-12 pb-16">
            <div className="flex items-center gap-6 text-xs text-[#AAA]">
              <span>100+ pages audited</span>
              <span className="w-1 h-1 bg-[#DDD] rounded-full" />
              <span>6-8 figure Shopify brands</span>
              <span className="w-1 h-1 bg-[#DDD] rounded-full" />
              <span>Avg. 23% CVR uplift</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
