"use client";

import type { FigmaFrame } from "@/lib/case-studies/types";

function toEmbedUrl(url: string): string {
  if (!url) return "";
  if (url.includes("figma.com/embed")) return url;
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
}

interface Props {
  frame: FigmaFrame;
}

/* Light-mode Figma embed with subtle browser-style chrome.
 * Browser-native lazy-loads when the iframe scrolls into view. */
export function FigmaEmbed({ frame }: Props) {
  const embedUrl = toEmbedUrl(frame.shareUrl);
  if (!embedUrl) return null;

  const device = frame.device || "desktop";
  const aspect =
    device === "mobile" ? "aspect-[9/19]" : device === "tablet" ? "aspect-[3/4]" : "aspect-[16/10]";
  const maxWidth =
    device === "mobile" ? "max-w-[360px]" : device === "tablet" ? "max-w-[640px]" : "max-w-full";

  return (
    <figure className={`mx-auto ${maxWidth} w-full`}>
      <div className="rounded-xl overflow-hidden border border-[#EDEDEF] bg-white shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#FAFAFB] border-b border-[#EDEDEF]">
          <div className="size-2.5 rounded-full bg-[#E5E5EA]" />
          <div className="size-2.5 rounded-full bg-[#E5E5EA]" />
          <div className="size-2.5 rounded-full bg-[#E5E5EA]" />
          <div className="ml-2 text-[10px] uppercase tracking-wider text-[#A0A0A0]">
            {device}
          </div>
        </div>
        <div className={`${aspect} relative bg-white`}>
          <iframe
            src={embedUrl}
            title={frame.caption || "Figma frame"}
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
            allowFullScreen
          />
        </div>
      </div>
      {frame.caption && (
        <figcaption className="mt-3 text-sm text-[#7A7A7A] text-center">
          {frame.caption}
        </figcaption>
      )}
    </figure>
  );
}
