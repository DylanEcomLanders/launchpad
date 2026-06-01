"use client";

// My Work — the personal landing for every signed-in person. Resolves the
// logged-in user (useCurrentUser → pod_member_id) and shows the deliverables
// assigned to them across all their clients, grouped by urgency. Replaces the
// old founder-only "My Week" time planner.

import Link from "next/link";
import { useMemo } from "react";
import { useWorkspaceData, todayYMD } from "@/lib/workspace/use-workspace-data";
import { useCurrentUser } from "@/components/auth-gate";
import {
  buildAllClientVMs,
  LANE_LABEL,
  formatDue,
  type DeliverableVM,
  type Lane,
} from "@/lib/workspace/derive";
import {
  Card,
  Pill,
  DeadlinePill,
  SectionTitle,
  EmptyState,
  Checkbox,
  StatTile,
} from "@/lib/workspace/ui";
import { updateTaskStatus } from "@/lib/pods-v2/data";

interface MyItem extends DeliverableVM {
  clientId: string;
  clientName: string;
}

export default function MyWorkClient() {
  const me = useCurrentUser();
  const data = useWorkspaceData();
  const today = todayYMD();

  // Resolve "who am I" → pod member id. Magic-link sessions carry this; a
  // shared-password admin session won't, so we fall back to showing nothing
  // personal (admins have Workspace for the full picture).
  const memberId = me?.pod_member_id ?? null;

  const { items, name } = useMemo(() => {
    if (!memberId) return { items: [] as MyItem[], name: me?.name ?? null };
    const clientVMs = buildAllClientVMs({
      clients: data.clients,
      projects: data.projects,
      tasks: data.tasks,
      tests: data.tests,
      pods: data.pods,
      todayYMD: today,
    });
    const mine: MyItem[] = [];
    for (const c of clientVMs) {
      for (const d of c.deliverables) {
        if (d.ownerId === memberId) {
          mine.push({ ...d, clientId: c.client.id, clientName: c.client.name });
        }
      }
    }
    return { items: mine, name: me?.name ?? null };
  }, [memberId, data, today, me]);

  if (data.loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  // No linked identity (e.g. shared-password admin login): point them to Workspace.
  if (!memberId) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          My Work
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This view shows the deliverables assigned to you. It links to your
          account once you sign in with your email.
        </p>
        <div className="mt-4">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Go to Workspace
          </Link>
        </div>
      </div>
    );
  }

  const open = items.filter((d) => d.status !== "done");
  const done = items.filter((d) => d.status === "done");
  const overdue = open.filter((d) => d.state === "overdue");
  const soon = open.filter((d) => d.state === "soon");
  const upcoming = open.filter(
    (d) => d.state === "ontrack" || d.state === "awaiting_approval",
  );
  const waiting = open.filter((d) => d.state === "paused");

  const sortByDue = (a: MyItem, b: MyItem) => a.dueDate.localeCompare(b.dueDate);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          {name ? `${name.split(/\s+/)[0]}'s work` : "My Work"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything assigned to you, across every client.
        </p>
      </div>

      {/* Quick counts */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatTile
          label="Overdue"
          value={overdue.length}
          tone={overdue.length ? "red" : "green"}
        />
        <StatTile
          label="Due soon"
          value={soon.length}
          tone={soon.length ? "amber" : "green"}
        />
        <StatTile label="Open" value={open.length} tone="neutral" />
      </div>

      {open.length === 0 && (
        <div className="mt-8">
          <EmptyState>Nothing on you right now. Clear desk.</EmptyState>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {overdue.length > 0 && (
          <Group title="Overdue" items={[...overdue].sort(sortByDue)} onChanged={data.reload} />
        )}
        {soon.length > 0 && (
          <Group title="Due soon" items={[...soon].sort(sortByDue)} onChanged={data.reload} />
        )}
        {upcoming.length > 0 && (
          <Group title="Upcoming" items={[...upcoming].sort(sortByDue)} onChanged={data.reload} />
        )}
        {waiting.length > 0 && (
          <Group title="Waiting / paused" items={waiting} onChanged={data.reload} />
        )}
        {done.length > 0 && (
          <Group title="Recently done" items={done.slice(0, 8)} onChanged={data.reload} muted />
        )}
      </div>
    </div>
  );
}

function Group({
  title,
  items,
  onChanged,
  muted = false,
}: {
  title: string;
  items: MyItem[];
  onChanged: () => void;
  muted?: boolean;
}) {
  return (
    <section>
      <SectionTitle action={<span className="text-xs text-slate-400">{items.length}</span>}>
        {title}
      </SectionTitle>
      <Card className="divide-y divide-slate-100">
        {items.map((d) => (
          <MyRow key={d.id} d={d} onChanged={onChanged} muted={muted} />
        ))}
      </Card>
    </section>
  );
}

function MyRow({
  d,
  onChanged,
  muted,
}: {
  d: MyItem;
  onChanged: () => void;
  muted: boolean;
}) {
  const done = d.status === "done";
  async function toggle() {
    updateTaskStatus(d.id, done ? "todo" : "done");
    await new Promise((r) => setTimeout(r, 50));
    onChanged();
  }
  return (
    <div className={`flex items-start gap-3 px-5 py-3 ${muted ? "opacity-60" : ""}`}>
      <div className="pt-0.5">
        <Checkbox checked={done} onChange={toggle} title="Toggle done" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`text-sm ${
              done ? "text-slate-500 line-through" : "font-medium text-slate-800"
            }`}
          >
            {d.title}
          </span>
          {!done && <DeadlinePill state={d.state} daysToDue={d.daysToDue} />}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <Link
            href={`/workspace/clients/${d.clientId}`}
            className="hover:text-slate-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {d.clientName}
          </Link>
          <span className="text-slate-300">·</span>
          <LaneBadge lane={d.lane} />
          <span className="ml-auto text-[11px] text-slate-400">
            {d.waitingOn ? `waiting · ${d.waitingOn}` : formatDue(d.dueDate)}
          </span>
        </div>
      </div>
    </div>
  );
}

function LaneBadge({ lane }: { lane: Lane }) {
  const tone =
    lane === "strategy" ? "violet" : lane === "design" ? "blue" : "green";
  return <Pill tone={tone}>{LANE_LABEL[lane]}</Pill>;
}
