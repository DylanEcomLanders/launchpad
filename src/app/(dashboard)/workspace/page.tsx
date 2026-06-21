"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceData, todayYMD } from "@/lib/workspace/use-workspace-data";
import { useCurrentUser } from "@/components/auth-gate";
import {
  buildAllClientVMs,
  buildAllPodVMs,
  buildAttentionFeed,
  groupAttentionByClient,
  buildStats,
  buildWeekCounts,
  podIdForMember,
  type AttentionItem,
  type WeekDay,
} from "@/lib/workspace/derive";
import {
  Card,
  StatTile,
  Pill,
  ProgressBar,
  HealthDot,
  OwnerChip,
  SectionTitle,
  EmptyState,
} from "@/lib/workspace/ui";

const KIND_META: Record<
  AttentionItem["kind"],
  { label: string; tone: "red" | "amber" | "violet" | "neutral" }
> = {
  overdue: { label: "Overdue", tone: "red" },
  due_soon: { label: "Due soon", tone: "amber" },
  test_call: { label: "Test call", tone: "violet" },
  strategy_gap: { label: "Strategy gap", tone: "violet" },
  awaiting_client: { label: "Awaiting client", tone: "neutral" },
};

export default function WorkspaceOverview() {
  const data = useWorkspaceData();
  const today = todayYMD();
  const me = useCurrentUser();
  const router = useRouter();

  // Members are scoped to their own pod - they don't get the all-pods
  // overview. Redirect them to their pod board (or My Work if unlinked).
  const myPodId = useMemo(
    () => (me?.role === "team" ? podIdForMember(data.pods, me.pod_member_id) : null),
    [me, data.pods],
  );
  useEffect(() => {
    if (data.loading || me?.role !== "team") return;
    router.replace(myPodId ? `/workspace/pods/${myPodId}` : "/my-work");
  }, [data.loading, me, myPodId, router]);

  const { clientVMs, podVMs, grouped, totalSignals, stats, weekDays } = useMemo(() => {
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
    const feed = buildAttentionFeed(clientVMs);
    return {
      clientVMs,
      podVMs,
      grouped: groupAttentionByClient(feed),
      totalSignals: feed.length,
      stats: buildStats(clientVMs),
      weekDays: buildWeekCounts(clientVMs, today),
    };
  }, [data, today]);

  // While loading, or while a member is being redirected to their pod, show
  // the skeleton rather than flashing the all-pods overview.
  if (data.loading || me?.role === "team") {
    return <LoadingState />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-[#E5E5EA]">
          Today across every pod
        </h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Everything that needs a decision, an owner, or a nudge - in one place.
        </p>
      </div>

      {/* Headline accountability stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          label="At risk"
          value={stats.atRisk}
          tone={stats.atRisk > 0 ? "red" : "green"}
          sub="overdue or due in 2 days"
        />
        <StatTile
          label="Due this week"
          value={stats.dueThisWeek}
          tone={stats.dueThisWeek > 0 ? "amber" : "green"}
          sub="across all lanes"
        />
        <StatTile
          label="Awaiting client"
          value={stats.awaitingClient}
          tone={stats.awaitingClient > 0 ? "amber" : "green"}
          sub="paused, needs a chase"
        />
        <StatTile
          label="Tests need a call"
          value={stats.testsNeedingCall}
          tone={stats.testsNeedingCall > 0 ? "violet" : "green"}
          sub={`${stats.liveTests} running`}
        />
      </div>

      {/* This week - compact count-per-day strip across all pods */}
      <WeekStrip days={weekDays} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Needs attention - one row per client (decluttered) */}
        <section>
          <SectionTitle
            action={
              <span className="text-xs text-[#71757D]">
                {grouped.length} client{grouped.length === 1 ? "" : "s"} · {totalSignals} signals
              </span>
            }
          >
            Needs attention
          </SectionTitle>
          <Card className="divide-y divide-[#2A2A2A]">
            {grouped.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#71757D]">
                Nothing on fire. Every lane is on track.
              </div>
            ) : (
              grouped.slice(0, 8).map((g) => {
                const meta = KIND_META[g.top.kind];
                return (
                  <Link
                    key={g.clientId}
                    href={`/workspace/clients/${g.clientId}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#222222]"
                  >
                    <Pill tone={meta.tone} dot>
                      {meta.label}
                    </Pill>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#E5E5EA]">
                        {g.clientName}
                      </div>
                      <div className="truncate text-xs text-[#9CA3AF]">{g.top.title}</div>
                    </div>
                    {g.extraCount > 0 && (
                      <span className="shrink-0 rounded-full bg-[#222222] px-2 py-0.5 text-[11px] font-medium text-[#9CA3AF]">
                        +{g.extraCount} more
                      </span>
                    )}
                  </Link>
                );
              })
            )}
            {grouped.length > 8 && (
              <Link
                href="/workspace/clients"
                className="block px-5 py-3 text-center text-xs font-medium text-[#9CA3AF] hover:text-[#E5E5EA]"
              >
                View {grouped.length - 8} more in Clients →
              </Link>
            )}
          </Card>
        </section>

        {/* Pods snapshot */}
        <section>
          <SectionTitle
            action={
              <Link
                href="/workspace/pods"
                className="text-xs font-medium text-[#9CA3AF] hover:text-[#E5E5EA]"
              >
                All pods →
              </Link>
            }
          >
            Pods
          </SectionTitle>
          <div className="space-y-3">
            {podVMs.length === 0 && <EmptyState>No pods yet.</EmptyState>}
            {podVMs.map((p) => (
              <Link key={p.pod.id} href={`/workspace/pods/${p.pod.id}`} className="block">
                <Card className="px-5 py-4 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading text-sm font-semibold text-[#E5E5EA]">
                        {p.pod.name}
                      </div>
                      <div className="text-xs text-[#9CA3AF]">
                        {p.retainerCount} retainer · {p.sprintCount} sprint
                      </div>
                    </div>
                    {p.atRiskCount > 0 ? (
                      <Pill tone="red">{p.atRiskCount} at risk</Pill>
                    ) : (
                      <Pill tone="green">On track</Pill>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-[#9CA3AF]">
                      <span>This month</span>
                      <span className="tabular-nums">
                        {p.capacityUsed} / {p.capacityTotal} pts
                      </span>
                    </div>
                    <ProgressBar value={p.capacityUsed} max={p.capacityTotal} tone="blue" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Client health strip */}
      <section>
        <SectionTitle
          action={
            <Link
              href="/workspace/clients"
              className="text-xs font-medium text-[#9CA3AF] hover:text-[#E5E5EA]"
            >
              All clients →
            </Link>
          }
        >
          Client health
        </SectionTitle>
        {clientVMs.length === 0 ? (
          <EmptyState>No active clients.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {clientVMs.map((c) => (
              <Link key={c.client.id} href={`/workspace/clients/${c.client.id}`} className="block">
                <Card className="flex items-center justify-between px-4 py-3 transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-2">
                    <HealthDot band={c.band} />
                    <span className="text-sm font-medium text-[#E5E5EA]">{c.client.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#71757D]">
                    {c.day != null && <span>Day {c.day}/90</span>}
                    {c.atRiskCount > 0 && <Pill tone="red">{c.atRiskCount}</Pill>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WeekStrip({ days }: { days: WeekDay[] }) {
  const total = days.reduce((s, d) => s + d.count, 0);
  // Default-open today if it has items, else nothing - keeps it clean.
  const todayWithItems = days.find((d) => d.isToday && d.count > 0)?.ymd ?? null;
  const [openDay, setOpenDay] = useState<string | null>(todayWithItems);
  const selected = days.find((d) => d.ymd === openDay) ?? null;

  return (
    <section>
      <SectionTitle
        action={<span className="text-xs text-[#71757D]">{total} due this week</span>}
      >
        This week
      </SectionTitle>
      <div className="grid grid-cols-5 gap-2">
        {days.map((d) => {
          const hasOverdue = d.overdue > 0;
          const isOpen = d.ymd === openDay;
          return (
            <button
              key={d.ymd}
              type="button"
              onClick={() => setOpenDay(isOpen ? null : d.count > 0 ? d.ymd : null)}
              disabled={d.count === 0}
              className={`rounded-2xl border bg-[#181818] px-3 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-all ${
                d.count === 0 ? "cursor-default" : "hover:shadow-md"
              } ${
                isOpen
                  ? "border-slate-900/30 ring-1 ring-slate-900/10"
                  : d.isToday
                    ? "border-[#2A2A2A]/80 ring-1 ring-slate-900/10"
                    : "border-[#2A2A2A]/80"
              } ${hasOverdue ? "bg-red-950/20" : ""}`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  d.isToday ? "text-[#E5E5EA]" : "text-[#71757D]"
                }`}
              >
                {d.weekday} {d.dayNum}
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span
                  className={`font-heading text-2xl font-semibold tabular-nums ${
                    d.count === 0 ? "text-[#4B4D52]" : "text-[#E5E5EA]"
                  }`}
                >
                  {d.count}
                </span>
                {hasOverdue && (
                  <span className="text-[11px] font-medium text-rose-600">
                    {d.overdue} over
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Click-in detail for the selected day */}
      {selected && selected.items.length > 0 && (
        <Card className="mt-2 divide-y divide-[#2A2A2A]">
          <div className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-[#71757D]">
            {selected.weekday} {selected.dayNum} · {selected.count} due
          </div>
          {selected.items.map((it) => (
            <Link
              key={it.id}
              href={`/workspace/clients/${it.clientId}`}
              className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[#222222]"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  it.lane === "strategy"
                    ? "bg-violet-500"
                    : it.lane === "design"
                      ? "bg-sky-500"
                      : "bg-emerald-500"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#E5E5EA]">{it.title}</div>
                <div className="truncate text-xs text-[#9CA3AF]">{it.clientName}</div>
              </div>
              {it.state === "overdue" && (
                <span className="shrink-0 text-[11px] font-medium text-rose-600">
                  {Math.abs(it.daysToDue)}d over
                </span>
              )}
              <OwnerChip name={it.ownerName} size="xs" />
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-[#222222]" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#222222]" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-[#222222]" />
    </div>
  );
}
