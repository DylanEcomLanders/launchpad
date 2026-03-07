"use client";

import { useState } from "react";
import {
  ClipboardDocumentIcon,
  EyeIcon,
  LockClosedIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { DEMO_PORTALS, type PortalData, type PortalDocument } from "@/lib/portal-types";
import { inputClass, labelClass } from "@/lib/form-styles";

const typeLabels: Record<string, string> = {
  Roadmap: "RDM",
  Scope: "SCP",
  Agreement: "AGR",
  "QA Checklist": "QA",
  Other: "DOC",
};

function getEndDate(portal: PortalData): string {
  const last = portal.phases[portal.phases.length - 1];
  if (!last) return "";
  const parts = last.dates.split(" – ");
  return parts[parts.length - 1];
}

export default function ClientPortalPage() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<PortalDocument | null>(null);

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
                onDocClick={setSelectedDoc}
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
                  {["Overview", "Timeline", "Scope", "Results"].map(
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

      {/* Document preview modal */}
      {selectedDoc && (
        <DocumentPreview doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}

/* ── Portal Card ── */

function PortalCard({
  portal,
  copiedToken,
  onCopyLink,
  onPreview,
  onDocClick,
}: {
  portal: PortalData;
  copiedToken: string | null;
  onCopyLink: (token: string) => void;
  onPreview: (token: string) => void;
  onDocClick: (doc: PortalDocument) => void;
}) {
  const startDate = portal.phases[0]?.dates;
  const endDate = getEndDate(portal);

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
      {/* Top row: info + actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold">{portal.clientName}</h3>
            <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#F0F0F0] text-[#6B6B6B] rounded">
              Demo
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mb-1">{portal.projectType}</p>
          <p className="text-[11px] text-[#AAAAAA]">
            Start: {startDate} · End: {endDate}
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs text-[#AAAAAA]">
          <EyeIcon className="size-3" />
          <span className="tabular-nums">{portal.viewCount}</span>
        </div>
      </div>

      {/* Phase progress track */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`size-2 rounded-full inline-block ${
            portal.phases.find((p) => p.name === portal.currentPhase)?.status === "in-progress"
              ? "bg-[#0A0A0A] animate-pulse"
              : "bg-[#0A0A0A]"
          }`} />
          <span className="text-xs font-medium">{portal.currentPhase}</span>
        </div>
        <div className="flex gap-1 flex-1">
          {portal.phases.map((phase) => (
            <div
              key={phase.name}
              className={`h-1 rounded-full flex-1 ${
                phase.status === "complete"
                  ? "bg-emerald-400"
                  : phase.status === "in-progress"
                  ? "bg-[#0A0A0A]"
                  : "bg-[#E5E5E5]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Documents + Actions */}
      <div className="mt-4 pt-4 border-t border-[#F0F0F0] flex items-center justify-between gap-4">
        {/* Clickable document badges */}
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {portal.documents.map((doc, i) => (
            <button
              key={i}
              onClick={() => onDocClick(doc)}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] bg-[#FAFAFA] border border-[#E5E5E5] rounded hover:border-[#0A0A0A] hover:bg-white transition-colors"
            >
              <span className="font-semibold text-[#6B6B6B]">{typeLabels[doc.type] || "DOC"}</span>
              <span className="text-[#AAAAAA]">{doc.type}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onCopyLink(portal.token)}
            className="p-2 rounded-md hover:bg-[#F0F0F0] transition-colors text-[#6B6B6B] hover:text-[#0A0A0A]"
            title="Copy portal link"
          >
            <ClipboardDocumentIcon className="size-4" />
          </button>

          <button
            onClick={() => onPreview(portal.token)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0A0A0A] text-white text-xs font-medium rounded-md hover:bg-[#2A2A2A] transition-colors"
          >
            Open Portal
            <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Copied toast inline */}
      {copiedToken === portal.token && (
        <div className="mt-3 text-xs text-[#6B6B6B] bg-[#F5F5F5] px-3 py-1.5 rounded">
          Link copied to clipboard
        </div>
      )}
    </div>
  );
}

/* ── Document Preview Modal ── */

function DocumentPreview({
  doc,
  onClose,
}: {
  doc: PortalDocument;
  onClose: () => void;
}) {
  const [toast, setToast] = useState("");

  function handleDownload() {
    setToast("Download coming soon — documents will be linked when your portal goes live");
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#F0F0F0]">
          <div className="flex items-start gap-4">
            <div className="shrink-0 size-12 rounded-lg bg-[#0A0A0A] text-white flex items-center justify-center text-[11px] font-bold tracking-wider">
              {typeLabels[doc.type] || "DOC"}
            </div>
            <div>
              <h3 className="text-base font-bold mb-1">{doc.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#AAAAAA] uppercase tracking-wider font-medium">
                  {doc.type}
                </span>
                <span className="text-[#E5E5E5]">&middot;</span>
                <span className="text-xs text-[#AAAAAA]">{doc.date}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#F5F5F5] transition-colors text-[#AAAAAA] hover:text-[#0A0A0A]"
          >
            <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Document preview placeholder */}
        <div className="p-6">
          <div className="border border-[#E5E5E5] rounded-lg bg-[#FAFAFA] p-8 mb-6">
            <div className="space-y-4">
              <div className="h-3 bg-[#E5E5E5] rounded w-2/3" />
              <div className="space-y-2">
                <div className="h-2 bg-[#EBEBEB] rounded w-full" />
                <div className="h-2 bg-[#EBEBEB] rounded w-5/6" />
                <div className="h-2 bg-[#EBEBEB] rounded w-4/6" />
              </div>
              <div className="h-px bg-[#E5E5E5]" />
              <div className="space-y-2">
                <div className="h-2 bg-[#EBEBEB] rounded w-full" />
                <div className="h-2 bg-[#EBEBEB] rounded w-3/4" />
                <div className="h-2 bg-[#EBEBEB] rounded w-5/6" />
                <div className="h-2 bg-[#EBEBEB] rounded w-2/3" />
              </div>
              <div className="h-px bg-[#E5E5E5]" />
              <div className="space-y-2">
                <div className="h-2 bg-[#EBEBEB] rounded w-full" />
                <div className="h-2 bg-[#EBEBEB] rounded w-4/5" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 text-sm font-medium text-[#6B6B6B] border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-5 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-full shadow-xl whitespace-nowrap animate-fadeIn">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
