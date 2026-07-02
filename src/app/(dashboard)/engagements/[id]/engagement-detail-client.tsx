"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { onboardingStore, type OnboardingSubmission } from "@/lib/onboarding";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PlusIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownTrayIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import {
  detectEngagementSource,
  trashEngagement,
} from "@/lib/engagement-trash";
import {
  ENGAGEMENT_CYCLES,
  ENGAGEMENT_DELIVERABLES,
  assetCategoriesForKind,
  cycleForDay,
  ownerColor,
  stageForDay,
  stagesForKind,
  weekInCycleForDay,
  type CustomDeliverable,
  type CycleNumber,
  type DeliverableStatus,
  type OwnerRole,
  type QAGateKey,
  type StageId,
} from "@/lib/engagement-template";
import type {
  EngagementActivity,
  EngagementAsset,
  EngagementDeliverableState,
  MockEngagement,
} from "@/lib/engagement-mocks";
import { phaseMeta } from "@/lib/task-board/phases";
import { PhaseTimeline } from "@/components/task-board/phase-timeline";
import { EngagementDeliveryPlan } from "./EngagementDeliveryPlan";
import { type MustDoGateKey } from "@/components/engagements/must-do-modal";
import { MustDosRow } from "@/components/engagements/must-dos-row";
import { GeneratedDocs } from "@/components/engagements/generated-docs";
import { BriefIntakePanel } from "@/components/engagements/brief-intake-panel";
import { StrategySandbox } from "@/components/engagements/strategy-sandbox";
import { EngagementCard } from "@/components/engagements/engagement-card";
import type { MustDoGate, PageType } from "@/lib/pods-v2/types";
import { PAGE_LABEL } from "@/lib/pods-v2/types";

type DeliverableMap = Map<string, EngagementDeliverableState>;

function statusPill(status: DeliverableStatus) {
  switch (status) {
    case "done":
      return { label: "Done", bg: "#E8F5E9", fg: "#1B5E20", border: "#C8E6C9" };
    case "in_progress":
      return { label: "In progress", bg: "#FFF8E1", fg: "#E65100", border: "#FFE082" };
    case "blocked":
      return { label: "Blocked", bg: "#FFEBEE", fg: "#C62828", border: "#FFCDD2" };
    case "todo":
      return { label: "To do", bg: "#F5F5F5", fg: "#666", border: "#E5E5EA" };
  }
}

type DocKind = "gdoc" | "gsheet" | "gslides" | "gdrive" | "docx" | "pdf" | "notion" | "figma" | "miro" | "other";

interface DocMeta {
  kind: DocKind;
  label: string;
  badge: string; // 1-2 char glyph for the inline icon
  badgeBg: string;
  badgeFg: string;
  viewUrl: string;
  downloadUrl: string | null;
  hostname: string;
}

