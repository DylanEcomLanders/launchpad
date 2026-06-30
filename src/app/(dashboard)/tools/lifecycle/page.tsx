"use client";

/* ── Lifecycle milestones dashboard ──
 *
 * Reads client_onboardings to derive engagement-start dates, then
 * shows the existing milestones + a quick-create button for each
 * client × day that doesn't have one yet.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { clientOnboardingsStore } from "@/lib/client-onboarding/data";
import type { ClientOnboarding } from "@/lib/client-onboarding/types";
import {
  clientMilestonesStore,
  daysUntilDue,
  makeMilestone,
  MILESTONE_DAYS,
  resolvedStatus,
} from "@/lib/client-milestones/data";
import {
  MILESTONE_TITLE,
  STATUS_LABEL,
  STATUS_TINT,
  type ClientMilestone,
  type MilestoneDay,
} from "@/lib/client-milestones/types";

interface Engagement {
  client_name: string;
  started_at: string;
}

export default function LifecyclePage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const [milestones, setMilestones] = useState<ClientMilestone[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, o] = await Promise.all([
        clientMilestonesStore.getAll(),
        clientOnboardingsStore.getAll(),
      ]);
      if (cancelled) return;
      setMilestones(m);
      /* Derive engagements from onboardings - one per client, earliest started_at wins. */
      const map = new Map<string, Engagement>();
      for (const ob of o) {
        if (!ob.client_name) continue;
        const prev = map.get(ob.client_name);
        if (!prev || ob.started_at < prev.started_at) {
          map.set(ob.client_name, { client_name: ob.client_name, started_at: ob.started_at });
        }
      }
      setEngagements([...map.values()].sort((a, b) => a.client_name.localeCompare(b.client_name)));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  async function spawn(engagement: Engagement, day: MilestoneDay) {
    const m = makeMilestone(engagement.client_name, day, engagement.started_at);
    setMilestones((prev) => [...prev, m]);
    await clientMilestonesStore.create(m);
  }

  /* For each engagement × milestone day, look up the existing
   * milestone or null. */
  const matrix = useMemo(() => {
    return engagements.map((eng) => ({
      engagement: eng,
      cells: MILESTONE_DAYS.map((day) => {
        const m = milestones.find((x) => x.client_name === eng.client_name && x.day === day);
        return { day, milestone: m };
      }),
    }));
  }, [engagements, milestones]);

  /* Upcoming + due milestones in date order for the top callout. */
  const upcoming = useMemo(() => {
    return milestones
      .filter((m) => {
        const s = resolvedStatus(m);
        return s === "due" || s === "in_progress" || (s === "upcoming" && daysUntilDue(m) <= 14);
      })
      .sort((a, b) => a.due_at.localeCompare(b.due_at));
  }, [milestones]);

  if (!isAdmin) return (<div className="p-6"><div className="bg-background rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle">Admin / CRO only.</p></div></div>);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_8px_24px_rgba(14,165,233,0.3)]">
            <CalendarDaysIcon className="size-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
            Lifecycle
          </h1>
        </div>
        <p className="text-sm text-muted max-w-2xl">
          Day 30 / 90 / 180 / 365 milestones per client. Engagement-start derives from onboarding. Spawn each milestone close to its date; checklist + retro lives inside.
        </p>
      </header>

      {/* Upcoming callouts */}
      {hydrated && upcoming.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-wider text-subtle font-semibold mb-3">
            Due / soon ({upcoming.length})
          </h2>
          <ul className="space-y-2">
            {upcoming.map((m) => {
              const status = resolvedStatus(m);
              return (
                <li key={m.id}>
                  <Link href={`/tools/lifecycle/${m.id}`} className="block bg-background rounded-xl p-4 ring-1 ring-white/[0.04] hover:ring-sky-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex flex-col items-center justify-center text-center shadow-[0_8px_24px_rgba(14,165,233,0.3)] shrink-0">
                        <div className="text-sm font-bold text-white leading-none">{m.day}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">{m.client_name}</span>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[status]}`}>
                            {STATUS_LABEL[status]}
                          </span>
                        </div>
                        <div className="text-[12px] text-subtle">
                          {MILESTONE_TITLE[m.day]}
                        </div>
                        <div className="text-[11px] text-muted mt-1">
                          Due {new Date(m.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          {(() => {
                            const d = daysUntilDue(m);
                            return d >= 0 ? ` · in ${d}d` : ` · ${-d}d overdue`;
                          })()}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Matrix - every engagement × every milestone day */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-subtle font-semibold mb-3">
          All clients
        </h2>
        {!hydrated ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-background rounded-xl animate-pulse" />)}</div>
        ) : matrix.length === 0 ? (
          <div className="bg-background rounded-2xl p-12 text-center ring-1 ring-white/[0.04]">
            <p className="text-sm text-subtle">No engagements yet. Create an onboarding first.</p>
          </div>
        ) : (
          <div className="bg-background rounded-2xl ring-1 ring-white/[0.04] overflow-hidden">
            <div className="grid grid-cols-[1fr_repeat(4,minmax(0,1fr))] gap-2 px-4 py-3 border-b border-white/[0.04] text-[10px] uppercase tracking-wider text-subtle font-semibold">
              <div>Client</div>
              <div>Day 30</div>
              <div>Day 90</div>
              <div>Day 180</div>
              <div>Day 365</div>
            </div>
            {matrix.map(({ engagement, cells }) => (
              <div key={engagement.client_name} className="grid grid-cols-[1fr_repeat(4,minmax(0,1fr))] gap-2 px-4 py-3 border-b border-white/[0.04] items-center text-[13px] hover:bg-white/[0.02] transition-colors">
                <div className="text-foreground truncate font-medium">{engagement.client_name}</div>
                {cells.map(({ day, milestone }) => {
                  if (milestone) {
                    const s = resolvedStatus(milestone);
                    const d = daysUntilDue(milestone);
                    return (
                      <Link key={day} href={`/tools/lifecycle/${milestone.id}`} className={`block px-2 py-1.5 rounded text-[11px] uppercase tracking-wider font-semibold text-center transition-all hover:opacity-80 ${STATUS_TINT[s]}`}>
                        {STATUS_LABEL[s]}
                        {s === "upcoming" && d >= 0 && <span className="font-mono normal-case ml-1">{d}d</span>}
                      </Link>
                    );
                  }
                  const dueAt = new Date(new Date(engagement.started_at).getTime() + day * 86_400_000);
                  const daysLeft = Math.round((dueAt.getTime() - Date.now()) / 86_400_000);
                  return (
                    <button key={day} onClick={() => spawn(engagement, day)} className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] uppercase tracking-wider text-subtle hover:text-foreground bg-surface hover:bg-surface-raised">
                      <PlusIcon className="size-3" />
                      Spawn
                      <span className="font-mono normal-case text-[9px] opacity-50">{daysLeft >= 0 ? `${daysLeft}d` : `${-daysLeft}d ago`}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
