/* ── Client Command Centre — data model (v1) ──
 * Client → Engagements. Each engagement carries an inline checklist: a
 * compliance spine (one-off) + three value blocks — Rhythm / Results / Renewal
 * — whose items diverge by engagement type + tier.
 *
 * Recurring items (weekly digest, monthly report…) are a SINGLE self-advancing
 * row: the due date is computed live from start date + cadence, ticking logs
 * this period done and the row rolls to the next occurrence. No growing list.
 *
 * v1 persistence is localStorage (seeded), Supabase-ready.
 */

export type EngType = "retainer" | "project";
export type Tier = "5k" | "10k" | "15k";
export type EngStatus = "active" | "complete" | "churned";
export type Goal = "renew" | "convert";
export type Group = "compliance" | "rhythm" | "results" | "renewal";
export type Cadence = "once" | "weekly" | "biweekly" | "monthly" | "quarterly";
export type OwnerRole = "invoicing" | "agreements" | "onboarding" | "reporting" | "renewal" | "pulse" | "results";

export interface ChecklistItem {
  key: string;
  label: string;
  group: Group;
  ownerRole: OwnerRole;
  cadence: Cadence;
  /** One-off items with a start-relative deadline (e.g. renewal deck = Day 75). */
  offsetDays?: number;
  /** One-off completion. */
  status?: "pending" | "done";
  completedAt?: string;
  /** Recurring: when the current period was last satisfied. */
  lastDoneAt?: string;
  evidence?: string; // file name (stub until Files ships)
  needsEvidence?: boolean;
}

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactRole?: string;
  notes?: string;
  createdAt: string;
}

/** A PDF (or other file) attached to an engagement - an invoice, agreement,
 *  deck. Billing lives in Xero; these are reference documents. The bytes live
 *  in the `client-documents` storage bucket at `path`; this is just metadata. */
export interface ClientDoc {
  id: string;
  name: string; // original filename
  path: string; // storage path in client-documents
  sizeBytes?: number;
  kind?: "invoice" | "agreement" | "other";
  uploadedAt: string;
  uploadedBy?: string;
}

/** A banked win - entered by hand for the POC (no kanban link). Shows in the
 *  client-facing Results section. Outcomes, not due-dates. */
export type ResultOutcome = "winner" | "loser" | "inconclusive" | "shipped";
export const RESULT_OUTCOME_LABEL: Record<ResultOutcome, string> = {
  winner: "Winner",
  loser: "Loser",
  inconclusive: "Inconclusive",
  shipped: "Shipped",
};
export interface BankedResult {
  id: string;
  title: string;
  hypothesis?: string; // what we believed + why we tested it
  metric?: string; // e.g. "CVR", "AOV", "RPV"
  upliftPct?: number; // signed, e.g. 8 or -3
  outcome: ResultOutcome;
  date: string; // ISO yyyy-mm-dd
  note?: string;
}

/** A piece of live work - entered by hand for the POC. Client-facing In-flight
 *  shows the title + phase, never dates. Phases are the client-legible pipeline
 *  (a manual stand-in for the kanban rollup). */
export type WorkPhase = "strategy" | "design" | "development" | "optimisation";
export const WORK_PHASE_ORDER: WorkPhase[] = [
  "strategy",
  "design",
  "development",
  "optimisation",
];
export const WORK_PHASE_LABEL: Record<WorkPhase, string> = {
  strategy: "Strategy",
  design: "Design",
  development: "Development",
  optimisation: "Optimisation",
};
export interface WorkItem {
  id: string;
  title: string;
  phase: WorkPhase;
}

export interface Engagement {
  id: string;
  clientId: string;
  name?: string; // e.g. "Full site build", "Conversion partnership"
  type: EngType;
  tier?: Tier;
  status: EngStatus;
  goal: Goal;
  startDate: string; // ISO yyyy-mm-dd
  renewalDate?: string;
  targetEndDate?: string;
  value: number;
  pod?: string;
  csm?: string;
  items: ChecklistItem[];
  /** Attached reference PDFs (invoices, agreements). Metadata only. */
  documents?: ClientDoc[];
  /** Banked wins, entered by hand (POC). Client-facing Results section. */
  results?: BankedResult[];
  /** Live work, entered by hand (POC). Client-facing In-flight section. */
  workItems?: WorkItem[];
  /** Random slug for the isolated client link (/client/[token]). Not the
   *  engagement id, so the link can't be traced back to internal routes. */
  portalToken?: string;
  createdAt: string;
}

