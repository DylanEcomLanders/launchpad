/* ── Clients roster (projection off truth) ──
 * Produces the /clients page's shapes ({ engagement, client }) from the CANONICAL
 * client — kanban_clients → kanban_projects — plus the CSM satellite (renewal +
 * cadence checklist). No command-centre localStorage client model: the roster is
 * a read-only projection of truth. One "engagement" per kanban project.
 */

import type { MockClient, TierName } from "@/lib/projects/mock-data";
import { ensureCsm } from "@/lib/client-csm/store";
import type { Client, Engagement, EngStatus, Tier } from "@/lib/command-centre/model";

export interface RosterRow {
  engagement: Engagement;
  client: Client;
}

function mapTier(t?: TierName): Tier | undefined {
  switch (t) {
    case "lite":
      return "5k";
    case "core":
      return "10k";
    case "growth":
    case "scale":
      return "15k";
    default:
      return undefined; // audit / single_build / unset — one-off, no retainer tier
  }
}

function mapStatus(s?: string): EngStatus {
  return s === "completed" ? "complete" : s === "churned" ? "churned" : "active";
}

export async function rosterFromKanban(kanbanClients: MockClient[]): Promise<RosterRow[]> {
  const rows: RosterRow[] = [];
  for (const kc of kanbanClients) {
    const client: Client = { id: kc.id, name: kc.name, createdAt: "" };
    // Seed/read the CSM overlay once per client, scoped by their active retainer's
    // tier so the cadence checklist matches the package.
    const retainer = kc.projects.find(
      (p) => p.type === "retainer" && (p.engagementStatus ?? "active") === "active",
    );
    const csm = await ensureCsm(kc.id, {
      tier: retainer?.tier,
      startDate: retainer?.startDate,
    });

    // One row per client — the CSM's unit. Prefer the active retainer (the
    // ongoing relationship); else an active project; else anything. Builds are
    // delivery work and live on the board, not as separate CSM engagements.
    const active = (p: (typeof kc.projects)[number]) => (p.engagementStatus ?? "active") === "active";
    const proj =
      kc.projects.find((p) => p.type === "retainer" && active(p)) ??
      kc.projects.find(active) ??
      kc.projects[0];
    if (!proj) continue;

    const type: Engagement["type"] = proj.type === "retainer" ? "retainer" : "project";
    // The cadence checklist is anchored to a start date; without one the due-date
    // maths is invalid, so only attach items when we have a real anchor.
    const start = proj.startDate || csm.startDate || undefined;
    rows.push({
      client,
      engagement: {
        id: proj.id,
        clientId: kc.id,
        name: proj.name,
        type,
        tier: mapTier(proj.tier),
        status: mapStatus(proj.engagementStatus),
        goal: type === "retainer" ? "renew" : "convert",
        startDate: start ?? "",
        renewalDate: csm.renewalDate,
        // MRR from the retainer, else the sum of the client's active project values.
        value: proj.mrr ?? 0,
        items: type === "retainer" && start ? csm.items : [],
        createdAt: "",
      },
    });
  }
  return rows;
}
