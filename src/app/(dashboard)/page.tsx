"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/components/auth-gate";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { getDeliveryItems } from "@/lib/kpi/source";
import { computeSummary, computeOverdue } from "@/lib/kpi/metrics";
import type { DeliveryItem } from "@/lib/kpi/types";
import { StatCard } from "@/components/ui";
import {
  DitherCard,
  DitherDoc,
  DitherChat,
  DitherClipboard,
} from "@/components/dither-icons";

/* ── Overview ── the admin/CRO home (members land on /my-work).
 * A briefing, not a launcher: greeting + live state of play, the quick tools
 * reached for daily, then a delivery overview in three 6-week trends —
 * reliable (on-time), productive (throughput), fast (turnaround) — and what
 * needs attention plus the month's wins. Revenue lives in Finance, not here.
 * Every number is read off real Project Delivery + onboarding data.
 */

type Tool = {
  title: string;
  subtitle: string;
  href: string;
  icon: (p: { className?: string }) => React.ReactElement;
};

/* The four tools reached for quickest, in the order requested. */
const QUICK_TOOLS: Tool[] = [
  { title: "Onboarding form", subtitle: "Client intake", href: "/onboard", icon: DitherClipboard },
  { title: "Payment link", subtitle: "Whop checkout URL", href: "/tools/payment-link", icon: DitherCard },
  { title: "Price list", subtitle: "Client-facing, shareable", href: "/pricing", icon: DitherDoc },
  { title: "Feedback form", subtitle: "In-flight check-ins", href: "/tools/feedback", icon: DitherChat },
];

/* Day-by-day cumulative delivery metrics for one calendar month: running
 * shipped count, on-time rate %, and avg turnaround days for each day 1..N.
 * `upToDay` cuts the current month off at today (rest of the days are null so
 * the line honestly stops). Same real Project Delivery data as /kpi. */
