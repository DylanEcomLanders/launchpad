"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";
import { toFigmaEmbed } from "@/lib/portal/review-types";
import type {
  DesignReview,
  DesignReviewVersion,
  DesignReviewFeedback,
  FeedbackAction,
} from "@/lib/portal/review-types";
import {
  CheckIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface Props {
  review: DesignReview;
  versions: DesignReviewVersion[];
  feedback: DesignReviewFeedback[];
  token: string;
  clientName: string;
}

export function ReviewView({
  review,
  versions,
  feedback: initialFeedback,
  token,
  clientName,
}: Props) {
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(
    versions.length > 0 ? versions.length - 1 : 0
  );
  const [feedback, setFeedback] = useState(initialFeedback);
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(review.status);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);

  const currentVersion = versions[selectedVersionIdx];
  const embedUrl = currentVersion ? toFigmaEmbed(currentVersion.figma_url) : null;

  const handleFeedback = async (action: FeedbackAction) => {
    if (!currentVersion || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/portal/review-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reviewId: review.id,
          versionId: currentVersion.id,
          action,
          comment: comment.trim(),
          submittedBy: clientName || "Client",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback((prev) => [...prev, data.feedback]);
        setCurrentStatus(action === "approved" ? "approved" : "changes_requested");
        setComment("");
        setShowChangesForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = {
    pending: { label: "Pending Review", color: "bg-border text-subtle" },
    changes_requested: {
      label: "Changes Requested",
      color: "bg-amber-50 text-amber-700",
    },
    approved: { label: "Approved", color: "bg-emerald-50 text-emerald-700" },
  };

  const status = statusConfig[currentStatus];

  return (
    <div className="min-h-screen bg-surface-raised">
      {/* Header */}
      <header className="bg-white border-b border-foreground">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo height={16} className="text-foreground" />
            <div className="w-px h-5 bg-foreground" />
            <div>
              <h1 className="text-sm font-semibold text-foreground">
                {review.title}
              </h1>
              <p className="text-[11px] text-muted">
                {clientName} &middot; Design Review
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full ${status.color}`}
          >
            {status.label}
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Version selector + description */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {versions.length > 1 ? (
              <div className="relative">
                <button
                  onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-foreground rounded-md hover:border-surface transition-colors"
                >
                  Version {currentVersion?.version_number}
                  <ChevronDownIcon className="size-3 text-muted" />
                </button>
                {showVersionDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-foreground rounded-lg shadow-lg z-20 py-1">
                    {versions.map((v, idx) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setSelectedVersionIdx(idx);
                          setShowVersionDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-raised transition-colors ${
                          idx === selectedVersionIdx
                            ? "font-semibold text-foreground"
                            : "text-subtle"
                        }`}
                      >
                        <span>Version {v.version_number}</span>
                        <span className="text-[10px] text-muted ml-2">
                          {new Date(v.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : versions.length === 1 ? (
              <span className="px-3 py-1.5 text-xs font-medium bg-white border border-foreground rounded-md text-subtle">
                Version 1
              </span>
            ) : null}

            {currentVersion?.notes && (
              <p className="text-xs text-subtle">{currentVersion.notes}</p>
            )}
          </div>

          <p className="text-[11px] text-muted">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Description */}
        {review.description && (
          <p className="text-sm text-subtle mb-4 leading-relaxed">
            {review.description}
          </p>
        )}

        {/* Figma embed */}
        {embedUrl ? (
          <div className="rounded-lg overflow-hidden border border-foreground bg-white shadow-sm mb-6">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
              />
            </div>
          </div>
        ) : versions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-foreground bg-white p-16 text-center mb-6">
            <p className="text-sm text-muted">
              No design versions uploaded yet
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-foreground bg-white p-16 text-center mb-6">
            <p className="text-sm text-muted">
              Unable to load Figma embed
            </p>
          </div>
        )}

        {/* Action bar */}
        {versions.length > 0 && (
          <div className="bg-white border border-foreground rounded-lg p-5 mb-8">
            {showChangesForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Request Changes</h3>
                  <button
                    onClick={() => setShowChangesForm(false)}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe the changes you'd like to see..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-surface-raised border border-foreground rounded-md text-sm focus:outline-none focus:border-surface focus:ring-1 focus:ring-surface/10 transition-colors resize-none placeholder:text-muted"
                  autoFocus
                />
                <button
                  onClick={() => handleFeedback("changes_requested")}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-surface text-white text-xs font-medium rounded-md hover:bg-border transition-colors disabled:opacity-40"
                >
                  <ArrowPathIcon className="size-3.5" />
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-subtle">
                  Review version {currentVersion?.version_number} and share your
                  feedback
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowChangesForm(true)}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-subtle border border-foreground rounded-md hover:border-surface hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    <ArrowPathIcon className="size-3.5" />
                    Request Changes
                  </button>
                  <button
                    onClick={() => handleFeedback("approved")}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-40"
                  >
                    <CheckIcon className="size-3.5" />
                    {submitting ? "Approving..." : "Approve Design"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paper trail */}
        {feedback.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-4">
              Review History
            </h3>
            <div className="space-y-3">
              {feedback.map((entry) => {
                const version = versions.find((v) => v.id === entry.version_id);
                const isApproval = entry.action === "approved";
                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 items-start"
                  >
                    <span
                      className={`mt-0.5 size-6 rounded-full flex items-center justify-center shrink-0 ${
                        isApproval
                          ? "bg-emerald-100"
                          : "bg-amber-100"
                      }`}
                    >
                      {isApproval ? (
                        <CheckIcon className="size-3 text-emerald-600" />
                      ) : (
                        <ArrowPathIcon className="size-3 text-amber-600" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0 bg-white border border-foreground rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-foreground">
                          {entry.submitted_by}{" "}
                          <span className="font-normal text-subtle">
                            {isApproval
                              ? "approved"
                              : "requested changes on"}{" "}
                            v{version?.version_number ?? "?"}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted shrink-0">
                          {new Date(entry.created_at).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                      {entry.comment && (
                        <p className="text-xs text-subtle leading-relaxed">
                          {entry.comment}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-foreground bg-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo height={12} className="text-muted" />
          <p className="text-[10px] text-muted">
            Powered by Ormalanders
          </p>
        </div>
      </footer>
    </div>
  );
}
