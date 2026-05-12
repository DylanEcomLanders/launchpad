/* Bridge · pods-v2 Client → MockEngagement shape.
 *
 * The Client portal renders MockEngagement objects (header / brief /
 * metrics / stage tables / etc). The pod board operates on pods-v2
 * Client / Project / Task rows in Supabase-mirrored localStorage.
 *
 * This mapper converts a pods-v2 Client into the MockEngagement shape so
 * the Client portal can display real pod-board clients on /engagements
 * without duplicating storage. Fields that have no pods-v2 equivalent
 * (vertical, brief, customDeliverables, assets, activity) default to
 * empty so the UI degrades gracefully — they'll fill in as later slices
 * wire Tasks, OnboardingSubmissions, etc.
 */

import { getClients, getClientById, getPods, getPodById } from "@/lib/pods-v2/data";
import type { Client, Pod, RetainerTier } from "@/lib/pods-v2/types";
import type { MockEngagement } from "./engagement-mocks";
import type { EngagementKind } from "./engagement-template";

/** Pull a "Pod N" numeric suffix from the pod name. Falls back to 0 when
 * the pod name doesn't follow the seed convention. */
function podNumberFromPod(pod: Pod | null): number {
  if (!pod) return 0;
  const match = pod.name.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday of this week
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function daysSince(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const ms = today.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

function retainerLabel(tier: RetainerTier): string {
  if (tier === "8k") return "£8K";
  if (tier === "12k") return "£12K";
  return "Project";
}

function anchorLabel(tier: RetainerTier): string {
  if (tier === "8k") return "£12K";
  if (tier === "12k") return "£20K";
  return "";
}

function kindFromTier(tier: RetainerTier): EngagementKind {
  return tier === "none" ? "bucket" : "retainer";
}

/** Map a single pods-v2 Client → MockEngagement. Pulls the assigned pod
 * by id so the podNumber resolves correctly. */
export function clientToEngagement(client: Client): MockEngagement {
  const pod = getPodById(client.pod_id);
  const podNumber = podNumberFromPod(pod);
  const startDate = nextMonday();
  return {
    id: client.id,
    brand: client.name,
    vertical: "",
    retainer: retainerLabel(client.retainer_tier),
    anchor: anchorLabel(client.retainer_tier),
    startDate,
    currentDay: daysSince(startDate),
    podNumber,
    kind: kindFromTier(client.retainer_tier),
    brief: {},
    metrics: {
      cvrBaseline: client.cvr_baseline,
      cvrCurrent: client.cvr_current,
      aovBaseline: client.aov_baseline,
      aovCurrent: client.aov_current,
      metricsUpdatedAt: client.metrics_updated_at,
    },
    wins: [],
    deliverables: [],
    customDeliverables: [],
    assets: [],
    activity: [],
  };
}

/** Pull every pods-v2 Client and map them all in one go. Returns [] when
 * pods-v2 hasn't been seeded yet. Synchronous because getClients() reads
 * the localStorage cache; Supabase hydration happens in the existing
 * bootstrapPodsSync() flow. */
export function loadEngagementsFromPods(): MockEngagement[] {
  if (typeof window === "undefined") return [];
  return getClients().map(clientToEngagement);
}

/** Look up a single pods-v2 Client and return as MockEngagement, or null
 * if the id isn't a pods-v2 Client. */
export function loadEngagementFromPodsById(id: string): MockEngagement | null {
  if (typeof window === "undefined") return null;
  const client = getClientById(id);
  return client ? clientToEngagement(client) : null;
}
