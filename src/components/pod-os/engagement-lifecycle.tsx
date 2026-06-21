// Clients v2 — engagement lifecycle visual (spec §1.9 retainer macro-cycle,
// §1.4 sprint phases). Reads a live pods-v2 Client and renders either:
//   • Retainer: a 90-day track split into the five §1.9 windows with a
//     "today" marker plus Day-45 check-in and Day-75 refresh milestones.
//   • Sprint:   the Phase 1 → 2 → 3 track (§1.4) with the bucket label.
// Pure presentational; the calling surface passes today + the client.

import {
  engagementKindOf,
  engagementStartOf,
  engagementDay,
  daysToRefresh,
  engagementWindow,
  ENGAGEMENT_WINDOW_LABEL,
  type EngagementWindow,
} from "@/lib/pods-v2/calc";
import type { Client } from "@/lib/pods-v2/types";
import { fmtDayMonth } from "./ui";

const WINDOWS: { key: EngagementWindow; from: number; to: number }[] = [
  { key: "onboarding", from: 1, to: 14 },
  { key: "first_wave", from: 15, to: 30 },
  { key: "iteration", from: 31, to: 60 },
  { key: "compound", from: 61, to: 75 },
  { key: "transition", from: 76, to: 90 },
];

const SPRINT_PHASES = [
  { label: "Phase 1 · Strategy + Design", hint: "4 working days" },
  { label: "Phase 2 · Development", hint: "bucket-scaled" },
  { label: "Phase 3 · Test + Validate", hint: "2-4 weeks" },
];

export function EngagementLifecycle({
  client,
  today,
}: {
  client: Client;
  today: string;
}) {
  const kind = engagementKindOf(client);
  const start = engagementStartOf(client);

  if (kind === "sprint") {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
            Sprint lifecycle (§1.4)
          </span>
          <span className="text-[11px] text-[#71757D]">points → bucket → duration</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {SPRINT_PHASES.map((p, i) => (
            <div key={i} className="rounded-lg border border-[#404040] bg-[#0C0C0C] px-2.5 py-2">
              <div className="text-[11px] font-medium text-[#E5E5EA]">{p.label}</div>
              <div className="mt-0.5 text-[10px] text-[#71757D]">{p.hint}</div>
            </div>
          ))}
        </div>
        {start && (
          <div className="mt-2 text-[11px] text-[#71757D]">Kickoff {fmtDayMonth(start)} (§1.4)</div>
        )}
      </div>
    );
  }

  // Retainer 90-day macro cycle.
  const day = engagementDay(client, today);
  const refreshIn = daysToRefresh(client, today);
  const window = day != null ? engagementWindow(day) : null;
  const pctOf = (d: number) => Math.max(0, Math.min(100, (d / 90) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
          90-day engagement (§1.9)
        </span>
        {day != null && (
          <span className={`text-[11px] tabular-nums ${refreshIn != null && refreshIn <= 10 ? "font-semibold text-rose-700" : "text-[#71757D]"}`}>
            Day {Math.max(1, day)}/90
            {refreshIn != null && ` · refresh ${refreshIn <= 0 ? "due" : `in ${refreshIn}d`}`}
          </span>
        )}
      </div>

      {/* window track */}
      <div className="relative h-7 w-full overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#0C0C0C]">
        <div className="flex h-full w-full">
          {WINDOWS.map((w) => {
            const span = w.to - w.from + 1;
            const active = window === w.key;
            const past = day != null && day > w.to;
            return (
              <div
                key={w.key}
                style={{ width: `${(span / 90) * 100}%` }}
                className={`flex items-center justify-center border-r border-white/70 px-1 text-center text-[9px] leading-tight last:border-r-0 ${
                  active
                    ? "bg-white text-[#0C0C0C]"
                    : past
                      ? "bg-[#2A2A2A] text-[#9A9A9A]"
                      : "text-[#9A9A9A]"
                }`}
                title={`${ENGAGEMENT_WINDOW_LABEL[w.key]} · days ${w.from}-${w.to}`}
              >
                <span className="hidden truncate sm:inline">{ENGAGEMENT_WINDOW_LABEL[w.key]}</span>
              </div>
            );
          })}
        </div>
        {/* today marker */}
        {day != null && day >= 1 && day <= 90 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-rose-500"
            style={{ left: `${pctOf(day)}%` }}
            title={`Today — Day ${day}`}
          />
        )}
      </div>

      {/* milestones */}
      <div className="relative mt-1 h-4">
        {[
          { d: 45, label: "Day 45 check-in" },
          { d: 75, label: "Day 75 refresh" },
        ].map((m) => (
          <div
            key={m.d}
            className="absolute -translate-x-1/2 text-[9px] text-[#71757D]"
            style={{ left: `${pctOf(m.d)}%` }}
          >
            <span className="block h-1.5 w-px bg-[#C5C5C5]" style={{ marginLeft: "50%" }} />
            <span className="mt-0.5 block whitespace-nowrap">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
