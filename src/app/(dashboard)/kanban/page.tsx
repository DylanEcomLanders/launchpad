"use client";

import { useEffect, useMemo, useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { createPortal } from "react-dom";
import {
  PlusIcon,
  ChevronDownIcon,
  CalendarIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  BugAntIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  TicketIcon,
  FireIcon,
  PuzzlePieceIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { useCurrentUser } from "@/components/auth-gate";
import {
  PREVIEW_PHASES,
  PREVIEW_THRESHOLDS,
  WORKING_HOURS_PER_DAY,
  OUTCOME_META,
  CONCLUDE_PROMPT_DAYS,
  INTERIM_NUDGE_DAYS,
  MOCK_TODAY,
  previewPhaseMeta,
  calendarDaysInCurrentPhase,
  daysBetween,
  statusForHoursInPhase,
  formatExpected,
  revisionRoundCount,
  limboStatusFor,
  activeAssigneeFor,
  DOCUMENTS_TEAM_PRIMARY,
  DOCUMENTS_TEAM_SECONDARY,
  type PreviewPhase,
  type StuckStatus,
  type TestOutcome,
  type TestResult,
} from "@/lib/projects/preview-phases";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { uploadScreenshot, signScreenshotPaths } from "@/lib/kanban/storage";
import {
  MOCK_CLIENTS,
  MOCK_PODS,
  type MockDeliverable,
  type MockClient,
  type MockPod,
  type MockProject,
  type TrackedMetric,
  type OnboardingBrief,
} from "@/lib/projects/mock-data";

const DEFAULT_METRICS: TrackedMetric[] = [
  { name: "CVR" },
  { name: "AOV" },
  { name: "RPV" },
];

function isMetricLogged(m: TrackedMetric): boolean {
  return !!m.interim?.trim();
}

type ViewMode = "project" | "master" | "pod" | "results";

/* Three first-class ticket categories surfaced in the add-card flow. Each
 * gets a header icon on the card; Fire additionally short-circuits the
 * stuck calculation so the card reads red the moment it lands. */
type TicketCategory = "bug" | "ticket" | "fire";

const TICKET_CATEGORIES: {
  value: TicketCategory;
  label: string;
  icon: typeof BugAntIcon;
  tone: string;
}[] = [
  { value: "ticket", label: "Ticket", icon: TicketIcon, tone: "text-sky-400" },
  { value: "bug", label: "Bug", icon: BugAntIcon, tone: "text-amber-400" },
  { value: "fire", label: "Fire", icon: FireIcon, tone: "text-red-400" },
];

/* Auto-assignment on entry to Launch + Testing. Aanchal owns the test
 * (interim reads, conclude call). Archie owns the dev side (live URL,
 * deploy rollback if it tanks). Applied both on move and on direct add. */
const LAUNCH_TESTING_TESTER = "Aanchal";
const LAUNCH_TESTING_DEV = "Archie";
/* Strategy phase has a single owner - Aanchal scopes every brief before
 * it lands on the design pod. Surfaced at display time, not stored on the
 * deliverable, so the pod's designer field stays intact for later phases. */
const STRATEGY_OWNER = "Aanchal";

/* Tickets column SLA breakdown by category. Fire short-circuits to stuck the
 * moment it lands; Bug runs on a 24h clock with 12h amber; Ticket runs on
 * 48h with 24h amber. Used by ticketCategoryStatus to override the phase-
 * level threshold in PREVIEW_THRESHOLDS. */
/* Tickets column SLAs measured in calendar days from when the card landed
 * in the column (phaseHistory[0].enteredAt). Ticket = 2d to amber, 3d to
 * red. Bug = 1d to amber, 2d to red. Fire = stuck the moment it lands. */
const TICKET_SLA: Record<
  TicketCategory,
  { approachDays: number; stuckDays: number }
> = {
  ticket: { approachDays: 2, stuckDays: 3 },
  bug: { approachDays: 1, stuckDays: 2 },
  fire: { approachDays: 0, stuckDays: 0 },
};

function ticketCategoryStatus(
  category: TicketCategory,
  enteredAt: string | undefined,
  todayISO: string,
): StuckStatus {
  if (category === "fire") return "stuck";
  const sla = TICKET_SLA[category];
  if (!enteredAt) return "on-track";
  const elapsed = daysBetweenISO(enteredAt, todayISO);
  if (elapsed >= sla.stuckDays) return "stuck";
  if (elapsed >= sla.approachDays) return "approaching";
  return "on-track";
}

/* Project turnaround scales the phase SLAs proportionally. Baseline is 15
 * days; a 25-day full-site build gets ~1.67x the headroom before a card
 * trips amber or red. Tickets column is excluded since it runs on per-
 * category SLAs, not the phase clock. */
function turnaroundMultiplier(days: number | undefined): number {
  if (!days || days === 15) return 1;
  return days / 15;
}

type TurnaroundDays = 15 | 20 | 25;
const TURNAROUND_OPTIONS: TurnaroundDays[] = [15, 20, 25];

type EngagementDays = 30 | 60 | 90;
const ENGAGEMENT_OPTIONS: EngagementDays[] = [30, 60, 90];
/* Retainer pricing tiers - the day count drives the auto-generated
 * docs schedule (weeklies + monthlies in buildRetainerDocs) but the
 * user-facing label is the price tier so admin sees the package
 * client is on at a glance: Entry (£5k), Core (£10k), VIP (£15k). */
const ENGAGEMENT_TIER_LABEL: Record<EngagementDays, string> = {
  30: "£5k Entry",
  60: "£10k Core",
  90: "£15k VIP",
};
const ENGAGEMENT_TIER_SHORT: Record<EngagementDays, string> = {
  30: "£5k",
  60: "£10k",
  90: "£15k",
};

type ProjectType = "build" | "retainer";

/* Retainer Documents schedule. Each retainer auto-seeds these deliverables
 * at creation - dated forward from MOCK_TODAY so they always show up in the
 * Documents column with the right due dates. */
interface ScheduledDoc {
  title: string;
  /** Offset days from engagement start. */
  dueOffsetDays: number;
}

function buildRetainerDocs(engagementDays: EngagementDays): ScheduledDoc[] {
  const docs: ScheduledDoc[] = [];
  const weeks = Math.floor(engagementDays / 7);
  for (let w = 1; w <= weeks; w++) {
    docs.push({ title: `Week ${w} report`, dueOffsetDays: w * 7 });
  }
  const months = Math.max(1, Math.floor(engagementDays / 30));
  for (let m = 1; m <= months; m++) {
    docs.push({
      title: `Month ${m} test plan`,
      dueOffsetDays: (m - 1) * 30 + 3,
    });
    docs.push({
      title: `Month ${m} results report`,
      dueOffsetDays: m * 30,
    });
  }
  docs.sort((a, b) => a.dueOffsetDays - b.dueOffsetDays);
  return docs;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T09:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
interface ExtraProjectTab {
  name: string;
  turnaroundDays: TurnaroundDays;
}

function scaledStatus(
  phase: PreviewPhase,
  hoursInPhase: number,
  turnaroundDays: number | undefined,
): StuckStatus {
  const t = PREVIEW_THRESHOLDS[phase];
  if (!t) return statusForHoursInPhase(phase, hoursInPhase);
  const mult = turnaroundMultiplier(turnaroundDays);
  const expected = t.expectedHours * mult;
  const stuck = t.stuckHours * mult;
  if (hoursInPhase >= stuck) return "stuck";
  if (hoursInPhase >= expected) return "approaching";
  return "on-track";
}

/* DATED DEADLINE ENGINE
 *
 * Build projects work to a 15 / 20 / 25 day external deadline with a 3-day
 * internal buffer (so internal target = external - 3). Phases split that
 * internal budget into clean integer days. Phase 1 (Strategy / Design /
 * Internal Rev) dates anchor to project startDate. External Revisions is
 * the client's clock and doesn't count toward internal. Phase 2 (Dev / QA
 * / Launch) dates anchor to clientApprovedAt (set when first card moves
 * Ext Rev -> Dev). All cards in a project share the schedule.
 */

const PHASE_DAYS_BY_TURNAROUND: Record<
  15 | 20 | 25,
  Record<PreviewPhase, number>
> = {
  15: {
    tickets: 0,
    documents: 0,
    "not-started": 0,
    strategy: 2,
    design: 4,
    "internal-revisions": 1,
    "external-revisions": 3,
    development: 3,
    qa: 1,
    "launch-testing": 1,
  },
  20: {
    tickets: 0,
    documents: 0,
    "not-started": 0,
    strategy: 3,
    design: 5,
    "internal-revisions": 1,
    "external-revisions": 3,
    development: 5,
    qa: 2,
    "launch-testing": 1,
  },
  25: {
    tickets: 0,
    documents: 0,
    "not-started": 0,
    strategy: 3,
    design: 6,
    "internal-revisions": 2,
    "external-revisions": 3,
    development: 7,
    qa: 2,
    "launch-testing": 2,
  },
};

const PHASE_1_ORDER: PreviewPhase[] = [
  "strategy",
  "design",
  "internal-revisions",
];
const PHASE_2_ORDER: PreviewPhase[] = ["development", "qa", "launch-testing"];

const INTERNAL_BUFFER_DAYS = 3;

function addCalendarDays(iso: string, days: number): string {
  const d = new Date(`${iso}T09:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Internal due date for a given phase on a build project. Returns null if
 *  the phase isn't part of the build flow (tickets/documents) or if the
 *  phase belongs to Phase 2 and the client hasn't approved yet ("TBC"). */
function phaseInternalDueDate(
  phase: PreviewPhase,
  project: {
    type?: "build" | "retainer";
    turnaroundDays?: 15 | 20 | 25;
    startDate?: string;
    clientApprovedAt?: string;
  },
): string | null {
  if (project.type !== "build" || !project.turnaroundDays || !project.startDate)
    return null;
  const budget = PHASE_DAYS_BY_TURNAROUND[project.turnaroundDays];
  if (PHASE_1_ORDER.includes(phase)) {
    let cumulative = 0;
    for (const p of PHASE_1_ORDER) {
      cumulative += budget[p];
      if (p === phase) break;
    }
    return addCalendarDays(project.startDate, cumulative);
  }
  if (PHASE_2_ORDER.includes(phase)) {
    if (!project.clientApprovedAt) return null;
    let cumulative = 0;
    for (const p of PHASE_2_ORDER) {
      cumulative += budget[p];
      if (p === phase) break;
    }
    return addCalendarDays(project.clientApprovedAt, cumulative);
  }
  return null;
}

/** Card status driven by the dated phase deadline (manual override or
 *  computed per-phase). Tightened rule:
 *    - on-track: today < deadline
 *    - approaching: today === deadline (day-of)
 *    - stuck: today > deadline (any day overdue)
 *  No buffer - day-after-due is red. */
function deadlineStatus(
  phase: PreviewPhase,
  project: {
    type?: "build" | "retainer";
    turnaroundDays?: 15 | 20 | 25;
    startDate?: string;
    clientApprovedAt?: string;
    phase1Deadline?: string;
    phase2Deadline?: string;
  },
  todayISO: string,
): StuckStatus | null {
  /* Manual phase-bucket deadlines take precedence. Phase 1 cards
   * (strategy / design / int-rev / ext-rev) compare to phase1Deadline;
   * Phase 2 cards (dev / qa / launch) compare to phase2Deadline. */
  const isPhase1 = PHASE_1_ORDER.includes(phase) || phase === "external-revisions";
  const isPhase2 = PHASE_2_ORDER.includes(phase);
  const manualDue = isPhase1
    ? project.phase1Deadline
    : isPhase2
      ? project.phase2Deadline
      : undefined;
  const due = manualDue ?? phaseInternalDueDate(phase, project);
  if (!due) return null;
  const cmp = todayISO.localeCompare(due);
  if (cmp < 0) return "on-track";
  if (cmp === 0) return "approaching";
  return "stuck";
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function daysBetweenISO(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00Z`).getTime();
  const b = new Date(`${toISO}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/* External Revisions 48h client clock. On-track for first 2 days; amber on
 * day 3 (client lagging); stuck from day 4 (escalate). Returns null when the
 * card hasn't been sent yet (no sentToClientAt stamp). */
const EXT_REV_EXPECTED_DAYS = 2;
const EXT_REV_STUCK_DAYS = 3;
function externalReviewStatus(
  sentToClientAt: string | undefined,
  todayISO: string,
): StuckStatus | null {
  if (!sentToClientAt) return null;
  const elapsed = daysBetweenISO(sentToClientAt, todayISO);
  if (elapsed >= EXT_REV_STUCK_DAYS) return "stuck";
  if (elapsed >= EXT_REV_EXPECTED_DAYS) return "approaching";
  return "on-track";
}

/* Documents column status. Each retainer doc has its own dueDate. Past due
 * = amber, past due + 3 = red. */
const DOC_STUCK_BUFFER_DAYS = 3;
function documentsStatus(
  dueDate: string | undefined,
  todayISO: string,
): StuckStatus | null {
  if (!dueDate) return null;
  const elapsed = daysBetweenISO(dueDate, todayISO);
  if (elapsed > DOC_STUCK_BUFFER_DAYS) return "stuck";
  if (elapsed > 0) return "approaching";
  return "on-track";
}

/* Scaled expected-line for the column header. Mirrors formatExpected but
 * applies the project turnaround multiplier so a 25-day build shows "3d 8h"
 * on Strategy instead of the baseline "2d". 8h workday, matches kanban
 * conventions. */
function formatScaledExpected(
  phase: PreviewPhase,
  turnaroundDays: number | undefined,
): string {
  const t = PREVIEW_THRESHOLDS[phase];
  if (!t || t.expectedHours === 0) return "";
  const mult = turnaroundMultiplier(turnaroundDays);
  const hours = t.expectedHours * mult;
  const days = Math.max(1, Math.round(hours / WORKING_HOURS_PER_DAY));
  return `${days}d expected`;
}

/* Deliverable priority bands. Replaces the old page-type categories
 * (PDP / Cart / etc.) since priority is what the strategist actually
 * needs to surface at a glance. Stored on MockDeliverable.category. */
const DELIVERABLE_CATEGORIES = [
  "Primary",
  "Secondary",
  "Tertiary",
  "Other",
] as const;

interface ContextDeliverable extends MockDeliverable {
  clientName: string;
  clientId: string;
  projectName: string;
  projectId: string;
  // Pod the deliverable inherits from its parent project. Drives the By pod
  // view; undefined when the project hasnt been assigned to a pod.
  podId?: string;
  // Project-level turnaround scale. 15 / 20 / 25 days.
  turnaroundDays?: 15 | 20 | 25;
  // Project type. Drives visual differentiation + gating.
  projectType?: ProjectType;
  // Project-level dated-deadline anchors. Phase 1 due dates compute off
  // projectStartDate; Phase 2 off projectClientApprovedAt (TBC until set).
  projectStartDate?: string;
  projectClientApprovedAt?: string;
  // Manual client-facing deadlines per phase bucket. When set, override
  // the computed per-phase due dates for stuck/approaching/on-track.
  // Lets admin pin an externally-imposed deadline (campaign launch,
  // event, client cut-off) without having to back-compute start +
  // turnaround.
  projectPhase1Deadline?: string;
  projectPhase2Deadline?: string;
}

const STATUS_RANK: Record<StuckStatus, number> = {
  stuck: 0,
  approaching: 1,
  "on-track": 2,
};

/* Card override for cards in launch + testing with a running test. Overrides
 * the stuck/approaching/on-track palette with a green tint so live tests pop
 * across the board without the strategist having to read the badge. */
const LIVE_STYLE = {
  ring: "border-emerald-500/60",
  bg: "bg-emerald-500/10",
  accent: "text-emerald-400",
  dot: "#10B981",
  label: "Live",
};

const STUCK_STYLES: Record<StuckStatus, {
  ring: string;
  bg: string;
  accent: string;
  dot: string;
  label: string;
}> = {
  stuck: {
    ring: "border-red-500/60",
    bg: "bg-red-500/10",
    accent: "text-red-400",
    dot: "#F87171",
    label: "Stuck",
  },
  approaching: {
    ring: "border-amber-500/60",
    bg: "bg-amber-500/10",
    accent: "text-amber-400",
    dot: "#F59E0B",
    label: "Approaching",
  },
  "on-track": {
    ring: "border-[#2A2A2A]",
    bg: "bg-[#181818]",
    accent: "text-[#71757D]",
    dot: "#4B4D52",
    label: "On track",
  },
};

function formatHours(h: number): string {
  if (h <= 0) return "0h";
  if (h < WORKING_HOURS_PER_DAY) return `${h}h`;
  const days = Math.floor(h / WORKING_HOURS_PER_DAY);
  const rem = h - days * WORKING_HOURS_PER_DAY;
  if (rem === 0) return `${days}d`;
  return `${days}d ${rem}h`;
}

function formatDueDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDate();
  const month = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  return `${day} ${month}`;
}

function cloneClients(src: MockClient[]): MockClient[] {
  return src.map((c) => ({
    ...c,
    projects: c.projects.map((p) => ({
      ...p,
      deliverables: p.deliverables.map((d) => ({
        ...d,
        phaseHistory: d.phaseHistory ? d.phaseHistory.map((h) => ({ ...h })) : undefined,
        testResult: d.testResult ? { ...d.testResult } : undefined,
      })),
    })),
  }));
}

export default function KanbanPage() {
  /* Real Supabase-backed data via useKanbanData. First paint comes from
   * localStorage (or MOCK_CLIENTS on cold load); the cloud pull overlays
   * once it returns. Mutations through setClients / setPods mirror to
   * Supabase automatically. */
  const { clients, setClients, pods, setPods } = useKanbanData();
  const [viewMode, setViewMode] = useState<ViewMode>("project");
  /* Quality-of-life search: filters cards across the active view by
   * title / client name / assignee. Cleared with Esc when focused.
   * Press / from anywhere to jump focus into it. */
  const [searchQuery, setSearchQuery] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  /* Add-client modal open state. Designed in-app dialog instead of
   * window.prompt - matches the rest of the kanban's look. */
  const [addClientOpen, setAddClientOpen] = useState(false);
  /* Card density. Persisted in localStorage so the choice sticks
   * across sessions.
   *   "cosy" - default, full card detail with breathing room
   *   "glance" - minimal status bars so admin can scan amber/reds
   *              across every column in one look. Killer for the
   *              All / Pod views where you want to spot trouble. */
  const [density, setDensity] = useState<"cosy" | "glance">("cosy");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("launchpad-kanban-density");
    if (saved === "glance" || saved === "cosy") setDensity(saved);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("launchpad-kanban-density", density);
  }, [density]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  /* Keyboard shortcuts. "/" from anywhere → focus search. Esc while
   * the search input is focused → clear + blur. Skips if any other
   * input/textarea is focused so it doesn't hijack normal typing. */
  useEffect(() => {
    function isEditableTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !isEditableTarget(e.target)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [clientId, setClientId] = useState<string>(MOCK_CLIENTS[0]?.id ?? "");
  const [podId, setPodId] = useState<string>(MOCK_PODS[0]?.id ?? "");
  const [projectId, setProjectId] = useState<string>(
    MOCK_CLIENTS[0]?.projects[0]?.id ?? "",
  );

  /* Keep clientId / projectId / podId pointing at real rows after the
   * cloud overlay lands. If the live data dropped or renamed our pick,
   * fall back to the first available one so the page doesnt go blank. */
  useEffect(() => {
    if (clients.length === 0) return;
    if (!clients.find((c) => c.id === clientId)) {
      const next = clients[0];
      setClientId(next.id);
      setProjectId(next.projects[0]?.id ?? "");
    }
  }, [clients, clientId]);

  useEffect(() => {
    if (pods.length === 0) return;
    if (!pods.find((p) => p.id === podId)) {
      setPodId(pods[0].id);
    }
  }, [pods, podId]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<PreviewPhase | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  /* Deep-link: /kanban?card={id} auto-opens the matching deliverable's
   * modal. Used by /my-work to jump to a card without losing context.
   * Runs once after data loads (so the card exists in clients[]). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const cardId = url.searchParams.get("card");
    if (!cardId) return;
    /* Wait until clients are loaded - if useKanbanData is still
     * fetching, the activeId would set but activeDeliverable lookup
     * would be empty. Re-check on each clients change until we find
     * the card or the URL param is removed. */
    const exists = clients.some((c) =>
      c.projects.some((p) => p.deliverables.some((d) => d.id === cardId)),
    );
    if (!exists) return;
    setActiveId(cardId);
    /* Strip the query param so re-mount doesn't keep re-opening. */
    url.searchParams.delete("card");
    window.history.replaceState({}, "", url.toString());
  }, [clients]);
  /* Custom dark confirm prompt. Set via the confirmAction helper which
   * returns a promise resolved when the user clicks confirm/cancel. */
  const [confirmPrompt, setConfirmPrompt] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    destructive: boolean;
    resolve: (ok: boolean) => void;
  } | null>(null);

  function confirmAction(opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmPrompt({
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? "Confirm",
        destructive: !!opts.destructive,
        resolve,
      });
    });
  }

  const [newTitleDraft, setNewTitleDraft] = useState<string>("");
  const [addingToPhase, setAddingToPhase] = useState<PreviewPhase | null>(null);
  const [newCategoryDraft, setNewCategoryDraft] =
    useState<TicketCategory>("ticket");
  const [newDeliverableCategoryDraft, setNewDeliverableCategoryDraft] =
    useState<string>("");

  // Onboarding brief is now structured Q&A sourced from the client's
  // onboarding submission. Read-only in the kanban; editing happens in the
  // onboarding inbox / portal flow.
  const [onboardingPreviewOpen, setOnboardingPreviewOpen] =
    useState<boolean>(false);

  const [rulesOpen, setRulesOpen] = useState<boolean>(false);

  const [bankOutcome, setBankOutcome] = useState<TestOutcome | "all">("all");
  const [bankClient, setBankClient] = useState<string>("all");
  const [bankMetric, setBankMetric] = useState<string>("all");

  const activeClient = clients.find((c) => c.id === clientId) ?? clients[0];
  const activeProject =
    activeClient?.projects.find((p) => p.id === projectId) ??
    activeClient?.projects[0];

  /* Look up table: podId → pod (with current roster). Pods are
   * keyed by id and the pods array already has v2 taking priority
   * over the legacy kanban_pods table. */
  const podById = useMemo(() => {
    const m = new Map<string, (typeof pods)[number]>();
    for (const pod of pods) m.set(pod.id, pod);
    return m;
  }, [pods]);

  const allDeliverables: ContextDeliverable[] = useMemo(() => {
    const out: ContextDeliverable[] = [];
    for (const c of clients) {
      for (const p of c.projects) {
        /* Always pull the current pod roster fresh - card.designer /
         * .developer were stamped at creation and go stale when the
         * pod's roster changes in /company/pods. Auto-heals without
         * a manual reassign. Falls back to whatever was stamped on
         * the deliverable when the project has no pod assigned. */
        const pod = p.podId ? podById.get(p.podId) : undefined;
        for (const d of p.deliverables) {
          /* Documents always assign to the docs team regardless of
           * pod roster. Overrides the pod resolve so the card chrome
           * + /my-work routing both reflect it. */
          const isDocs = d.phase === "documents";
          const resolvedDesigner = isDocs
            ? DOCUMENTS_TEAM_PRIMARY
            : (pod?.designer ?? d.designer);
          const resolvedSecondaryDesigner = isDocs
            ? DOCUMENTS_TEAM_SECONDARY
            : (pod?.secondaryDesigner ?? d.secondaryDesigner);
          const resolvedDeveloper = isDocs
            ? d.developer
            : (pod?.developer ?? d.developer);
          const resolvedSecondaryDeveloper = isDocs
            ? d.secondaryDeveloper
            : (pod?.secondaryDeveloper ?? d.secondaryDeveloper);
          out.push({
            ...d,
            designer: resolvedDesigner,
            secondaryDesigner: resolvedSecondaryDesigner,
            developer: resolvedDeveloper,
            secondaryDeveloper: resolvedSecondaryDeveloper,
            clientName: c.name,
            clientId: c.id,
            projectName: p.name,
            projectId: p.id,
            podId: p.podId,
            turnaroundDays: p.turnaroundDays,
            projectType: p.type,
            projectStartDate: p.startDate,
            projectClientApprovedAt: p.clientApprovedAt,
            projectPhase1Deadline: p.phase1Deadline,
            projectPhase2Deadline: p.phase2Deadline,
          });
        }
      }
    }
    return out;
  }, [clients, podById]);

  /* Current user's display name for "Mine only" matching. Falls back
   * to the auth name; matches against designer / secondaryDesigner /
   * developer / secondaryDeveloper free-text fields. */
  const currentUser = useCurrentUser();
  const meName = currentUser?.name?.trim().toLowerCase() || "";

  const visibleDeliverables: ContextDeliverable[] = useMemo(() => {
    // Completed tickets + concluded tests fall off the active board. Tickets
    // are completed in place via the modal; concluded tests live in Results.
    const active = (d: ContextDeliverable) => !d.testResult && !d.completedAt;
    /* Free-text search across title + client + project + assignees.
     * Empty query short-circuits. */
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = (d: ContextDeliverable) => {
      if (!q) return true;
      const hay = [
        d.title,
        d.clientName,
        d.projectName,
        d.category,
        d.designer,
        d.secondaryDesigner,
        d.developer,
        d.secondaryDeveloper,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    };
    const matchesMine = (d: ContextDeliverable) => {
      if (!mineOnly || !meName) return true;
      const all = [d.designer, d.secondaryDesigner, d.developer, d.secondaryDeveloper]
        .filter(Boolean)
        .map((n) => n!.trim().toLowerCase());
      return all.includes(meName);
    };
    /* Base scope by view mode, then apply search + mine filters. */
    let base: ContextDeliverable[];
    if (viewMode === "results") {
      base = allDeliverables.filter(
        (d) => d.phase === "launch-testing" && d.testResult,
      );
    } else if (viewMode === "master") {
      base = allDeliverables.filter(active);
    } else if (viewMode === "pod") {
      base = allDeliverables.filter((d) => d.podId === podId && active(d));
    } else if (!activeClient || !activeProject) {
      base = [];
    } else {
      base = allDeliverables.filter(
        (d) =>
          d.clientId === activeClient.id &&
          d.projectId === activeProject.id &&
          active(d),
      );
    }
    return base.filter((d) => matchesSearch(d) && matchesMine(d));
  }, [allDeliverables, viewMode, activeClient, activeProject, podId, searchQuery, mineOnly, meName]);

  const cardsByPhase = useMemo(() => {
    const map: Record<PreviewPhase, ContextDeliverable[]> = {
      tickets: [],
      documents: [],
      "not-started": [],
      strategy: [],
      design: [],
      "internal-revisions": [],
      "external-revisions": [],
      development: [],
      qa: [],
      "launch-testing": [],
    };
    for (const d of visibleDeliverables) {
      (map[d.phase] ?? (map[d.phase] = [])).push(d);
    }
    for (const k of Object.keys(map) as PreviewPhase[]) {
      map[k].sort((a, b) => {
        const aRounds = revisionRoundCount(a.phaseHistory);
        const bRounds = revisionRoundCount(b.phaseHistory);
        const aLimbo = limboStatusFor(aRounds) !== "none" ? 0 : 1;
        const bLimbo = limboStatusFor(bRounds) !== "none" ? 0 : 1;
        if (aLimbo !== bLimbo) return aLimbo - bLimbo;
        const aStatus = statusForHoursInPhase(a.phase, a.hoursInPhase);
        const bStatus = statusForHoursInPhase(b.phase, b.hoursInPhase);
        if (STATUS_RANK[aStatus] !== STATUS_RANK[bStatus]) {
          return STATUS_RANK[aStatus] - STATUS_RANK[bStatus];
        }
        const aDue = a.dueDate ?? "9999-12-31";
        const bDue = b.dueDate ?? "9999-12-31";
        if (aDue !== bDue) return aDue.localeCompare(bDue);
        return a.title.localeCompare(b.title);
      });
    }
    return map;
  }, [visibleDeliverables]);

  const resultCards = useMemo(() => {
    if (viewMode !== "results") return [] as ContextDeliverable[];
    let out = allDeliverables.filter(
      (d) => d.phase === "launch-testing" && d.testResult,
    );
    if (bankOutcome !== "all") {
      out = out.filter((d) => d.testResult?.outcome === bankOutcome);
    }
    if (bankClient !== "all") {
      out = out.filter((d) => d.clientId === bankClient);
    }
    if (bankMetric !== "all") {
      out = out.filter((d) => d.testResult?.metric === bankMetric);
    }
    return out.sort((a, b) =>
      (b.testResult?.concludedAt ?? "").localeCompare(a.testResult?.concludedAt ?? ""),
    );
  }, [viewMode, allDeliverables, bankOutcome, bankClient, bankMetric]);

  const bankMetricOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of allDeliverables) {
      if (d.testResult?.metric) set.add(d.testResult.metric);
    }
    return Array.from(set).sort();
  }, [allDeliverables]);

  const activeDeliverable = useMemo(
    () => allDeliverables.find((d) => d.id === activeId) ?? null,
    [allDeliverables, activeId],
  );

  function moveDeliverable(id: string, targetPhase: PreviewPhase) {
    setClients((prev) => {
      const next = cloneClients(prev);
      for (const c of next) {
        for (const p of c.projects) {
          const d = p.deliverables.find((x) => x.id === id);
          if (!d) continue;
          if (d.phase === targetPhase) return next;
          const fromIdx = PREVIEW_PHASES.findIndex((x) => x.value === d.phase);
          const toIdx = PREVIEW_PHASES.findIndex((x) => x.value === targetPhase);
          // Backward move flags the card as needing revisions. Forward move
          // past the original kickback clears it. (Tickets / documents /
          // not-started arent part of the build flow so dont count.)
          const inFlow =
            fromIdx >= 0 &&
            toIdx >= 0 &&
            !["tickets", "documents", "not-started"].includes(d.phase) &&
            !["tickets", "documents", "not-started"].includes(targetPhase);
          if (inFlow && toIdx < fromIdx) {
            d.revisionRequested = true;
          } else if (inFlow && toIdx > fromIdx && d.revisionRequested) {
            // Once the card progresses past where it was bounced from, clear
            // the tag. Heuristic: progression beyond the original phase.
            d.revisionRequested = false;
          }
          // Internal approval is only meaningful while sitting in Internal
          // Rev awaiting the designer's send-to-client. Drag the card out
          // (Ext Rev = "I've sent it") and the green clears.
          if (
            d.phase === "internal-revisions" &&
            targetPhase !== "internal-revisions"
          ) {
            d.approvedAt = undefined;
          }
          // clientApprovedAt is set by the PM explicitly (via the "Mark
          // client approved" action in the Build schedule), not auto-fired
          // on card moves. Card drag-drops shouldn't accidentally lock the
          // Phase 2 schedule.
          // Stamp the send-to-client moment when card enters External Rev.
          // Anchors the 48h client-review clock. Clear when card leaves.
          if (
            d.phase !== "external-revisions" &&
            targetPhase === "external-revisions"
          ) {
            d.sentToClientAt = MOCK_TODAY;
          }
          if (
            d.phase === "external-revisions" &&
            targetPhase !== "external-revisions"
          ) {
            d.sentToClientAt = undefined;
          }
          // Snapshot previous active assignee BEFORE the phase change so we
          // can compare against the new one and fire a notification when the
          // owner has actually changed (most phase moves do change owner).
          const prevAssignee = activeAssigneeFor(d.phase, {
            designer: d.designer,
            secondaryDesigner: d.secondaryDesigner,
            developer: d.developer,
            secondaryDeveloper: d.secondaryDeveloper,
          }).name;
          d.phase = targetPhase;
          d.hoursInPhase = 0;
          const stamp = MOCK_TODAY;
          const history = d.phaseHistory ? [...d.phaseHistory] : [];
          history.push({ phase: targetPhase, enteredAt: stamp });
          d.phaseHistory = history;
          const nextAssignee = activeAssigneeFor(targetPhase, {
            designer: d.designer,
            secondaryDesigner: d.secondaryDesigner,
            developer: d.developer,
            secondaryDeveloper: d.secondaryDeveloper,
          }).name;
          if (nextAssignee && nextAssignee !== prevAssignee) {
            notifyAssigneeChange(id, targetPhase);
          }
          return next;
        }
      }
      return next;
    });
  }

  function addDeliverable(
    phase: PreviewPhase,
    title: string,
    category?: string,
  ) {
    /* Title can't be empty - that's a no-op, no need to nag. */
    if (!title.trim()) return;
    if (!activeClient) {
      window.alert(
        "No client selected. Add a client first via the client picker, then try again.",
      );
      return;
    }
    /* The silent fail before was: hit Enter with no project, nothing
     * happens. Now we surface why + give the team a one-click escape. */
    if (!activeProject) {
      const create = window.confirm(
        `"${activeClient.name}" has no project yet. Create a default project and add this card to it?`,
      );
      if (!create) return;
      const newProjectId = `proj-${Date.now()}`;
      setClients((prev) => {
        const next = cloneClients(prev);
        const c = next.find((x) => x.id === activeClient.id);
        if (!c) return next;
        c.projects.push({
          id: newProjectId,
          name: "Default project",
          type: "build",
          turnaroundDays: 20,
          deliverables: [],
        });
        return next;
      });
      setProjectId(newProjectId);
      /* Defer the deliverable add by one tick so React picks up the new
       * project from the state update before activeProject re-derives. */
      setTimeout(() => addDeliverable(phase, title, category), 0);
      return;
    }
    setClients((prev) => {
      const next = cloneClients(prev);
      const c = next.find((x) => x.id === activeClient.id);
      const p = c?.projects.find((x) => x.id === activeProject.id);
      if (!p) return next;
      const id = `new-${Date.now()}`;
      const pod = pods.find((pd) => pd.id === p.podId);
      // Launch + Testing assignees are surfaced at display time, not stored
      // on the deliverable, so the build team data stays intact for history.
      p.deliverables.push({
        id,
        title: title.trim(),
        category,
        phase,
        hoursInPhase: 0,
        phaseHistory: [{ phase, enteredAt: MOCK_TODAY }],
        designer: pod?.designer,
        secondaryDesigner: pod?.secondaryDesigner,
        developer: pod?.developer,
        secondaryDeveloper: pod?.secondaryDeveloper,
      });
      // New card = brand-new assignment for whoever owns this phase.
      notifyAssigneeChange(id, phase);
      return next;
    });
    setNewTitleDraft("");
    setNewCategoryDraft("ticket");
    setNewDeliverableCategoryDraft("");
    setAddingToPhase(null);
  }

  /* Add a client to the board. Slug the name into a stable id and
   * suffix-disambiguate if it already exists. New client starts with
   * no projects so the PM can immediately create one via Add project. */
  function addClient(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    const baseSlug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32) || `client-${Date.now()}`;
    const existingIds = new Set(clients.map((c) => c.id));
    const id = existingIds.has(baseSlug)
      ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
      : baseSlug;
    setClients((prev) => {
      const next = cloneClients(prev);
      next.push({ id, name, projects: [] });
      return next;
    });
    /* Jump to the new client so the PM lands on its empty Add-project
     * prompt instead of having to hunt through the dropdown. */
    setClientId(id);
    setProjectId("");
  }

  /* Destructive: drop a project (and all its cards) from a client.
   * Triggers a confirm via the existing confirmPrompt pattern. If
   * the project being deleted is the active one, falls back to
   * whichever sibling is left. */
  async function deleteProject(clientId: string, projectId: string) {
    const client = clients.find((c) => c.id === clientId);
    const project = client?.projects.find((p) => p.id === projectId);
    if (!project) return;
    const ok = await confirmAction({
      title: "Delete project?",
      message: `"${project.name}" and all its cards will be deleted permanently. This can't be undone.`,
      confirmLabel: "Delete project",
      destructive: true,
    });
    if (!ok) return;
    setClients((prev) => {
      const next = cloneClients(prev);
      const c = next.find((x) => x.id === clientId);
      if (!c) return next;
      c.projects = c.projects.filter((p) => p.id !== projectId);
      return next;
    });
    if (activeProject?.id === projectId) {
      const remaining = (client?.projects ?? []).filter((p) => p.id !== projectId);
      setProjectId(remaining[0]?.id ?? "");
    }
  }

  /* Destructive: drop a client (and every project + card under it). */
  async function deleteClient(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const totalCards = client.projects.reduce(
      (n, p) => n + p.deliverables.length,
      0,
    );
    const ok = await confirmAction({
      title: "Delete client?",
      message: `"${client.name}" with ${client.projects.length} project${client.projects.length === 1 ? "" : "s"} and ${totalCards} card${totalCards === 1 ? "" : "s"} will be deleted permanently. This can't be undone.`,
      confirmLabel: "Delete client",
      destructive: true,
    });
    if (!ok) return;
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    if (activeClient?.id === clientId) {
      const remaining = clients.filter((c) => c.id !== clientId);
      setClientId(remaining[0]?.id ?? "");
      setProjectId(remaining[0]?.projects[0]?.id ?? "");
    }
  }

  function addProject(input: {
    name: string;
    type: ProjectType;
    turnaroundDays?: TurnaroundDays;
    engagementDays?: EngagementDays;
  }) {
    const { name, type, turnaroundDays, engagementDays } = input;
    if (!name.trim() || !activeClient) return;
    const newId = `proj-${Date.now()}`;
    setClients((prev) => {
      const next = cloneClients(prev);
      const c = next.find((x) => x.id === activeClient.id);
      if (!c) return next;
      // Retainers auto-seed a Documents schedule (weekly reports, monthly
      // test plans + results writeups) so the team isnt staring at an empty
      // board at engagement kickoff.
      const seededDeliverables: MockDeliverable[] =
        type === "retainer" && engagementDays
          ? buildRetainerDocs(engagementDays).map((doc, i) => ({
              id: `${newId}-doc-${i}`,
              title: doc.title,
              category: "Primary",
              phase: "documents",
              hoursInPhase: 0,
              dueDate: addDaysISO(MOCK_TODAY, doc.dueOffsetDays),
              phaseHistory: [{ phase: "documents", enteredAt: MOCK_TODAY }],
            }))
          : [];
      c.projects.push({
        id: newId,
        name: name.trim(),
        type,
        turnaroundDays: type === "build" ? turnaroundDays : undefined,
        engagementDays: type === "retainer" ? engagementDays : undefined,
        // Builds anchor every Phase 1 deadline to startDate. Retainers track
        // dates per-deliverable so they don't need it.
        startDate: type === "build" ? MOCK_TODAY : undefined,
        deliverables: seededDeliverables,
      });
      return next;
    });
    setProjectId(newId);
  }

  async function assignPodToProject(podId: string) {
    if (!activeClient || !activeProject) return;
    const pod = pods.find((p) => p.id === podId);
    if (!pod) return;
    // If the project already has deliverables, picking a new pod will
    // overwrite every card's assignees. Ask first so per-card overrides
    // arent silently destroyed. Empty projects skip the prompt.
    const hasDeliverables = (activeProject.deliverables ?? []).length > 0;
    if (hasDeliverables) {
      const overwrite = await confirmAction({
        title: `Switch to ${pod.name}?`,
        message: `This will overwrite the designer and developer on all ${activeProject.deliverables.length} cards in this project. Cancel to only set the project pod (existing cards keep their assignees).`,
        confirmLabel: "Overwrite all",
      });
      setClients((prev) => {
        const next = cloneClients(prev);
        const c = next.find((x) => x.id === activeClient.id);
        const p = c?.projects.find((x) => x.id === activeProject.id);
        if (!p) return next;
        p.podId = podId;
        if (!overwrite) return next;
        let changed = 0;
        for (const d of p.deliverables) {
          const prevAssignee = activeAssigneeFor(d.phase, {
            designer: d.designer,
            secondaryDesigner: d.secondaryDesigner,
            developer: d.developer,
            secondaryDeveloper: d.secondaryDeveloper,
          }).name;
          d.designer = pod.designer;
          d.secondaryDesigner = pod.secondaryDesigner;
          d.developer = pod.developer;
          d.secondaryDeveloper = pod.secondaryDeveloper;
          const nextAssignee = activeAssigneeFor(d.phase, {
            designer: d.designer,
            secondaryDesigner: d.secondaryDesigner,
            developer: d.developer,
            secondaryDeveloper: d.secondaryDeveloper,
          }).name;
          if (nextAssignee && nextAssignee !== prevAssignee) changed += 1;
        }
        // Single ping to the new pod summarising the project handover.
        if (changed > 0) notifyPodReassignment(p.id, podId, changed);
        return next;
      });
      return;
    }
    // Empty project - just set the pod, no cards to touch.
    setClients((prev) => {
      const next = cloneClients(prev);
      const c = next.find((x) => x.id === activeClient.id);
      const p = c?.projects.find((x) => x.id === activeProject.id);
      if (p) p.podId = podId;
      return next;
    });
  }

  function updateDeliverable(id: string, patch: Partial<MockDeliverable>) {
    setClients((prev) => {
      const next = cloneClients(prev);
      for (const c of next) {
        for (const p of c.projects) {
          const d = p.deliverables.find((x) => x.id === id);
          if (!d) continue;
          Object.assign(d, patch);
          return next;
        }
      }
      return next;
    });
  }

  function concludeTest(id: string, result: TestResult) {
    updateDeliverable(id, { testResult: result });
    setActiveId(null);
  }

  // Approval action out of Internal Revisions. Card STAYS in Internal Rev,
  // turns green, and the active assignee flips to the primary designer
  // (they need to actually send it to the client). Designer manually drags
  // to External Rev once they've sent it.
  function approveInternalRevisions(id: string) {
    updateDeliverable(id, { approvedAt: MOCK_TODAY, revisionRequested: false });
    notifyAssigneeChange(id, "internal-revisions");
  }

  // Kick-back action out of Internal Revisions. Moves the card back to
  // Design; moveDeliverable already sets revisionRequested on backward moves.
  function requestRevisionsFromInternal(id: string) {
    moveDeliverable(id, "design");
    notifyAssigneeChange(id, "design");
  }

  // Tickets dont progress through phases - they get completed in place.
  // Stamping completedAt hides the card from the active board.
  function completeTicket(id: string) {
    updateDeliverable(id, { completedAt: MOCK_TODAY });
    setActiveId(null);
  }

  // Reverse of completeTicket - re-opens a ticket if marked done by mistake.
  function uncompleteTicket(id: string) {
    updateDeliverable(id, { completedAt: undefined });
  }

  // Undo of approveInternalRevisions. Clears the approval stamp so the
  // Approve / Request revisions buttons come back. No phase change required
  // since approve doesnt move the card any more.
  function undoApproveInternal(id: string) {
    updateDeliverable(id, { approvedAt: undefined });
  }

  // QA approval - forward to Launch & Testing. Mirrors approveInternal
  // shape so the modal can render the same decision bar layout.
  function approveQA(id: string) {
    moveDeliverable(id, "launch-testing");
  }

  // QA kickback - send back to Development with the Revisions tag.
  function kickbackFromQA(id: string) {
    moveDeliverable(id, "development");
  }

  // Card delete - removes the deliverable from its project's list. No undo
  // (would need a soft-delete; prototype keeps it hard).
  async function deleteDeliverable(id: string) {
    const d = allDeliverables.find((x) => x.id === id);
    const ok = await confirmAction({
      title: "Delete card?",
      message: d
        ? `"${d.title}" will be removed from ${d.projectName}. This cannot be undone.`
        : "This card will be removed from its project. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setClients((prev) => {
      const next = cloneClients(prev);
      for (const c of next) {
        for (const p of c.projects) {
          const idx = p.deliverables.findIndex((x) => x.id === id);
          if (idx >= 0) {
            p.deliverables.splice(idx, 1);
            return next;
          }
        }
      }
      return next;
    });
    setActiveId(null);
  }

  // Project startDate override. Default is MOCK_TODAY at creation, but if
  // a project actually started a week ago the team needs to backdate so the
  // Phase 1 deadlines compute correctly.
  function setProjectStartDate(projectId: string, iso: string | undefined) {
    setClients((prev) => {
      const next = cloneClients(prev);
      for (const c of next) {
        const p = c.projects.find((x) => x.id === projectId);
        if (p) p.startDate = iso;
      }
      return next;
    });
  }

  // PM action - mark client approval. Anchors all Phase 2 deadlines from
  // this date. Accepts an ISO so the PM can backdate (client approved
  // yesterday, getting around to it today).
  function setClientApproval(projectId: string, iso: string | undefined) {
    setClients((prev) => {
      const next = cloneClients(prev);
      for (const c of next) {
        const p = c.projects.find((x) => x.id === projectId);
        if (p) p.clientApprovedAt = iso;
      }
      return next;
    });
  }

  // Manual client-facing Phase 1 deadline. When set, overrides the
  // computed per-phase due dates for every Phase 1 card on the project.
  function setProjectPhase1Deadline(projectId: string, iso: string | undefined) {
    setClients((prev) => {
      const next = cloneClients(prev);
      for (const c of next) {
        const p = c.projects.find((x) => x.id === projectId);
        if (p) p.phase1Deadline = iso;
      }
      return next;
    });
  }

  // Manual client-facing Phase 2 deadline. Same override semantics as
  // setProjectPhase1Deadline scoped to Phase 2 cards.
  function setProjectPhase2Deadline(projectId: string, iso: string | undefined) {
    setClients((prev) => {
      const next = cloneClients(prev);
      for (const c of next) {
        const p = c.projects.find((x) => x.id === projectId);
        if (p) p.phase2Deadline = iso;
      }
      return next;
    });
  }

  // Project-level client approval reset. Wipes p.clientApprovedAt so Phase 2
  // deadlines go back to TBC. Useful when a card was dragged into Dev
  // accidentally and triggered the stamp.
  function resetClientApproval(projectId: string) {
    setClients((prev) => {
      const next = cloneClients(prev);
      for (const c of next) {
        const p = c.projects.find((x) => x.id === projectId);
        if (p) p.clientApprovedAt = undefined;
      }
      return next;
    });
  }

  // Notification stub - fires when a card moves into a phase whose active
  // assignee differs from the current one. Real Slack wiring lands later
  // (Viktor). Console-logged for now so the trace is visible in dev.
  function notifyAssigneeChange(_id: string, _newPhase: PreviewPhase) {
    // no-op stub; real hook lands when Slack integration is wired
  }

  // Batched pod-level notification - fired once per project pod swap
  // instead of per-card so the pod gets a single ping ("Pod 1 -> Pod 2 on
  // ACME PDP, 14 cards") rather than 14 separate dings.
  function notifyPodReassignment(
    _projectId: string,
    _newPodId: string,
    _changedCardCount: number,
  ) {
    // no-op stub
  }

  const headerCountLabel =
    viewMode === "results"
      ? `${resultCards.length} test${resultCards.length === 1 ? "" : "s"}`
      : viewMode === "pod"
        ? `${visibleDeliverables.length} deliverables · ${new Set(visibleDeliverables.map((d) => d.projectId)).size} projects`
        : `${visibleDeliverables.length} deliverables · ${new Set(visibleDeliverables.map((d) => d.clientId)).size} clients`;

  const viewModeLabel =
    viewMode === "project"
      ? "By project"
      : viewMode === "master"
        ? "All projects"
        : viewMode === "pod"
          ? "By pod"
          : "Results Library";

  const activePod = pods.find((p) => p.id === podId);

  function headerTitle(): { bold: string; light: string } {
    if (viewMode === "results") {
      return { bold: "Results Library", light: "" };
    }
    if (viewMode === "master") {
      return { bold: "All projects", light: "in flight" };
    }
    if (viewMode === "pod") {
      return {
        bold: activePod?.name ?? "Pick a pod",
        light: "on the plate",
      };
    }
    // Keep the title constant per client so switching between projects
    // doesnt push the right-side cluster around. The active project is
    // already visible in the project tab row directly below.
    return {
      bold: activeClient?.name ?? "Pick a client",
      light: "in flight",
    };
  }

  const title = headerTitle();
  const clientTabsForBank = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of clients) seen.set(c.id, c.name);
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [clients]);

  return (
    <div className="min-h-screen bg-[#080808] text-[#E5E5EA]">
      <div className="mx-auto px-4 sm:px-6 py-8">
        {/* 2-col grid so the right cluster never wraps below the title.
            Title takes 1fr (with min-w-0 + truncate so long titles like
            longer titles shrink with ellipsis instead of pushing the
            cluster). Cluster takes auto, stays anchored at the right edge. */}
        <div className="grid grid-cols-[1fr_auto] items-end gap-6 mb-6">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#71757D]">
              Mission Control · {viewModeLabel}
              {headerCountLabel && (
                <span className="text-[#4B4D52] normal-case tracking-normal">
                  {" · "}{headerCountLabel.toLowerCase()}
                </span>
              )}
            </p>
            <h1 className="mt-2 text-[28px] leading-tight truncate">
              <span className="font-bold text-[#E5E5EA]">{title.bold}</span>{" "}
              <span className="font-normal text-[#71757D]">{title.light}</span>
            </h1>
          </div>

          {/* Right cluster - decluttered. Primary controls only:
              Mine + view-mode pill + overflow menu. Search collapses
              to an icon; Phase rules + Cosy/Glance live in the menu. */}
          <div className="flex items-center gap-2">
            <SyncErrorToast />
            {/* Search - icon-only by default to save header real estate.
                Click or press / to expand into an input; Esc collapses. */}
            <SearchControl
              query={searchQuery}
              onChange={setSearchQuery}
              inputRef={searchInputRef}
            />
            {/* Mine only - filters to cards where the signed-in user is
                listed as designer or developer (any slot). */}
            {meName && (
              <button
                onClick={() => setMineOnly((v) => !v)}
                className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-full transition-colors ${
                  mineOnly
                    ? "bg-emerald-500/[0.15] text-emerald-200 border border-emerald-500/40"
                    : "text-[#71757D] hover:text-white border border-[#2A2A2A] hover:border-[#383838]"
                }`}
                title="Show only cards assigned to you"
              >
                Mine
              </button>
            )}

            {/* + New client button — moved LEFT of the view mode pill
                so when it disappears in non-project modes, the pill +
                overflow stay anchored to the right edge. */}
            {viewMode === "project" && (
              <button
                onClick={() => setAddClientOpen(true)}
                className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white transition-colors px-3 py-2"
                title="Add a new client"
              >
                + Client
              </button>
            )}

            {/* Client / pod selector - custom dropdown matching the
                app's dark aesthetic (native select popover is browser-
                styled and looks out of place). Each item shows the
                name + a project count for clients / member count for
                pods. */}
            {viewMode === "project" && clients.length > 0 && (
              <KanbanClientPicker
                clients={clients}
                activeId={clientId}
                onSelect={(id) => {
                  const c = clients.find((x) => x.id === id);
                  setClientId(id);
                  setProjectId(c?.projects[0]?.id ?? "");
                }}
                onDelete={(id) => deleteClient(id)}
              />
            )}
            {viewMode === "pod" && pods.length > 0 && (
              <KanbanPodPicker
                pods={pods}
                activeId={podId}
                onSelect={(id) => setPodId(id)}
              />
            )}

            {/* View mode pill - anchored to the right edge. Stays put
                regardless of mode so eye-position doesn't jolt when
                + Client + the client dropdown appear/disappear. */}
            <div className="inline-flex p-0.5 rounded-full bg-[#222222] border border-[#2A2A2A]">
              {(
                [
                  { v: "project" as const, label: "By project" },
                  { v: "master" as const, label: "All projects" },
                  { v: "pod" as const, label: "By pod" },
                  { v: "results" as const, label: "Results Library" },
                ]
              ).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setViewMode(o.v)}
                  className={`px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-full transition-colors ${
                    viewMode === o.v
                      ? "bg-white text-[#0C0C0C]"
                      : "text-[#71757D] hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Overflow menu - tertiary controls (density, phase rules).
                Sits at the very right edge alongside the view mode pill. */}
            <OverflowMenu
              density={density}
              onSetDensity={setDensity}
              onOpenRules={() => setRulesOpen(true)}
            />
          </div>
        </div>

        {/* Reserve the vertical space owned by the project tabs row in every
            view mode so toggling between project / master / results doesnt
            shift the board up or down. min-h matches ProjectTabsRow height
            plus its mb-5 (one row of pills at py-1.5). */}
        <div className="min-h-[56px]">
          {viewMode === "project" && activeClient && (
            <ProjectTabsRow
              client={activeClient}
              projectId={activeProject?.id ?? ""}
              onSelectProject={(id) => setProjectId(id)}
              onAddProject={addProject}
              onDeleteProject={(pid) => deleteProject(activeClient.id, pid)}
              deliverableCounts={Object.fromEntries(
                activeClient.projects.map((p) => [
                  p.id,
                  p.deliverables.filter((d) => !d.testResult).length,
                ]),
              )}
              pods={pods}
              currentPodId={activeProject?.podId}
              onAssignPod={assignPodToProject}
              hasBrief={!!activeClient.onboardingBrief}
              onPreviewOnboarding={() => setOnboardingPreviewOpen(true)}
            />
          )}

          {viewMode === "master" && (
            <ClientsRow
              clients={clients.map((c) => ({
                clientId: c.id,
                clientName: c.name,
                openCount: c.projects.reduce(
                  (sum, p) =>
                    sum + p.deliverables.filter((d) => !d.testResult).length,
                  0,
                ),
                projectCount: c.projects.length,
              }))}
              onSelectClient={(clientId) => {
                const c = clients.find((x) => x.id === clientId);
                setClientId(clientId);
                setProjectId(c?.projects[0]?.id ?? "");
                setViewMode("project");
              }}
              onDeleteClient={(clientId) => deleteClient(clientId)}
            />
          )}

          {viewMode === "pod" && (
            <PodProjectsRow
              projects={clients.flatMap((c) =>
                c.projects
                  .filter((p) => p.podId === podId)
                  .map((p) => ({
                    clientId: c.id,
                    clientName: c.name,
                    projectId: p.id,
                    projectName: p.name,
                    turnaroundDays: p.turnaroundDays,
                    openCount: p.deliverables.filter((d) => !d.testResult)
                      .length,
                  })),
              )}
              onSelectProject={(clientId, projectId) => {
                setClientId(clientId);
                setProjectId(projectId);
                setViewMode("project");
              }}
            />
          )}

          {viewMode === "results" && (
            <ResultsBankFilters
              outcome={bankOutcome}
              client={bankClient}
              metric={bankMetric}
              clientOptions={clientTabsForBank}
              metricOptions={bankMetricOptions}
              onChangeOutcome={setBankOutcome}
              onChangeClient={setBankClient}
              onChangeMetric={setBankMetric}
            />
          )}
        </div>

        {/* Client picker also lives in the header, but conditionally on
            project mode. To stop the header right-side cluster from reflowing
            when it appears/disappears, the dropdown is reserved as a slot
            below with visibility:hidden in non-project modes (handled in the
            view mode toggle block above). The vertical jolt here was the
            real one. */}

        {viewMode === "results" ? (
          <ResultsBankGrid
            cards={resultCards}
            onOpen={(id) => setActiveId(id)}
          />
        ) : (
          /* Viewport-fit board: columns share one fixed height (the
           * viewport minus the dashboard header + page chrome) so the
           * whole board never makes the page scroll. Each column
           * scrolls its own cards independently. min-h floor keeps it
           * usable on short windows. */
          <div className="h-[calc(100dvh-260px)] min-h-[420px]">
          <BoardColumns
            phases={PREVIEW_PHASES}
            cards={cardsByPhase}
            viewMode={viewMode}
            density={density}
            activeTurnaround={
              viewMode === "project" ? activeProject?.turnaroundDays : undefined
            }
            draggingId={draggingId}
            dragOverCol={dragOverCol}
            addingToPhase={addingToPhase}
            newTitleDraft={newTitleDraft}
            newCategoryDraft={newCategoryDraft}
            newDeliverableCategoryDraft={newDeliverableCategoryDraft}
            onSetDraggingId={setDraggingId}
            onSetDragOverCol={setDragOverCol}
            onMove={moveDeliverable}
            onOpenCard={(id) => setActiveId(id)}
            onSetAddingToPhase={setAddingToPhase}
            onSetNewTitleDraft={setNewTitleDraft}
            onSetNewCategoryDraft={setNewCategoryDraft}
            onSetNewDeliverableCategoryDraft={setNewDeliverableCategoryDraft}
            onAddDeliverable={addDeliverable}
            onUpdate={updateDeliverable}
          />
          </div>
        )}
      </div>

      {rulesOpen && <PhaseRulesModal onClose={() => setRulesOpen(false)} />}

      {addClientOpen && (
        <NewClientModal
          onCancel={() => setAddClientOpen(false)}
          onSave={(name) => {
            addClient(name);
            setAddClientOpen(false);
          }}
        />
      )}

      {confirmPrompt && (
        <DarkConfirm
          title={confirmPrompt.title}
          message={confirmPrompt.message}
          confirmLabel={confirmPrompt.confirmLabel}
          destructive={confirmPrompt.destructive}
          onConfirm={() => {
            confirmPrompt.resolve(true);
            setConfirmPrompt(null);
          }}
          onCancel={() => {
            confirmPrompt.resolve(false);
            setConfirmPrompt(null);
          }}
        />
      )}

      {onboardingPreviewOpen && activeClient?.onboardingBrief && (
        <OnboardingPreviewModal
          brief={activeClient.onboardingBrief}
          clientName={activeClient.name}
          onClose={() => setOnboardingPreviewOpen(false)}
        />
      )}

      {activeDeliverable && (
        <DetailModal
          deliverable={activeDeliverable}
          onClose={() => setActiveId(null)}
          onUpdate={(patch) => updateDeliverable(activeDeliverable.id, patch)}
          onConclude={(r) => concludeTest(activeDeliverable.id, r)}
          onApproveInternal={() =>
            approveInternalRevisions(activeDeliverable.id)
          }
          onRequestRevisions={() =>
            requestRevisionsFromInternal(activeDeliverable.id)
          }
          onUndoApprove={() => undoApproveInternal(activeDeliverable.id)}
          onCompleteTicket={() => completeTicket(activeDeliverable.id)}
          onUncompleteTicket={() => uncompleteTicket(activeDeliverable.id)}
          onResetClientApproval={() =>
            resetClientApproval(activeDeliverable.projectId)
          }
          onApproveQA={() => approveQA(activeDeliverable.id)}
          onKickbackFromQA={() => kickbackFromQA(activeDeliverable.id)}
          onDelete={() => deleteDeliverable(activeDeliverable.id)}
          onSetProjectStartDate={(iso) =>
            setProjectStartDate(activeDeliverable.projectId, iso)
          }
          onSetClientApproval={(iso) =>
            setClientApproval(activeDeliverable.projectId, iso)
          }
          onSetPhase1Deadline={(iso) =>
            setProjectPhase1Deadline(activeDeliverable.projectId, iso)
          }
          onSetPhase2Deadline={(iso) =>
            setProjectPhase2Deadline(activeDeliverable.projectId, iso)
          }
        />
      )}
    </div>
  );
}

/* Master view's equivalent of the project tabs row. Lists every active
 * client with their open deliverable + project counts. Click a pill to
 * drop into the project view of that client (first project selected). */
interface ClientsRowProps {
  clients: {
    clientId: string;
    clientName: string;
    openCount: number;
    projectCount: number;
  }[];
  onSelectClient: (clientId: string) => void;
  onDeleteClient: (clientId: string) => void;
}

function ClientsRow({ clients, onSelectClient, onDeleteClient }: ClientsRowProps) {
  if (clients.length === 0) {
    return (
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[11px] uppercase tracking-wider text-[#4B4D52]">
          No active clients.
        </span>
      </div>
    );
  }
  // overflow-x-auto so a long client list scrolls instead of wrapping
  // vertically (wrap would push the board down and re-introduce the jolt).
  return (
    <div className="flex items-center gap-1.5 mb-5 overflow-x-auto scrollbar-thin pb-1">
      {clients.map((c) => (
        <div
          key={c.clientId}
          className="group inline-flex items-center rounded-full border bg-[#181818] text-[#71757D] border-[#2A2A2A] hover:text-white hover:border-[#383838] transition-colors"
        >
          <button
            onClick={() => onSelectClient(c.clientId)}
            className="pl-3.5 pr-2 py-1.5 text-[12px] font-medium"
            title={`${c.clientName} - ${c.projectCount} project${c.projectCount === 1 ? "" : "s"}`}
          >
            <span>{c.clientName}</span>
            <span className="ml-2 tabular-nums text-[#4B4D52]">{c.openCount}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClient(c.clientId);
            }}
            className="size-6 mr-1 inline-flex items-center justify-center rounded-full text-[#4B4D52] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title={`Delete ${c.clientName}`}
          >
            <XMarkIcon className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* Pod view's equivalent of the project tabs row. Lists every project the
 * active pod is working across (potentially multiple clients), each pill
 * shows the project name with the parent client as a small prefix. Click
 * a pill to drop into the project view of that project. Empty state
 * mirrors the strip height so the board doesnt shift when the pod has no
 * projects yet. */
interface PodProjectsRowProps {
  projects: {
    clientId: string;
    clientName: string;
    projectId: string;
    projectName: string;
    turnaroundDays?: TurnaroundDays;
    openCount: number;
  }[];
  onSelectProject: (clientId: string, projectId: string) => void;
}

function PodProjectsRow({ projects, onSelectProject }: PodProjectsRowProps) {
  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[11px] uppercase tracking-wider text-[#4B4D52]">
          No projects on this pod yet.
        </span>
      </div>
    );
  }
  /* Same single-tab + overflow pattern as ProjectTabsRow. First
   * project shows as a prominent pill; the rest live in a "+N"
   * dropdown to keep the row scannable when a pod has 10+ projects. */
  const [first, ...rest] = projects;
  return (
    <div className="flex items-center gap-1.5 mb-5 min-w-0">
      <button
        onClick={() => onSelectProject(first.clientId, first.projectId)}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium border bg-white text-[#0C0C0C] border-white"
        title={`${first.clientName} · ${first.projectName}`}
      >
        <span className="text-[#0C0C0C]/50">{first.clientName}</span>
        <span className="truncate max-w-[200px]">{first.projectName}</span>
        <span className="tabular-nums text-[#0C0C0C]/50">{first.openCount}</span>
        {first.turnaroundDays && (
          <span className="text-[10px] uppercase tracking-wider text-[#0C0C0C]/60">
            {first.turnaroundDays}d
          </span>
        )}
      </button>
      {rest.length > 0 && (
        <PodProjectsOverflow projects={rest} onSelect={onSelectProject} />
      )}
    </div>
  );
}

/* Dropdown of "other projects on this pod". Same visual language as
 * ProjectOverflow but scoped to pod view + no delete (these projects
 * are owned by clients elsewhere - delete happens from the project
 * view, not the pod view). */
function PodProjectsOverflow({
  projects,
  onSelect,
}: {
  projects: PodProjectsRowProps["projects"];
  onSelect: (clientId: string, projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-full text-[12px] font-medium border bg-[#181818] text-[#9CA3AF] border-[#2A2A2A] hover:text-white hover:border-[#383838] transition-colors"
        title={`${projects.length} more project${projects.length === 1 ? "" : "s"} on this pod`}
      >
        +{projects.length}
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-40 w-80 bg-[#0F0F10] rounded-lg ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#71757D] font-semibold border-b border-white/[0.04]">
            Other projects ({projects.length})
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {projects.map((p) => (
              <li key={p.projectId}>
                <button
                  onClick={() => {
                    onSelect(p.clientId, p.projectId);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#71757D] truncate shrink-0">
                      {p.clientName}
                    </span>
                    <span className="text-[12px] text-[#E5E5EA] truncate flex-1 min-w-0">
                      {p.projectName}
                    </span>
                    <span className="text-[10px] text-[#71757D] tabular-nums shrink-0">
                      {p.openCount}
                    </span>
                    {p.turnaroundDays && (
                      <span className="text-[10px] uppercase tracking-wider text-[#71757D] tabular-nums shrink-0">
                        {p.turnaroundDays}d
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface ProjectTabsRowProps {
  client: MockClient;
  projectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (input: {
    name: string;
    type: ProjectType;
    turnaroundDays?: TurnaroundDays;
    engagementDays?: EngagementDays;
  }) => void;
  onDeleteProject: (projectId: string) => void;
  deliverableCounts: Record<string, number>;
  pods: MockPod[];
  currentPodId: string | undefined;
  onAssignPod: (podId: string) => void;
  // Brief is structured Q&A now (see OnboardingBrief in mock-data); the row
  // just opens the popup. Editing happens upstream in the onboarding flow.
  hasBrief: boolean;
  onPreviewOnboarding: () => void;
}

function ProjectTabsRow(props: ProjectTabsRowProps) {
  const [addingProject, setAddingProject] = useState(false);
  const [draft, setDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState<ProjectType>("build");
  const [turnaroundDraft, setTurnaroundDraft] = useState<TurnaroundDays>(15);
  const [engagementDraft, setEngagementDraft] = useState<EngagementDays>(30);

  function submitNewProject() {
    props.onAddProject({
      name: draft,
      type: typeDraft,
      turnaroundDays: typeDraft === "build" ? turnaroundDraft : undefined,
      engagementDays: typeDraft === "retainer" ? engagementDraft : undefined,
    });
    setDraft("");
    setTypeDraft("build");
    setTurnaroundDraft(15);
    setEngagementDraft(30);
    setAddingProject(false);
  }

  /* Render only the ACTIVE project tab + a "+N" overflow chip that
   * pops a dropdown listing the rest (with per-project delete).
   * Dramatically declutters when a client has 6+ projects. */
  const active = props.client.projects.find((p) => p.id === props.projectId);
  const others = props.client.projects.filter((p) => p.id !== props.projectId);
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-1.5 min-w-0">
        {active && (
          <ActiveProjectTab
            project={active}
            count={props.deliverableCounts[active.id] ?? 0}
            onDelete={() => props.onDeleteProject(active.id)}
          />
        )}
        {others.length > 0 && (
          <ProjectOverflow
            projects={others}
            counts={props.deliverableCounts}
            onSelect={(id) => props.onSelectProject(id)}
            onDelete={(id) => props.onDeleteProject(id)}
          />
        )}
        {/* Legacy map kept gone — only the active tab + overflow render now.
            The block below is the inline "+ New project" form that was
            already here; preserved as the trailing add affordance. */}
        {false && props.client.projects.map((p) => {
          const isActive = p.id === props.projectId;
          const count = props.deliverableCounts[p.id] ?? 0;
          return (
            <button
              key={p.id}
              onClick={() => props.onSelectProject(p.id)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                isActive
                  ? p.type === "retainer"
                    ? "bg-teal-500 text-[#0C0C0C] border-teal-500"
                    : "bg-white text-[#0C0C0C] border-white"
                  : p.type === "retainer"
                    ? "bg-teal-500/10 text-teal-300 border-teal-500/40 hover:text-teal-200 hover:border-teal-400/60"
                    : "bg-[#181818] text-[#71757D] border-[#2A2A2A] hover:text-white hover:border-[#383838]"
              }`}
              title={
                p.type === "retainer" && p.engagementDays
                  ? `Retainer engagement (${p.engagementDays} days)`
                  : p.turnaroundDays
                    ? `Build scoped for a ${p.turnaroundDays}-day turnaround`
                    : undefined
              }
            >
              <span>{p.name}</span>
              <span
                className={`ml-2 tabular-nums ${isActive ? "text-[#0C0C0C]/50" : "text-[#4B4D52]"}`}
              >
                {count}
              </span>
              {(p.turnaroundDays || p.engagementDays) && (
                <span
                  className={`ml-2 text-[10px] tabular-nums uppercase tracking-wider ${
                    isActive
                      ? "text-[#0C0C0C]/60"
                      : p.type === "retainer"
                        ? "text-teal-300/80"
                        : "text-[#E5E5EA]/60"
                  }`}
                >
                  {p.type === "retainer"
                    ? `${p.engagementDays}d retainer`
                    : `${p.turnaroundDays}d`}
                </span>
              )}
            </button>
          );
        })}
        {addingProject ? (
          <div className="flex items-center gap-1.5 rounded-full bg-[#0C0C0C] border border-[#383838] pl-1.5 pr-1.5 py-1">
            {/* Type toggle - Build vs Retainer. Drives which duration toggle
                renders to the right (15/20/25 vs 30/60/90). */}
            <div className="flex items-center gap-0.5 bg-[#181818] rounded-full p-0.5 border border-[#2A2A2A]">
              {(["build", "retainer"] as ProjectType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeDraft(t)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    typeDraft === t
                      ? t === "retainer"
                        ? "bg-teal-500 text-[#0C0C0C]"
                        : "bg-white text-[#0C0C0C]"
                      : "text-[#71757D] hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNewProject();
                if (e.key === "Escape") {
                  setDraft("");
                  setTypeDraft("build");
                  setTurnaroundDraft(15);
                  setEngagementDraft(30);
                  setAddingProject(false);
                }
              }}
              placeholder={
                typeDraft === "retainer" ? "Retainer name" : "Project name"
              }
              className="bg-transparent text-[12px] text-[#E5E5EA] focus:outline-none w-32 placeholder:text-[#4B4D52]"
            />
            <div className="flex items-center gap-0.5 bg-[#181818] rounded-full p-0.5 border border-[#2A2A2A]">
              {typeDraft === "retainer"
                ? ENGAGEMENT_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEngagementDraft(t)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                        engagementDraft === t
                          ? "bg-teal-500 text-[#0C0C0C]"
                          : "text-[#71757D] hover:text-white"
                      }`}
                      title={`${ENGAGEMENT_TIER_LABEL[t]} retainer (${t}-day cadence)`}
                    >
                      {ENGAGEMENT_TIER_SHORT[t]}
                    </button>
                  ))
                : TURNAROUND_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTurnaroundDraft(t)}
                      className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider tabular-nums transition-colors ${
                        turnaroundDraft === t
                          ? "bg-white text-[#0C0C0C]"
                          : "text-[#71757D] hover:text-white"
                      }`}
                      title={`${t}-day turnaround`}
                    >
                      {t}d
                    </button>
                  ))}
            </div>
            <button
              onClick={submitNewProject}
              className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white px-2"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingProject(true)}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-medium bg-transparent text-[#71757D] border border-dashed border-[#2A2A2A] hover:text-white hover:border-[#383838] inline-flex items-center gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            New project
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Custom-styled pod-assignment dropdown (was the native select
         * popover which looked out of place against the rest of the
         * dark dashboard). */}
        <ProjectPodPicker
          pods={props.pods}
          currentPodId={props.currentPodId}
          onAssign={props.onAssignPod}
        />

        {props.hasBrief ? (
          <button
            onClick={props.onPreviewOnboarding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] hover:border-[#383838] hover:text-white transition-colors"
            title="Open the client's onboarding brief"
          >
            Onboarding brief
          </button>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-transparent text-[#4B4D52] border border-dashed border-[#2A2A2A] cursor-default"
            title="Brief lands here once the client completes onboarding"
          >
            No brief yet
          </span>
        )}
      </div>
    </div>
  );
}

interface BoardColumnsProps {
  phases: typeof PREVIEW_PHASES;
  cards: Record<PreviewPhase, ContextDeliverable[]>;
  viewMode: ViewMode;
  density: "cosy" | "glance";
  // Turnaround of the active project; only set in project mode (master / pod
  // / results mix projects with different turnarounds so the column header
  // falls back to the baseline expectation). Undefined treated as default 15.
  activeTurnaround?: TurnaroundDays;
  draggingId: string | null;
  dragOverCol: PreviewPhase | null;
  addingToPhase: PreviewPhase | null;
  newTitleDraft: string;
  newCategoryDraft: TicketCategory;
  newDeliverableCategoryDraft: string;
  onSetDraggingId: (v: string | null) => void;
  onSetDragOverCol: (v: PreviewPhase | null) => void;
  onMove: (id: string, phase: PreviewPhase) => void;
  onOpenCard: (id: string) => void;
  onSetAddingToPhase: (v: PreviewPhase | null) => void;
  onSetNewTitleDraft: (v: string) => void;
  onSetNewCategoryDraft: (v: TicketCategory) => void;
  onSetNewDeliverableCategoryDraft: (v: string) => void;
  onAddDeliverable: (
    phase: PreviewPhase,
    title: string,
    category?: string,
  ) => void;
  onUpdate: (id: string, patch: Partial<MockDeliverable>) => void;
}

function BoardColumns(props: BoardColumnsProps) {
  // Close the inline add form when the user clicks anywhere outside it. The
  // form wrappers tag themselves with data-add-form so the handler can do a
  // single closest() check instead of carrying refs per column.
  const { addingToPhase, onSetAddingToPhase, onSetNewTitleDraft } = props;
  useEffect(() => {
    if (addingToPhase === null) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-add-form="true"]')) {
        onSetAddingToPhase(null);
        onSetNewTitleDraft("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [addingToPhase, onSetAddingToPhase, onSetNewTitleDraft]);

  return (
    <div className="grid gap-3 grid-flow-col auto-cols-[minmax(280px,1fr)] overflow-x-auto pb-2 h-full">
      {props.phases.map((phase) => {
        const cards = props.cards[phase.value] ?? [];
        const isDropTarget =
          props.dragOverCol === phase.value && props.draggingId !== null;
        // Scale the column header expectation to the active project's
        // turnaround. Master / pod / results modes mix projects, so fall
        // back to the baseline.
        const expected =
          props.viewMode === "project"
            ? formatScaledExpected(phase.value, props.activeTurnaround)
            : formatExpected(phase.value);

        return (
          <div
            key={phase.value}
            onDragOver={(e) => {
              if (!props.draggingId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (props.dragOverCol !== phase.value)
                props.onSetDragOverCol(phase.value);
            }}
            onDragLeave={(e: DragEvent<HTMLDivElement>) => {
              const related = e.relatedTarget as Node | null;
              if (
                !related ||
                !(e.currentTarget as Node).contains(related)
              ) {
                if (props.dragOverCol === phase.value)
                  props.onSetDragOverCol(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id =
                e.dataTransfer.getData("text/plain") || props.draggingId;
              if (id) props.onMove(id, phase.value);
              props.onSetDragOverCol(null);
              props.onSetDraggingId(null);
            }}
            className={`rounded-xl flex flex-col transition-colors h-full overflow-hidden ${
              isDropTarget
                ? "bg-[#222222] border-2 border-dashed border-[#9CA3AF]"
                : "bg-[#181818] border border-[#2A2A2A]"
            }`}
          >
            <div className="px-3 py-3 border-b border-[#2A2A2A] shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="shrink-0 size-2 rounded-full"
                    style={{ background: phase.color }}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#E5E5EA] truncate">
                    {phase.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-medium text-[#71757D] tabular-nums">
                    {cards.length}
                  </span>
                  {/* Quick-add: only in project mode (the add input
                   * below is gated on project mode too). Click → opens
                   * the inline form at the bottom of THIS column. */}
                  {props.viewMode === "project" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onSetAddingToPhase(phase.value);
                        props.onSetNewTitleDraft("");
                        /* Scroll the add form into view since the
                         * column body now scrolls independently. */
                        window.setTimeout(() => {
                          const form = document.querySelector<HTMLElement>(
                            `[data-add-form-phase="${phase.value}"]`,
                          );
                          form?.scrollIntoView({ behavior: "smooth", block: "end" });
                        }, 50);
                      }}
                      className="size-5 inline-flex items-center justify-center rounded-md text-[#71757D] hover:text-[#E5E5EA] hover:bg-white/[0.06] transition-colors"
                      title={`Add card to ${phase.label}`}
                    >
                      <PlusIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {/* Always render the expected line so column header heights
                  match. Not Started has no SLA; render an invisible spacer
                  so the bottom border lines up across every column. */}
              <p
                className={`mt-1 text-[10px] tabular-nums ${
                  expected ? "text-[#4B4D52]" : "invisible select-none"
                }`}
                aria-hidden={!expected}
              >
                {expected || "placeholder"}
              </p>
            </div>

            <div className={`${props.density === "glance" ? "p-1 space-y-1" : "p-2 space-y-2"} flex-1 min-h-0 overflow-y-auto scrollbar-thin`}>
              {cards.length === 0 ? (
                <p className="text-[11px] text-[#4B4D52] text-center py-6">
                  -
                </p>
              ) : (
                cards.map((d) => (
                  <Card
                    key={d.id}
                    deliverable={d}
                    viewMode={props.viewMode}
                    density={props.density}
                    isDragging={props.draggingId === d.id}
                    onDragStart={() => props.onSetDraggingId(d.id)}
                    onDragEnd={() => {
                      props.onSetDraggingId(null);
                      props.onSetDragOverCol(null);
                    }}
                    onOpen={() => props.onOpenCard(d.id)}
                    onUpdate={(patch) => props.onUpdate(d.id, patch)}
                  />
                ))
              )}

              {props.viewMode === "project" && (
                <div className="pt-1" data-add-form-phase={phase.value}>
                  {props.addingToPhase === phase.value ? (
                    phase.value === "tickets" ? (
                      // Category picker + title input, only on the Tickets
                      // column. Other phases get the plain title input below.
                      <div className="flex flex-col gap-1.5 rounded-md bg-[#0C0C0C] border border-[#383838] p-1.5" data-add-form="true">
                        <div className="flex items-center gap-1">
                          {TICKET_CATEGORIES.map((c) => {
                            const Icon = c.icon;
                            const active =
                              props.newCategoryDraft === c.value;
                            return (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() =>
                                  props.onSetNewCategoryDraft(c.value)
                                }
                                className={`flex-1 inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                                  active
                                    ? "bg-white text-[#0C0C0C]"
                                    : `${c.tone} hover:bg-[#181818]`
                                }`}
                              >
                                <Icon className="size-3" />
                                {c.label}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          autoFocus
                          value={props.newTitleDraft}
                          onChange={(e) =>
                            props.onSetNewTitleDraft(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              props.onAddDeliverable(
                                phase.value,
                                props.newTitleDraft,
                                props.newCategoryDraft,
                              );
                            }
                            if (e.key === "Escape") {
                              props.onSetNewTitleDraft("");
                              props.onSetAddingToPhase(null);
                            }
                          }}
                          placeholder={`New ${props.newCategoryDraft}`}
                          className="w-full px-2 py-1 rounded text-[12px] bg-transparent text-[#E5E5EA] focus:outline-none placeholder:text-[#4B4D52]"
                        />
                      </div>
                    ) : (
                      // Non-tickets columns: deliverable category select +
                      // title input. Category is optional - blank just means
                      // an uncategorised card.
                      <div className="flex flex-col gap-1.5 rounded-md bg-[#0C0C0C] border border-[#383838] p-1.5" data-add-form="true">
                        <div className="relative">
                          <select
                            value={props.newDeliverableCategoryDraft}
                            onChange={(e) =>
                              props.onSetNewDeliverableCategoryDraft(
                                e.target.value,
                              )
                            }
                            className="appearance-none w-full px-2 pr-7 py-1 rounded text-[11px] font-semibold uppercase tracking-wider bg-transparent text-[#E5E5EA] border border-[#2A2A2A] focus:outline-none focus:border-[#383838] cursor-pointer"
                          >
                            <option value="">No category</option>
                            {DELIVERABLE_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <ChevronDownIcon className="size-3 text-[#71757D] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <input
                          autoFocus
                          value={props.newTitleDraft}
                          onChange={(e) =>
                            props.onSetNewTitleDraft(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              props.onAddDeliverable(
                                phase.value,
                                props.newTitleDraft,
                                props.newDeliverableCategoryDraft || undefined,
                              );
                            }
                            if (e.key === "Escape") {
                              props.onSetNewTitleDraft("");
                              props.onSetAddingToPhase(null);
                            }
                          }}
                          placeholder={
                            props.newDeliverableCategoryDraft
                              ? `New ${props.newDeliverableCategoryDraft}`
                              : "New deliverable"
                          }
                          className="w-full px-2 py-1 rounded text-[12px] bg-transparent text-[#E5E5EA] focus:outline-none placeholder:text-[#4B4D52]"
                        />
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => props.onSetAddingToPhase(phase.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-[11px] font-medium text-[#71757D] hover:text-white hover:bg-[#222222] inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <PlusIcon className="size-3.5" />
                      Add
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface CardProps {
  deliverable: ContextDeliverable;
  viewMode: ViewMode;
  density: "cosy" | "glance";
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onUpdate: (patch: Partial<MockDeliverable>) => void;
}

function Card({
  deliverable: d,
  viewMode,
  density,
  isDragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onUpdate,
}: CardProps) {
  const categoryLower = d.category?.toLowerCase();
  const categoryMeta = TICKET_CATEGORIES.find((c) => c.value === categoryLower);
  // Status engine layers (first match wins):
  // 1. Tickets - per-category SLAs (Ticket 48h, Bug 24h, Fire ASAP)
  // 2. Documents - dated by each card's own dueDate (retainer reports)
  // 3. External Revisions - 48h client clock anchored to sentToClientAt
  // 4. Phase 1 / Phase 2 build phases - dated by project startDate +
  //    clientApprovedAt + phase budgets
  // 5. Fallback - legacy time-in-phase scaled by turnaround
  const dated =
    d.projectType === "build"
      ? deadlineStatus(
          d.phase,
          {
            type: d.projectType,
            turnaroundDays: d.turnaroundDays,
            startDate: d.projectStartDate,
            clientApprovedAt: d.projectClientApprovedAt,
            phase1Deadline: d.projectPhase1Deadline,
            phase2Deadline: d.projectPhase2Deadline,
          },
          MOCK_TODAY,
        )
      : null;
  /* Per-card dueDate takes top priority - if the card has an explicit
   * due date, the colour reflects that against today's clock per
   * Dylan's rule: today<due=green, today===due=amber, today>due=red.
   * Falls through to the phase-specific engine below when no dueDate
   * is set. */
  const cardDueStatus: StuckStatus | null = d.dueDate
    ? (() => {
        const cmp = MOCK_TODAY.localeCompare(d.dueDate);
        if (cmp < 0) return "on-track";
        if (cmp === 0) return "approaching";
        return "stuck";
      })()
    : null;
  const status: StuckStatus =
    cardDueStatus ??
    (d.phase === "tickets" && categoryMeta
      ? ticketCategoryStatus(
          categoryMeta.value,
          d.phaseHistory?.[d.phaseHistory.length - 1]?.enteredAt,
          MOCK_TODAY,
        )
      : d.phase === "documents"
        ? documentsStatus(d.dueDate, MOCK_TODAY) ?? "on-track"
        : d.phase === "external-revisions"
          ? externalReviewStatus(d.sentToClientAt, MOCK_TODAY) ?? "on-track"
          : dated ?? scaledStatus(d.phase, d.hoursInPhase, d.turnaroundDays));
  const live = d.phase === "launch-testing" && d.liveStartedAt && !d.testResult;
  // Approved-internally cards stay in Internal Revisions and read GREEN so
  // the primary designer knows it's signed off and needs sending to the
  // client. Once moved to External Rev (sent), green clears.
  const approved = d.phase === "internal-revisions" && !!d.approvedAt;
  const style = live || approved ? LIVE_STYLE : STUCK_STYLES[status];
  const rounds = revisionRoundCount(d.phaseHistory);
  const limbo = limboStatusFor(rounds);
  const ready =
    d.phase === "launch-testing" && !d.liveStartedAt && !d.testResult;
  const daysLive = live ? daysBetween(d.liveStartedAt!) : 0;
  const needsConclude = live && daysLive >= CONCLUDE_PROMPT_DAYS;
  const needsInterim =
    live &&
    daysLive >= INTERIM_NUDGE_DAYS &&
    !(d.metrics ?? []).some(isMetricLogged);

  const headerLabel =
    viewMode === "master" ? d.clientName : d.category ?? d.projectName;
  const subhead =
    viewMode === "master"
      ? `${d.projectName}${d.category ? ` · ${d.category}` : ""}`
      : null;

  const role = activeAssigneeFor(d.phase, {
    designer: d.designer,
    secondaryDesigner: d.secondaryDesigner,
    developer: d.developer,
    secondaryDeveloper: d.secondaryDeveloper,
  });

  /* Glance mode short-circuit: cards collapse to a thin bar that
   * preserves the status colour (the whole point - admin can scan
   * the column for amber/reds in one look). Click to open the
   * full card; drag still works. Falls through to the full card
   * render below for cosy. */
  if (density === "glance") {
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", d.id);
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        className={`flex items-center gap-2 pl-2 pr-2 py-1.5 border rounded ${style.ring} ${style.bg} cursor-grab active:cursor-grabbing hover:border-[#383838] transition-all ${
          isDragging ? "opacity-40 scale-[0.98]" : ""
        }`}
        title={`${d.title}${role ? ` · ${role}` : ""}`}
      >
        {categoryMeta && (
          <categoryMeta.icon className={`size-3 shrink-0 ${categoryMeta.tone}`} />
        )}
        {d.projectType === "retainer" && (
          <StarSolid
            className="size-3 shrink-0 text-amber-400"
            title="Retainer (priority)"
          />
        )}
        <span className="text-[12px] text-[#E5E5EA] truncate flex-1 min-w-0">
          {d.title}
        </span>
        {(needsConclude || needsInterim || limbo) && (
          <span
            className="size-1.5 rounded-full shrink-0"
            style={{
              background: needsConclude
                ? "#F97066"
                : needsInterim
                  ? "#F5A623"
                  : "#5B8DEF",
            }}
            aria-label={needsConclude ? "Conclude" : needsInterim ? "Interim due" : "Many rounds"}
          />
        )}
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", d.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`p-3 border rounded-lg ${style.ring} ${style.bg} cursor-grab active:cursor-grabbing hover:border-[#383838] transition-all ${
        isDragging ? "opacity-40 scale-[0.98]" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {categoryMeta && (
            <categoryMeta.icon
              className={`size-3.5 shrink-0 ${categoryMeta.tone}`}
              title={categoryMeta.label}
            />
          )}
          {d.projectType === "retainer" && (
            <StarSolid
              className="size-3.5 shrink-0 text-amber-400"
              title="Retainer (priority)"
            />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#E5E5EA] truncate">
            {headerLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {d.revisionRequested && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-rose-500/15 text-rose-400"
              title="Bounced back; needs revisions"
            >
              <ArrowUturnLeftIcon className="size-2.5" />
              Revisions
            </span>
          )}
          {limbo !== "none" && (
            <span
              className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${
                limbo === "limbo"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}
            >
              R{rounds}
            </span>
          )}
          {ready && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-[#A78BFA]/15 text-[#A78BFA]">
              Ready
            </span>
          )}
          {live && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-emerald-500/15 text-emerald-400">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full size-1.5 bg-emerald-400" />
              </span>
              Live
            </span>
          )}
          {needsConclude && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-500/15 text-amber-400">
              Conclude
            </span>
          )}
          {needsInterim && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-[#0EA5E9]/15 text-[#0EA5E9]">
              Log result
            </span>
          )}
        </div>
      </div>

      {subhead && (
        <p className="text-[10px] text-[#71757D] truncate mb-1.5">{subhead}</p>
      )}

      <p className="text-[14px] font-semibold leading-tight text-[#E5E5EA]">
        {d.title}
      </p>

      {/* Set Live + Conclude controls live inside the detail modal now (the
          Test setup section). Card stays a quiet display surface; the badges
          in the header strip (Ready / Live / Conclude / Log result) signal
          what the strategist needs to act on. */}

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-[#9CA3AF] truncate min-w-0">
          {d.phase === "launch-testing" ? (
            <>
              {LAUNCH_TESTING_TESTER}
              <span className="text-[#4B4D52] mx-1">·</span>
              {LAUNCH_TESTING_DEV}
            </>
          ) : d.phase === "strategy" ? (
            <>{STRATEGY_OWNER}</>
          ) : approved ? (
            // Approved-in-internal-rev cards flip to the primary designer -
            // they own the "send it to the client" action.
            <>{d.designer || role.name}</>
          ) : (
            <>
              {role.name}
              {role.isSecondary && (
                <span className="text-[#4B4D52] ml-1">(2nd)</span>
              )}
            </>
          )}
        </span>
        <span className={`tabular-nums font-medium shrink-0 ${style.accent}`}>
          {(() => {
            // Documents column has per-card dueDates from the retainer
            // preload (or manual override on builds).
            if (d.phase === "documents" && d.dueDate)
              return formatShortDate(d.dueDate);
            // External Rev shows the 48h client clock target.
            if (d.phase === "external-revisions" && d.sentToClientAt)
              return formatShortDate(
                addCalendarDays(d.sentToClientAt, EXT_REV_EXPECTED_DAYS),
              );
            // Builds use the project-derived phase due date everywhere else.
            const due =
              d.projectType === "build"
                ? phaseInternalDueDate(d.phase, {
                    type: d.projectType,
                    turnaroundDays: d.turnaroundDays,
                    startDate: d.projectStartDate,
                    clientApprovedAt: d.projectClientApprovedAt,
                  })
                : null;
            if (due) return formatShortDate(due);
            // Last fallback - per-card dueDate (legacy / manual override),
            // then a TBD if there's literally no date anchor anywhere.
            if (d.dueDate) return formatShortDate(d.dueDate);
            if (d.phase === "not-started") return "TBD";
            return formatHours(d.hoursInPhase);
          })()}
        </span>
      </div>
    </div>
  );
}

interface ResultsBankFiltersProps {
  outcome: TestOutcome | "all";
  client: string;
  metric: string;
  clientOptions: { id: string; name: string }[];
  metricOptions: string[];
  onChangeOutcome: (v: TestOutcome | "all") => void;
  onChangeClient: (v: string) => void;
  onChangeMetric: (v: string) => void;
}

function ResultsBankFilters(props: ResultsBankFiltersProps) {
  const outcomes: { v: TestOutcome | "all"; label: string }[] = [
    { v: "all", label: "All" },
    { v: "winner", label: "Winners" },
    { v: "loser", label: "Losers" },
    { v: "inconclusive", label: "Inconclusive" },
    { v: "shipped", label: "Shipped" },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap mb-5">
      <div className="inline-flex p-0.5 rounded-full bg-[#222222] border border-[#2A2A2A]">
        {outcomes.map((o) => (
          <button
            key={o.v}
            onClick={() => props.onChangeOutcome(o.v)}
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-full transition-colors ${
              props.outcome === o.v
                ? "bg-white text-[#0C0C0C]"
                : "text-[#71757D] hover:text-white"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <select
          value={props.client}
          onChange={(e) => props.onChangeClient(e.target.value)}
          className="appearance-none text-sm font-medium pl-3 pr-9 py-2 bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] rounded-full focus:outline-none focus:border-[#383838]"
        >
          <option value="all">All clients</option>
          {props.clientOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="size-3.5 text-[#71757D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {props.metricOptions.length > 0 && (
        <div className="relative">
          <select
            value={props.metric}
            onChange={(e) => props.onChangeMetric(e.target.value)}
            className="appearance-none text-sm font-medium pl-3 pr-9 py-2 bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] rounded-full focus:outline-none focus:border-[#383838]"
          >
            <option value="all">All metrics</option>
            {props.metricOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="size-3.5 text-[#71757D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}
    </div>
  );
}

interface ResultsBankGridProps {
  cards: ContextDeliverable[];
  onOpen: (id: string) => void;
}

function ResultsBankGrid({ cards, onOpen }: ResultsBankGridProps) {
  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#181818] px-6 py-16 text-center">
        <p className="text-sm font-semibold text-[#E5E5EA]">No tests yet</p>
        <p className="mt-1 text-xs text-[#71757D]">
          Conclude a launch-testing deliverable to build the bank.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
      {cards.map((d) => {
        const r = d.testResult!;
        const meta = OUTCOME_META[r.outcome];
        return (
          <button
            key={d.id}
            onClick={() => onOpen(d.id)}
            className="text-left p-4 rounded-xl border border-[#2A2A2A] bg-[#181818] hover:border-[#383838] hover:bg-[#1E1E1E] transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71757D] truncate">
                {d.clientName} · {d.projectName}
              </span>
              <span
                className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded shrink-0"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>
            </div>
            <p className="text-[14px] font-semibold text-[#E5E5EA] leading-tight">
              {d.title}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <p className="text-[#4B4D52] uppercase tracking-wider text-[9px] font-bold">
                  Metric
                </p>
                <p className="mt-0.5 text-[#E5E5EA] truncate">
                  {r.metric ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-[#4B4D52] uppercase tracking-wider text-[9px] font-bold">
                  Uplift
                </p>
                <p
                  className={`mt-0.5 tabular-nums font-semibold ${
                    r.upliftPct == null
                      ? "text-[#71757D]"
                      : r.upliftPct > 0
                        ? "text-emerald-400"
                        : r.upliftPct < 0
                          ? "text-red-400"
                          : "text-[#E5E5EA]"
                  }`}
                >
                  {r.upliftPct == null
                    ? "-"
                    : `${r.upliftPct > 0 ? "+" : ""}${r.upliftPct}%`}
                </p>
              </div>
              <div>
                <p className="text-[#4B4D52] uppercase tracking-wider text-[9px] font-bold">
                  Confidence
                </p>
                <p className="mt-0.5 text-[#E5E5EA] tabular-nums">
                  {r.confidencePct != null ? `${r.confidencePct}%` : "-"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#71757D]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="size-3" />
                {formatDueDate(r.concludedAt)}
              </span>
              {r.durationDays != null && (
                <span className="tabular-nums">{r.durationDays}d run</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* Onboarding brief popup. Renders the client's structured Q&A from their
 * onboarding submission - grouped by section (Brand, Voice, Audience,
 * Goals, Risks) so the strategist can scan the brand context without
 * leaving the kanban. Dark backdrop + close-on-backdrop pattern matches
 * the detail modal. */
function OnboardingPreviewModal({
  brief,
  clientName,
  onClose,
}: {
  brief: OnboardingBrief;
  clientName: string;
  onClose: () => void;
}) {
  const sections: { title: string; items: { label: string; value?: string }[] }[] =
    [
      {
        title: "Brand & access",
        items: [
          { label: "Website", value: brief.websiteUrl },
          { label: "Shopify store", value: brief.shopifyUrl },
          { label: "Primary contact", value: brief.primaryContact },
          { label: "Timezone", value: brief.timezone },
        ],
      },
      {
        title: "Goals",
        items: [
          { label: "Primary goal", value: brief.primaryGoal },
          { label: "Success metric", value: brief.successMetric },
          { label: "Timeline", value: brief.timelineExpectation },
        ],
      },
      {
        title: "Voice & messaging",
        items: [
          { label: "Tone of voice", value: brief.toneOfVoice },
          { label: "Words to avoid", value: brief.wordsToAvoid },
          { label: "USPs", value: brief.usps },
          { label: "Value props", value: brief.valueProps },
        ],
      },
      {
        title: "Audience & competition",
        items: [
          { label: "Target customer", value: brief.targetCustomer },
          { label: "Competitors", value: brief.competitors },
        ],
      },
      {
        title: "Risks & notes",
        items: [
          { label: "Conversion challenges", value: brief.challenges },
          { label: "Additional notes", value: brief.notes },
        ],
      },
    ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] rounded-xl border border-[#2A2A2A] bg-[#0C0C0C] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#2A2A2A] shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71757D]">
              Onboarding brief
            </p>
            <p className="text-sm font-medium text-[#E5E5EA] truncate">
              {clientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 inline-flex items-center justify-center rounded-full text-[#71757D] hover:text-white hover:bg-[#181818] transition-colors"
            aria-label="Close brief"
          >
            <XMarkIcon className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-7">
          {sections.map((section) => {
            const populated = section.items.filter((i) => i.value?.trim());
            if (populated.length === 0) return null;
            return (
              <section key={section.title}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71757D] mb-3">
                  {section.title}
                </h3>
                <dl className="space-y-3">
                  {populated.map((item) => (
                    <div key={item.label}>
                      <dt className="text-[11px] font-medium uppercase tracking-wider text-[#71757D] mb-0.5">
                        {item.label}
                      </dt>
                      <dd className="text-sm text-[#E5E5EA] whitespace-pre-wrap leading-relaxed">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* Custom dark confirm modal. Promise-based via confirmAction at the page
 * level. Replaces window.confirm for the destructive actions (delete card,
 * overwrite pod assignees). */
function DarkConfirm({
  title,
  message,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#0C0C0C] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      >
        <h3 className="text-base font-semibold text-[#E5E5EA] mb-2">{title}</h3>
        <p className="text-sm text-[#9CA3AF] leading-relaxed mb-5">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              destructive
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : "bg-white text-[#0C0C0C] hover:bg-[#E5E5EA]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhaseRulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-[#0C0C0C] border border-[#2A2A2A] p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#71757D]">
              Mission Control
            </p>
            <h2 className="text-xl font-bold text-[#E5E5EA] mt-1">
              Phase rules
            </h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-[#181818] border border-[#2A2A2A] text-[#71757D] hover:text-white flex items-center justify-center"
          >
            <XMarkIcon className="size-4" />
          </button>
        </div>

        <p className="text-sm text-[#9CA3AF] mb-4">
          Expected vs stuck thresholds are measured in UK working hours (Mon-Fri,
          9-5 Europe/London, excl bank holidays). 1 day = {WORKING_HOURS_PER_DAY}{" "}
          working hours.
        </p>

        <div className="rounded-lg border border-[#2A2A2A] divide-y divide-[#2A2A2A]">
          <div className="grid grid-cols-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#71757D]">
            <span>Phase</span>
            <span className="text-right">Expected (internal)</span>
            <span className="text-right">Stuck (client-facing)</span>
          </div>
          {PREVIEW_PHASES.map((p) => {
            const t = PREVIEW_THRESHOLDS[p.value];
            return (
              <div
                key={p.value}
                className="grid grid-cols-3 px-4 py-2.5 text-[12px]"
              >
                <span className="inline-flex items-center gap-2 text-[#E5E5EA]">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: p.color }}
                  />
                  {p.label}
                </span>
                <span className="text-right tabular-nums text-[#9CA3AF]">
                  {t.expectedHours === 0 ? "-" : formatHours(t.expectedHours)}
                </span>
                <span className="text-right tabular-nums text-[#9CA3AF]">
                  {t.stuckHours === 0 ? "-" : formatHours(t.stuckHours)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
          <div className="rounded-lg border border-[#2A2A2A] bg-[#181818] p-3">
            <p className="font-bold uppercase tracking-wider text-[10px] text-[#71757D]">
              On track
            </p>
            <p className="mt-1 text-[#9CA3AF]">
              Below the internal deadline. Neutral border.
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="font-bold uppercase tracking-wider text-[10px] text-amber-400">
              Approaching
            </p>
            <p className="mt-1 text-[#9CA3AF]">
              Past internal deadline, before the client knows. Window to unblock.
            </p>
          </div>
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3">
            <p className="font-bold uppercase tracking-wider text-[10px] text-red-400">
              Stuck
            </p>
            <p className="mt-1 text-[#9CA3AF]">
              Past the client-facing deadline. Surface and escalate.
            </p>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-[#71757D]">
          Limbo / revision-round badges fire at R3 (heating) and R4+ (limbo) by
          counting how many times a deliverable has bounced through
          internal-revisions or external-revisions.
        </p>
      </div>
    </div>
  );
}

/* Custom dark-themed date picker. Replaces the native input which always
 * leaked browser-default chrome. Trigger button shows the formatted date or
 * a placeholder; click opens a popover with a calendar grid. Mon-Sun week,
 * keyboard-less navigation via prev/next month arrows + Today shortcut. */
function DarkDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewYM, setViewYM] = useState(() => {
    const anchor = value ?? MOCK_TODAY;
    const [y, m] = anchor.split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // Viewport-absolute coords for the popover. Populated when the trigger
  // opens so the popover (rendered via portal) can position itself relative
  // to the trigger's actual location, regardless of any overflow-clipping
  // scroll containers between them.
  const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  // Recompute popover position from trigger rect. Called on open + on
  // scroll/resize while open so the popover follows the trigger.
  function reposition() {
    const trigger = wrapRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const POP_WIDTH = 288; // w-72
    const POP_HEIGHT = 340; // approx
    const margin = 8;
    let top = r.bottom + margin;
    let left = r.left;
    // Flip above if not enough room below
    if (top + POP_HEIGHT > window.innerHeight && r.top - margin > POP_HEIGHT) {
      top = r.top - POP_HEIGHT - margin;
    }
    // Clamp horizontally so the popover never escapes the viewport
    if (left + POP_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - POP_WIDTH - 8;
    }
    if (left < 8) left = 8;
    setPopPos({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    reposition();
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScrollOrResize() {
      reposition();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  const today = MOCK_TODAY;
  const monthLabel = new Date(Date.UTC(viewYM.year, viewYM.month, 1))
    .toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  const firstDay = new Date(Date.UTC(viewYM.year, viewYM.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(viewYM.year, viewYM.month + 1, 0))
    .getUTCDate();
  const startOffset = (firstDay + 6) % 7; // UK week starts Monday
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function pickDay(day: number) {
    const iso = `${viewYM.year}-${String(viewYM.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    setViewYM((v) => {
      const next = new Date(Date.UTC(v.year, v.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  return (
    <div ref={wrapRef} className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#181818] border border-[#2A2A2A] hover:border-[#383838] text-sm transition-colors"
      >
        <CalendarIcon className="size-4 text-[#71757D] shrink-0" />
        <span
          className={`flex-1 text-left tabular-nums ${
            value ? "text-[#E5E5EA]" : "text-[#4B4D52]"
          }`}
        >
          {value ? formatDueDate(value) : placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                onChange(undefined);
              }
            }}
            className="text-[#4B4D52] hover:text-[#9CA3AF] transition-colors shrink-0 cursor-pointer"
            aria-label="Clear date"
          >
            <XMarkIcon className="size-3.5" />
          </span>
        )}
      </button>
      {open && popPos && typeof document !== "undefined" &&
        createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", top: popPos.top, left: popPos.left }}
          className="z-[60] w-72 rounded-xl border border-[#2A2A2A] bg-[#0C0C0C] shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="size-7 inline-flex items-center justify-center rounded-md text-[#71757D] hover:text-[#E5E5EA] hover:bg-[#181818] transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="size-3.5" />
            </button>
            <span className="text-sm font-semibold text-[#E5E5EA] tabular-nums">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="size-7 inline-flex items-center justify-center rounded-md text-[#71757D] hover:text-[#E5E5EA] hover:bg-[#181818] transition-colors"
              aria-label="Next month"
            >
              <ChevronRightIcon className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div
                key={d}
                className="text-[10px] uppercase tracking-wider text-[#4B4D52] text-center py-1"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={i} className="size-8" />;
              const iso = `${viewYM.year}-${String(viewYM.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSelected = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={`size-8 inline-flex items-center justify-center rounded-md text-[12px] tabular-nums transition-colors ${
                    isSelected
                      ? "bg-white text-[#0C0C0C] font-semibold"
                      : isToday
                        ? "bg-[#181818] text-[#E5E5EA] ring-1 ring-[#383838] hover:bg-[#222222]"
                        : "text-[#9CA3AF] hover:bg-[#181818] hover:text-white"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onChange(today);
                const [y, m] = today.split("-").map(Number);
                setViewYM({ year: y, month: m - 1 });
                setOpen(false);
              }}
              className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-rose-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

interface DetailModalProps {
  deliverable: ContextDeliverable;
  onClose: () => void;
  onUpdate: (patch: Partial<MockDeliverable>) => void;
  onConclude: (result: TestResult) => void;
  onApproveInternal: () => void;
  onRequestRevisions: () => void;
  onUndoApprove: () => void;
  onCompleteTicket: () => void;
  onUncompleteTicket: () => void;
  onResetClientApproval: () => void;
  onApproveQA: () => void;
  onKickbackFromQA: () => void;
  onDelete: () => void;
  onSetProjectStartDate: (iso: string | undefined) => void;
  onSetClientApproval: (iso: string | undefined) => void;
  onSetPhase1Deadline: (iso: string | undefined) => void;
  onSetPhase2Deadline: (iso: string | undefined) => void;
}

function DetailModal({
  deliverable: d,
  onClose,
  onUpdate,
  onConclude,
  onApproveInternal,
  onRequestRevisions,
  onUndoApprove,
  onCompleteTicket,
  onUncompleteTicket,
  onResetClientApproval,
  onApproveQA,
  onKickbackFromQA,
  onDelete,
  onSetProjectStartDate,
  onSetClientApproval,
  onSetPhase1Deadline,
  onSetPhase2Deadline,
}: DetailModalProps) {
  const status = statusForHoursInPhase(d.phase, d.hoursInPhase);
  const style = STUCK_STYLES[status];
  const rounds = revisionRoundCount(d.phaseHistory);
  const calDays = calendarDaysInCurrentPhase(d.phaseHistory);
  const live = d.phase === "launch-testing" && d.liveStartedAt && !d.testResult;
  const daysLive = live ? daysBetween(d.liveStartedAt!) : 0;
  const needsConclude = live && daysLive >= CONCLUDE_PROMPT_DAYS;
  const needsInterim =
    live &&
    daysLive >= INTERIM_NUDGE_DAYS &&
    !(d.metrics ?? []).some(isMetricLogged);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // First-row metric is treated as the primary for conclude-time defaults.
  const primaryMetric = (d.metrics ?? [])[0];
  const primaryInterimNumber = primaryMetric?.interim
    ? parseFloat(primaryMetric.interim.replace(/[^-0-9.]/g, ""))
    : NaN;

  const [concluding, setConcluding] = useState(false);
  const [outcomeDraft, setOutcomeDraft] = useState<TestOutcome>("winner");
  const [metricDraft, setMetricDraft] = useState<string>(
    primaryMetric?.name ?? "",
  );
  const [upliftDraft, setUpliftDraft] = useState<string>(
    Number.isFinite(primaryInterimNumber) ? String(primaryInterimNumber) : "",
  );
  const [confidenceDraft, setConfidenceDraft] = useState<string>("");
  const [notesDraft, setNotesDraft] = useState<string>(d.interimNotes ?? "");

  const [interimNotesDraft, setInterimNotesDraft] = useState<string>(
    d.interimNotes ?? "",
  );
  const [notesDraftDeliverable, setNotesDraftDeliverable] = useState<string>(
    d.notes ?? "",
  );

  // Per-test metrics editor. Defaults to CVR + AOV + RPV when nothing has
  // been stored yet so the strategist isnt staring at an empty section.
  const [metricsDraft, setMetricsDraft] = useState<TrackedMetric[]>(
    d.metrics && d.metrics.length > 0 ? d.metrics : DEFAULT_METRICS,
  );

  function commitMetrics(next: TrackedMetric[]) {
    setMetricsDraft(next);
    // Drop fully empty rows on save so we dont persist phantom metrics.
    const cleaned = next.filter(
      (m) => m.name.trim() || m.baseline?.trim() || m.interim?.trim(),
    );
    onUpdate({ metrics: cleaned.length > 0 ? cleaned : undefined });
  }

  function updateMetric(i: number, patch: Partial<TrackedMetric>) {
    const next = metricsDraft.map((m, idx) =>
      idx === i ? { ...m, ...patch } : m,
    );
    setMetricsDraft(next);
  }

  function blurCommit() {
    commitMetrics(metricsDraft);
  }

  function addMetric() {
    commitMetrics([...metricsDraft, { name: "" }]);
  }

  function removeMetric(i: number) {
    commitMetrics(metricsDraft.filter((_, idx) => idx !== i));
  }

  // Test URL draft is the only single-field Test setup input left. The
  // metrics editor replaces tracked-metric / baseline / interim-uplift.
  const [liveUrlDraft, setLiveUrlDraft] = useState<string>(
    d.liveTestUrl ?? "",
  );

  // Phase history is noise on first open. Collapsed by default; the chevron
  // toggles it open.
  const [historyOpen, setHistoryOpen] = useState(false);

  // Strategy brief lives only in the modal now. Same paste-URL pattern as
  // the onboarding brief, scoped per-deliverable.
  const [editingBrief, setEditingBrief] = useState(false);
  const [briefDraft, setBriefDraft] = useState(d.brief ?? "");
  const [editingFigma, setEditingFigma] = useState(false);
  const [figmaDraft, setFigmaDraft] = useState(d.figmaUrl ?? "");

  const role = activeAssigneeFor(d.phase, {
    designer: d.designer,
    secondaryDesigner: d.secondaryDesigner,
    developer: d.developer,
    secondaryDeveloper: d.secondaryDeveloper,
  });

  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    /* Reset the input so the user can re-pick the same file later. */
    e.target.value = "";
    setUploadingScreenshot(true);
    try {
      const path = await uploadScreenshot(f, d.id);
      if (!path) {
        alert("Screenshot upload failed - check your connection and try again.");
        return;
      }
      /* Sign immediately so the in-flight render gets a working URL.
       * mockTaskToRow strips signed URLs back to paths before writing
       * to the DB so the column stays long-lived. */
      const signed = await signScreenshotPaths([path]);
      onUpdate({ screenshot: signed[path] || path });
    } finally {
      setUploadingScreenshot(false);
    }
  }

  function submitConclude() {
    const result: TestResult = {
      concludedAt: MOCK_TODAY,
      outcome: outcomeDraft,
      metric: metricDraft.trim() || undefined,
      upliftPct: upliftDraft.trim() ? Number(upliftDraft) : undefined,
      confidencePct: confidenceDraft.trim() ? Number(confidenceDraft) : undefined,
      durationDays: d.liveStartedAt ? daysBetween(d.liveStartedAt) : undefined,
      notes: notesDraft.trim() || undefined,
      screenshot: d.screenshot,
    };
    onConclude(result);
  }

  function saveInterim() {
    // Notes save direct; metric interims live in the per-row inputs below.
    onUpdate({
      interimNotes: interimNotesDraft.trim() || undefined,
    });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0C0C0C] border border-[#2A2A2A]"
      >
        <div className="px-6 py-5 border-b border-[#2A2A2A] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#71757D]">
              {d.clientName} · {d.projectName}
              {d.category ? ` · ${d.category}` : ""}
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#E5E5EA] leading-tight">
              {d.title}
            </h2>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.accent}`}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: style.dot }}
                />
                {style.label}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#181818] text-[#9CA3AF]">
                {formatHours(d.hoursInPhase)} in phase
              </span>
              {calDays > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#181818] text-[#9CA3AF]">
                  {calDays}d calendar
                </span>
              )}
              {rounds > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#181818] text-[#9CA3AF]">
                  R{rounds} revisions
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-[#181818] border border-[#2A2A2A] text-[#71757D] hover:text-white flex items-center justify-center shrink-0"
          >
            <XMarkIcon className="size-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Build schedule - the full Phase 1 + Phase 2 internal due dates
              for this project. Phase 2 reads "TBC" until the client approves
              the design (first card moves Ext Rev -> Dev). External client
              deadline shown at the bottom for reference. */}
          {d.projectType === "build" &&
            d.projectStartDate &&
            d.turnaroundDays &&
            (() => {
              /* Manual Phase 2 deadline IS the client deadline when set
               * (Phase 2 = the final stretch that lands live). Falls back
               * to the computed startDate + turnaroundDays when admin
               * hasn't pinned one. */
              const clientDeadlineISO =
                d.projectPhase2Deadline ??
                addCalendarDays(d.projectStartDate, d.turnaroundDays);
              // Find the latest Phase 2 due date - if it lands past the
              // client deadline, the schedule has slipped because external
              // rev took longer than budgeted. Warn the team.
              const lastPhase2Due = d.projectClientApprovedAt
                ? phaseInternalDueDate("launch-testing", {
                    type: d.projectType,
                    turnaroundDays: d.turnaroundDays,
                    startDate: d.projectStartDate,
                    clientApprovedAt: d.projectClientApprovedAt,
                  })
                : null;
              const isLate =
                !!lastPhase2Due &&
                lastPhase2Due.localeCompare(clientDeadlineISO) > 0;
              // Schedule grid includes External Revisions explicitly so the
              // 3-day client window is visible. The card for it uses
              // sentToClientAt + 2 day soft target since External Rev isn't
              // part of the internal phase-due engine.
              const scheduleCells: {
                phase: PreviewPhase;
                due: string | null;
                isCurrent: boolean;
              }[] = [
                ...PHASE_1_ORDER.map((p) => ({
                  phase: p,
                  due: phaseInternalDueDate(p, {
                    type: d.projectType,
                    turnaroundDays: d.turnaroundDays,
                    startDate: d.projectStartDate,
                    clientApprovedAt: d.projectClientApprovedAt,
                  }),
                  isCurrent: d.phase === p,
                })),
                {
                  phase: "external-revisions" as PreviewPhase,
                  due: d.sentToClientAt
                    ? addCalendarDays(d.sentToClientAt, EXT_REV_EXPECTED_DAYS)
                    : null,
                  isCurrent: d.phase === "external-revisions",
                },
                ...PHASE_2_ORDER.map((p) => ({
                  phase: p,
                  due: phaseInternalDueDate(p, {
                    type: d.projectType,
                    turnaroundDays: d.turnaroundDays,
                    startDate: d.projectStartDate,
                    clientApprovedAt: d.projectClientApprovedAt,
                  }),
                  isCurrent: d.phase === p,
                })),
              ];
              return (
                <section className="rounded-xl border border-[#2A2A2A] bg-[#0C0C0C] p-4">
                  <div className="flex items-baseline justify-between mb-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71757D]">
                      Build schedule
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider text-[#71757D]">
                      {d.turnaroundDays}d project
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {scheduleCells.map(({ phase, due, isCurrent }) => {
                      const meta = previewPhaseMeta(phase);
                      return (
                        <div
                          key={phase}
                          className={`rounded-md p-2 border ${
                            isCurrent
                              ? "border-[#383838] bg-[#181818]"
                              : "border-[#2A2A2A]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="size-1.5 rounded-full"
                              style={{ background: meta?.color ?? "#71757D" }}
                            />
                            <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] truncate">
                              {meta?.label ?? phase}
                            </span>
                          </div>
                          <span
                            className={`text-[12px] tabular-nums ${
                              due
                                ? isCurrent
                                  ? "text-white font-medium"
                                  : "text-[#E5E5EA]"
                                : "text-[#4B4D52]"
                            }`}
                          >
                            {due ? formatShortDate(due) : "TBC"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {isLate && (
                    <div className="mt-3 px-3 py-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                      External revisions ran long: Launch & Testing now lands
                      after the client deadline. Escalate or rescope.
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-[#2A2A2A] space-y-2 text-[11px]">
                    {/* These two anchors drive the auto-computed per-phase
                      * due dates in the schedule grid above. They're a
                      * fallback - if Phase 1 / Phase 2 deadlines are set
                      * directly in the Client deadlines section, those
                      * take precedence for stuck/approaching/on-track. */}
                    <p className="text-[10px] text-[#4B4D52] italic pb-1">
                      Schedule anchors (used when no manual deadlines set)
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#71757D] uppercase tracking-wider shrink-0">
                        Project start
                      </span>
                      <div className="min-w-0 flex-1 max-w-[180px]">
                        <DarkDatePicker
                          value={d.projectStartDate}
                          onChange={(v) => onSetProjectStartDate(v)}
                          placeholder="Set start date"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#71757D] uppercase tracking-wider shrink-0">
                        Client approved
                      </span>
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                        <div className="max-w-[180px] flex-1">
                          <DarkDatePicker
                            value={d.projectClientApprovedAt}
                            onChange={(v) => onSetClientApproval(v)}
                            placeholder="Mark approved"
                          />
                        </div>
                        {d.projectClientApprovedAt && (
                          <button
                            onClick={onResetClientApproval}
                            className="text-[10px] uppercase tracking-wider text-[#71757D] hover:text-rose-400 transition-colors shrink-0"
                            title="Reset client approval - Phase 2 dates go back to TBC"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#71757D] uppercase tracking-wider">
                        Client deadline
                      </span>
                      <span
                        className={`tabular-nums ${
                          isLate ? "text-rose-300" : "text-[#E5E5EA]"
                        }`}
                      >
                        {formatShortDate(clientDeadlineISO)}
                      </span>
                    </div>
                  </div>
                </section>
              );
            })()}

          {/* Manual client-facing deadlines per phase bucket. Shown for
            * every project (build + retainer) so admin can pin an
            * externally-imposed deadline (campaign launch, event,
            * client cut-off) without depending on the build schedule's
            * computed math. When set, override the per-phase due
            * dates for stuck/approaching/on-track on every card in
            * that bucket; Phase 2 also becomes the client deadline. */}
          <section className="rounded-xl border border-[#2A2A2A] bg-[#0C0C0C] p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71757D] mb-3">
              Client deadlines
            </h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#71757D] uppercase tracking-wider shrink-0">
                  Phase 1 deadline
                </span>
                <div className="min-w-0 flex-1 max-w-[180px]">
                  <DarkDatePicker
                    value={d.projectPhase1Deadline}
                    onChange={(v) => onSetPhase1Deadline(v)}
                    placeholder="Set Phase 1 due"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#71757D] uppercase tracking-wider shrink-0">
                  Phase 2 deadline
                </span>
                <div className="min-w-0 flex-1 max-w-[180px]">
                  <DarkDatePicker
                    value={d.projectPhase2Deadline}
                    onChange={(v) => onSetPhase2Deadline(v)}
                    placeholder="Set Phase 2 due"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Internal Revisions decision bar - Approve pushes the design to
              the client (green state, External Rev), Request revisions
              bounces back to Design with the Revisions tag. Both pair with
              notifyAssigneeChange so whoever owns the next phase gets a ping
              when Slack wires in. */}
          {/* Tickets get a Complete button instead of phase progression. Once
              completed they fall off the active board (filtered out in
              visibleDeliverables); the modal stays openable from the strip
              while open here, with an Undo button if the user wants it back. */}
          {d.phase === "tickets" && (
            <section
              className={`rounded-xl border p-4 ${
                d.completedAt
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-[#2A2A2A] bg-[#0C0C0C]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      d.completedAt ? "text-emerald-400" : "text-[#71757D]"
                    }`}
                  >
                    {d.completedAt ? "Completed" : "Ticket status"}
                  </p>
                  <p className="text-sm text-[#E5E5EA] mt-0.5">
                    {d.completedAt
                      ? `Marked done ${formatShortDate(d.completedAt)}. No longer on the board.`
                      : "Mark this ticket as resolved to clear it from the board."}
                  </p>
                </div>
                <div className="shrink-0">
                  {d.completedAt ? (
                    <button
                      onClick={onUncompleteTicket}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#181818] text-[#9CA3AF] border border-[#2A2A2A] hover:text-white hover:border-[#383838] transition-colors"
                    >
                      <ArrowUturnLeftIcon className="size-3" />
                      Reopen
                    </button>
                  ) : (
                    <button
                      onClick={onCompleteTicket}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500 text-[#0C0C0C] hover:bg-emerald-400 transition-colors"
                    >
                      <CheckCircleIcon className="size-3.5" />
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {d.phase === "internal-revisions" && !d.testResult && (
            <section
              className={`rounded-xl border p-4 ${
                d.approvedAt
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-[#2A2A2A] bg-[#0C0C0C]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      d.approvedAt ? "text-emerald-400" : "text-[#71757D]"
                    }`}
                  >
                    {d.approvedAt ? "Approved - send to client" : "Internal sign-off"}
                  </p>
                  <p className="text-sm text-[#E5E5EA] mt-0.5">
                    {d.approvedAt
                      ? `Signed off ${formatShortDate(d.approvedAt)}. Drag the card to External Revisions once you have sent it.`
                      : "Approve and hand to the primary designer to send, or bounce back to Design."}
                  </p>
                </div>
                {d.approvedAt ? (
                  <button
                    onClick={onUndoApprove}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#181818] text-[#9CA3AF] border border-[#2A2A2A] hover:text-white hover:border-[#383838] transition-colors"
                  >
                    <ArrowUturnLeftIcon className="size-3" />
                    Undo
                  </button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={onRequestRevisions}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
                    >
                      <ArrowUturnLeftIcon className="size-3" />
                      Request revisions
                    </button>
                    <button
                      onClick={onApproveInternal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500 text-[#0C0C0C] hover:bg-emerald-400 transition-colors"
                    >
                      <CheckCircleIcon className="size-3.5" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* QA decision bar - mirror of Internal Rev. Approve pushes to
              Launch & Testing; Send back bounces to Dev with the Revisions
              tag (the move handler auto-flags backward moves). */}
          {d.phase === "qa" && !d.testResult && (
            <section className="rounded-xl border border-[#2A2A2A] bg-[#0C0C0C] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#71757D]">
                    QA sign-off
                  </p>
                  <p className="text-sm text-[#E5E5EA] mt-0.5">
                    Approve to push to Launch & Testing, or send back to Dev
                    if anything broke.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onKickbackFromQA}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
                  >
                    <ArrowUturnLeftIcon className="size-3" />
                    Send back
                  </button>
                  <button
                    onClick={onApproveQA}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500 text-[#0C0C0C] hover:bg-emerald-400 transition-colors"
                  >
                    <CheckCircleIcon className="size-3.5" />
                    Approve
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71757D] mb-2">
                Active assignee
              </h3>
              {d.phase === "launch-testing" ? (
                <p className="text-sm text-[#E5E5EA]">
                  {LAUNCH_TESTING_TESTER}
                  <span className="text-[#4B4D52] mx-1.5">·</span>
                  {LAUNCH_TESTING_DEV}
                  <span className="block text-[10px] text-[#71757D] mt-1 uppercase tracking-wider">
                    Test / Dev
                  </span>
                </p>
              ) : d.phase === "strategy" ? (
                <p className="text-sm text-[#E5E5EA]">
                  {STRATEGY_OWNER}
                  <span className="block text-[10px] text-[#71757D] mt-1 uppercase tracking-wider">
                    Strategy owner
                  </span>
                </p>
              ) : d.phase === "internal-revisions" && d.approvedAt ? (
                <p className="text-sm text-[#E5E5EA]">
                  {d.designer || role.name}
                  <span className="block text-[10px] text-emerald-400 mt-1 uppercase tracking-wider">
                    Approved - send to client
                  </span>
                </p>
              ) : (
                <p className="text-sm text-[#E5E5EA]">
                  {role.name}
                  {role.isSecondary && (
                    <span className="text-[#71757D] ml-2 text-xs">
                      (secondary)
                    </span>
                  )}
                </p>
              )}
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71757D] mb-2">
                Due
              </h3>
              <DarkDatePicker
                value={d.dueDate}
                onChange={(v) => onUpdate({ dueDate: v })}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71757D]">
                Strategy brief
              </h3>
              {d.brief && !editingBrief && (
                <button
                  type="button"
                  onClick={() => {
                    setBriefDraft(d.brief ?? "");
                    setEditingBrief(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#71757D] hover:text-white transition-colors"
                >
                  <PencilSquareIcon className="size-3" />
                  Edit
                </button>
              )}
            </div>
            {editingBrief ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={briefDraft}
                  onChange={(e) => setBriefDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onUpdate({ brief: briefDraft.trim() || undefined });
                      setEditingBrief(false);
                    }
                    if (e.key === "Escape") {
                      setBriefDraft(d.brief ?? "");
                      setEditingBrief(false);
                    }
                  }}
                  placeholder="Paste brief URL (Google Doc, Notion, SharePoint, etc.)"
                  className="flex-1 min-w-0 px-3 py-2 rounded-md bg-[#0C0C0C] border border-[#383838] text-sm text-[#E5E5EA] focus:outline-none focus:border-[#525252] placeholder:text-[#4B4D52]"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ brief: briefDraft.trim() || undefined });
                    setEditingBrief(false);
                  }}
                  className="px-3 py-2 rounded-md bg-white text-[#0C0C0C] text-[11px] font-semibold uppercase tracking-wider hover:bg-[#E5E5EA] transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBriefDraft(d.brief ?? "");
                    setEditingBrief(false);
                  }}
                  className="px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : d.brief ? (
              <a
                href={d.brief}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#E5E5EA] hover:text-white underline-offset-4 hover:underline break-all"
              >
                <DocumentTextIcon className="size-3.5 shrink-0" />
                {d.brief}
                <ArrowTopRightOnSquareIcon className="size-3.5 shrink-0" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setBriefDraft("");
                  setEditingBrief(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-[#2A2A2A] text-sm text-[#71757D] hover:text-[#E5E5EA] hover:border-[#383838] transition-colors"
              >
                <PlusIcon className="size-3.5" />
                Attach brief URL
              </button>
            )}
          </section>

          {/* Figma URL - separate slot from Strategy brief because the team
              opens this every phase post-Strategy (design, dev for hand-off,
              QA for spec check). Same edit-on-pencil pattern as brief. */}
          <section>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71757D]">
                Figma
              </h3>
              {d.figmaUrl && !editingFigma && (
                <button
                  type="button"
                  onClick={() => {
                    setFigmaDraft(d.figmaUrl ?? "");
                    setEditingFigma(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#71757D] hover:text-white transition-colors"
                >
                  <PencilSquareIcon className="size-3" />
                  Edit
                </button>
              )}
            </div>
            {editingFigma ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={figmaDraft}
                  onChange={(e) => setFigmaDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onUpdate({ figmaUrl: figmaDraft.trim() || undefined });
                      setEditingFigma(false);
                    }
                    if (e.key === "Escape") {
                      setFigmaDraft(d.figmaUrl ?? "");
                      setEditingFigma(false);
                    }
                  }}
                  placeholder="Paste Figma file or frame URL"
                  className="flex-1 min-w-0 px-3 py-2 rounded-md bg-[#0C0C0C] border border-[#383838] text-sm text-[#E5E5EA] focus:outline-none focus:border-[#525252] placeholder:text-[#4B4D52]"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ figmaUrl: figmaDraft.trim() || undefined });
                    setEditingFigma(false);
                  }}
                  className="px-3 py-2 rounded-md bg-white text-[#0C0C0C] text-[11px] font-semibold uppercase tracking-wider hover:bg-[#E5E5EA] transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFigmaDraft(d.figmaUrl ?? "");
                    setEditingFigma(false);
                  }}
                  className="px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : d.figmaUrl ? (
              <a
                href={d.figmaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#E5E5EA] hover:text-white underline-offset-4 hover:underline break-all"
              >
                <PuzzlePieceIcon className="size-3.5 shrink-0" />
                {d.figmaUrl}
                <ArrowTopRightOnSquareIcon className="size-3.5 shrink-0" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFigmaDraft("");
                  setEditingFigma(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-[#2A2A2A] text-sm text-[#71757D] hover:text-[#E5E5EA] hover:border-[#383838] transition-colors"
              >
                <PlusIcon className="size-3.5" />
                Attach Figma URL
              </button>
            )}
          </section>

          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71757D] mb-2">
              Notes
            </h3>
            <textarea
              value={notesDraftDeliverable}
              onChange={(e) => setNotesDraftDeliverable(e.target.value)}
              onBlur={() => {
                const v = notesDraftDeliverable.trim();
                if ((v || undefined) !== d.notes) {
                  onUpdate({ notes: v || undefined });
                }
              }}
              placeholder="Context, edge cases, blockers - anything that doesn't fit the structured fields."
              rows={3}
              className="w-full px-3 py-2 rounded-md text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] focus:outline-none focus:border-[#383838] placeholder:text-[#4B4D52] leading-relaxed"
            />
          </section>

          {/* Phase history is collapsed by default at the bottom of the modal. */}

          {/* Nudge banner only. The actual Conclude button lives in the
              Test setup header above so the strategist isnt staring at two
              identical buttons. */}
          {needsConclude && !d.testResult && !concluding && (
            <section className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Time to conclude
              </p>
              <p className="mt-1 text-sm text-[#E5E5EA]">
                Test has been live {daysLive} days. Use the Conclude test
                button above to lock in the result.
              </p>
            </section>
          )}

          {needsInterim && !concluding && (
            <section className="rounded-lg border border-[#0EA5E9]/40 bg-[#0EA5E9]/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#0EA5E9]">
                Log an interim result
              </p>
              <p className="mt-1 text-sm text-[#E5E5EA]">
                Live for {daysLive} days with no interim numbers recorded. Drop
                running figures into the metrics rows below to keep the kanban
                honest.
              </p>
              <textarea
                value={interimNotesDraft}
                onChange={(e) => setInterimNotesDraft(e.target.value)}
                onBlur={saveInterim}
                placeholder="Interim notes"
                rows={2}
                className="mt-3 w-full px-3 py-2 rounded-md text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#383838] focus:outline-none focus:border-[#4B4D52]"
              />
            </section>
          )}

          {concluding && (
            <section className="rounded-lg border border-[#2A2A2A] bg-[#181818] p-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#71757D]">
                Conclude test
              </p>

              <div className="grid grid-cols-4 gap-1.5">
                {(["winner", "loser", "inconclusive", "shipped"] as TestOutcome[]).map(
                  (o) => (
                    <button
                      key={o}
                      onClick={() => setOutcomeDraft(o)}
                      className={`px-2.5 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        outcomeDraft === o
                          ? "text-[#0C0C0C]"
                          : "bg-[#0C0C0C] text-[#9CA3AF] border border-[#2A2A2A] hover:text-white"
                      }`}
                      style={
                        outcomeDraft === o
                          ? { background: OUTCOME_META[o].color }
                          : undefined
                      }
                    >
                      {OUTCOME_META[o].label}
                    </button>
                  ),
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  value={metricDraft}
                  onChange={(e) => setMetricDraft(e.target.value)}
                  placeholder="Metric"
                  className="px-3 py-2 rounded-md text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#383838] focus:outline-none focus:border-[#4B4D52]"
                />
                <input
                  type="number"
                  step="0.1"
                  value={upliftDraft}
                  onChange={(e) => setUpliftDraft(e.target.value)}
                  placeholder="Uplift %"
                  className="px-3 py-2 rounded-md text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#383838] focus:outline-none focus:border-[#4B4D52]"
                />
                <input
                  type="number"
                  step="0.1"
                  value={confidenceDraft}
                  onChange={(e) => setConfidenceDraft(e.target.value)}
                  placeholder="Confidence %"
                  className="px-3 py-2 rounded-md text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#383838] focus:outline-none focus:border-[#4B4D52]"
                />
              </div>

              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Notes"
                rows={3}
                className="w-full px-3 py-2 rounded-md text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#383838] focus:outline-none focus:border-[#4B4D52]"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConcluding(false)}
                  className="px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={submitConclude}
                  className="px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA]"
                >
                  Save result
                </button>
              </div>
            </section>
          )}

          {d.testResult && (
            <section className="rounded-lg border border-[#2A2A2A] bg-[#181818] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#71757D]">
                  Result
                </p>
                <span
                  className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: OUTCOME_META[d.testResult.outcome].bg,
                    color: OUTCOME_META[d.testResult.outcome].color,
                  }}
                >
                  {OUTCOME_META[d.testResult.outcome].label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#4B4D52]">
                    Metric
                  </p>
                  <p className="mt-0.5 text-[#E5E5EA]">
                    {d.testResult.metric ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#4B4D52]">
                    Uplift
                  </p>
                  <p className="mt-0.5 text-[#E5E5EA] tabular-nums">
                    {d.testResult.upliftPct == null
                      ? "-"
                      : `${d.testResult.upliftPct > 0 ? "+" : ""}${d.testResult.upliftPct}%`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#4B4D52]">
                    Confidence
                  </p>
                  <p className="mt-0.5 text-[#E5E5EA] tabular-nums">
                    {d.testResult.confidencePct != null
                      ? `${d.testResult.confidencePct}%`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#4B4D52]">
                    Duration
                  </p>
                  <p className="mt-0.5 text-[#E5E5EA] tabular-nums">
                    {d.testResult.durationDays != null
                      ? `${d.testResult.durationDays}d`
                      : "-"}
                  </p>
                </div>
              </div>
              {d.testResult.notes && (
                <p className="mt-3 text-sm text-[#9CA3AF] leading-relaxed">
                  {d.testResult.notes}
                </p>
              )}
            </section>
          )}

          {d.phaseHistory && d.phaseHistory.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 mb-2 group"
              >
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71757D] group-hover:text-[#9CA3AF] transition-colors">
                  Phase history
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#71757D] group-hover:text-[#9CA3AF] transition-colors">
                  {d.phaseHistory.length} steps
                  <ChevronDownIcon
                    className={`size-3 transition-transform ${historyOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              {historyOpen && (
                <div className="space-y-1.5">
                  {d.phaseHistory.map((h, i) => {
                    const meta = PREVIEW_PHASES.find((p) => p.value === h.phase);
                    return (
                      <div
                        key={`${h.phase}-${i}`}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="inline-flex items-center gap-2 text-[#E5E5EA]">
                          <span
                            className="size-1.5 rounded-full"
                            style={{ background: meta?.color ?? "#71757D" }}
                          />
                          {meta?.label ?? h.phase}
                        </span>
                        <span className="text-[#71757D] tabular-nums">
                          {formatDueDate(h.enteredAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {d.phase === "launch-testing" && (
            <section className="rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71757D]">
                  Test setup
                </h3>
                <div className="flex items-center gap-2">
                  {d.liveTestUrl && (
                    <a
                      href={d.liveTestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white transition-colors"
                    >
                      Open live
                      <ArrowTopRightOnSquareIcon className="size-3" />
                    </a>
                  )}
                  {/* Ready -> click sets liveStartedAt to MOCK_TODAY and flips
                      the card into Live state. Live -> click opens the
                      conclude form inline. */}
                  {!d.liveStartedAt && !d.testResult && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate({ liveStartedAt: MOCK_TODAY })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500 text-[#0C0C0C] hover:bg-emerald-400 transition-colors"
                    >
                      <span className="size-1.5 rounded-full bg-[#0C0C0C]" />
                      Set live
                    </button>
                  )}
                  {d.liveStartedAt && !d.testResult && !concluding && (
                    <button
                      type="button"
                      onClick={() => setConcluding(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-amber-500 text-[#0C0C0C] hover:bg-amber-400 transition-colors"
                    >
                      Conclude test
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-1.5 block">
                  Test URL
                </label>
                <input
                  value={liveUrlDraft}
                  onChange={(e) => setLiveUrlDraft(e.target.value)}
                  onBlur={() => {
                    const v = liveUrlDraft.trim();
                    if ((v || undefined) !== d.liveTestUrl) {
                      onUpdate({ liveTestUrl: v || undefined });
                    }
                  }}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-md text-sm bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] focus:outline-none focus:border-[#383838] placeholder:text-[#4B4D52]"
                />
              </div>

              {/* Per-metric rows. Defaults to CVR / AOV / RPV; strategist
                  can edit names, add custom metrics, or remove rows. First
                  row is treated as primary by the conclude form. */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                    Metrics
                  </label>
                  <span className="text-[10px] text-[#4B4D52] uppercase tracking-wider">
                    Before / After
                  </span>
                </div>
                {metricsDraft.map((m, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-center"
                  >
                    <input
                      value={m.name}
                      onChange={(e) => updateMetric(i, { name: e.target.value })}
                      onBlur={blurCommit}
                      placeholder="Metric"
                      className="px-2.5 py-1.5 rounded-md text-[13px] bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] focus:outline-none focus:border-[#383838] placeholder:text-[#4B4D52]"
                    />
                    <input
                      value={m.baseline ?? ""}
                      onChange={(e) =>
                        updateMetric(i, { baseline: e.target.value })
                      }
                      onBlur={blurCommit}
                      placeholder="Baseline"
                      className="px-2.5 py-1.5 rounded-md text-[13px] bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] focus:outline-none focus:border-[#383838] placeholder:text-[#4B4D52] tabular-nums"
                    />
                    <input
                      value={m.interim ?? ""}
                      onChange={(e) =>
                        updateMetric(i, { interim: e.target.value })
                      }
                      onBlur={blurCommit}
                      placeholder="Interim"
                      className="px-2.5 py-1.5 rounded-md text-[13px] bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] focus:outline-none focus:border-[#383838] placeholder:text-[#4B4D52] tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => removeMetric(i)}
                      className="size-7 inline-flex items-center justify-center rounded-md text-[#4B4D52] hover:text-[#9CA3AF] hover:bg-[#181818] transition-colors"
                      title="Remove metric"
                      aria-label="Remove metric"
                    >
                      <XMarkIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMetric}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-[#2A2A2A] text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA] hover:border-[#383838] transition-colors"
                >
                  <PlusIcon className="size-3" />
                  Add metric
                </button>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-1.5 block">
                  Interim notes
                </label>
                <textarea
                  value={interimNotesDraft}
                  onChange={(e) => setInterimNotesDraft(e.target.value)}
                  onBlur={() => {
                    const v = interimNotesDraft.trim();
                    if ((v || undefined) !== d.interimNotes) {
                      onUpdate({ interimNotes: v || undefined });
                    }
                  }}
                  placeholder="What the running data is telling you."
                  rows={2}
                  className="w-full px-3 py-2 rounded-md text-sm bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] focus:outline-none focus:border-[#383838] placeholder:text-[#4B4D52]"
                />
              </div>

              {/* Screenshot upload, folded into Test setup so the strategist
                  drops the live variant proof in the same place as the URL +
                  metric inputs. */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-1.5 block">
                  Screenshot
                </label>
                {d.screenshot ? (
                  <div className="relative rounded-lg overflow-hidden border border-[#2A2A2A]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.screenshot}
                      alt="Test screenshot"
                      className="w-full max-h-80 object-cover"
                    />
                    <button
                      onClick={() => onUpdate({ screenshot: undefined })}
                      className="absolute top-2 right-2 size-7 rounded-full bg-black/70 text-white hover:bg-black flex items-center justify-center"
                    >
                      <XMarkIcon className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingScreenshot}
                    className="w-full px-4 py-6 rounded-lg border border-dashed border-[#2A2A2A] bg-[#181818] text-sm text-[#71757D] hover:border-[#383838] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
                  >
                    {uploadingScreenshot ? "Uploading..." : "Upload a screenshot"}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFile}
                  className="hidden"
                />
              </div>
            </section>
          )}

          {/* Destructive action - sits at the very bottom of the modal body
              so it's out of the way but reachable. Uses a typed-confirm
              prompt so accidental deletion is hard. */}
          <section className="pt-2">
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-rose-400 transition-colors"
            >
              <XMarkIcon className="size-3.5" />
              Delete card
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── Sync error toast ──
 * Global listener for kanban-sync-error CustomEvents fired by
 * useKanbanData when a Supabase write throws. Surfaces the real
 * error message so silent failures never happen again. Replaces
 * the old localStorage push button - that was a recovery tool for
 * the localStorage era. Now Supabase is the only source of truth,
 * so a failed write needs to be loud. */
function SyncErrorToast() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (detail?.message) {
        setError(detail.message);
        window.setTimeout(() => setError(null), 10000);
      }
    }
    window.addEventListener("kanban-sync-error", handler);
    return () => window.removeEventListener("kanban-sync-error", handler);
  }, []);

  if (!error) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg bg-rose-500/[0.95] text-white text-[13px] font-medium shadow-[0_20px_60px_rgba(0,0,0,0.4)] max-w-md">
      <div className="font-semibold mb-0.5">Cloud save failed</div>
      <div className="text-[12px] opacity-90 break-all">{error}</div>
    </div>
  );
}

/* ── Search control ──
 * Icon-only by default - frees header real estate. Click the icon
 * or press / to expand into an input. Esc collapses + clears. The
 * inputRef is forwarded from the parent so the / shortcut from
 * anywhere still focuses this even when collapsed (clicking expands
 * it; the / handler triggers a click via expand state). */
function SearchControl({
  query,
  onChange,
  inputRef,
}: {
  query: string;
  onChange: (v: string) => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  /* Auto-expand when there's a query (so / focus visibly opens it
   * + the user typing always sees the input). */
  useEffect(() => {
    if (query) setExpanded(true);
  }, [query]);

  if (!expanded && !query) {
    return (
      <button
        onClick={() => {
          setExpanded(true);
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
        title="Search cards (/)"
        className="size-7 inline-flex items-center justify-center rounded-full text-[#71757D] hover:text-white border border-[#2A2A2A] hover:border-[#383838] transition-colors"
      >
        <MagnifyingGlassIcon className="size-3.5" />
      </button>
    );
  }

  return (
    <div className="relative">
      <MagnifyingGlassIcon className="size-3.5 text-[#71757D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (!query) setExpanded(false);
        }}
        placeholder="Search cards…"
        className="h-7 pl-7 pr-7 w-56 text-[11px] bg-[#0F0F10] border border-[#2A2A2A] rounded-full text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:border-[#383838] transition-all"
      />
      {query ? (
        <button
          onClick={() => {
            onChange("");
            setExpanded(false);
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center text-[#71757D] hover:text-[#E5E5EA] rounded-full"
          title="Clear (Esc)"
        >
          <XMarkIcon className="size-3" />
        </button>
      ) : (
        <kbd className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[#71757D]">
          /
        </kbd>
      )}
    </div>
  );
}

/* ── Active project tab ──
 * Single pill showing the currently-selected project. Hover →
 * shows a delete (x) action so admin can drop the project with one
 * click + confirm. */
function ActiveProjectTab({
  project: p,
  count,
  onDelete,
}: {
  project: MockProject;
  count: number;
  onDelete: () => void;
}) {
  const isRetainer = p.type === "retainer";
  return (
    <div
      className={`group inline-flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full text-[12px] font-medium border ${
        isRetainer
          ? "bg-teal-500 text-[#0C0C0C] border-teal-500"
          : "bg-white text-[#0C0C0C] border-white"
      }`}
      title={
        isRetainer && p.engagementDays
          ? `${ENGAGEMENT_TIER_LABEL[p.engagementDays as EngagementDays]} retainer (${p.engagementDays}-day cadence)`
          : p.turnaroundDays
            ? `Build · ${p.turnaroundDays}d turnaround`
            : undefined
      }
    >
      <span className="truncate max-w-[260px]">{p.name}</span>
      <span className="tabular-nums text-[#0C0C0C]/50">{count}</span>
      {(p.turnaroundDays || p.engagementDays) && (
        <span className="text-[10px] uppercase tracking-wider text-[#0C0C0C]/60">
          {p.type === "retainer" && p.engagementDays
            ? `${ENGAGEMENT_TIER_SHORT[p.engagementDays as EngagementDays]}/mo`
            : `${p.turnaroundDays}d`}
        </span>
      )}
      <button
        onClick={onDelete}
        className="size-5 inline-flex items-center justify-center rounded-full text-[#0C0C0C]/60 hover:text-rose-700 hover:bg-black/[0.08] opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete this project"
      >
        <XMarkIcon className="size-3" />
      </button>
    </div>
  );
}

/* ── Project overflow chip ──
 * "+N" chip that opens a dropdown listing every project on this
 * client EXCEPT the active one. Each row = click name to switch,
 * trash icon to delete. */
function ProjectOverflow({
  projects,
  counts,
  onSelect,
  onDelete,
}: {
  projects: MockProject[];
  counts: Record<string, number>;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-full text-[12px] font-medium border bg-[#181818] text-[#9CA3AF] border-[#2A2A2A] hover:text-white hover:border-[#383838] transition-colors"
        title={`${projects.length} more project${projects.length === 1 ? "" : "s"}`}
      >
        +{projects.length}
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-40 w-72 bg-[#0F0F10] rounded-lg ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#71757D] font-semibold border-b border-white/[0.04]">
            Other projects ({projects.length})
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {projects.map((p) => {
              const count = counts[p.id] ?? 0;
              return (
                <li key={p.id} className="group flex items-center">
                  <button
                    onClick={() => {
                      onSelect(p.id);
                      setOpen(false);
                    }}
                    className="flex-1 min-w-0 text-left px-3 py-2 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 size-1.5 rounded-full ${p.type === "retainer" ? "bg-teal-400" : "bg-white"}`}
                      />
                      <span className="text-[12px] text-[#E5E5EA] truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-[#71757D] tabular-nums shrink-0">
                        {count}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onDelete(p.id);
                    }}
                    className="size-7 mr-1.5 inline-flex items-center justify-center rounded text-[#71757D] hover:text-rose-400 hover:bg-rose-500/[0.06] opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Delete ${p.name}`}
                  >
                    <XMarkIcon className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Project pod-assignment picker ──
 * Custom dropdown for the "assign pod to this project" control in
 * the project tabs row. Was a native <select> which clashed with
 * the dark aesthetic. Includes a "No pod" option so admin can
 * unassign. */
function ProjectPodPicker({
  pods,
  currentPodId,
  onAssign,
}: {
  pods: MockPod[];
  currentPodId: string | undefined;
  onAssign: (podId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const active = pods.find((p) => p.id === currentPodId);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 text-[12px] font-medium bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] rounded-full hover:border-[#383838] transition-colors"
      >
        <span className="truncate max-w-[140px]">{active?.name ?? "No pod"}</span>
        <ChevronDownIcon className="size-3.5 text-[#71757D] shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-40 w-56 bg-[#0F0F10] rounded-lg ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#71757D] font-semibold border-b border-white/[0.04]">
            Assign pod
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            <li>
              <button
                onClick={() => {
                  onAssign("");
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors ${
                  !currentPodId ? "bg-white/[0.04]" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {!currentPodId ? (
                    <svg className="size-3.5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.586l7.296-7.296a1 1 0 011.408 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="size-3.5 shrink-0" />
                  )}
                  <span className="text-[13px] text-[#71757D] italic">No pod</span>
                </div>
              </button>
            </li>
            {pods.map((p) => {
              const isActive = p.id === currentPodId;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      onAssign(p.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors ${
                      isActive ? "bg-white/[0.04]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <svg className="size-3.5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.586l7.296-7.296a1 1 0 011.408 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="size-3.5 shrink-0" />
                      )}
                      <span className="text-[13px] text-[#E5E5EA] truncate">
                        {p.name}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Client picker (header) ──
 * Custom dropdown replacing the native <select> so the popover
 * matches the dark app aesthetic. Active client at the top with a
 * check; hover-trash on each row for one-click delete (confirms
 * via the parent's DarkConfirm). */
function KanbanClientPicker({
  clients,
  activeId,
  onSelect,
  onDelete,
}: {
  clients: MockClient[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const active = clients.find((c) => c.id === activeId);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative w-[180px] shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between gap-2 pl-3 pr-3 py-2 text-sm font-medium bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] rounded-full hover:border-[#383838] transition-colors"
      >
        <span className="truncate">{active?.name ?? "Pick a client"}</span>
        <ChevronDownIcon className="size-3.5 text-[#71757D] shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-72 bg-[#0F0F10] rounded-lg ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#71757D] font-semibold border-b border-white/[0.04]">
            Clients ({clients.length})
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {clients.map((c) => {
              const isActive = c.id === activeId;
              const projectCount = c.projects.length;
              return (
                <li key={c.id} className="group flex items-center gap-1 pr-1.5">
                  <button
                    onClick={() => {
                      onSelect(c.id);
                      setOpen(false);
                    }}
                    className={`flex-1 min-w-0 text-left pl-3 pr-2 py-2 hover:bg-white/[0.04] transition-colors ${
                      isActive ? "bg-white/[0.04]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <svg className="size-3.5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.586l7.296-7.296a1 1 0 011.408 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="size-3.5 shrink-0" />
                      )}
                      <span className="text-[13px] text-[#E5E5EA] truncate flex-1 min-w-0">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-[#71757D] tabular-nums shrink-0 pl-2">
                        {projectCount} proj
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onDelete(c.id);
                    }}
                    className="size-7 shrink-0 inline-flex items-center justify-center rounded text-[#71757D] hover:text-rose-400 hover:bg-rose-500/[0.06] opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Delete ${c.name}`}
                  >
                    <XMarkIcon className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Pod picker (header) ──
 * Same pattern as the client picker but for pods. No delete -
 * pods are managed canonically in /company/pods (the kanban only
 * READS them). */
function KanbanPodPicker({
  pods,
  activeId,
  onSelect,
}: {
  pods: MockPod[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const active = pods.find((p) => p.id === activeId);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative w-[180px] shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between gap-2 pl-3 pr-3 py-2 text-sm font-medium bg-[#181818] text-[#E5E5EA] border border-[#2A2A2A] rounded-full hover:border-[#383838] transition-colors"
      >
        <span className="truncate">{active?.name ?? "Pick a pod"}</span>
        <ChevronDownIcon className="size-3.5 text-[#71757D] shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-72 bg-[#0F0F10] rounded-lg ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#71757D] font-semibold border-b border-white/[0.04]">
            Pods ({pods.length})
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {pods.map((p) => {
              const isActive = p.id === activeId;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      onSelect(p.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors ${
                      isActive ? "bg-white/[0.04]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <svg className="size-3.5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.586l7.296-7.296a1 1 0 011.408 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="size-3.5 shrink-0" />
                      )}
                      <span className="text-[13px] text-[#E5E5EA] truncate">
                        {p.name}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── New Client modal ──
 * Designed in-app replacement for window.prompt. Single field
 * (Client name), Enter to submit, Esc to cancel, click backdrop to
 * dismiss. Matches the kanban's dark aesthetic. */
function NewClientModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-md p-6"
      >
        <h2 className="text-lg font-semibold text-[#E5E5EA] mb-1">Add client</h2>
        <p className="text-xs text-[#71757D] mb-5">
          Creates a new client on the kanban. Add projects + cards once it's in.
        </p>
        <label className="block text-[10px] uppercase tracking-wider text-[#71757D] mb-1.5">
          Client name
        </label>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Skincare"
          className="w-full h-10 px-3 bg-black/40 rounded-md text-[14px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-1 focus:ring-white/[0.12]"
        />
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm text-[#71757D] hover:text-[#E5E5EA]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-3 py-2 bg-white text-[#0C0C0C] text-sm font-semibold rounded-lg hover:bg-[#E5E5EA] disabled:opacity-40"
          >
            Add client
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Overflow menu (…) ──
 * Tertiary controls that aren't worth always-visible header room:
 * card density (Cosy / Glance), Phase rules, room to grow. */
function OverflowMenu({
  density,
  onSetDensity,
  onOpenRules,
}: {
  density: "cosy" | "glance";
  onSetDensity: (d: "cosy" | "glance") => void;
  onOpenRules: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  /* Click-outside closes. */
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="More"
        className={`size-7 inline-flex items-center justify-center rounded-full transition-colors ${
          open
            ? "text-white border border-[#383838] bg-[#1A1A1A]"
            : "text-[#71757D] hover:text-white border border-[#2A2A2A] hover:border-[#383838]"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-40 w-56 bg-[#0F0F10] rounded-lg ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="p-2 border-b border-white/[0.04]">
            <div className="text-[10px] uppercase tracking-wider text-[#71757D] font-semibold px-2 mb-2">
              Card density
            </div>
            <div className="inline-flex w-full p-0.5 rounded-md bg-[#141414] ring-1 ring-white/[0.04]">
              {(["cosy", "glance"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => onSetDensity(d)}
                  className={`flex-1 px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                    density === d
                      ? "bg-[#E5E5EA] text-[#0C0C0C]"
                      : "text-[#71757D] hover:text-[#E5E5EA]"
                  }`}
                >
                  {d === "cosy" ? "Cosy" : "Glance"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              onOpenRules();
            }}
            className="w-full text-left px-4 py-2.5 text-[12px] text-[#E5E5EA] hover:bg-white/[0.04] transition-colors"
          >
            Phase rules
          </button>
        </div>
      )}
    </div>
  );
}
