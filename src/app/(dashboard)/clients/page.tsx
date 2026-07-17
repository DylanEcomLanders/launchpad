"use client";

/* ── Clients — founder list view ──
 * One line per engagement: client, type, goal, value, owner, state, days to
 * renewal/end. Clicks through to the profile. No charts, no stat cards.
 * DESIGN.md: Table primitive, muted-status Badge, heroicons, dense + ordered.
 */

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD, Num, StatCard } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { rosterFromKanban, type RosterRow } from "@/lib/clients/roster";
import { stateWord, daysUntil, complianceState, itemDueISO, itemOverdue, type Engagement, type Client } from "@/lib/command-centre/model";

type Row = RosterRow;
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

type Chip = { engId: string; client: string; label: string; overdue: boolean };

/* One engagement row. `indented` = it's a child under a collapsed client group,
 * so lead with the engagement name; otherwise (a client with a single
 * engagement) lead with the client name — the row stands in for both. */
function engagementRow(
  row: Row,
  clientName: string,
  router: ReturnType<typeof useRouter>,
  indented: boolean,
) {
  const e = row.engagement;
  const st = stateWord(e);
  const comp = complianceState(e);
  const days = daysUntil(e.type === "project" ? e.targetEndDate : e.renewalDate);
  return (
    <TR
      key={e.id}
      className="cursor-pointer"
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/clients/${e.id}`)}
      onKeyDown={(ev) => ev.key === "Enter" && router.push(`/clients/${e.id}`)}
    >
      <TD className="text-foreground">
        {indented ? (
          <span className="flex items-center gap-2 pl-6">
            <span className="text-muted">{e.name ?? (e.type === "retainer" ? "Retainer" : "Project")}</span>
          </span>
        ) : (
          // Reserve the chevron's slot so single-client names line up with the
          // collapsible (multi-engagement) client rows.
          <span className="inline-flex items-center gap-2">
            <span className="size-3.5 shrink-0" aria-hidden />
            <span className="font-medium">{clientName}</span>
          </span>
        )}
      </TD>
      <TD className="text-muted capitalize">{e.type}{e.tier ? ` · £${e.tier}` : ""}</TD>
      <TD className="text-muted">{e.goal === "renew" ? "Renewal" : "Convert"}</TD>
      <TD align="right"><Num className="text-muted">£{e.value.toLocaleString()}{e.type === "retainer" ? "/mo" : ""}</Num></TD>
      <TD className="text-muted">{e.csm ?? "—"}</TD>
      <TD>
        {e.status !== "active" ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
            <span className="size-1.5 rounded-full bg-subtle" />
            {e.status === "churned" ? "Churned" : "Complete"}
          </span>
        ) : row.needsSetup ? (
          /* Never let an un-set-up engagement read as healthy: with no pod or no
             deliverables it's in no KPI and no one's task list. */
          <span
            className="inline-flex items-center gap-1.5 text-xs text-status-approaching"
            title={`Not set up on the delivery board (${row.setupGap}). It won't appear in KPIs or anyone's tasks until it is.`}
          >
            <span className="size-1.5 rounded-full bg-status-approaching" />
            Needs setup
            <span className="text-subtle">· {row.setupGap}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className={`size-1.5 rounded-full ${st.tone === "ok" ? "bg-status-ontrack" : st.tone === "warn" ? "bg-status-approaching" : "bg-status-late"}`} />
            {st.word}
            {st.tone === "bad" && comp.done < comp.total ? <span className="text-subtle">· {comp.total - comp.done} missing</span> : null}
          </span>
        )}
      </TD>
      <TD align="right"><Num className={days !== null && days <= 14 ? "text-status-approaching" : "text-muted"}>{days === null ? "—" : `${days}d`}</Num></TD>
    </TR>
  );
}

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

  const { clients: kanbanClients } = useKanbanData();
  useEffect(() => {
    let cancelled = false;
    rosterFromKanban(kanbanClients).then((r) => {
      // One row per engagement — active first, then completed/churned, so an
      // upsell from a single build to a retainer shows both with their status.
      if (cancelled) return;
      const rank = (s: Engagement["status"]) => (s === "active" ? 0 : 1);
      setRows(r.slice().sort((a, b) => rank(a.engagement.status) - rank(b.engagement.status)));
    });
    return () => { cancelled = true; };
  }, [kanbanClients]);

  const shown = useMemo(() => rows.filter((r) => filter === "all" || r.engagement.type === filter), [rows, filter]);

  // Group engagements under their client — a client can hold several (a build
  // upsold onto a retainer, month-2/3 blocks, past projects). One collapsible
  // parent per client, with the engagement count + a rollup on the header.
  const groups = useMemo(() => {
    const byClient = new Map<string, { client: Client; rows: Row[] }>();
    /* Seed EVERY kanban client first, so a client with no projects yet (easy to
     * create from the board's Add-client) still shows instead of silently
     * vanishing from the roster. Only on the unfiltered view — under a
     * type filter an engagement-less client is just noise. */
    if (filter === "all") {
      for (const kc of kanbanClients) {
        byClient.set(kc.id, { client: { id: kc.id, name: kc.name, createdAt: "" }, rows: [] });
      }
    }
    for (const row of shown) {
      const g = byClient.get(row.client.id) ?? { client: row.client, rows: [] };
      g.rows.push(row);
      byClient.set(row.client.id, g);
    }
    return [...byClient.values()];
  }, [shown, kanbanClients, filter]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const stats = useMemo(() => {
    const retainers = rows.filter((r) => r.engagement.type === "retainer");
    const projects = rows.filter((r) => r.engagement.type === "project");
    // A month ago: what did the current book look like then? Engagements that
    // had already started count toward the prior-month figure. This can't see
    // churn (inactive engagements are dropped), so it reads net-new movement.
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const startedBeforeMonthAgo = (r: Row) =>
      new Date(r.engagement.startDate) <= monthAgo;
    const prevMrr = retainers
      .filter(startedBeforeMonthAgo)
      .reduce((s, r) => s + r.engagement.value, 0);
    const prevProjects = projects.filter(startedBeforeMonthAgo).length;
    const mrr = retainers.reduce((s, r) => s + r.engagement.value, 0);
    return {
      mrr,
      mrrDelta: mrr - prevMrr,
      retainerCount: retainers.length,
      projectCount: projects.length,
      projectDelta: projects.length - prevProjects,
      projectVal: projects.reduce((s, r) => s + r.engagement.value, 0),
      renewalsSoon: retainers.filter((r) => { const d = daysUntil(r.engagement.renewalDate); return d !== null && d <= 30; }).length,
      /* Un-set-up engagements count as attention: they're live but invisible in
         KPIs + everyone's tasks until a pod + deliverables exist. */
      attention: rows.filter((r) => r.needsSetup || stateWord(r.engagement).tone !== "ok").length,
    };
  }, [rows]);

  // Derived monthly trajectory for the sparklines: for each of the last 6
  // months, the book as it stood at that month's end (engagements already
  // started). Grounded in real start dates; can't reflect past churn.
  const series = useMemo(() => {
    const retainers = rows.filter((r) => r.engagement.type === "retainer");
    const projects = rows.filter((r) => r.engagement.type === "project");
    const now = new Date();
    const mrr: number[] = [];
    const proj: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const started = (r: Row) => new Date(r.engagement.startDate) <= monthEnd;
      mrr.push(retainers.filter(started).reduce((s, r) => s + r.engagement.value, 0));
      proj.push(projects.filter(started).length);
    }
    return { mrr, proj };
  }, [rows]);

  return (
    <div className="space-y-6 px-6 pb-20 pt-10 md:px-10">
      <header>
        <h1 className="text-xl font-semibold">Clients</h1>
        <p className="mt-1 text-sm text-muted">Every engagement, its goal, and anything outstanding.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Current MRR"
          value={`£${stats.mrr.toLocaleString()}`}
          delta={stats.mrrDelta}
          deltaPrefix="£"
          deltaCaption="vs last month"
          series={series.mrr}
        />
        <StatCard
          label="Projects in flight"
          value={String(stats.projectCount)}
          delta={stats.projectDelta}
          deltaCaption="vs last month"
          series={series.proj}
        />
        <StatCard
          label="Renewals ≤30d"
          value={String(stats.renewalsSoon)}
          deltaCaption={stats.renewalsSoon ? "approaching" : "none due"}
          tone={stats.renewalsSoon ? "warn" : undefined}
        />
        <StatCard
          label="Needs attention"
          value={String(stats.attention)}
          deltaCaption="gaps or overdue"
          tone={stats.attention ? "bad" : undefined}
        />
      </div>

      <PrepCalendar rows={rows} />

      {/* toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-subtle tabular-nums">
            {groups.length} client{groups.length === 1 ? "" : "s"} · {shown.length} engagement{shown.length === 1 ? "" : "s"}
          </span>
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
            {groups.map((g) => {
              /* A client with no projects at all. It used to be dropped from the
                 roster entirely — a real client silently disappearing. Show it,
                 flagged, so someone can give it an engagement. */
              if (g.rows.length === 0) {
                return (
                  <TR key={g.client.id} hover={false}>
                    <TD className="text-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-3.5 shrink-0" aria-hidden />
                        <span className="font-medium">{g.client.name}</span>
                      </span>
                    </TD>
                    <TD className="text-subtle">—</TD>
                    <TD className="text-subtle">—</TD>
                    <TD align="right"><Num className="text-subtle">—</Num></TD>
                    <TD className="text-subtle">—</TD>
                    <TD>
                      <span className="inline-flex items-center gap-1.5 text-xs text-status-approaching">
                        <span className="size-1.5 rounded-full bg-status-approaching" />
                        No engagement yet
                      </span>
                    </TD>
                    <TD align="right"><Num className="text-subtle">—</Num></TD>
                  </TR>
                );
              }
              const single = g.rows.length === 1;
              const isOpen = expanded.has(g.client.id);
              // Rollup for the client header row (multi-engagement clients).
              const mrr = g.rows
                .filter((r) => r.engagement.type === "retainer" && r.engagement.status === "active")
                .reduce((s, r) => s + r.engagement.value, 0);
              const soonest = g.rows
                .map((r) =>
                  daysUntil(r.engagement.type === "project" ? r.engagement.targetEndDate : r.engagement.renewalDate),
                )
                .filter((d): d is number => d !== null)
                .sort((a, b) => a - b)[0];
              const needsSetup = g.rows.some((r) => r.needsSetup);
              const worst = g.rows
                .filter((r) => r.engagement.status === "active")
                .reduce<"ok" | "warn" | "bad">((acc, r) => {
                  const t = stateWord(r.engagement).tone;
                  const rank = { ok: 0, warn: 1, bad: 2 } as const;
                  return rank[t] > rank[acc] ? t : acc;
                }, "ok");

              // Single engagement → the client row IS the engagement row.
              if (single) return engagementRow(g.rows[0], g.client.name, router, false);

              return (
                <Fragment key={g.client.id}>
                  <TR className="cursor-pointer" onClick={() => toggle(g.client.id)}>
                    <TD className="text-foreground">
                      <span className="inline-flex items-center gap-2">
                        {isOpen ? <ChevronDownIcon className="size-3.5 text-subtle" /> : <ChevronRightIcon className="size-3.5 text-subtle" />}
                        <span className="font-medium">{g.client.name}</span>
                        <span className="rounded-full border border-border-faint px-1.5 py-0.5 text-3xs tabular-nums text-subtle">
                          {g.rows.length}
                        </span>
                      </span>
                    </TD>
                    <TD className="text-subtle">—</TD>
                    <TD className="text-subtle">—</TD>
                    <TD align="right"><Num className="text-muted">{mrr > 0 ? `£${mrr.toLocaleString()}/mo` : "—"}</Num></TD>
                    <TD className="text-subtle">—</TD>
                    <TD>
                      {needsSetup ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-status-approaching">
                          <span className="size-1.5 rounded-full bg-status-approaching" />
                          Needs setup
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                          <span className={`size-1.5 rounded-full ${worst === "ok" ? "bg-status-ontrack" : worst === "warn" ? "bg-status-approaching" : "bg-status-late"}`} />
                          {worst === "ok" ? "On track" : worst === "warn" ? "Watch" : "Needs attention"}
                        </span>
                      )}
                    </TD>
                    <TD align="right"><Num className={soonest !== undefined && soonest <= 14 ? "text-status-approaching" : "text-muted"}>{soonest === undefined ? "—" : `${soonest}d`}</Num></TD>
                  </TR>
                  {isOpen && g.rows.map((r) => engagementRow(r, g.client.name, router, true))}
                </Fragment>
              );
            })}
          </TBody>
        </Table>
      </div>

    </div>
  );
}
