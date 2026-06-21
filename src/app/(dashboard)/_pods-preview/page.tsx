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
      ? "border-white bg-white text-[#0C0C0C]"
      : tone === "muted"
        ? "border-dashed border-[#D5D5DA] bg-[#0C0C0C] text-[#71757D]"
        : "border-[#2A2A2A] bg-[#181818] text-[#E5E5EA]";
  return (
    <div className={`rounded-lg border px-3 py-2 text-center shadow-[var(--shadow-soft)] ${cls}`}>
      <div className="text-[13px] font-semibold leading-tight">{title}</div>
      {subtitle && (
        <div className={`mt-0.5 text-[10px] ${tone === "accent" ? "text-white/70" : "text-[#71757D]"}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export default function PodsPreviewHub() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
      <h1 className="text-2xl font-semibold text-[#E5E5EA]">Pod System V2</h1>
      <p className="mt-1 max-w-2xl text-sm text-[#71757D]">
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
      <section className="mb-8 rounded-xl border border-[#2A2A2A] bg-[#181818] p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71757D]">
          Revised information architecture
        </h2>
        <p className="mt-1 text-[13px] text-[#71757D]">
          One delivery workspace with role-lensed views over the same data — replacing the flat
          Overview / Pipeline / Strategy tab bar.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {/* Delivery */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#0C0C0C] p-4">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
              <RectangleStackIcon className="size-4" /> Delivery
            </div>
            <IaBox title="Pods" subtitle="Overview · Pipeline · Strategy tabs" />
            <div className="my-2 flex justify-center">
              <ArrowRightIcon className="size-4 rotate-90 text-[#C5C5C5]" />
            </div>
            <div className="space-y-2">
              <IaBox title="Strategy tab" subtitle="Lead Strategist · Briefs + Results" tone="accent" />
              <IaBox title="Per-pod view" subtitle="the team's working board" />
              <IaBox title="Timeline & KPIs" subtitle="time-in-stage · bottlenecks" />
            </div>
            <div className="mt-2 text-center text-[10px] text-[#71757D]">3 pods · 40 pts/mo each</div>
          </div>

          {/* Clients */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#0C0C0C] p-4">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
              <HeartIcon className="size-4" /> Clients
            </div>
            <IaBox title="Engagements" subtitle="existing area" tone="muted" />
            <div className="my-2 flex justify-center">
              <ArrowRightIcon className="size-4 rotate-90 text-[#C5C5C5]" />
            </div>
            <IaBox title="Relationship Health" subtitle="CSM · scored from delivery signals" tone="accent" />
            <div className="mt-2 text-center text-[10px] text-[#71757D]">
              fed by delay attribution + onboarding notes
            </div>
          </div>

          {/* Acquisition */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#0C0C0C] p-4">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
              <RocketLaunchIcon className="size-4" /> Acquisition
            </div>
            <IaBox title="Growth Pipeline" subtitle="BDM · leads table + CSV" tone="accent" />
            <div className="my-2 flex justify-center">
              <ScaleIcon className="size-4 text-[#C5C5C5]" />
            </div>
            <IaBox title="Capacity bridge" subtitle="pod headroom → outbound pacing" />
            <div className="my-2 flex justify-center">
              <ArrowRightIcon className="size-4 rotate-90 text-[#C5C5C5]" />
            </div>
            <IaBox title="Won → Intake" subtitle="hands off to Monday Protocol" tone="muted" />
          </div>
        </div>

        {/* role legend */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#2A2A2A] pt-4 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A2A] bg-[#181818] px-2.5 py-1 text-[#71757D]">
            <UserGroupIcon className="size-3.5" /> Pod members → Pod Board
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A2A] bg-[#181818] px-2.5 py-1 text-[#71757D]">
            <Squares2X2Icon className="size-3.5" /> Lead Strategist → Pods · Strategy tab
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A2A] bg-[#181818] px-2.5 py-1 text-[#71757D]">
            <HeartIcon className="size-3.5" /> CSM → Client Health
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A2A] bg-[#181818] px-2.5 py-1 text-[#71757D]">
            <RocketLaunchIcon className="size-3.5" /> BDM → Growth Pipeline + Capacity
          </span>
        </div>
      </section>

      {/* Screen cards */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#71757D]">
        The screens
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {SCREENS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-[#2A2A2A] bg-[#181818] p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-[#C5C5C5] hover:shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-[#222222] text-[#E5E5EA]">
                  <s.icon className="size-5" />
                </span>
                <span className="text-base font-semibold text-[#E5E5EA]">{s.title}</span>
              </div>
              <ArrowRightIcon className="size-4 text-[#C5C5C5] transition-transform group-hover:translate-x-0.5 group-hover:text-[#E5E5EA]" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[#71757D]">{s.changed}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
