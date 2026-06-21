"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  ensureSeed,
  getClients,
  getPods,
  getProjects,
  moveMemberToPod,
  swapMembers,
  updateMemberDetails,
} from "@/lib/pods-v2/data";
import {
  Client,
  Pod,
  PodMember,
  PodMemberRole,
  Project,
  RETAINER_SCOPE,
  RETAINER_VALUE_GBP,
  ROLE_LABEL,
  RetainerTier,
  SlipReason,
} from "@/lib/pods-v2/types";
import {
  capacityUsed,
  isMidWeekKickoff,
  projectValueGbp,
  shipsThisWeek,
} from "@/lib/pods-v2/calc";
import { formatDayMonth, todayYMD } from "@/lib/dates";
import {
  BrandWarmBadge,
  BucketBadge,
  CapacityMeter,
  MemberAvatar,
  StatusBadge,
} from "../components";

const CURRENCY = (n: number) =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const SLIP_REASON_LABEL: Record<SlipReason, string> = {
  scope: "Scope",
  capacity: "Capacity",
  skill: "Skill",
  dependency: "Dependency",
  external: "External",
};

export default function AdminClient() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureSeed();
    setPods(getPods());
    setProjects(getProjects());
    setClients(getClients());
    setLoading(false);
  }, []);

  const today = todayYMD();
  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c] as const)),
    [clients],
  );
  const podById = useMemo(
    () => new Map(pods.map((p) => [p.id, p] as const)),
    [pods],
  );

  const podStats = useMemo(() => {
    return pods.map((pod) => {
      const podProjects = projects.filter((p) => p.pod_id === pod.id);
      const podClients = clients.filter((c) => c.pod_id === pod.id);
      const used = capacityUsed(podProjects);
      const utilisation = pod.capacity_points_per_month
        ? Math.round((used / pod.capacity_points_per_month) * 100)
        : 0;
      const inflight = podProjects.filter(
        (p) => p.status === "in_progress" || p.status === "in_review",
      );
      const shippingThisWeek = podProjects.filter((p) =>
        shipsThisWeek(p, today),
      );
      const midWeek = podProjects.filter(isMidWeekKickoff);
      const slipped = podProjects.filter((p) => p.status === "slipped");

      const projectValue = podProjects
        .filter((p) => p.status !== "shipped" && p.status !== "slipped")
        .reduce((sum, p) => sum + projectValueGbp(p.pages), 0);

      const retainerMrr = podClients.reduce(
        (sum, c) => sum + RETAINER_VALUE_GBP[c.retainer_tier],
        0,
      );

      return {
        pod,
        used,
        utilisation,
        inflightCount: inflight.length,
        shippingThisWeek,
        midWeekCount: midWeek.length,
        slipped,
        projectValue,
        retainerMrr,
      };
    });
  }, [pods, projects, clients, today]);

  const allMidWeek = useMemo(
    () =>
      projects
        .filter(isMidWeekKickoff)
        .map((p) => ({ project: p, pod: podById.get(p.pod_id) })),
    [projects, podById],
  );

  const allSlippedThisWeek = useMemo(
    () =>
      projects.filter(
        (p) => p.status === "slipped" && shipsThisWeek(p, today),
      ),
    [projects, today],
  );

  const slipReasonBreakdown = useMemo(() => {
    const counts: Record<SlipReason, number> = {
      scope: 0,
      capacity: 0,
      skill: 0,
      dependency: 0,
      external: 0,
    };
    for (const p of allSlippedThisWeek) {
      if (p.slip_reason) counts[p.slip_reason]++;
    }
    return counts;
  }, [allSlippedThisWeek]);

  const overCapacity = podStats.filter((s) => s.utilisation > 100);
  const nearCapacity = podStats.filter(
    (s) => s.utilisation >= 80 && s.utilisation <= 100,
  );

  const fridayCutoff = useMemo(() => {
    const now = new Date();
    const friday = new Date(now);
    const dow = now.getDay();
    const daysToFri = (5 - dow + 7) % 7;
    friday.setDate(now.getDate() + daysToFri);
    friday.setHours(17, 0, 0, 0);
    const ms = friday.getTime() - now.getTime();
    if (ms <= 0) return "Friday cutoff passed";
    const hours = Math.floor(ms / 1000 / 60 / 60);
    const mins = Math.floor((ms / 1000 / 60) % 60);
    if (hours < 24) return `${hours}h ${mins}m to Friday 5pm`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h to Friday 5pm`;
  }, []);

  const shippingThisWeekByPod = useMemo(() => {
    const out: Array<{ pod: Pod; projects: Project[] }> = [];
    for (const pod of pods) {
      const ps = projects.filter(
        (p) => p.pod_id === pod.id && shipsThisWeek(p, today),
      );
      if (ps.length) out.push({ pod, projects: ps });
    }
    return out;
  }, [pods, projects, today]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="text-sm text-[#71757D]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
      <div className="flex items-center justify-between">
        <Link
          href="/pods-v2"
          className="inline-flex items-center gap-1 text-xs text-[#71757D] hover:text-[#E5E5EA]"
        >
          <ChevronLeftIcon className="size-3.5" />
          All pods
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/pods-v2/pipeline"
            className="text-[11px] uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA]"
          >
            Pipeline →
          </Link>
          <div className="text-[11px] uppercase tracking-wider text-[#71757D]">
            Admin overlay
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
            Cross-pod oversight
          </p>
          <h1 className="mt-1 text-3xl font-medium">
            Pods admin
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#71757D]">
            Where the system is stressed, who&apos;s overloaded, what&apos;s
            slipping. Refreshed live from pod data.
          </p>
        </div>
      </div>

      {/* THREE POD GRID */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {podStats.map((s) => (
          <Link
            key={s.pod.id}
            href={`/pods-v2/${s.pod.id}`}
            className="group rounded-2xl border border-[#2A2A2A] bg-[#181818] p-5 shadow-[var(--shadow-soft)] transition-all hover:border-[#C5C5C5] hover:shadow-[var(--shadow-card)]"
          >
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="text-xl font-medium">
                  <span className="text-[#E5E5EA]">{s.pod.name}</span>
                </h2>
                <p className="text-[11px] text-[#71757D]">{s.pod.tagline}</p>
              </div>
              <span className="text-[11px] tabular-nums text-[#71757D]">
                {s.utilisation}% util
              </span>
            </div>
            <div className="mt-3">
              <CapacityMeter
                used={s.used}
                total={s.pod.capacity_points_per_month}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <Stat
                label="In flight"
                value={s.inflightCount.toString()}
              />
              <Stat
                label="Ships Thu"
                value={s.shippingThisWeek.length.toString()}
                tone={
                  s.shippingThisWeek.length > 0 ? "thursday" : undefined
                }
              />
              <Stat
                label="Mid-week"
                value={s.midWeekCount.toString()}
                tone={s.midWeekCount > 0 ? "alert" : undefined}
              />
            </div>
          </Link>
        ))}
      </div>

      {/* CROSS-POD ALERT STRIP */}
      <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-4">
        <AlertCard
          tone={allMidWeek.length > 0 ? "red" : "neutral"}
          title="Mid-week kickoffs"
          value={allMidWeek.length}
          desc="Non-Monday starts not flagged Rush"
        />
        <AlertCard
          tone={overCapacity.length > 0 ? "amber" : "neutral"}
          title="Capacity overruns"
          value={overCapacity.length}
          desc={
            overCapacity.length === 0
              ? `${nearCapacity.length} pod${nearCapacity.length === 1 ? "" : "s"} near 80,100%`
              : `${overCapacity.map((s) => s.pod.name).join(", ")}`
          }
        />
        <AlertCard
          tone={allSlippedThisWeek.length > 0 ? "amber" : "neutral"}
          title="Slipped this Thursday"
          value={allSlippedThisWeek.length}
          desc={
            allSlippedThisWeek.length === 0
              ? "All deliveries on track"
              : Object.entries(slipReasonBreakdown)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => `${SLIP_REASON_LABEL[k as SlipReason]} ×${v}`)
                  .join(" · ")
          }
        />
        <div className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            Friday cutoff
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {fridayCutoff}
          </div>
          <div className="mt-0.5 text-[11px] text-[#71757D]">
            After 5pm Friday, kickoffs push to next-next Monday
          </div>
        </div>
      </div>

      {/* MID-WEEK DETAIL */}
      {allMidWeek.length > 0 && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-900">
            <ExclamationTriangleIcon className="size-4" />
            Mid-week kickoff violations
          </div>
          <div className="mt-2 space-y-1 text-sm">
            {allMidWeek.map(({ project, pod }) => {
              const client = clientById.get(project.client_id);
              return (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-[#181818] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {project.name}
                    </div>
                    <div className="text-[11px] text-[#71757D]">
                      {pod?.name} · {client?.name ?? ","}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <BucketBadge bucket={project.bucket} />
                    <span className="text-rose-700">
                      Started {formatDayMonth(project.kickoff_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* REVENUE TABLE */}
      <div className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
          Revenue per pod
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#181818] shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[#2A2A2A] bg-[#0C0C0C] text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
              <tr>
                <th className="px-4 py-2.5 text-left">Pod</th>
                <th className="px-4 py-2.5 text-right">Active project value</th>
                <th className="px-4 py-2.5 text-right">Retainer MRR</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5 text-right">Utilisation</th>
                <th className="px-4 py-2.5 text-right">£ / pt used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {podStats.map((s) => {
                const total = s.projectValue + s.retainerMrr;
                const perPoint =
                  s.used > 0 ? Math.round(total / s.used) : 0;
                return (
                  <tr key={s.pod.id} className="hover:bg-[#0C0C0C]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#E5E5EA]">
                        {s.pod.name}
                      </div>
                      <div className="text-[11px] text-[#71757D]">
                        {s.pod.tagline}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {CURRENCY(s.projectValue)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {CURRENCY(s.retainerMrr)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {CURRENCY(total)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={
                          s.utilisation > 100
                            ? "text-rose-700"
                            : s.utilisation >= 80
                              ? "text-amber-700"
                              : "text-emerald-700"
                        }
                      >
                        {s.utilisation}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#71757D]">
                      {perPoint > 0 ? CURRENCY(perPoint) : ","}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[#71757D]">
          A pod loaded with low £/pt = bad project mix. High £/pt = leverage.
        </p>
      </div>

      {/* THIS WEEK SHIPPING */}
      <div className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
          Shipping this week
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {shippingThisWeekByPod.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#181818] px-4 py-6 text-center text-sm text-[#71757D] lg:col-span-3">
              Nothing shipping this week.
            </div>
          )}
          {shippingThisWeekByPod.map(({ pod, projects: ps }) => (
            <div
              key={pod.id}
              className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="text-sm font-medium text-[#E5E5EA]">
                {pod.name}
              </div>
              <div className="mt-2 space-y-2">
                {ps.map((p) => {
                  const client = clientById.get(p.client_id);
                  return (
                    <div
                      key={p.id}
                      className="rounded-lg border border-[#2A2A2A] bg-[#181818] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-[#71757D]">
                            {client?.name ?? ","}
                          </div>
                        </div>
                        <BucketBadge bucket={p.bucket} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <StatusBadge status={p.status} />
                        {client && <BrandWarmBadge active={client.brand_warm} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[#71757D]">
          Spot-check Thursday morning before designs go out.
        </p>
      </div>

      {/* POD ROSTER · move people between pods */}
      <RosterEditor pods={pods} onMutate={() => setPods(getPods())} />

      {/* CROSS-POD CLIENT ROSTER */}
      <div className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
          Client roster · all pods
        </h2>
        <p className="mt-0.5 text-xs text-[#71757D]">
          Click into a client to open their engagement.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#181818] px-4 py-6 text-center text-xs text-[#71757D] md:col-span-2 lg:col-span-3 xl:col-span-4">
              No clients on roster.
            </div>
          )}
          {clients.map((c) => {
            const pod = podById.get(c.pod_id);
            return (
              <Link
                key={c.id}
                href={`/engagements/${c.id}`}
                className="group rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 shadow-[var(--shadow-soft)] transition-colors hover:border-white/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold leading-tight">
                      {c.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#71757D]">
                      {pod?.name ?? "Unassigned"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                      c.retainer_tier === "8k"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : c.retainer_tier === "12k"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-[#2A2A2A] bg-[#222222] text-[#71757D]"
                    }`}
                  >
                    {c.retainer_tier === "none"
                      ? "Project-only"
                      : `£${c.retainer_tier} retainer`}
                  </span>
                  {c.brand_warm && (
                    <span className="rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                      Brand-warm
                    </span>
                  )}
                </div>
                {c.retainer_tier !== "none" && (
                  <div className="mt-2 text-[11px] text-[#71757D]">
                    {RETAINER_SCOPE[c.retainer_tier]}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Roster editor ──────────────────────────────────────────────────

/* Lets admins move members between pods, swap pairs (e.g. secondaries
 * by timezone), change a member's role, and rename / un-placeholder a
 * TO-HIRE slot. Click a member to select; click another slot to swap;
 * use the inline controls for one-off edits. Avatars stay attached to
 * the member through any move because IDs are stable. */
function RosterEditor({ pods, onMutate }: { pods: Pod[]; onMutate: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function handleClick(memberId: string) {
    if (!selected) {
      setSelected(memberId);
      return;
    }
    if (selected === memberId) {
      setSelected(null);
      return;
    }
    swapMembers(selected, memberId);
    setSelected(null);
    onMutate();
  }

  function moveTo(memberId: string, targetPodId: string) {
    moveMemberToPod(memberId, targetPodId);
    onMutate();
  }

  function changeRole(memberId: string, role: PodMemberRole) {
    updateMemberDetails(memberId, { role });
    onMutate();
  }

  function commitRename(member: PodMember) {
    const next = renameValue.trim();
    if (!next || next === member.name) {
      setRenamingId(null);
      setRenameValue("");
      return;
    }
    updateMemberDetails(member.id, {
      name: next,
      is_placeholder: next.toUpperCase() === "TO HIRE",
    });
    setRenamingId(null);
    setRenameValue("");
    onMutate();
  }

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
            Pod roster
          </h2>
          <p className="mt-0.5 text-xs text-[#71757D]">
            Click a member to select, then click another to swap. Use the move
            buttons to send a member to a different pod, or change role inline.
            Avatars and task assignments follow the member.
          </p>
        </div>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[11px] font-medium text-[#71757D] hover:border-white hover:text-[#E5E5EA]"
          >
            Cancel selection
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {pods.map((pod) => (
          <div
            key={pod.id}
            className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 shadow-[var(--shadow-soft)]"
          >
            <div className="mb-2 flex items-baseline justify-between">
              <div>
                <div className="text-sm font-semibold text-[#E5E5EA]">
                  {pod.name}
                </div>
                <div className="text-[11px] text-[#71757D]">{pod.tagline}</div>
              </div>
            </div>
            <div className="space-y-2">
              {pod.members.map((m) => {
                const isSelected = selected === m.id;
                const isRenaming = renamingId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`rounded-lg border px-2.5 py-2 transition-colors ${
                      isSelected
                        ? "border-white bg-[#1B1B1B]/[0.03]"
                        : "border-[#2A2A2A] bg-[#181818] hover:border-[#C5C5C5]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleClick(m.id)}
                        className="shrink-0"
                        title={
                          selected
                            ? selected === m.id
                              ? "Click to deselect"
                              : `Swap with ${pods.flatMap((pp) => pp.members).find((x) => x.id === selected)?.name ?? "selected"}`
                            : "Click to select for swap"
                        }
                      >
                        <MemberAvatar member={m} size="sm" />
                      </button>
                      <div className="min-w-0 flex-1">
                        {isRenaming ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => commitRename(m)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(m);
                              if (e.key === "Escape") {
                                setRenamingId(null);
                                setRenameValue("");
                              }
                            }}
                            className="w-full rounded-md border border-white bg-[#181818] px-1.5 py-0.5 text-xs"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingId(m.id);
                              setRenameValue(m.name);
                            }}
                            className="block w-full truncate text-left text-sm font-medium text-[#E5E5EA] hover:underline"
                            title="Click to rename"
                          >
                            {m.name}
                            {m.is_placeholder && (
                              <span className="ml-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                                Placeholder
                              </span>
                            )}
                          </button>
                        )}
                        <select
                          value={m.role}
                          onChange={(e) =>
                            changeRole(m.id, e.target.value as PodMemberRole)
                          }
                          className="mt-0.5 w-full rounded-md border border-transparent bg-transparent px-0 py-0 text-[11px] text-[#71757D] hover:border-[#2A2A2A] focus:border-white focus:outline-none"
                        >
                          {(
                            [
                              "primary_designer",
                              "secondary_designer",
                              "primary_dev",
                              "secondary_dev",
                            ] as PodMemberRole[]
                          ).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {pods
                        .filter((other) => other.id !== pod.id)
                        .map((other) => (
                          <button
                            key={other.id}
                            type="button"
                            onClick={() => moveTo(m.id, other.id)}
                            className="rounded-md border border-[#2A2A2A] bg-[#181818] px-1.5 py-0.5 text-[10px] font-medium text-[#71757D] hover:border-white hover:text-[#E5E5EA]"
                          >
                            → {other.name}
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })}
              {pod.members.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#2A2A2A] bg-[#181818] px-3 py-4 text-center text-[11px] text-[#71757D]">
                  No members. Move someone in from another pod.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[#71757D]">
        Tip: to swap two secondaries by timezone, click one, then click the
        other. Roles + pods swap in one click.
      </p>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "alert" | "thursday";
}) {
  const cls =
    tone === "alert"
      ? "bg-rose-50 text-rose-800"
      : tone === "thursday"
        ? "bg-[#1B1B1B]/[0.05] text-[#E5E5EA]"
        : "bg-[#0C0C0C] text-[#E5E5EA]";
  return (
    <div className={`rounded-lg px-2 py-2 ${cls}`}>
      <div className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function AlertCard({
  tone,
  title,
  value,
  desc,
}: {
  tone: "red" | "amber" | "neutral";
  title: string;
  value: number;
  desc: string;
}) {
  const cls =
    tone === "red"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-[#2A2A2A] bg-[#181818] text-[#E5E5EA]";
  return (
    <div className={`rounded-xl border p-4 ${cls} shadow-[var(--shadow-soft)]`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        {title}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] opacity-75">{desc}</div>
    </div>
  );
}