export function engagementTitle(e: Engagement): string {
  return e.name ?? (e.type === "retainer" ? "Retainer" : "Project");
}
/** Approx billed to date: retainer = £/mo × months active; project = fee. */
export function engagementBilled(e: Engagement, today = new Date()): number {
  if (e.type !== "retainer") return e.value;
  const months = Math.max(1, Math.round((today.getTime() - new Date(e.startDate).getTime()) / (30 * 86_400_000)));
  return e.value * months;
}

export type Responsibilities = Record<OwnerRole, string>;

export const ROLE_LABEL: Record<OwnerRole, string> = {
  invoicing: "Invoicing", agreements: "Agreements", onboarding: "Onboarding",
  reporting: "Reporting", renewal: "Renewal + upsell", pulse: "Project pulse", results: "Results capture",
};
export const GROUP_LABEL: Record<Group, string> = {
  compliance: "Compliance spine", rhythm: "Rhythm", results: "Results", renewal: "Renewal",
};
export const GROUP_ORDER: Group[] = ["compliance", "rhythm", "results", "renewal"];
export const CADENCE_LABEL: Record<Cadence, string> = {
  once: "", weekly: "Weekly", biweekly: "Biweekly", monthly: "Monthly", quarterly: "Quarterly",
};

/* ── templates ── */
type Tmpl = Omit<ChecklistItem, "status" | "completedAt" | "lastDoneAt" | "evidence">;

const SPINE: Tmpl[] = [
  { key: "agreement_sent", label: "Agreement sent", group: "compliance", ownerRole: "agreements", cadence: "once" },
  { key: "agreement_signed", label: "Agreement signed", group: "compliance", ownerRole: "agreements", cadence: "once", needsEvidence: true },
  { key: "invoice_raised", label: "Invoice raised", group: "compliance", ownerRole: "invoicing", cadence: "once" },
  { key: "invoice_paid", label: "Invoice paid", group: "compliance", ownerRole: "invoicing", cadence: "once" },
  { key: "onboarding_form", label: "Onboarding form completed", group: "compliance", ownerRole: "onboarding", cadence: "once" },
  { key: "onboarding_call", label: "Onboarding call held", group: "compliance", ownerRole: "onboarding", cadence: "once", needsEvidence: true },
];

function retainerValue(tier: Tier): Tmpl[] {
  const digestCadence: Cadence = tier === "5k" ? "biweekly" : "weekly";
  const items: Tmpl[] = [
    { key: "digest", label: `${tier === "5k" ? "Biweekly" : "Weekly"} digest`, group: "rhythm", ownerRole: "reporting", cadence: digestCadence },
    { key: "monthly_report", label: "Monthly report", group: "rhythm", ownerRole: "reporting", cadence: "monthly", needsEvidence: true },
  ];
  if (tier === "15k") items.push({ key: "quarterly_call", label: "Quarterly strategy call", group: "rhythm", ownerRole: "reporting", cadence: "quarterly", offsetDays: 90 });
  items.push(
    { key: "testing_velocity", label: "Testing velocity", group: "results", ownerRole: "reporting", cadence: "monthly", needsEvidence: true },
    { key: "strategy_motion", label: "Strategy in motion", group: "results", ownerRole: "reporting", cadence: "monthly", needsEvidence: true },
    { key: "renewal_deck", label: "Renewal deck", group: "renewal", ownerRole: "renewal", cadence: "quarterly", offsetDays: 75, needsEvidence: true },
    { key: "renewal_call", label: "Renewal call booked", group: "renewal", ownerRole: "renewal", cadence: "quarterly", offsetDays: 90 },
  );
  return items;
}

const PROJECT_VALUE: Tmpl[] = [
  { key: "digest", label: "Weekly digest", group: "rhythm", ownerRole: "pulse", cadence: "weekly" },
  { key: "results_shipped", label: "Results from shipped pages", group: "results", ownerRole: "results", cadence: "once", needsEvidence: true },
  { key: "upsell_pitch", label: "Upsell pitch sent", group: "renewal", ownerRole: "renewal", cadence: "once", needsEvidence: true },
];

