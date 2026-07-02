"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  CalendarIcon,
  TableCellsIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import {
  ensureSeed,
  getClients,
  getPods,
  getProjects,
} from "@/lib/pods-v2/data";
import {
  Bucket,
  Client,
  Pod,
  Project,
  ProjectStatus,
} from "@/lib/pods-v2/types";
import { isMidWeekKickoff } from "@/lib/pods-v2/calc";
import { formatDayMonth, todayYMD } from "@/lib/dates";
import {
  BrandWarmBadge,
  BucketBadge,
  StatusBadge,
} from "../components";
import { MonthGantt } from "../MonthGantt";
import { WeeksView } from "../WeeksView";

type View = "weeks" | "table" | "gantt";

const STATUS_ORDER: ProjectStatus[] = [
  "queued",
  "in_progress",
  "in_review",
  "shipped",
  "slipped",
];

const STATUS_LABEL: Record<ProjectStatus, string> = {
  queued: "Queued",
  in_progress: "In progress",
  in_review: "In review",
  shipped: "Shipped",
  slipped: "Slipped",
};

const BUCKETS: Bucket[] = ["A", "B", "C", "Bespoke"];

export default function PipelineClient() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<View>("weeks");
  const [podFilter, setPodFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [bucketFilter, setBucketFilter] = useState<Bucket | "all">("all");
  const [includeShipped, setIncludeShipped] = useState(false);

  useEffect(() => {
    ensureSeed();
    setPods(getPods());
    setClients(getClients());
    setProjects(getProjects());
    setLoading(false);
  }, []);

  const today = todayYMD();
  const podById = useMemo(
    () => new Map(pods.map((p) => [p.id, p] as const)),
    [pods],
  );
  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c] as const)),
    [clients],
  );

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (podFilter && p.pod_id !== podFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (bucketFilter !== "all" && p.bucket !== bucketFilter) return false;
      if (!includeShipped && p.status === "shipped") return false;
      return true;
    });
  }, [projects, podFilter, statusFilter, bucketFilter, includeShipped]);

  const stats = useMemo(() => {
    const active = filtered.filter(
      (p) => p.status !== "shipped" && p.status !== "slipped",
    );
    const totalPoints = active.reduce((sum, p) => sum + p.points, 0);
    const slipped = filtered.filter((p) => p.status === "slipped").length;
    const midWeek = filtered.filter(isMidWeekKickoff).length;
    return { active: active.length, totalPoints, slipped, midWeek };
  }, [filtered]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="text-sm text-subtle">Loading pipeline…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
      <div className="flex items-center justify-between">
        <Link
          href="/pods-v2"
          className="inline-flex items-center gap-1 text-xs text-subtle hover:text-foreground"
        >
          <ChevronLeftIcon className="size-3.5" />
          All pods
        </Link>
        <div className="text-[11px] uppercase tracking-wider text-subtle">
          Cross-pod pipeline
        </div>
      </div>

      <div className="mt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
          Pipeline
        </p>
        <h1 className="mt-1 text-3xl font-medium">
          All projects in flight
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-subtle">
          Every queued, in-progress, in-review and slipped project across all
          pods. Filter to drill in.
        </p>
      </div>

      {/* STATS */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active" value={stats.active.toString()} />
        <Stat label="Points committed" value={stats.totalPoints.toString()} />
        <Stat
          label="Slipped"
          value={stats.slipped.toString()}
          tone={stats.slipped > 0 ? "amber" : undefined}
        />
        <Stat
          label="Mid-week kickoffs"
          value={stats.midWeek.toString()}
          tone={stats.midWeek > 0 ? "rose" : undefined}
        />
      </div>

      {/* FILTERS */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-3">
          <FilterGroup label="Pod">
            <FilterChip
              active={!podFilter}
              onClick={() => setPodFilter(null)}
            >
              All
            </FilterChip>
            {pods.map((p) => (
              <FilterChip
                key={p.id}
                active={podFilter === p.id}
                onClick={() => setPodFilter(p.id)}
              >
                {p.name}
              </FilterChip>
            ))}
          </FilterGroup>

          <Divider />

          <FilterGroup label="Status">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              All
            </FilterChip>
            {STATUS_ORDER.map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_LABEL[s]}
              </FilterChip>
            ))}
          </FilterGroup>

          <Divider />

          <FilterGroup label="Bucket">
            <FilterChip
              active={bucketFilter === "all"}
              onClick={() => setBucketFilter("all")}
            >
              All
            </FilterChip>
            {BUCKETS.map((b) => (
              <FilterChip
                key={b}
                active={bucketFilter === b}
                onClick={() => setBucketFilter(b)}
              >
                {b}
              </FilterChip>
            ))}
          </FilterGroup>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-subtle">
              <input
                type="checkbox"
                checked={includeShipped}
                onChange={(e) => setIncludeShipped(e.target.checked)}
                className="size-3.5 rounded border-border"
              />
              Include shipped
            </label>
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[11px]">
              <ViewButton
                active={view === "weeks"}
                onClick={() => setView("weeks")}
                icon={<ViewColumnsIcon className="size-3.5" />}
                label="By week"
              />
              <ViewButton
                active={view === "table"}
                onClick={() => setView("table")}
                icon={<TableCellsIcon className="size-3.5" />}
                label="Table"
              />
              <ViewButton
                active={view === "gantt"}
                onClick={() => setView("gantt")}
                icon={<CalendarIcon className="size-3.5" />}
                label="Gantt"
              />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW */}
      <div className="mt-6">
        {view === "weeks" && (
          <WeeksView
            projects={filtered}
            podById={podById}
            clientById={clientById}
            today={today}
          />
        )}
        {view === "table" && (
          <TableView
            projects={filtered}
            podById={podById}
            clientById={clientById}
            today={today}
          />
        )}
        {view === "gantt" && (
          <MonthGantt projects={filtered} clientById={clientById} />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "amber" | "rose";
}) {
  const cls =
    tone === "rose"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-border bg-surface text-foreground";
  return (
    <div className={`rounded-xl border p-4 shadow-[var(--shadow-soft)] ${cls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
        active
          ? "bg-foreground text-surface"
          : "bg-surface-raised text-subtle hover:bg-border hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-border" />;
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
        active
          ? "bg-foreground text-surface"
          : "text-subtle hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TableView({
  projects,
  podById,
  clientById,
  today,
}: {
  projects: Project[];
  podById: Map<string, Pod>;
  clientById: Map<string, Client>;
  today: string;
}) {
  const sorted = [...projects].sort((a, b) =>
    a.delivery_date.localeCompare(b.delivery_date),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-background text-[10px] font-semibold uppercase tracking-wider text-subtle">
          <tr>
            <th className="px-4 py-2.5 text-left">Project</th>
            <th className="px-4 py-2.5 text-left">Pod</th>
            <th className="px-4 py-2.5 text-left">Client</th>
            <th className="px-4 py-2.5 text-left">Bucket</th>
            <th className="px-4 py-2.5 text-left">Status</th>
            <th className="px-4 py-2.5 text-right">Pts</th>
            <th className="px-4 py-2.5 text-right">Kickoff</th>
            <th className="px-4 py-2.5 text-right">Ships</th>
            <th className="px-4 py-2.5 text-right">Days left</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((p) => {
            const pod = podById.get(p.pod_id);
            const client = clientById.get(p.client_id);
            const daysLeft = Math.round(
              (new Date(`${p.delivery_date}T12:00:00`).getTime() -
                new Date(`${today}T12:00:00`).getTime()) /
                86_400_000,
            );
            const tone =
              daysLeft < 0
                ? "text-rose-700"
                : daysLeft <= 3
                  ? "text-amber-700"
                  : "text-subtle";
            return (
              <tr key={p.id} className="hover:bg-background">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.name}</div>
                  {p.is_rush && (
                    <span className="mt-0.5 inline-block text-[10px] font-medium text-rose-700">
                      Rush
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-subtle">{pod?.name ?? ","}</td>
                <td className="px-4 py-3">
                  <div>{client?.name ?? ","}</div>
                  {client?.brand_warm && (
                    <div className="text-[10px] font-medium text-orange-700">Warm</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <BucketBadge bucket={p.bucket} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {p.points}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatDayMonth(p.kickoff_date)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatDayMonth(p.delivery_date)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${tone}`}>
                  {daysLeft >= 0 ? `${daysLeft}d` : `${Math.abs(daysLeft)}d over`}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="px-4 py-10 text-center text-sm text-subtle"
              >
                No projects match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
