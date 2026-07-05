"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/components/auth-gate";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { getDeliveryItems } from "@/lib/kpi/source";
import { computeSummary, computeOverdue } from "@/lib/kpi/metrics";
import type { DeliveryItem } from "@/lib/kpi/types";
import { LineChart } from "@/components/line-chart";
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

/* Per-month delivery metrics for the last `months` calendar months (oldest →
 * newest): on-time rate %, deliverables shipped, avg turnaround days. Same real
 * Project Delivery data as /kpi, bucketed monthly for the trend lines. */
function monthlyMetrics(items: DeliveryItem[], months: number) {
  const now = new Date();
  const labels: string[] = [];
  const onTimeRate: (number | null)[] = [];
  const delivered: number[] = [];
  const turnaround: (number | null)[] = [];

  for (let m = months - 1; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    let shipped = 0;
    let onTime = 0;
    let late = 0;
    let tSum = 0;
    let tN = 0;
    for (const it of items) {
      if (!it.isDelivered || !it.deliveredAt) continue;
      const dd = new Date(it.deliveredAt);
      if (dd.getFullYear() !== d.getFullYear() || dd.getMonth() !== d.getMonth()) continue;
      shipped++;
      if (it.startedAt && it.deliveredAt >= it.startedAt) {
        tSum += (new Date(it.deliveredAt).getTime() - new Date(it.startedAt).getTime()) / 86_400_000;
        tN++;
      }
      if (it.dueDate) it.deliveredAt <= it.dueDate ? onTime++ : late++;
    }
    labels.push(d.toLocaleDateString("en-GB", { month: "short" }));
    delivered.push(shipped);
    onTimeRate.push(onTime + late > 0 ? Math.round((onTime / (onTime + late)) * 100) : null);
    turnaround.push(tN > 0 ? Math.round((tSum / tN) * 10) / 10 : null);
  }
  return { labels, onTimeRate, delivered, turnaround };
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
  const monthly = useMemo(() => monthlyMetrics(items, 6), [items]);
  const trends = useMemo(() => {
    const nn = (xs: (number | null)[]) => xs.filter((v): v is number => v !== null);
    const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
    const mean1 = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const half = Math.floor(monthly.labels.length / 2);
    const delta = (xs: (number | null)[], m: (a: number[]) => number | null) => {
      const p = m(nn(xs.slice(0, half)));
      const r = m(nn(xs.slice(half)));
      return p !== null && r !== null ? Math.round((r - p) * 10) / 10 : null;
    };
    return {
      onTime: { avg: mean(nn(monthly.onTimeRate)), delta: delta(monthly.onTimeRate, mean) },
      throughput: {
        total: sum(monthly.delivered),
        delta: sum(monthly.delivered.slice(half)) - sum(monthly.delivered.slice(0, half)),
      },
      turnaround: { avg: mean1(nn(monthly.turnaround)), delta: delta(monthly.turnaround, mean1) },
    };
  }, [monthly]);
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

      {/* ── Delivery overview ── three monthly trends: reliable · productive · fast ── */}
      <section className="mb-12 grid gap-3 lg:grid-cols-3">
        <LineCard
          label="On-time delivery · 6 months"
          value={trends.onTime.avg === null ? "—" : `${trends.onTime.avg}%`}
          caption="avg on-time"
          delta={trends.onTime.delta}
          deltaUnit="pts"
          points={monthly.onTimeRate}
          color="var(--color-status-ontrack)"
          labels={monthly.labels}
          loading={loading}
        />
        <LineCard
          label="Throughput · 6 months"
          value={String(trends.throughput.total)}
          caption="shipped"
          delta={trends.throughput.delta}
          points={monthly.delivered}
          color="var(--foreground)"
          labels={monthly.labels}
          loading={loading}
        />
        <LineCard
          label="Turnaround · 6 months"
          value={trends.turnaround.avg === null ? "—" : `${trends.turnaround.avg}d`}
          caption="avg start to launch"
          delta={trends.turnaround.delta}
          deltaUnit="d"
          lowerIsBetter
          points={monthly.turnaround}
          color="var(--foreground)"
          labels={monthly.labels}
          loading={loading}
        />
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

function ChartCard({ label, href, cta, children }: { label: string; href?: string; cta?: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded border border-border-faint bg-surface px-5 py-4">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">{label}</p>
        {href && cta && (
          <Link href={href} className="text-xs text-muted transition-colors hover:text-foreground">
            {cta} →
          </Link>
        )}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function Headline({
  loading,
  value,
  caption,
  delta,
  deltaUnit,
  deltaGood,
}: {
  loading: boolean;
  value: string;
  caption: string;
  delta?: number | null;
  deltaUnit?: string;
  deltaGood?: boolean;
}) {
  const hasDelta = delta !== null && delta !== undefined;
  const up = hasDelta && delta >= 0;
  const good = deltaGood ?? up;
  return (
    <div>
      {loading ? (
        <div className="h-7 w-16 animate-pulse rounded-sm bg-surface-raised" />
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
          {hasDelta && (
            <span
              className="text-2xs font-medium tabular-nums"
              style={{ color: good ? "var(--color-status-ontrack)" : "var(--color-status-late)" }}
            >
              {up ? "▲" : "▼"} {Math.abs(delta)}
              {deltaUnit ? ` ${deltaUnit}` : ""}
            </span>
          )}
        </div>
      )}
      <div className="mt-0.5 text-2xs text-subtle">{caption}</div>
    </div>
  );
}

/* One delivery-trend card: headline (avg/total + directional delta) over a
 * compact monthly line. lowerIsBetter flips the delta colour (turnaround). */
function LineCard({
  label,
  value,
  caption,
  delta,
  deltaUnit,
  lowerIsBetter,
  points,
  color,
  labels,
  loading,
}: {
  label: string;
  value: string;
  caption: string;
  delta: number | null;
  deltaUnit?: string;
  lowerIsBetter?: boolean;
  points: (number | null)[];
  color: string;
  labels: string[];
  loading: boolean;
}) {
  const good = delta === null ? undefined : lowerIsBetter ? delta <= 0 : delta >= 0;
  return (
    <ChartCard label={label} href="/kpi" cta="Report">
      <div className="mb-4">
        <Headline loading={loading} value={value} caption={caption} delta={delta} deltaUnit={deltaUnit} deltaGood={good} />
      </div>
      {loading ? (
        <div className="h-28 w-full animate-pulse rounded-sm bg-surface-raised" />
      ) : (
        <LineChart className="h-28 w-full" showY={false} labels={labels} series={[{ key: label, color, points }]} />
      )}
    </ChartCard>
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
