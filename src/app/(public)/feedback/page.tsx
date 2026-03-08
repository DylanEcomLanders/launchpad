"use client";

import { useState } from "react";
import { StarIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { Logo } from "@/components/logo";
import { submitFeedback } from "@/lib/feedback/data";

/* ── Star Rating ─────────────────────────────────────────────── */

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div>
      <p className="text-sm font-medium text-[#0A0A0A] mb-2">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hover || value);
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              {filled ? (
                <StarIcon className="size-7 text-[#0A0A0A]" />
              ) : (
                <StarOutline className="size-7 text-[#CCCCCC]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Form ────────────────────────────────────────────────────── */

export default function FeedbackPage() {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [testimonial, setTestimonial] = useState("");
  const [improvements, setImprovements] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit =
    clientName.trim() && rating > 0 && quality > 0 && communication > 0 && wouldRecommend !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitFeedback({
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || undefined,
        rating,
        quality,
        communication,
        would_recommend: wouldRecommend!,
        testimonial: testimonial.trim(),
        improvements: improvements.trim(),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-6 md:px-12 py-5">
          <Logo height={16} className="text-[#0A0A0A]" />
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <CheckCircleIcon className="size-12 text-[#0A0A0A] mx-auto mb-4" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Thank you!
            </h1>
            <p className="text-sm text-[#6B6B6B]">
              Your feedback has been submitted. We really appreciate you taking the time — it helps us improve.
            </p>
          </div>
        </div>
        <footer className="border-t border-[#F0F0F0] px-6 md:px-12 py-6 text-center">
          <p className="text-xs text-[#AAAAAA]">
            Built by{" "}
            <a href="https://ecomlanders.com" target="_blank" rel="noopener noreferrer"
              className="font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
              Ecomlanders
            </a>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-6 md:px-12 py-5">
        <Logo height={16} className="text-[#0A0A0A]" />
      </header>

      <div className="flex-1 px-6 md:px-12 pb-12 max-w-xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
            Project Feedback
          </h1>
          <p className="text-sm text-[#6B6B6B]">
            We&apos;d love to hear how your experience was working with us.
          </p>
        </div>

        <div className="space-y-8">
          {/* Client Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
                Your Name / Company *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., John from Acme Co"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/10 focus:border-[#0A0A0A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
                Email <span className="text-[#AAAAAA] font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="john@acme.com"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/10 focus:border-[#0A0A0A] transition-colors"
              />
            </div>
          </div>

          {/* Ratings */}
          <div className="space-y-6">
            <StarRating label="Overall Experience *" value={rating} onChange={setRating} />
            <StarRating label="Quality of Work *" value={quality} onChange={setQuality} />
            <StarRating label="Communication *" value={communication} onChange={setCommunication} />
          </div>

          {/* Would Recommend */}
          <div>
            <p className="text-sm font-medium text-[#0A0A0A] mb-3">
              Would you recommend us to others? *
            </p>
            <div className="flex gap-3">
              {[
                { value: true, label: "Yes, definitely" },
                { value: false, label: "Not right now" },
              ].map(({ value, label }) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setWouldRecommend(value)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                    wouldRecommend === value
                      ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                      : "border-[#E5E5E5] text-[#6B6B6B] hover:border-[#CCCCCC]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
              Testimonial
              <span className="text-[#AAAAAA] font-normal ml-1">
                — a quote we could share publicly?
              </span>
            </label>
            <textarea
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              rows={3}
              placeholder="e.g., Ecomlanders completely transformed our landing pages..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/10 focus:border-[#0A0A0A] transition-colors resize-none"
            />
          </div>

          {/* Improvements */}
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
              Anything we could improve?
              <span className="text-[#AAAAAA] font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={3}
              placeholder="Honest feedback helps us get better..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/10 focus:border-[#0A0A0A] transition-colors resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full px-4 py-3 text-sm font-medium bg-[#0A0A0A] text-white rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>

      <footer className="border-t border-[#F0F0F0] px-6 md:px-12 py-6 text-center">
        <p className="text-xs text-[#AAAAAA]">
          Built by{" "}
          <a href="https://ecomlanders.com" target="_blank" rel="noopener noreferrer"
            className="font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
            Ecomlanders
          </a>
        </p>
      </footer>
    </div>
  );
}
