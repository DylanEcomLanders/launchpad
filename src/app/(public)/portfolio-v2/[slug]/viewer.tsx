"use client";

import { useState } from "react";
import type { PortfolioSlice } from "@/lib/portfolio-v2/types";

export function PortfolioViewer({
  desktopSlices,
  mobileSlices,
}: {
  desktopSlices: PortfolioSlice[];
  mobileSlices: PortfolioSlice[];
}) {
  const hasMobile = mobileSlices.length > 0;
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const slices = mode === "desktop" ? desktopSlices : mobileSlices;

  return (
    <>
      {hasMobile && (
        <div className="sticky top-4 z-30 flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full">
            <button
              onClick={() => setMode("desktop")}
              className={`px-5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                mode === "desktop"
                  ? "bg-white text-[#0A0A0B]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => setMode("mobile")}
              className={`px-5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                mode === "mobile"
                  ? "bg-white text-[#0A0A0B]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Mobile
            </button>
          </div>
        </div>
      )}

      <div
        className={`mx-auto ${
          mode === "mobile" ? "max-w-[420px]" : "max-w-5xl"
        } space-y-0`}
      >
        {slices.map((slice, i) => (
          <Slice key={`${mode}-${i}`} slice={slice} eager={i < 2} />
        ))}
      </div>
    </>
  );
}

function Slice({ slice, eager }: { slice: PortfolioSlice; eager: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className="relative w-full overflow-hidden bg-white/5"
      style={{
        aspectRatio: `${slice.width} / ${slice.height}`,
        backgroundImage: slice.blur ? `url(${slice.blur})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slice.url}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`block w-full h-full object-cover transition-opacity duration-700 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
