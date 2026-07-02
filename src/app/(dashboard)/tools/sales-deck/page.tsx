"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

/* Internal preview of the public /conversion-pack presentation. Lives inside
 * the dashboard so PitchNav persists when switching between pitch tabs. The
 * iframe shows the live deck; the "Open external" button opens the same URL
 * full-screen for presenting to clients. */
export default function SalesDeckPreview() {
  return (
    <div className="relative min-h-screen px-6 md:px-12 py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Sales Deck</h1>
            <p className="text-xs text-subtle mt-0.5">
              Live preview of the client-facing deck at /conversion-pack.
            </p>
          </div>
          <a
            href="/conversion-pack"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-background hover:bg-foreground transition-colors"
          >
            Open external
            <ArrowTopRightOnSquareIcon className="size-3.5" />
          </a>
        </div>
        <div className="rounded-xl overflow-hidden border border-border bg-surface">
          <iframe
            src="/conversion-pack"
            className="w-full h-[calc(100vh-180px)] bg-white"
            title="Sales Deck preview"
          />
        </div>
      </div>
    </div>
  );
}
