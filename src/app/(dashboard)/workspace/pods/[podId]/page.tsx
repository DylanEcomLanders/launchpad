"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceData, todayYMD } from "@/lib/workspace/use-workspace-data";
import {
  buildAllClientVMs,
  buildAllPodVMs,
  LANE_LABEL,
  formatDue,
  type ClientVM,
  type PodVM,
  type WeekDeliverable,
  type Lane,
} from "@/lib/workspace/derive";
import { ROLE_LABEL } from "@/lib/pods-v2/types";
import { weekDays } from "@/lib/pods-v2/calc";
import {
  Card,
  Pill,
  ProgressBar,
  OwnerChip,
  HealthDot,
  SectionTitle,
  EmptyState,
  LaneChip,
  DeadlinePill,
} from "@/lib/workspace/ui";

const LANES: { lane: Lane; short: string }[] = [
  { lane: "strategy", short: "Strat" },
  { lane: "design", short: "Design" },
  { lane: "development", short: "Dev" },
];

export default function WorkspacePodDetail() {
  const params = useParams();
  const podId = String(params.podId);
  const data = useWorkspaceData();
  const today = todayYMD();

  const podVM = useMemo(() => {
    const clientVMs = buildAllClientVMs({
      clients: data.clients,
      projects: data.projects,
      tasks: data.tasks,
      tests: data.tests,
      pods: data.pods,
      todayYMD: today,
    });
    const podVMs = buildAllPodVMs({
      pods: data.pods,
      clientVMs,
      projects: data.projects,
      tasks: data.tasks,
      todayYMD: today,
    });
    return podVMs.find((p) => p.pod.id === podId) ?? null;
  }, [data, today, podId]);

  if (data.loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-surface-raised" />;
  }
  if (!podVM) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState>Pod not found.</EmptyState>
      </div>
    );
  }

  const { pod } = podVM;
  const retainers = podVM.clients.filter((c) => c.kind === "retainer");
  const sprints = podVM.clients.filter((c) => c.kind === "sprint");

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {pod.name}
          </h1>
          <p className="mt-1 text-sm text-muted">{pod.tagline}</p>
        </div>
        <div className="flex gap-2">
          {podVM.atRiskCount > 0 && <Pill tone="red" dot>{podVM.atRiskCount} at risk</Pill>}
          {podVM.awaitingClient > 0 && (
            <Pill tone="amber" dot>{podVM.awaitingClient} awaiting client</Pill>
          )}
          {podVM.liveTests > 0 && <Pill tone="violet" dot>{podVM.liveTests} live tests</Pill>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {/* Capacity: week / next week / month */}
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Cap label="This week" used={podVM.capWeek} total={podVM.capacityTotal / 4} />
              <Cap label="Next week" used={podVM.capNextWeek} total={podVM.capacityTotal / 4} />
              <Cap label="This month" used={podVM.capacityUsed} total={podVM.capacityTotal} showPct />
            </div>
          </Card>

          {/* This week's calendar */}
          <section>
            <SectionTitle>This week</SectionTitle>
            <WeekCalendar today={today} items={podVM.weekDeliverables} />
          </section>

          {/* Retainers */}
          <section>
            <SectionTitle
              action={<span className="text-xs text-subtle">{retainers.length}</span>}
            >
              Retainers
            </SectionTitle>
            <div className="space-y-3">
              {retainers.length === 0 ? (
                <EmptyState>No retainers in this pod.</EmptyState>
              ) : (
                retainers.map((c) => <PodClientCard key={c.client.id} c={c} />)
              )}
            </div>
          </section>

          {/* Sprints */}
          <section>
            <SectionTitle
              action={<span className="text-xs text-subtle">{sprints.length}</span>}
            >
              Sprint work
            </SectionTitle>
            <div className="space-y-3">
              {sprints.length === 0 ? (
                <EmptyState>No sprint work in this pod.</EmptyState>
              ) : (
                sprints.map((c) => <PodClientCard key={c.client.id} c={c} />)
              )}
            </div>
          </section>
        </div>

        {/* Team */}
        <aside>
          <SectionTitle>Team</SectionTitle>
          <Card className="divide-y divide-border">
            {pod.members.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-subtle">No members.</div>
            ) : (
              pod.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <OwnerChip name={m.name} avatarUrl={m.avatar_url} />
                  <span className="ml-auto text-[11px] text-subtle">
                    {ROLE_LABEL[m.role]}
                  </span>
                </div>
              ))
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ─── Weekly calendar ────────────────────────────────────────────────

