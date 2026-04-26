"use client";

// Final step — contact details. Uses the same input styling as the audit
// page so the flow feels like one product. Submit is gated until first
// name + email + store URL are non-empty and email passes a quick shape
// check; the API does the strict zod validation on the server.

import { useEffect, useState } from "react";
import { QuizProgressBar } from "./progress-bar";

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactFormStepProps {
  step: number;
  total: number;
  loading: boolean;
  error: string;
  onSubmit: (contact: {
    firstName: string;
    email: string;
    storeUrl: string;
    whatsapp?: string;
  }) => void;
  onBack: () => void;
}

export function ContactFormStep({ step, total, loading, error, onSubmit, onBack }: ContactFormStepProps) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const valid =
    firstName.trim().length > 0 &&
    SIMPLE_EMAIL_RE.test(email.trim()) &&
    storeUrl.trim().length >= 3;

  const handleClick = () => {
    if (!valid || loading) return;
    onSubmit({
      firstName: firstName.trim(),
      email: email.trim(),
      storeUrl: storeUrl.trim(),
      whatsapp: whatsapp.trim() || undefined,
    });
  };

  return (
    <div className={`w-full max-w-md mx-auto transition-opacity duration-150 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
      <QuizProgressBar current={step} total={total} />

      <h1
        className="mt-8 text-2xl md:text-[2rem] font-bold text-[#1B1B1B] leading-[1.15] tracking-tight text-center"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Where should we send your results?
      </h1>
      <p
        className="mt-3 text-sm text-[#666] text-center"
        style={{ fontFamily: "var(--font-body)" }}
      >
        We&apos;ll have your personalised page ready in seconds.
      </p>

      <div className="mt-8 space-y-5" style={{ fontFamily: "var(--font-body)" }}>
        <div>
          <label className="block text-sm font-medium text-[#1B1B1B] mb-2">First name</label>
          <input
            type="text"
            autoFocus
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
            className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded-lg text-sm text-[#1B1B1B] outline-none placeholder:text-[#CCC] focus:border-[#1B1B1B] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B1B1B] mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded-lg text-sm text-[#1B1B1B] outline-none placeholder:text-[#CCC] focus:border-[#1B1B1B] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B1B1B] mb-2">Store URL</label>
          <input
            type="text"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="yourstore.com"
            className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded-lg text-sm text-[#1B1B1B] outline-none placeholder:text-[#CCC] focus:border-[#1B1B1B] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B1B1B] mb-2">
            WhatsApp <span className="text-[#999] font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+44 7000 000000"
            className="w-full px-4 py-3 bg-white border border-[#E5E5E5] rounded-lg text-sm text-[#1B1B1B] outline-none placeholder:text-[#CCC] focus:border-[#1B1B1B] transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="button"
          onClick={handleClick}
          disabled={!valid || loading}
          className="w-full py-3.5 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? "Building your results…" : (
            <>
              See my results
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="text-xs font-medium text-[#999] hover:text-[#1B1B1B] transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
