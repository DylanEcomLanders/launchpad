/* ── Command Centre store (v1: localStorage, Supabase-ready) ── */

"use client";

import {
  type BankedResult,
  type Client,
  type ClientDoc,
  type Engagement,
  type Responsibilities,
  type ChecklistItem,
  type WorkItem,
  type WorkPhase,
  instantiateChecklist,
  itemDone,
} from "./model";

const LS = "launchpad-cc-v6";

interface DB { clients: Client[]; engagements: Engagement[]; responsibilities: Responsibilities }

const RESP: Responsibilities = {
  invoicing: "Dylan", agreements: "Dylan", onboarding: "Priya",
  reporting: "Priya", renewal: "Priya", pulse: "Dan", results: "Aanchal",
};

function patch(items: ChecklistItem[], opts: { done?: string[]; doneAt?: Record<string, string>; lastDone?: Record<string, string> }): ChecklistItem[] {
  return items.map((i) => {
    if (i.cadence === "once") {
      return opts.done?.includes(i.key) ? { ...i, status: "done", completedAt: opts.doneAt?.[i.key] } : i;
    }
    return opts.lastDone?.[i.key] ? { ...i, lastDoneAt: opts.lastDone[i.key] } : i;
  });
}

function seed(): DB {
  const now = "2026-07-05T09:00:00Z";
  const clients: Client[] = [
    { id: "c-harvestory", name: "Harvestory", contactName: "Sarah Okonkwo", contactEmail: "sarah@harvestory.co", contactRole: "Founder", createdAt: now },
    { id: "c-ironpaws", name: "Iron Paws", contactName: "Marcus Reed", contactEmail: "marcus@ironpaws.com", contactRole: "Head of Ecom", createdAt: now },
    { id: "c-acme", name: "Acme Skincare", contactName: "Nadia Cole", contactEmail: "nadia@acmeskincare.com", contactRole: "Marketing Lead", createdAt: now },
    { id: "c-pinecrest", name: "Pinecrest Home", contactName: "Owen Blake", contactEmail: "owen@pinecresthome.com", contactRole: "Founder", createdAt: now },
  ];

  const engagements: Engagement[] = [
    {
      id: "e-harvestory", clientId: "c-harvestory", name: "Conversion partnership", type: "retainer", tier: "10k", status: "active", goal: "renew",
      startDate: "2026-06-23", renewalDate: "2026-09-21", value: 10000, pod: "Pod 2", csm: "Priya", createdAt: now,
      items: patch(instantiateChecklist("retainer", "10k"), {
        done: ["agreement_sent", "agreement_signed", "invoice_raised", "onboarding_form", "onboarding_call"],
        doneAt: { agreement_signed: "2026-07-02", onboarding_call: "2026-07-04" },
        // invoice_paid deliberately NOT done → the outstanding item.
        lastDone: { digest: "2026-07-03", monthly_report: "2026-07-01" },
      }),
      results: [
        { id: "r-h1", title: "Hero CTA copy test", hypothesis: "Benefit-led CTA copy would beat the generic 'Shop now' by setting expectation before the click.", metric: "CVR", upliftPct: 8, outcome: "winner", date: "2026-06-28" },
        { id: "r-h2", title: "Bundle PDP layout", hypothesis: "Leading the PDP with the 3-month bundle would lift AOV by anchoring on the higher-value option.", metric: "AOV", upliftPct: 18, outcome: "winner", date: "2026-06-14" },
        { id: "r-h3", title: "Sticky mobile ATC", hypothesis: "A persistent add-to-cart bar on mobile would cut friction and lift conversion.", metric: "CVR", upliftPct: -2, outcome: "loser", date: "2026-06-02" },
      ],
      workItems: [
        { id: "w-h1", title: "Ingredients section redesign", phase: "design" },
        { id: "w-h2", title: "Sticky add-to-cart build", phase: "development" },
        { id: "w-h3", title: "Reviews carousel test", phase: "optimisation" },
      ],
    },
    {
      id: "e-ironpaws", clientId: "c-ironpaws", name: "Landing page project", type: "project", status: "active", goal: "convert",
      startDate: "2026-06-16", targetEndDate: "2026-07-25", value: 4500, pod: "Pod 1", csm: "Priya", createdAt: now,
      items: patch(instantiateChecklist("project"), {
        done: ["agreement_sent", "agreement_signed", "invoice_raised", "invoice_paid", "onboarding_form", "onboarding_call"],
        lastDone: { digest: "2026-07-02" },
      }),
    },
    {
      id: "e-acme", clientId: "c-acme", name: "Retainer", type: "retainer", tier: "5k", status: "active", goal: "renew",
      startDate: "2026-07-01", renewalDate: "2026-09-29", value: 5000, pod: "Pod 3", csm: "Priya", createdAt: now,
      // day-one reality: no agreement, no onboarding call, invoice unpaid → red.
      items: patch(instantiateChecklist("retainer", "5k"), {
        done: ["invoice_raised", "onboarding_form"],
      }),
    },
    {
      id: "e-pinecrest-1", clientId: "c-pinecrest", name: "Landing page build", type: "project", status: "complete", goal: "convert",
      startDate: "2026-04-06", targetEndDate: "2026-05-01", value: 2500, pod: "Pod 1", csm: "Priya", createdAt: now,
      items: patch(instantiateChecklist("project"), {
        done: ["agreement_sent", "agreement_signed", "invoice_raised", "invoice_paid", "onboarding_form", "onboarding_call", "results_shipped", "upsell_pitch"],
      }),
    },
    {
      id: "e-pinecrest-2", clientId: "c-pinecrest", name: "Full site build", type: "project", status: "active", goal: "convert",
      startDate: "2026-06-30", targetEndDate: "2026-08-14", value: 6000, pod: "Pod 1", csm: "Priya", createdAt: now,
      items: patch(instantiateChecklist("project"), {
        done: ["agreement_sent", "agreement_signed", "invoice_raised", "invoice_paid", "onboarding_form", "onboarding_call"],
        lastDone: { digest: "2026-07-02" },
      }),
    },
  ];

  return { clients, engagements, responsibilities: RESP };
}

