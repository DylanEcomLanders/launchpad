"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ensureSeed,
  getClients,
  getPods,
  getProjects,
  getTasks,
} from "@/lib/pods-v2/data";
import {
  Client,
  Pod,
  Project,
  Task,
  PodBlocker,
} from "@/lib/pods-v2/types";
import { todayYMD, formatDayMonth } from "@/lib/dates";

/* Standup view — what changed in the last 24h, scoped to the whole
 * agency. Five lanes: tasks created, blockers raised, blockers
 * resolved, projects shipping in next 48h, slipped projects (active).
 *
 * Goal: replace "scroll through 3 pods to figure out what happened"
 * with "open one screen, get the whole picture." Designed for the
 * Monday + daily standup; readable in 30 seconds. */
export default function StandupClient() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  function hydrateLocal() {
    setPods(getPods());
    setTasks(getTasks());
    setProjects(getProjects());
    setClients(getClients());
  }

  useEffect(() => {
    ensureSeed();
    hydrateLocal();
    /* Cloud-truth pull so the standup reflects multi-device state. */
    import("@/lib/pods-v2/sync").then(({ bootstrapPodsSync }) => {
      bootstrapPodsSync().then((changed) => {
        if (changed) hydrateLocal();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = todayYMD();
  const dayAgoMs = Date.now() - 24 * 60 * 60 * 1000;

  const projectById = useMemo(() => {
    const m = new Map<string, Project>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);
  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);
  const podById = useMemo(() => {
    const m = new Map<string, Pod>();
    for (const p of pods) m.set(p.id, p);
    return m;
  }, [pods]);
  const memberById = useMemo(() => {
    const m = new Map<string, { name: string; pod: string }>();
    for (const p of pods) {
      for (const mem of p.members) m.set(mem.id, { name: mem.name, pod: p.name });
    }
    return m;
  }, [pods]);

  const newTasks = useMemo(
    () =>
      tasks
        .filter((t) => new Date(t.created_at).getTime() >= dayAgoMs)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [tasks, dayAgoMs],
  );

  const blockersRaised: Array<{ blocker: PodBlocker; pod: Pod }> = useMemo(() => {
    const out: Array<{ blocker: PodBlocker; pod: Pod }> = [];
    for (const p of pods) {
      for (const b of p.blockers || []) {
        if (new Date(b.raised_at).getTime() >= dayAgoMs) out.push({ blocker: b, pod: p });
      }
    }
    return out.sort((a, b) => b.blocker.raised_at.localeCompare(a.blocker.raised_at));
  }, [pods, dayAgoMs]);

  const blockersResolved: Array<{ blocker: PodBlocker; pod: Pod }> = useMemo(() => {
    const out: Array<{ blocker: PodBlocker; pod: Pod }> = [];
    for (const p of pods) {
      for (const b of p.blockers || []) {
        if (b.resolved_at && new Date(b.resolved_at).getTime() >= dayAgoMs) {
          out.push({ blocker: b, pod: p });
        }
      }
    }
    return out.sort((a, b) =>
      (b.blocker.resolved_at || "").localeCompare(a.blocker.resolved_at || ""),
    );
  }, [pods, dayAgoMs]);

  const shippingSoon = useMemo(() => {
    const twoDaysOut = (() => {
      const d = new Date(`${today}T12:00:00`);
      d.setDate(d.getDate() + 2);
      return d.toISOString().slice(0, 10);
    })();
    return projects
      .filter(
        (p) =>
          p.status !== "shipped" &&
          p.status !== "slipped" &&
          p.delivery_date >= today &&
          p.delivery_date <= twoDaysOut,
      )
      .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  }, [projects, today]);

  const slipped = useMemo(
    () => projects.filter((p) => p.status === "slipped"),
    [projects],
  );

  const totalEvents =
    newTasks.length +
    blockersRaised.length +
    blockersResolved.length +
    shippingSoon.length +
    slipped.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Standup
          </p>
          <h1 className="text-2xl font-semibold text-[#1B1B1B]">
            What changed in the last 24h
          </h1>
          <p className="mt-1 text-xs text-[#7A7A7A]">
            One-screen agency-wide brief. Read top-to-bottom in standup; nothing to click.
          </p>
        </div>
        <Link
          href="/pods-v2"
          className="text-[11px] text-[#7A7A7A] hover:text-[#1B1B1B] hover:underline"
        >
          ← All pods
        </Link>
      </div>

      {totalEvents === 0 && (
        <div className="rounded-xl border border-dashed border-[#E5E5EA] bg-[#FAFAFA] px-4 py-12 text-center text-sm text-[#A0A0A0]">
          No notable activity in the last 24 hours.
        </div>
      )}

      {newTasks.length > 0 && (
        <Lane title="New tasks" tone="blue" count={newTasks.length}>
          {newTasks.slice(0, 12).map((t) => {
            const project = projectById.get(t.project_id);
            const client = project ? clientById.get(project.client_id) : undefined;
            const owner = memberById.get(t.assigned_to);
            return (
              <Row key={t.id}>
                <span className="text-sm font-medium text-[#1B1B1B]">{t.title}</span>
                <span className="text-[11px] text-[#7A7A7A]">
                  {client?.name ? `${client.name} · ` : ""}
                  {owner ? owner.name : ""}
                  {owner ? ` (${owner.pod})` : ""}
                </span>
              </Row>
            );
          })}
          {newTasks.length > 12 && (
            <div className="px-3 py-2 text-[10px] text-[#A0A0A0]">
              + {newTasks.length - 12} more
            </div>
          )}
        </Lane>
      )}

      {blockersRaised.length > 0 && (
        <Lane title="Blockers raised" tone="red" count={blockersRaised.length}>
          {blockersRaised.map(({ blocker, pod }) => (
            <Row key={blocker.id}>
              <span className="text-sm font-medium text-[#1B1B1B]">{blocker.title}</span>
              <span className="text-[11px] text-[#7A7A7A]">
                {pod.name}
                {blocker.raised_by ? ` · ${blocker.raised_by}` : ""}
                {blocker.description ? ` · ${blocker.description}` : ""}
              </span>
            </Row>
          ))}
        </Lane>
      )}

      {blockersResolved.length > 0 && (
        <Lane title="Blockers resolved" tone="green" count={blockersResolved.length}>
          {blockersResolved.map(({ blocker, pod }) => (
            <Row key={blocker.id}>
              <span className="text-sm font-medium text-[#1B1B1B]">{blocker.title}</span>
              <span className="text-[11px] text-[#7A7A7A]">
                {pod.name}
                {blocker.resolved_by ? ` · resolved by ${blocker.resolved_by}` : ""}
              </span>
            </Row>
          ))}
        </Lane>
      )}

      {shippingSoon.length > 0 && (
        <Lane title="Shipping in next 48h" tone="amber" count={shippingSoon.length}>
          {shippingSoon.map((p) => {
            const client = clientById.get(p.client_id);
            const pod = podById.get(p.pod_id);
            return (
              <Row key={p.id}>
                <span className="text-sm font-medium text-[#1B1B1B]">{p.name}</span>
                <span className="text-[11px] text-[#7A7A7A]">
                  {client?.name ? `${client.name} · ` : ""}
                  {pod?.name ? `${pod.name} · ` : ""}
                  Due {formatDayMonth(p.delivery_date)}
                </span>
              </Row>
            );
          })}
        </Lane>
      )}

      {slipped.length > 0 && (
        <Lane title="Slipped (still active)" tone="red" count={slipped.length}>
          {slipped.map((p) => {
            const client = clientById.get(p.client_id);
            const pod = podById.get(p.pod_id);
            return (
              <Row key={p.id}>
                <span className="text-sm font-medium text-[#1B1B1B]">{p.name}</span>
                <span className="text-[11px] text-[#7A7A7A]">
                  {client?.name ? `${client.name} · ` : ""}
                  {pod?.name ? `${pod.name} · ` : ""}
                  Was due {formatDayMonth(p.delivery_date)}
                  {p.slip_reason ? ` · ${p.slip_reason}` : ""}
                </span>
              </Row>
            );
          })}
        </Lane>
      )}
    </div>
  );
}

function Lane({
  title,
  tone,
  count,
  children,
}: {
  title: string;
  tone: "red" | "amber" | "blue" | "green" | "gray";
  count: number;
  children: React.ReactNode;
}) {
  const dot =
    tone === "red"
      ? "bg-rose-500"
      : tone === "amber"
        ? "bg-amber-500"
        : tone === "blue"
          ? "bg-blue-500"
          : tone === "green"
            ? "bg-emerald-500"
            : "bg-[#A0A0A0]";
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <span className={`size-2 rounded-full ${dot}`} />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
          {title}
        </h2>
        <span className="text-[10px] tabular-nums text-[#A0A0A0]">{count}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E5E5EA] bg-white">
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[#EDEDEF] px-3 py-2 last:border-b-0">
      {children}
    </div>
  );
}
