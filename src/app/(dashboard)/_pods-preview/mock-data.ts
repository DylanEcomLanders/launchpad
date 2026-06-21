// ---------------------------------------------------------------------------
// Pod System V2 — PREVIEW mock data
//
// Self-contained. Mirrors the field names of the real model in
// src/lib/pods-v2/types.ts but is deliberately decoupled so this preview never
// touches live data or live types. Nothing here reads or writes Supabase.
//
// Phase colours are imported from the real shared lib so the timeline reads
// identically to the rest of the app.
// ---------------------------------------------------------------------------

import { PHASE_OPTIONS, type Phase } from "@/lib/task-board/phases";

export { PHASE_OPTIONS };
export type { Phase };

/** Frozen "today" so the preview is deterministic regardless of the wall clock
 *  (stable overdue/due-soon states + stable screenshots). Matches the live demo
 *  date. */
export const TODAY = "2026-05-29";

export const PHASE_LABEL: Record<Phase, string> = Object.fromEntries(
  PHASE_OPTIONS.map((p) => [p.value, p.label]),
) as Record<Phase, string>;

export const PHASE_ORDER: Phase[] = PHASE_OPTIONS.map((p) => p.value);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export type PodRole =
  | "primary_designer"
  | "secondary_designer"
  | "primary_dev"
  | "secondary_dev"
  | "strategist";

export const ROLE_LABEL: Record<PodRole, string> = {
  primary_designer: "Primary designer · Pod Lead",
  secondary_designer: "Secondary designer",
  primary_dev: "Primary dev",
  secondary_dev: "Secondary dev",
  strategist: "Strategist",
};

export interface Member {
  id: string;
  name: string;
  role: PodRole;
  podId: string;
  isPlaceholder?: boolean;
}

export interface Pod {
  id: string;
  name: string;
  tagline: string;
  capacityTotal: number; // points / month
  members: Member[];
}

export const PODS: Pod[] = [
  {
    id: "pod-1",
    name: "Pod 1",
    tagline: "Barnaby's pod",
    capacityTotal: 40,
    members: [
      { id: "member-barnaby", name: "Barnaby", role: "primary_designer", podId: "pod-1" },
      { id: "member-victoria", name: "Victoria", role: "secondary_designer", podId: "pod-1" },
      { id: "member-angel", name: "Angel", role: "primary_dev", podId: "pod-1" },
      { id: "member-kaye", name: "Kaye", role: "secondary_dev", podId: "pod-1" },
      { id: "member-aanchal", name: "Aanchal", role: "strategist", podId: "pod-1" },
    ],
  },
  {
    id: "pod-2",
    name: "Pod 2",
    tagline: "Jack's pod",
    capacityTotal: 40,
    members: [
      { id: "member-jack", name: "Jack", role: "primary_designer", podId: "pod-2" },
      { id: "member-anastasia", name: "Anastasia", role: "secondary_designer", podId: "pod-2" },
      { id: "member-ian", name: "Ian", role: "primary_dev", podId: "pod-2" },
      { id: "member-clien", name: "Clien", role: "secondary_dev", podId: "pod-2" },
      { id: "member-reuben", name: "Reuben", role: "strategist", podId: "pod-2" },
    ],
  },
  {
    id: "pod-3",
    name: "Pod 3",
    tagline: "Brandon's pod",
    capacityTotal: 40,
    members: [
      { id: "member-brandon", name: "Brandon", role: "primary_designer", podId: "pod-3" },
      { id: "member-hire", name: "TO HIRE", role: "secondary_designer", podId: "pod-3", isPlaceholder: true },
      { id: "member-hitesh", name: "Hitesh", role: "primary_dev", podId: "pod-3" },
      { id: "member-ashish", name: "Ashish", role: "secondary_dev", podId: "pod-3" },
      { id: "member-sofia", name: "Sofia", role: "strategist", podId: "pod-3" },
    ],
  },
];

/** New cross-pod / outbound roles being seated in V2. They sit *beside* the
 *  pods, not inside them. */
// Aanchal is Pod 1's strategist (member-aanchal); her dashboard is one strategist's view.
export const LEAD_STRATEGIST = { id: "member-aanchal", name: "Aanchal", role: "Strategist" };
// Agency-wide roles (oversee all pods) — spec §1.1
export const PM = { id: "person-marcus", name: "Marcus", role: "Project Manager" };
export const CSM = { id: "person-sophie", name: "Sophie", role: "Customer Success" };
export const BDM = { id: "person-mia", name: "Mia", role: "Business Development" };

