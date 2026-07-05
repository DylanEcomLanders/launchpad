"use client";

/* ── Clients — founder list view ──
 * One line per engagement: client, type, goal, value, owner, state, days to
 * renewal/end. Clicks through to the profile. No charts, no stat cards.
 * DESIGN.md: Table primitive, muted-status Badge, heroicons, dense + ordered.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD, Num } from "@/components/ui";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { listEngagements } from "@/lib/command-centre/store";
import { stateWord, daysUntil, complianceState, itemDueISO, itemOverdue, type Engagement, type Client } from "@/lib/command-centre/model";
import { NewEngagementModal } from "./_new-engagement";

type Row = { engagement: Engagement; client: Client };
type Filter = "all" | "retainer" | "project";

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function weekDays(today = new Date(), offsetWeeks = 0): Date[] {
  const dow = today.getDay(); // 0 Sun … 6 Sat
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  if (dow === 0 || dow === 6) monday.setDate(monday.getDate() + 7); // weekend → show next week
  monday.setDate(monday.getDate() + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  return WD.map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
}
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function weekLabel(days: Date[]) {
  const mon = days[0], fri = days[4];
  const m = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" });
  return mon.getMonth() === fri.getMonth() ? `${mon.getDate()}–${fri.getDate()} ${m(fri)}` : `${mon.getDate()} ${m(mon)} – ${fri.getDate()} ${m(fri)}`;
}

function StatTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" | "bad" }) {
  const c = tone === "bad" ? "text-status-late" : tone === "warn" ? "text-status-approaching" : "text-foreground";
  return (
    <div className="rounded border border-border-faint bg-surface p-5">
      <div className="text-2xs font-medium uppercase tracking-wider text-subtle">{label}</div>
      <div className={`mt-2 text-xl font-semibold tabular-nums ${c}`}>{value}</div>
      {hint && <div className="mt-1 text-2xs text-subtle">{hint}</div>}
    </div>
  );
}

type Chip = { engId: string; client: string; label: string; overdue: boolean };

function PrepCalendar({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const days = weekDays(new Date(), offset);
  const today = new Date();
  const eyebrow = offset === 0 ? "This week" : offset === -1 ? "Last week" : offset === 1 ? "Next week" : "Week";
  const buckets: Chip[][] = days.map(() => []);

  rows.forEach(({ engagement: e, client }) => {
    e.items.forEach((item) => {
      const dueISO = itemDueISO(item, e.startDate);
      if (!dueISO) return;
      const due = new Date(dueISO + "T00:00:00");
      const overdue = itemOverdue(item, e.startDate);
      const chip: Chip = { engId: e.id, client: client.name, label: item.label, overdue };
      const idx = days.findIndex((d) => sameDay(d, due));
      if (idx >= 0) buckets[idx].push(chip);
      else if (overdue && due < days[0]) buckets[0].push({ ...chip, overdue: true });
    });
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-3xs font-medium uppercase tracking-wider text-subtle">{eyebrow} · to prepare</p>
        <div className="flex items-center gap-2">
          {offset !== 0 && <button onClick={() => setOffset(0)} className="text-3xs text-subtle transition-colors hover:text-muted">This week</button>}
          <button onClick={() => setOffset((o) => o - 1)} className="text-subtle transition-colors hover:text-foreground" aria-label="Previous week"><ChevronLeftIcon className="size-4" /></button>
          <span className="min-w-[104px] text-center text-xs font-medium tabular-nums text-foreground">{weekLabel(days)}</span>
          <button onClick={() => setOffset((o) => o + 1)} className="text-subtle transition-colors hover:text-foreground" aria-label="Next week"><ChevronRightIcon className="size-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-5 overflow-hidden rounded border border-border-faint bg-surface">
        {days.map((d, i) => (
          <div key={i} className={`min-h-[148px] p-3 ${i > 0 ? "border-l border-border-faint" : ""} ${sameDay(d, today) ? "bg-surface-raised" : ""}`}>
            <div className="mb-2 flex items-baseline gap-1.5">
              <span className="text-xs font-medium text-foreground">{WD[i]}</span>
              <span className="text-3xs tabular-nums text-subtle">{d.getDate()}</span>
            </div>
            <div className="space-y-1">
              {buckets[i].length === 0 && <span className="text-3xs text-subtle/50">—</span>}
              {buckets[i].map((c, j) => (
                <button
                  key={j}
                  onClick={() => router.push(`/clients/${c.engId}`)}
                  className="flex w-full items-center gap-1.5 rounded border border-border-faint px-1.5 py-1 text-left text-3xs transition-colors hover:bg-background"
                >
                  <span className={`size-1 shrink-0 rounded-full ${c.overdue ? "bg-status-late" : "bg-subtle"}`} />
                  <span className="truncate text-muted"><span className="text-foreground">{c.client}</span> · {c.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { setRows(listEngagements().filter((r) => r.engagement.status === "active")); }, []);

  const shown = useMemo(() => rows.filter((r) => filter === "all" || r.engagement.type === filter), [rows, filter]);

  const stats = useMemo(() => {
    const retainers = rows.filter((r) => r.engagement.type === "retainer");
    const projects = rows.filter((r) => r.engagement.type === "project");
    return {
      mrr: retainers.reduce((s, r) => s + r.engagement.value, 0),
      retainerCount: retainers.length,
      projectCount: projects.length,
      projectVal: projects.reduce((s, r) => s + r.engagement.value, 0),
      renewalsSoon: retainers.filter((r) => { const d = daysUntil(r.engagement.renewalDate); return d !== null && d <= 30; }).length,
      attention: rows.filter((r) => stateWord(r.engagement).tone !== "ok").length,
    };
  }, [rows]);

  return (
    <div className="space-y-6 px-6 pb-20 pt-10 md:px-10">
      <header>
        <h1 className="text-xl font-semibold">Clients</h1>
        <p className="mt-1 text-sm text-muted">Every engagement, its goal, and anything outstanding.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Current MRR" value={`£${stats.mrr.toLocaleString()}`} hint={`${stats.retainerCount} retainers`} />
        <StatTile label="Projects in flight" value={String(stats.projectCount)} hint={`£${stats.projectVal.toLocaleString()} in scope`} />
        <StatTile label="Renewals ≤30d" value={String(stats.renewalsSoon)} hint={stats.renewalsSoon ? "approaching" : "none due"} tone={stats.renewalsSoon ? "warn" : undefined} />
        <StatTile label="Needs attention" value={String(stats.attention)} hint="gaps or overdue" tone={stats.attention ? "bad" : undefined} />
      </div>

      <PrepCalendar rows={rows} />

      {/* toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-subtle tabular-nums">{shown.length} engagements</span>
          <div className="flex gap-1">
            {(["all", "retainer", "project"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-8 rounded border px-2.5 text-xs capitalize transition-colors ${filter === f ? "border-border bg-surface-raised text-foreground" : "border-border-faint text-muted hover:text-foreground"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="flex h-8 items-center gap-1.5 rounded border border-border px-2.5 text-xs text-muted transition-colors hover:text-foreground">
          <PlusIcon className="size-3.5" />New engagement
        </button>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded border border-border-faint bg-surface">
        <Table>
          <THead>
            <TR hover={false}>
              <TH>Client</TH>
              <TH>Type</TH>
              <TH>Goal</TH>
              <TH align="right">Value</TH>
              <TH>Owner</TH>
              <TH>State</TH>
              <TH align="right">{filter === "project" ? "Ends in" : filter === "retainer" ? "Renews in" : "Renews / ends"}</TH>
            </TR>
          </THead>
          <TBody>
            {shown.map(({ engagement: e, client }) => {
              const st = stateWord(e);
              const comp = complianceState(e);
              const days = daysUntil(e.type === "project" ? e.targetEndDate : e.renewalDate);
              return (
                <TR key={e.id} className="cursor-pointer" role="link" tabIndex={0} onClick={() => router.push(`/clients/${e.id}`)} onKeyDown={(ev) => ev.key === "Enter" && router.push(`/clients/${e.id}`)}>
                  <TD className="text-foreground">{client.name}</TD>
                  <TD className="text-muted capitalize">{e.type}{e.tier ? ` · £${e.tier}` : ""}</TD>
                  <TD className="text-muted">{e.goal === "renew" ? "Renewal" : "Convert"}</TD>
                  <TD align="right"><Num className="text-muted">£{e.value.toLocaleString()}{e.type === "retainer" ? "/mo" : ""}</Num></TD>
                  <TD className="text-muted">{e.csm ?? "—"}</TD>
                  <TD>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <span className={`size-1.5 rounded-full ${st.tone === "ok" ? "bg-status-ontrack" : st.tone === "warn" ? "bg-status-approaching" : "bg-status-late"}`} />
                      {st.word}
                      {st.tone === "bad" && comp.done < comp.total ? <span className="text-subtle">· {comp.total - comp.done} missing</span> : null}
                    </span>
                  </TD>
                  <TD align="right"><Num className={days !== null && days <= 14 ? "text-status-approaching" : "text-muted"}>{days === null ? "—" : `${days}d`}</Num></TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>

      {showNew && <NewEngagementModal onClose={() => setShowNew(false)} onCreated={(id) => router.push(`/clients/${id}`)} />}
    </div>
  );
}
