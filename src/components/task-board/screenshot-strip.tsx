"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
  urls: string[];
  /** When provided, each thumb gets a remove X. */
  onRemove?: (url: string) => void;
  /** Compact mode for triage / detail views, smaller thumbs, no remove. */
  compact?: boolean;
}

/* Inline screenshot thumbnails with click-to-expand lightbox. Used by
 * the composer, ticket card, and triage view so the look stays uniform. */
export function ScreenshotStrip({ urls, onRemove, compact }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (urls.length === 0) return null;

  const size = compact ? "size-10" : "size-14";

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {urls.map((url) => (
          <div key={url} className="relative group">
            <button
              type="button"
              onClick={() => setOpen(url)}
              className={`${size} rounded-md border border-border overflow-hidden bg-background hover:border-surface transition-colors block`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(url);
                }}
                className="absolute -top-1 -right-1 size-4 rounded-full bg-white text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove screenshot"
              >
                <XMarkIcon className="size-2.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute top-4 right-4 size-9 rounded-full bg-surface/10 hover:bg-surface/20 text-white flex items-center justify-center"
            aria-label="Close"
          >
            <XMarkIcon className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open}
            alt=""
            className="max-w-full max-h-full object-contain rounded-md"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
