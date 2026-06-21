"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

/* Auto-generated client-shareable artefacts on /engagements/[id].
 * Currently just the public roadmap deck; scope brief + monthly readout
 * PDFs slot in here as they land. */
export function GeneratedDocs({ engagementId }: { engagementId: string }) {
  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
          Generated docs
        </h2>
        <span className="text-[10px] text-[#71757D]">Auto-built from your intake</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <a
          href={`/share/roadmap/${engagementId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-[#2A2A2A] bg-[#181818] p-4 hover:border-white transition-colors flex flex-col"
        >
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E5E5EA]">
              Project roadmap
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#1B5E20] bg-emerald-500/15 px-1.5 py-0.5 rounded">
              Client safe
            </span>
          </div>
          <p className="text-[12px] text-[#9CA3AF] leading-snug mb-3">
            Templated one-pager showing scope, kickoff, delivery dates, and the build sequence. Share with the client.
          </p>
          <div className="mt-auto flex items-center justify-between text-[12px]">
            <span className="text-[#71757D]">/share/roadmap/{engagementId.slice(0, 6)}…</span>
            <span className="inline-flex items-center gap-1 font-medium text-[#E5E5EA]">
              Open <ArrowTopRightOnSquareIcon className="size-3" />
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