function load(): DB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(LS);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* fall through */ }
  const s = seed();
  try { localStorage.setItem(LS, JSON.stringify(s)); } catch { /* ignore */ }
  return s;
}
function save(db: DB) { try { localStorage.setItem(LS, JSON.stringify(db)); } catch { /* ignore */ } }

export function getDB(): DB { return load(); }
export function getResponsibilities(): Responsibilities { return load().responsibilities; }
export function listClients(): Client[] { return load().clients; }

export interface NewEngagementInput {
  clientId?: string; // existing client
  clientName?: string; // new client (used when no clientId)
  contactName?: string;
  contactEmail?: string;
  name: string;
  type: "retainer" | "project";
  tier?: "5k" | "10k" | "15k";
  value: number;
  startDate: string;
  renewalDate?: string;
  targetEndDate?: string;
  goal: "renew" | "convert";
  pod?: string;
  csm?: string;
}

/** Create an engagement (and a client, if new). Returns the new engagement id. */
export function addEngagement(input: NewEngagementInput): string {
  const db = load();
  const nowISO = new Date().toISOString();
  let clientId = input.clientId;
  if (!clientId) {
    clientId = `c-${Date.now().toString(36)}`;
    db.clients.push({ id: clientId, name: input.clientName?.trim() || "New client", contactName: input.contactName, contactEmail: input.contactEmail, createdAt: nowISO });
  }
  const id = `e-${Date.now().toString(36)}`;
  db.engagements.push({
    id, clientId, name: input.name.trim() || undefined, type: input.type, tier: input.type === "retainer" ? input.tier : undefined,
    status: "active", goal: input.goal, startDate: input.startDate,
    renewalDate: input.type === "retainer" ? input.renewalDate : undefined,
    targetEndDate: input.type === "project" ? input.targetEndDate : undefined,
    value: input.value, pod: input.pod, csm: input.csm,
    items: instantiateChecklist(input.type, input.tier), createdAt: nowISO,
  });
  save(db);
  return id;
}

export interface EngagementView { engagement: Engagement; client: Client; prior: Engagement[] }

export function getEngagementView(id: string): EngagementView | null {
  const db = load();
  const engagement = db.engagements.find((e) => e.id === id);
  if (!engagement) return null;
  const client = db.clients.find((c) => c.id === engagement.clientId);
  if (!client) return null;
  return { engagement, client, prior: db.engagements.filter((e) => e.clientId === client.id && e.id !== id) };
}

