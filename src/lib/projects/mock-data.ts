// Mock client/project/deliverable data for the /kanban (Mission Control) page.
// Not wired to Supabase yet — pure fixture so we can iterate on the UI before
// the pods_v2_* read adapter lands.

import type { PhaseHistoryEntry, PreviewPhase, TestResult } from "./preview-phases";

// ── Pods ──────────────────────────────────────────────────────────────────
// A pod is a pre-defined team: who plays which role on every deliverable in
// the project. Selecting a pod on a project bulk-writes those four names onto
// every deliverable in that project — no per-card assignment needed.
export interface MockPod {
  id: string;
  name: string;
  designer?: string;
  secondaryDesigner?: string;
  developer?: string;
  secondaryDeveloper?: string;
}

export const MOCK_PODS: MockPod[] = [
  { id: "pod-1", name: "Pod 1", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin",  developer: "Ashish Dadwal",   secondaryDeveloper: "Ian Rex Espinosa" },
  { id: "pod-2", name: "Pod 2", designer: "Brandon Baldwin",   secondaryDesigner: "Viktoriia Parchuk", developer: "Ian Rex Espinosa", secondaryDeveloper: "Kaye Ann Layug" },
  { id: "pod-3", name: "Pod 3", designer: "Jack",              secondaryDesigner: "Anastasia",        developer: "Hitesh Kaushal",  secondaryDeveloper: "Aleksandar" },
];

// Build a dated phase history ending on `latestEnteredISO`. Earlier phases are
// staggered ~3 calendar days back per step — close enough to realistic for the
// prototype without hand-writing every date. Pass phases oldest → newest.
function buildHistory(latestEnteredISO: string, ...phasesOldestToNewest: PreviewPhase[]): PhaseHistoryEntry[] {
  const last = new Date(latestEnteredISO + "T09:00:00Z");
  const n = phasesOldestToNewest.length;
  return phasesOldestToNewest.map((p, i) => {
    const d = new Date(last);
    d.setUTCDate(d.getUTCDate() - (n - 1 - i) * 3);
    return { phase: p, enteredAt: d.toISOString().slice(0, 10) };
  });
}

/** One metric tracked by a launch + testing deliverable. All three fields are
 *  free-form so the strategist can hold "2.4%" / "$42 AOV" / "+8%" without
 *  the prototype committing to a parse format. Most tests have CVR + AOV +
 *  RPV; some have a single custom one. */
export interface TrackedMetric {
  name: string;
  baseline?: string;
  interim?: string;
}

export interface MockDeliverable {
  id: string;
  title: string;
  /** Deliverable type — shown as the card header (PDP / Component / Cart / etc) */
  category?: string;
  /** Primary designer — owner of net-new design work (Strategy + Design phases) */
  designer?: string;
  /** Secondary designer — picks up client revisions + design-side tickets */
  secondaryDesigner?: string;
  /** Primary developer — owner of the main build (Dev + QA + Launch) */
  developer?: string;
  /** Secondary developer — picks up tickets, bugs, post-launch tweaks */
  secondaryDeveloper?: string;
  /** Target completion date — ISO yyyy-mm-dd. Drives the date stamp on the card */
  dueDate?: string;
  phase: PreviewPhase;
  /** UK working hours spent in the CURRENT phase (Mon-Fri 9-5 Europe/London,
   *  excl bank holidays). 8h = 1 working day. Drives the stuck flag via
   *  statusForHoursInPhase(). */
  hoursInPhase: number;
  /** Ordered list of phase transitions, current phase last. Each entry has the
   *  date the deliverable ENTERED that phase. Drives the limbo / revision-round
   *  badge AND the dated timeline in the detail modal. Empty for new. */
  phaseHistory?: PhaseHistoryEntry[];
  /** Strategist's brief — most often a URL (Notion, Google Doc, Word doc).
   *  Shown + edited in the detail modal. */
  brief?: string;
  /** Figma URL for the design file. Separate from brief because Figma is
   *  reached for every phase post-Strategy (design, dev for hand-off, QA for
   *  spec check). Rendered as a dedicated chip in the detail modal. */
  figmaUrl?: string;
  /** Set when this deliverable was kicked back from a downstream phase
   *  (e.g. Internal Revisions sent it back to Design). Drives the
   *  "Revisions needed" tag on the card + the dedicated section in My Tasks.
   *  Cleared automatically when the card moves forward past the phase that
   *  originally bounced it. */
  revisionRequested?: boolean;
  /** Stamp when the deliverable was signed off out of Internal Revisions and
   *  pushed to the client. Drives the green "Approved" border while the card
   *  sits in External Revisions waiting for client review. Cleared once the
   *  card moves into Development (client has accepted, normal styling). */
  approvedAt?: string;
  /** Tickets don't progress through the build flow - they get completed in
   *  place. Setting this field hides the card from the active board (similar
   *  to testResult hiding finished tests). */
  completedAt?: string;
  /** Stamp when the design was sent to the client (card transitioned into
   *  External Revisions). Drives the 48h external-review clock + the amber/
   *  red signal on cards languishing with the client. */
  sentToClientAt?: string;
  /** URL where the live test / launched page is running. Set when a deliverable
   *  enters launch-testing — drives the LIVE pulse + click-through on the card. */
  liveTestUrl?: string;
  /** When the strategist flipped the deliverable from "ready for testing" to LIVE.
   *  Presence of this field = test is running. Absence = card is in launch-testing
   *  but the strategist hasn't started the test yet. Drives the days-running counter
   *  and the conclude-after-X-days nudge. ISO yyyy-mm-dd, Europe/London. */
  liveStartedAt?: string;
  /** Metrics the test is moving. Most CRO tests watch CVR + AOV + RPV in
   *  parallel, plus the occasional custom one. Each entry is free-form so it
   *  can hold "2.4%" / "$42" / "+8%". First entry is treated as the primary
   *  metric by the conclude form. */
  metrics?: TrackedMetric[];
  /** Strategist's interim observations while the test runs. */
  interimNotes?: string;
  /** Free-form notes on the deliverable. Used for context the strategist
   *  wants on hand: client side comments, edge cases, blockers, whatever
   *  doesn't fit the structured fields. Rendered as a textarea in the
   *  detail modal. */
  notes?: string;
  /** Screenshot of the live test in motion. Dropped via the modal's drag-zone;
   *  data URL in the prototype, copied into testResult.screenshot on Mark finished. */
  screenshot?: string;
  /** Captured outcome once the test is marked finished. Presence of this field
   *  removes the deliverable from the kanban and surfaces it in the Results bank. */
  testResult?: TestResult;
}

export interface MockProject {
  id: string;
  name: string;
  /** Project type. "build" is a one-off engagement scoped in turnaround days
   *  (15/20/25). "retainer" is an ongoing engagement scoped in engagement
   *  days (30/60/90) that auto-seeds a recurring Documents schedule. */
  type?: "build" | "retainer";
  /** Currently-assigned pod. Picking a pod from the dropdown bulk-writes the
   *  pod's four role names onto every deliverable in this project. */
  podId?: string;
  /** Total turnaround days a BUILD is scoped for. Drives the per-phase
   *  internal due dates (Phase 1 locked at startDate, Phase 2 locked on
   *  clientApprovedAt). 3-day buffer between internal target + external. */
  turnaroundDays?: 15 | 20 | 25;
  /** Total engagement length a RETAINER runs for. Drives how many weekly
   *  reports + monthly test plans are preloaded into the Documents column. */
  engagementDays?: 30 | 60 | 90;
  /** When the project work began. ISO yyyy-mm-dd. For builds this is the
   *  anchor for Phase 1 phase deadlines (Strategy / Design / Internal Rev)
   *  and the external client deadline. Set on project creation. */
  startDate?: string;
  /** When the client signed off on the design (first time a card moved out
   *  of External Revisions into Development). Anchors Phase 2 phase
   *  deadlines (Dev / QA / Launch). Until set, Phase 2 deadlines read "TBC". */
  clientApprovedAt?: string;
  deliverables: MockDeliverable[];
}

/** Structured onboarding brief sourced from the OnboardingSubmission the
 *  client fills in. Subset of the full submission curated for what the
 *  strategist + design team reach for during build: who the brand is, who
 *  it sells to, what success looks like, voice, and the obvious risks.
 *  Rendered in the OnboardingPreviewModal as grouped Q&A. */
export interface OnboardingBrief {
  websiteUrl?: string;
  shopifyUrl?: string;
  primaryContact?: string;
  timezone?: string;
  primaryGoal?: string;
  successMetric?: string;
  timelineExpectation?: string;
  toneOfVoice?: string;
  wordsToAvoid?: string;
  usps?: string;
  valueProps?: string;
  targetCustomer?: string;
  competitors?: string;
  challenges?: string;
  notes?: string;
}

export interface MockClient {
  id: string;
  name: string;
  projects: MockProject[];
  /** Structured answers from the client's onboarding form, rendered as
   *  grouped Q&A in the brief popup. Replaces the old URL-only field. */
  onboardingBrief?: OnboardingBrief;
}

export const MOCK_CLIENTS: MockClient[] = [
  {
    id: "harvestory",
    name: "Harvestory",
    onboardingBrief: {
      websiteUrl: "https://harvestory.com",
      shopifyUrl: "harvestory.myshopify.com",
      primaryContact: "Maya Chen (Head of Growth)",
      timezone: "EST (UTC-5)",
      primaryGoal:
        "Push the PDP CVR from 1.8% to 2.6% on the hero range without slowing mobile LCP. Secondary: lift AOV via bundle adoption.",
      successMetric:
        "Add-to-cart rate on the hero PDPs (Hibiscus, Elderberry, Ingredients line). Currently 6.4% mobile / 9.1% desktop.",
      timelineExpectation:
        "First test live in 3 weeks. Expecting 2 to 3 tests/month after that. Q4 sprint runs through end of Sep.",
      toneOfVoice:
        "Confident, plain-spoken, no jargon. Bias toward 'how it works' over 'why we made it'. Customers are 35 to 55 women researching ingredients carefully.",
      wordsToAvoid:
        "Detox, miracle, cure, anti-aging, doctor-approved, clinically proven (legal flagged the last two).",
      usps:
        "Cold-pressed extraction, single-origin sourcing (every batch traceable to a farm), no fillers, third-party tested on every lot.",
      valueProps:
        "1. Clean, traceable ingredients\n2. Visible results in 4 to 6 weeks\n3. Subscription savings + flexibility\n4. 60-day no-questions money-back",
      targetCustomer:
        "Women 35 to 55, household income $80k+, already taking 1 or 2 supplements. Skeptical of marketing claims, reads ingredient lists, checks reviews on Reddit before buying.",
      competitors:
        "Ritual, Care/of, HUM Nutrition (premium-clean tier). Differentiator vs all three: cold-pressed sourcing + per-batch traceability.",
      challenges:
        "PDP bounce is high on mobile (62%). Reviews carousel below the fold gets very little engagement. Subscription opt-in stuck around 18%.",
      notes:
        "Founders are involved on copy approvals - usually a 24h turnaround. Avoid scheduling major test launches in the first week of October (FDA audit window).",
    },
    projects: [
      {
        id: "pdp-build",
        name: "PDP Build",
        podId: "pod-1",
        deliverables: [
          // ── Tickets (front-of-line for triage) ───────────────────────────
          { id: "h-t1", category: "Bug", title: "Variant selector shows wrong price on 6-month", developer: "Ashish Dadwal", secondaryDeveloper: "Kaye Ann Layug", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", dueDate: "2026-06-06", phase: "tickets", hoursInPhase: 6, phaseHistory: buildHistory("2026-06-17", "tickets") },
          // ── Deliverables ─────────────────────────────────────────────────
          { id: "h1", category: "Primary", title: "Hero + Above-the-fold", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-08", phase: "external-revisions", hoursInPhase: 14, phaseHistory: buildHistory("2026-06-13", "strategy", "design", "internal-revisions", "design", "external-revisions") },
          // h2: 4 revision rounds — flips to LIMBO badge, plus time-stuck
          { id: "h2", category: "Primary", title: "Ingredients section", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-06", phase: "external-revisions", hoursInPhase: 50, phaseHistory: buildHistory("2026-06-09", "strategy", "design", "internal-revisions", "design", "internal-revisions", "design", "external-revisions", "design", "external-revisions"), brief: "https://figma.com/file/H7xPDPIngredients/Harvestory-Ingredients" },
          { id: "h3", category: "Primary", title: "Reviews + UGC carousel", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-12", phase: "design", hoursInPhase: 36, phaseHistory: buildHistory("2026-06-11", "strategy", "design") },
          { id: "h4", category: "Secondary", title: "Variant selector", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-07", phase: "internal-revisions", hoursInPhase: 5, phaseHistory: buildHistory("2026-06-17", "strategy", "design", "internal-revisions") },
          { id: "h5", category: "Secondary", title: "FAQ block", designer: "Barnaby Clark", secondaryDesigner: "Viktoriia Parchuk", dueDate: "2026-06-15", phase: "strategy", hoursInPhase: 20, phaseHistory: buildHistory("2026-06-14", "strategy") },
          { id: "h6", category: "Primary", title: "Sticky ATC", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-20", phase: "development", hoursInPhase: 38, phaseHistory: buildHistory("2026-06-10", "strategy", "design", "external-revisions", "design", "development") },
          // ── Ready for testing — demo of the "ready" state (no test running yet) ─
          { id: "h-ready1", category: "Secondary", title: "Promo banner A/B", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-20", phase: "launch-testing", hoursInPhase: 2, phaseHistory: buildHistory("2026-06-16", "strategy", "design", "development", "qa", "launch-testing") },
          // ── Live test that's overdue — demo for the "ready to conclude" nudge ─
          { id: "h-live1", category: "Primary", title: "Hero CTA copy test", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-04", phase: "launch-testing", hoursInPhase: 6, phaseHistory: buildHistory("2026-05-31", "strategy", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://harvestory.com/?cta=v2", liveStartedAt: "2026-05-31", metrics: [{ name: "Add-to-cart rate", interim: "+8%" }, { name: "CVR", interim: "+5%" }, { name: "AOV", interim: "0%" }], interimNotes: "Variant beating control by +8% consistently for 10+ days. Plateau looks real, time to call it." },
          // ── Completed tests (in Results bank, not the kanban) ────────────
          { id: "h-done1", category: "Primary", title: "Bundle PDP layout", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", phase: "launch-testing", hoursInPhase: 0, phaseHistory: buildHistory("2026-05-15", "strategy", "design", "internal-revisions", "design", "external-revisions", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://harvestory.com/products/bundle-pdp-v2", testResult: { concludedAt: "2026-06-09", outcome: "winner", metric: "CVR", upliftPct: 18, confidencePct: 96, durationDays: 25, notes: "Switched the bundle picker from dropdown to inline cards. Stronger lift on mobile (+24%). Client wants to roll the pattern to the rest of the catalogue." } },
        ],
      },
      {
        id: "cart-drawer",
        name: "Cart Drawer Redesign",
        podId: "pod-2",
        deliverables: [
          { id: "h7", category: "Primary", title: "Cart drawer UI", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", developer: "Ian Rex Espinosa", secondaryDeveloper: "Kaye Ann Layug", dueDate: "2026-06-09", phase: "external-revisions", hoursInPhase: 22, phaseHistory: buildHistory("2026-06-13", "strategy", "design", "internal-revisions", "design", "external-revisions") },
          { id: "h8", category: "Primary", title: "Upsell slot logic", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", developer: "Ian Rex Espinosa", secondaryDeveloper: "Kaye Ann Layug", dueDate: "2026-06-14", phase: "design", hoursInPhase: 18, phaseHistory: buildHistory("2026-06-14", "strategy", "design") },
          { id: "h9", category: "Primary", title: "Threshold reward bar", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", developer: "Ian Rex Espinosa", secondaryDeveloper: "Kaye Ann Layug", dueDate: "2026-06-18", phase: "strategy", hoursInPhase: 8, phaseHistory: buildHistory("2026-06-16", "strategy") },
        ],
      },
    ],
  },
  {
    id: "iron-paws",
    name: "Iron Paws",
    projects: [
      {
        id: "full-site",
        name: "Full Site Build",
        podId: "pod-3",
        deliverables: [
          // Ticket — small client tweak request
          { id: "i-t1", category: "Tertiary", title: "Hero CTA copy: \"Get yours\" → \"Try the box\"", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-06", phase: "tickets", hoursInPhase: 14, phaseHistory: buildHistory("2026-06-15", "tickets") },
          { id: "i1", category: "Primary", title: "Homepage", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-05", phase: "launch-testing", hoursInPhase: 4, phaseHistory: buildHistory("2026-06-12", "strategy", "design", "internal-revisions", "design", "external-revisions", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://ironpaws.com/?variant=v2", liveStartedAt: "2026-06-12", metrics: [{ name: "CVR", interim: "+12%" }, { name: "AOV", interim: "+3%" }, { name: "RPV", interim: "+15%" }], interimNotes: "Strong early signal — variant pulling +12% across the board, mobile even higher (+18%). Want another week before calling it." },
          { id: "i2", category: "Secondary", title: "Collection — Beef Cuts", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-22", phase: "development", hoursInPhase: 38, phaseHistory: buildHistory("2026-06-10", "strategy", "design", "external-revisions", "design", "development") },
          { id: "i3", category: "Primary", title: "PDP — Subscription box", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-07", phase: "qa", hoursInPhase: 28, phaseHistory: buildHistory("2026-06-12", "strategy", "design", "internal-revisions", "design", "external-revisions", "design", "development", "qa") },
          { id: "i4", category: "Primary", title: "Quiz funnel — breed match", designer: "Anastasia", secondaryDesigner: "Jack", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-10", phase: "internal-revisions", hoursInPhase: 12, phaseHistory: buildHistory("2026-06-15", "strategy", "design", "internal-revisions", "design", "internal-revisions") },
          // i5: 3 internal-revision rounds — flips to R3 heating-up badge
          { id: "i5", category: "Tertiary", title: "Account dashboard", designer: "Anastasia", secondaryDesigner: "Jack", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-11", phase: "internal-revisions", hoursInPhase: 18, phaseHistory: buildHistory("2026-06-14", "strategy", "design", "internal-revisions", "design", "internal-revisions", "design", "internal-revisions") },
          { id: "i6", category: "Primary", title: "Cart + checkout", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-25", phase: "strategy", hoursInPhase: 10, phaseHistory: buildHistory("2026-06-15", "strategy") },
          // ── Completed tests ──────────────────────────────────────────────
          { id: "i-done1", category: "Primary", title: "Quiz funnel — CTA copy", designer: "Anastasia", secondaryDesigner: "Jack", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", phase: "launch-testing", hoursInPhase: 0, phaseHistory: buildHistory("2026-05-20", "strategy", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://ironpaws.com/quiz?variant=v2", testResult: { concludedAt: "2026-06-04", outcome: "winner", metric: "Completion rate", upliftPct: 24, confidencePct: 99, durationDays: 14, notes: "\"Find your dog's match\" beat \"Take the quiz\" by a mile. Repurpose for the ad set." } },
          { id: "i-done2", category: "Primary", title: "Subscription pricing display", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", phase: "launch-testing", hoursInPhase: 0, phaseHistory: buildHistory("2026-04-28", "strategy", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://ironpaws.com/products/sub-box?variant=v3", testResult: { concludedAt: "2026-05-12", outcome: "loser", metric: "CVR", upliftPct: -7, confidencePct: 92, durationDays: 14, notes: "Showing per-month break-down hurt conversion. Customers seemed to anchor on the smaller number and bounce. Reverted to total price." } },
        ],
      },
    ],
  },
  {
    id: "acme-skincare",
    name: "Acme Skincare",
    projects: [
      {
        id: "hero-refresh",
        name: "Hero Refresh",
        podId: "pod-1",
        deliverables: [
          // Ticket — overflow on press strip
          { id: "a-t1", category: "Bug", title: "Press logo strip overflowing on mobile", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-07", phase: "tickets", hoursInPhase: 28, phaseHistory: buildHistory("2026-06-13", "tickets") },
          { id: "a1", category: "Primary", title: "Above-the-fold redesign", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", dueDate: "2026-06-08", phase: "external-revisions", hoursInPhase: 22, phaseHistory: buildHistory("2026-06-13", "strategy", "design", "external-revisions", "design", "external-revisions") },
          { id: "a2", category: "Secondary", title: "Press-quote strip", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", dueDate: "2026-06-13", phase: "design", hoursInPhase: 26, phaseHistory: buildHistory("2026-06-13", "strategy", "design") },
          { id: "a3", category: "Secondary", title: "Trust badges row", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", dueDate: "2026-06-13", phase: "design", hoursInPhase: 12, phaseHistory: buildHistory("2026-06-15", "strategy", "design") },
          // ── Completed tests ──────────────────────────────────────────────
          { id: "a-done1", category: "Primary", title: "Hero video vs static", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", phase: "launch-testing", hoursInPhase: 0, phaseHistory: buildHistory("2026-05-08", "strategy", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://acmeskincare.com/?variant=video", testResult: { concludedAt: "2026-05-29", outcome: "inconclusive", metric: "Revenue per visitor", upliftPct: 2, confidencePct: 71, durationDays: 21, notes: "Hero video edged static by ~2% but never crossed 90% confidence. Bounce rate slightly worse on mobile (slower LCP). Holding pattern: keep static, retest with a lighter video file." } },
        ],
      },
      {
        id: "advertorial-set",
        name: "Advertorial Set ×3",
        deliverables: [
          { id: "a4", category: "Secondary", title: "Advertorial A — clinical study", designer: "Barnaby Clark", secondaryDesigner: "Anastasia", dueDate: "2026-06-04", phase: "strategy", hoursInPhase: 36, phaseHistory: buildHistory("2026-06-12", "strategy") },
          { id: "a5", category: "Secondary", title: "Advertorial B — founder story", designer: "Barnaby Clark", secondaryDesigner: "Anastasia", dueDate: "2026-06-16", phase: "strategy", hoursInPhase: 18, phaseHistory: buildHistory("2026-06-14", "strategy") },
          { id: "a6", category: "Secondary", title: "Advertorial C — ingredient deep-dive", designer: "Barnaby Clark", secondaryDesigner: "Anastasia", phase: "not-started", hoursInPhase: 0, phaseHistory: [] },
        ],
      },
    ],
  },
];
