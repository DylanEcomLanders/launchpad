"use client";

/* ── Operations hub ──
 *
 * The discoverability surface for the full Hero Offer operating
 * system shipped across Phases 1-5B. Grouped by lifecycle stage
 * to mirror the playbook structure.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  ChartPieIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  DocumentDuplicateIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  MapIcon,
  SignalIcon,
  SparklesIcon,
  TrophyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { notifyStatus } from "@/lib/notify";

interface Tool {
  href: string;
  label: string;
  blurb: string;
  icon: React.ElementType;
}
interface Group {
  title: string;
  accent: "emerald" | "cyan" | "sky";
  tools: Tool[];
}

const GROUPS: Group[] = [
  {
    title: "Acquisition",
    accent: "emerald",
    tools: [
      { href: "/pipeline", label: "Pipeline", blurb: "3-paths-in kanban with at-risk signals", icon: SignalIcon },
      { href: "/tools/discovery-audit", label: "Discovery Audits", blurb: "£1k pre-signup audit builder", icon: DocumentMagnifyingGlassIcon },
      { href: "/tools/proposals", label: "Proposals", blurb: "Tier + terms + guarantee, sent as link", icon: DocumentTextIcon },
    ],
  },
  {
    title: "Execution",
    accent: "cyan",
    tools: [
      { href: "/tools/roadmap", label: "Roadmap", blurb: "30/60/90 with ICE scoring", icon: MapIcon },
      { href: "/tools/briefs", label: "Briefs", blurb: "Design / Dev / Hypothesis forms", icon: DocumentDuplicateIcon },
      { href: "/tools/tests", label: "Tests", blurb: "Live test tracker + write-ups", icon: BeakerIcon },
      { href: "/tools/throughput", label: "Throughput", blurb: "Per-tier delivery vs target", icon: ChartBarSquareIcon },
      { href: "/tools/reports", label: "Reports", blurb: "Weekly / monthly / QBR auto-generator", icon: ChartPieIcon },
    ],
  },
  {
    title: "Retention",
    accent: "sky",
    tools: [
      { href: "/tools/onboarding", label: "Onboarding", blurb: "First-week wow checklist per client", icon: SparklesIcon },
      { href: "/tools/lifecycle", label: "Lifecycle", blurb: "Day 30 / 90 / 180 / 365 milestones", icon: CalendarDaysIcon },
      { href: "/tools/cadence", label: "Cadence + at-risk", blurb: "Comms log + 3 risk signals", icon: ChatBubbleOvalLeftEllipsisIcon },
    ],
  },
  {
    title: "Brain",
    accent: "emerald",
    tools: [
      { href: "/tools/test-wins", label: "Test wins", blurb: "Case study inbox", icon: TrophyIcon },
      { href: "/knowledge", label: "Brain library", blurb: "Searchable test learnings + tags", icon: AcademicCapIcon },
    ],
  },
];

const ACCENT_GRADIENT: Record<Group["accent"], string> = {
  emerald: "from-emerald-500 to-teal-600 shadow-[0_8px_24px_rgba(16,185,129,0.3)]",
  cyan: "from-cyan-500 to-teal-600 shadow-[0_8px_24px_rgba(6,182,212,0.3)]",
  sky: "from-sky-500 to-blue-600 shadow-[0_8px_24px_rgba(14,165,233,0.3)]",
};

export default function OperationsHubPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const [slack, setSlack] = useState<{ configured: boolean; default_channel: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    notifyStatus().then((s) => {
      if (!cancelled) setSlack(s);
    });
    return () => { cancelled = true; };
  }, []);

  if (!isAdmin) return (<div className="p-6"><div className="bg-background rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle">Admin / CRO only.</p></div></div>);

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-sky-500 flex items-center justify-center shadow-[0_8px_24px_rgba(6,182,212,0.3)]">
            <SparklesIcon className="size-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
            Operations
          </h1>
        </div>
        <p className="text-sm text-muted max-w-2xl">
          Every tool, by lifecycle stage. The full Hero Offer operating system in one place. Open <Link href="/hero-offer" className="text-emerald-300 hover:text-emerald-200 underline">/hero-offer</Link> for the playbook itself.
        </p>
      </header>

      {/* Slack notification status */}
      <div className={`rounded-xl p-4 ring-1 flex items-center gap-3 ${slack?.configured ? "bg-emerald-500/10 ring-emerald-500/20" : "bg-amber-500/10 ring-amber-500/20"}`}>
        {slack?.configured ? <CheckCircleIcon className="size-5 text-emerald-300" /> : <ExclamationCircleIcon className="size-5 text-amber-300" />}
        <div className="flex-1 text-[13px]">
          <span className="font-semibold text-foreground">Slack notifications: </span>
          <span className="text-muted">
            {slack === null
              ? "checking…"
              : slack.configured
                ? `connected${slack.default_channel ? ` · default channel ${slack.default_channel}` : ""}`
                : "stubbed - awaiting Viktor's bot token (SLACK_BOT_TOKEN env var). UI fires correctly today, transport returns 503."}
          </span>
        </div>
      </div>

      {/* Groups */}
      {GROUPS.map((g) => (
        <section key={g.title}>
          <h2 className="text-[11px] uppercase tracking-wider text-subtle font-semibold mb-3">{g.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.tools.map((t) => {
              const Icon = t.icon;
              return (
                <Link key={t.href} href={t.href} className="group block bg-background rounded-2xl p-5 ring-1 ring-white/[0.04] hover:ring-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all">
                  <div className={`size-10 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT[g.accent]} flex items-center justify-center mb-4 transition-transform group-hover:scale-105`}>
                    <Icon className="size-5 text-white" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{t.label}</span>
                    <ArrowTopRightOnSquareIcon className="size-3 text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">{t.blurb}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