export const MEMBER_BY_ID: Record<string, Member> = Object.fromEntries(
  PODS.flatMap((p) => p.members).map((m) => [m.id, m]),
);

export const POD_BY_ID: Record<string, Pod> = Object.fromEntries(PODS.map((p) => [p.id, p]));

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type TaskStatus = "todo" | "in_progress" | "done";
export type Discipline = "strategy" | "design" | "development";
export type WaitingOn = "client" | "internal" | null;

/** A single span of time a task spent in one phase. Revisits are kept as
 *  SEPARATE spans (not aggregated) so a revision loop stays visible.
 *  `clientDays` is the slice of that span that was client-side (awaiting
 *  assets/approval) — drives the hatched overlay + delay attribution KPI. */
export interface PhaseSpan {
  phase: Phase;
  days: number;
  clientDays: number;
}

export interface Milestone {
  id: string;
  label: string;
  done: boolean;
  /** When this milestone completes, it unlocks the paired secondary task. */
  triggersSecondary?: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  clientId: string;
  podId: string;
  title: string;
  discipline: Discipline;
  /** Primary owns the deliverable; secondary work cascades off it. */
  tier: "primary" | "secondary";
  assignedTo: string; // member id
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  phase?: Phase;
  points?: number; // design discipline only, per deliverable
  pairedTaskId?: string;
  /** V2: who we're waiting on. While "client", the overdue clock is paused and
   *  the task can never read as a red pod strike. */
  waitingOn: WaitingOn;
  blocked?: boolean;
  blockedReason?: string;
  /** Secondary tasks start locked until their trigger milestone fires. */
  locked?: boolean;
  milestones?: Milestone[];
  /** Per-visit phase history for the timeline. */
  spans?: PhaseSpan[];
  testResult?: { status: "pending" | "winner" | "loser"; lift?: number };
}

// Northwind PDP build — the showcase cascade + rich timeline (with a revision loop).
const NORTHWIND_PDP_DESIGN: Task = {
  id: "t-nw-pdp-design",
  projectId: "p-nw-1",
  clientId: "c-northwind",
  podId: "pod-1",
  title: "PDP redesign — design",
  discipline: "design",
  tier: "primary",
  assignedTo: "member-barnaby",
  status: "in_progress",
  dueDate: "2026-05-30",
  phase: "external-design-review",
  points: 8,
  pairedTaskId: "t-nw-pdp-dev",
  waitingOn: "client",
  milestones: [
    { id: "m1", label: "Wireframe signed off", done: true },
    { id: "m2", label: "Design draft complete", done: true },
    { id: "m3", label: "Internal design QA passed", done: true },
    { id: "m4", label: "Client design approval", done: false, triggersSecondary: true },
  ],
  spans: [
    { phase: "onboarding", days: 1, clientDays: 0 },
    { phase: "research", days: 2, clientDays: 0 },
    { phase: "wireframe", days: 2, clientDays: 0 },
    { phase: "design", days: 4, clientDays: 0 },
    { phase: "internal-design-qa", days: 1, clientDays: 0 },
    { phase: "external-design-review", days: 3, clientDays: 3 }, // first review — all client-side
    { phase: "design-revision", days: 2, clientDays: 0 }, // revision loop
    { phase: "external-design-review", days: 2, clientDays: 2 }, // back to client (still waiting)
  ],
};

const NORTHWIND_PDP_DEV: Task = {
  id: "t-nw-pdp-dev",
  projectId: "p-nw-1",
  clientId: "c-northwind",
  podId: "pod-1",
  title: "PDP redesign — build",
  discipline: "development",
  tier: "primary",
  assignedTo: "member-angel",
  status: "todo",
  dueDate: "2026-06-04",
  phase: "development",
  points: 8,
  pairedTaskId: "t-nw-pdp-design",
  waitingOn: null,
  locked: true, // unlocks when m4 (client approval) fires
};

