"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";

export default function ReferralPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [store, setStore] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    // TODO: save to Supabase + notify
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full py-16">
        {/* Logo */}
        <div className="mb-12 text-center">
          <Logo height={20} />
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="size-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="size-8 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A] mb-2">Thanks, {name.split(" ")[0]}!</h1>
            <p className="text-sm text-[#777] leading-relaxed">
              We&apos;ll be in touch shortly to discuss how we can help grow your store.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A] mb-2">
                You&apos;ve been referred
              </h1>
              <p className="text-sm text-[#777] leading-relaxed">
                Someone who trusts our work thought we could help you too.
                We build high-converting Shopify pages and run CRO programmes
                for DTC brands.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1.5">Your Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#999]"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1.5">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#999]"
                  placeholder="you@brand.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1.5">Store URL (optional)</label>
                <input
                  type="url"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#999]"
                  placeholder="https://yourstore.com"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
              >
                Get in Touch
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[#F0F0F0] flex items-center justify-center gap-6">
              <a href="https://wa.me/447000000000" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#777] hover:text-[#1A1A1A] transition-colors">
                WhatsApp
              </a>
              <a href="https://cal.com/ecomlanders" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#777] hover:text-[#1A1A1A] transition-colors">
                Book a Call
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
