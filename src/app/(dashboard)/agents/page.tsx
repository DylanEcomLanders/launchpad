"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAgents, getRecentTasks, getMissionStats } from "@/lib/agents/data";
import type { Agent, AgentTask } from "@/lib/agents/types";
import { TASK_STATUS_META } from "@/lib/agents/types";
import { AgentCard } from "@/components/agents/agent-card";
import { PixelPortrait } from "@/components/agents/pixel-portrait";

interface Stats { online: number; total: number; running: number; completedToday: number }

export default function AgentMissionControlPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recent, setRecent] = useState<AgentTask[]>([]);
  const [stats, setStats] = useState<Stats>({ online: 0, total: 0, running: 0, completedToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [a, r, s] = await Promise.all([getAgents(), getRecentTasks(10), getMissionStats()]);
      if (cancelled) return;
      setAgents(a);
      setRecent(r);
      setStats(s);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const agentById = new Map(agents.map((a) => [a.id, a]));

  return (
    <div className="relative min-h-full">
      {/* Pixel-art "town square" tile background — keeps the RPG feeling */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #E5E5EA 1px, transparent 1px), linear-gradient(to bottom, #E5E5EA 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse at top, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 80%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-baseline gap-3 mb-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B]">Mission Control</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">
              v0.5
            </span>
          </div>
          <p className="text-sm text-[#7A7A7A] max-w-xl">
            The Ecom Landers AI workforce. Click any NPC to brief them, review their task history, or tweak their system prompt.
          </p>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatCard label="Agents online" value={`${stats.online}/${stats.total}`} dot="#10B981" />
          <StatCard label="Tasks running" value={stats.running} dot="#F59E0B" />
          <StatCard label="Completed today" value={stats.completedToday} dot="#3B82F6" />
          <StatCard label="Total agents" value={stats.total} dot="#1B1B1B" />
        </div>

        {/* Agent grid */}
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">Roster</h2>
            <span className="text-[11px] text-[#A0A0A0]">{agents.length} agents</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[200px] rounded-xl border border-[#E5E5EA] bg-white animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">Recent activity</h2>
            <span className="text-[11px] text-[#A0A0A0]">{recent.length} entries</span>
          </div>

          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E5E5EA] bg-white/40 p-8 text-center">
              <p className="text-sm text-[#7A7A7A]">No tasks yet — pick an NPC and brief them.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recent.map((task) => {
                const agent = agentById.get(task.agentId);
                const meta = TASK_STATUS_META[task.status];
                return (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg border border-[#E5E5EA] bg-white px-3 py-2.5 shadow-[var(--shadow-soft)]"
                  >
                    {agent && <PixelPortrait agent={agent} size={32} static />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/agents/${task.agentId}`}
                          className="text-sm font-semibold text-[#1B1B1B] hover:underline"
                        >
                          {agent?.name ?? task.agentId}
                        </Link>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[#7A7A7A]">{task.input}</p>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-[#A0A0A0]">
                      {formatRelative(task.startedAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, dot }: { label: string; value: string | number; dot: string }) {
  return (
    <div className="rounded-xl border border-[#E5E5EA] bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: dot }} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-[#1B1B1B]">{value}</div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