export const TASKS: Task[] = [
  NORTHWIND_PDP_DESIGN,
  NORTHWIND_PDP_DEV,
  // Northwind homepage — genuinely overdue (internal), no client excuse.
  {
    id: "t-nw-home-design",
    projectId: "p-nw-2",
    clientId: "c-northwind",
    podId: "pod-1",
    title: "Homepage hero — design",
    discipline: "design",
    tier: "primary",
    assignedTo: "member-barnaby",
    status: "in_progress",
    dueDate: "2026-05-27", // past TODAY, not waiting on client → real overdue
    phase: "design",
    points: 5,
    waitingOn: null,
    spans: [
      { phase: "onboarding", days: 1, clientDays: 0 },
      { phase: "research", days: 1, clientDays: 0 },
      { phase: "wireframe", days: 2, clientDays: 0 },
      { phase: "design", days: 5, clientDays: 0 },
    ],
  },
  // Northwind secondary polish — cascades off homepage, on track.
  {
    id: "t-nw-home-polish",
    projectId: "p-nw-2",
    clientId: "c-northwind",
    podId: "pod-1",
    title: "Homepage — responsive polish",
    discipline: "design",
    tier: "secondary",
    assignedTo: "member-victoria",
    status: "todo",
    dueDate: "2026-06-02",
    phase: "design",
    waitingOn: null,
  },
  // Lumen — collection page, due soon.
  {
    id: "t-lum-coll-design",
    projectId: "p-lum-1",
    clientId: "c-lumen",
    podId: "pod-1",
    title: "Collection page — design",
    discipline: "design",
    tier: "primary",
    assignedTo: "member-barnaby",
    status: "in_progress",
    dueDate: "2026-06-01", // 3 days out → due soon
    phase: "design",
    points: 6,
    waitingOn: null,
    spans: [
      { phase: "onboarding", days: 1, clientDays: 0 },
      { phase: "research", days: 2, clientDays: 1 },
      { phase: "wireframe", days: 1, clientDays: 0 },
      { phase: "design", days: 3, clientDays: 0 },
    ],
  },
  // Lumen — blocked dev (waiting on internal infra).
  {
    id: "t-lum-bug",
    projectId: "p-lum-1",
    clientId: "c-lumen",
    podId: "pod-1",
    title: "Cart drawer flicker on Safari",
    discipline: "development",
    tier: "secondary",
    assignedTo: "member-kaye",
    status: "in_progress",
    dueDate: "2026-05-29",
    waitingOn: "internal",
    blocked: true,
    blockedReason: "Needs staging access from dev lead",
  },
  // Pace (pod-2) — build in flight, on track + a shipped test winner.
  {
    id: "t-pace-pdp-design",
    projectId: "p-pace-1",
    clientId: "c-pace",
    podId: "pod-2",
    title: "PDP variant test — design",
    discipline: "design",
    tier: "primary",
    assignedTo: "member-jack",
    status: "done",
    dueDate: "2026-05-22",
    phase: "launch",
    points: 6,
    waitingOn: null,
    testResult: { status: "winner", lift: 11.4 },
    spans: [
      { phase: "onboarding", days: 1, clientDays: 0 },
      { phase: "research", days: 2, clientDays: 0 },
      { phase: "design", days: 3, clientDays: 0 },
      { phase: "external-design-review", days: 2, clientDays: 1 },
      { phase: "development", days: 3, clientDays: 0 },
      { phase: "launch", days: 1, clientDays: 0 },
    ],
  },
  {
    id: "t-pace-coll-design",
    projectId: "p-pace-2",
    clientId: "c-pace",
    podId: "pod-2",
    title: "Collection filter UX — design",
    discipline: "design",
    tier: "primary",
    assignedTo: "member-jack",
    status: "in_progress",
    dueDate: "2026-06-05",
    phase: "wireframe",
    points: 7,
    waitingOn: null,
    spans: [
      { phase: "onboarding", days: 1, clientDays: 0 },
      { phase: "research", days: 3, clientDays: 2 },
      { phase: "wireframe", days: 2, clientDays: 0 },
    ],
  },
  // Verdant (pod-3) — waiting on client assets, paused (not overdue).
  {
    id: "t-ver-home-design",
    projectId: "p-ver-1",
    clientId: "c-verdant",
    podId: "pod-3",
    title: "Homepage rebuild — design",
    discipline: "design",
    tier: "primary",
    assignedTo: "member-brandon",
    status: "in_progress",
    dueDate: "2026-05-28", // past, BUT waiting on client → paused, not a strike
    phase: "research",
    points: 6,
    waitingOn: "client",
    spans: [
      { phase: "onboarding", days: 1, clientDays: 0 },
      { phase: "research", days: 4, clientDays: 4 }, // stuck awaiting brand assets
    ],
  },
  // Halcyon (pod-2) — freshly onboarded, sitting in onboarding for strategist to shape.
  {
    id: "t-hal-home-design",
    projectId: "p-hal-1",
    clientId: "c-halcyon",
    podId: "pod-2",
    title: "Homepage + PDP — design",
    discipline: "design",
    tier: "primary",
    assignedTo: "member-jack",
    status: "in_progress",
    dueDate: "2026-06-12",
    phase: "onboarding",
    points: 8,
    waitingOn: null,
    spans: [{ phase: "onboarding", days: 1, clientDays: 0 }],
  },
  // Lumen — a shipped test still awaiting results (tests-to-track variety).
  {
    id: "t-lum-home-test",
    projectId: "p-lum-2",
    clientId: "c-lumen",
    podId: "pod-1",
    title: "Homepage hero test — build",
    discipline: "development",
    tier: "primary",
    assignedTo: "member-angel",
    status: "done",
    dueDate: "2026-05-26",
    phase: "launch",
    waitingOn: null,
    testResult: { status: "pending" },
  },
];

