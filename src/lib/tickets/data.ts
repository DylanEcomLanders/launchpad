/* ── Tickets — client-side data layer ──
 * Loads from /api/tickets on mount, persists every mutation immediately.
 * Tickets auto-save (no manual save button) — speed of capture is the
 * whole point of the system.
 */

import type { Ticket, TicketsData } from "./types";

const ADMIN_KEY =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "ecomlanders2025"
    : "";

export async function loadTickets(): Promise<Ticket[]> {
  try {
    const res = await fetch("/api/tickets", { cache: "no-store" });
    if (!res.ok) return [];
    const data: TicketsData = await res.json();
    return data.tickets || [];
  } catch {
    return [];
  }
}

export async function saveTickets(tickets: Ticket[]): Promise<void> {
  await fetch("/api/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY,
    },
    body: JSON.stringify({ tickets }),
  });
}

export function newTicketId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