function WeekCalendar({
  today,
  items,
}: {
  today: string;
  items: WeekDeliverable[];
}) {
  const days = weekDays(today); // Mon-Fri YMD
  const byDay = new Map<string, WeekDeliverable[]>();
  for (const d of days) byDay.set(d, []);
  for (const it of items) {
    if (byDay.has(it.dueDate)) byDay.get(it.dueDate)!.push(it);
  }
  const weekday = (ymd: string) =>
    new Date(`${ymd}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" });
  const dayNum = (ymd: string) => new Date(`${ymd}T12:00:00`).getDate();

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
      {days.map((d) => {
        const list = byDay.get(d) ?? [];
        const isToday = d === today;
        return (
          <Card
            key={d}
            className={`flex flex-col p-3 ${isToday ? "ring-1 ring-border" : ""}`}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  isToday ? "text-foreground" : "text-subtle"
                }`}
              >
                {weekday(d)} {dayNum(d)}
              </span>
              {list.length > 0 && (
                <span className="text-[11px] tabular-nums text-subtle">{list.length}</span>
              )}
            </div>
            <div className="space-y-1.5">
              {list.length === 0 ? (
                <span className="text-[11px] text-muted">—</span>
              ) : (
                list.map((it) => (
                  <Link
                    key={it.id}
                    href={`/workspace/clients/${it.clientId}`}
                    className={`block rounded-md px-2 py-1.5 text-[11px] leading-tight transition-colors hover:bg-surface-raised ${
                      it.state === "overdue"
                        ? "bg-danger/10"
                        : it.state === "soon"
                          ? "bg-warning/10"
                          : "bg-surface-raised/60"
                    }`}
                  >
                    <div className="truncate font-medium text-muted">{it.title}</div>
                    <div className="mt-0.5 flex items-center justify-between text-subtle">
                      <span className="truncate">{it.clientName}</span>
                      <span className="shrink-0 pl-1">{it.ownerName.split(" ")[0]}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Compact client card ────────────────────────────────────────────

function PodClientCard({ c }: { c: ClientVM }) {
  return (
    <Link href={`/workspace/clients/${c.client.id}`} className="block">
      <Card className="p-4 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HealthDot band={c.band} />
            <span className="font-heading text-sm font-semibold text-foreground">
              {c.client.name}
            </span>
            {c.client.brand_warm && <Pill tone="amber">Brand-warm</Pill>}
          </div>
          <div className="flex items-center gap-2 text-xs text-subtle">
            {c.day != null && <span>Day {c.day}/90</span>}
            {c.atRiskCount > 0 && <Pill tone="red">{c.atRiskCount} at risk</Pill>}
          </div>
        </div>

        {/* Compact lane chips */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {LANES.map(({ lane, short }) => {
            const l = c.lanes[lane];
            return (
              <LaneChip
                key={lane}
                lane={lane}
                short={short}
                done={l.done}
                total={l.total}
                atRisk={l.atRisk}
              />
            );
          })}
        </div>

        {/* Next deliverable */}
        {c.nextDeadline ? (
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-xs text-muted">
            <span className="shrink-0 text-subtle">Next:</span>
            <span className="truncate font-medium text-muted">{c.nextDeadline.title}</span>
            <OwnerChip name={c.nextDeadline.ownerName} size="xs" />
            <span className="ml-auto shrink-0">
              <DeadlinePill state={c.nextDeadline.state} daysToDue={c.nextDeadline.daysToDue} />
            </span>
          </div>
        ) : (
          <div className="mt-3 border-t border-border pt-2.5 text-xs text-muted">
            Nothing scheduled.
          </div>
        )}
      </Card>
    </Link>
  );
}

// ─── Bits ───────────────────────────────────────────────────────────

function Cap({
  label,
  used,
  total,
  showPct = false,
}: {
  label: string;
  used: number;
  total: number;
  showPct?: boolean;
}) {
  const over = used > total;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-muted">{label}</span>
        <span className={`tabular-nums ${over ? "font-semibold text-danger" : "text-muted"}`}>
          {used % 1 === 0 ? used : used.toFixed(1)} / {total % 1 === 0 ? total : total.toFixed(0)}
          {showPct && total > 0 ? ` · ${Math.round((used / total) * 100)}%` : ""}
        </span>
      </div>
      <ProgressBar value={used} max={total || 1} tone="blue" />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/workspace/pods"
      className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
    >
      ← All pods
    </Link>
  );
}
