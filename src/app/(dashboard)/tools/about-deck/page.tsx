"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";

/* Placeholder for the "About Ecomlanders" client deck — a single shareable
 * surface that answers every common question a prospect asks before they
 * buy. Empty for now; live content lands on the next pass. */
export default function AboutDeckPage() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-16 md:py-24 text-foreground">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-subtle mb-4">
          <SparklesIcon className="size-3" />
          WIP
        </div>
        <h1 className="text-[28px] font-bold mb-3">
          About Deck
        </h1>
        <p className="text-muted leading-relaxed">
          The single client-facing surface that answers every question a
          prospect asks before they buy, who we are, how we work, the
          guarantee, the results, the team.
        </p>
        <div className="mt-10 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            Nothing here yet.
          </p>
          <p className="mt-1 text-xs text-subtle">
            Build it out from the Shortcuts cluster when the copy is ready.
          </p>
        </div>
      </div>
    </div>
  );
}
