/* ── Throughput calculations ──
 *
 * Pulls clients + their tier from proposals (latest signed wins),
 * then counts pages shipped + tests live this month and compares
 * against the per-tier monthly targets from the playbook.
 *
 * No new table - composes ab_tests + roadmaps + proposals.
 */

import type { AbTest } from "@/lib/tests/types";
import type { Roadmap } from "@/lib/roadmaps/types";
import type { Proposal, ProposalTier } from "@/lib/proposals/types";

/* Per-tier monthly targets from the playbook. */
export const TIER_TARGETS: Record<Exclude<ProposalTier, "Custom">, { pages: number; tests: number }> = {
  Entry: { pages: 2, tests: 2 },
  Core: { pages: 4, tests: 4 },
  VIP: { pages: 6, tests: 12 },
};

export type RiskLevel = "on_track" | "behind" | "critical";

export interface ClientThroughput {
  client_name: string;
  tier: ProposalTier;
  pages_shipped: number;
  pages_target: number;
  tests_live: number;
  tests_target: number;
  pages_risk: RiskLevel;
  tests_risk: RiskLevel;
  worst_risk: RiskLevel;
}

function startOfMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function monthProgressPct(): number {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return (d.getTime() - start) / (end - start);
}

/* Risk level for a (actual, target) pair, scaled against month-progress. */
export function riskFor(actual: number, target: number): RiskLevel {
  if (target === 0) return "on_track";
  const progress = monthProgressPct();
  /* Expected by now = target * progress. Tolerance: 10% of target. */
  const expected = target * progress;
  const tolerance = Math.max(0.5, target * 0.1);
  if (actual >= expected - tolerance) return "on_track";
  if (actual >= expected - tolerance * 2) return "behind";
  return "critical";
}

const RANK: Record<RiskLevel, number> = { on_track: 0, behind: 1, critical: 2 };
function worse(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RANK[a] >= RANK[b] ? a : b;
}

/* Map each client's current tier from the most recent signed/paid/kicked-off proposal. */
export function tiersByClient(proposals: Proposal[]): Map<string, ProposalTier> {
  const map = new Map<string, { tier: ProposalTier; at: string }>();
  for (const p of proposals) {
    if (p.status !== "signed" && p.status !== "paid" && p.status !== "kicked_off") continue;
    const at = p.signed_at || p.paid_at || p.kicked_off_at || p.created_at;
    const prev = map.get(p.brand_name);
    if (!prev || at > prev.at) {
      map.set(p.brand_name, { tier: p.tier, at });
    }
  }
  const out = new Map<string, ProposalTier>();
  for (const [k, v] of map.entries()) out.set(k, v.tier);
  return out;
}

/* Count pages shipped this month per client.
 * Source: roadmap items with type 'page' AND status 'done' AND
 * updated_at this month (we don't have a separate done_at field on
 * roadmap items yet - using roadmap.updated_at as proxy). */
export function pagesShippedThisMonth(
  roadmaps: Roadmap[],
  clientName: string,
): number {
  const monthStart = startOfMonth();
  let count = 0;
  for (const r of roadmaps) {
    if (r.client_name !== clientName) continue;
    if (new Date(r.updated_at).getTime() < monthStart) continue;
    count += r.items.filter((i) => i.type === "page" && i.status === "done").length;
  }
  return count;
}

/* Count tests for this client - live or concluded this month. */
export function testsThisMonth(tests: AbTest[], clientName: string): number {
  const monthStart = startOfMonth();
  return tests.filter((t) => {
    if (t.client_name !== clientName) return false;
    if (t.status === "live") return true;
    const stamp = t.ended_at || t.started_at;
    return stamp ? new Date(stamp).getTime() >= monthStart : false;
  }).length;
}

export function computeThroughput(
  proposals: Proposal[],
  tests: AbTest[],
  roadmaps: Roadmap[],
): ClientThroughput[] {
  const tiers = tiersByClient(proposals);
  const out: ClientThroughput[] = [];
  for (const [clientName, tier] of tiers.entries()) {
    if (tier === "Custom") continue;
    const target = TIER_TARGETS[tier];
    const pagesShipped = pagesShippedThisMonth(roadmaps, clientName);
    const testsLive = testsThisMonth(tests, clientName);
    const pagesRisk = riskFor(pagesShipped, target.pages);
    const testsRisk = riskFor(testsLive, target.tests);
    out.push({
      client_name: clientName,
      tier,
      pages_shipped: pagesShipped,
      pages_target: target.pages,
      tests_live: testsLive,
      tests_target: target.tests,
      pages_risk: pagesRisk,
      tests_risk: testsRisk,
      worst_risk: worse(pagesRisk, testsRisk),
    });
  }
  /* Sort: critical first, then behind, then on-track. Alpha within. */
  return out.sort((a, b) => {
    const r = RANK[b.worst_risk] - RANK[a.worst_risk];
    return r !== 0 ? r : a.client_name.localeCompare(b.client_name);
  });
}
