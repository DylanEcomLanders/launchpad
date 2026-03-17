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
      <p className="text-sm font-medium text-[#1B1B1B] mb-2">{label}</p>
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
                <StarIcon className="size-7 text-[#1B1B1B]" />
              ) : (
                <StarOutline className="size-7 text-[#C5C5C5]" />
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
  const [recommendScore, setRecommendScore] = useState(0);
  const [testimonial, setTestimonial] = useState("");
  const [improvements, setImprovements] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit =
    clientName.trim() && rating > 0 && quality > 0 && communication > 0 && recommendScore > 0;

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
        recommend_score: recommendScore,
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
          <Logo height={16} className="text-[#1B1B1B]" />
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <CheckCircleIcon className="size-12 text-[#1B1B1B] mx-auto mb-4" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Thank you!
            </h1>
            <p className="text-sm text-[#7A7A7A]">
              Your feedback has been submitted. We really appreciate you taking the time — it helps us improve.
            </p>
          </div>
        </div>
        <footer className="border-t border-[#EDEDEF] px-6 md:px-12 py-6 text-center">
          <p className="text-xs text-[#A0A0A0]">
            Built by{" "}
            <a href="https://ecomlanders.com" target="_blank" rel="noopener noreferrer"
              className="font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors">
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
        <Logo height={16} className="text-[#1B1B1B]" />
      </header>

      <div className="flex-1 px-6 md:px-12 pb-12 max-w-xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
            Project Feedback
          </h1>
          <p className="text-sm text-[#7A7A7A]">
            We&apos;d love to hear how your experience was working with us.
          </p>
        </div>

        <div className="space-y-8">
          {/* Client Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1B1B1B] mb-1.5">
                Your Name / Company *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., John from Acme Co"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B1B1B]/10 focus:border-[#1B1B1B] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B1B] mb-1.5">
                Email <span className="text-[#A0A0A0] font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="john@acme.com"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B1B1B]/10 focus:border-[#1B1B1B] transition-colors"
              />
            </div>
          </div>

          {/* Ratings */}
          <div className="space-y-6">
            <StarRating label="Overall Experience *" value={rating} onChange={setRating} />
            <StarRating label="Quality of Work *" value={quality} onChange={setQuality} />
            <StarRating label="Communication *" value={communication} onChange={setCommunication} />
          </div>

          {/* Recommend Score */}
          <div>
            <p className="text-sm font-medium text-[#1B1B1B] mb-1">
              How likely are you to recommend us? *
            </p>
            <p className="text-xs text-[#A0A0A0] mb-3">1 = not likely, 10 = extremely likely</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRecommendScore(n)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                    recommendScore === n
                      ? "border-[#1B1B1B] bg-[#1B1B1B] text-white"
                      : "border-[#E5E5EA] text-[#7A7A7A] hover:border-[#C5C5C5]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div>
            <label className="block text-sm font-medium text-[#1B1B1B] mb-1.5">
              Testimonial
              <span className="text-[#A0A0A0] font-normal ml-1">
                — a quote we could share publicly?
              </span>
            </label>
            <textarea
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              rows={3}
              placeholder="e.g., Ecomlanders completely transformed our landing pages..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B1B1B]/10 focus:border-[#1B1B1B] transition-colors resize-none"
            />
          </div>

          {/* Improvements */}
          <div>
            <label className="block text-sm font-medium text-[#1B1B1B] mb-1.5">
              Anything we could improve?
              <span className="text-[#A0A0A0] font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={3}
              placeholder="Honest feedback helps us get better..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B1B1B]/10 focus:border-[#1B1B1B] transition-colors resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full px-4 py-3 text-sm font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>

      <footer className="border-t border-[#EDEDEF] px-6 md:px-12 py-6 text-center">
        <p className="text-xs text-[#A0A0A0]">
          Built by{" "}
          <a href="https://ecomlanders.com" target="_blank" rel="noopener noreferrer"
            className="font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors">
            Ecomlanders
          </a>
        </p>
      </footer>
    </div>
  );
}
