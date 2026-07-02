"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

/* Internal preview of the public /case-studies surface. Lives inside the
 * dashboard so PitchNav persists when switching between pitch tabs. The
 * iframe shows the live page; the "Open external" button pops the same URL
 * full-screen for sending to clients. */
export default function CaseStudiesPreview() {
  return (
    <div className="relative min-h-screen px-6 md:px-12 py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[28px] leading-tight font-bold text-foreground">Case Studies</h1>
            <p className="text-xs text-subtle mt-0.5">
              Live preview of the client-facing index at /case-studies.
            </p>
          </div>
          <a
            href="/case-studies"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[13px] font-medium text-background hover:bg-muted transition-colors"
          >
            Open external
            <ArrowTopRightOnSquareIcon className="size-3.5" />
          </a>
        </div>
        <div className="rounded-xl overflow-hidden border border-border bg-surface">
          <iframe
            src="/case-studies"
            className="w-full h-[calc(100vh-180px)] bg-white"
            title="Case Studies preview"
          />
        </div>
      </div>
    </div>
  );
}
