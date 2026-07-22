/* ── CX Delivery: types ──
 *
 * The fresh, isolated Delivery board - a deliberately simple Trello-style kanban
 * for the client-experience area. NOT the legacy /kanban: its own `cx_*` data,
 * zero imports from the old kanban/pods/kpi systems.
 *
 * Cards move across stage columns by drag. Assignees are picked from a small
 * team roster (never typed). Each stage highlights the assignee that owns it
 * (see stages.ts) - a display rule, nothing is moved or gated automatically.
 * A per-stage "expected done" date flags a card late (red) or due-today (orange).
 *
 * The first column is Tickets: quick client bugs/tweaks classified ticket / bug
 * / fire, each with its own SLA (48h / 24h / immediate).
 */

/** The board columns, in order. Editable in one place (stages.ts). */
export type CxStage =
  | "tickets"
  | "setup"
  | "strategy"
  | "design"
  | "internal-revisions"
  | "external-revisions"
  | "development"
  | "qa"
  | "client-approval"
  | "launch"
  | "done";

/** The assignee slots on a card. Which one a stage highlights lives in stages.ts. */
export type CxRole =
  | "strategist"
  | "primaryDesigner"
  | "secondaryDesigner"
  | "primaryDeveloper"
  | "secondaryDeveloper"
  | "devLead";

/** Ticket urgency - drives the SLA window (see stages.ts). */
export type TicketType = "ticket" | "bug" | "fire";

export interface CxCard {
  id: string;
  title: string;
  /** Links to a Clients doc (PodDoc.id) so its Delivery reflection can pull it. */
  clientId: string;
  /** Denormalised client name for display on the board. */
  clientName: string;
  stage: CxStage;
  /* Assignees - each holds a person's name chosen from the roster. */
  strategist?: string;
  primaryDesigner?: string;
  secondaryDesigner?: string;
  primaryDeveloper?: string;
  secondaryDeveloper?: string;
  devLead?: string;
  /* Tickets column only. */
  ticketType?: TicketType;
  ticketAssignee?: string;
  /** Expected-done date per stage (ISO yyyy-mm-dd). The active one is the card's
   *  current stage: past it = late (red), today = due (orange). */
  dueByStage?: Partial<Record<CxStage, string>>;
  created_at: string;
  updated_at: string;
}

/** Roster role - filters which people appear in each assignee slot. */
export type PersonRole = "strategist" | "designer" | "developer";

export interface CxPerson {
  id: string;
  name: string;
  role: PersonRole;
}

/** One card move, for the activity log. */
export interface CxActivity {
  id: string;
  at: string;
  who?: string;
  cardId: string;
  cardTitle: string;
  from: CxStage;
  to: CxStage;
}
