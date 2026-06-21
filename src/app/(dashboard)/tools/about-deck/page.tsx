"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";

/* Placeholder for the "About Ecomlanders" client deck — a single shareable
 * surface that answers every common question a prospect asks before they
 * buy. Empty for now; live content lands on the next pass. */
export default function AboutDeckPage() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-16 md:py-24 text-[#E5E5EA]">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A2A] bg-[#181818] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-4">
          <SparklesIcon className="size-3" />
          WIP
        </div>
        <h1 className="text-[28px] font-bold mb-3">
          About Deck
        </h1>
        <p className="text-[#9CA3AF] leading-relaxed">
          The single client-facing surface that answers every question a
          prospect asks before they buy, who we are, how we work, the
          guarantee, the results, the team.
        </p>
        <div className="mt-10 rounded-xl border border-dashed border-[#2A2A2A] bg-[#181818] px-6 py-12 text-center">
          <p className="text-sm font-medium text-[#E5E5EA]">
            Nothing here yet.
          </p>
          <p className="mt-1 text-xs text-[#71757D]">
            Build it out from the Shortcuts cluster when the copy is ready.
          </p>
        </div>
      </div>
    </div>
  );
}
