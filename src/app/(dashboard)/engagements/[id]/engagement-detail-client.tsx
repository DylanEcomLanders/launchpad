"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PencilSquareIcon,
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import {
  BRIEF_FIELDS,
  BUCKETS,
  ENGAGEMENT_CYCLES,
  ENGAGEMENT_DELIVERABLES,
  QA_GATE_LABEL,
  assetCategoriesForKind,
  cycleForDay,
  ownerColor,
  stageForDay,
  stagesForKind,
  weekInCycleForDay,
  type CustomDeliverable,
  type CycleNumber,
  type DeliverableStatus,
  type EngagementBrief,
  type OwnerRole,
  type QAGateKey,
  type StageId,
  type WeekInCycle,
} from "@/lib/engagement-template";
import type {
  EngagementActivity,
  EngagementAsset,
  EngagementDeliverableState,
  MockEngagement,
} from "@/lib/engagement-mocks";

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
  const [brief, setBrief] = useState<EngagementBrief>(engagement.brief);
  const [briefOpen, setBriefOpen] = useState(false);
  const [editingBriefField, setEditingBriefField] = useState<keyof EngagementBrief | null>(null);
  const [briefDraft, setBriefDraft] = useState<string>("");
  const [customDeliverables, setCustomDeliverables] = useState<CustomDeliverable[]>(engagement.customDeliverables);
  const [assets, setAssets] = useState<EngagementAsset[]>(engagement.assets);
  const [activity, setActivity] = useState<EngagementActivity[]>(engagement.activity);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addingLinkFor, setAddingLinkFor] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [assetDraft, setAssetDraft] = useState({ label: "", url: "" });
  const [viewCycle, setViewCycle] = useState<CycleNumber>(() => cycleForDay(engagement.currentDay));
  const [addingDeliverableIn, setAddingDeliverableIn] = useState<{ cycle: CycleNumber; stage: Exclude<StageId, "audit"> } | null>(null);
  const [newDeliverableDraft, setNewDeliverableDraft] = useState<{ name: string; owner: OwnerRole; dueDay: string }>({ name: "", owner: "Pod", dueDay: "" });

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
   * kickoff Monday — skip weekends when resolving to a calendar date.
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

  const handleSaveBriefField = (key: keyof EngagementBrief) => {
    const trimmed = briefDraft.trim();
    const nextBrief: EngagementBrief = { ...brief, [key]: trimmed || undefined };
    setBrief(nextBrief);
    setEditingBriefField(null);
    setBriefDraft("");
    /* Persist back to the pods-v2 Client row so the brief survives a
     * reload + shows up on every device. Falls through silently when this
     * isn't a pods-v2 Client (e.g. a localStorage-only engagement created
     * before the bridge landed). */
    import("@/lib/pods-v2/data").then(({ getClientById, updateClientBrief }) => {
      const exists = getClientById(engagement.id);
      if (exists) updateClientBrief(engagement.id, nextBrief);
    });
  };

  const startEditingBriefField = (key: keyof EngagementBrief) => {
    setBriefDraft(brief[key] ?? "");
    setEditingBriefField(key);
  };

  const handleToggleGate = (templateId: string, gateKey: QAGateKey) => {
    setCustomDeliverables((prev) =>
      prev.map((cd) =>
        cd.id === templateId
          ? { ...cd, gates: { ...(cd.gates ?? {}), [gateKey]: !(cd.gates?.[gateKey] ?? false) } }
          : cd,
      ),
    );
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
  const handleAddCustomDeliverable = () => {
    if (!addingDeliverableIn) return;
    const dueDayNum = parseInt(newDeliverableDraft.dueDay, 10);
    if (!newDeliverableDraft.name.trim() || isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 90) return;
    const week = weekInCycleForDay(dueDayNum) as WeekInCycle;
    const newItem: CustomDeliverable = {
      id: `custom-${Date.now()}`,
      name: newDeliverableDraft.name.trim(),
      cycle: addingDeliverableIn.cycle,
      stage: addingDeliverableIn.stage,
      weekInCycle: week,
      owner: newDeliverableDraft.owner,
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
    setNewDeliverableDraft({ name: "", owner: "Pod", dueDay: "" });

    /* Write back: if this engagement is a pods-v2 Client, also create
     * the matching pod Task so the pod board picks it up. Skipped silently
     * for localStorage-only engagements. */
    import("@/lib/pods-v2/data").then(
      ({ getClientById, getProjectsForClient, createProject, addTask, getPodById }) => {
        const client = getClientById(engagement.id);
        if (!client) return;
        const pod = getPodById(client.pod_id);
        if (!pod) return;

        /* Find or create a Project for this client + cycle. We use one
         * Project per cycle as a rough grouping; refine later if a cycle
         * spans multiple parallel builds. */
        let project = getProjectsForClient(client.id).find(
          (p) => p.kickoff_date === engagement.startDate,
        );
        if (!project) {
          project = createProject({
            name: `${client.name} · Month ${newItem.cycle}`,
            client_id: client.id,
            pod_id: client.pod_id,
            bucket: engagement.bucket ?? "Bespoke",
            kickoff_date: engagement.startDate,
            is_rush: false,
            pages: [],
          });
        }

        /* Map engagement owner → pods-v2 discipline + assigned PodMember.
         * Design → primary_designer · Pod → primary_dev · CRO → cro_lead.
         * Falls back to the first member with that role on the pod. */
        const roleMap: Record<string, string> = {
          Design: "primary_designer",
          Pod: "primary_dev",
          CRO: "cro_lead",
          PM: "primary_designer",
          Dylan: "primary_dev",
        };
        const targetRole = roleMap[newItem.owner] ?? "primary_dev";
        const member = pod.members.find((m) => m.role === targetRole) ?? pod.members[0];
        const discipline =
          newItem.owner === "Design"
            ? "design"
            : newItem.owner === "CRO"
              ? "strategy"
              : "development";

        /* Compute due_date from engagement startDate + dueDay working days. */
        const due = new Date(engagement.startDate);
        if (engagement.kind === "bucket") {
          let added = 1;
          while (added < newItem.dueDay) {
            due.setDate(due.getDate() + 1);
            const d = due.getDay();
            if (d !== 0 && d !== 6) added++;
          }
        } else {
          due.setDate(due.getDate() + (newItem.dueDay - 1));
        }

        addTask({
          project_id: project.id,
          title: newItem.name,
          type: "core_deliverable",
          discipline: discipline as "design" | "development" | "strategy",
          assigned_to: member?.id ?? "",
          due_date: due.toISOString().slice(0, 10),
          cycle: { month: newItem.cycle, week: newItem.weekInCycle },
        });
      },
    );
  };

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <Link
        href="/engagements"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#666] hover:text-[#1B1B1B] mb-4"
      >
        <ArrowLeftIcon className="size-3" />
        All clients
      </Link>

      <header className="mb-5 pb-4 border-b border-[#E5E5EA]">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
              {engagement.vertical}
            </p>
            <div className="flex items-baseline gap-3 mt-1">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B]">
                {engagement.brand}
              </h1>
              {(() => {
                const isBucket = engagement.kind === "bucket";
                const bucketDef = isBucket && engagement.bucket
                  ? BUCKETS.find((b) => b.size === engagement.bucket)
                  : null;
                return (
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isBucket
                        ? "text-[#1976D2] bg-[#E3F2FD]"
                        : "text-white bg-[#1B1B1B]"
                    }`}
                  >
                    {isBucket ? bucketDef?.label ?? "Bucket" : "CE retainer"}
                  </span>
                );
              })()}
            </div>
          </div>
          <div className="flex items-baseline gap-3 text-[12px] text-[#666] flex-wrap">
            {(() => {
              const isBucket = engagement.kind === "bucket";
              const bucketDef = isBucket && engagement.bucket
                ? BUCKETS.find((b) => b.size === engagement.bucket)
                : null;
              const totalDays = isBucket ? (bucketDef?.workingDays ?? 0) : 90;
              const totalLabel = isBucket ? "wd" : "";
              return (
                <span>
                  Day <span className="font-semibold text-[#1B1B1B] tabular-nums">{currentDay}</span>
                  /{totalDays}{totalLabel ? ` ${totalLabel}` : ""} · W{currentWeek}
                </span>
              );
            })()}
            <span className="text-[#E5E5EA]">·</span>
            <span>
              <span className="font-semibold text-[#1B1B1B] tabular-nums">{engagement.retainer}</span>
              {engagement.kind === "retainer" ? "/mo" : ""}
            </span>
            <span className="text-[#E5E5EA]">·</span>
            <span>Pod <span className="font-semibold text-[#1B1B1B] tabular-nums">{engagement.podNumber}</span></span>
            <span className="text-[#E5E5EA]">·</span>
            <span className="font-semibold tabular-nums">
              {totalDone}/{totalAll} · {overallPct}%
            </span>
            {totalBlocked > 0 && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C62828] bg-[#FFEBEE] px-1.5 py-0.5 rounded">
                {totalBlocked} blocked
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Metrics strip - CVR + AOV baseline vs current */}
      {engagement.metrics && (engagement.metrics.cvrBaseline != null || engagement.metrics.aovBaseline != null) && (
        <section className="mb-5 rounded-lg border border-[#E5E5EA] bg-white p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
              Metrics
            </h2>
            {engagement.metrics.metricsUpdatedAt && (
              <span className="text-[10px] text-[#999]">
                Updated {new Date(engagement.metrics.metricsUpdatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCell
              label="Conversion rate"
              unit="%"
              baseline={engagement.metrics.cvrBaseline}
              current={engagement.metrics.cvrCurrent}
              precision={1}
            />
            <MetricCell
              label="Average order value"
              unit="£"
              unitPosition="prefix"
              baseline={engagement.metrics.aovBaseline}
              current={engagement.metrics.aovCurrent}
              precision={0}
            />
          </div>
        </section>
      )}

      {/* Brief panel - collapsible client brief, inline editable */}
      <section className="mb-5 rounded-lg border border-[#E5E5EA] bg-white">
        <button
          onClick={() => setBriefOpen((o) => !o)}
          className="w-full flex items-baseline justify-between px-4 py-3 hover:bg-[#FAFAFA] rounded-lg transition-colors"
        >
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
              Brief
            </span>
            {brief.primaryGoal && (
              <span className="text-[12px] text-[#666] truncate max-w-[600px]">
                {brief.primaryGoal}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!briefOpen && brief.primaryContact && (
              <span className="text-[11px] text-[#999]">
                {brief.primaryContact.split(" · ")[0]}
              </span>
            )}
            {briefOpen ? <ChevronUpIcon className="size-3.5 text-[#999]" /> : <ChevronDownIcon className="size-3.5 text-[#999]" />}
          </div>
        </button>

        {briefOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-[#E5E5EA]">
            {(["core", "voice", "context"] as const).map((groupId) => {
              const groupFields = BRIEF_FIELDS.filter((f) => f.group === groupId);
              const groupLabel = groupId === "core" ? "Essentials" : groupId === "voice" ? "Voice + positioning" : "Context + risks";
              return (
                <div key={groupId} className="mt-4 first:mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">
                    {groupLabel}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    {groupFields.map((field) => {
                      const value = brief[field.key];
                      const isEditing = editingBriefField === field.key;
                      const isUrl = (field.key === "websiteUrl" || field.key === "shopifyUrl") && value;
                      return (
                        <div key={field.key} className="group">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-0.5">
                            {field.label}
                          </p>
                          {isEditing ? (
                            <div className="flex items-start gap-1.5">
                              {field.multiline ? (
                                <textarea
                                  value={briefDraft}
                                  onChange={(e) => setBriefDraft(e.target.value)}
                                  className="flex-1 text-[12px] px-2 py-1.5 border border-[#1B1B1B] rounded focus:outline-none bg-white min-h-[60px] resize-y"
                                  autoFocus
                                />
                              ) : (
                                <input
                                  value={briefDraft}
                                  onChange={(e) => setBriefDraft(e.target.value)}
                                  className="flex-1 text-[12px] px-2 py-1.5 border border-[#1B1B1B] rounded focus:outline-none bg-white"
                                  autoFocus
                                />
                              )}
                              <button
                                onClick={() => handleSaveBriefField(field.key)}
                                className="text-[10px] font-semibold text-white bg-[#1B1B1B] px-2.5 py-1.5 rounded hover:bg-black shrink-0"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingBriefField(null); setBriefDraft(""); }}
                                className="text-[14px] text-[#999] hover:text-[#1B1B1B] leading-none px-1 shrink-0"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start gap-1.5">
                              {value ? (
                                isUrl ? (
                                  <a
                                    href={value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[12px] text-[#1B1B1B] hover:underline flex-1 break-all"
                                  >
                                    {value}
                                  </a>
                                ) : (
                                  <p className="text-[12px] text-[#1B1B1B] flex-1 whitespace-pre-line leading-snug">
                                    {value}
                                  </p>
                                )
                              ) : (
                                <p className="text-[12px] text-[#BBB] italic flex-1">Not set</p>
                              )}
                              <button
                                onClick={() => startEditingBriefField(field.key)}
                                className="opacity-0 group-hover:opacity-100 text-[#999] hover:text-[#1B1B1B] transition-opacity shrink-0"
                                title="Edit"
                              >
                                <PencilSquareIcon className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Cycle tabs - pills · only render for retainers (buckets have one cycle) */}
      {engagement.kind === "retainer" && (
      <section className="mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          {cycleStats.map(({ cycle, total, done, blocked, state }) => {
            const isActive = state === "active";
            const isComplete = state === "complete";
            const isView = viewCycle === cycle.number;
            const statusDot = isActive ? "bg-[#00C853]" : isComplete ? "bg-[#9E9E9E]" : "bg-[#E5E5EA]";
            return (
              <button
                key={cycle.number}
                onClick={() => setViewCycle(cycle.number)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                  isView
                    ? "border-[#1B1B1B] bg-[#1B1B1B] text-white"
                    : "border-[#E5E5EA] bg-white text-[#1B1B1B] hover:border-[#1B1B1B]"
                }`}
              >
                <span className={`size-1.5 rounded-full ${statusDot}`} />
                <span className="text-[12px] font-semibold tracking-tight">{cycle.name}</span>
                <span className={`text-[11px] tabular-nums ${isView ? "text-white/70" : "text-[#999]"}`}>
                  {done}/{total}
                </span>
                {blocked > 0 && (
                  <span className={`size-1.5 rounded-full ${isView ? "bg-[#FFCDD2]" : "bg-[#C62828]"}`} title={`${blocked} blocked`} />
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
                    <h3 className="text-[12px] font-semibold text-[#1B1B1B] tracking-wider uppercase">
                      {stage.name}
                    </h3>
                    {stage.id !== "test" && stage.id !== "testing" && (
                      <span className="text-[10px] text-[#999]">
                        {stage.weeks.length === 1
                          ? `W${stage.weeks[0]}`
                          : `W${stage.weeks[0]}-${stage.weeks[stage.weeks.length - 1]}`}
                      </span>
                    )}
                    {isCurrentStage && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white bg-[#00C853] px-1.5 py-0.5 rounded">
                        Now
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-[#999] tabular-nums">
                      <span className="font-semibold text-[#1B1B1B]">{stageDone}</span>/{stageDeliverables.length} done
                    </span>
                    {canAdd && !isAddingHere && (
                      <button
                        onClick={() => setAddingDeliverableIn({ cycle: viewCycle, stage: stage.id as Exclude<StageId, "audit"> })}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#666] hover:text-[#1B1B1B]"
                      >
                        <PlusIcon className="size-3" />
                        Add
                      </button>
                    )}
                  </div>
                </div>
                <div className="rounded-md border border-[#E5E5EA] bg-white overflow-hidden">
                  {stageDeliverables.length > 0 && (
                    <div className="grid grid-cols-[24px_minmax(0,1.4fr)_70px_170px_minmax(0,1fr)] items-center gap-3 px-3 py-1.5 bg-[#FAFAFA] border-b border-[#E5E5EA] text-[10px] font-semibold uppercase tracking-wider text-[#999]">
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
                      done: "bg-[#00C853] border-[#00C853]",
                      in_progress: "bg-[#FFB300] border-[#FFB300]",
                      blocked: "bg-[#C62828] border-[#C62828]",
                      todo: "bg-white border-[#999]",
                    };

                    return (
                      <div
                        key={d.id}
                        className={`group grid grid-cols-[24px_minmax(0,1.4fr)_70px_170px_minmax(0,1fr)] items-center gap-3 px-3 py-2 ${
                          idx > 0 ? "border-t border-[#E5E5EA]" : ""
                        } ${state.status === "done" ? "bg-[#FAFAFA]" : ""}`}
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
                                ? "text-[#999] line-through"
                                : "text-[#1B1B1B] font-medium"
                            }`}
                          >
                            {d.name}
                          </p>
                          {state.status === "blocked" && state.blockerNote && (
                            <p className="text-[11px] text-[#C62828] truncate flex items-center gap-1 mt-0.5">
                              <ExclamationTriangleIcon className="size-3 shrink-0" />
                              {state.blockerNote}
                            </p>
                          )}
                          {(() => {
                            // Gates + test result render only on custom deliverables (build/dev/test)
                            if (stage.id === "audit") return null;
                            const custom = customDeliverables.find((cd) => cd.id === d.id);
                            if (!custom) return null;
                            const gates = custom.gates;
                            const test = custom.testResult;
                            if (!gates && !test) return null;
                            return (
                              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                {gates &&
                                  (Object.keys(QA_GATE_LABEL) as QAGateKey[]).map((key) => {
                                    const ticked = gates[key] === true;
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => handleToggleGate(d.id, key)}
                                        className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border transition-colors ${
                                          ticked
                                            ? "border-[#1B5E20] bg-[#E8F5E9] text-[#1B5E20]"
                                            : "border-[#E5E5EA] bg-white text-[#999] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
                                        }`}
                                      >
                                        <span className="text-[9px]">{ticked ? "✓" : "○"}</span>
                                        {QA_GATE_LABEL[key]}
                                      </button>
                                    );
                                  })}
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
                                      title={test.notes ?? undefined}
                                    >
                                      {s.label}
                                      {test.significancePct != null && (
                                        <span className="opacity-70 normal-case font-medium">
                                          · {test.significancePct}% sig
                                        </span>
                                      )}
                                    </span>
                                  );
                                })()}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Owner */}
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666] bg-[#F5F5F5] px-1.5 py-0.5 rounded justify-self-start">
                          {d.owner === "Pod" ? `Pod ${engagement.podNumber}` : d.owner}
                        </span>

                        {/* Due date */}
                        <span className={`text-[12px] tabular-nums flex items-center gap-1.5 ${overdue ? "text-[#C62828] font-semibold" : "text-[#666]"}`}>
                          <span className="whitespace-nowrap">{due.weekday} {due.day} {due.month}</span>
                          {overdue && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-white bg-[#C62828] px-1.5 py-0.5 rounded">
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
                                className="flex-1 min-w-0 text-[12px] px-2 py-1 border border-[#1B1B1B] rounded focus:outline-none bg-white"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  if (!linkDraft.trim()) return;
                                  if (state.status === "done") handleReplaceLink(d.id, linkDraft);
                                  else handleMarkDone(d.id, linkDraft);
                                }}
                                disabled={!linkDraft.trim()}
                                className="shrink-0 text-[11px] font-semibold text-white bg-[#1B1B1B] hover:bg-black px-2 py-1 rounded disabled:opacity-50"
                              >
                                {state.status === "done" ? "Save" : "Attach"}
                              </button>
                              <button
                                onClick={() => { setAddingLinkFor(null); setLinkDraft(""); }}
                                className="shrink-0 text-[14px] text-[#999] hover:text-[#1B1B1B] leading-none"
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
                              <span className="flex-1 min-w-0 text-[12px] text-[#666] truncate">{meta.hostname}</span>
                              <a
                                href={meta.viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center gap-1 text-[12px] font-medium text-[#1B1B1B] hover:underline"
                              >
                                <EyeIcon className="size-3" />
                                View
                              </a>
                              {meta.downloadUrl && (
                                <a
                                  href={meta.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-[#666] hover:text-[#1B1B1B]"
                                  title="Download"
                                >
                                  <ArrowDownTrayIcon className="size-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => { setAddingLinkFor(d.id); setLinkDraft(""); }}
                                className="shrink-0 text-[#999] hover:text-[#1B1B1B] opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Replace link"
                              >
                                <LinkIcon className="size-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => { setAddingLinkFor(d.id); setLinkDraft(""); }}
                              className="inline-flex items-center gap-1 text-[12px] text-[#666] hover:text-[#1B1B1B]"
                            >
                              <PlusIcon className="size-3" />
                              Attach
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {stageDeliverables.length === 0 && (
                    <p className="text-[12px] text-[#999] italic px-3 py-3">
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
                  <div className="mt-3 rounded-md border border-[#1B1B1B] bg-white p-2 flex items-center gap-1.5">
                    <input
                      value={newDeliverableDraft.name}
                      onChange={(e) => setNewDeliverableDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="Deliverable name"
                      className="flex-1 text-[12px] px-2 py-1.5 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B]"
                      autoFocus
                    />
                    <select
                      value={newDeliverableDraft.owner}
                      onChange={(e) => setNewDeliverableDraft((d) => ({ ...d, owner: e.target.value as OwnerRole }))}
                      className="text-[12px] px-2 py-1.5 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B] bg-white"
                    >
                      <option value="Pod">Pod</option>
                      <option value="Design">Design</option>
                      <option value="CRO">CRO</option>
                      <option value="PM">PM</option>
                      <option value="Dylan">Dylan</option>
                    </select>
                    <input
                      value={newDeliverableDraft.dueDay}
                      onChange={(e) => setNewDeliverableDraft((d) => ({ ...d, dueDay: e.target.value }))}
                      placeholder={`Day ${ENGAGEMENT_CYCLES.find(c => c.number === viewCycle)?.startDay}-${ENGAGEMENT_CYCLES.find(c => c.number === viewCycle)?.endDay}`}
                      type="number"
                      min="1"
                      max="90"
                      className="w-24 text-[12px] px-2 py-1.5 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B] tabular-nums"
                    />
                    <button
                      onClick={handleAddCustomDeliverable}
                      disabled={!newDeliverableDraft.name.trim() || !newDeliverableDraft.dueDay}
                      className="text-[12px] font-semibold text-white bg-[#1B1B1B] hover:bg-black px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingDeliverableIn(null); setNewDeliverableDraft({ name: "", owner: "Pod", dueDay: "" }); }}
                      className="text-[16px] text-[#999] px-1.5 hover:text-[#1B1B1B] leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Wins log - what shipped + what it moved */}
      {engagement.wins && engagement.wins.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-3">
            Wins
          </h2>
          <div className="rounded-md border border-[#E5E5EA] bg-white overflow-hidden">
            {engagement.wins
              .slice()
              .sort((a, b) => b.shippedAtDay - a.shippedAtDay)
              .map((win, idx) => (
                <div
                  key={win.id}
                  className={`px-4 py-3 ${idx > 0 ? "border-t border-[#E5E5EA]" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <h4 className="text-[13px] font-semibold text-[#1B1B1B] tracking-tight">
                      {win.title}
                    </h4>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999] tabular-nums shrink-0">
                      Day {win.shippedAtDay}
                    </span>
                  </div>
                  {win.metric && (
                    <p className="inline-flex items-center text-[11px] font-semibold text-[#1B5E20] bg-[#E8F5E9] px-1.5 py-0.5 rounded mb-1">
                      {win.metric}
                    </p>
                  )}
                  {win.notes && (
                    <p className="text-[12px] text-[#666] leading-snug">{win.notes}</p>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Resources - card grid with populated / empty states · scoped to active cycle */}
      <section className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
            Resources{engagement.kind === "retainer" && <span className="text-[#1B1B1B]"> · {viewCycleDef.name}</span>}
          </h2>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="text-[10px] text-[#999] hover:text-[#1B1B1B]"
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
                className={`rounded-lg border p-4 transition-all flex flex-col bg-white ${
                  populated
                    ? "border-[#E5E5EA] hover:border-[#1B1B1B]"
                    : "border-2 border-dashed border-[#E65100] hover:border-[#BF360C]"
                }`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1B1B1B]">
                    {cat.label}
                  </p>
                  {populated ? (
                    <span className="text-[10px] font-semibold text-[#666] tabular-nums">
                      {items.length} {items.length === 1 ? "link" : "links"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white bg-[#E65100] px-1.5 py-0.5 rounded">
                      <ExclamationTriangleIcon className="size-2.5" />
                      Missing
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#666] leading-snug mb-3">{cat.description}</p>

                {populated && latest && meta && (
                  <a
                    href={meta.viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-[#E5E5EA] bg-white hover:bg-[#F5F5F5] px-2 py-1.5 flex items-center gap-2 transition-colors mb-2"
                  >
                    <span
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                      style={{ background: meta.badgeBg, color: meta.badgeFg }}
                    >
                      {meta.badge}
                    </span>
                    <span className="flex-1 min-w-0 text-[12px] text-[#1B1B1B] truncate">
                      {latest.label}
                    </span>
                    <ArrowTopRightOnSquareIcon className="size-3 text-[#999] shrink-0" />
                  </a>
                )}

                <div className="mt-auto flex items-center gap-2 pt-1">
                  {populated && items.length > 1 && (
                    <button
                      onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                      className="text-[12px] font-medium text-[#666] hover:text-[#1B1B1B]"
                    >
                      View all {items.length}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                    className={`inline-flex items-center gap-1 text-[12px] font-semibold ml-auto px-2 py-1 rounded transition-colors ${
                      populated
                        ? "text-[#666] hover:text-[#1B1B1B] font-medium"
                        : "text-white bg-[#1B1B1B] hover:bg-black"
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
            <div className="mt-3 rounded-lg border border-[#E5E5EA] bg-white p-4">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[12px] font-semibold text-[#1B1B1B]">{cat.label}{engagement.kind === "retainer" ? ` - ${viewCycleDef.name} links` : " links"}</p>
                <p className="text-[12px] text-[#666]">{cat.description}</p>
              </div>
              <div className="space-y-1">
                {items.length === 0 && (
                  <p className="text-[12px] text-[#999] italic py-1">No links yet.</p>
                )}
                {items.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[12px] text-[#1B1B1B] hover:bg-[#F5F5F5] -mx-2 px-2 py-1 rounded"
                  >
                    <LinkIcon className="size-3 shrink-0 text-[#999]" />
                    <span className="flex-1 truncate">{a.label}</span>
                    <span className="text-[10px] text-[#999] shrink-0">
                      {a.addedBy} · Day {a.addedAtDay}
                    </span>
                    <ArrowTopRightOnSquareIcon className="size-3 text-[#999] shrink-0" />
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#E5E5EA]">
                <input
                  value={assetDraft.label}
                  onChange={(e) => setAssetDraft((d) => ({ ...d, label: e.target.value }))}
                  placeholder="Label"
                  className="w-40 text-[12px] px-2 py-1 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B]"
                />
                <input
                  value={assetDraft.url}
                  onChange={(e) => setAssetDraft((d) => ({ ...d, url: e.target.value }))}
                  placeholder="https://..."
                  className="flex-1 text-[12px] px-2 py-1 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B]"
                />
                <button
                  onClick={() => handleAddAsset(activeCategory)}
                  className="text-[10px] font-semibold text-white bg-[#1B1B1B] px-2 py-1 rounded hover:bg-black inline-flex items-center gap-1"
                >
                  <PlusIcon className="size-3" />
                  Add
                </button>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Activity feed */}
      <section className="mb-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-3">
          Activity
        </h2>
        <div className="rounded-lg border border-[#E5E5EA] bg-white">
          {activity.length === 0 ? (
            <p className="text-[12px] text-[#999] p-4 italic">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-[#E5E5EA]">
              {activity.slice(0, 5).map((a) => (
                <li key={a.id} className="px-4 py-2.5 flex items-baseline gap-3 text-[12px]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999] tabular-nums shrink-0 w-12">
                    Day {a.day}
                  </span>
                  <span className="font-semibold text-[#1B1B1B] shrink-0">{a.actor}</span>
                  <span className="text-[#666] flex-1 truncate">{a.action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCell({
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
    <div className="rounded-md border border-[#E5E5EA] bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">Baseline</p>
          <p className="text-[16px] font-semibold tabular-nums text-[#666] mt-0.5">
            {baseline != null ? fmt(baseline) : "—"}
          </p>
        </div>
        <span className="text-[14px] text-[#999]">→</span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">Current</p>
          <p className="text-[20px] font-semibold tabular-nums text-[#1B1B1B] mt-0.5">
            {current != null ? fmt(current) : "—"}
          </p>
        </div>
        {delta != null && (
          <div className="ml-auto text-right">
            <p
              className={`text-[12px] font-semibold tabular-nums ${
                positive ? "text-[#1B5E20]" : negative ? "text-[#C62828]" : "text-[#666]"
              }`}
            >
              {positive ? "+" : ""}
              {fmt(delta)}
            </p>
            {deltaPct != null && (
              <p
                className={`text-[10px] tabular-nums ${
                  positive ? "text-[#1B5E20]" : negative ? "text-[#C62828]" : "text-[#999]"
                }`}
              >
                {positive ? "+" : ""}
                {deltaPct.toFixed(0)}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
