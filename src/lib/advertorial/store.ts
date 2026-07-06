/* ── Advertorial store (spike: localStorage; Supabase-ready shape) ──
 * Mirrors the advertorial_briefs / advertorial_jobs schema so consumers don't
 * change when this swaps to Supabase. Seeded with branded fake clients +
 * partial briefs + jobs across every state so the Production area + review flow
 * are walkable on the sandbox before the real pipeline is wired.
 */

"use client";

import type {
  AdvertorialBrief,
  AdvertorialClient,
  AdvertorialJob,
  AdvertorialTask,
} from "./types";

const LS = "launchpad-advertorial-v1";

interface DB {
  clients: AdvertorialClient[];
  tasks: AdvertorialTask[];
  briefs: AdvertorialBrief[];
  jobs: AdvertorialJob[];
}

const KIT_VERSION = "1.0.0";
const MODEL = "claude-sonnet-5";
const NOW = "2026-07-06T09:00:00Z";

function seed(): DB {
  const clients: AdvertorialClient[] = [
    {
      id: "ac-everease",
      name: "EverEase",
      brand: {
        colorPrimary: "#2E7D5B",
        colorInk: "#14201A",
        colorBg: "#F6F4EF",
        fontHeading: "Fraunces",
        fontBody: "Inter",
        toneNotes: "Warm, reassuring, evidence-led. Claims-sensitive (wellness).",
      },
    },
    {
      id: "ac-brightwell",
      name: "Brightwell Home",
      brand: {
        colorPrimary: "#B4532A",
        colorInk: "#241611",
        colorBg: "#FBF7F2",
        fontHeading: "Playfair Display",
        fontBody: "Work Sans",
        toneNotes: "Homely, tactile, story-first. No health claims.",
      },
    },
    {
      id: "ac-northpeak",
      name: "NorthPeak Supplements",
      brand: {
        colorPrimary: "#1F5FA6",
        colorInk: "#0E1922",
        colorBg: "#F2F5F8",
        fontHeading: "Sora",
        fontBody: "Inter",
        toneNotes: "Clinical, direct, performance-minded. Ingestible + wellness claims.",
      },
    },
  ];

  const tasks: AdvertorialTask[] = [
    { id: "at-everease", clientId: "ac-everease", title: "EverEase: sleep story advertorial" },
    { id: "at-brightwell", clientId: "ac-brightwell", title: "Brightwell: weighted throw advertorial" },
    { id: "at-northpeak", clientId: "ac-northpeak", title: "NorthPeak: focus stack advertorial", clientFacingBlocked: true },
  ];

  const briefs: AdvertorialBrief[] = [
    {
      id: "ab-everease",
      taskId: "at-everease",
      clientId: "ac-everease",
      productMechanism:
        "A magnesium-glycinate + L-theanine blend that shortens sleep onset by calming the nervous system, taken 45 minutes before bed.",
      reviewQuotes: [
        { quote: "First week I actually fell asleep before midnight for the first time in years.", source: "Verified buyer, Trustpilot", verified: true },
        { quote: "No grogginess in the morning at all.", source: "Instagram DM", verified: false },
      ],
      approvedClaims: ["Supports the body's natural transition to sleep", "Non-habit forming"],
      offerDetails: { price: "£34", anchor: "£49", guarantee: "60-night money-back", urgencyReal: false, urgencyDetail: "" },
      angle: "The tired founder who tried everything",
      awarenessLevel: "problem",
      adScent: "Still awake at 2am? This is why melatonin stopped working.",
      audience: "Women 30-50, chronic light sleepers",
      language: "UK",
      complianceFlags: { ingestible: true, wellnessClaims: true, paidSocialImagery: false },
      referenceLinks: [],
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      /* Partially complete: Generate stays blocked (no verified quote, thin offer). */
      id: "ab-brightwell",
      taskId: "at-brightwell",
      clientId: "ac-brightwell",
      productMechanism: "A 7kg glass-bead weighted throw sized for the sofa, not the bed.",
      reviewQuotes: [{ quote: "It's become the most fought-over thing in our house.", source: "Website review", verified: false }],
      approvedClaims: [],
      offerDetails: { price: "", anchor: "", guarantee: "", urgencyReal: false, urgencyDetail: "" },
      angle: "The evening wind-down ritual",
      awarenessLevel: "solution",
      adScent: "The £89 throw people say they can't sleep without.",
      audience: "Home + comfort shoppers, 28-45",
      language: "UK",
      complianceFlags: { ingestible: false, wellnessClaims: false, paidSocialImagery: false },
      referenceLinks: [],
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      /* All compliance flags hot: exercises every gate. */
      id: "ab-northpeak",
      taskId: "at-northpeak",
      clientId: "ac-northpeak",
      productMechanism:
        "A citicoline + L-tyrosine capsule that supports focus by supporting acetylcholine and dopamine synthesis.",
      reviewQuotes: [
        { quote: "Two weeks in and my afternoon crash is gone.", source: "Verified buyer, site", verified: true },
        { quote: "I get more done before lunch than I used to all day.", source: "Verified buyer, site", verified: true },
      ],
      approvedClaims: ["Supports focus and mental clarity", "Caffeine-free"],
      offerDetails: { price: "£39", anchor: "£55", guarantee: "30-day money-back", urgencyReal: true, urgencyDetail: "Launch pricing ends when the first batch of 500 sells out (real, tracked)." },
      angle: "The knowledge worker fighting the afternoon crash",
      awarenessLevel: "product",
      adScent: "The focus stack that replaced my third coffee.",
      audience: "Founders + knowledge workers, 25-45",
      language: "UK",
      complianceFlags: { ingestible: true, wellnessClaims: true, paidSocialImagery: true },
      referenceLinks: [],
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];

  const jobs: AdvertorialJob[] = [
    {
      id: "aj-1", briefId: "ab-everease", taskId: "at-everease", clientId: "ac-everease",
      status: "used", kitVersion: KIT_VERSION, model: MODEL, qaFlagsCount: 0,
      qaReport: { checklist: [{ item: "Headline continues the ad scent", ok: true }, { item: "One idea per section", ok: true }], thinNotes: [], compliance: { pass: true, violations: [] } },
      reviewedBy: "Dylan", reviewedAt: "2026-07-02T14:00:00Z",
      inputTokens: 8200, outputTokens: 6400, startedAt: "2026-07-02T13:40:00Z", completedAt: "2026-07-02T13:42:00Z", createdAt: "2026-07-02T13:39:00Z",
    },
    {
      id: "aj-2", briefId: "ab-everease", taskId: "at-everease", clientId: "ac-everease",
      status: "binned", kitVersion: KIT_VERSION, model: MODEL, qaFlagsCount: 2,
      qaReport: { checklist: [{ item: "Headline continues the ad scent", ok: false }], thinNotes: ["Ad scent was generic"], compliance: { pass: true, violations: [] } },
      binReason: "Headline drifted off the ad scent; read like a listicle.", reviewedBy: "Rob", reviewedAt: "2026-07-03T10:00:00Z",
      inputTokens: 8100, outputTokens: 6100, startedAt: "2026-07-03T09:40:00Z", completedAt: "2026-07-03T09:42:00Z", createdAt: "2026-07-03T09:39:00Z",
    },
    {
      id: "aj-3", briefId: "ab-northpeak", taskId: "at-northpeak", clientId: "ac-northpeak",
      status: "draft_ready", kitVersion: KIT_VERSION, model: MODEL, qaFlagsCount: 1,
      qaReport: { checklist: [{ item: "One idea per section", ok: true }, { item: "No unapproved claims", ok: true }], thinNotes: ["Audience section was thin"], compliance: { pass: false, violations: [{ location: "Section 3, para 2", rule: "Wellness claims must map to an approved claim", detail: "“rewires your focus” is stronger than the approved “supports focus and mental clarity”." }] } },
      draftHtml: "<!doctype html><html><body style=\"font-family:Inter,sans-serif;padding:40px;max-width:640px;margin:auto;color:#0E1922\"><h1 style=\"font-family:Sora\">The focus stack that replaced my third coffee</h1><p>Placeholder draft. The real generation writes the full advertorial into the branded shell here.</p></body></html>",
      draftHtmlPath: "ac-northpeak/aj-3/draft.html",
      inputTokens: 9400, outputTokens: 7800, startedAt: "2026-07-06T08:40:00Z", completedAt: "2026-07-06T08:43:00Z", createdAt: "2026-07-06T08:39:00Z",
    },
    {
      id: "aj-4", briefId: "ab-northpeak", taskId: "at-northpeak", clientId: "ac-northpeak",
      status: "generating", kitVersion: KIT_VERSION, model: MODEL, qaFlagsCount: 0,
      startedAt: "2026-07-06T08:58:00Z", createdAt: "2026-07-06T08:58:00Z",
    },
  ];

  return { clients, tasks, briefs, jobs };
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

export function listClients(): AdvertorialClient[] { return load().clients; }
export function getClient(id: string): AdvertorialClient | undefined { return load().clients.find((c) => c.id === id); }
export function listTasks(): AdvertorialTask[] { return load().tasks; }
export function getTask(id: string): AdvertorialTask | undefined { return load().tasks.find((t) => t.id === id); }

export function getBriefForTask(taskId: string): AdvertorialBrief | undefined {
  return load().briefs.find((b) => b.taskId === taskId);
}
export function upsertBrief(brief: AdvertorialBrief): void {
  const db = load();
  const i = db.briefs.findIndex((b) => b.id === brief.id);
  if (i >= 0) db.briefs[i] = { ...brief, updatedAt: new Date().toISOString() };
  else db.briefs.push(brief);
  save(db);
}

export interface JobRow { job: AdvertorialJob; client: AdvertorialClient; task: AdvertorialTask }

export function listJobs(): JobRow[] {
  const db = load();
  return db.jobs
    .map((job) => ({
      job,
      client: db.clients.find((c) => c.id === job.clientId)!,
      task: db.tasks.find((t) => t.id === job.taskId)!,
    }))
    .filter((r) => r.client && r.task)
    .sort((a, b) => b.job.createdAt.localeCompare(a.job.createdAt));
}

export function getJobRow(id: string): JobRow | undefined {
  return listJobs().find((r) => r.job.id === id);
}

export function updateJob(id: string, patch: Partial<AdvertorialJob>): void {
  const db = load();
  const j = db.jobs.find((x) => x.id === id);
  if (!j) return;
  Object.assign(j, patch);
  save(db);
}

export function markUsed(id: string, reviewer = "You"): void {
  updateJob(id, { status: "used", reviewedBy: reviewer, reviewedAt: new Date().toISOString() });
  const db = load();
  const j = db.jobs.find((x) => x.id === id);
  const t = j && db.tasks.find((x) => x.id === j.taskId);
  if (t) { t.clientFacingBlocked = false; save(db); }
}

export function markBinned(id: string, reason: string, reviewer = "You"): void {
  updateJob(id, { status: "binned", binReason: reason, reviewedBy: reviewer, reviewedAt: new Date().toISOString() });
}

/** Queue a new job for a brief (spike: the pipeline route flips its status). */
export function createJob(brief: AdvertorialBrief): string {
  const db = load();
  const id = `aj-${Date.now().toString(36)}`;
  db.jobs.push({
    id, briefId: brief.id, taskId: brief.taskId, clientId: brief.clientId,
    status: "queued", kitVersion: KIT_VERSION, model: MODEL, qaFlagsCount: 0,
    createdAt: new Date().toISOString(),
  });
  const t = db.tasks.find((x) => x.id === brief.taskId);
  if (t) t.clientFacingBlocked = true;
  save(db);
  return id;
}

export const ADVERTORIAL_KIT_VERSION = KIT_VERSION;
