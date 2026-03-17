"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  TrashIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { getSubmissions, deleteSubmission } from "@/lib/feedback/data";
import type { FeedbackSubmission } from "@/lib/feedback/types";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) =>
        s <= count ? (
          <StarSolid key={s} className="size-3.5 text-[#1B1B1B]" />
        ) : (
          <StarIcon key={s} className="size-3.5 text-[#E5E5EA]" />
        )
      )}
    </div>
  );
}

export default function FeedbackDashboard() {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getSubmissions();
    setSubmissions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    await deleteSubmission(id);
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/feedback`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Averages
  const avg = (fn: (s: FeedbackSubmission) => number) =>
    submissions.length > 0
      ? (submissions.reduce((sum, s) => sum + fn(s), 0) / submissions.length).toFixed(1)
      : "—";

  const avgRecommend =
    submissions.length > 0
      ? (submissions.reduce((sum, s) => sum + s.recommend_score, 0) / submissions.length).toFixed(1)
      : "—";

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Feedback
          </h1>
          <p className="text-[#7A7A7A]">
            Post-project reviews from clients.
          </p>
        </div>

        {/* Share Link */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] transition-colors"
          >
            {copied ? (
              <>
                <CheckIcon className="size-4" />
                Copied to clipboard!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="size-4" />
                Copy Feedback Link
              </>
            )}
          </button>
          <a
            href="/feedback"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-[#E5E5EA] rounded-lg text-[#1B1B1B] hover:bg-[#F3F3F5] transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="size-4" />
            Preview Form
          </a>
        </div>

        {/* Stats */}
        {submissions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-[#E5E5EA] rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Responses
              </p>
              <p className="text-xl font-bold text-[#1B1B1B]">{submissions.length}</p>
            </div>
            <div className="bg-white border border-[#E5E5EA] rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Avg Rating
              </p>
              <p className="text-xl font-bold text-[#1B1B1B]">{avg((s) => s.rating)}/5</p>
            </div>
            <div className="bg-white border border-[#E5E5EA] rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Avg Quality
              </p>
              <p className="text-xl font-bold text-[#1B1B1B]">{avg((s) => s.quality)}/5</p>
            </div>
            <div className="bg-white border border-[#E5E5EA] rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Avg Recommend
              </p>
              <p className="text-xl font-bold text-[#1B1B1B]">{avgRecommend}/10</p>
            </div>
          </div>
        )}

        {/* Submissions */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
            Submissions
            {submissions.length > 0 && (
              <span className="ml-2 text-[10px] font-bold bg-[#EDEDEF] text-[#7A7A7A] px-1.5 py-0.5 rounded">
                {submissions.length}
              </span>
            )}
          </h2>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-[#E5E5EA] rounded-lg p-5 animate-pulse">
                  <div className="h-4 bg-[#EDEDEF] rounded w-1/3 mb-3" />
                  <div className="h-3 bg-[#EDEDEF] rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {!loading && submissions.length === 0 && (
            <div className="bg-white border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
              <p className="text-xs text-[#A0A0A0]">No feedback yet — share the link with a client</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white border border-[#E5E5EA] rounded-lg p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1B1B1B]">
                        {sub.client_name}
                      </h3>
                      <p className="text-xs text-[#A0A0A0]">
                        {sub.client_email && <span>{sub.client_email} · </span>}
                        {new Date(sub.submitted_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-1.5 text-[#A0A0A0] hover:text-red-400 transition-colors"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>

                  {/* Ratings row */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-0.5">Overall</p>
                      <Stars count={sub.rating} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-0.5">Quality</p>
                      <Stars count={sub.quality} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-0.5">Communication</p>
                      <Stars count={sub.communication} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-0.5">Recommend</p>
                      <p className={`text-xs font-semibold ${sub.recommend_score >= 8 ? "text-[#15803D]" : sub.recommend_score >= 5 ? "text-[#1B1B1B]" : "text-[#DC2626]"}`}>
                        {sub.recommend_score}/10
                      </p>
                    </div>
                  </div>

                  {/* Testimonial */}
                  {sub.testimonial && (
                    <div className="mb-2">
                      <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-1">Testimonial</p>
                      <p className="text-sm text-[#1B1B1B] italic">
                        &ldquo;{sub.testimonial}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Improvements */}
                  {sub.improvements && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-1">Improvements</p>
                      <p className="text-xs text-[#7A7A7A]">{sub.improvements}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