function docMeta(url: string): DocMeta {
  let hostname = "";
  try { hostname = new URL(url).hostname.replace(/^www\./, ""); } catch { hostname = url; }

  const gdoc = url.match(/docs\.google\.com\/document\/d\/([^/?#]+)/);
  if (gdoc) {
    const id = gdoc[1];
    return {
      kind: "gdoc",
      label: "Google Doc",
      badge: "G",
      badgeBg: "#4285F4",
      badgeFg: "#FFFFFF",
      viewUrl: url,
      downloadUrl: `https://docs.google.com/document/d/${id}/export?format=docx`,
      hostname,
    };
  }
  const gsheet = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/?#]+)/);
  if (gsheet) {
    const id = gsheet[1];
    return {
      kind: "gsheet",
      label: "Google Sheet",
      badge: "G",
      badgeBg: "#0F9D58",
      badgeFg: "#FFFFFF",
      viewUrl: url,
      downloadUrl: `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`,
      hostname,
    };
  }
  const gslides = url.match(/docs\.google\.com\/presentation\/d\/([^/?#]+)/);
  if (gslides) {
    const id = gslides[1];
    return {
      kind: "gslides",
      label: "Google Slides",
      badge: "G",
      badgeBg: "#F4B400",
      badgeFg: "#1B1B1B",
      viewUrl: url,
      downloadUrl: `https://docs.google.com/presentation/d/${id}/export?format=pptx`,
      hostname,
    };
  }
  const gdrive = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (gdrive) {
    const id = gdrive[1];
    return {
      kind: "gdrive",
      label: "Google Drive",
      badge: "G",
      badgeBg: "#4285F4",
      badgeFg: "#FFFFFF",
      viewUrl: url,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
      hostname,
    };
  }
  if (/\.docx?($|\?)/i.test(url)) {
    return {
      kind: "docx",
      label: "Word doc",
      badge: "W",
      badgeBg: "#185ABD",
      badgeFg: "#FFFFFF",
      viewUrl: `https://docs.google.com/viewer?url=${encodeURIComponent(url)}`,
      downloadUrl: url,
      hostname,
    };
  }
  if (/\.pdf($|\?)/i.test(url)) {
    return {
      kind: "pdf",
      label: "PDF",
      badge: "P",
      badgeBg: "#D32F2F",
      badgeFg: "#FFFFFF",
      viewUrl: url,
      downloadUrl: url,
      hostname,
    };
  }
  if (/notion\.so|notion\.site/.test(hostname)) {
    return {
      kind: "notion",
      label: "Notion",
      badge: "N",
      badgeBg: "#1B1B1B",
      badgeFg: "#FFFFFF",
      viewUrl: url,
      downloadUrl: null,
      hostname,
    };
  }
  if (/figma\.com/.test(hostname)) {
    return {
      kind: "figma",
      label: "Figma",
      badge: "F",
      badgeBg: "#A259FF",
      badgeFg: "#FFFFFF",
      viewUrl: url,
      downloadUrl: null,
      hostname,
    };
  }
  if (/miro\.com/.test(hostname)) {
    return {
      kind: "miro",
      label: "Miro",
      badge: "M",
      badgeBg: "#FFD02F",
      badgeFg: "#1B1B1B",
      viewUrl: url,
      downloadUrl: null,
      hostname,
    };
  }
  return {
    kind: "other",
    label: "Link",
    badge: "L",
    badgeBg: "#E5E5EA",
    badgeFg: "#1B1B1B",
    viewUrl: url,
    downloadUrl: null,
    hostname,
  };
}

function cycleStateForDay(cycle: CycleNumber, day: number): "complete" | "active" | "upcoming" {
  const def = ENGAGEMENT_CYCLES.find((c) => c.number === cycle)!;
  if (day > def.endDay) return "complete";
  if (day >= def.startDay) return "active";
  return "upcoming";
}

export default function EngagementDetailClient({ engagement }: { engagement: MockEngagement }) {
  const [deliverables, setDeliverables] = useState<DeliverableMap>(() => {
    const m = new Map<string, EngagementDeliverableState>();
    engagement.deliverables.forEach((d) => m.set(d.templateId, { ...d }));
    return m;
  });
  const brief = engagement.brief;
  const [customDeliverables, setCustomDeliverables] = useState<CustomDeliverable[]>(engagement.customDeliverables);
  const [assets, setAssets] = useState<EngagementAsset[]>(engagement.assets);
  const [activity, setActivity] = useState<EngagementActivity[]>(engagement.activity);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addingLinkFor, setAddingLinkFor] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [assetDraft, setAssetDraft] = useState({ label: "", url: "" });
  const [viewCycle, setViewCycle] = useState<CycleNumber>(() => cycleForDay(engagement.currentDay));
  const [addingDeliverableIn, setAddingDeliverableIn] = useState<{ cycle: CycleNumber; stage: Exclude<StageId, "audit"> } | null>(null);
  const [newDeliverableDraft, setNewDeliverableDraft] = useState<{
    type: string;
    label: string;
    owner: OwnerRole;
    /** YYYY-MM-DD. Free-pick any calendar date. Defaults to the W3
     *  Thursday of the chosen cycle when the form opens; the PM can
     *  override to any day (rush deliveries, mid-cycle adds, off-cadence
     *  one-offs). dueDay + weekInCycle get derived on submit. */
    dueDate: string;
  }>({ type: "pdp", label: "", owner: "Pod", dueDate: "" });
  const [expandedTimeline, setExpandedTimeline] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(true);
  const [intake, setIntake] = useState<OnboardingSubmission | null>(null);
  const [wins, setWins] = useState(engagement.wins ?? []);
  /* Retainer engagements split into Strategy / Build / Results tabs to keep
   * the (large) page legible — VIP clients, lots going on. Buckets keep the
   * single-scroll layout (useTabs=false ⇒ every group renders). */
  const useTabs = engagement.kind === "retainer";
  const [tab, setTab] = useState<"strategy" | "build" | "results">("strategy");
  const [addingWin, setAddingWin] = useState(false);
  const [winDraft, setWinDraft] = useState({ title: "", metric: "", day: "", notes: "" });
  const [notes, setNotes] = useState<NonNullable<typeof engagement.notes>>(engagement.notes ?? []);
  const [noteDraft, setNoteDraft] = useState("");
  const [mustDos, setMustDos] = useState<NonNullable<typeof engagement.mustDos>>(engagement.mustDos ?? {});
  const [openMustDo, setOpenMustDo] = useState<MustDoGateKey | null>(null);
  const [deleteStage, setDeleteStage] = useState<"closed" | "confirm-1" | "confirm-2">("closed");
  const [deleteTyped, setDeleteTyped] = useState("");
  const router = useRouter();
  /* Team mirror at /team/engagements/[id] reuses this same client, so
   * detect the team route and hide admin-only chrome (delete, purgatory
   * nudge) + swap back-links to stay inside the team hub. */
  const pathname = usePathname();
  const inTeamRoute = pathname?.startsWith("/team/") ?? false;
  const backHref = inTeamRoute ? "/team/pods" : "/engagements";
  const podsHref = inTeamRoute ? "/team/pods" : "/pods-v2";

  /** Stamp a timestamped note onto the engagement. Optimistic local
   *  state update + cloud-side write through addClientNote for
   *  pods-sourced engagements. Locally-created engagements (no Client
   *  row) keep the note in-memory + persist to localStorage via the
   *  existing engagement-storage shim. */
  const handleAddNote = () => {
    const content = noteDraft.trim();
    if (!content) return;
    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content,
      created_at: new Date().toISOString(),
    };
    setNotes((prev) => [note, ...prev]);
    setNoteDraft("");
    /* Mirror to pods-v2 Client if this engagement is pods-backed. The
     *  pods-v2 helper stamps its own created_at + id, so we sync the
     *  local entry to the returned note id once the write lands to keep
     *  the IDs in lockstep across devices. */
    import("@/lib/pods-v2/data").then(({ addClientNote, getClientById }) => {
      if (!getClientById(engagement.id)) return;
      const persisted = addClientNote(engagement.id, { content });
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...persisted } : n)),
      );
    }).catch((err) => console.error("[engagements] note add sync failed:", err));
  };

  const handleDeleteNote = (noteId: string) => {
    if (!confirm("Delete this note? Can't be undone.")) return;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    import("@/lib/pods-v2/data").then(({ deleteClientNote, getClientById }) => {
      if (!getClientById(engagement.id)) return;
      deleteClientNote(engagement.id, noteId);
    }).catch((err) => console.error("[engagements] note delete sync failed:", err));
  };

  const handleConfirmDelete = () => {
    const source = detectEngagementSource(engagement.id);
    trashEngagement(engagement, source);
    router.push(backHref);
  };

  /* Lazy-fetch the source OnboardingSubmission so the Intake panel can
   * show the full intake form (40+ fields). Only fires when an
   * onboardingSubmissionId is linked on the engagement, bucket mocks
   * and pre-link clients skip this entirely. Cloud + localStorage both
   * served by onboardingStore.getAll. */
  useEffect(() => {
    if (!engagement.onboardingSubmissionId) return;
    let cancelled = false;
    onboardingStore.getAll().then((all) => {
      if (cancelled) return;
      const match = all.find((s) => s.id === engagement.onboardingSubmissionId);
      if (match) setIntake(match);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [engagement.onboardingSubmissionId]);

  const currentDay = engagement.currentDay;
  const currentCycle = cycleForDay(currentDay);
  const currentWeek = weekInCycleForDay(currentDay);
  const currentStage = stageForDay(currentDay);
  const STAGES = stagesForKind(engagement.kind, engagement.bucket);
  const ASSET_CATEGORIES = assetCategoriesForKind(engagement.kind);
  const endDate = useMemo(() => {
    const d = new Date(engagement.startDate);
    d.setDate(d.getDate() + 89);
    return d;
  }, [engagement.startDate]);

  /* For bucket engagements, dueDay is measured in working days from
   * kickoff Monday, skip weekends when resolving to a calendar date.
   * Retainers use straight calendar days (90-day product). */
  const dateForDay = (day: number): Date => {
    const d = new Date(engagement.startDate);
    if (engagement.kind === "bucket") {
      let added = 1;
      while (added < day) {
        d.setDate(d.getDate() + 1);
        const wd = d.getDay();
        if (wd !== 0 && wd !== 6) added++;
      }
    } else {
      d.setDate(d.getDate() + (day - 1));
    }
    return d;
  };
  const formatDueDate = (day: number): { weekday: string; day: number; month: string } => {
    const d = dateForDay(day);
    return {
      weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
      day: d.getDate(),
      month: d.toLocaleDateString("en-GB", { month: "short" }),
    };
  };

  // Helpers to get deliverables for a given cycle + stage from either template (audit) or custom (build/test)
  const deliverablesForCycleStage = (cycleNum: CycleNumber, stageId: StageId) => {
    if (stageId === "audit") {
      return ENGAGEMENT_DELIVERABLES.filter((d) => d.cycle === cycleNum && d.stage === "audit");
    }
    return customDeliverables.filter((d) => d.cycle === cycleNum && d.stage === stageId);
  };

  const cycleStats = ENGAGEMENT_CYCLES.map((cycle) => {
    const stageBreakdown = STAGES.map((stage) => {
      const items = deliverablesForCycleStage(cycle.number, stage.id);
      const states = items.map((d) => deliverables.get(d.id)?.status ?? "todo");
      const done = states.filter((s) => s === "done").length;
      const blocked = states.filter((s) => s === "blocked").length;
      return { stage, total: items.length, done, blocked };
    });
    const allItems = STAGES.flatMap((s) => deliverablesForCycleStage(cycle.number, s.id));
    const total = allItems.length;
    const done = allItems.filter((d) => (deliverables.get(d.id)?.status ?? "todo") === "done").length;
    const blocked = allItems.filter((d) => (deliverables.get(d.id)?.status ?? "todo") === "blocked").length;
    const inProgress = allItems.filter((d) => (deliverables.get(d.id)?.status ?? "todo") === "in_progress").length;
    return {
      cycle,
      total,
      done,
      blocked,
      inProgress,
      pct: total === 0 ? 0 : Math.round((done / total) * 100),
      state: cycleStateForDay(cycle.number, currentDay),
      stageBreakdown,
    };
  });

  const allDeliverableIds = ENGAGEMENT_CYCLES.flatMap((c) =>
    STAGES.flatMap((s) => deliverablesForCycleStage(c.number, s.id).map((d) => d.id)),
  );
  const totalAll = allDeliverableIds.length;
  const totalDone = allDeliverableIds.filter((id) => deliverables.get(id)?.status === "done").length;
  const totalBlocked = allDeliverableIds.filter((id) => deliverables.get(id)?.status === "blocked").length;
  const overallPct = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  const handleMarkDone = (templateId: string, url?: string) => {
    setDeliverables((prev) => {
      const next = new Map(prev);
      const existing = next.get(templateId);
      next.set(templateId, {
        templateId,
        status: "done",
        artefactUrl: url ?? existing?.artefactUrl,
        completedAtDay: currentDay,
      });
      return next;
    });
    const template = ENGAGEMENT_DELIVERABLES.find((d) => d.id === templateId);
    if (template) {
      setActivity((prev) => [
        {
          id: `act-${Date.now()}`,
          day: currentDay,
          actor: "You",
          action: `Marked '${template.name}' done${url ? ` · ${url}` : ""}`,
        },
        ...prev,
      ]);
    }
    setAddingLinkFor(null);
    setLinkDraft("");
  };

  const handleReplaceLink = (templateId: string, url: string) => {
    setDeliverables((prev) => {
      const next = new Map(prev);
      const existing = next.get(templateId);
      next.set(templateId, {
        templateId,
        status: existing?.status ?? "done",
        artefactUrl: url,
        completedAtDay: existing?.completedAtDay,
      });
      return next;
    });
    const template = ENGAGEMENT_DELIVERABLES.find((d) => d.id === templateId);
    if (template) {
      setActivity((prev) => [
        {
          id: `act-${Date.now()}`,
          day: currentDay,
          actor: "You",
          action: `Replaced link on '${template.name}' · ${url}`,
        },
        ...prev,
      ]);
    }
    setAddingLinkFor(null);
    setLinkDraft("");
  };

  const handleCycleStatus = (templateId: string) => {
    setDeliverables((prev) => {
      const next = new Map(prev);
      const current = next.get(templateId)?.status ?? "todo";
      const order: DeliverableStatus[] = ["todo", "in_progress", "blocked", "done"];
      const i = order.indexOf(current);
      const nextStatus = order[(i + 1) % order.length];
      next.set(templateId, {
        ...(next.get(templateId) ?? { templateId, status: "todo" }),
        status: nextStatus,
        completedAtDay: nextStatus === "done" ? currentDay : undefined,
      });
      return next;
    });
  };


  const handleSaveMustDo = (key: MustDoGateKey, patch: Partial<MustDoGate>) => {
    setMustDos((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), ...patch } }));
    import("@/lib/pods-v2/data").then(({ getClientById, setClientMustDoGate }) => {
      if (getClientById(engagement.id)) setClientMustDoGate(engagement.id, key, patch);
    }).catch(() => {});
  };

  const handleAddWin = () => {
    const title = winDraft.title.trim();
    if (!title) return;
    const dayNum = parseInt(winDraft.day, 10);
    const newWin = {
      id: `win-${Date.now()}`,
      title,
      shippedAtDay: Number.isFinite(dayNum) && dayNum > 0 ? dayNum : currentDay,
      metric: winDraft.metric.trim() || undefined,
      notes: winDraft.notes.trim() || undefined,
    };
    setWins((prev) => [newWin, ...prev]);
    setAddingWin(false);
    setWinDraft({ title: "", metric: "", day: "", notes: "" });
    /* Persist to the pods-v2 Client row when this engagement is backed
     * by one. Bucket mocks / pre-link engagements skip persistence, the
     * win lives only in this session, which is fine for the demo. */
    import("@/lib/pods-v2/data").then(({ getClientById, addClientWin }) => {
      if (getClientById(engagement.id)) addClientWin(engagement.id, newWin);
    }).catch(() => {});
  };

  const handleAddAsset = (categoryId: string) => {
    if (!assetDraft.label.trim() || !assetDraft.url.trim()) return;
    const newAsset: EngagementAsset = {
      id: `asset-${Date.now()}`,
      cycle: viewCycle,
      category: categoryId,
      label: assetDraft.label.trim(),
      url: assetDraft.url.trim(),
      addedBy: "You",
      addedAtDay: currentDay,
    };
    setAssets((prev) => [...prev, newAsset]);
    setActivity((prev) => [
      {
        id: `act-${Date.now()}`,
        day: currentDay,
        actor: "You",
        action: `Added '${newAsset.label}' to ${ASSET_CATEGORIES.find((c) => c.id === categoryId)?.label}`,
      },
      ...prev,
    ]);
    setAssetDraft({ label: "", url: "" });
    setActiveCategory(null);
  };

  const viewCycleDef = ENGAGEMENT_CYCLES.find((c) => c.number === viewCycle)!;
  /** Remove a custom (PM-added) deliverable from the engagement. Drops
   *  the row from the stage table, clears its deliverable state, logs an
   *  activity entry, and (for pods-v2 Clients) deletes any linked Tasks
   *  on the pod board so the same item doesn't keep appearing there.
   *  Audit-template rows aren't deletable, those are fixed CRO scaffolding. */
  const handleDeleteCustomDeliverable = (deliverableId: string) => {
    const target = customDeliverables.find((d) => d.id === deliverableId);
    if (!target) return;
    if (!confirm(`Remove "${target.name}" from the engagement? This drops the row and any pod-board task linked to it.`)) return;
    setCustomDeliverables((prev) => prev.filter((d) => d.id !== deliverableId));
    setDeliverables((prev) => {
      const next = new Map(prev);
      next.delete(deliverableId);
      return next;
    });
    setActivity((prev) => [
      {
        id: `act-${Date.now()}`,
        day: currentDay,
        actor: "You",
        action: `Removed '${target.name}' from Month ${target.cycle} ${target.stage}`,
      },
      ...prev,
    ]);
    /* Pods-v2 mirror: remove the matching Task(s). The deliverable id
     *  for pod-sourced clients is the Task.id (see engagement-from-pods),
     *  so deleteTask just works. Paired design+dev tasks share a
     *  paired_task_id, drop both halves when present. Locally-created
     *  engagements aren't backed by pod Tasks, the import resolves to a
     *  no-op there. */
    import("@/lib/pods-v2/data").then(
      ({ getTasks, deleteTask, getClientById }) => {
        if (!getClientById(engagement.id)) return;
        const tasks = getTasks();
        const main = tasks.find((t) => t.id === deliverableId);
        if (!main) return;
        deleteTask(main.id);
        if (main.paired_task_id) deleteTask(main.paired_task_id);
      },
    ).catch((err) => console.error("[engagements] delete deliverable pod sync failed:", err));
  };
  /** Calendar-day index from the engagement startDate. Used to translate
   *  a free-picked YYYY-MM-DD back into the engagement-template's
   *  working-day numbering so cycle + week placement still works. */
  const dayFromDate = (ymd: string): number => {
    const start = new Date(`${engagement.startDate}T12:00:00`);
    const end = new Date(`${ymd}T12:00:00`);
    const ms = end.getTime() - start.getTime();
    return Math.max(1, Math.floor(ms / 86400000) + 1);
  };
  /** YYYY-MM-DD string for a given engagement day-index. Reuses the
   *  existing dateForDay (above) which already handles the
   *  bucket-skip-weekends vs retainer-straight-calendar split. */
  const ymdForDay = (day: number): string => {
    const d = dateForDay(day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day2 = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day2}`;
  };
  const handleAddCustomDeliverable = () => {
    if (!addingDeliverableIn) return;
    const { type, label, owner, dueDate } = newDeliverableDraft;
    if (!type || !dueDate) return;
    /* Free-pick date path: translate the chosen calendar date back into
     *  the engagement-template's day index, then derive cycle + week
     *  from that. Lets a PM put a deliverable on any Thursday (or any
     *  other day for a rush / off-cadence one-off) while still keeping
     *  the deck and stage tables grouping it correctly. */
    const dueDayNum = dayFromDate(dueDate);
    const derivedCycle = cycleForDay(dueDayNum);
    const derivedWeek = weekInCycleForDay(dueDayNum);
    const typeLabel = PAGE_LABEL[type as PageType] ?? type;
    const variant = label.trim();
    const name = variant ? `${typeLabel} · ${variant}` : typeLabel;
    const newItem: CustomDeliverable = {
      id: `custom-${Date.now()}`,
      name,
      cycle: derivedCycle,
      stage: addingDeliverableIn.stage,
      weekInCycle: derivedWeek,
      owner,
      dueDay: dueDayNum,
    };
    setCustomDeliverables((prev) => [...prev, newItem]);
    setDeliverables((prev) => {
      const next = new Map(prev);
      next.set(newItem.id, { templateId: newItem.id, status: "todo" });
      return next;
    });
    setActivity((prev) => [
      {
        id: `act-${Date.now()}`,
        day: currentDay,
        actor: "You",
        action: `Added '${newItem.name}' to Month ${newItem.cycle} ${newItem.stage}`,
      },
      ...prev,
    ]);
    setAddingDeliverableIn(null);
    setNewDeliverableDraft({ type: "pdp", label: "", owner: "Pod", dueDate: "" });

    /* Write back: if this engagement is a pods-v2 Client, also create
     * the matching pod Task(s) so the pod board picks it up. Build /
     * design / development stages create a paired design + dev task pair
     * (mirrors how createProject seeds CE retainers). Test / audit
     * stages create a single task. Skipped silently for localStorage-
     * only engagements. */
    import("@/lib/pods-v2/data").then(
      ({
        getClientById,
        getProjectsForClient,
        createProject,
        addTask,
        addPairedTasks,
        podPointsForMonth,
        getPodById,
      }) => {
        const client = getClientById(engagement.id);
        if (!client) return;
        const pod = getPodById(client.pod_id);
        if (!pod) return;

        /* Find or create a Project for this client + cycle. */
        let project = getProjectsForClient(client.id).find(
          (p) => p.kickoff_date === engagement.startDate,
        );
        if (!project) {
          project = createProject({
            name: `${client.name} · Month ${newItem.cycle}`,
            client_id: client.id,
            pod_id: client.pod_id,
            pages: [],
            signoff_date: engagement.startDate,
            is_rush: false,
            brand_warm: client.brand_warm,
          });
        }

        /* Compute due_date from engagement startDate + dueDay (working
         * days for buckets, calendar days for retainers). */
        const dueDate = (() => {
          const d = new Date(engagement.startDate);
          if (engagement.kind === "bucket") {
            let added = 1;
            while (added < newItem.dueDay) {
              d.setDate(d.getDate() + 1);
              const wd = d.getDay();
              if (wd !== 0 && wd !== 6) added++;
            }
          } else {
            d.setDate(d.getDate() + (newItem.dueDay - 1));
          }
          return d.toISOString().slice(0, 10);
        })();

        const isBuildStage =
          newItem.stage === "build" ||
          newItem.stage === "design" ||
          newItem.stage === "development";

        if (isBuildStage) {
          /* Capacity check: warn if the assumed 3pt deliverable would
           * push the pod past its 40pt monthly cap. User can bypass. */
          const PRESUMED_POINTS = 3;
          const currentLoad = podPointsForMonth(pod.id, newItem.cycle);
          if (currentLoad + PRESUMED_POINTS > 40) {
            const proceed = window.confirm(
              `Pod ${engagement.podNumber} is at ${currentLoad}pt of 40pt this month. Adding this deliverable will push them to ${currentLoad + PRESUMED_POINTS}pt. Proceed anyway?`,
            );
            if (!proceed) return;
          }

          const designer = pod.members.find((m) => m.role === "primary_designer") ?? pod.members[0];
          const dev = pod.members.find((m) => m.role === "primary_dev") ?? pod.members[1] ?? pod.members[0];

          /* Design ships earlier than dev in the standard pair. For
           * buckets, design lands mid-cycle; dev lands at the bucket's
           * delivery Thursday. For retainers, use the user-supplied
           * dueDay for dev and back the design up by 5 working days. */
          const designDueDate = (() => {
            const d = new Date(engagement.startDate);
            if (engagement.kind === "bucket") {
              const targetWd = Math.max(1, newItem.dueDay - 5);
              let added = 1;
              while (added < targetWd) {
                d.setDate(d.getDate() + 1);
                const wd = d.getDay();
                if (wd !== 0 && wd !== 6) added++;
              }
            } else {
              d.setDate(d.getDate() + Math.max(0, newItem.dueDay - 6));
            }
            return d.toISOString().slice(0, 10);
          })();

          addPairedTasks({
            project_id: project.id,
            label: newItem.name,
            designer_id: designer?.id ?? "",
            dev_id: dev?.id ?? "",
            design_due_date: designDueDate,
            dev_due_date: dueDate,
            cycle: { month: newItem.cycle, week: newItem.weekInCycle },
            points: PRESUMED_POINTS,
          });
        } else {
          /* Single-task stages: test, audit. Assign to the role that
           * matches the engagement owner. */
          const roleMap: Record<string, string> = {
            Design: "primary_designer",
            Pod: "primary_dev",
            CRO: "cro_lead",
            PM: "primary_designer",
            Dylan: "primary_dev",
          };
          const targetRole = roleMap[newItem.owner] ?? "primary_dev";
          const member =
            pod.members.find((m) => m.role === targetRole) ?? pod.members[0];
          const discipline =
            newItem.owner === "Design"
              ? "design"
              : newItem.owner === "CRO"
                ? "strategy"
                : "development";

          addTask({
            project_id: project.id,
            title: newItem.name,
            type: "core_deliverable",
            discipline: discipline as "design" | "development" | "strategy",
            assigned_to: member?.id ?? "",
            due_date: dueDate,
            cycle: { month: newItem.cycle, week: newItem.weekInCycle },
          });
        }
      },
    );
  };

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          {inTeamRoute ? "Back to pods" : "All clients"}
        </Link>
        {!inTeamRoute && (
          <button
            type="button"
            onClick={() => {
              setDeleteTyped("");
              setDeleteStage("confirm-1");
            }}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-subtle hover:text-danger hover:bg-danger/10 px-2 py-1 rounded transition-colors"
          >
            <TrashIcon className="size-3" />
            Delete client
          </button>
        )}
      </div>

      {/* V2 engagement hero — label/value Field grid + monochrome StatusGlyph
          request rows (matches launchpad-v2-cards.html). The deep day/progress
          + interactive plan live in EngagementDeliveryPlan below. */}
      <EngagementCard engagement={engagement} />

      {/* Parked-engagement nudge. When the linked Client has no pod
       * assigned (engagement.podNumber === 0), the engagement is sat in
       * /pods-v2 purgatory. The PM needs to pick a pod via the
       * Assign-to-pod modal there to seed the build tasks. */}
      {engagement.podNumber === 0 && !inTeamRoute && (
        <section className="mb-5 rounded-lg border border-warning/20 bg-warning/10 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <ExclamationTriangleIcon className="size-4 text-warning shrink-0" />
            <div>
              <p className="text-[12px] font-semibold text-warning">
                Not assigned to a pod yet
              </p>
              <p className="text-[11px] text-warning mt-0.5">
                Pick a pod from purgatory to spin up the build tasks. The brief, intake, and roadmap are ready to go.
              </p>
            </div>
          </div>
          <Link
            href={podsHref}
            className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-white bg-warning hover:bg-warning px-3 py-1.5 rounded"
          >
            Assign to pod <ArrowTopRightOnSquareIcon className="size-3" />
          </Link>
        </section>
      )}

      {/* Metrics strip, single-row per metric: label · baseline · current · delta% */}
      {engagement.metrics && (engagement.metrics.cvrBaseline != null || engagement.metrics.aovBaseline != null) && (
        <section className="mb-5 rounded-lg border border-border bg-surface divide-y divide-border">
          <MetricRow
            label="Conversion rate"
            unit="%"
            baseline={engagement.metrics.cvrBaseline}
            current={engagement.metrics.cvrCurrent}
            precision={1}
          />
          <MetricRow
            label="Average order value"
            unit="£"
            unitPosition="prefix"
            baseline={engagement.metrics.aovBaseline}
            current={engagement.metrics.aovCurrent}
            precision={0}
          />
          {engagement.metrics.metricsUpdatedAt && (
            <div className="px-4 py-1.5 text-[10px] text-subtle">
              Updated {new Date(engagement.metrics.metricsUpdatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </div>
          )}
        </section>
      )}

      <MustDosRow
        mustDos={mustDos}
        openGate={openMustDo}
        onOpen={(key) => setOpenMustDo(key)}
        onClose={() => setOpenMustDo(null)}
        onSave={handleSaveMustDo}
      />

      {useTabs && (
        <div className="mb-5 flex gap-1 border-b border-border">
          {(["strategy", "build", "results"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2 text-[13px] font-medium capitalize transition-colors ${
                tab === t
                  ? "border-foreground text-foreground"
                  : "border-transparent text-subtle hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div hidden={useTabs && tab !== "strategy"}>
      {/* Per-client delivery plan — retainer Month-1 conversion plan (VIP,
          30 days very visible) or sprint phase timeline. Padding-aware. */}
      <EngagementDeliveryPlan
        customDeliverables={customDeliverables}
        kind={engagement.kind}
        currentDay={currentDay}
        startDate={engagement.startDate}
      />

      <BriefIntakePanel
        brief={brief}
        intake={intake}
        open={intakeOpen}
        onToggle={() => setIntakeOpen((o) => !o)}
      />

      <StrategySandbox clientId={engagement.id} clientName={engagement.brand} />

      {/* Scoped deliverables preview. When the engagement is parked
       * (no project yet, customDeliverables empty) but the PM has
       * already scoped pages in the inbox, show that list here so it's
       * visible on the engagement page before pod assignment seeds the
       * actual tasks. Once a pod is assigned, the regular cycle tables
       * render below and this preview disappears. */}
      {customDeliverables.length === 0 && (intake?.deliverables?.length ?? 0) > 0 && (
        <section className="mb-5 rounded-lg border border-border bg-surface">
          <div className="px-4 py-3 border-b border-border flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
              Scoped deliverables
            </span>
            <span className="text-[10px] text-subtle tabular-nums">
              {intake!.deliverables!.length} {intake!.deliverables!.length === 1 ? "item" : "items"} · awaiting pod assignment
            </span>
          </div>
          <ul className="divide-y divide-border">
            {intake!.deliverables!.map((d, i) => {
              const typeLabel = PAGE_LABEL[d.type as PageType] ?? d.type;
              return (
                <li key={d.id} className="px-4 py-2.5 flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[10px] font-semibold tabular-nums text-subtle w-4">
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-medium text-foreground">{typeLabel}</span>
                    {d.label?.trim() && (
                      <span className="text-[12px] text-muted">· {d.label.trim()}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    Pending pod
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-2.5 bg-background text-[11px] text-muted flex items-baseline justify-between">
            <span>Delivery dates lock in when a pod is assigned.</span>
            {!inTeamRoute && (
              <Link href={podsHref} className="font-medium text-foreground hover:underline">
                Open purgatory →
              </Link>
            )}
          </div>
        </section>
      )}
      </div>

      <div hidden={useTabs && tab !== "build"}>
      {/* Cycle tabs - pills · only render for retainers (buckets have one cycle) */}
      {engagement.kind === "retainer" && (
      <section className="mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          {cycleStats.map(({ cycle, total, done, blocked, state }) => {
            const isActive = state === "active";
            const isComplete = state === "complete";
            const isView = viewCycle === cycle.number;
            const statusDot = isActive ? "bg-success" : isComplete ? "bg-muted" : "bg-border";
            return (
              <button
                key={cycle.number}
                onClick={() => setViewCycle(cycle.number)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                  isView
                    ? "border-foreground bg-foreground text-surface"
                    : "border-border bg-surface text-foreground hover:border-foreground"
                }`}
              >
                <span className={`size-1.5 rounded-full ${statusDot}`} />
                <span className="text-[12px] font-semibold">{cycle.name}</span>
                <span className={`text-[11px] tabular-nums ${isView ? "text-surface/70" : "text-subtle"}`}>
                  {done}/{total}
                </span>
                {blocked > 0 && (
                  <span className={`size-1.5 rounded-full ${isView ? "bg-danger" : "bg-danger"}`} title={`${blocked} blocked`} />
                )}
              </button>
            );
          })}
        </div>
      </section>
      )}

      {/* Active cycle detail - deliverables grouped by stage */}
      <section className="mb-6">
        <div className="space-y-5">
          {STAGES.map((stage) => {
            const stageDeliverables = deliverablesForCycleStage(viewCycle, stage.id);
            const stageDone = stageDeliverables.filter((d) => (deliverables.get(d.id)?.status ?? "todo") === "done").length;
            const isCurrentStage = viewCycle === currentCycle && stage.id === currentStage;
            const canAdd = stage.id !== "audit";
            const isAddingHere = addingDeliverableIn?.cycle === viewCycle && addingDeliverableIn?.stage === stage.id;
            return (
              <div key={stage.id}>
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[12px] font-semibold text-foreground tracking-wider uppercase">
                      {stage.name}
                    </h3>
                    {stage.id !== "test" && stage.id !== "testing" && (
                      <span className="text-[10px] text-subtle">
                        {stage.weeks.length === 1
                          ? `W${stage.weeks[0]}`
                          : `W${stage.weeks[0]}-${stage.weeks[stage.weeks.length - 1]}`}
                      </span>
                    )}
                    {isCurrentStage && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white bg-success px-1.5 py-0.5 rounded">
                        Now
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-subtle tabular-nums">
                      <span className="font-semibold text-foreground">{stageDone}</span>/{stageDeliverables.length} done
                    </span>
                    {canAdd && !isAddingHere && (
                      <button
                        onClick={() => {
                          /* Default the date picker to the W3 Thursday
                           *  of the currently-viewed cycle so the form
                           *  opens with a sensible cadence-aligned date
                           *  that the PM can leave alone or override. */
                          const defaultDay = (viewCycle - 1) * 30 + 2 * 7 + 4;
                          setNewDeliverableDraft({
                            type: "pdp",
                            label: "",
                            owner: "Pod",
                            dueDate: ymdForDay(defaultDay),
                          });
                          setAddingDeliverableIn({ cycle: viewCycle, stage: stage.id as Exclude<StageId, "audit"> });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground"
                      >
                        <PlusIcon className="size-3" />
                        Add
                      </button>
                    )}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-surface overflow-hidden">
                  {stageDeliverables.length > 0 && (
                    <div className="grid grid-cols-[24px_minmax(0,1.4fr)_70px_170px_minmax(0,1fr)] items-center gap-3 px-3 py-1.5 bg-background border-b border-border text-[10px] font-semibold uppercase tracking-wider text-subtle">
                      <span></span>
                      <span>Deliverable</span>
                      <span>Owner</span>
                      <span>Due</span>
                      <span className="text-right">Doc / link</span>
                    </div>
                  )}
                  {stageDeliverables.map((d, idx) => {
                    const state = deliverables.get(d.id) ?? { templateId: d.id, status: "todo" as DeliverableStatus };
                    const overdue = state.status !== "done" && d.dueDay < currentDay;
                    const isAddingLink = addingLinkFor === d.id;
                    const due = formatDueDate(d.dueDay);
                    const meta = state.artefactUrl ? docMeta(state.artefactUrl) : null;
                    const dotStyle: Record<DeliverableStatus, string> = {
                      done: "bg-success border-success",
                      in_progress: "bg-warning border-warning",
                      blocked: "bg-danger border-danger",
                      todo: "bg-surface border-subtle",
                    };
                    const custom = customDeliverables.find((cd) => cd.id === d.id);
                    const currentPhase = custom?.phase;
                    const currentPhaseMeta = currentPhase ? phaseMeta(currentPhase) : null;
                    const phaseHistory = custom?.phaseHistory;
                    const hasPhaseHistory = (phaseHistory?.length ?? 0) > 0;
                    const timelineOpen = expandedTimeline === d.id;

                    return (
                      <div key={d.id}>
                      <div
                        className={`group grid grid-cols-[24px_minmax(0,1.4fr)_70px_170px_minmax(0,1fr)] items-center gap-3 px-3 py-2 ${
                          idx > 0 ? "border-t border-border" : ""
                        } ${state.status === "done" ? "bg-background" : ""}`}
                      >
                        {/* Status dot */}
                        <button
                          onClick={() => handleCycleStatus(d.id)}
                          title={state.status.replace("_", " ")}
                          className={`size-3.5 rounded-full border-2 transition-all hover:scale-110 ${dotStyle[state.status]}`}
                        />

                        {/* Name + blocker note inline */}
                        <div className="min-w-0">
                          <p
                            className={`text-[13px] truncate ${
                              state.status === "done"
                                ? "text-subtle line-through"
                                : "text-foreground font-medium"
                            }`}
                          >
                            {d.name}
                          </p>
                          {state.status === "blocked" && state.blockerNote && (
                            <p className="text-[11px] text-danger truncate flex items-center gap-1 mt-0.5">
                              <ExclamationTriangleIcon className="size-3 shrink-0" />
                              {state.blockerNote}
                            </p>
                          )}
                          {(() => {
                            // Phase pill + test chip render only on custom deliverables.
                            // QA gates were lifted out to a project-level Must dos row 2026-05-14.
                            if (stage.id === "audit") return null;
                            if (!custom) return null;
                            const test = custom.testResult;
                            if (!test && !currentPhaseMeta && !hasPhaseHistory) return null;
                            return (
                              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                {currentPhaseMeta && (
                                  <button
                                    onClick={() => setExpandedTimeline(timelineOpen ? null : d.id)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border hover:opacity-80 transition-opacity"
                                    style={{ background: currentPhaseMeta.bg, color: currentPhaseMeta.color, borderColor: currentPhaseMeta.bg }}
                                    title={hasPhaseHistory ? "View phase timeline" : currentPhaseMeta.label}
                                  >
                                    {currentPhaseMeta.label}
                                    {hasPhaseHistory && (
                                      <span className="text-[8px] opacity-70">
                                        {timelineOpen ? "▴" : "▾"}
                                      </span>
                                    )}
                                  </button>
                                )}
                                {test && (() => {
                                  const styles: Record<string, { bg: string; fg: string; label: string }> = {
                                    pending: { bg: "#F5F5F5", fg: "#666", label: "Test pending" },
                                    winner: { bg: "#E8F5E9", fg: "#1B5E20", label: `Winner${test.liftPct != null ? ` +${test.liftPct}%` : ""}` },
                                    loser: { bg: "#FFEBEE", fg: "#C62828", label: `Loser${test.liftPct != null ? ` ${test.liftPct}%` : ""}` },
                                    inconclusive: { bg: "#F5F5F5", fg: "#666", label: "Inconclusive" },
                                  };
                                  const s = styles[test.status];
                                  return (
                                    <span
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                      style={{ background: s.bg, color: s.fg }}
                                      title={test.significancePct != null ? `${test.significancePct}% sig${test.notes ? `. ${test.notes}` : ""}` : test.notes ?? undefined}
                                    >
                                      {s.label}
                                    </span>
                                  );
                                })()}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Owner · hover shows specific assigned PodMember when known */}
                        {(() => {
                          const isCustomRow = stage.id !== "audit";
                          const assigneeName = isCustomRow
                            ? customDeliverables.find((cd) => cd.id === d.id)?.assigneeName
                            : undefined;
                          const tooltip = assigneeName
                            ? `${assigneeName} · ${d.owner === "Pod" ? `Pod ${engagement.podNumber}` : d.owner}`
                            : undefined;
                          return (
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider text-muted bg-surface-raised px-1.5 py-0.5 rounded justify-self-start ${
                                assigneeName ? "cursor-help" : ""
                              }`}
                              title={tooltip}
                            >
                              {d.owner === "Pod" ? `Pod ${engagement.podNumber}` : d.owner}
                            </span>
                          );
                        })()}

                        {/* Due date */}
                        <span className={`text-[12px] tabular-nums flex items-center gap-1.5 ${overdue ? "text-danger font-semibold" : "text-muted"}`}>
                          <span className="whitespace-nowrap">{due.weekday} {due.day} {due.month}</span>
                          {overdue && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-white bg-danger px-1.5 py-0.5 rounded">
                              Overdue
                            </span>
                          )}
                        </span>

                        {/* Doc / link cell */}
                        <div className="min-w-0 flex items-center gap-2 justify-end">
                          {isAddingLink ? (
                            <>
                              <input
                                value={linkDraft}
                                onChange={(e) => setLinkDraft(e.target.value)}
                                placeholder="Paste URL..."
                                className="flex-1 min-w-0 text-[12px] px-2 py-1 border border-border rounded focus:outline-none bg-surface"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  if (!linkDraft.trim()) return;
                                  if (state.status === "done") handleReplaceLink(d.id, linkDraft);
                                  else handleMarkDone(d.id, linkDraft);
                                }}
                                disabled={!linkDraft.trim()}
                                className="shrink-0 text-[11px] font-semibold text-surface bg-foreground hover:bg-foreground px-2 py-1 rounded disabled:opacity-50"
                              >
                                {state.status === "done" ? "Save" : "Attach"}
                              </button>
                              <button
                                onClick={() => { setAddingLinkFor(null); setLinkDraft(""); }}
                                className="shrink-0 text-[14px] text-subtle hover:text-foreground leading-none"
                              >
                                ×
                              </button>
                            </>
                          ) : meta ? (
                            <>
                              <span
                                className="shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold"
                                style={{ background: meta.badgeBg, color: meta.badgeFg }}
                              >
                                {meta.badge}
                              </span>
                              <span className="flex-1 min-w-0 text-[12px] text-muted truncate">{meta.hostname}</span>
                              <a
                                href={meta.viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline"
                              >
                                <EyeIcon className="size-3" />
                                View
                              </a>
                              {meta.downloadUrl && (
                                <a
                                  href={meta.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-muted hover:text-foreground"
                                  title="Download"
                                >
                                  <ArrowDownTrayIcon className="size-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => { setAddingLinkFor(d.id); setLinkDraft(""); }}
                                className="shrink-0 text-subtle hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Replace link"
                              >
                                <LinkIcon className="size-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => { setAddingLinkFor(d.id); setLinkDraft(""); }}
                              className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground"
                            >
                              <PlusIcon className="size-3" />
                              Attach
                            </button>
                          )}
                          {/* Delete · custom deliverables only. Audit
                           *   template rows aren't user-removable. */}
                          {stage.id !== "audit" && customDeliverables.some((cd) => cd.id === d.id) && (
                            <button
                              onClick={() => handleDeleteCustomDeliverable(d.id)}
                              className="shrink-0 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove deliverable"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {timelineOpen && hasPhaseHistory && (
                        <div className="px-3 py-3 border-t border-border bg-surface-raised">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">
                            Phase timeline
                          </p>
                          <PhaseTimeline history={phaseHistory} compact />
                        </div>
                      )}
                      </div>
                    );
                  })}
                  {stageDeliverables.length === 0 && (
                    <p className="text-[12px] text-subtle italic px-3 py-3">
                      {(() => {
                        switch (stage.id) {
                          case "audit": return "No deliverables.";
                          case "build": return `No build deliverables yet. Defined by the Month ${viewCycle} build brief.`;
                          case "test": return "No tests yet. Defined by what shipped this cycle.";
                          case "design": return "No design deliverables yet. Defined by the brief.";
                          case "development": return "No development deliverables yet. Added once design is signed off.";
                          case "testing": return "No tests yet. Added once a build ships.";
                          default: return "No deliverables yet.";
                        }
                      })()}
                    </p>
                  )}
                </div>

                {canAdd && isAddingHere && (
                  <div className="mt-3 rounded-md border border-border bg-surface p-3 space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        value={newDeliverableDraft.type}
                        onChange={(e) => setNewDeliverableDraft((d) => ({ ...d, type: e.target.value }))}
                        className="text-[12px] px-2 py-1.5 border border-border rounded focus:outline-none focus:border-foreground bg-surface"
                        autoFocus
                      >
                        {(Object.keys(PAGE_LABEL) as PageType[]).map((t) => (
                          <option key={t} value={t}>{PAGE_LABEL[t]}</option>
                        ))}
                      </select>
                      <input
                        value={newDeliverableDraft.label}
                        onChange={(e) => setNewDeliverableDraft((d) => ({ ...d, label: e.target.value }))}
                        placeholder="Variant label (optional, e.g. Whitening Strips)"
                        className="flex-1 min-w-[180px] text-[12px] px-2 py-1.5 border border-border rounded focus:outline-none focus:border-foreground"
                      />
                      <select
                        value={newDeliverableDraft.owner}
                        onChange={(e) => setNewDeliverableDraft((d) => ({ ...d, owner: e.target.value as OwnerRole }))}
                        className="text-[12px] px-2 py-1.5 border border-border rounded focus:outline-none focus:border-foreground bg-surface"
                      >
                        <option value="Pod">Pod</option>
                        <option value="Design">Design</option>
                        <option value="CRO">CRO</option>
                        <option value="PM">PM</option>
                        <option value="Dylan">Dylan</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Lands on</span>
                        <input
                          type="date"
                          value={newDeliverableDraft.dueDate}
                          onChange={(e) => setNewDeliverableDraft((d) => ({ ...d, dueDate: e.target.value }))}
                          className="text-[12px] px-2 py-1.5 border border-border rounded focus:outline-none focus:border-foreground bg-surface"
                        />
                        {newDeliverableDraft.dueDate && (() => {
                          /* Live preview so the PM can see which Month
                           *  + Week the picked date will slot into. */
                          const previewDay = dayFromDate(newDeliverableDraft.dueDate);
                          const previewCycle = cycleForDay(previewDay);
                          const previewWeek = weekInCycleForDay(previewDay);
                          return (
                            <span className="text-[10px] text-subtle">
                              (M{previewCycle} W{previewWeek} · day {previewDay})
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setAddingDeliverableIn(null); setNewDeliverableDraft({ type: "pdp", label: "", owner: "Pod", dueDate: "" }); }}
                          className="text-[11px] text-subtle hover:text-foreground px-2 py-1.5"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddCustomDeliverable}
                          disabled={!newDeliverableDraft.type || !newDeliverableDraft.dueDate}
                          className="text-[12px] font-semibold text-surface bg-foreground hover:bg-foreground px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add deliverable
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      </div>

      <div hidden={useTabs && tab !== "results"}>
      {/* Wins log, manual entries only. Add via the button; auto-derive
       * from test_result winners removed 2026-05-14 because the wins
       * appeared from nowhere with no clear input path. */}
      <section className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
            Wins
          </h2>
          <button
            onClick={() => setAddingWin(true)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground"
          >
            <PlusIcon className="size-3" />
            Add win
          </button>
        </div>
        {addingWin && (
          <div className="mb-3 rounded-md border border-border bg-surface p-3 space-y-2">
            <input
              autoFocus
              value={winDraft.title}
              onChange={(e) => setWinDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="What shipped (e.g. New PDP layout, hero variant B)"
              className="w-full text-[13px] px-2 py-1.5 border border-border rounded focus:outline-none focus:border-foreground"
            />
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <input
                value={winDraft.metric}
                onChange={(e) => setWinDraft((d) => ({ ...d, metric: e.target.value }))}
                placeholder="Impact (e.g. +18% CVR, £4.2K extra MRR)"
                className="text-[12px] px-2 py-1.5 border border-border rounded focus:outline-none focus:border-foreground"
              />
              <input
                value={winDraft.day}
                onChange={(e) => setWinDraft((d) => ({ ...d, day: e.target.value }))}
                placeholder={`Day (current: ${currentDay})`}
                inputMode="numeric"
                className="text-[12px] px-2 py-1.5 border border-border rounded focus:outline-none focus:border-foreground tabular-nums"
              />
            </div>
            <textarea
              value={winDraft.notes}
              onChange={(e) => setWinDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full text-[12px] px-2 py-1.5 border border-border rounded focus:outline-none focus:border-foreground resize-y"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setAddingWin(false); setWinDraft({ title: "", metric: "", day: "", notes: "" }); }}
                className="text-[11px] text-subtle hover:text-foreground px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWin}
                disabled={!winDraft.title.trim()}
                className="text-[11px] font-semibold text-surface bg-foreground hover:bg-foreground px-3 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save win
              </button>
            </div>
          </div>
        )}
        {wins.length > 0 ? (
          <div className="rounded-md border border-border bg-surface overflow-hidden">
            {wins
              .slice()
              .sort((a, b) => b.shippedAtDay - a.shippedAtDay)
              .map((win, idx) => (
                <div
                  key={win.id}
                  className={`px-4 py-3 ${idx > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <h4 className="text-[13px] font-semibold text-foreground">
                      {win.title}
                    </h4>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle tabular-nums shrink-0">
                      Day {win.shippedAtDay}
                    </span>
                  </div>
                  {win.metric && (
                    <p className="inline-flex items-center text-[11px] font-semibold text-success bg-success/15 px-1.5 py-0.5 rounded mb-1">
                      {win.metric}
                    </p>
                  )}
                  {win.notes && (
                    <p className="text-[12px] text-muted leading-snug">{win.notes}</p>
                  )}
                </div>
              ))}
          </div>
        ) : !addingWin && (
          <p className="text-[12px] text-subtle italic">No wins logged yet. Click Add win to record one.</p>
        )}
      </section>
      </div>

      <div hidden={useTabs && tab !== "strategy"}>
      <GeneratedDocs engagementId={engagement.id} />

      {/* Resources - card grid with populated / empty states · scoped to active cycle */}
      <section className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
            Resources{engagement.kind === "retainer" && <span className="text-foreground"> · {viewCycleDef.name}</span>}
          </h2>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="text-[10px] text-subtle hover:text-foreground"
            >
              Close
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ASSET_CATEGORIES.map((cat) => {
            const items = assets.filter((a) => a.category === cat.id && a.cycle === viewCycle);
            const populated = items.length > 0;
            const latest = populated ? items[items.length - 1] : null;
            const meta = latest ? docMeta(latest.url) : null;
            return (
              <div
                key={cat.id}
                className={`rounded-lg border p-4 transition-all flex flex-col bg-surface ${
                  populated
                    ? "border-border hover:border-foreground"
                    : "border border-dashed border-border hover:border-foreground"
                }`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                    {cat.label}
                  </p>
                  {populated ? (
                    <span className="text-[10px] font-semibold text-muted tabular-nums">
                      {items.length} {items.length === 1 ? "link" : "links"}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-subtle">Not added yet</span>
                  )}
                </div>
                <p className="text-[12px] text-muted leading-snug mb-3">{cat.description}</p>

                {populated && latest && meta && (
                  <a
                    href={meta.viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-border bg-surface hover:bg-surface-raised px-2 py-1.5 flex items-center gap-2 transition-colors mb-2"
                  >
                    <span
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                      style={{ background: meta.badgeBg, color: meta.badgeFg }}
                    >
                      {meta.badge}
                    </span>
                    <span className="flex-1 min-w-0 text-[12px] text-foreground truncate">
                      {latest.label}
                    </span>
                    <ArrowTopRightOnSquareIcon className="size-3 text-subtle shrink-0" />
                  </a>
                )}

                <div className="mt-auto flex items-center gap-2 pt-1">
                  {populated && items.length > 1 && (
                    <button
                      onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                      className="text-[12px] font-medium text-muted hover:text-foreground"
                    >
                      View all {items.length}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                    className={`inline-flex items-center gap-1 text-[12px] font-semibold ml-auto px-2 py-1 rounded transition-colors ${
                      populated
                        ? "text-muted hover:text-foreground font-medium"
                        : "text-surface bg-foreground hover:bg-foreground"
                    }`}
                  >
                    <PlusIcon className="size-3" />
                    {populated ? "Add" : `Add ${cat.label}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {activeCategory && (() => {
          const cat = ASSET_CATEGORIES.find((c) => c.id === activeCategory)!;
          const items = assets.filter((a) => a.category === activeCategory && a.cycle === viewCycle);
          return (
            <div className="mt-3 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[12px] font-semibold text-foreground">{cat.label}{engagement.kind === "retainer" ? ` - ${viewCycleDef.name} links` : " links"}</p>
                <p className="text-[12px] text-muted">{cat.description}</p>
              </div>
              <div className="space-y-1">
                {items.length === 0 && (
                  <p className="text-[12px] text-subtle italic py-1">No links yet.</p>
                )}
                {items.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[12px] text-foreground hover:bg-surface-raised -mx-2 px-2 py-1 rounded"
                  >
                    <LinkIcon className="size-3 shrink-0 text-subtle" />
                    <span className="flex-1 truncate">{a.label}</span>
                    <span className="text-[10px] text-subtle shrink-0">
                      {a.addedBy} · Day {a.addedAtDay}
                    </span>
                    <ArrowTopRightOnSquareIcon className="size-3 text-subtle shrink-0" />
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                <input
                  value={assetDraft.label}
                  onChange={(e) => setAssetDraft((d) => ({ ...d, label: e.target.value }))}
                  placeholder="Label"
                  className="w-40 text-[12px] px-2 py-1 border border-border rounded focus:outline-none focus:border-foreground"
                />
                <input
                  value={assetDraft.url}
                  onChange={(e) => setAssetDraft((d) => ({ ...d, url: e.target.value }))}
                  placeholder="https://..."
                  className="flex-1 text-[12px] px-2 py-1 border border-border rounded focus:outline-none focus:border-foreground"
                />
                <button
                  onClick={() => handleAddAsset(activeCategory)}
                  className="text-[10px] font-semibold text-surface bg-foreground px-2 py-1 rounded hover:bg-foreground inline-flex items-center gap-1"
                >
                  <PlusIcon className="size-3" />
                  Add
                </button>
              </div>
            </div>
          );
        })()}
      </section>
      </div>

      <div hidden={useTabs && tab !== "results"}>
      {/* Notes · timestamped log for ad-hoc context the PM / pod want
       *  to capture: client decisions, blocker recaps, "asked for X on
       *  Slack", etc. Persists to the pods-v2 Client.notes array for
       *  pod-sourced engagements; locally-only engagements keep the
       *  log in component state. */}
      <section className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
            Notes ({notes.length})
          </h2>
        </div>
        <div className="rounded-lg border border-border bg-surface">
          <div className="p-3 border-b border-border">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => {
                /* Cmd/Ctrl + Enter to submit, matches the rest of the
                 *  app's free-text inputs. */
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
              placeholder="Drop a note (decisions, blockers, client asks). Cmd+Enter to save."
              className="w-full text-[13px] px-3 py-2 border border-border rounded resize-y min-h-[60px] focus:outline-none focus:border-foreground placeholder:text-muted"
            />
            <div className="mt-2 flex items-center justify-end">
              <button
                onClick={handleAddNote}
                disabled={!noteDraft.trim()}
                className="text-[12px] font-semibold text-surface bg-foreground hover:bg-foreground px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add note
              </button>
            </div>
          </div>
          {notes.length === 0 ? (
            <p className="text-[12px] text-subtle p-4 italic">No notes yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {notes.map((n) => {
                const dt = new Date(n.created_at);
                const datePart = dt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const timePart = dt.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <li key={n.id} className="group px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle tabular-nums">
                        {datePart} · {timePart}
                        {n.author ? ` · ${n.author}` : ""}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-[10px] text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete note"
                      >
                        <TrashIcon className="size-3" />
                      </button>
                    </div>
                    <p className="text-[13px] text-foreground whitespace-pre-wrap leading-relaxed">
                      {n.content}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Activity feed */}
      <section className="mb-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-3">
          Activity
        </h2>
        <div className="rounded-lg border border-border bg-surface">
          {activity.length === 0 ? (
            <p className="text-[12px] text-subtle p-4 italic">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {activity.slice(0, 5).map((a) => (
                <li key={a.id} className="px-4 py-2.5 flex items-baseline gap-3 text-[12px]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle tabular-nums shrink-0 w-12">
                    Day {a.day}
                  </span>
                  <span className="font-semibold text-foreground shrink-0">{a.actor}</span>
                  <span className="text-muted flex-1 truncate">{a.action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>

      {/* Delete client, two-step confirmation. Stage one is a plain
       *  modal with a Continue button; stage two requires typing the
       *  brand name so a slip of the trash button can't nuke a client
       *  by accident. Trashed clients land in /engagements/trash and
       *  can be restored from there. */}
      {deleteStage !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeleteStage("closed")}
        >
          <div
            className="w-full max-w-md rounded-lg bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {deleteStage === "confirm-1" ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-danger">
                  Step 1 of 2
                </p>
                <h2 className="text-[16px] font-semibold text-foreground mt-1">
                  Move {engagement.brand} to trash?
                </h2>
                <p className="text-[13px] text-muted mt-2 leading-relaxed">
                  This removes the client from the engagements list and the pod board. Linked projects, tasks, brief, and metrics travel with it. You can restore from{" "}
                  <span className="font-semibold text-foreground">Engagements, Trash</span>{" "}
                  any time.
                </p>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStage("closed")}
                    className="text-[12px] font-medium text-muted hover:text-foreground px-3 py-2 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStage("confirm-2")}
                    className="text-[12px] font-semibold text-white bg-danger hover:bg-danger px-3 py-2 rounded"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-danger">
                  Step 2 of 2
                </p>
                <h2 className="text-[16px] font-semibold text-foreground mt-1">
                  Type the client name to confirm
                </h2>
                <p className="text-[13px] text-muted mt-2 leading-relaxed">
                  Type{" "}
                  <span className="font-semibold text-foreground">
                    {engagement.brand}
                  </span>{" "}
                  exactly to move this engagement to trash.
                </p>
                <input
                  type="text"
                  value={deleteTyped}
                  onChange={(e) => setDeleteTyped(e.target.value)}
                  autoFocus
                  className="mt-3 w-full rounded border border-border px-3 py-2 text-[13px] focus:border-danger focus:outline-none"
                  placeholder={engagement.brand}
                />
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStage("closed")}
                    className="text-[12px] font-medium text-muted hover:text-foreground px-3 py-2 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteTyped.trim() !== engagement.brand}
                    onClick={handleConfirmDelete}
                    className="text-[12px] font-semibold text-white bg-danger hover:bg-danger disabled:bg-border disabled:text-subtle disabled:cursor-not-allowed px-3 py-2 rounded"
                  >
                    Move to trash
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label,
  unit,
  unitPosition = "suffix",
  baseline,
  current,
  precision = 1,
}: {
  label: string;
  unit: string;
  unitPosition?: "prefix" | "suffix";
  baseline?: number;
  current?: number;
  precision?: number;
}) {
  const fmt = (n: number) => {
    const s = n.toFixed(precision);
    return unitPosition === "prefix" ? `${unit}${s}` : `${s}${unit}`;
  };
  const hasBoth = baseline != null && current != null;
  const delta = hasBoth ? current - baseline : null;
  const deltaPct = hasBoth && baseline !== 0 ? (delta! / baseline) * 100 : null;
  const positive = delta != null && delta > 0;
  const negative = delta != null && delta < 0;

  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] items-baseline gap-3 px-4 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">Base</span>
        <span className="text-[13px] font-medium tabular-nums text-muted">
          {baseline != null ? fmt(baseline) : "-"}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">Now</span>
        <span className="text-[14px] font-semibold tabular-nums text-foreground">
          {current != null ? fmt(current) : "-"}
        </span>
      </div>
      <div className="flex items-baseline gap-2 justify-end tabular-nums">
        {delta != null ? (
          <>
            <span className={`text-[12px] font-semibold ${positive ? "text-success" : negative ? "text-danger" : "text-muted"}`}>
              {positive ? "+" : ""}{fmt(delta)}
            </span>
            {deltaPct != null && (
              <span className={`text-[11px] font-medium ${positive ? "text-success" : negative ? "text-danger" : "text-subtle"}`}>
                ({positive ? "+" : ""}{deltaPct.toFixed(0)}%)
              </span>
            )}
          </>
        ) : (
          <span className="text-[12px] text-muted">-</span>
        )}
      </div>
    </div>
  );
}

