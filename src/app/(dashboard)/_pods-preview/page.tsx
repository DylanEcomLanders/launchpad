import Link from "next/link";
import {
  ArrowRightIcon,
  RectangleStackIcon,
  ChartBarIcon,
  BeakerIcon,
  BoltIcon,
  Squares2X2Icon,
  HeartIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import { AnnotationStrip } from "./components";

export const metadata = { title: "Pod System V2 · Preview · Launchpad" };

const SCREENS = [
  {
    href: "/pods-preview/board",
    icon: RectangleStackIcon,
    title: "Pods",
    changed:
      "Same as today — Overview / Pipeline / Strategy tabs, pod cards and the per-pod working view, unchanged in how the team uses it. The one addition: the Strategy tab is built out for the Lead Strategist (Briefs from onboarding, live-test Results, per-client strategy home).",
  },
  {
    href: "/pods-preview/strategist",
    icon: BeakerIcon,
    title: "Strategist Dashboard",
    changed:
      "New — built to the Pod OS spec (§4.1). Tests in Flight (no system cap, calling-rule recommendations), My Engagements with Day 75 countdown, Brief Intake Queue with asset gaps, and a searchable Hypothesis Library.",
  },
  {
    href: "/pods-preview/delivery",
    icon: BoltIcon,
    title: "Delivery Engine",
    changed:
      "New — spec §1.2–1.7 as a clickable mock: the two-product pipeline (Sprint vs Retainer), the points→bucket engine with the 10 pts/week capacity rule (85% alert / 100% block), and the P1→P2→P3 phase tracker with Tue/Thu slots, Wed 3pm gate, and review windows + revision caps.",
  },
  {
    href: "/pods-preview/tests",
    icon: BeakerIcon,
    title: "Test Management",
    changed:
      "New — spec §1.8. Every test across engagements with the full state machine, calling-rule recommendations, no system cap, and the 6-step test setup checklist (Intelligems / Visually).",
  },
  {
    href: "/pods-preview/timeline",
    icon: ChartBarIcon,
    title: "Timeline & KPIs",
    changed:
      "Brings back time-in-stage. Per-task phase bars (revisits kept separate), with client-side time split out, rolled up into bottleneck KPIs across pods.",
  },
  {
    href: "/pods-preview/health",
    icon: HeartIcon,
    title: "Client Health",
    changed:
      "CSM relationship layer on Engagements. Health is scored from real delivery signals (client-side delay, approval lag, engagement gap, blockers). Onboarding notes seed the record.",
  },
  {
    href: "/pods-preview/growth",
    icon: RocketLaunchIcon,
    title: "Growth Pipeline",
    changed:
      "A thin leads table + CSV import for the BDM (she lives in her own tool). Reads pod capacity to pace outbound; won deals hand off to intake.",
  },
];

function IaBox({
  title,
  subtitle,
  tone = "default",
}: {
  title: string;
  subtitle?: string;
  tone?: "default" | "accent" | "muted";
}) {
  const cls =
    tone === "accent"
      ? "border-border bg-surface-raised text-foreground"
      : tone === "muted"
        ? "border-dashed border-border bg-background text-subtle"
        : "border-border bg-surface text-foreground";
  return (
    <div className={`rounded-lg border px-3 py-2 text-center shadow-[var(--shadow-soft)] ${cls}`}>
      <div className="text-[13px] font-semibold leading-tight">{title}</div>
      {subtitle && (
        <div className={`mt-0.5 text-[10px] ${tone === "accent" ? "text-muted" : "text-subtle"}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export default function PodsPreviewHub() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
      <h1 className="text-2xl font-semibold text-foreground">Pod System V2</h1>
      <p className="mt-1 max-w-2xl text-sm text-subtle">
        A holistic redesign of the pod delivery engine. Same data, calmer surfaces, three new roles
        seated without bolting them on. This is a clickable preview — react before we build.
      </p>

      <div className="mt-6">
        <AnnotationStrip title="What this preview is">
          <p>
            Self-contained walkthrough on mock data — nothing here writes to live Supabase. The live
            system today is the code at <code>/pods-v2</code> (what the brief calls &quot;v1&quot;);
            this preview lives separately at <code>/pods-preview</code> so nothing live can break.
          </p>
          <p>
            Default posture: <strong>subtract before add</strong>. Each screen carries a blue note
            explaining what changed and why.
          </p>
        </AnnotationStrip>
      </div>

      {/* IA map */}
      <section className="mb-8 rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">
          Revised information architecture
        </h2>
        <p className="mt-1 text-[13px] text-subtle">
          One delivery workspace with role-lensed views over the same data — replacing the flat
          Overview / Pipeline / Strategy tab bar.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {/* Delivery */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">
              <RectangleStackIcon className="size-4" /> Delivery
            </div>
            <IaBox title="Pods" subtitle="Overview · Pipeline · Strategy tabs" />
            <div className="my-2 flex justify-center">
              <ArrowRightIcon className="size-4 rotate-90 text-muted" />
            </div>
            <div className="space-y-2">
              <IaBox title="Strategy tab" subtitle="Lead Strategist · Briefs + Results" tone="accent" />
              <IaBox title="Per-pod view" subtitle="the team's working board" />
              <IaBox title="Timeline & KPIs" subtitle="time-in-stage · bottlenecks" />
            </div>
            <div className="mt-2 text-center text-[10px] text-subtle">3 pods · 40 pts/mo each</div>
          </div>

          {/* Clients */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">
              <HeartIcon className="size-4" /> Clients
            </div>
            <IaBox title="Engagements" subtitle="existing area" tone="muted" />
            <div className="my-2 flex justify-center">
              <ArrowRightIcon className="size-4 rotate-90 text-muted" />
            </div>
            <IaBox title="Relationship Health" subtitle="CSM · scored from delivery signals" tone="accent" />
            <div className="mt-2 text-center text-[10px] text-subtle">
              fed by delay attribution + onboarding notes
            </div>
          </div>

          {/* Acquisition */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">
              <RocketLaunchIcon className="size-4" /> Acquisition
            </div>
            <IaBox title="Growth Pipeline" subtitle="BDM · leads table + CSV" tone="accent" />
            <div className="my-2 flex justify-center">
              <ScaleIcon className="size-4 text-muted" />
            </div>
            <IaBox title="Capacity bridge" subtitle="pod headroom → outbound pacing" />
            <div className="my-2 flex justify-center">
              <ArrowRightIcon className="size-4 rotate-90 text-muted" />
            </div>
            <IaBox title="Won → Intake" subtitle="hands off to Monday Protocol" tone="muted" />
          </div>
        </div>

        {/* role legend */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-subtle">
            <UserGroupIcon className="size-3.5" /> Pod members → Pod Board
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-subtle">
            <Squares2X2Icon className="size-3.5" /> Lead Strategist → Pods · Strategy tab
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-subtle">
            <HeartIcon className="size-3.5" /> CSM → Client Health
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-subtle">
            <RocketLaunchIcon className="size-3.5" /> BDM → Growth Pipeline + Capacity
          </span>
        </div>
      </section>

      {/* Screen cards */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">
        The screens
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {SCREENS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-muted hover:shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-surface-raised text-foreground">
                  <s.icon className="size-5" />
                </span>
                <span className="text-base font-semibold text-foreground">{s.title}</span>
              </div>
              <ArrowRightIcon className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-subtle">{s.changed}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
