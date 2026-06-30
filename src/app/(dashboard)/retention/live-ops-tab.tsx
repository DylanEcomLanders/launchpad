"use client";

/* ── Retention / Live ops tab ──
 *
 * Surfaces the live data that flows through the new tools we built
 * (client_touches, client_milestones, client_onboardings, test_wins).
 * Sits alongside Health / Alerts / Renewals which run on the older
 * sales_clients model. CSM gets a "what's happening right now"
 * snapshot across every active engagement.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  SparklesIcon,
  TrophyIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { clientTouchesStore } from "@/lib/client-touches/data";
import { TOUCH_LABEL, type ClientTouch } from "@/lib/client-touches/types";
import { clientMilestonesStore, daysUntilDue, resolvedStatus } from "@/lib/client-milestones/data";
import { MILESTONE_TITLE, STATUS_LABEL as MS_STATUS_LABEL, STATUS_TINT as MS_STATUS_TINT, type ClientMilestone } from "@/lib/client-milestones/types";
import { clientOnboardingsStore, completionPct, dayNumber } from "@/lib/client-onboarding/data";
import { STATUS_TINT as OB_STATUS_TINT, STATUS_LABEL as OB_STATUS_LABEL, type ClientOnboarding } from "@/lib/client-onboarding/types";
import { testWinsStore } from "@/lib/test-wins/data";
import type { TestWin } from "@/lib/test-wins/types";

export function LiveOpsTab() {
  const [touches, setTouches] = useState<ClientTouch[]>([]);
  const [milestones, setMilestones] = useState<ClientMilestone[]>([]);
  const [onboardings, setOnboardings] = useState<ClientOnboarding[]>([]);
  const [wins, setWins] = useState<TestWin[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [t, m, o, w] = await Promise.all([
        clientTouchesStore.getAll(),
        clientMilestonesStore.getAll(),
        clientOnboardingsStore.getAll(),
        testWinsStore.getAll(),
      ]);
      if (cancelled) return;
      setTouches(t.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10));
      setMilestones(m);
      setOnboardings(o);
      setWins(w.sort((a, b) => b.captured_at.localeCompare(a.captured_at)).slice(0, 6));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  /* Due-soon milestones: anything with resolvedStatus = "due" or
   * "in_progress", plus upcoming inside 14 days. */
  const dueMilestones = useMemo(() => {
    return milestones
      .filter((m) => {
        const s = resolvedStatus(m);
        return s === "due" || s === "in_progress" || (s === "upcoming" && daysUntilDue(m) <= 14);
      })
      .sort((a, b) => a.due_at.localeCompare(b.due_at))
      .slice(0, 8);
  }, [milestones]);

  const activeOnboardings = useMemo(() => onboardings.filter((o) => o.status === "in_progress"), [onboardings]);

  if (!hydrated) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-background rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const isEmpty = touches.length === 0 && dueMilestones.length === 0 && activeOnboardings.length === 0 && wins.length === 0;

  return (
    <div className="mt-6 space-y-6">
      {isEmpty && (
        <div className="bg-background rounded-2xl ring-1 ring-white/[0.04] p-8 text-center">
          <p className="text-sm text-subtle max-w-md mx-auto">
            Nothing flowing through the new retention tools yet. Start an{" "}
            <Link href="/tools/onboarding" className="text-sky-300 hover:text-sky-200">onboarding</Link>,
            log a{" "}
            <Link href="/tools/cadence" className="text-sky-300 hover:text-sky-200">touch</Link>,
            spawn a{" "}
            <Link href="/tools/lifecycle" className="text-sky-300 hover:text-sky-200">milestone</Link>,
            or capture a{" "}
            <Link href="/tools/test-wins" className="text-sky-300 hover:text-sky-200">test win</Link>
            {" "}- and this surface fills up.
          </p>
        </div>
      )}

      {/* Active onboardings */}
      {activeOnboardings.length > 0 && (
        <Section
          title="Active onboardings"
          subtitle={`${activeOnboardings.length} client${activeOnboardings.length === 1 ? "" : "s"} in week one`}
          icon={<SparklesIcon className="size-5 text-white" />}
          accent="sky"
          link={{ href: "/tools/onboarding", label: "Manage" }}
        >
          <ul className="space-y-2">
            {activeOnboardings.map((o) => (
              <li key={o.id}>
                <Link href={`/tools/onboarding/${o.id}`} className="block bg-background rounded-xl p-3 ring-1 ring-white/[0.04] hover:ring-sky-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-foreground truncate">{o.client_name || "Untitled"}</span>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${OB_STATUS_TINT[o.status]}`}>
                          {OB_STATUS_LABEL[o.status]}
                        </span>
                      </div>
                      <div className="text-[11px] text-subtle">
                        Day {dayNumber(o)} · {completionPct(o)}% done · {o.csm_name || "no CSM"}
                      </div>
                      <div className="mt-2 h-1 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all" style={{ width: `${completionPct(o)}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Due / upcoming milestones */}
      {dueMilestones.length > 0 && (
        <Section
          title="Due / upcoming milestones"
          subtitle="Day 30 / 90 / 180 / 365 touchpoints across active clients"
          icon={<CalendarDaysIcon className="size-5 text-white" />}
          accent="cyan"
          link={{ href: "/tools/lifecycle", label: "All milestones" }}
        >
          <ul className="space-y-2">
            {dueMilestones.map((m) => {
              const status = resolvedStatus(m);
              const d = daysUntilDue(m);
              return (
                <li key={m.id}>
                  <Link href={`/tools/lifecycle/${m.id}`} className="block bg-background rounded-xl p-3 ring-1 ring-white/[0.04] hover:ring-cyan-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex flex-col items-center justify-center shrink-0">
                        <div className="text-sm font-bold text-white leading-none">{m.day}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-semibold text-foreground truncate">{m.client_name}</span>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${MS_STATUS_TINT[status]}`}>
                            {MS_STATUS_LABEL[status]}
                          </span>
                        </div>
                        <div className="text-[11px] text-subtle truncate">
                          {MILESTONE_TITLE[m.day]} · {d >= 0 ? `in ${d}d` : `${-d}d overdue`}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Recent touches */}
      {touches.length > 0 && (
        <Section
          title="Recent touches"
          subtitle="Last 10 client comms logged"
          icon={<ChatBubbleOvalLeftEllipsisIcon className="size-5 text-white" />}
          accent="sky"
          link={{ href: "/tools/cadence", label: "All cadence" }}
        >
          <ul className="space-y-1.5">
            {touches.map((t) => (
              <li key={t.id} className="bg-background rounded-lg p-3 ring-1 ring-white/[0.04]">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-foreground">{t.client_name}</span>
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface text-muted">{TOUCH_LABEL[t.kind]}</span>
                  <span className="text-[10px] text-subtle ml-auto">{new Date(t.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </div>
                <p className="text-[12px] text-muted line-clamp-2">{t.summary}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Test wins */}
      {wins.length > 0 && (
        <Section
          title="Recent test wins"
          subtitle="Latest winners captured for the proof deck"
          icon={<TrophyIcon className="size-5 text-white" />}
          accent="emerald"
          link={{ href: "/tools/test-wins", label: "Inbox" }}
        >
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {wins.map((w) => (
              <li key={w.id} className="bg-background rounded-xl p-3 ring-1 ring-white/[0.04]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground truncate">{w.client_anonymised || w.client_name}</span>
                  {w.uplift_pct !== undefined && (
                    <span className="text-[11px] font-mono text-emerald-300">+{w.uplift_pct}%</span>
                  )}
                </div>
                <p className="text-[11px] text-subtle line-clamp-2">{w.hypothesis || "(no hypothesis)"}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  accent,
  link,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: "emerald" | "cyan" | "sky";
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const gradient: Record<"emerald" | "cyan" | "sky", string> = {
    emerald: "from-emerald-500 to-teal-600 shadow-[0_8px_24px_rgba(16,185,129,0.3)]",
    cyan: "from-cyan-500 to-teal-600 shadow-[0_8px_24px_rgba(6,182,212,0.3)]",
    sky: "from-sky-500 to-blue-600 shadow-[0_8px_24px_rgba(14,165,233,0.3)]",
  };
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`size-9 rounded-xl bg-gradient-to-br ${gradient[accent]} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="text-[11px] text-subtle">{subtitle}</p>
          </div>
        </div>
        {link && (
          <Link href={link.href} className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-subtle hover:text-foreground">
            {link.label}
            <ArrowTopRightOnSquareIcon className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
