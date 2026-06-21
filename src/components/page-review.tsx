"use client";

import { useState, useCallback } from "react";
import {
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  MapPinIcon,
  CheckCircleIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { inputClass, textareaClass, labelClass } from "@/lib/form-styles";
import type {
  DesignReview,
  DesignReviewVersion,
  DesignReviewFeedback,
} from "@/lib/portal/review-types";
import {
  addFeedback,
  updateFeedbackResolved,
  updateReviewStatus,
  getNextPinNumber,
} from "@/lib/portal/reviews";

/* ── Types ── */

interface PageReviewViewerProps {
  review: DesignReview;
  versions: DesignReviewVersion[];
  feedback: DesignReviewFeedback[];
  isAdmin: boolean;
  submittedBy: string;
  onDataChange: () => void; // reload data after mutations
}

type ViewportMode = "desktop" | "mobile";

/* ── Main Component ── */

export function PageReviewViewer({
  review,
  versions,
  feedback,
  isAdmin,
  submittedBy,
  onDataChange,
}: PageReviewViewerProps) {
  const [activeVersionId, setActiveVersionId] = useState(
    versions[versions.length - 1]?.id || ""
  );
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [pinMode, setPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [newComment, setNewComment] = useState("");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const stagingUrl = activeVersion?.staging_url || "";

  // Feedback for active version only
  const versionFeedback = feedback.filter((f) => f.version_id === activeVersionId);
  const pins = versionFeedback.filter((f) => f.pin_x != null && f.pin_y != null);
  const openPins = pins.filter((p) => !p.resolved);
  const resolvedPins = pins.filter((p) => p.resolved);

  /* ── Pin placement ── */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!pinMode) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPendingPin({ x, y });
      setNewComment("");
      setSelectedPinId(null);
    },
    [pinMode]
  );

  const handleSubmitPin = async () => {
    if (!pendingPin || !newComment.trim() || !activeVersionId) return;
    const pinNumber = await getNextPinNumber(activeVersionId);
    await addFeedback({
      version_id: activeVersionId,
      review_id: review.id,
      action: "comment",
      comment: newComment.trim(),
      submitted_by: submittedBy,
      pin_x: Math.round(pendingPin.x * 10) / 10,
      pin_y: Math.round(pendingPin.y * 10) / 10,
      pin_number: pinNumber,
      resolved: false,
    });
    setPendingPin(null);
    setNewComment("");
    setPinMode(false);
    onDataChange();
  };

  const handleResolve = async (feedbackId: string, resolved: boolean) => {
    await updateFeedbackResolved(feedbackId, resolved);
    onDataChange();
  };

  /* ── Approval flow ── */
  const handleApproval = async (action: "approved" | "changes_requested") => {
    await addFeedback({
      version_id: activeVersionId,
      review_id: review.id,
      action,
      comment: approvalComment.trim(),
      submitted_by: submittedBy,
    });
    await updateReviewStatus(review.id, action === "approved" ? "approved" : "changes_requested");
    setApprovalComment("");
    setShowApprovalForm(false);
    onDataChange();
  };

  return (
    <div className="space-y-4">
      {/* Version tabs (if multiple) */}
      {versions.length > 1 && (
        <div className="flex items-center gap-1.5">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setActiveVersionId(v.id);
                setPendingPin(null);
                setSelectedPinId(null);
              }}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
                activeVersionId === v.id
                  ? "bg-[#E5E5EA] text-[#0C0C0C]"
                  : "bg-[#222222] text-[#71757D] hover:bg-[#2A2A2A]"
              }`}
            >
              v{v.version_number}
              {v.id === versions[versions.length - 1]?.id && (
                <span className="ml-1 text-[9px] opacity-60">Current</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Top toolbar */}
      <div className="flex items-center justify-between bg-[#181818] border border-[#2A2A2A] rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Viewport toggle */}
          <div className="flex bg-[#222222] rounded-md p-0.5">
            <button
              onClick={() => setViewportMode("desktop")}
              className={`p-1.5 rounded transition-colors ${
                viewportMode === "desktop" ? "bg-[#181818] shadow-sm text-[#E5E5EA]" : "text-[#71757D]"
              }`}
            >
              <ComputerDesktopIcon className="size-4" />
            </button>
            <button
              onClick={() => setViewportMode("mobile")}
              className={`p-1.5 rounded transition-colors ${
                viewportMode === "mobile" ? "bg-[#181818] shadow-sm text-[#E5E5EA]" : "text-[#71757D]"
              }`}
            >
              <DevicePhoneMobileIcon className="size-4" />
            </button>
          </div>

          {/* Pin mode toggle */}
          <button
            onClick={() => {
              setPinMode(!pinMode);
              setPendingPin(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md border transition-colors ${
              pinMode
                ? "bg-[#222222] text-[#E5E5EA] border-[#383838]"
                : "text-[#71757D] border-[#2A2A2A] hover:bg-[#222222]"
            }`}
          >
            <MapPinIcon className="size-3.5" />
            {pinMode ? "Pinning..." : "Drop Pin"}
          </button>

          {/* Pin count */}
          {pins.length > 0 && (
            <span className="text-[10px] text-[#9CA3AF]">
              {openPins.length} open{resolvedPins.length > 0 && `, ${resolvedPins.length} resolved`}
            </span>
          )}
        </div>

        {/* Approval buttons */}
        {review.status !== "approved" && (
          <div className="flex items-center gap-2">
            {!showApprovalForm ? (
              <>
                <button
                  onClick={() => setShowApprovalForm(true)}
                  className="px-3 py-1.5 text-[11px] font-medium text-emerald-400 border border-emerald-600/30 rounded-md hover:bg-emerald-600/10 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => setShowApprovalForm(true)}
                  className="px-3 py-1.5 text-[11px] font-medium text-amber-400 border border-amber-600/30 rounded-md hover:bg-amber-600/10 transition-colors"
                >
                  Request Amends
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Comment (optional)..."
                  className="px-2 py-1 text-xs border border-[#2A2A2A] rounded w-48"
                />
                <button
                  onClick={() => handleApproval("approved")}
                  className="px-2.5 py-1.5 text-[10px] font-medium bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleApproval("changes_requested")}
                  className="px-2.5 py-1.5 text-[10px] font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600"
                >
                  Amends
                </button>
                <button
                  onClick={() => setShowApprovalForm(false)}
                  className="p-1 text-[#9CA3AF] hover:text-[#E5E5EA]"
                  aria-label="Close approval form"
                >
                  <XMarkIcon className="size-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {review.status === "approved" && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCircleIcon className="size-4" />
            Approved
          </span>
        )}
      </div>

      {/* Status badge */}
      {review.status === "changes_requested" && (
        <div className="px-3 py-2 bg-amber-600/15 border border-amber-600/30 rounded-lg text-xs text-amber-400 font-medium">
          Changes requested — review the pin feedback below
        </div>
      )}

      {/* Iframe with pin overlay */}
      {stagingUrl ? (
        <div
          className={`relative border border-[#2A2A2A] rounded-lg overflow-hidden bg-[#181818] ${
            viewportMode === "mobile" ? "max-w-[375px] mx-auto" : ""
          }`}
        >
          {/* Open in new tab bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0C0C0C] border-b border-[#2A2A2A]">
            <p className="text-[10px] text-[#9CA3AF] truncate max-w-[60%]">{stagingUrl}</p>
            <a
              href={stagingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium text-[#2563EB] hover:underline"
            >
              Open in new tab
            </a>
          </div>

          {!iframeError ? (
            <>
              <iframe
                src={stagingUrl}
                className="w-full border-0"
                style={{ height: viewportMode === "desktop" ? "70vh" : "667px" }}
                onError={() => setIframeError(true)}
              />
              {/* Pin overlay */}
              <div
                className={`absolute inset-0 ${
                  pinMode ? "cursor-crosshair" : "pointer-events-none"
                }`}
                onClick={handleOverlayClick}
              >
                {/* Existing pins */}
                {pins.map((pin) => (
                  <PinMarker
                    key={pin.id}
                    pin={pin}
                    isSelected={selectedPinId === pin.id}
                    onClick={() => setSelectedPinId(selectedPinId === pin.id ? null : pin.id)}
                  />
                ))}
                {/* Pending pin */}
                {pendingPin && (
                  <div
                    className="absolute z-20"
                    style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
                  >
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 size-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-lg animate-pulse">
                      +
                    </div>
                    {/* Comment input popover */}
                    <div
                      className="absolute top-4 left-2 bg-[#181818] border border-[#2A2A2A] rounded-lg shadow-lg p-3 w-64 z-30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Describe the issue..."
                        className="w-full px-2 py-1.5 text-xs border border-[#2A2A2A] rounded resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          onClick={() => setPendingPin(null)}
                          className="px-2 py-1 text-[10px] text-[#71757D] hover:text-[#E5E5EA]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSubmitPin}
                          disabled={!newComment.trim()}
                          className="px-3 py-1 text-[10px] font-medium bg-[#222222] text-[#E5E5EA] rounded disabled:opacity-30"
                        >
                          Add Pin
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm text-[#71757D] mb-2">Unable to load preview</p>
              <p className="text-xs text-[#9CA3AF] mb-3">The staging site may block iframe embedding</p>
              <a
                href={stagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#E5E5EA] border border-[#2A2A2A] rounded-lg hover:bg-[#222222]"
              >
                Open in new tab
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-[#2A2A2A] rounded-lg p-8 text-center">
          <p className="text-sm text-[#71757D]">No staging URL set</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Add a staging URL to preview the page</p>
        </div>
      )}

      {/* Pin list panel */}
      {pins.length > 0 && (
        <div className="border border-[#2A2A2A] rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-[#0C0C0C] border-b border-[#2A2A2A]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Feedback Pins ({openPins.length} open{resolvedPins.length > 0 && `, ${resolvedPins.length} resolved`})
            </p>
          </div>
          <div className="divide-y divide-[#2A2A2A] max-h-64 overflow-y-auto">
            {pins
              .sort((a, b) => (a.pin_number || 0) - (b.pin_number || 0))
              .map((pin) => (
                <div
                  key={pin.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-[#0C0C0C] cursor-pointer transition-colors ${
                    selectedPinId === pin.id ? "bg-[#222222]" : ""
                  }`}
                  onClick={() => setSelectedPinId(selectedPinId === pin.id ? null : pin.id)}
                >
                  <span
                    className={`flex-shrink-0 size-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      pin.resolved
                        ? "bg-[#2A2A2A] text-[#9CA3AF] line-through"
                        : "bg-white text-[#0C0C0C]"
                    }`}
                  >
                    {pin.pin_number || "?"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${pin.resolved ? "text-[#9CA3AF] line-through" : "text-[#E5E5EA]"}`}>
                      {pin.comment}
                    </p>
                    <p className="text-[10px] text-[#C7C9CD] mt-0.5">
                      {pin.submitted_by} · {new Date(pin.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResolve(pin.id, !pin.resolved);
                    }}
                    className={`flex-shrink-0 p-1 rounded transition-colors ${
                      pin.resolved
                        ? "text-emerald-500 hover:text-emerald-600"
                        : "text-[#C7C9CD] hover:text-emerald-500"
                    }`}
                    title={pin.resolved ? "Unresolve" : "Resolve"}
                  >
                    <CheckCircleIcon className="size-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pin Marker ── */

function PinMarker({
  pin,
  isSelected,
  onClick,
}: {
  pin: DesignReviewFeedback;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="absolute z-10 pointer-events-auto"
      style={{ left: `${pin.pin_x}%`, top: `${pin.pin_y}%` }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div
        className={`
          -translate-x-1/2 -translate-y-1/2 size-6 rounded-full flex items-center justify-center
          text-[10px] font-bold border-2 border-white shadow-md cursor-pointer transition-transform
          ${isSelected ? "scale-125" : "hover:scale-110"}
          ${pin.resolved
            ? "bg-[#2A2A2A] text-[#9CA3AF]"
            : "bg-white text-[#0C0C0C]"
          }
        `}
      >
        {pin.pin_number || "?"}
      </div>
      {/* Comment tooltip on select */}
      {isSelected && (
        <div className="absolute top-5 left-2 bg-[#181818] border border-[#2A2A2A] rounded-lg shadow-lg p-3 w-56 z-30">
          <p className="text-xs text-[#E5E5EA] mb-1">{pin.comment}</p>
          <p className="text-[10px] text-[#C7C9CD]">
            {pin.submitted_by} · {new Date(pin.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
          {pin.resolved && (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-medium text-emerald-600">
              <CheckIcon className="size-3" /> Resolved
            </span>
          )}
        </div>
      )}
    </div>
  );
}