export function instantiateChecklist(type: EngType, tier?: Tier): ChecklistItem[] {
  const tmpls = [...SPINE, ...(type === "retainer" ? retainerValue(tier ?? "10k") : PROJECT_VALUE)];
  return tmpls.map((t) => ({ ...t, status: t.cadence === "once" ? ("pending" as const) : undefined }));
}

/* ── date + recurrence helpers ── */
const DAY = 86_400_000;
const INTERVAL: Record<Cadence, number> = { once: 0, weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 };
function iso(d: Date) { return d.toISOString().slice(0, 10); }
function occDate(startISO: string, firstDay: number, interval: number, k: number): Date {
  return new Date(new Date(startISO).getTime() + (firstDay + k * interval) * DAY);
}

/** Recurring item on a day-cadence from the engagement start: Day 7/14… for
 *  weekly, Day 30/60/90/120… for monthly, Day 75/165… + Day 90/180… for each
 *  renewal cycle. Returns the current occurrence, whether it's satisfied, its
 *  engagement-day number, and whether a past occurrence went unmet (overdue). */
function recurring(item: ChecklistItem, startISO: string, today: Date) {
  const interval = INTERVAL[item.cadence] || 7;
  const firstDay = item.offsetDays ?? interval;
  let k = 0;
  let occ = occDate(startISO, firstDay, interval, 0);
  let last: Date | null = null;
  let lastK = -1;
  while (occ.getTime() <= today.getTime()) { last = occ; lastK = k; k += 1; occ = occDate(startISO, firstDay, interval, k); }
  const lastDone = item.lastDoneAt ? new Date(item.lastDoneAt) : null;
  const doneThisPeriod = !!(last && lastDone && lastDone.getTime() >= last.getTime());
  // Overdue only once the occurrence day has fully passed — the due-day itself reads "due".
  const overdue = last !== null && !doneThisPeriod && iso(last) < iso(today);
  const due = doneThisPeriod ? occ : (last ?? occ);
  const dueDay = firstDay + (doneThisPeriod ? k : Math.max(0, lastK)) * interval;
  return { doneThisPeriod, overdue, due, dueDay };
}

export function itemDone(item: ChecklistItem, startISO: string, today = new Date()): boolean {
  return item.cadence === "once" ? item.status === "done" : recurring(item, startISO, today).doneThisPeriod;
}
export function itemDueISO(item: ChecklistItem, startISO: string, today = new Date()): string | undefined {
  if (item.cadence === "once") return item.offsetDays != null ? iso(new Date(new Date(startISO).getTime() + item.offsetDays * DAY)) : undefined;
  return iso(recurring(item, startISO, today).due);
}
/** Engagement-day number of the current occurrence (e.g. 30, 60, 90) — for the
 *  "Day 30" labels on report/renewal items. Null for one-offs without an offset. */
export function itemDueDay(item: ChecklistItem, startISO: string, today = new Date()): number | null {
  if (item.cadence === "once") return item.offsetDays ?? null;
  return recurring(item, startISO, today).dueDay;
}
export function itemOverdue(item: ChecklistItem, startISO: string, today = new Date()): boolean {
  if (item.cadence === "once") {
    if (item.status === "done") return false;
    const due = itemDueISO(item, startISO, today);
    return !!due && new Date(due).getTime() < new Date(iso(today)).getTime();
  }
  return recurring(item, startISO, today).overdue;
}

export function daysUntil(iso2?: string, today = new Date()): number | null {
  if (!iso2) return null;
  return Math.ceil((new Date(iso2).getTime() - today.getTime()) / DAY);
}

/* ── engagement-level derivations ── */
export function complianceState(e: Engagement): { done: number; total: number } {
  const c = e.items.filter((i) => i.group === "compliance");
  return { done: c.filter((i) => i.status === "done").length, total: c.length };
}
export function stateWord(e: Engagement, today = new Date()): { word: string; tone: "ok" | "warn" | "bad" } {
  const complianceGap = e.items.some((i) => i.group === "compliance" && i.status !== "done");
  const overdue = e.items.some((i) => itemOverdue(i, e.startDate, today));
  if (complianceGap) return { word: "Gaps", tone: "bad" };
  if (overdue) return { word: "Slipping", tone: "warn" };
  return { word: "On the ball", tone: "ok" };
}