export function tasksForPod(podId: string): Task[] {
  return TASKS.filter((t) => t.podId === podId);
}

// ---------------------------------------------------------------------------
// Projects / deliverables — the unit a strategist or CSM scans ("where is
// this client's work?"). Each maps to a set of tasks; its current phase comes
// from the lead (primary design) task.
// ---------------------------------------------------------------------------

export interface ProjectMeta {
  id: string;
  name: string;
  clientId: string;
  podId: string;
}

export const PROJECTS: ProjectMeta[] = [
  { id: "p-nw-1", name: "PDP redesign", clientId: "c-northwind", podId: "pod-1" },
  { id: "p-nw-2", name: "Homepage hero", clientId: "c-northwind", podId: "pod-1" },
  { id: "p-lum-1", name: "Collection page", clientId: "c-lumen", podId: "pod-1" },
  { id: "p-lum-2", name: "Homepage hero test", clientId: "c-lumen", podId: "pod-1" },
  { id: "p-pace-1", name: "PDP variant test", clientId: "c-pace", podId: "pod-2" },
  { id: "p-pace-2", name: "Collection filter UX", clientId: "c-pace", podId: "pod-2" },
  { id: "p-hal-1", name: "Homepage + PDP", clientId: "c-halcyon", podId: "pod-2" },
  { id: "p-ver-1", name: "Homepage rebuild", clientId: "c-verdant", podId: "pod-3" },
];

/** The 12 phases collapse into 5 readable stages for the at-a-glance track. */
export const STAGES = ["Discovery", "Design", "Review", "Build", "Launch"] as const;

const PHASE_STAGE: Record<Phase, number> = {
  onboarding: 0,
  research: 0,
  wireframe: 0,
  design: 1,
  "internal-design-qa": 1,
  "external-design-review": 2,
  "design-revision": 2,
  development: 3,
  "development-qa": 3,
  "external-dev-review": 3,
  "dev-revision": 3,
  launch: 4,
};

export function phaseStage(phase: Phase): number {
  return PHASE_STAGE[phase] ?? 0;
}

// ---------------------------------------------------------------------------
// Clients + relationship health (CSM)
// ---------------------------------------------------------------------------

export interface HealthSignals {
  clientDelayDays: number; // cumulative days work sat client-side
  approvalLagDays: number; // avg days to approve a deliverable
  engagementGapDays: number; // days since last meaningful client touch
  openBlockers: number;
}

export interface ClientNote {
  at: string;
  by: string;
  text: string;
}

/** The strategist's applied strategy for a client — a home so it isn't lost
 *  across calls and design cycles. */
export interface ClientStrategy {
  thesis: string;
  focus: string[];
  hypotheses: { text: string; status: "idea" | "testing" | "validated" }[];
}

