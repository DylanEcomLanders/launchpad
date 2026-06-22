/* ── Sales Dashboard - persistence helpers ──
 *
 * The Sales Dashboard renders adapter-shape data (Lead with
 * stage_id, etc.) but persistence happens against the real
 * /lib/leads + /lib/proposals stores which use a different field
 * shape (stage enum, touches array, etc.).
 *
 * Every mutation the dashboard does (drag-to-stage, log-touch,
 * edit-notes, change-next-action) calls one of the helpers below,
 * which reverse-maps the adapter shape into the source store's
 * shape and fires the update. Fire-and-forget: local state in the
 * client owns optimistic UI; this layer just guarantees a refresh
 * later picks up the same value. Errors are logged but don't break
 * the UI.
 *
 * Plug-in ready: outbound messaging is routed through
 * /api/sales/outbound/send (stub today, real API tomorrow). Inbound
 * webhook endpoints under /api/sales/inbound/{whatsapp,twitter,
 * linkedin,email} append touches via persistTouch().
 */

import { leadsStore } from "@/lib/leads/data";
import type { Lead as MyLead, LeadStage, LeadTouch, LeadTouchKind } from "@/lib/leads/types";

/* Adapter pipeline-stage id → source-store LeadStage enum. Must
 * stay in lockstep with REAL_STAGES in real-source.ts. */
const STAGE_ID_TO_ENUM: Record<string, LeadStage> = {
  "stg-new": "new",
  "stg-qualified": "qualified",
  "stg-discovery": "discovery_audit",
  "stg-proposal": "proposed",
  "stg-won": "closed_won",
  "stg-lost": "closed_lost",
};

/* Mirror a stage move from the kanban back to the source lead. */
export async function persistStageMove(leadId: string, stageId: string): Promise<void> {
  const stage = STAGE_ID_TO_ENUM[stageId];
  if (!stage) {
    console.warn(`[sales-dashboard/persistence] Unknown stage id: ${stageId}`);
    return;
  }
  const patch: Partial<MyLead> = { stage, updated_at: new Date().toISOString() };
  if (stage === "closed_won" || stage === "closed_lost") {
    patch.closed_at = new Date().toISOString();
  }
  try {
    await leadsStore.update(leadId, patch);
  } catch (err) {
    console.error("[sales-dashboard/persistence] persistStageMove failed:", err);
  }
}

/* Update the free-text notes blob on a lead. */
export async function persistNotes(leadId: string, notes: string): Promise<void> {
  try {
    await leadsStore.update(leadId, { notes, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error("[sales-dashboard/persistence] persistNotes failed:", err);
  }
}

/* Update next-action text + date on a lead. */
export async function persistNextAction(
  leadId: string,
  next_action: string,
  next_action_date?: string,
): Promise<void> {
  try {
    await leadsStore.update(leadId, {
      next_action,
      next_action_date,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[sales-dashboard/persistence] persistNextAction failed:", err);
  }
}

/* Append a touch to the lead's touch log AND bump last_touched_at.
 * Used by both manual log-touch (from the dashboard UI) and inbound
 * webhook endpoints. */
export async function persistTouch(
  leadId: string,
  touch: { kind: LeadTouchKind; by: string; summary: string },
): Promise<void> {
  try {
    const lead = await leadsStore.getById(leadId);
    if (!lead) {
      console.warn(`[sales-dashboard/persistence] persistTouch: lead ${leadId} not found`);
      return;
    }
    const now = new Date().toISOString();
    const next: LeadTouch = {
      id: `touch-${Math.random().toString(36).slice(2, 10)}`,
      kind: touch.kind,
      at: now,
      by: touch.by,
      summary: touch.summary,
    };
    await leadsStore.update(leadId, {
      touches: [...lead.touches, next],
      last_touched_at: now,
      updated_at: now,
    });
  } catch (err) {
    console.error("[sales-dashboard/persistence] persistTouch failed:", err);
  }
}

/* Create a brand-new lead from the dashboard's Add Lead flow.
 * Defaults match the source store's required fields; caller passes
 * only what they captured in the form. */
export async function persistNewLead(input: {
  full_name: string;
  brand_name: string;
  brand_url: string;
  email: string;
  source: string;
  owner: string;
  revenue_band?: string;
  next_action?: string;
}): Promise<MyLead> {
  const now = new Date().toISOString();
  const lead: MyLead = {
    id: `lead-${Math.random().toString(36).slice(2, 10)}`,
    full_name: input.full_name.trim(),
    brand_name: input.brand_name.trim(),
    brand_url: input.brand_url.trim(),
    email: input.email.trim(),
    path: "cold_direct",
    stage: "new",
    source: input.source.trim(),
    owner: input.owner.trim(),
    revenue_band: input.revenue_band?.trim() || "",
    next_action: input.next_action?.trim() || "Reach out",
    notes: "",
    touches: [],
    sales_calls: [],
    created_at: now,
    updated_at: now,
  };
  await leadsStore.create(lead);
  return lead;
}

/* Send an outbound message via the channel API stub. Always records
 * an outbound touch so the dashboard's inbox reflects the send.
 * When the real channel API is plugged in (WhatsApp Business,
 * Twitter X DM, LinkedIn Messaging, SMTP/Postmark), the route
 * handler at /api/sales/outbound/send becomes a router and this
 * helper doesn't need to change. */
export async function sendOutbound(
  leadId: string,
  channel: "whatsapp" | "twitter" | "linkedin" | "email",
  body: string,
  by: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/sales/outbound/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, channel, body, by }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: text || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