/** Resolve an engagement + client from its portal token (the isolated client
 *  link). Returns null if no engagement carries that token. */
export function getEngagementByToken(token: string): EngagementView | null {
  const db = load();
  const engagement = db.engagements.find((e) => e.portalToken === token);
  if (!engagement) return null;
  const client = db.clients.find((c) => c.id === engagement.clientId);
  if (!client) return null;
  return {
    engagement,
    client,
    prior: db.engagements.filter(
      (e) => e.clientId === client.id && e.id !== engagement.id,
    ),
  };
}

/** Get (creating if missing) the engagement's portal token. A random slug, not
 *  the engagement id, so the client link can't be traced back to internal. */
export function ensurePortalToken(engId: string): string | null {
  const db = load();
  const e = db.engagements.find((x) => x.id === engId);
  if (!e) return null;
  if (!e.portalToken) {
    const rand =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    e.portalToken = rand;
    save(db);
  }
  return e.portalToken;
}

export function listEngagements(): { engagement: Engagement; client: Client }[] {
  const db = load();
  return db.engagements
    .map((engagement) => ({ engagement, client: db.clients.find((c) => c.id === engagement.clientId)! }))
    .filter((r) => r.client);
}

/** Attach a document's metadata to an engagement (the file itself already
 *  lives in the client-documents bucket). */
export function addDocument(engId: string, doc: ClientDoc): void {
  const db = load();
  const e = db.engagements.find((x) => x.id === engId);
  if (!e) return;
  e.documents = [...(e.documents ?? []), doc];
  save(db);
}

/** Remove a document's metadata from an engagement. Deleting the underlying
 *  storage object is the caller's job (fire-and-forget). */
export function removeDocument(engId: string, docId: string): void {
  const db = load();
  const e = db.engagements.find((x) => x.id === engId);
  if (!e || !e.documents) return;
  e.documents = e.documents.filter((d) => d.id !== docId);
  save(db);
}

/** Bank a win on an engagement (manual entry for the POC). */
export function addResult(engId: string, result: BankedResult): void {
  const db = load();
  const e = db.engagements.find((x) => x.id === engId);
  if (!e) return;
  e.results = [...(e.results ?? []), result];
  save(db);
}

export function removeResult(engId: string, resultId: string): void {
  const db = load();
  const e = db.engagements.find((x) => x.id === engId);
  if (!e || !e.results) return;
  e.results = e.results.filter((r) => r.id !== resultId);
  save(db);
}

/** Add a live work item (manual entry for the POC). */
export function addWorkItem(engId: string, item: WorkItem): void {
  const db = load();
  const e = db.engagements.find((x) => x.id === engId);
  if (!e) return;
  e.workItems = [...(e.workItems ?? []), item];
  save(db);
}

export function removeWorkItem(engId: string, itemId: string): void {
  const db = load();
  const e = db.engagements.find((x) => x.id === engId);
  if (!e || !e.workItems) return;
  e.workItems = e.workItems.filter((w) => w.id !== itemId);
  save(db);
}

/** Move a work item to a different phase. */
export function setWorkItemPhase(
  engId: string,
  itemId: string,
  phase: WorkPhase,
): void {
  const db = load();
  const e = db.engagements.find((x) => x.id === engId);
  const item = e?.workItems?.find((w) => w.id === itemId);
  if (!item) return;
  item.phase = phase;
  save(db);
}

/** Edit the free-text notes on a client. */
export function setClientNotes(clientId: string, notes: string): void {
  const db = load();
  const c = db.clients.find((x) => x.id === clientId);
  if (!c) return;
  c.notes = notes.trim() || undefined;
  save(db);
}

/** Tick/untick. One-off items flip status; recurring items log/clear this
 *  period (rolling the due date to the next occurrence). */
export function toggleItem(engId: string, itemKey: string): void {
  const db = load();
  const e = db.engagements.find((x) => x.id === engId);
  const item = e?.items.find((i) => i.key === itemKey);
  if (!e || !item) return;
  if (item.cadence === "once") {
    if (item.status === "done") { item.status = "pending"; item.completedAt = undefined; }
    else { item.status = "done"; item.completedAt = new Date().toISOString(); }
  } else {
    item.lastDoneAt = itemDone(item, e.startDate) ? undefined : new Date().toISOString();
  }
  save(db);
}
