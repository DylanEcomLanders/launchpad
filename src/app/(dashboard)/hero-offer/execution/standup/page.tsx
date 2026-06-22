"use client";

/* Daily standup template - the script the pod runs every morning. */

import { ClockIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";

const FORMAT: { role: string; reports: string[] }[] = [
  {
    role: "Strategist",
    reports: [
      "What I shipped yesterday (tests called, briefs signed, reports sent)",
      "What I'm shipping today (the one priority)",
      "Blockers + the help I need",
    ],
  },
  {
    role: "Designer",
    reports: [
      "Builds done yesterday",
      "Builds in flight + when they're delivered",
      "Briefs I'm waiting on",
    ],
  },
  {
    role: "Developer",
    reports: [
      "Builds shipped yesterday",
      "Tests in QA + when they're live",
      "Tracking / variant-logic blockers",
    ],
  },
  {
    role: "Copy",
    reports: [
      "Copy delivered yesterday",
      "Copy in flight",
      "Hypothesis or research I need from strategist",
    ],
  },
];

export default function StandupPage() {
  return (
    <ToolShell
      title="Standup template"
      blurb="The script the pod runs every morning. 10 minutes, one round, end with the day's single priority each."
      parentHref="/hero-offer/execution"
      parentLabel="Back to Execution"
      status="shell"
      accent="cyan"
      icon={<ClockIcon className="size-5" />}
    >
      <section className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-cyan-300 mb-3">Format</div>
        <ol className="space-y-1.5 text-[13px] text-[#E5E5EA]">
          <li>1. Round the room, every pod member: yesterday → today → blockers (60s each).</li>
          <li>2. Strategist surfaces test results, deliverables overdue, client risks.</li>
          <li>3. Lock the pod&apos;s ONE priority for the day.</li>
          <li>4. Off you go. No discussion - that&apos;s what async + the weekly call are for.</li>
        </ol>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FORMAT.map((r) => (
          <section key={r.role} className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-cyan-300 mb-3">{r.role}</div>
            <ul className="space-y-2">
              {r.reports.map((it, i) => (
                <li key={i} className="text-[13px] text-[#E5E5EA] flex items-start gap-2">
                  <span className="text-cyan-300/60 mt-0.5">·</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ToolShell>
  );
}
