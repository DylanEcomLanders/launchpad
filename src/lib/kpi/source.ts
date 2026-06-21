/* ── KPI source: Project Delivery → DeliveryItem[] ──
 *
 * Flattens the Project Delivery model (MockClient → MockProject →
 * MockDeliverable, the same data /kanban renders) into KPI-ready rows. This is
 * the ONLY place the KPI module reads delivery data from. When Project Delivery
 * is wired to real Supabase data, swap MOCK_CLIENTS for that read here and the
 * rest of the dashboard is unchanged.
 */

import { MOCK_CLIENTS, MOCK_PODS } from "@/lib/projects/mock-data";
import { DELIVERED_PHASE } from "./config";
import type { DeliveryItem } from "./types";

const POD_NAME = new Map(MOCK_PODS.map((p) => [p.id, p.name]));

export function getDeliveryItems(): DeliveryItem[] {
  const out: DeliveryItem[] = [];

  for (const client of MOCK_CLIENTS) {
    for (const project of client.projects) {
      const pod = project.podId ? POD_NAME.get(project.podId) ?? null : null;

      for (const d of project.deliverables) {
        const history = d.phaseHistory ?? [];
        // Delivery date = when it first entered Launch & Testing.
        const deliveredEntry = history.find((h) => h.phase === DELIVERED_PHASE);
        const deliveredAt =
          deliveredEntry?.enteredAt ??
          (d.phase === DELIVERED_PHASE ? null : null);
        const isDelivered = !!deliveredEntry || d.phase === DELIVERED_PHASE;

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
          deliveredAt,
          startedAt: history[0]?.enteredAt ?? null,
          url: d.liveTestUrl ?? null,
        });
      }
    }
  }

  return out;
}
