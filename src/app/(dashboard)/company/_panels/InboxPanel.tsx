"use client";

/* ── Inbox ──
 *
 * The action queue. Tells the admin what needs them THIS week, not
 * vanity stats. Five sections in order of urgency:
 *
 *   1. Contracts awaiting your counter-sign
 *   2. Scoring periods drafted + ready to lock (attach to invoices)
 *   3. Onboarding clocks at day 25+ (30-day review imminent)
 *   4. Bonuses due (scoring locked, not yet logged as paid)
 *   5. Recent bonus / agreement activity (last 10)
 *
 * Each section either renders rows with a primary action button or
 * collapses to a "Nothing here" muted line so the eye knows it's
 * been checked.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  LockClosedIcon,
  SparklesIcon,
  ClockIcon,
  ShieldCheckIcon,
  CurrencyPoundIcon,
} from "@heroicons/react/24/outline";
import { peopleStore, fmtDateUK, fmtMoney } from "@/lib/company/data";
import { agreementStore } from "@/lib/agreements/data";
import type { Agreement } from "@/lib/agreements/types";
import type { Person, BonusPayment, ScoringPeriod } from "@/lib/company/types";
import { ONBOARDING_PERIOD_DAYS } from "@/lib/company/onboarding";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { personByKanbanName } from "@/lib/people/resolver";
import type { MockClient, MockDeliverable } from "@/lib/projects/mock-data";

/* KPI suggestion - a test win the kanban detected for a person who
 * hasn't been paid for that specific win yet. The convention for
 * dedup: BonusPayment.scoring_period_id starts with "kpi-win-" +
 * the kanban deliverable id, so re-renders skip already-paid
 * suggestions without needing a separate join table. */
interface KpiSuggestion {
  person: Person;
  deliverable: MockDeliverable;
  client: MockClient;
  amount: number;
  currency: string;
}

/* +5% of monthly comp per test win, matching the contractor scheme
 * doc's per-test-win bonus. Adjust if/when the scheme changes. */
const KPI_WIN_BONUS_PCT = 5;

/* Default pay date for newly-approved bonuses: 28th of NEXT month.
 * Matches the contractor scheme doc's monthly cycle (invoices by 26th,
 * paid on 28th) AND gives the admin a buffer to approve now without
 * scrambling for cash with 2 days notice. */
function nextMonthPayDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 28);
  return next.toISOString().slice(0, 10);
}

/* "Scheduled" if paid_at hasn't happened yet, "Paid" once it's
 * today or past. Shared with the per-Person Bonuses tab via the
 * matching helper there. */
export function isScheduled(paidAt: string): boolean {
  return paidAt > new Date().toISOString().slice(0, 10);
}

interface ScoringReadyToLock {
  person: Person;
  period: ScoringPeriod;
}

interface OnboardingNearEnd {
  person: Person;
  daysIn: number;
  startedAt: string;
}

interface BonusDue {
  person: Person;
  period: ScoringPeriod;
}

interface ActivityEvent {
  id: string;
  ts: string;
  text: string;
  href: string;
}

