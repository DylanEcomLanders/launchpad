"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

/* Auto-generated client-shareable artefacts on /engagements/[id].
 * Currently just the public roadmap deck; scope brief + monthly readout
 * PDFs slot in here as they land. */
export function GeneratedDocs({ engagementId }: { engagementId: string }) {
  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
          Generated docs
        </h2>
        <span className="text-[10px] text-[#999]">Auto-built from your intake</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <a
          href={`/share/roadmap/${engagementId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-[#E5E5EA] bg-white p-4 hover:border-[#1B1B1B] transition-colors flex flex-col"
        >
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1B1B1B]">
              Project roadmap
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#1B5E20] bg-[#E8F5E9] px-1.5 py-0.5 rounded">
              Client safe
            </span>
          </div>
          <p className="text-[12px] text-[#666] leading-snug mb-3">
            Templated one-pager showing scope, kickoff, delivery dates, and the build sequence. Share with the client.
          </p>
          <div className="mt-auto flex items-center justify-between text-[12px]">
            <span className="text-[#999]">/share/roadmap/{engagementId.slice(0, 6)}…</span>
            <span className="inline-flex items-center gap-1 font-medium text-[#1B1B1B]">
              Open <ArrowTopRightOnSquareIcon className="size-3" />
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