export interface Client {
  id: string;
  name: string;
  podId: string;
  retainerTier: "12k" | "8k";
  cvrBaseline?: number;
  cvrCurrent?: number;
  nextCheckIn: string; // YYYY-MM-DD
  /** Seeded from onboarding — the handoff fix. */
  onboardingNotes: string[];
  riskFlags: string[];
  signals: HealthSignals;
  notes: ClientNote[];
  strategy?: ClientStrategy;
}

export const CLIENTS: Client[] = [
  {
    id: "c-northwind",
    name: "Northwind Apparel",
    podId: "pod-1",
    retainerTier: "12k",
    cvrBaseline: 1.8,
    cvrCurrent: 2.3,
    nextCheckIn: "2026-05-30",
    onboardingNotes: [
      "Founder (Claire) is the sole decision-maker — route all approvals through her.",
      "Brand voice: warm, plain-spoken, no hype. Avoid the word 'luxury'.",
      "Peak season is Sept–Dec; wants PDP + homepage locked before then.",
    ],
    riskFlags: ["Approvals routinely sit 3+ days with founder"],
    signals: { clientDelayDays: 5, approvalLagDays: 3.2, engagementGapDays: 2, openBlockers: 0 },
    notes: [
      { at: "2026-05-27", by: "Sophie", text: "Kickoff call went well. Claire keen on PDP first." },
      { at: "2026-05-12", by: "Sophie", text: "Onboarding complete, brand assets received." },
    ],
    strategy: {
      thesis: "Trust is the bottleneck, not desire. Lead with proof (reviews, guarantees) on PDP before pushing AOV.",
      focus: ["PDP trust signals", "Sticky add-to-cart", "Homepage → PDP path"],
      hypotheses: [
        { text: "Surfacing review count above the fold lifts PDP add-to-cart", status: "testing" },
        { text: "A guarantee badge near the buy box reduces bounce", status: "idea" },
      ],
    },
  },
  {
    id: "c-lumen",
    name: "Lumen Skincare",
    podId: "pod-1",
    retainerTier: "8k",
    cvrBaseline: 2.1,
    cvrCurrent: 2.2,
    nextCheckIn: "2026-06-03",
    onboardingNotes: [
      "Marketing manager (Priya) handles day-to-day; founder signs off launches only.",
      "Compliance: skincare claims must avoid 'cure'/'treat' language.",
    ],
    riskFlags: [],
    signals: { clientDelayDays: 1, approvalLagDays: 1.5, engagementGapDays: 1, openBlockers: 1 },
    notes: [
      { at: "2026-05-26", by: "Sophie", text: "Collection page direction approved on call." },
    ],
    strategy: {
      thesis: "Discovery is weak — shoppers can't find the right product. Win on collection/filter UX before PDP.",
      focus: ["Collection filtering", "Routine-based bundles", "Ingredient education"],
      hypotheses: [
        { text: "Skin-concern filters lift collection → PDP click-through", status: "testing" },
        { text: "A 'build a routine' bundle raises AOV", status: "idea" },
      ],
    },
  },
  {
    id: "c-pace",
    name: "Pace Athletic",
    podId: "pod-2",
    retainerTier: "12k",
    cvrBaseline: 1.5,
    cvrCurrent: 2.0,
    nextCheckIn: "2026-06-10",
    onboardingNotes: [
      "Data-driven team — every change wants an A/B test and a hypothesis.",
      "Fast approvers, responsive on Slack.",
    ],
    riskFlags: [],
    signals: { clientDelayDays: 1, approvalLagDays: 0.8, engagementGapDays: 1, openBlockers: 0 },
    notes: [
      { at: "2026-05-23", by: "Sophie", text: "PDP test shipped a winner (+11.4%). Renewal looking strong." },
    ],
    strategy: {
      thesis: "High intent, low urgency. Use scarcity + social proof to compress the decision, then test relentlessly.",
      focus: ["PDP urgency", "Post-purchase upsell", "Mobile checkout speed"],
      hypotheses: [
        { text: "Low-stock indicator on PDP lifts conversion", status: "validated" },
        { text: "One-tap post-purchase upsell raises AOV 8%+", status: "testing" },
      ],
    },
  },
  {
    id: "c-verdant",
    name: "Verdant Home",
    podId: "pod-3",
    retainerTier: "8k",
    cvrBaseline: 1.2,
    cvrCurrent: 1.2,
    nextCheckIn: "2026-05-29",
    onboardingNotes: [
      "New brand, assets still being produced — expect asset delays early on.",
      "Primary contact (Mark) is hard to reach; prefers email over Slack.",
    ],
    riskFlags: [
      "Brand assets 6 days late — homepage design stalled in research",
      "No client response in 9 days",
    ],
    signals: { clientDelayDays: 9, approvalLagDays: 5.0, engagementGapDays: 9, openBlockers: 1 },
    notes: [
      { at: "2026-05-20", by: "Sophie", text: "Chased brand assets again. Mark promised 'this week'." },
    ],
    strategy: {
      thesis: "Brand-new store with no data. First job is a clean, fast baseline — don't optimise on noise yet.",
      focus: ["Foundational PDP/homepage", "Analytics baseline", "Asset pipeline"],
      hypotheses: [{ text: "A clear hero value-prop lifts first-visit engagement", status: "idea" }],
    },
  },
  {
    id: "c-halcyon",
    name: "Halcyon",
    podId: "pod-2",
    retainerTier: "12k",
    nextCheckIn: "2026-06-02",
    onboardingNotes: [
      "Just signed (came through outbound). Premium homeware, design-led founder.",
      "Wants a strong opinion on strategy — bought the partnership for thinking, not just pixels.",
      "Assets are strong and ready; expect fast approvals.",
    ],
    riskFlags: [],
    signals: { clientDelayDays: 0, approvalLagDays: 0, engagementGapDays: 0, openBlockers: 0 },
    notes: [{ at: "2026-05-29", by: "Sophie", text: "Onboarding submitted. Kickoff Monday." }],
    strategy: {
      thesis: "Set direction at onboarding before any design — premium positioning means restraint, not more.",
      focus: ["Positioning audit", "PDP information hierarchy", "Considered-purchase journey"],
      hypotheses: [{ text: "Editorial PDP layout suits a considered purchase better than a dense one", status: "idea" }],
    },
  },
];

