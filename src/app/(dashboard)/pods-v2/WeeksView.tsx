"use client";

// ─── Four-week rolling view ────────────────────────────────────────
// Used by the pipeline page (cross-pod) and the pod-detail page (scoped).
// Renders four week-rows: this week (open by default) + next 3 (collapsed).
// Each open row shows three lanes: Kicking off Mon · In flight · Shipping Thu.

import { useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Client, Pod, Project } from "@/lib/pods-v2/types";
import { isMidWeekKickoff } from "@/lib/pods-v2/calc";
import { formatDayMonth } from "@/lib/dates";
import { BucketBadge } from "./components";

interface WeekFrame {
  mondayYMD: string;
  fridayYMD: string;
  thursdayYMD: string;
  label: string;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function buildFourWeeks(today: string): WeekFrame[] {
  const t = new Date(`${today}T12:00:00`);
  const dow = t.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  const monday = new Date(t);
  monday.setDate(t.getDate() - back);

  const weeks: WeekFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const m = new Date(monday);
    m.setDate(monday.getDate() + i * 7);
    const f = new Date(m);
    f.setDate(m.getDate() + 4);
    const th = new Date(m);
    th.setDate(m.getDate() + 3);
    const label =
      i === 0
        ? "This week"
        : i === 1
          ? "Next week"
          : i === 2
            ? "In 2 weeks"
            : "In 3 weeks";
    weeks.push({
      mondayYMD: ymd(m),
      fridayYMD: ymd(f),
      thursdayYMD: ymd(th),
      label,
    });
  }
  return weeks;
}

interface WeeksViewProps {
  projects: Project[];
  podById?: Map<string, Pod>;
  clientById: Map<string, Client>;
  today: string;
  /** Hide pod tag on cards (use when already inside a pod-scoped view). */
  hidePodTag?: boolean;
}

export function WeeksView({
  projects,
  podById,
  clientById,
  today,
  hidePodTag,
}: WeeksViewProps) {
  const weeks = useMemo(() => buildFourWeeks(today), [today]);

  return (
    <div className="space-y-3">
      {weeks.map((wk, idx) => (
        <WeekRow
          key={wk.mondayYMD}
          week={wk}
          projects={projects}
          podById={podById}
          clientById={clientById}
          today={today}
          defaultOpen={idx === 0}
          hidePodTag={hidePodTag}
        />
      ))}
    </div>
  );
}

