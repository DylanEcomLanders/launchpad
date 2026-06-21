// Sales Dashboard — pure metric + alert calculations.
// No I/O, no React. Everything takes data in and returns numbers/objects,
// so it's trivially unit-testable and reusable at wire-up.

import { COLD_LEAD_DAYS, STALE_DEAL_DAYS, FUNNEL_STEPS } from "./config";
import type { Deal, Lead, LeadTask, PipelineStage } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;

/** Whole days between two ISO timestamps (a - b), floored. */
export function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(a).getTime() - new Date(b).getTime()) / DAY_MS);
}

function stageById(stages: PipelineStage[], id: string): PipelineStage | undefined {
  return stages.find((s) => s.id === id);
}

/** Open leads = not in a won or lost stage. */
export function openLeads(leads: Lead[], stages: PipelineStage[]): Lead[] {
  return leads.filter((l) => {
    const stage = stageById(stages, l.stage_id);
    return stage && !stage.is_won && !stage.is_lost;
  });
}

/** Σ expected_mrr × probability/100 across open leads. */
export function weightedPipelineValue(leads: Lead[], stages: PipelineStage[]): number {
  return openLeads(leads, stages).reduce((sum, l) => {
    const stage = stageById(stages, l.stage_id);
    if (!stage) return sum;
    return sum + l.expected_mrr * (stage.probability / 100);
  }, 0);
}

/** Σ deals.mrr where closed_at falls in the same month as `today`. */
export function mrrClosingThisMonth(deals: Deal[], today: string): number {
  const ref = new Date(today);
  return deals.reduce((sum, d) => {
    const closed = new Date(d.closed_at);
    const sameMonth =
      closed.getUTCFullYear() === ref.getUTCFullYear() &&
      closed.getUTCMonth() === ref.getUTCMonth();
    return sameMonth ? sum + d.mrr : sum;
  }, 0);
}

/** Count of open leads sitting in a stage named "Negotiation". */
export function dealsInNegotiation(leads: Lead[], stages: PipelineStage[]): number {
  const negotiation = stages.find((s) => s.name.toLowerCase() === "negotiation");
  if (!negotiation) return 0;
  return leads.filter((l) => l.stage_id === negotiation.id).length;
}

/** Tasks due on or before end of `today`, not yet completed. */
export function followUpsDueToday(tasks: LeadTask[], today: string): LeadTask[] {
  const endOfToday = new Date(today);
  endOfToday.setUTCHours(23, 59, 59, 999);
  return tasks.filter((t) => !t.completed_at && new Date(t.due_at) <= endOfToday);
}

export interface FunnelStep {
  name: string;
  /** Leads that reached this step or beyond. */
  count: number;
  /** Conversion rate from the previous step (0–100). null for the first step. */
  rateFromPrev: number | null;
}

/**
 * Conversion funnel across FUNNEL_STEPS. A lead "reached" a step if its
 * current stage position is >= that step's position (cumulative funnel).
 * Lost leads still count toward whatever step they reached before dying.
 */
export function conversionFunnel(leads: Lead[], stages: PipelineStage[]): FunnelStep[] {
  const positionOf = (name: string) =>
    stages.find((s) => s.name === name)?.position ?? Infinity;

  const leadPosition = (l: Lead) => stageById(stages, l.stage_id)?.position ?? -1;

  let prevCount: number | null = null;
  return FUNNEL_STEPS.map((name) => {
    const stepPos = positionOf(name);
    const count = leads.filter((l) => leadPosition(l) >= stepPos).length;
    const rateFromPrev =
      prevCount === null || prevCount === 0
        ? null
        : Math.round((count / prevCount) * 100);
    prevCount = count;
    return { name, count, rateFromPrev };
  });
}

export type AlertKind = "follow_up_due" | "lead_cold" | "deal_stale";

export interface Alert {
  kind: AlertKind;
  leadId: string;
  leadName: string;
  /** Human-readable reason, e.g. "No contact in 8 days". */
  detail: string;
}

/**
 * All active alerts. Hook for Slack delivery lives at the call site —
 * see SLACK_HOOK in the client. We do NOT fire Slack here.
 */
export function computeAlerts(
  leads: Lead[],
  tasks: LeadTask[],
  stages: PipelineStage[],
  today: string,
): Alert[] {
  const alerts: Alert[] = [];
  const open = openLeads(leads, stages);
  const leadName = (id: string) => leads.find((l) => l.id === id)?.name ?? "Unknown";

  // Follow-up due / overdue
  for (const t of followUpsDueToday(tasks, today)) {
    const overdueDays = daysBetween(today, t.due_at);
    alerts.push({
      kind: "follow_up_due",
      leadId: t.lead_id,
      leadName: leadName(t.lead_id),
      detail:
        overdueDays > 0 ? `Follow-up ${overdueDays}d overdue: ${t.title}` : `Follow-up due today: ${t.title}`,
    });
  }

  // Lead cold (no contact in COLD_LEAD_DAYS days)
  for (const l of open) {
    if (!l.last_contact_at) continue;
    const since = daysBetween(today, l.last_contact_at);
    if (since >= COLD_LEAD_DAYS) {
      alerts.push({
        kind: "lead_cold",
        leadId: l.id,
        leadName: l.name,
        detail: `No contact in ${since} days`,
      });
    }
  }

  // Deal stale (open lead sitting in same stage > STALE_DEAL_DAYS).
  // Proxy: time since last update while still open.
  for (const l of open) {
    const inStage = daysBetween(today, l.updated_at);
    if (inStage > STALE_DEAL_DAYS) {
      const stage = stageById(stages, l.stage_id);
      alerts.push({
        kind: "deal_stale",
        leadId: l.id,
        leadName: l.name,
        detail: `${inStage}d in ${stage?.name ?? "stage"} with no movement`,
      });
    }
  }

  return alerts;
}
