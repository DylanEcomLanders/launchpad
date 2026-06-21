"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getPodById,
  getClientsForPod,
  getUnassignedClients,
  assignClientToPod,
} from "@/lib/pods/data";
import type { Pod } from "@/lib/pods/types";
import { TIER_LABEL, TIER_COLOR } from "@/lib/pods/types";
import type { PortalData, PortalProject } from "@/lib/portal/types";
import { ChevronLeftIcon, PlusIcon, ArrowTopRightOnSquareIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const STALE_DAYS = 7;

interface ProjectRow {
  portalId: string;
  clientName: string;
  project: PortalProject;
  daysSinceUpdate: number;
  blocker: PortalData["blocker"];
  deadline?: string;
}

export default function PodDetailClient({ podId }: { podId: string }) {
  const [pod, setPod] = useState<Pod | null>(null);
  const [clients, setClients] = useState<PortalData[]>([]);
  const [unassigned, setUnassigned] = useState<PortalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [assignChoice, setAssignChoice] = useState("");

  useEffect(() => {
    (async () => {
      const [p, c, u] = await Promise.all([getPodById(podId), getClientsForPod(podId), getUnassignedClients()]);
      setPod(p);
      setClients(c);
      setUnassigned(u);
      setLoading(false);
    })();
  }, [podId]);

  const projectRows: ProjectRow[] = useMemo(() => {
    const rows: ProjectRow[] = [];
    for (const client of clients) {
      const updatedAt = client.updated_at ? new Date(client.updated_at).getTime() : Date.now();
      const days = Math.max(0, Math.floor((Date.now() - updatedAt) / 86_400_000));
      for (const project of client.projects ?? []) {
        if (project.status !== "active") continue;
        const currentPhase = (project.phases ?? []).find((ph) => ph.name === project.current_phase);
        rows.push({
          portalId: client.id,
          clientName: client.client_name,
          project,
          daysSinceUpdate: days,
          blocker: client.blocker,
          deadline: currentPhase?.deadline || currentPhase?.endDate,
        });
      }
    }
    rows.sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return b.daysSinceUpdate - a.daysSinceUpdate;
    });
    return rows;
  }, [clients]);

  const headerStats = useMemo(() => {
    const activeClients = clients.filter((c) => (c.projects ?? []).some((p) => p.status === "active")).length;
    const activeProjects = projectRows.length;
    const stale = projectRows.filter((r) => r.daysSinceUpdate > STALE_DAYS).length;
    const avgDays = projectRows.length
      ? Math.round(projectRows.reduce((sum, r) => sum + r.daysSinceUpdate, 0) / projectRows.length)
      : 0;
    return { activeClients, activeProjects, stale, avgDays };
  }, [clients, projectRows]);

  async function handleAssign() {
    if (!assignChoice) return;
    await assignClientToPod(assignChoice, podId);
    const [c, u] = await Promise.all([getClientsForPod(podId), getUnassignedClients()]);
    setClients(c);
    setUnassigned(u);
    setAssignChoice("");
    setShowAssign(false);
  }

  async function handleUnassign(portalId: string) {
    if (!confirm("Remove this client from the pod?")) return;
    await assignClientToPod(portalId, null);
    const [c, u] = await Promise.all([getClientsForPod(podId), getUnassignedClients()]);
    setClients(c);
    setUnassigned(u);
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0C0C0C] p-10"><p className="text-sm text-[#71757D]">Loading…</p></div>;
  }

  if (!pod) {
    return (
      <div className="min-h-screen bg-[#0C0C0C] p-10">
        <Link href="/pods" className="text-sm text-[#9CA3AF] hover:text-[#E5E5EA] inline-flex items-center gap-1">
          <ChevronLeftIcon className="size-4" /> Back to pods
        </Link>
        <p className="text-sm text-[#71757D] mt-4">Pod not found.</p>
      </div>
    );
  }

  const tierStyle = TIER_COLOR[pod.tier];

  return (
    <div className="min-h-screen bg-[#0C0C0C] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <Link href="/pods" className="text-xs text-[#9CA3AF] hover:text-[#E5E5EA] inline-flex items-center gap-1 mb-6">
          <ChevronLeftIcon className="size-3.5" /> All pods
        </Link>

        {/* Header */}
        <header className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-[#E5E5EA]">{pod.name}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}>
                  {TIER_LABEL[pod.tier]}
                </span>
              </div>
              {pod.description && <p className="text-sm text-[#9CA3AF]">{pod.description}</p>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <PersonChip role="AM" name={pod.am_name} />
              <PersonChip role="Designer" name={pod.designer_name} />
              <PersonChip role="Dev" name={pod.dev_name} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <Stat label="Active clients" value={headerStats.activeClients} />
            <Stat label="Active projects" value={headerStats.activeProjects} />
            <Stat label="MTD revenue" value="—" hint="v0.6" />
            <Stat label="Gross margin" value="—" hint="v0.6" />
          </div>
        </header>

        {/* Active Work */}
        <Section title="Active Work" subtitle="In-progress projects across this pod's clients, sorted by deadline">
          {projectRows.length === 0 ? (
            <EmptyRow text="No active projects in this pod." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#181818]">
              <table className="w-full text-xs">
                <thead className="bg-[#0C0C0C] border-b border-[#2A2A2A]">
                  <tr>
                    <Th>Client</Th>
                    <Th>Project</Th>
                    <Th>Stage</Th>
                    <Th>Days idle</Th>
                    <Th>Deadline</Th>
                    <Th>Blocker</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {projectRows.map((row) => (
                    <tr key={`${row.portalId}-${row.project.id}`} className="border-b border-[#2A2A2A] last:border-0 hover:bg-[#0C0C0C]">
                      <td className="px-3 py-2.5 font-medium text-[#E5E5EA]">{row.clientName}</td>
                      <td className="px-3 py-2.5 text-[#C7C9CD]">{row.project.name}</td>
                      <td className="px-3 py-2.5 text-[#C7C9CD]">{row.project.current_phase || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={row.daysSinceUpdate > STALE_DAYS ? "inline-flex items-center gap-1 text-amber-700 font-semibold" : "text-[#9CA3AF]"}>
                          {row.daysSinceUpdate > STALE_DAYS && <ExclamationTriangleIcon className="size-3" />}
                          {row.daysSinceUpdate}d
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[#9CA3AF]">{formatDeadline(row.deadline)}</td>
                      <td className="px-3 py-2.5">
                        {row.blocker ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-900 border border-rose-200">
                            {row.blocker.type}
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/tools/client-portal/${row.portalId}`} className="text-[#E5E5EA] hover:opacity-70">
                          <ArrowTopRightOnSquareIcon className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Clients */}
        <Section
          title="Clients"
          subtitle={`${clients.length} assigned to this pod`}
          action={
            <button
              onClick={() => setShowAssign((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0C0C0C] rounded-lg text-xs font-medium hover:bg-[#333]"
            >
              <PlusIcon className="size-3.5" />
              Add client
            </button>
          }
        >
          {showAssign && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 mb-4 flex gap-2">
              <select
                value={assignChoice}
                onChange={(e) => setAssignChoice(e.target.value)}
                className="flex-1 px-3 py-2 border border-[#2A2A2A] rounded-lg text-sm bg-[#181818]"
              >
                <option value="">Choose unassigned client…</option>
                {unassigned.map((c) => (
                  <option key={c.id} value={c.id}>{c.client_name}</option>
                ))}
              </select>
              <button onClick={handleAssign} disabled={!assignChoice} className="px-3 py-2 bg-white text-[#0C0C0C] rounded-lg text-xs font-medium disabled:opacity-40">
                Assign
              </button>
              <button onClick={() => { setShowAssign(false); setAssignChoice(""); }} className="px-3 py-2 bg-[#222222] rounded-lg text-xs font-medium">
                Cancel
              </button>
            </div>
          )}

          {clients.length === 0 ? (
            <EmptyRow text="No clients assigned. Click “Add client” to assign one." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clients.map((c) => {
                const isRetainer = c.client_type === "retainer";
                const activeCount = (c.projects ?? []).filter((p) => p.status === "active").length;
                const lastUpdate = c.updated_at ? formatRelative(c.updated_at) : "—";
                return (
                  <div key={c.id} className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Link href={`/tools/client-portal/${c.id}`} className="font-semibold text-sm text-[#E5E5EA] hover:underline truncate">
                        {c.client_name}
                      </Link>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${isRetainer ? "bg-emerald-50 text-emerald-900 border-emerald-200" : "bg-[#222222] text-[#9CA3AF] border-[#2A2A2A]"}`}>
                        {isRetainer ? "Retainer" : "Project"}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-[#9CA3AF] mb-3">
                      <div className="flex justify-between"><span className="text-[#71757D]">Active projects</span><span className="font-medium text-[#E5E5EA]">{activeCount}</span></div>
                      <div className="flex justify-between"><span className="text-[#71757D]">Last update</span><span className="font-medium text-[#E5E5EA]">{lastUpdate}</span></div>
                    </div>
                    <button onClick={() => handleUnassign(c.id)} className="text-[10px] text-[#71757D] hover:text-rose-600 uppercase tracking-wider font-semibold">
                      Remove from pod
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Health */}
        <Section title="Pod Health" subtitle="Lightweight v0.5 — flag stale work over 7 days">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Stat label="Avg days idle" value={`${headerStats.avgDays}d`} hint={headerStats.stale > 0 ? `${headerStats.stale} project${headerStats.stale > 1 ? "s" : ""} >${STALE_DAYS}d` : "all fresh"} />
            <Stat label="Stale (>7d)" value={headerStats.stale} hint={headerStats.stale > 0 ? "needs attention" : "good"} />
            <Stat label="On-time delivery" value="—" hint="v0.6" />
          </div>
        </Section>

        <p className="text-[10px] text-[#71757D] mt-10 text-center">
          v0.5 pilot · P&amp;L (revenue, contractor cost, margin) ships in v0.6 once invoice + payout tracking is wired.
        </p>
      </div>
    </div>
  );
}

function PersonChip({ role, name }: { role: string; name: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#222222] rounded-lg">
      <span className="size-6 rounded-full bg-white text-[#0C0C0C] text-[10px] font-semibold flex items-center justify-center">
        {(name || "?").slice(0, 1).toUpperCase()}
      </span>
      <div className="text-left">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#71757D] leading-none">{role}</p>
        <p className="text-xs font-medium text-[#E5E5EA] leading-tight mt-0.5">{name || "—"}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#E5E5EA] leading-tight">{value}</p>
      {hint && <p className="text-[10px] text-[#71757D] mt-0.5">{hint}</p>}
    </div>
  );
}

function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-[#E5E5EA]">{title}</h2>
          {subtitle && <p className="text-[11px] text-[#71757D]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-[#71757D]">{children}</th>;
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#181818] p-6 text-center">
      <p className="text-xs text-[#71757D]">{text}</p>
    </div>
  );
}

function formatDeadline(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const days = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