function monthSeries(items: DeliveryItem[], year: number, month: number, upToDay?: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDay = upToDay ?? daysInMonth;

  const evts: { day: number; onTime: boolean | null; turn: number | null }[] = [];
  for (const it of items) {
    if (!it.isDelivered || !it.deliveredAt) continue;
    const dd = new Date(it.deliveredAt);
    if (dd.getFullYear() !== year || dd.getMonth() !== month) continue;
    evts.push({
      day: dd.getDate(),
      onTime: it.dueDate ? it.deliveredAt <= it.dueDate : null,
      turn:
        it.startedAt && it.deliveredAt >= it.startedAt
          ? (new Date(it.deliveredAt).getTime() - new Date(it.startedAt).getTime()) / 86_400_000
          : null,
    });
  }

  const shipped: (number | null)[] = [];
  const onTimeRate: (number | null)[] = [];
  const turnaround: (number | null)[] = [];
  let cShip = 0;
  let cOn = 0;
  let cRated = 0;
  let cTSum = 0;
  let cTN = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (d > lastDay) {
      shipped.push(null);
      onTimeRate.push(null);
      turnaround.push(null);
      continue;
    }
    for (const e of evts) {
      if (e.day !== d) continue;
      cShip++;
      if (e.onTime !== null) {
        cRated++;
        if (e.onTime) cOn++;
      }
      if (e.turn !== null) {
        cTSum += e.turn;
        cTN++;
      }
    }
    shipped.push(cShip);
    onTimeRate.push(cRated > 0 ? Math.round((cOn / cRated) * 100) : null);
    turnaround.push(cTN > 0 ? Math.round((cTSum / cTN) * 10) / 10 : null);
  }
  return { daysInMonth, shipped, onTimeRate, turnaround };
}

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function sameMonth(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

/** Drop the trailing (and any) nulls from a month-to-date series so it can feed
 *  a sparkline as a clean run of points. */
function compact(a: (number | null)[]): number[] {
  return a.filter((n): n is number => n !== null);
}

export default function Overview() {
  const currentUser = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [briefs, setBriefs] = useState<{ id: string; company_name: string; created_at: string }[]>([]);

  useEffect(() => {
    setMounted(true);
    import("@/lib/onboarding").then(({ onboardingStore }) =>
      onboardingStore
        .getAll()
        .then((all) =>
          setBriefs(
            all
              .filter((s) => s.status === "pending" || s.status === "in-progress")
              .map((s) => ({ id: s.id, company_name: s.company_name, created_at: s.created_at })),
          ),
        )
        .catch(() => {}),
    );
  }, []);

  const { clients, pods, loading } = useKanbanData();
  const items = useMemo(() => getDeliveryItems(clients, pods), [clients, pods]);
  const summary = useMemo(() => computeSummary(items, "month", 0), [items]);
  const overdue = useMemo(() => computeOverdue(items, "month", 0), [items]);
  /* Month-to-date vs the whole of last month. Each metric returns a bright
   * "this month" line (stops at today) and a faded "last month" ghost, plus a
   * headline (current MTD value) and a delta vs last month at the same day. */
  const daily = useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    const cur = monthSeries(items, now.getFullYear(), now.getMonth(), today);
    const pd = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prev = monthSeries(items, pd.getFullYear(), pd.getMonth());
    const maxDays = Math.max(cur.daysInMonth, prev.daysInMonth);
    const pad = (a: (number | null)[]) => a.concat(Array(Math.max(0, maxDays - a.length)).fill(null));
    const lastDefinedUpTo = (a: (number | null)[], day: number) => {
      for (let i = Math.min(day, a.length) - 1; i >= 0; i--) if (a[i] !== null) return a[i];
      return null;
    };
    const metric = (c: (number | null)[], p: (number | null)[]) => {
      const value = lastDefinedUpTo(c, today);
      const prevAtDay = lastDefinedUpTo(p, today);
      return {
        cur: pad(c),
        prev: pad(p),
        value,
        delta: value !== null && prevAtDay !== null ? Math.round((value - prevAtDay) * 10) / 10 : null,
      };
    };
    return {
      labels: ["1", `${Math.round(maxDays / 2)}`, `${maxDays}`],
      curLabel: now.toLocaleDateString("en-GB", { month: "short" }),
      prevLabel: pd.toLocaleDateString("en-GB", { month: "short" }),
      onTime: metric(cur.onTimeRate, prev.onTimeRate),
      throughput: metric(cur.shipped, prev.shipped),
      turnaround: metric(cur.turnaround, prev.turnaround),
    };
  }, [items]);
  const shipped = useMemo(() => {
    const ref = new Date();
    return items
      .filter((i) => i.isDelivered && i.deliveredAt && sameMonth(i.deliveredAt, ref))
      .sort((a, b) => (a.deliveredAt! < b.deliveredAt! ? 1 : -1));
  }, [items]);

  const now = mounted ? new Date() : null;
  const firstName = currentUser?.name?.trim().split(/\s+/)[0] ?? "";
  const greeting = now ? greetingFor(now.getHours()) : "Welcome back";
  const dateStr = now
    ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()
    : "";

  return (
    <div className="px-6 pb-20 pt-10 md:px-10">
      {/* ── Header ── greeting + live one-line state of play ── */}
      <header className="mb-10" suppressHydrationWarning>
        <p className="h-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">{dateStr}</p>
        <h1 className="mt-2 text-[26px] leading-tight">
          <span className="font-bold text-foreground">
            {greeting}
            {mounted && firstName ? `, ${firstName}` : ""}
          </span>{" "}
          <span className="font-normal text-subtle">here&apos;s your overview</span>
        </h1>
        <StateOfPlay loading={loading} delivered={summary.delivered} overdue={summary.currentlyOverdue} briefs={briefs.length} />
      </header>

      {/* ── Quick tools ── just below the header ── */}
      <section className="mb-12">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">Quick tools</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {QUICK_TOOLS.map((t) => (
            <ToolTile key={t.title} tool={t} />
          ))}
        </div>
      </section>

      {/* ── Delivery overview ── month-to-date headline + trajectory sparkline ── */}
      <section className="mb-12">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
            Delivery · {daily.curLabel} to date
          </p>
          <Link href="/kpi" className="text-2xs text-muted transition-colors hover:text-foreground">
            All KPIs →
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg border border-border-faint bg-surface" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            <StatCard
              label="On-time delivery"
              value={daily.onTime.value === null ? "—" : `${daily.onTime.value}%`}
              delta={daily.onTime.delta}
              deltaUnit=" pts"
              deltaCaption="vs last month"
              series={compact(daily.onTime.cur)}
            />
            <StatCard
              label="Throughput"
              value={daily.throughput.value === null ? "—" : String(daily.throughput.value)}
              delta={daily.throughput.delta}
              deltaCaption="shipped, vs last month"
              series={compact(daily.throughput.cur)}
            />
            <StatCard
              label="Turnaround"
              value={daily.turnaround.value === null ? "—" : `${daily.turnaround.value}d`}
              delta={daily.turnaround.delta}
              deltaUnit="d"
              deltaCaption="vs last month"
              lowerIsBetter
              series={compact(daily.turnaround.cur)}
            />
          </div>
        )}
      </section>

      {/* ── Needs attention + Recently shipped ── */}
      <section className="grid gap-3 lg:grid-cols-2">
        <Card label="Needs attention" count={overdue.length + briefs.length}>
          {loading ? (
            <RowsSkeleton />
          ) : overdue.length + briefs.length === 0 ? (
            <Empty>Nothing needs you right now.</Empty>
          ) : (
            <>
              {briefs.slice(0, 3).map((b) => (
                <AttnRow key={b.id} href="/tools/onboarding-inbox" tag="Brief" tone="new" title={b.company_name || "New brief"} meta={daysAgo(b.created_at)} />
              ))}
              {overdue.slice(0, Math.max(2, 6 - Math.min(briefs.length, 3))).map((r) => (
                <AttnRow key={r.id} href={r.url ?? "/kanban"} tag="Overdue" tone="late" title={r.title} sub={r.clientName} meta={`${r.daysLate}d late`} />
              ))}
            </>
          )}
        </Card>

        <Card label="Recently shipped" href="/kpi" cta="All KPIs" count={shipped.length}>
          {loading ? (
            <RowsSkeleton />
          ) : shipped.length === 0 ? (
            <Empty>No launches yet this month.</Empty>
          ) : (
            shipped.slice(0, 6).map((i) => (
              <AttnRow
                key={i.id}
                href={i.url ?? "/kanban"}
                tag="Shipped"
                tone="ok"
                title={i.title}
                sub={i.clientName}
                meta={i.deliveredAt ? new Date(i.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
              />
            ))
          )}
        </Card>
      </section>
    </div>
  );
}

