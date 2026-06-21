"use client";

// ─── Month-view Gantt ───────────────────────────────────────────────
// Horizontal bars per project across calendar days. Designed so Bucket B
// (15-day) and Bucket C (20-day) projects stretch visibly. Week boundaries
// are highlighted; today marker drops a vertical line.

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Client, Project, ProjectStatus } from "@/lib/pods-v2/types";
import { todayYMD } from "@/lib/dates";
import { isMonday, isThursday } from "@/lib/pods-v2/calc";
import { BucketBadge, BrandWarmBadge, StatusBadge } from "./components";

const DAY_WIDTH = 28; // px per day cell
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 44;

const BAR_COLOR: Record<ProjectStatus, { bg: string; border: string; ink: string }> = {
  queued: { bg: "#EDEDEF", border: "#D4D4D4", ink: "#1B1B1B" },
  in_progress: { bg: "#DBEAFE", border: "#93C5FD", ink: "#1E40AF" },
  in_review: { bg: "#FEF3C7", border: "#FCD34D", ink: "#92400E" },
  shipped: { bg: "#D1FAE5", border: "#6EE7B7", ink: "#065F46" },
  slipped: { bg: "#FFE4E6", border: "#FDA4AF", ink: "#9F1239" },
};

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseYMD(s: string): Date {
  return new Date(`${s}T12:00:00`);
}

function diffDays(a: string, b: string): number {
  const ad = parseYMD(a).getTime();
  const bd = parseYMD(b).getTime();
  return Math.round((bd - ad) / (24 * 60 * 60 * 1000));
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1, 12);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 12);
}

interface MonthGanttProps {
  projects: Project[];
  clientById: Map<string, Client>;
  podName?: string; // omitted = admin / cross-pod
}

