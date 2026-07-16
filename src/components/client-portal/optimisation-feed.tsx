"use client";

/* ── Optimisation feed (client face, §7) ──
 * The read-only, curated view of a client's optimisation work — a projection of
 * the Results Engine's PUBLISHED tests (client face only). Wins and losses both
 * show, oldest → newest, so it reads as the iteration journey: the effort behind
 * the guarantee, not just a scoreboard. Losses are framed as steps/learnings,
 * never failures. Reusable in the external portal and the internal client area.
 */

import { TrophyIcon, LightBulbIcon, BeakerIcon } from "@heroicons/react/24/outline";
import type { ClientOptimisation } from "@/lib/results-engine/data";
import type { Test } from "@/lib/results-engine/types";

export function OptimisationFeed({ groups }: { groups: ClientOptimisation[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-faint px-6 py-12 text-center">
        <BeakerIcon className="mx-auto size-6 text-subtle" />
        <p className="mt-2 text-sm font-medium text-foreground">Optimisation starts at launch</p>
        <p className="mt-1 text-xs text-subtle">
          Once your page is live, every test we run shows up here — the work behind the guarantee.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(({ surface, journey }) => {
        const wins = journey.filter((t) => t.status === "won").length;
        return (
          <section key={surface.id}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">{surface.title}</h3>
              <span className="text-2xs tabular-nums text-subtle">
                {journey.length} test{journey.length !== 1 ? "s" : ""}
                {wins > 0 ? ` · ${wins} won` : ""}
              </span>
            </div>
            <ol className="relative flex flex-col gap-4 border-l border-border-faint pl-5">
              {journey.map((t) => (
                <JourneyStep key={t.id} test={t} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function JourneyStep({ test }: { test: Test }) {
  const won = test.status === "won";
  return (
    <li className="relative">
      {/* node on the rail */}
      <span
        className={`absolute -left-[27px] top-0.5 grid size-4 place-items-center rounded-full ${
          won ? "bg-status-ontrack text-background" : "border border-border bg-background text-subtle"
        }`}
      >
        {won ? <TrophyIcon className="size-2.5" /> : <LightBulbIcon className="size-2.5" />}
      </span>

      <div className="rounded-lg border border-border-faint bg-surface p-3.5">
        <div className="flex items-center gap-2">
          <span
            className={`text-2xs font-medium uppercase tracking-wider ${
              won ? "text-status-ontrack" : "text-muted"
            }`}
          >
            {won ? "Win" : "Learning"}
          </span>
          {won && typeof test.upliftPct === "number" && (
            <span className="font-mono text-2xs font-semibold tabular-nums text-status-ontrack">
              {test.upliftPct > 0 ? "+" : ""}
              {test.upliftPct}%{test.primaryMetric ? ` ${test.primaryMetric}` : ""}
            </span>
          )}
        </div>

        {test.clientSummary && (
          <p className="mt-2 text-[13px] leading-relaxed text-foreground">{test.clientSummary}</p>
        )}
        {test.clientResult && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{test.clientResult}</p>
        )}
      </div>
    </li>
  );
}