/* ── pieces ── */

function StateOfPlay({ loading, delivered, overdue, briefs }: { loading: boolean; delivered: number; overdue: number; briefs: number }) {
  if (loading) return <div className="mt-3 h-4 w-80 animate-pulse rounded-sm bg-surface-raised" />;
  const n = (v: number) => <span className="font-medium text-foreground tabular-nums">{v}</span>;
  return (
    <p className="mt-3 text-sm text-muted">
      You&apos;ve shipped {n(delivered)} this month. {n(overdue)} {overdue === 1 ? "deliverable is" : "deliverables are"} overdue
      {briefs > 0 ? <> and {n(briefs)} {briefs === 1 ? "brief is" : "briefs are"} waiting.</> : <> and no briefs are waiting.</>}
    </p>
  );
}

function Card({ label, count, href, cta, children }: { label: string; count?: number; href?: string; cta?: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border-faint bg-surface">
      <div className="flex items-baseline justify-between border-b border-border-faint px-4 py-3">
        <div className="flex items-baseline gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">{label}</p>
          {typeof count === "number" && count > 0 && <span className="text-2xs tabular-nums text-subtle">{count}</span>}
        </div>
        {href && cta && (
          <Link href={href} className="text-2xs text-muted transition-colors hover:text-foreground">
            {cta} →
          </Link>
        )}
      </div>
      <div className="divide-y divide-border-faint">{children}</div>
    </div>
  );
}

const TONE: Record<string, string> = {
  new: "text-info",
  late: "text-status-late",
  ok: "text-status-ontrack",
};

function AttnRow({ href, tag, tone, title, sub, meta }: { href: string; tag: string; tone: keyof typeof TONE; title: string; sub?: string; meta?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-raised">
      <span className={`w-14 shrink-0 text-2xs font-semibold uppercase tracking-wider ${TONE[tone]}`}>{tag}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {title}
        {sub && <span className="text-subtle"> · {sub}</span>}
      </span>
      {meta && <span className="shrink-0 text-2xs tabular-nums text-subtle">{meta}</span>}
    </Link>
  );
}

function RowsSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded-sm bg-surface-raised" />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-xs text-subtle">{children}</p>;
}

function ToolTile({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      className="group flex items-center gap-3 rounded border border-border-faint bg-surface px-4 py-3.5 transition-colors hover:border-border hover:bg-surface-raised"
    >
      <Icon className="size-5 shrink-0 text-muted transition-colors group-hover:text-foreground" />
      <span className="text-sm font-medium text-foreground">{tool.title}</span>
    </Link>
  );
}
