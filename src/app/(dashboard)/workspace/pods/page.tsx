"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWorkspaceData, todayYMD } from "@/lib/workspace/use-workspace-data";
import { buildAllClientVMs, buildAllPodVMs, type PodVM } from "@/lib/workspace/derive";
import { useMemberScopeRedirect } from "@/lib/workspace/use-member-scope";
import { Card, Pill, ProgressBar, EmptyState } from "@/lib/workspace/ui";

export default function WorkspacePodsList() {
  const data = useWorkspaceData();
  const today = todayYMD();
  const scopedMember = useMemberScopeRedirect(data.pods, data.loading);

  const podVMs = useMemo(() => {
    const clientVMs = buildAllClientVMs({
      clients: data.clients,
      projects: data.projects,
      tasks: data.tasks,
      tests: data.tests,
      pods: data.pods,
      todayYMD: today,
    });
    return buildAllPodVMs({
      pods: data.pods,
      clientVMs,
      projects: data.projects,
      tasks: data.tasks,
      todayYMD: today,
    });
  }, [data, today]);

  if (data.loading || scopedMember) {
    return <div className="h-96 animate-pulse rounded-2xl bg-[#222222]" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-[#E5E5EA]">
          Pods
        </h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Capacity, ownership and risk for every delivery team.
        </p>
      </div>

      {podVMs.length === 0 ? (
        <EmptyState>No pods yet.</EmptyState>
      ) : (
        <div className="space-y-4">
          {podVMs.map((p) => (
            <PodRow key={p.pod.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PodRow({ p }: { p: PodVM }) {
  return (
    <Link href={`/workspace/pods/${p.pod.id}`} className="block">
      <Card className="p-6 transition-shadow hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Identity + mix */}
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-lg font-semibold text-[#E5E5EA]">
                {p.pod.name}
              </h2>
              <span className="text-sm text-[#71757D]">{p.pod.tagline}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
              <Pill tone="blue">{p.retainerCount} retainer{p.retainerCount === 1 ? "" : "s"}</Pill>
              <Pill tone="neutral">{p.sprintCount} sprint{p.sprintCount === 1 ? "" : "s"}</Pill>
              <span>·</span>
              <span>{p.pod.members.length} members</span>
              {p.liveTests > 0 && <span>· {p.liveTests} live tests</span>}
            </div>
          </div>

          {/* Risk flags */}
          <div className="flex gap-2">
            {p.atRiskCount > 0 && <Pill tone="red" dot>{p.atRiskCount} at risk</Pill>}
            {p.awaitingClient > 0 && (
              <Pill tone="amber" dot>{p.awaitingClient} awaiting client</Pill>
            )}
            {p.atRiskCount === 0 && p.awaitingClient === 0 && (
              <Pill tone="green" dot>On track</Pill>
            )}
          </div>
        </div>

        {/* Capacity: this week / next week / month */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CapStat label="This week" used={p.capWeek} total={p.capacityTotal / 4} />
          <CapStat label="Next week" used={p.capNextWeek} total={p.capacityTotal / 4} />
          <CapStat label="This month" used={p.capacityUsed} total={p.capacityTotal} showPct />
        </div>
      </Card>
    </Link>
  );
}

function CapStat({
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
        <span className="font-medium text-[#9CA3AF]">{label}</span>
        <span className={`tabular-nums ${over ? "font-semibold text-rose-600" : "text-[#9CA3AF]"}`}>
          {used % 1 === 0 ? used : used.toFixed(1)} / {total % 1 === 0 ? total : total.toFixed(0)} pts
          {showPct && total > 0 ? ` · ${Math.round((used / total) * 100)}%` : ""}
        </span>
      </div>
      <ProgressBar value={used} max={total || 1} tone="blue" />
    </div>
  );
}
