/* ── Discovery Audits data layer ──
 *
 * Single store, JSONB blob per audit. The output slug is unique
 * within the table; uniqueness enforced in the UI on save (loop
 * counter suffix on collision), not at the DB level.
 */

import { createStore } from "@/lib/supabase-store";
import type {
  DiscoveryAudit,
  AuditFinding,
  AuditFunnelStage,
} from "./types";

export const discoveryAuditsStore = createStore<DiscoveryAudit>({
  table: "discovery_audits",
  lsKey: "launchpad-discovery-audits",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}

export function nowISO(): string {
  return new Date().toISOString();
}

/* Slugify a brand name for the public output URL. Falls back to a
 * short random suffix when the brand is empty. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `audit-${uid().slice(0, 6)}`;
}

/* ICE score = Impact × Confidence × Ease, range 1-1000. */
export function iceScore(f: Pick<AuditFinding, "impact" | "confidence" | "ease">): number {
  const i = Math.max(1, Math.min(10, f.impact || 1));
  const c = Math.max(1, Math.min(10, f.confidence || 1));
  const e = Math.max(1, Math.min(10, f.ease || 1));
  return i * c * e;
}

export function emptyFinding(stage: AuditFunnelStage = "pdp", order = 0): AuditFinding {
  return {
    id: uid(),
    stage,
    title: "",
    observation: "",
    revenue_cost: "",
    recommended_fix: "",
    impact: 7,
    confidence: 6,
    ease: 5,
    order,
  };
}

/* Build a fresh audit shell - used by the "New audit" flow. */
export function emptyAudit(): DiscoveryAudit {
  const id = uid();
  return {
    id,
    brand_name: "",
    brand_url: "",
    revenue_band: "",
    contact_name: "",
    contact_email: "",
    status: "draft",
    ran_by: "",
    fee: 1000,
    fee_currency: "GBP",
    funnel_overview: "",
    current_conversion_rate: "",
    current_aov: "",
    primary_traffic_source: "",
    primary_device: "",
    findings: [],
    executive_summary: "",
    plan_30: { body: "" },
    plan_60: { body: "" },
    plan_90: { body: "" },
    recommended_tier: "",
    recommendation_notes: "",
    output_slug: id,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

/* Display label for each funnel stage. Order matches funnel sequence. */
export const STAGE_META: Record<
  AuditFunnelStage,
  { label: string; order: number }
> = {
  landing: { label: "Landing / collection", order: 1 },
  pdp: { label: "Product page", order: 2 },
  cart: { label: "Cart", order: 3 },
  checkout: { label: "Checkout", order: 4 },
  post_purchase: { label: "Post-purchase", order: 5 },
  other: { label: "Other", order: 6 },
};

export const STAGES: AuditFunnelStage[] = [
  "landing",
  "pdp",
  "cart",
  "checkout",
  "post_purchase",
  "other",
];

export const STATUS_LABEL: Record<DiscoveryAudit["status"], string> = {
  draft: "Draft",
  ready: "Ready to send",
  sent: "Sent",
  credited: "Credited (signed)",
  passed: "Passed",
};

export const STATUS_TINT: Record<DiscoveryAudit["status"], string> = {
  draft: "bg-[#222222] text-[#9CA3AF]",
  ready: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  sent: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  credited: "bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-500/40",
  passed: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
};
