"use client";

/* Deliverables — the Table read of the Delivery board. Every deliverable across
 * clients, grouped by phase band. A clean dashboard page (sibling to /kanban),
 * on the same live data. */

import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { DeliveryTableView } from "@/components/kanban/delivery-table";

export default function DeliverablesPage() {
  const { clients, loading } = useKanbanData();
  return (
    <div className="px-6 pb-24 pt-10 md:px-10">
      <header className="mb-7">
        <h1 className="text-xl font-semibold text-foreground">Deliverables</h1>
        <p className="mt-1 text-sm text-muted">
          Every deliverable across clients, by phase. The table read of the delivery board.
        </p>
      </header>
      <DeliveryTableView clients={clients} loading={loading} />
    </div>
  );
}