export const CLIENT_BY_ID: Record<string, Client> = Object.fromEntries(
  CLIENTS.map((c) => [c.id, c]),
);

/** Health score 0–100 from real delivery signals (lower delay/lag/gap = better).
 *  Weights are a first proposal, easy to tune (open decision #2). */
export function healthScore(s: HealthSignals): number {
  const delay = Math.min(30, s.clientDelayDays * 3); // up to -30
  const lag = Math.min(25, s.approvalLagDays * 5); // up to -25
  const gap = Math.min(30, s.engagementGapDays * 3); // up to -30
  const blockers = Math.min(15, s.openBlockers * 8); // up to -15
  return Math.max(0, Math.round(100 - delay - lag - gap - blockers));
}

export function healthBand(score: number): "green" | "amber" | "red" {
  if (score >= 75) return "green";
  if (score >= 50) return "amber";
  return "red";
}

// ---------------------------------------------------------------------------
// Growth Pipeline (BDM)
// ---------------------------------------------------------------------------

export type LeadStatus = "new" | "engaged" | "call_booked" | "proposal_sent" | "won" | "lost";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  engaged: "Engaged",
  call_booked: "Call booked",
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost",
};

export interface Lead {
  id: string;
  company: string;
  contact: string;
  email: string;
  status: LeadStatus;
  estValue: number; // £/mo retainer
  source: string;
  sentToIntake?: boolean;
}

export const LEADS: Lead[] = [
  { id: "l1", company: "Atlas Bikes", contact: "Tom Reeves", email: "tom@atlasbikes.com", status: "new", estValue: 8000, source: "Cold email" },
  { id: "l2", company: "Coastal Co", contact: "Jen Park", email: "jen@coastalco.com", status: "call_booked", estValue: 12000, source: "LinkedIn" },
  { id: "l3", company: "Bryne Foods", contact: "Sam Doyle", email: "sam@brynefoods.com", status: "proposal_sent", estValue: 8000, source: "Referral" },
  { id: "l4", company: "Halcyon", contact: "Priya N", email: "priya@halcyon.co", status: "won", estValue: 12000, source: "Cold email" },
  { id: "l5", company: "Mode Studio", contact: "Alex K", email: "alex@modestudio.com", status: "new", estValue: 8000, source: "Cold email" },
  { id: "l6", company: "Greenline", contact: "Dana R", email: "dana@greenline.io", status: "engaged", estValue: 8000, source: "Webinar" },
];