function WeekRow({
  week,
  projects,
  podById,
  clientById,
  today,
  defaultOpen,
  hidePodTag,
}: {
  week: WeekFrame;
  projects: Project[];
  podById?: Map<string, Pod>;
  clientById: Map<string, Client>;
  today: string;
  defaultOpen: boolean;
  hidePodTag?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const { kickingOff, shipping, midFlight } = useMemo(() => {
    const ko: Project[] = [];
    const sh: Project[] = [];
    const mf: Project[] = [];
    for (const p of projects) {
      const inWeek =
        p.kickoff_date <= week.fridayYMD && p.delivery_date >= week.mondayYMD;
      if (!inWeek) continue;
      if (p.kickoff_date >= week.mondayYMD && p.kickoff_date <= week.fridayYMD) {
        ko.push(p);
      } else if (
        p.delivery_date >= week.mondayYMD &&
        p.delivery_date <= week.fridayYMD
      ) {
        sh.push(p);
      } else {
        mf.push(p);
      }
    }
    return { kickingOff: ko, shipping: sh, midFlight: mf };
  }, [projects, week]);

  const total = kickingOff.length + shipping.length + midFlight.length;
  const isThisWeek = today >= week.mondayYMD && today <= week.fridayYMD;

  return (
    <div
      className={`rounded-xl border bg-surface shadow-[var(--shadow-soft)] ${
        isThisWeek ? "border-white/30" : "border-border"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDownIcon className="size-4 text-subtle" />
          ) : (
            <ChevronRightIcon className="size-4 text-subtle" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {week.label}
              </span>
              {isThisWeek && (
                <span className="rounded bg-foreground text-surface px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  Now
                </span>
              )}
            </div>
            <div className="text-[11px] text-subtle">
              w/c {formatDayMonth(week.mondayYMD)} · ships{" "}
              {formatDayMonth(week.thursdayYMD)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <RowStat label="Kicking off" count={kickingOff.length} accent />
          <RowStat label="Shipping" count={shipping.length} accent />
          <RowStat label="In flight" count={midFlight.length} />
          <span className="ml-2 text-subtle">{total} total</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {total === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-6 text-center text-[11px] text-subtle">
              Nothing scheduled in this week
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Lane
                label="Kicking off Mon"
                projects={kickingOff}
                podById={podById}
                clientById={clientById}
                empty="No kickoffs"
                tone="kickoff"
                hidePodTag={hidePodTag}
              />
              <Lane
                label="In flight"
                projects={midFlight}
                podById={podById}
                clientById={clientById}
                empty="Heads-down work"
                tone="default"
                hidePodTag={hidePodTag}
              />
              <Lane
                label="Shipping Thu"
                projects={shipping}
                podById={podById}
                clientById={clientById}
                empty="Nothing shipping"
                tone="ship"
                hidePodTag={hidePodTag}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RowStat({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent?: boolean;
}) {
  if (count === 0) {
    return (
      <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] text-subtle">
        {label} 0
      </span>
    );
  }
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
        accent ? "bg-foreground text-surface" : "bg-surface-raised text-foreground"
      }`}
    >
      {label} {count}
    </span>
  );
}

function Lane({
  label,
  projects,
  podById,
  clientById,
  empty,
  tone,
  hidePodTag,
}: {
  label: string;
  projects: Project[];
  podById?: Map<string, Pod>;
  clientById: Map<string, Client>;
  empty: string;
  tone: "kickoff" | "ship" | "default";
  hidePodTag?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-subtle">
        <span>{label}</span>
        <span className="tabular-nums text-subtle">{projects.length}</span>
      </div>
      <div className="space-y-2">
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background px-3 py-3 text-center text-[10px] text-subtle">
            {empty}
          </div>
        ) : (
          [...projects]
            .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
            .map((p) => (
              <WeekCard
                key={p.id}
                project={p}
                pod={podById?.get(p.pod_id)}
                client={clientById.get(p.client_id)}
                tone={tone}
                hidePodTag={hidePodTag}
              />
            ))
        )}
      </div>
    </div>
  );
}

function WeekCard({
  project,
  pod,
  client,
  tone,
  hidePodTag,
}: {
  project: Project;
  pod?: Pod;
  client?: Client;
  tone: "kickoff" | "ship" | "default";
  hidePodTag?: boolean;
}) {
  const midWeek = isMidWeekKickoff(project);
  const accent =
    tone === "kickoff"
      ? "border-l-[3px] border-l-[#1B1B1B]"
      : tone === "ship"
        ? "border-l-[3px] border-l-emerald-500"
        : "";
  return (
    <div
      className={`rounded-lg border border-border bg-surface p-2.5 shadow-[var(--shadow-soft)] ${accent}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight">
            {project.name}
          </div>
          {client && (
            <div className="mt-0.5 truncate text-[11px] text-subtle">
              {client.name}
            </div>
          )}
        </div>
        <BucketBadge bucket={project.bucket} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {!hidePodTag && pod && (
          <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-foreground">
            {pod.name}
          </span>
        )}
        {client?.brand_warm && (
          <span className="rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
            Warm
          </span>
        )}
        {project.is_rush && (
          <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
            Rush
          </span>
        )}
        {midWeek && (
          <span className="rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-800">
            Mid-week
          </span>
        )}
        <span className="ml-auto text-[10px] text-subtle">
          {tone === "kickoff"
            ? `K ${formatDayMonth(project.kickoff_date)}`
            : tone === "ship"
              ? `→ ${formatDayMonth(project.delivery_date)}`
              : `${formatDayMonth(project.kickoff_date)} → ${formatDayMonth(project.delivery_date)}`}
        </span>
      </div>
    </div>
  );
}
