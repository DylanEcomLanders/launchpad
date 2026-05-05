/* ── Tickets ──
 * Lightweight triage layer that sits inside the task board. Tickets are
 * NOT tasks — they're the inbox where small things land before we decide
 * to do them, kill them, or promote them to full task tracking.
 *
 * Age is computed on render from raised_at — never stored — so visual
 * pressure escalates automatically without background jobs.
 */

export type TicketType =
  | "client_request"
  | "internal_blocker"
  | "bug"
  | "question";

export type TicketStatus = "open" | "in_progress" | "done" | "killed";

export interface Ticket {
  id: string;
  title: string;
  client_id?: string;
  type: TicketType;
  raised_by: string;
  raised_at: string; // ISO timestamp
  assigned_to?: string;
  status: TicketStatus;
  kill_reason?: string;
  notes?: string;
  closed_at?: string;
  shifted_count?: number;
  linked_task_id?: string;
}

export interface TicketsData {
  tickets: Ticket[];
}

export const TICKET_TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: "client_request", label: "Client request" },
  { value: "internal_blocker", label: "Internal blocker" },
  { value: "bug", label: "Bug" },
  { value: "question", label: "Question" },
];

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  client_request: "Client request",
  internal_blocker: "Internal blocker",
  bug: "Bug",
  question: "Question",
};

export const TICKET_TYPE_COLORS: Record<TicketType, string> = {
  client_request: "#7C3AED",
  internal_blocker: "#DC2626",
  bug: "#EA580C",
  question: "#2563EB",
};

/* ── Age helpers (computed on render) ──────────────────────────────── */

export type AgeLevel = "fresh" | "warning" | "urgent" | "critical";

export function ageHours(raisedAt: string): number {
  return (Date.now() - new Date(raisedAt).getTime()) / (1000 * 60 * 60);
}

export function ageLevel(raisedAt: string): AgeLevel {
  const h = ageHours(raisedAt);
  if (h < 24) return "fresh";
  if (h < 48) return "warning";
  if (h < 24 * 5) return "urgent";
  return "critical";
}

export function ageLabel(raisedAt: string): string {
  const h = ageHours(raisedAt);
  if (h < 1) return "<1h";
  if (h < 24) return `${Math.floor(h)}h`;
  return `${Math.floor(h / 24)}d`;
}

/* Age colours used by the card border + badge. Matches the existing task
 * board's deadline urgency palette so the visual language is consistent. */
export const AGE_COLORS: Record<AgeLevel, { border: string; badge: string; bg: string }> = {
  fresh: { border: "#E5E5EA", badge: "#7A7A7A", bg: "#FAFAFA" },
  warning: { border: "#FACC15", badge: "#A16207", bg: "#FEFCE8" },
  urgent: { border: "#F97316", badge: "#C2410C", bg: "#FFF7ED" },
  critical: { border: "#DC2626", badge: "#991B1B", bg: "#FEF2F2" },
};

export function isStale(raisedAt: string): boolean {
  return ageHours(raisedAt) >= 48;
}

/* Closed today? Used by the "Done today" view. */
export function isClosedToday(closedAt?: string): boolean {
  if (!closedAt) return false;
  const closed = new Date(closedAt);
  const now = new Date();
  return (
    closed.getFullYear() === now.getFullYear() &&
    closed.getMonth() === now.getMonth() &&
    closed.getDate() === now.getDate()
  );
}

/* Sort: critical-aged tickets always float to the top regardless of
 * their normal age order. Otherwise oldest-first (most urgent first). */
export function sortOpenTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const aLevel = ageLevel(a.raised_at);
    const bLevel = ageLevel(b.raised_at);
    if (aLevel === "critical" && bLevel !== "critical") return -1;
    if (bLevel === "critical" && aLevel !== "critical") return 1;
    return new Date(a.raised_at).getTime() - new Date(b.raised_at).getTime();
  });
}
