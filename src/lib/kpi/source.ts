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

import { cardDueDate } from "@/lib/projects/mock-data";
import type { MockClient, MockPod } from "@/lib/projects/mock-data";
import { DELIVERED_PHASES } from "./config";
import type { DeliveryItem } from "./types";

export function getDeliveryItems(
  clients: MockClient[],
  pods: MockPod[],
): DeliveryItem[] {
  const podById = new Map(pods.map((p) => [p.id, p]));
  const out: DeliveryItem[] = [];

  for (const client of clients) {
    for (const project of client.projects) {
      const podObj = project.podId ? podById.get(project.podId) : undefined;
      const pod = podObj?.name ?? null;

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
          /* Owner = whoever carries it to launch (dev), else the designer.
           *
           * Precedence is deliberately the OPPOSITE of the board's. The board
           * and /my-work resolve live (`pod.designer ?? card.designer`) because
           * they answer "who owns this NOW". KPI is historical — it answers
           * "who delivered this" — so the name stamped on the card at the time
           * wins, and a later pod change never retroactively re-credits past
           * work to someone who never touched it.
           *
           * The pod roster is only a FALLBACK, for cards that were never
           * stamped (e.g. added before a pod existed). Without it those
           * deliveries resolved to null and were credited to nobody in the
           * per-member breakdown — real work landing in no one's column. */
          owner: d.developer ?? d.designer ?? podObj?.developer ?? podObj?.designer ?? null,
          phase: d.phase,
          /* Via cardDueDate: a scheduled build's due date is its Launch column,
           * not the raw field. Reading d.dueDate left every scheduled card with
           * a null date, and the dashboard's onTime check treats null as "not
           * measurable" - so on-time % would have quietly stopped counting them. */
          dueDate: cardDueDate(d) ?? null,
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