export function MonthGantt({ projects, clientById, podName }: MonthGanttProps) {
  const today = todayYMD();
  const todayDate = parseYMD(today);
  const [cursor, setCursor] = useState<{ year: number; month: number }>({
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  });

  const monthData = useMemo(() => {
    const start = startOfMonth(cursor.year, cursor.month);
    const end = endOfMonth(cursor.year, cursor.month);
    const days: { ymd: string; date: Date }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      days.push({ ymd: ymd(cur), date: new Date(cur) });
      cur.setDate(cur.getDate() + 1);
    }
    return { start, end, days, startYMD: ymd(start), endYMD: ymd(end) };
  }, [cursor]);

  // Filter projects that intersect the visible month at all
  const visibleProjects = useMemo(() => {
    return projects
      .filter((p) => p.kickoff_date <= monthData.endYMD && p.delivery_date >= monthData.startYMD)
      .sort((a, b) => a.kickoff_date.localeCompare(b.kickoff_date));
  }, [projects, monthData]);

  const monthName = monthData.start.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const totalWidth = monthData.days.length * DAY_WIDTH;
  const totalHeight = HEADER_HEIGHT + visibleProjects.length * ROW_HEIGHT;

  // Today's x position (if today is inside this month)
  const todayInMonth =
    today >= monthData.startYMD && today <= monthData.endYMD;
  const todayX = todayInMonth
    ? diffDays(monthData.startYMD, today) * DAY_WIDTH + DAY_WIDTH / 2
    : -1;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
            Month view {podName && <span>· {podName}</span>}
          </div>
          <div className="mt-0.5 text-base font-semibold">
            {monthName}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setCursor((c) => {
                const m = c.month - 1;
                if (m < 0) return { year: c.year - 1, month: 11 };
                return { year: c.year, month: m };
              })
            }
            className="grid size-7 place-items-center rounded-md border border-[#2A2A2A] bg-[#181818] hover:bg-[#0C0C0C]"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="size-3.5" />
          </button>
          <button
            onClick={() => {
              setCursor({
                year: todayDate.getFullYear(),
                month: todayDate.getMonth(),
              });
            }}
            className="rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[11px] font-medium hover:bg-[#0C0C0C]"
          >
            Today
          </button>
          <button
            onClick={() =>
              setCursor((c) => {
                const m = c.month + 1;
                if (m > 11) return { year: c.year + 1, month: 0 };
                return { year: c.year, month: m };
              })
            }
            className="grid size-7 place-items-center rounded-md border border-[#2A2A2A] bg-[#181818] hover:bg-[#0C0C0C]"
            aria-label="Next month"
          >
            <ChevronRightIcon className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg
          width={Math.max(totalWidth, 600)}
          height={Math.max(totalHeight, 120)}
          className="block"
        >
          {/* Day header background */}
          <rect
            x="0"
            y="0"
            width={totalWidth}
            height={HEADER_HEIGHT}
            fill="#F7F8FA"
          />

          {/* Day columns + headers */}
          {monthData.days.map((d, i) => {
            const dow = d.date.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isMon = dow === 1;
            const isThu = dow === 4;
            return (
              <g key={d.ymd}>
                {/* Column shading for weekends */}
                {isWeekend && (
                  <rect
                    x={i * DAY_WIDTH}
                    y={HEADER_HEIGHT}
                    width={DAY_WIDTH}
                    height={totalHeight - HEADER_HEIGHT}
                    fill="#F3F3F5"
                    opacity="0.6"
                  />
                )}
                {/* Monday divider */}
                {isMon && i > 0 && (
                  <line
                    x1={i * DAY_WIDTH}
                    y1={0}
                    x2={i * DAY_WIDTH}
                    y2={totalHeight}
                    stroke="#D4D4D4"
                    strokeWidth="1"
                  />
                )}
                {/* DOW letter */}
                <text
                  x={i * DAY_WIDTH + DAY_WIDTH / 2}
                  y={16}
                  textAnchor="middle"
                  className="fill-[#A0A0A0]"
                  style={{ fontSize: "9px", fontWeight: 500 }}
                >
                  {DOW_LABELS[dow]}
                </text>
                {/* Date number */}
                <text
                  x={i * DAY_WIDTH + DAY_WIDTH / 2}
                  y={32}
                  textAnchor="middle"
                  className={
                    d.ymd === today
                      ? "fill-[#1B1B1B] font-semibold"
                      : isThu
                        ? "fill-[#1B1B1B]"
                        : "fill-[#7A7A7A]"
                  }
                  style={{ fontSize: "11px" }}
                >
                  {d.date.getDate()}
                </text>
                {/* Today highlight ring on date */}
                {d.ymd === today && (
                  <rect
                    x={i * DAY_WIDTH + 4}
                    y={20}
                    width={DAY_WIDTH - 8}
                    height={16}
                    rx="3"
                    fill="none"
                    stroke="#1B1B1B"
                    strokeWidth="1.2"
                  />
                )}
              </g>
            );
          })}

          {/* Header bottom border */}
          <line
            x1={0}
            y1={HEADER_HEIGHT}
            x2={totalWidth}
            y2={HEADER_HEIGHT}
            stroke="#E5E5EA"
            strokeWidth="1"
          />

          {/* Today vertical line */}
          {todayInMonth && (
            <line
              x1={todayX}
              y1={HEADER_HEIGHT}
              x2={todayX}
              y2={totalHeight}
              stroke="#1B1B1B"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          )}

          {/* Project bars */}
          {visibleProjects.map((p, idx) => {
            const startInView = p.kickoff_date < monthData.startYMD ? monthData.startYMD : p.kickoff_date;
            const endInView = p.delivery_date > monthData.endYMD ? monthData.endYMD : p.delivery_date;
            const offsetDays = diffDays(monthData.startYMD, startInView);
            const spanDays = Math.max(1, diffDays(startInView, endInView) + 1);
            const x = offsetDays * DAY_WIDTH + 2;
            const width = spanDays * DAY_WIDTH - 4;
            const y = HEADER_HEIGHT + idx * ROW_HEIGHT + 6;
            const height = ROW_HEIGHT - 12;
            const colors = BAR_COLOR[p.status];
            const client = clientById.get(p.client_id);
            const clipsLeft = p.kickoff_date < monthData.startYMD;
            const clipsRight = p.delivery_date > monthData.endYMD;
            const midWeek = !isMonday(p.kickoff_date) && !p.is_rush;
            const offThursday = !isThursday(p.delivery_date);

            return (
              <g key={p.id}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx="6"
                  fill={colors.bg}
                  stroke={midWeek ? "#E11D48" : colors.border}
                  strokeWidth={midWeek ? 1.5 : 1}
                />
                {/* Kickoff dot (Monday marker) */}
                {!clipsLeft && (
                  <circle
                    cx={x + 6}
                    cy={y + height / 2}
                    r="3"
                    fill={midWeek ? "#E11D48" : colors.ink}
                  />
                )}
                {/* Delivery flag (Thursday marker) */}
                {!clipsRight && (
                  <rect
                    x={x + width - 8}
                    y={y + height / 2 - 3}
                    width={6}
                    height={6}
                    fill={offThursday ? "#E11D48" : colors.ink}
                    transform={`rotate(45 ${x + width - 5} ${y + height / 2})`}
                  />
                )}
                {/* Label inside bar */}
                <text
                  x={x + 14}
                  y={y + height / 2 + 4}
                  className="fill-[#1B1B1B]"
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    pointerEvents: "none",
                  }}
                  clipPath={`inset(0 ${Math.max(0, totalWidth - (x + width - 14))}px 0 0)`}
                >
                  {p.name}{client ? ` · ${client.name}` : ""}
                </text>
                {/* Hover title */}
                <title>
                  {`${p.name}${client ? ` · ${client.name}` : ""}\nBucket ${p.bucket} · ${p.points} pts\n${p.kickoff_date} → ${p.delivery_date}\n${p.status}${midWeek ? " · mid-week kickoff" : ""}`}
                </title>
              </g>
            );
          })}

          {/* Empty state */}
          {visibleProjects.length === 0 && (
            <text
              x={totalWidth / 2}
              y={HEADER_HEIGHT + 60}
              textAnchor="middle"
              className="fill-[#A0A0A0]"
              style={{ fontSize: "12px" }}
            >
              No projects in this month
            </text>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 px-1 text-[10px] text-[#71757D]">
        {(Object.entries(BAR_COLOR) as [ProjectStatus, typeof BAR_COLOR[ProjectStatus]][]).map(([status, c]) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className="block size-3 rounded"
              style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
            />
            <span className="capitalize">{status.replace("_", " ")}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="block size-3 rounded border border-rose-500 bg-[#181818]" />
          <span>Mid-week kickoff</span>
        </span>
      </div>
    </div>
  );
}
