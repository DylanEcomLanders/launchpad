/* ── Pipeline data layer ──
 *
 * Single createStore for leads. Pipeline rules (speed-to-lead,
 * 7-day close, finite follow-up) live in helpers here so the UI
 * can surface them as soft alerts without inventing logic.
 */

import { createStore } from "@/lib/supabase-store";
import type { Lead, LeadStage, SalesCall } from "./types";

export const leadsStore = createStore<Lead>({
  table: "leads",
  lsKey: "launchpad-leads",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function emptyLead(): Lead {
  const id = uid();
  return {
    id,
    full_name: "",
    brand_name: "",
    brand_url: "",
    email: "",
    path: "warm",
    stage: "new",
    source: "",
    owner: "",
    revenue_band: "",
    next_action: "",
    notes: "",
    touches: [],
    sales_calls: [],
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

/* Fresh structured call shell. Defaults follow the playbook's
 * call script - the closer fills phase notes inline. */
export function emptySalesCall(ranBy = ""): SalesCall {
  return {
    id: uid(),
    ran_by: ranBy,
    called_at: nowISO(),
    frame_notes: "",
    discovery: {
      monthly_revenue: "",
      biggest_funnel_loss: "",
      prior_cro_tried: "",
      decision_maker: "",
      prize_value: "",
      why_now: "",
    },
    discovery_notes: "",
    demo_notes: "",
    close_notes: "",
    next_action_booked: "",
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

/* Days since an ISO timestamp. Returns null when missing. */
export function daysSince(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

/* Pipeline-rule risk flags - speed-to-lead, stale touch, missing
 * next action. Returns one or more reasons that the UI can surface
 * on the lead card. */
export interface LeadRisk {
  label: string;
  severity: "warn" | "danger";
}
export function risksFor(lead: Lead): LeadRisk[] {
  const risks: LeadRisk[] = [];
  if (lead.stage === "closed_won" || lead.stage === "closed_lost" || lead.stage === "nurture") {
    return risks;
  }
  /* Speed-to-lead: target 15 min from create → first contact. We
   * approximate "first contact" via first_touch_at; if not set 1h
   * after create, surface warn; after 2h, danger. */
  if (!lead.first_touch_at) {
    const created = new Date(lead.created_at).getTime();
    const ageMins = (Date.now() - created) / 60_000;
    if (ageMins > 120) risks.push({ label: "No first touch yet", severity: "danger" });
    else if (ageMins > 15) risks.push({ label: "Speed-to-lead overdue", severity: "warn" });
  }
  /* Stale touch: nothing in 7+ days (playbook target time-to-close
   * is 7 days). */
  const sinceTouch = daysSince(lead.last_touched_at);
  if (sinceTouch !== null && sinceTouch >= 7) {
    risks.push({
      label: `${sinceTouch}d since last touch`,
      severity: sinceTouch >= 14 ? "danger" : "warn",
    });
  }
  /* Missing next action / date. */
  if (!lead.next_action.trim() || !lead.next_action_date) {
    risks.push({ label: "No next action", severity: "warn" });
  } else {
    /* Overdue next action. */
    const due = new Date(lead.next_action_date + "T23:59:59").getTime();
    if (Date.now() > due) {
      risks.push({ label: "Next action overdue", severity: "danger" });
    }
  }
  return risks;
}

/* Recommended tier from the revenue_band free-text. Cheap parse:
 * extracts the first number + £k|m unit, maps to band. Best-effort. */
export function tierFromRevenueBand(band: string): "Entry" | "Core" | "VIP" | null {
  if (!band) return null;
  const m = band.replace(/,/g, "").match(/(\d+\.?\d*)\s*([km])/i);
  if (!m) return null;
  const value = Number(m[1]);
  const unit = m[2].toLowerCase();
  const monthlyK = unit === "m" ? value * 1000 : value;
  if (monthlyK < 200) return null;
  if (monthlyK < 400) return "Entry";
  if (monthlyK < 800) return "Core";
  return "VIP";
}

export function stageTransitionStamp(
  prev: LeadStage,
  next: LeadStage,
): Partial<Lead> {
  const stamp: Partial<Lead> = { stage: next };
  if ((next === "closed_won" || next === "closed_lost") && prev !== next) {
    stamp.closed_at = nowISO();
  }
  /* First touch fires when leaving 'new' for the first time. */
  if (prev === "new" && next !== "new") {
    stamp.first_touch_at = nowISO();
    stamp.last_touched_at = nowISO();
  }
  return stamp;
}
