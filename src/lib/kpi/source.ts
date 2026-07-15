/* ── KPI source: Project Delivery → DeliveryItem[] ──
 *
 * Flattens the Project Delivery model (MockClient → MockProject →
 * MockDeliverable, the same data /kanban renders) into KPI-ready rows. This is
 * the ONLY place the KPI module reads delivery data from.
 *
 * It takes the clients + pods that /kanban already loads (via useKanbanData:
 * localStorage-cached, Supabase-mirrored, mock only as the cold-load seed), so
 * the KPI dashboard reports off exactly the live board — no separate fetch, no
 * separate mock import.
 */

import type { MockClient, MockPod } from "@/lib/projects/mock-data";
import { DELIVERED_PHASES } from "./config";
import type { DeliveryItem } from "./types";

export function getDeliveryItems(
  clients: MockClient[],
  pods: MockPod[],
): DeliveryItem[] {
  const podName = new Map(pods.map((p) => [p.id, p.name]));
  const out: DeliveryItem[] = [];

  for (const client of clients) {
    for (const project of client.projects) {
      const pod = project.podId ? podName.get(project.podId) ?? null : null;

      for (const d of project.deliverables) {
        const history = d.phaseHistory ?? [];
        // Delivery date = when it first reached a delivered phase (Done/Launch,
        // or legacy Live tests). Earliest such history entry wins.
        const delivered = new Set<string>(DELIVERED_PHASES);
        const deliveredEntry = history.find((h) => delivered.has(h.phase));
        const isDelivered = !!deliveredEntry || delivered.has(d.phase);

        out.push({
          id: d.id,
          title: d.title,
          category: d.category,
          clientId: client.id,
          clientName: client.name,
          projectId: project.id,
          projectName: project.name,
          pod,
          // Owner = whoever carries it to launch (dev), else the designer.
          owner: d.developer ?? d.designer ?? null,
          phase: d.phase,
          dueDate: d.dueDate ?? null,
          isDelivered,
          deliveredAt: deliveredEntry?.enteredAt ?? null,
          startedAt: history[0]?.enteredAt ?? null,
          url: d.liveTestUrl ?? null,
        });
      }
    }
  }

  return out;
}
