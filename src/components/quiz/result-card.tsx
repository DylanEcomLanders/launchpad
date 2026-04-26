"use client";

import { buildHeadline } from "@/lib/quiz/headline";
import { getPriorities } from "@/lib/quiz/priority-matrix";
import {
  PAIN_LABELS,
  REVENUE_LABELS,
  TRAFFIC_LABELS,
  VERTICAL_LABELS,
} from "@/lib/quiz/questions";
import { normaliseStoreUrl } from "@/lib/quiz/validation";
import type { QuizSubmission } from "@/lib/quiz/types";

const CALENDLY_URL = "https://calendly.com/ecomlanders/audit-call";

function whatsappLink(submission: QuizSubmission): string | null {
  // Build a wa.me link with the team's number if configured. Falls back to
  // the env var if set; otherwise we hide the WhatsApp CTA on the result page.
  const teamNumber = process.env.NEXT_PUBLIC_TEAM_WHATSAPP_NUMBER || "";
  if (!teamNumber) return null;
  const cleanNumber = teamNumber.replace(/[^0-9]/g, "");
  const store = normaliseStoreUrl(submission.storeUrl);
  const text = encodeURIComponent(
    `Hi — I just took the Ecom Landers conversion quiz for ${store} and wanted to chat about the priorities you flagged.`,
  );
  return `https://wa.me/${cleanNumber}?text=${text}`;
}

export function ResultCard({ submission }: { submission: QuizSubmission }) {
  const headline = buildHeadline(submission.vertical, submission.painPoint);
  const priorities = getPriorities(
    submission.trafficSource,
    submission.painPoint,
    submission.vertical,
  );
  const tier = submission.leadTier;
  const wa = whatsappLink(submission);

  // Tier-specific copy + CTA stack
  const ctaCopy = {
    A: "Want us to walk you through the fix?",
    B: "Want us to walk you through this?",
    C: "Free resources to get started on your own.",
  }[tier];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <p
        className="text-[11px] font-semibold uppercase tracking-wider text-[#999] mb-3"
        style={{ fontFamily: "var(--font-body)" }}
      >
        Your results, {submission.firstName}
      </p>
      <h1
        className="text-[2rem] md:text-[2.75rem] font-bold text-[#1B1B1B] leading-[1.1] tracking-tight"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {headline}
      </h1>

      {/* Context line */}
      <p
        className="mt-4 text-sm text-[#666]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {VERTICAL_LABELS[submission.vertical]} &middot; {REVENUE_LABELS[submission.revenue]} &middot;{" "}
        {TRAFFIC_LABELS[submission.trafficSource]}
      </p>

      {/* Priorities */}
      <div className="mt-10">
        <p
          className="text-[11px] font-semibold uppercase tracking-wider text-[#999] mb-4"
          style={{ fontFamily: "var(--font-body)" }}
        >
          The 3 priorities for {normaliseStoreUrl(submission.storeUrl) || "your store"}
        </p>
        <ol className="space-y-3" style={{ fontFamily: "var(--font-body)" }}>
          {priorities.map((p) => (
            <li
              key={p.rank}
              className="flex gap-4 items-start p-5 bg-white border border-[#E5E5E5] rounded-lg"
            >
              <span
                className="shrink-0 size-8 rounded-full bg-[#D1FF4C] text-[#1B1B1B] font-bold text-sm flex items-center justify-center tabular-nums"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {p.rank}
              </span>
              <p className="text-[15px] text-[#1B1B1B] leading-snug pt-0.5">{p.label}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Pain-point reflection */}
      <p
        className="mt-8 text-sm text-[#666] leading-relaxed"
        style={{ fontFamily: "var(--font-body)" }}
      >
        Based on what you told us — <em>{PAIN_LABELS[submission.painPoint].toLowerCase()}</em> —
        these are the levers most likely to move the needle on your funnel right now.
      </p>

      {/* CTAs */}
      <div className="mt-10 p-6 md:p-7 bg-[#FAFAFA] border border-[#EEE] rounded-lg" style={{ fontFamily: "var(--font-body)" }}>
        <p className="text-base font-semibold text-[#1B1B1B] mb-1" style={{ fontFamily: "var(--font-heading)" }}>
          {ctaCopy}
        </p>

        {tier === "A" && (
          <>
            <p className="text-sm text-[#666] mb-5">
              We&apos;ll review your store before the call and come with a starting point — not a discovery questionnaire.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors text-center"
              >
                Book a 20-min call →
              </a>
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 bg-white border border-[#1B1B1B] text-[#1B1B1B] text-sm font-semibold rounded-lg hover:bg-[#F5F5F5] transition-colors text-center"
                >
                  Message on WhatsApp
                </a>
              )}
            </div>
          </>
        )}

        {tier === "B" && (
          <>
            <p className="text-sm text-[#666] mb-5">
              No pitch — just a 20-minute walkthrough of where the leak likely is.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors text-center"
              >
                Book a 20-min call →
              </a>
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 bg-white border border-[#1B1B1B] text-[#1B1B1B] text-sm font-semibold rounded-lg hover:bg-[#F5F5F5] transition-colors text-center"
                >
                  Message on WhatsApp
                </a>
              )}
            </div>
          </>
        )}

        {tier === "C" && (
          <>
            <p className="text-sm text-[#666] mb-5">
              You&apos;re early in the journey — start with the playbook we use on every {VERTICAL_LABELS[submission.vertical].toLowerCase()} build.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href="https://ecomlanders.com/playbook"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors text-center"
              >
                Get the free playbook →
              </a>
            </div>
            <p className="text-xs text-[#999] mt-4">
              We&apos;ll also drop you on our newsletter — one practical CRO breakdown a week, no fluff. Unsubscribe whenever.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
