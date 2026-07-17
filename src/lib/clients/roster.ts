/* ── Clients roster (projection off truth) ──
 * Produces the /clients page shapes ({ engagement, client }) from the CANONICAL
 * client — kanban_clients → kanban_projects — plus the CSM satellite (renewal +
 * MRR + cadence checklist). No command-centre localStorage client model: the
 * roster is a read-only projection of truth.
 *
 * One row per ENGAGEMENT (project): a client can start on a single build and get
 * upsold onto a retainer, so both show — each with its own dates + active flag.
 * The CSM overlay (renewal/MRR/checklist) is per-CLIENT and shared across a
 * client's engagements.
 */

import type { MockClient, MockProject, TierName } from "@/lib/projects/mock-data";
import { ensureCsm, type ClientCsm } from "@/lib/client-csm/store";
import type { Client, Engagement, EngStatus, Tier } from "@/lib/command-centre/model";

export interface RosterRow {
  engagement: Engagement;
  client: Client;
  /* The engagement exists but was never set up on the board — no pod assigned
   * and/or no deliverables scoped. Such a project contributes NOTHING to KPIs
   * and appears in nobody's My Tasks (no cards ⇒ no owners), so without a flag
   * here a live, paying build can sit tracked nowhere. Surfaced on /clients. */
  needsSetup: boolean;
  /** Why it needs setup, for the tooltip/label. */
  setupGap?: "no pod" | "no deliverables" | "no pod or deliverables";
}

export interface ClientDetail {
  engagement: Engagement;
  client: Client;
  prior: Engagement[];
  /** kanban_clients.id — the key for the CSM satellite (renewal/MRR/checklist). */
  clientId: string;
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

const isActive = (p: MockProject) => (p.engagementStatus ?? "active") === "active";

/* Project one kanban project onto the Engagement shape the /clients UI + the
 * command-centre helpers (itemDone/complianceState/…) expect. The CSM overlay
 * supplies renewal + MRR + the checklist; the project supplies the rest. */
function projectToEngagement(clientId: string, proj: MockProject, csm: ClientCsm): Engagement {
  const type: Engagement["type"] = proj.type === "retainer" ? "retainer" : "project";
  // Cadence maths needs a real start anchor; without one, don't attach items
  // (new Date("") → Invalid → the due-date maths throws).
  const start = proj.startDate || csm.startDate || undefined;
  return {
    id: proj.id,
    clientId,
    name: proj.name,
    type,
    tier: mapTier(proj.tier),
    status: mapStatus(proj.engagementStatus),
    goal: type === "retainer" ? "renew" : "convert",
    startDate: start ?? "",
    renewalDate: csm.renewalDate,
    // MRR is CSM-entered on the satellite and belongs to the RETAINER only — a
    // build's value is its own one-off fee, never the monthly figure.
    value: type === "retainer" ? (csm.mrr ?? proj.mrr ?? 0) : (proj.mrr ?? 0),
    items: type === "retainer" && start ? csm.items : [],
    createdAt: "",
  };
}

/** Seed/read a client's CSM overlay, scoped by their active retainer's tier so
 *  the cadence checklist matches the package. */
async function overlayFor(kc: MockClient): Promise<ClientCsm> {
  const retainer = kc.projects.find((p) => p.type === "retainer" && isActive(p));
  return ensureCsm(kc.id, { tier: retainer?.tier, startDate: retainer?.startDate });
}

/* Is this project actually set up to be delivered? A pod gives its cards owners;
 * deliverables give it work. Missing either and it's invisible downstream. */
function setupGapFor(proj: MockProject): RosterRow["setupGap"] {
  const noPod = !proj.podId;
  const noWork = (proj.deliverables?.length ?? 0) === 0;
  if (noPod && noWork) return "no pod or deliverables";
  if (noPod) return "no pod";
  if (noWork) return "no deliverables";
  return undefined;
}

export async function rosterFromKanban(kanbanClients: MockClient[]): Promise<RosterRow[]> {
  const rows: RosterRow[] = [];
  for (const kc of kanbanClients) {
    if (kc.projects.length === 0) continue;
    const client: Client = { id: kc.id, name: kc.name, createdAt: "" };
    const csm = await overlayFor(kc);
    for (const proj of kc.projects) {
      // Only active engagements can "need setup" — a completed or churned one
      // legitimately has no live work left.
      const gap = mapStatus(proj.engagementStatus) === "active" ? setupGapFor(proj) : undefined;
      rows.push({
        client,
        engagement: projectToEngagement(kc.id, proj, csm),
        needsSetup: !!gap,
        setupGap: gap,
      });
    }
  }
  return rows;
}

/** Resolve one engagement (by kanban project id) into the detail-page shape,
 *  with its sibling engagements as `prior` for the switcher. */
export async function clientDetailFromKanban(
  projectId: string,
  kanbanClients: MockClient[],
): Promise<ClientDetail | null> {
  const kc = kanbanClients.find((c) => c.projects.some((p) => p.id === projectId));
  if (!kc) return null;
  const proj = kc.projects.find((p) => p.id === projectId)!;
  const csm = await overlayFor(kc);
  const client: Client = { id: kc.id, name: kc.name, createdAt: "" };
  const engagement = projectToEngagement(kc.id, proj, csm);
  const prior = kc.projects
    .filter((p) => p.id !== projectId)
    .map((p) => projectToEngagement(kc.id, p, csm));
  return { engagement, client, prior, clientId: kc.id };
}