export default function InboxPanel() {
  const [people, setPeople] = useState<Person[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { clients } = useKanbanData();

  useEffect(() => {
    Promise.all([peopleStore.getAll(), agreementStore.getAll()]).then(
      ([p, a]) => {
        setPeople(p);
        setAgreements(a);
        setHydrated(true);
      },
    );
  }, []);

  /* Sections ---------------------------------------------------- */

  const awaitingCounterSign = useMemo(
    () => agreements.filter((a) => a.status === "team_signed"),
    [agreements],
  );

  const scoringReady = useMemo<ScoringReadyToLock[]>(() => {
    const rows: ScoringReadyToLock[] = [];
    for (const p of people) {
      for (const period of p.scoring_periods || []) {
        if (period.status === "draft" && period.entries.length > 0) {
          rows.push({ person: p, period });
        }
      }
    }
    rows.sort((a, b) =>
      (b.period.updated_at || "").localeCompare(a.period.updated_at || ""),
    );
    return rows;
  }, [people]);

  const onboardingNearEnd = useMemo<OnboardingNearEnd[]>(() => {
    const rows: OnboardingNearEnd[] = [];
    for (const p of people) {
      if (p.status !== "onboarding") continue;
      const startedAt = p.onboarding_started_at || p.start_date;
      if (!startedAt) continue;
      const daysIn = Math.floor(
        (Date.now() - new Date(startedAt + "T00:00:00Z").getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysIn >= 25) rows.push({ person: p, daysIn, startedAt });
    }
    rows.sort((a, b) => b.daysIn - a.daysIn);
    return rows;
  }, [people]);

  const bonusesDue = useMemo<BonusDue[]>(() => {
    const rows: BonusDue[] = [];
    for (const p of people) {
      const payments = p.bonus_payments || [];
      const paidPeriodIds = new Set(
        payments
          .map((b) => b.scoring_period_id)
          .filter((x): x is string => !!x),
      );
      for (const period of p.scoring_periods || []) {
        if (period.status !== "locked") continue;
        if (paidPeriodIds.has(period.id)) continue;
        if (!period.final_delta_pct) continue;
        rows.push({ person: p, period });
      }
    }
    rows.sort((a, b) =>
      (b.period.locked_at || "").localeCompare(a.period.locked_at || ""),
    );
    return rows;
  }, [people]);

  /* KPI bonus suggestions. Walks kanban for test wins concluded in
   * the last 30 days, resolves each assignee to a Person via name
   * match, filters out already-paid suggestions via the kpi-win-XX
   * scoring_period_id convention. */
  const kpiSuggestions = useMemo<KpiSuggestion[]>(() => {
    const out: KpiSuggestion[] = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    for (const c of clients) {
      for (const proj of c.projects) {
        for (const d of proj.deliverables) {
          const r = d.testResult;
          if (!r || r.outcome !== "winner") continue;
          if (!r.concludedAt || r.concludedAt < thirtyDaysAgo) continue;

          const assignees = [
            d.designer,
            d.secondaryDesigner,
            d.developer,
            d.secondaryDeveloper,
          ];
          for (const p of people) {
            if (!assignees.some((n) => personByKanbanName(n, [p])?.id === p.id)) {
              continue;
            }
            const dedupKey = `kpi-win-${d.id}`;
            const alreadyPaid = (p.bonus_payments || []).some(
              (b) => b.scoring_period_id === dedupKey,
            );
            if (alreadyPaid) continue;
            /* Double-bonus guard: suppress if this deliverable is
             * already an entry in any of this person's scoring periods
             * (locked or draft). Prevents paying for the same test
             * win via KPI suggestion AND scheme period. */
            const scoredInPeriod = (p.scoring_periods || []).some((period) =>
              period.entries.some((e) => e.evidence_ref === d.id),
            );
            if (scoredInPeriod) continue;
            const base = p.compensation_amount ?? 0;
            if (base <= 0) continue;
            out.push({
              person: p,
              deliverable: d,
              client: c,
              amount: Number(((base * KPI_WIN_BONUS_PCT) / 100).toFixed(2)),
              currency: p.compensation_currency || "GBP",
            });
          }
        }
      }
    }
    out.sort((a, b) =>
      (b.deliverable.testResult?.concludedAt || "").localeCompare(
        a.deliverable.testResult?.concludedAt || "",
      ),
    );
    return out;
  }, [people, clients]);

  const activity = useMemo<ActivityEvent[]>(() => {
    const evs: ActivityEvent[] = [];
    for (const a of agreements) {
      if (a.counter_signed_at) {
        evs.push({
          id: `agr-${a.id}-cs`,
          ts: a.counter_signed_at,
          text: `Contract counter-signed for ${a.person_full_name}`,
          href: `/company/contracts/${a.id}`,
        });
      }
      if (a.team_signed_at) {
        evs.push({
          id: `agr-${a.id}-ts`,
          ts: a.team_signed_at,
          text: `Contract signed by ${a.person_full_name}`,
          href: `/company/contracts/${a.id}`,
        });
      }
    }
    for (const p of people) {
      for (const b of p.bonus_payments || []) {
        evs.push({
          id: `bp-${b.id}`,
          ts: b.paid_at,
          text: `Bonus logged for ${p.full_name}: ${fmtMoney(b.amount, b.currency)} (${b.reason || b.kind})`,
          href: `/company/people/${p.id}?tab=bonuses`,
        });
      }
    }
    return evs.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 10);
  }, [people, agreements]);

  /* Mark a KPI-suggested bonus paid. Tags the BonusPayment with the
   * kpi-win-<deliverable-id> dedup key so this suggestion doesn't
   * re-appear on the next render. */
  async function logKpiBonus(s: KpiSuggestion) {
    const r = s.deliverable.testResult;
    const reason =
      r && r.metric && r.upliftPct != null
        ? `Test win - ${s.deliverable.title} (+${r.upliftPct}% ${r.metric})`
        : `Test win - ${s.deliverable.title}`;
    const payment: BonusPayment = {
      id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: "contractor_scheme",
      amount: s.amount,
      currency: s.currency,
      /* Scheduled for next month's 28th so the admin approves now and
       * the cash leaves on the regular cycle, not with 2 days notice. */
      paid_at: nextMonthPayDate(),
      reason,
      scoring_period_id: `kpi-win-${s.deliverable.id}`,
      paid_by: "admin",
      created_at: new Date().toISOString(),
    };
    const updated = {
      ...s.person,
      bonus_payments: [payment, ...(s.person.bonus_payments || [])],
      updated_at: new Date().toISOString(),
    };
    await peopleStore.update(s.person.id, updated);
    setPeople((prev) => prev.map((p) => (p.id === s.person.id ? updated : p)));
  }

  /* Mark a bonus paid - logs a BonusPayment + the Inbox row falls
   * off. Bonus amount derives from compensation_amount * delta/100;
   * admin can edit later via the Bonuses tab. */
  async function logScoringBonus(person: Person, period: ScoringPeriod) {
    const delta = period.final_delta_pct ?? 0;
    const base = person.compensation_amount ?? 0;
    const amount = Number(((base * delta) / 100).toFixed(2));
    const payment: BonusPayment = {
      id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: "contractor_scheme",
      amount,
      currency: person.compensation_currency || "GBP",
      /* Scheduled for next month's 28th - approve now, pay later. */
      paid_at: nextMonthPayDate(),
      reason: `Scoring period ${period.period_key} (${delta > 0 ? "+" : ""}${delta}%)`,
      scoring_period_id: period.id,
      paid_by: "admin",
      created_at: new Date().toISOString(),
    };
    const updated = {
      ...person,
      bonus_payments: [payment, ...(person.bonus_payments || [])],
      updated_at: new Date().toISOString(),
    };
    await peopleStore.update(person.id, updated);
    setPeople((prev) => prev.map((p) => (p.id === person.id ? updated : p)));
  }

  if (!hydrated) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-background rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const totalActions =
    awaitingCounterSign.length +
    scoringReady.length +
    onboardingNearEnd.length +
    bonusesDue.length +
    kpiSuggestions.length;

  return (
    <div className="space-y-4">
      <div className="text-[11px] uppercase tracking-wider text-subtle">
        {totalActions === 0
          ? "Inbox clear"
          : `${totalActions} action${totalActions === 1 ? "" : "s"} waiting`}
      </div>

      {/* Section 1 - Contracts awaiting counter-sign */}
      <InboxSection
        icon={ShieldCheckIcon}
        title="Contracts awaiting your counter-sign"
        count={awaitingCounterSign.length}
        empty="Nothing to sign right now."
      >
        {awaitingCounterSign.map((a) => (
          <Row
            key={a.id}
            primary={`Contract - ${a.person_full_name}`}
            secondary={`Signed by them ${a.team_signed_at ? fmtDateUK(a.team_signed_at.slice(0, 10)) : ""}`}
            action={
              <Link
                href={`/company/contracts/${a.id}`}
                className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-foreground text-background hover:bg-foreground"
              >
                Counter-sign
              </Link>
            }
          />
        ))}
      </InboxSection>

      {/* Section 2 - Scoring periods ready to lock */}
      <InboxSection
        icon={LockClosedIcon}
        title="Scoring drafts ready to lock"
        count={scoringReady.length}
        empty="No drafts waiting."
      >
        {scoringReady.map((r) => (
          <Row
            key={r.period.id}
            primary={`${r.person.full_name} - ${r.period.period_key}`}
            secondary={`${r.period.entries.length} entries, ${r.period.scheme === "per_page" ? "per-build" : "monthly"} scheme`}
            action={
              <Link
                href={`/company/people/${r.person.id}?tab=scoring`}
                className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-border text-foreground hover:bg-border"
              >
                Review & lock
              </Link>
            }
          />
        ))}
      </InboxSection>

      {/* Section 3 - Onboarding day 25+ */}
      <InboxSection
        icon={ClockIcon}
        title="30-day reviews coming up"
        count={onboardingNearEnd.length}
        empty="No-one near their 30-day review."
      >
        {onboardingNearEnd.map((o) => (
          <Row
            key={o.person.id}
            primary={o.person.full_name}
            secondary={`Day ${Math.min(o.daysIn, ONBOARDING_PERIOD_DAYS)} of ${ONBOARDING_PERIOD_DAYS} · started ${fmtDateUK(o.startedAt)}`}
            action={
              <Link
                href={`/company/people/${o.person.id}?tab=onboarding`}
                className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-border text-foreground hover:bg-border"
              >
                Review
              </Link>
            }
          />
        ))}
      </InboxSection>

      {/* Section 4 - Bonuses due */}
      <InboxSection
        icon={CurrencyPoundIcon}
        title="Bonuses due"
        count={bonusesDue.length}
        empty="No bonuses awaiting payment."
      >
        {bonusesDue.map((b) => {
          const delta = b.period.final_delta_pct ?? 0;
          const base = b.person.compensation_amount ?? 0;
          const computed = (base * delta) / 100;
          const payDate = nextMonthPayDate();
          return (
            <Row
              key={b.period.id}
              primary={`${b.person.full_name} - ${b.period.period_key}`}
              secondary={`${delta > 0 ? "+" : ""}${delta}% of ${fmtMoney(base, b.person.compensation_currency || "GBP")} = ${fmtMoney(computed, b.person.compensation_currency || "GBP")} · pay ${fmtDateUK(payDate)}`}
              action={
                <button
                  onClick={() => logScoringBonus(b.person, b.period)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-success text-white hover:bg-success"
                >
                  <CheckCircleIcon className="size-3.5" />
                  Approve
                </button>
              }
            />
          );
        })}
      </InboxSection>

      {/* Section 5 - KPI-driven bonus suggestions (auto from kanban) */}
      <InboxSection
        icon={SparklesIcon}
        title="KPI bonus suggestions"
        count={kpiSuggestions.length}
        empty="No new test wins to celebrate in the last 30 days."
      >
        {kpiSuggestions.map((s) => {
          const r = s.deliverable.testResult;
          const upliftLabel =
            r?.upliftPct != null && r.metric
              ? `+${r.upliftPct}% ${r.metric}`
              : "test win";
          const payDate = nextMonthPayDate();
          return (
            <Row
              key={`${s.person.id}-${s.deliverable.id}`}
              primary={`${s.person.full_name} - ${s.deliverable.title}`}
              secondary={`${upliftLabel} on ${s.client.name} · ${fmtMoney(s.amount, s.currency)} (${KPI_WIN_BONUS_PCT}% of ${fmtMoney(s.person.compensation_amount ?? 0, s.currency)}) · pay ${fmtDateUK(payDate)}`}
              action={
                <button
                  onClick={() => logKpiBonus(s)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-success text-white hover:bg-success"
                >
                  <CheckCircleIcon className="size-3.5" />
                  Approve
                </button>
              }
            />
          );
        })}
      </InboxSection>

      {/* Cross-cutting links - the surfaces that aren't top tabs but
          still benefit from a click target somewhere obvious. */}
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-subtle">
        <Link
          href="/company/contracts"
          className="hover:text-foreground transition-colors"
        >
          All contracts →
        </Link>
        <span className="text-muted">·</span>
        <Link
          href="/company/bonuses"
          className="hover:text-foreground transition-colors"
        >
          All bonuses →
        </Link>
        <span className="text-muted">·</span>
        <Link
          href="/company/invoices"
          className="hover:text-foreground transition-colors"
        >
          All invoices →
        </Link>
      </div>

      {/* Section 6 - Recent activity (log) */}
      <div className="bg-background ring-1 ring-border shadow-[0_8px_32px_rgba(0,0,0,0.35)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <SparklesIcon className="size-4 text-subtle" />
          <h2 className="text-[11px] uppercase tracking-wider text-subtle font-semibold">
            Recent activity
          </h2>
        </div>
        {activity.length === 0 ? (
          <div className="px-5 py-6 text-xs text-subtle">
            No recent activity.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((e) => (
              <li key={e.id} className="px-5 py-2.5">
                <Link
                  href={e.href}
                  className="flex items-center justify-between gap-3 text-sm group"
                >
                  <span className="text-foreground group-hover:underline">
                    {e.text}
                  </span>
                  <span className="text-[11px] text-subtle whitespace-nowrap">
                    {fmtDateUK(e.ts.slice(0, 10))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InboxSection({
  icon: Icon,
  title,
  count,
  empty,
  children,
}: {
  icon: typeof ClockIcon;
  title: string;
  count: number;
  empty: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-background ring-1 ring-border shadow-[0_8px_32px_rgba(0,0,0,0.35)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-subtle" />
          <h2 className="text-[11px] uppercase tracking-wider text-subtle font-semibold">
            {title}
          </h2>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-subtle tabular-nums">
          {count === 0 ? "0" : count}
        </span>
      </div>
      {count === 0 ? (
        <div className="px-5 py-6 text-xs text-subtle">{empty}</div>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </div>
  );
}

function Row({
  primary,
  secondary,
  action,
}: {
  primary: string;
  secondary?: string;
  action: React.ReactNode;
}) {
  return (
    <li className="px-5 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground truncate">
          {primary}
        </div>
        {secondary && (
          <div className="text-xs text-subtle mt-0.5 truncate">
            {secondary}
          </div>
        )}
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}
