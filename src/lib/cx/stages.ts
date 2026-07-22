/* ── CX Delivery: stages ──
 *
 * The single source of truth for the board's columns, the (cosmetic) assignee
 * highlight per stage, the schedule stages, and the ticket SLA windows. Change
 * the flow here and the whole board follows.
 */

import type { CxStage, CxRole, TicketType, PersonRole, CxCard, CxPerson } from "./types";

export interface CxStageMeta {
  value: CxStage;
  label: string;
  /** The assignee this stage highlights on the card (display only). */
  activeRole?: CxRole;
}

/** The board columns, left to right. This list IS the board. */
export const CX_STAGES: CxStageMeta[] = [
  { value: "tickets", label: "Tickets" },
  { value: "setup", label: "Setup" },
  { value: "strategy", label: "Strategy", activeRole: "strategist" },
  { value: "design", label: "Design", activeRole: "primaryDesigner" },
  { value: "internal-revisions", label: "Internal Revisions", activeRole: "primaryDesigner" },
  { value: "external-revisions", label: "External Revisions", activeRole: "secondaryDesigner" },
  { value: "development", label: "Development", activeRole: "primaryDeveloper" },
  { value: "qa", label: "Internal QA", activeRole: "secondaryDeveloper" },
  { value: "client-approval", label: "Client Approval", activeRole: "secondaryDeveloper" },
  { value: "launch", label: "Launch", activeRole: "devLead" },
  { value: "done", label: "Done" },
];

const META = new Map(CX_STAGES.map((s) => [s.value, s]));
export function stageMeta(s: CxStage): CxStageMeta | undefined {
  return META.get(s);
}
export function stageLabel(s: CxStage): string {
  return META.get(s)?.label ?? s;
}
export function activeRoleForStage(s: CxStage): CxRole | undefined {
  return META.get(s)?.activeRole;
}

/** Stages that carry an expected-done date (the schedule). Tickets run on an SLA
 *  and Done is the end, so neither takes a planned date. */
export const SCHEDULE_STAGES: CxStage[] = CX_STAGES.map((s) => s.value).filter(
  (v) => v !== "tickets" && v !== "done",
);

/** Friendly labels for the six assignee slots. */
export const ROLE_LABEL: Record<CxRole, string> = {
  strategist: "Strategist",
  primaryDesigner: "Primary designer",
  secondaryDesigner: "Secondary designer",
  primaryDeveloper: "Primary developer",
  secondaryDeveloper: "Secondary developer",
  devLead: "Dev lead",
};

/** The roster role a slot draws from - so each dropdown lists the right people. */
export const ROLE_SOURCE: Record<CxRole, PersonRole> = {
  strategist: "strategist",
  primaryDesigner: "designer",
  secondaryDesigner: "designer",
  primaryDeveloper: "developer",
  secondaryDeveloper: "developer",
  devLead: "developer",
};

export const ROLE_ORDER: CxRole[] = [
  "strategist",
  "primaryDesigner",
  "secondaryDesigner",
  "primaryDeveloper",
  "secondaryDeveloper",
  "devLead",
];

/** The active assignee name for a card at a given stage (tickets use their own
 *  single assignee). Undefined when the stage has no owner or the slot is empty. */
export function activeOwner(card: CxCard, s: CxStage): { role?: CxRole; name: string } | undefined {
  if (s === "tickets") return card.ticketAssignee ? { name: card.ticketAssignee } : undefined;
  const role = activeRoleForStage(s);
  if (!role) return undefined;
  const name = card[role];
  return name ? { role, name } : undefined;
}

/** Every person named anywhere on a card - powers the assignee filter. */
export function cardPeople(card: CxCard): string[] {
  return [
    card.strategist,
    card.primaryDesigner,
    card.secondaryDesigner,
    card.primaryDeveloper,
    card.secondaryDeveloper,
    card.devLead,
    card.ticketAssignee,
  ].filter((n): n is string => !!n && !!n.trim());
}

/* ── Schedule status ── */
export type DueTone = "late" | "today" | "ok";

/** Compare an ISO yyyy-mm-dd against today. */
export function dueTone(iso: string | undefined, todayISO: string): DueTone | null {
  if (!iso) return null;
  if (iso < todayISO) return "late";
  if (iso === todayISO) return "today";
  return "ok";
}

/** The card's live schedule status - the date for its current stage. */
export function cardDue(card: CxCard): string | undefined {
  return card.dueByStage?.[card.stage];
}

/* ── Tickets ── */
export const TICKET_SLA_HOURS: Record<TicketType, number> = { ticket: 48, bug: 24, fire: 0 };
export const TICKET_META: Record<TicketType, { label: string; tone: string; dot: string }> = {
  ticket: { label: "Ticket", tone: "text-subtle", dot: "bg-subtle" },
  bug: { label: "Bug", tone: "text-status-approaching", dot: "bg-status-approaching" },
  fire: { label: "Fire", tone: "text-status-late", dot: "bg-status-late" },
};

/** Whether a ticket has breached its SLA window (created + SLA hours < now). */
export function ticketBreached(card: CxCard, now: number): boolean {
  if (!card.ticketType) return false;
  const created = new Date(card.created_at).getTime();
  const deadline = created + TICKET_SLA_HOURS[card.ticketType] * 3600_000;
  return now >= deadline;
}

export const PERSON_ROLE_LABEL: Record<PersonRole, string> = {
  strategist: "Strategist",
  designer: "Designer",
  developer: "Developer",
};

export function peopleByRole(people: CxPerson[], role: PersonRole): CxPerson[] {
  return people.filter((p) => p.role === role);
}
