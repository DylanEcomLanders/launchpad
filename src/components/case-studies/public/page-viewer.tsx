"use client";

import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { CaseStudyImage } from "@/lib/case-studies/types";

interface Props {
  desktopSlices: CaseStudyImage[];
  mobileSlices: CaseStudyImage[];
  brandName: string;
}

/* Click-to-open scrollable modal showing the full live page render.
 * Toggle between desktop and mobile views when both are provided. */
export function PageViewer({ desktopSlices, mobileSlices, brandName }: Props) {
  const [open, setOpen] = useState(false);
  const hasDesktop = desktopSlices.length > 0;
  const hasMobile = mobileSlices.length > 0;
  const hasAny = hasDesktop || hasMobile;

  // Default mode: desktop if available, else mobile
  const [mode, setMode] = useState<"desktop" | "mobile">(hasDesktop ? "desktop" : "mobile");

  // ESC key + body scroll lock when open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!hasAny) return null;

  const slices = mode === "desktop" ? desktopSlices : mobileSlices;
  const previewSlice = desktopSlices[0] || mobileSlices[0];

  return (
    <>
      {/* Trigger — browser-chrome wrapper showing the first slice */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full text-left"
        aria-label={`View live page render of ${brandName}`}
      >
        <div className="rounded-xl overflow-hidden border border-[#EDEDEF] bg-white shadow-[var(--shadow-card)] group-hover:shadow-[var(--shadow-elevated)] transition-shadow">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#FAFAFB] border-b border-[#EDEDEF]">
            <div className="size-2.5 rounded-full bg-[#E5E5EA]" />
            <div className="size-2.5 rounded-full bg-[#E5E5EA]" />
            <div className="size-2.5 rounded-full bg-[#E5E5EA]" />
            <div className="ml-2 text-[10px] uppercase tracking-wider text-[#A0A0A0]">
              {brandName}
            </div>
            <div className="ml-auto text-[10px] uppercase tracking-wider text-[#7A7A7A] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              View full page →
            </div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden bg-white">
            {previewSlice ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewSlice.url}
                  alt=""
                  className="w-full h-auto block"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80 pointer-events-none" />
              </>
            ) : null}
          </div>
        </div>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#0A0A0B]/85 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between gap-4 px-6 py-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60 font-semibold">
              {brandName} · Live page
            </div>

            {hasDesktop && hasMobile && (
              <div className="inline-flex items-center gap-1 p-0.5 bg-white/5 border border-white/10 rounded-full">
                <button
                  onClick={() => setMode("desktop")}
                  className={`px-4 py-1 text-[11px] font-semibold rounded-full transition-colors ${
                    mode === "desktop"
                      ? "bg-white text-[#0A0A0B]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setMode("mobile")}
                  className={`px-4 py-1 text-[11px] font-semibold rounded-full transition-colors ${
                    mode === "mobile"
                      ? "bg-white text-[#0A0A0B]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Mobile
                </button>
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>

          {/* Scrolling slice column */}
          <div
            className="flex-1 overflow-y-auto py-8 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`mx-auto bg-white rounded-md overflow-hidden shadow-[0_30px_120px_rgba(0,0,0,0.5)] ${
                mode === "mobile" ? "max-w-[420px]" : "max-w-5xl"
              }`}
            >
              {slices.map((slice, i) => (
                <div
                  key={slice.filename || i}
                  className="relative w-full"
                  style={
                    slice.width && slice.height
                      ? { aspectRatio: `${slice.width} / ${slice.height}` }
                      : undefined
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slice.url}
                    alt=""
                    loading={i < 2 ? "eager" : "lazy"}
                    decoding="async"
                    className="block w-full h-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