// ---------------------------------------------------------------------------
// Date + capacity helpers (deterministic against TODAY)
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDayMonth(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function daysUntil(ymd: string, today: string = TODAY): number {
  const a = Date.parse(today + "T00:00:00Z");
  const b = Date.parse(ymd + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export type TaskState =
  | "done"
  | "blocked"
  | "waiting_client"
  | "overdue_internal"
  | "due_soon"
  | "on_track";

/** The honest state model. Client-waiting is its own state and is NEVER an
 *  overdue strike. Overdue only fires when the slip is on us. */
export function taskState(t: Task, today: string = TODAY): TaskState {
  if (t.status === "done") return "done";
  if (t.blocked) return "blocked";
  if (t.waitingOn === "client") return "waiting_client";
  const d = daysUntil(t.dueDate, today);
  if (d < 0) return "overdue_internal";
  if (d <= 3) return "due_soon";
  return "on_track";
}

/** Design-discipline points on live (non-done-shipped) work = capacity used.
 *  Mirrors the real capacityUsed() rule (design only, counted once). */
export function capacityUsed(podId: string): number {
  return tasksForPod(podId)
    .filter((t) => t.discipline === "design" && t.points != null)
    .reduce((sum, t) => sum + (t.points ?? 0), 0);
}

export const A_BUCKET_POINTS = 6;

// ---------------------------------------------------------------------------
// Points + Buckets engine (spec §1.3) — page-type weights, bucket sizing
// ---------------------------------------------------------------------------

export type PageWeight = "heavy" | "medium" | "light";

export const WEIGHT_POINTS: Record<PageWeight, number> = { heavy: 3, medium: 2, light: 1 };

export interface PageType {
  key: string;
  label: string;
  weight: PageWeight;
}

export const PAGE_TYPES: PageType[] = [
  { key: "pdp", label: "PDP", weight: "heavy" },
  { key: "homepage", label: "Homepage", weight: "heavy" },
  { key: "quiz", label: "Quiz funnel", weight: "heavy" },
  { key: "advertorial", label: "Advertorial", weight: "medium" },
  { key: "listicle", label: "Listicle", weight: "medium" },
  { key: "collection", label: "Collection page", weight: "medium" },
  { key: "cart", label: "Cart / checkout", weight: "light" },
  { key: "faq", label: "FAQ", weight: "light" },
  { key: "policies", label: "Policies (bundled)", weight: "light" },
];

export const PAGE_TYPE_BY_KEY: Record<string, PageType> = Object.fromEntries(PAGE_TYPES.map((p) => [p.key, p]));

export type SprintBucket = "A" | "B" | "C" | "Bespoke";

/** Spec §1.3: ≤6 A (10d) / 7-10 B (15d) / 11-20 C (20d) / 21+ Bespoke (custom). */
export function bucketFor(points: number): { bucket: SprintBucket; days: number | null } {
  if (points <= 6) return { bucket: "A", days: 10 };
  if (points <= 10) return { bucket: "B", days: 15 };
  if (points <= 20) return { bucket: "C", days: 20 };
  return { bucket: "Bespoke", days: null };
}

/** Total points from a list of page-type keys. */
export function pointsForPages(keys: string[]): number {
  return keys.reduce((sum, k) => sum + (PAGE_TYPE_BY_KEY[k] ? WEIGHT_POINTS[PAGE_TYPE_BY_KEY[k].weight] : 0), 0);
}

/** Pod weekly capacity is 10 pts/week (spec §1.3). */
export const POD_WEEKLY_CAPACITY = 10;
export const UTILISATION_ALERT = 0.85; // 85% alert, 100% hard block

/** Design-discipline points due within an offset-day window from TODAY.
 *  Drives the this-week / next-week cells on the pod cards (honest, derived
 *  from real due dates). */
export function capacityInWindow(podId: string, startOffset: number, endOffset: number): number {
  return tasksForPod(podId)
    .filter((t) => t.discipline === "design" && t.points != null)
    .filter((t) => {
      const d = daysUntil(t.dueDate);
      return d >= startOffset && d <= endOffset;
    })
    .reduce((sum, t) => sum + (t.points ?? 0), 0);
}
