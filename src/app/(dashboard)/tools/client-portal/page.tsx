"use client";

import { useState } from "react";
import {
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  LockClosedIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { DEMO_PORTALS, type PortalData } from "@/lib/portal-types";

/* ── Shared classes ── */
const inputClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors placeholder:text-[#CCCCCC]";
const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2";

function phaseStatusDot(status: string) {
  switch (status) {
    case "complete":
      return <span className="size-2 rounded-full bg-[#0A0A0A] inline-block" />;
    case "in-progress":
      return <span className="size-2 rounded-full bg-amber-500 inline-block animate-pulse" />;
    default:
      return <span className="size-2 rounded-full bg-[#E5E5E5] inline-block" />;
  }
}

export default function ClientPortalPage() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  function copyLink(token: string) {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function openPreview(token: string) {
    window.open(`/portal/${token}`, "_blank");
  }

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Client Portal
          </h1>
          <p className="text-[#6B6B6B]">
            Manage client-facing project portals — share status, timelines, and
            documents
          </p>
        </div>

        {/* Active Portals */}
        <div className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-4">
            Active Portals
          </h2>
          <div className="space-y-4">
            {DEMO_PORTALS.map((portal) => (
              <PortalCard
                key={portal.token}
                portal={portal}
                copiedToken={copiedToken}
                onCopyLink={copyLink}
                onPreview={openPreview}
              />
            ))}
          </div>
        </div>

        {/* Create Portal (disabled/placeholder) */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-4">
            Create New Portal
          </h2>
          <div className="relative bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-6 overflow-hidden">
            {/* Disabled overlay */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <div className="text-center">
                <LockClosedIcon className="size-5 text-[#AAAAAA] mx-auto mb-2" />
                <p className="text-sm font-medium text-[#6B6B6B]">
                  Connect ClickUp to create live portals
                </p>
                <p className="text-xs text-[#AAAAAA] mt-1">
                  Coming soon — add your ClickUp API token to enable
                </p>
              </div>
            </div>

            {/* Form preview (behind overlay) */}
            <div className="space-y-5 opacity-60 pointer-events-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Client Name</label>
                  <input
                    type="text"
                    placeholder="Client name..."
                    className={inputClass}
                    disabled
                  />
                </div>
                <div>
                  <label className={labelClass}>Project Type</label>
                  <input
                    type="text"
                    placeholder="Full Page Build"
                    className={inputClass}
                    disabled
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>ClickUp List ID</label>
                <input
                  type="text"
                  placeholder="Paste ClickUp list ID..."
                  className={inputClass}
                  disabled
                />
              </div>
              <div>
                <label className={labelClass}>Visible Sections</label>
                <div className="flex flex-wrap gap-3">
                  {["Overview", "Timeline", "Deliverables", "Documents"].map(
                    (s) => (
                      <label
                        key={s}
                        className="flex items-center gap-2 text-sm text-[#6B6B6B]"
                      >
                        <input type="checkbox" checked disabled className="rounded" />
                        {s}
                      </label>
                    )
                  )}
                </div>
              </div>
              <button
                disabled
                className="px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md opacity-40 cursor-not-allowed"
              >
                Create Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Portal Card ── */

function PortalCard({
  portal,
  copiedToken,
  onCopyLink,
  onPreview,
}: {
  portal: PortalData;
  copiedToken: string | null;
  onCopyLink: (token: string) => void;
  onPreview: (token: string) => void;
}) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold">{portal.clientName}</h3>
            <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#F0F0F0] text-[#6B6B6B] rounded">
              Demo
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mb-3">{portal.projectType}</p>

          {/* Phase + progress */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {phaseStatusDot(
                portal.phases.find((p) => p.name === portal.currentPhase)
                  ?.status || "upcoming"
              )}
              <span className="text-xs font-medium">{portal.currentPhase}</span>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0A0A0A] rounded-full"
                  style={{ width: `${portal.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-[#AAAAAA] tabular-nums">
                {portal.progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Right: stats + actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-[#AAAAAA] mr-2">
            <EyeIcon className="size-3" />
            <span className="tabular-nums">{portal.viewCount}</span>
          </div>

          <button
            onClick={() => onCopyLink(portal.token)}
            className="p-2 rounded-md hover:bg-[#F0F0F0] transition-colors text-[#6B6B6B] hover:text-[#0A0A0A]"
            title="Copy portal link"
          >
            <ClipboardDocumentIcon className="size-4" />
          </button>

          <button
            onClick={() => onPreview(portal.token)}
            className="p-2 rounded-md hover:bg-[#F0F0F0] transition-colors text-[#6B6B6B] hover:text-[#0A0A0A]"
            title="Open portal preview"
          >
            <ArrowTopRightOnSquareIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Copied toast inline */}
      {copiedToken === portal.token && (
        <div className="mt-3 text-xs text-[#6B6B6B] bg-[#F5F5F5] px-3 py-1.5 rounded">
          Link copied to clipboard
        </div>
      )}

      {/* Documents summary */}
      {portal.documents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#F0F0F0]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-2">
            Documents ({portal.documents.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {portal.documents.map((doc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded"
              >
                <span className="text-xs">{doc.type === "Roadmap" ? "📅" : doc.type === "Scope" ? "📋" : doc.type === "Agreement" ? "📝" : doc.type === "QA Checklist" ? "✅" : "📄"}</span>
                {doc.type}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
