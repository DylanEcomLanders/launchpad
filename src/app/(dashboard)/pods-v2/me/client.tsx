"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ensureSeed,
  getClients,
  getCroLeads,
  getPods,
  getProjects,
  getTasks,
  updateTaskStatus,
} from "@/lib/pods-v2/data";
import {
  Client,
  PodMember,
  Project,
  Task,
} from "@/lib/pods-v2/types";
import { todayYMD, formatDayMonth } from "@/lib/dates";

const ME_KEY = "launchpad-pods-v2-me";

/* "Today" view, per-member filter that surfaces what each person
 * needs to do RIGHT NOW. No auth identity in this app, so visitor
 * picks their member from a dropdown; choice persists in localStorage.
 *
 * Sections: overdue → due today → in progress → up next (next 7 days).
 * Click the status circle to cycle. Done tasks hidden by default. */
export default function MeClient() {
  /* Team-flavour detection, keeps back link inside the (team) layout
   * when mounted at /team/pods/me. */
  const pathname = usePathname();
  const linkBase = pathname?.startsWith("/team/pods") ? "/team/pods" : "/pods-v2";
  const [meId, setMeId] = useState<string>("");
  const [members, setMembers] = useState<PodMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  function hydrateLocal() {
    const pods = getPods();
    const allMembers = pods.flatMap((p) => p.members);
    const cros = getCroLeads();
    setMembers([...allMembers, ...cros]);
    setTasks(getTasks());
    setProjects(getProjects());
    setClients(getClients());
  }

  useEffect(() => {
    ensureSeed();
    hydrateLocal();
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(ME_KEY);
      if (stored) setMeId(stored);
    }
    /* Pull cloud-truth pods data so this device sees the same tasks
     * everyone else does. Refresh local state once any changes have
     * been merged. */
    import("@/lib/pods-v2/sync").then(({ bootstrapPodsSync }) => {
      bootstrapPodsSync().then((changed) => {
        if (changed) hydrateLocal();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    setTasks(getTasks());
  }
  function setMe(id: string) {
    setMeId(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(ME_KEY, id);
      else localStorage.removeItem(ME_KEY);
    }
  }

  const today = todayYMD();
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

  const myTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.assigned_to === meId && t.status !== "done",
      ),
    [tasks, meId],
  );

  /* Bucket the open tasks by urgency. Tasks with no due_date are
   * treated as "up next" (low urgency) rather than overdue, since the
   * absence of a date is not the same as a missed one. */
  const buckets = useMemo(() => {
    const sevenDaysOut = (() => {
      const d = new Date(`${today}T12:00:00`);
      d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0, 10);
    })();
    const overdue: Task[] = [];
    const dueToday: Task[] = [];
    const inProgress: Task[] = [];
    const upNext: Task[] = [];
    for (const t of myTasks) {
      if (t.status === "in_progress") {
        inProgress.push(t);
        continue;
      }
      if (t.due_date && t.due_date < today) overdue.push(t);
      else if (t.due_date === today) dueToday.push(t);
      else if (t.due_date && t.due_date <= sevenDaysOut) upNext.push(t);
      else upNext.push(t);
    }
    const byDue = (a: Task, b: Task) => (a.due_date || "").localeCompare(b.due_date || "");
    return {
      overdue: overdue.sort(byDue),
      dueToday: dueToday.sort(byDue),
      inProgress: inProgress.sort(byDue),
      upNext: upNext.sort(byDue),
    };
  }, [myTasks, today]);

  const me = members.find((m) => m.id === meId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            Today
          </p>
          <h1 className="text-2xl font-semibold text-[#E5E5EA]">
            {me ? `What's on ${me.name}'s plate` : "Pick yourself"}
          </h1>
        </div>
        <Link
          href={linkBase}
          className="text-[11px] text-[#71757D] hover:text-[#E5E5EA] hover:underline"
        >
          ← All pods
        </Link>
      </div>

      <div className="mb-5 rounded-xl border border-[#2A2A2A] bg-[#181818] p-3">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
          I&apos;m…
        </label>
        <select
          value={meId}
          onChange={(e) => setMe(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#2A2A2A] bg-[#181818] px-2 py-1.5 text-sm"
        >
          <option value="">, choose your name ,</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.is_placeholder ? " (placeholder)" : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[10px] text-[#71757D]">
          Saved on this device. Change anytime.
        </p>
      </div>

      {!meId ? (
        <div className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#0C0C0C] px-4 py-12 text-center text-sm text-[#71757D]">
          Pick your name above to see your tasks.
        </div>
      ) : myTasks.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-12 text-center text-sm text-emerald-800">
          🎉 Nothing on your plate. Either the queue is genuinely empty or your tasks all show done.
        </div>
      ) : (
        <div className="space-y-5">
          <Section
            title="Overdue"
            tone="red"
            tasks={buckets.overdue}
            today={today}
            projectById={projectById}
            clientById={clientById}
            onMutate={refresh}
          />
          <Section
            title="Due today"
            tone="amber"
            tasks={buckets.dueToday}
            today={today}
            projectById={projectById}
            clientById={clientById}
            onMutate={refresh}
          />
          <Section
            title="In progress"
            tone="blue"
            tasks={buckets.inProgress}
            today={today}
            projectById={projectById}
            clientById={clientById}
            onMutate={refresh}
          />
          <Section
            title="Up next"
            tone="gray"
            tasks={buckets.upNext}
            today={today}
            projectById={projectById}
            clientById={clientById}
            onMutate={refresh}
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  tone,
  tasks,
  today,
  projectById,
  clientById,
  onMutate,
}: {
  title: string;
  tone: "red" | "amber" | "blue" | "gray";
  tasks: Task[];
  today: string;
  projectById: Map<string, Project>;
  clientById: Map<string, Client>;
  onMutate: () => void;
}) {
  if (tasks.length === 0) return null;
  const dot =
    tone === "red"
      ? "bg-rose-500"
      : tone === "amber"
        ? "bg-amber-500"
        : tone === "blue"
          ? "bg-blue-500"
          : "bg-[#A0A0A0]";
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`size-2 rounded-full ${dot}`} />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
          {title}
        </h2>
        <span className="text-[10px] tabular-nums text-[#71757D]">{tasks.length}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#181818]">
        {tasks.map((t, i) => {
          const project = projectById.get(t.project_id);
          const client = project ? clientById.get(project.client_id) : undefined;
          const due = t.due_date;
          const overdue = due && due < today;
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? "border-t border-[#2A2A2A]" : ""}`}
            >
              <button
                onClick={(e) => {
                  /* Plain click cycles forward. Shift-click / right-click
                   * steps back so a mistaken tick can be undone, but
                   * `todo` is the start of the line so shift-click there
                   * is a no-op (never wrap forward into done). */
                  const back = e.shiftKey;
                  const next = back
                    ? t.status === "in_progress"
                      ? "todo"
                      : t.status === "done"
                        ? "in_progress"
                        : t.status
                    : t.status === "todo"
                      ? "in_progress"
                      : t.status === "in_progress"
                        ? "done"
                        : "todo";
                  updateTaskStatus(t.id, next);
                  onMutate();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const next =
                    t.status === "in_progress"
                      ? "todo"
                      : t.status === "done"
                        ? "in_progress"
                        : t.status;
                  updateTaskStatus(t.id, next);
                  onMutate();
                }}
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  t.status === "in_progress"
                    ? "border-blue-500 bg-[#181818]"
                    : "border-[#2A2A2A] bg-[#181818] hover:border-white"
                }`}
                title="Click to advance · Shift-click or right-click to step back"
              >
                {t.status === "in_progress" && (
                  <span className="size-1.5 rounded-full bg-blue-500" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#E5E5EA]">{t.title}</div>
                {(client || project) && (
                  <div className="mt-0.5 truncate text-[11px] text-[#71757D]">
                    {client && <span className="font-medium text-[#E5E5EA]">{client.name}</span>}
                    {client && project && <span className="text-[#C5C5C5]"> · </span>}
                    {project && <span>{project.name}</span>}
                  </div>
                )}
              </div>
              {due && (
                <span
                  className={`shrink-0 text-[11px] tabular-nums ${
                    overdue
                      ? "font-semibold text-rose-700"
                      : due === today
                        ? "font-semibold text-amber-700"
                        : "text-[#71757D]"
                  }`}
                >
                  {formatDayMonth(due)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
