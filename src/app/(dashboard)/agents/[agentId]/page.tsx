"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { getAgent, getTasksForAgent, updateAgent } from "@/lib/agents/data";
import type { Agent, AgentStatus, AgentTask } from "@/lib/agents/types";
import { AGENT_STATUS_META, AVAILABLE_MODELS } from "@/lib/agents/types";
import { PixelPortrait } from "@/components/agents/pixel-portrait";
import { StatusDot } from "@/components/agents/status-dot";
import { ChatTab } from "@/components/agents/chat-tab";
import { TasksTab } from "@/components/agents/tasks-tab";
import { ConfigTab } from "@/components/agents/config-tab";
import { PerformanceTab } from "@/components/agents/performance-tab";

type TabKey = "chat" | "tasks" | "config" | "performance";
const TABS: { key: TabKey; label: string }[] = [
  { key: "chat",        label: "Chat" },
  { key: "tasks",       label: "Tasks" },
  { key: "config",      label: "Config" },
  { key: "performance", label: "Performance" },
];

export default function AgentDetailPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params);
  const router = useRouter();
  const role = useRole();
  const canEdit = role === "admin";

  const [agent, setAgent] = useState<Agent | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [tab, setTab] = useState<TabKey>("chat");
  const [loading, setLoading] = useState(true);

  async function reloadAgent() {
    const a = await getAgent(agentId);
    setAgent(a);
  }

  async function reloadTasks() {
    const t = await getTasksForAgent(agentId);
    setTasks(t);
  }

  /** Optimistic status update from ChatTab — instant sprite swap, no DB
   * round-trip. The server-side persistence in /run is best-effort. */
  function applyOptimisticStatus(status: AgentStatus) {
    setAgent((prev) => (prev ? { ...prev, status } : prev));
  }

  /** Called after a run finishes so the tasks tab fills in. */
  async function reloadAfterRun() {
    await reloadTasks();
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [a, t] = await Promise.all([getAgent(agentId), getTasksForAgent(agentId)]);
      if (cancelled) return;
      setAgent(a);
      setTasks(t);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [agentId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
        <div className="h-8 w-48 bg-border rounded animate-pulse mb-6" />
        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          <div className="h-[400px] rounded-xl border border-border bg-surface animate-pulse" />
          <div className="h-[400px] rounded-xl border border-border bg-surface animate-pulse" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
        <button onClick={() => router.push("/agents")} className="mb-6 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground">
          <ArrowLeftIcon className="size-4" /> Mission Control
        </button>
        <div className="rounded-xl border border-dashed border-border bg-surface/40 p-12 text-center">
          <h1 className="text-lg font-semibold text-foreground mb-1">Agent not found</h1>
          <p className="text-sm text-subtle">No agent with id <code className="font-mono">{agentId}</code>.</p>
        </div>
      </div>
    );
  }

  const statusMeta = AGENT_STATUS_META[agent.status];
  const modelLabel = AVAILABLE_MODELS.find((m) => m.value === agent.model)?.label ?? agent.model;

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
      <Link
        href="/agents"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Mission Control
      </Link>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* ── Left column: portrait + bio ── */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
            <div className="flex justify-center mb-4">
              <PixelPortrait agent={agent} size={192} />
            </div>
            <div className="text-center mb-3">
              <h1 className="text-xl font-semibold text-foreground">{agent.name}</h1>
              <p className="text-xs uppercase tracking-wider text-subtle">{agent.role}</p>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <StatusDot status={agent.status} size={8} />
              <span className="text-xs font-medium text-foreground">{statusMeta.label}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-border">{agent.description}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] space-y-3">
            <Field label="Model" value={modelLabel} />
            <Field label="Tools" value={agent.tools.length === 0 ? "none" : `${agent.tools.length} configured`} />
            <Field label="Tasks run" value={String(tasks.length)} />
            {canEdit && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1.5">Set status</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(AGENT_STATUS_META) as Array<keyof typeof AGENT_STATUS_META>).map((s) => (
                    <button
                      key={s}
                      onClick={async () => {
                        await updateAgent(agent.id, { status: s });
                        reloadAgent();
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all ${
                        agent.status === s
                          ? "bg-white text-background"
                          : "border border-border text-subtle hover:text-foreground hover:border-white"
                      }`}
                    >
                      <StatusDot status={s} size={6} withRing={false} />
                      {AGENT_STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Right column: tabs ── */}
        <main>
          <div className="mb-4 flex border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "border-b-2 border-white text-foreground"
                    : "text-subtle hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            {tab === "chat" && (
              <ChatTab
                agent={agent}
                onStatusChange={applyOptimisticStatus}
                onRunComplete={reloadAfterRun}
              />
            )}
            {tab === "tasks" && <TasksTab tasks={tasks} agent={agent} />}
            {tab === "config" && <ConfigTab agent={agent} canEdit={canEdit} onSaved={reloadAgent} />}
            {tab === "performance" && <PerformanceTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-semibold uppercase tracking-wider text-subtle">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
