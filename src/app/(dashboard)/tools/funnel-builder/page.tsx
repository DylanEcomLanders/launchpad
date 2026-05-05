"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import {
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { inputClass, labelClass } from "@/lib/form-styles";
import {
  trafficSourceConfigs,
  pageNodeConfigs,
  leadMagnetConfig,
  emailSequenceConfig,
  trafficSources as TRAFFIC_LIST,
  pageNodeTypes as PAGE_LIST,
} from "@/lib/funnel-builder/constants";
import {
  ROADMAP_STATUS_LABELS,
  countByStatus,
  defaultStageForPage,
  newRoadmapId,
  newShareToken,
  newStepId,
  totalStepCount,
  type RoadmapData,
  type RoadmapStep,
  type RoadmapStepStatus,
  type TrafficStep,
  type PageStep,
  type LeadMagnetStep,
  type EmailSequenceStep,
} from "@/lib/funnel-builder/roadmap-types";
import {
  getRoadmaps,
  getRoadmapById,
  saveRoadmap,
  deleteRoadmap,
} from "@/lib/funnel-builder/roadmap-data";
import { RoadmapSVG } from "@/components/funnel-builder/RoadmapSVG";
import type {
  TrafficSource,
  PageNodeType,
  LeadMagnetFormat,
} from "@/lib/funnel-builder/types";

const STATUS_OPTIONS: RoadmapStepStatus[] = [
  "planned",
  "in-build",
  "live",
  "optimising",
];

export default function FunnelBuilderPage() {
  const [list, setList] = useState<RoadmapData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // Initial load
  useEffect(() => {
    getRoadmaps().then((rs) => {
      setList(rs);
      setLoading(false);
    });
  }, []);

  // When activeId changes, fetch full record
  useEffect(() => {
    if (!activeId) {
      setActive(null);
      setSelectedStepId(null);
      return;
    }
    getRoadmapById(activeId).then((r) => setActive(r));
  }, [activeId]);

  /* ── Mutations (auto-save on every change) ───────────────────── */
  const persist = useCallback(async (next: RoadmapData) => {
    setActive(next);
    setList((prev) => {
      const idx = prev.findIndex((r) => r.id === next.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      }
      return [next, ...prev];
    });
    await saveRoadmap(next);
  }, []);

  const createNew = async () => {
    const now = new Date().toISOString();
    const r: RoadmapData = {
      id: newRoadmapId(),
      shareToken: newShareToken(),
      name: "New roadmap",
      clientName: "",
      trafficSources: [],
      pages: [],
      created_at: now,
      updated_at: now,
    };
    await persist(r);
    setActiveId(r.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this roadmap?")) return;
    await deleteRoadmap(id);
    setList((prev) => prev.filter((r) => r.id !== id));
    if (activeId === id) setActiveId(null);
  };

  /* ── Add steps ───────────────────────────────────────────────── */
  const addTraffic = (source: TrafficSource) => {
    if (!active) return;
    const step: TrafficStep = {
      id: newStepId(),
      kind: "traffic",
      source,
      status: "planned",
    };
    persist({ ...active, trafficSources: [...active.trafficSources, step] });
    setSelectedStepId(step.id);
  };

  const addPage = (pageType: PageNodeType) => {
    if (!active) return;
    const step: PageStep = {
      id: newStepId(),
      kind: "page",
      pageType,
      stage: defaultStageForPage(pageType),
      status: "planned",
    };
    persist({ ...active, pages: [...active.pages, step] });
    setSelectedStepId(step.id);
  };

  const addLeadGen = () => {
    if (!active || active.leadGen) return;
    const magnet: LeadMagnetStep = {
      id: newStepId(),
      kind: "lead-magnet",
      format: "pdf",
      status: "planned",
    };
    const sequence: EmailSequenceStep = {
      id: newStepId(),
      kind: "email-sequence",
      emailCount: 5,
      status: "planned",
    };
    persist({ ...active, leadGen: { magnet, sequence } });
    setSelectedStepId(magnet.id);
  };

  const removeLeadGen = () => {
    if (!active?.leadGen) return;
    persist({ ...active, leadGen: undefined });
    setSelectedStepId(null);
  };

  /* ── Update / move / remove step ─────────────────────────────── */
  const updateStep = (stepId: string, patch: Partial<RoadmapStep>) => {
    if (!active) return;
    const trafficSources = active.trafficSources.map((s) =>
      s.id === stepId ? ({ ...s, ...patch } as TrafficStep) : s,
    );
    const pages = active.pages.map((s) =>
      s.id === stepId ? ({ ...s, ...patch } as PageStep) : s,
    );
    let leadGen = active.leadGen;
    if (leadGen?.magnet.id === stepId) {
      leadGen = { ...leadGen, magnet: { ...leadGen.magnet, ...patch } as LeadMagnetStep };
    }
    if (leadGen?.sequence.id === stepId) {
      leadGen = { ...leadGen, sequence: { ...leadGen.sequence, ...patch } as EmailSequenceStep };
    }
    persist({ ...active, trafficSources, pages, leadGen });
  };

  const removeStep = (stepId: string) => {
    if (!active) return;
    const trafficSources = active.trafficSources.filter((s) => s.id !== stepId);
    const pages = active.pages.filter((s) => s.id !== stepId);
    let leadGen = active.leadGen;
    if (leadGen && (leadGen.magnet.id === stepId || leadGen.sequence.id === stepId)) {
      leadGen = undefined;
    }
    persist({ ...active, trafficSources, pages, leadGen });
    if (selectedStepId === stepId) setSelectedStepId(null);
  };

  const moveStep = (stepId: string, direction: -1 | 1) => {
    if (!active) return;
    const moveIn = (arr: TrafficStep[] | PageStep[], list: "traffic" | "pages") => {
      const idx = arr.findIndex((s: { id: string }) => s.id === stepId);
      if (idx === -1) return null;
      const j = idx + direction;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    };
    const t = moveIn(active.trafficSources, "traffic") as TrafficStep[] | null;
    if (t) {
      persist({ ...active, trafficSources: t });
      return;
    }
    const p = moveIn(active.pages, "pages") as PageStep[] | null;
    if (p) {
      persist({ ...active, pages: p });
    }
  };

  /* ── Export PNG ──────────────────────────────────────────────── */
  const exportPng = async () => {
    if (!exportRef.current || !active) return;
    try {
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${active.name.replace(/\s+/g, "-").toLowerCase() || "roadmap"}.png`;
      a.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const copyShare = () => {
    if (!active) return;
    const url = `${window.location.origin}/funnel/${active.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* ── Render ─────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
      </div>
    );
  }

  // ─────────────────── List view ───────────────────
  if (!active) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Funnel Roadmaps</h1>
            <p className="text-xs text-[#7A7A7A] mt-1">
              Pick the pieces — render a clean, shareable client roadmap.
            </p>
          </div>
          <button
            onClick={createNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D]"
          >
            <PlusIcon className="size-4" />
            New roadmap
          </button>
        </div>

        {list.length === 0 ? (
          <div className="border border-dashed border-[#E5E5EA] rounded-xl bg-[#FAFAFA] py-16 text-center">
            <p className="text-sm text-[#A0A0A0]">
              No roadmaps yet. Click <span className="font-semibold text-[#1B1B1B]">New roadmap</span> to start.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className="text-left bg-white border border-[#E5E5EA] rounded-xl p-4 hover:border-[#1A1A1A] transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1B1B1B] truncate">
                      {r.name || "Untitled roadmap"}
                    </p>
                    {r.clientName && (
                      <p className="text-[11px] text-[#7A7A7A] mt-0.5 truncate">
                        {r.clientName}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-[#A0A0A0] shrink-0">
                    {totalStepCount(r)} steps
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Link
                    href={`/funnel/${r.shareToken}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-semibold text-[#7A7A7A] hover:text-[#1B1B1B] flex items-center gap-1"
                  >
                    <ArrowTopRightOnSquareIcon className="size-3" />
                    Client view
                  </Link>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        handleDelete(r.id);
                      }
                    }}
                    className="text-[10px] font-semibold text-[#A0A0A0] hover:text-red-500 flex items-center gap-1 ml-auto cursor-pointer"
                  >
                    <TrashIcon className="size-3" />
                    Delete
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────── Editor view ───────────────────
  const counts = countByStatus(active);
  const totalSteps = totalStepCount(active);
  const liveCount = counts.live;
  const allSteps: RoadmapStep[] = [
    ...active.trafficSources,
    ...active.pages,
    ...(active.leadGen ? [active.leadGen.magnet, active.leadGen.sequence] : []),
  ];
  const selectedStep = allSteps.find((s) => s.id === selectedStepId) || null;

  return (
    <div className="px-4 py-4">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setActiveId(null)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-[#7A7A7A] hover:text-[#1B1B1B]"
        >
          <ArrowLeftIcon className="size-3.5" />
          All roadmaps
        </button>
        <input
          value={active.name}
          onChange={(e) => persist({ ...active, name: e.target.value })}
          placeholder="Roadmap name"
          className="text-sm font-semibold border-0 focus:outline-none focus:ring-0 bg-transparent min-w-[200px]"
        />
        <input
          value={active.clientName}
          onChange={(e) => persist({ ...active, clientName: e.target.value })}
          placeholder="Client name"
          className="text-xs text-[#7A7A7A] border-0 focus:outline-none focus:ring-0 bg-transparent min-w-[160px]"
        />
        <span className="text-[10px] text-[#A0A0A0] tabular-nums">
          {liveCount} of {totalSteps} live
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={copyShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#E5E5EA] rounded-lg hover:border-[#1B1B1B]"
          >
            <LinkIcon className="size-3.5" />
            {copied ? "Copied" : "Copy share link"}
          </button>
          <Link
            href={`/funnel/${active.shareToken}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#E5E5EA] rounded-lg hover:border-[#1B1B1B]"
          >
            <ArrowTopRightOnSquareIcon className="size-3.5" />
            Preview client
          </Link>
          <button
            onClick={exportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D]"
          >
            <ArrowDownTrayIcon className="size-3.5" />
            Export PNG
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* ── Library rail ──────────────────────────────── */}
        <aside className="w-[240px] flex-shrink-0 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
              Traffic sources
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {TRAFFIC_LIST.map((t) => {
                const cfg = trafficSourceConfigs[t];
                return (
                  <button
                    key={t}
                    onClick={() => addTraffic(t)}
                    className="flex items-center gap-1 px-2 py-1.5 border border-[#E5E5EA] rounded-md text-[11px] hover:border-[#1B1B1B] hover:bg-[#FAFAFA] truncate"
                  >
                    <span
                      className="text-[8px] font-bold tracking-wider px-1 py-0.5 rounded shrink-0"
                      style={{
                        background: cfg.color,
                        color: cfg.textColor,
                      }}
                    >
                      {cfg.short}
                    </span>
                    <span className="truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
              Pages
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PAGE_LIST.map((p) => {
                const cfg = pageNodeConfigs[p];
                return (
                  <button
                    key={p}
                    onClick={() => addPage(p)}
                    className="flex items-center gap-1 px-2 py-1.5 border border-[#E5E5EA] rounded-md text-[11px] hover:border-[#1B1B1B] hover:bg-[#FAFAFA] truncate"
                  >
                    <span
                      className="text-[8px] font-bold tracking-wider px-1 py-0.5 rounded shrink-0"
                      style={{
                        background: cfg.color,
                        color: cfg.textColor,
                      }}
                    >
                      {cfg.short}
                    </span>
                    <span className="truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
              Lead gen
            </p>
            {active.leadGen ? (
              <button
                onClick={removeLeadGen}
                className="w-full px-2 py-2 border border-[#E5E5EA] rounded-md text-[11px] text-[#7A7A7A] hover:text-red-500 hover:border-red-200"
              >
                Remove lead-gen track
              </button>
            ) : (
              <button
                onClick={addLeadGen}
                className="w-full flex items-center justify-center gap-1 px-2 py-2 border border-dashed border-[#E5E5EA] rounded-md text-[11px] text-[#7A7A7A] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
              >
                <PlusIcon className="size-3" />
                Add Lead Magnet + Email Sequence
              </button>
            )}
          </div>
        </aside>

        {/* ── Canvas + step editor ─────────────────────── */}
        <div className="flex-1 min-w-0">
          <div
            ref={exportRef}
            className="bg-white border border-[#E5E5EA] rounded-xl p-6 mb-4"
          >
            <RoadmapSVG roadmap={active} onStepClick={(s) => setSelectedStepId(s.id)} />
          </div>

          {/* Step list / editor */}
          {selectedStep ? (
            <StepEditorPanel
              step={selectedStep}
              onUpdate={(patch) => updateStep(selectedStep.id, patch)}
              onMove={(dir) => moveStep(selectedStep.id, dir)}
              onRemove={() => removeStep(selectedStep.id)}
              onClose={() => setSelectedStepId(null)}
            />
          ) : (
            <div className="bg-[#FAFAFA] border border-dashed border-[#E5E5EA] rounded-lg px-4 py-6 text-center">
              <p className="text-[12px] text-[#A0A0A0]">
                Click any step in the roadmap to edit its status, note, or KPI target.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Step editor panel ─────────────────────────────────────────── */

function StepEditorPanel({
  step,
  onUpdate,
  onMove,
  onRemove,
  onClose,
}: {
  step: RoadmapStep;
  onUpdate: (patch: Partial<RoadmapStep>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const reorderable = step.kind === "traffic" || step.kind === "page";

  return (
    <div className="bg-white border border-[#1B1B1B] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1B1B1B]">
          Edit step
        </p>
        <div className="flex items-center gap-1">
          {reorderable && (
            <>
              <button
                onClick={() => onMove(-1)}
                className="p-1 text-[#7A7A7A] hover:text-[#1B1B1B]"
                title="Move earlier"
              >
                <ChevronUpIcon className="size-4" />
              </button>
              <button
                onClick={() => onMove(1)}
                className="p-1 text-[#7A7A7A] hover:text-[#1B1B1B]"
                title="Move later"
              >
                <ChevronDownIcon className="size-4" />
              </button>
            </>
          )}
          <button
            onClick={onRemove}
            className="p-1 text-[#7A7A7A] hover:text-red-500"
            title="Remove"
          >
            <TrashIcon className="size-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-[#7A7A7A] hover:text-[#1B1B1B] text-sm"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={step.status}
            onChange={(e) =>
              onUpdate({ status: e.target.value as RoadmapStepStatus })
            }
            className={inputClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ROADMAP_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Custom label (optional)</label>
          <input
            type="text"
            value={step.customLabel || ""}
            onChange={(e) => onUpdate({ customLabel: e.target.value || undefined })}
            placeholder={defaultLabelFor(step)}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Note (1–2 lines)</label>
          <textarea
            rows={2}
            value={step.note || ""}
            onChange={(e) => onUpdate({ note: e.target.value || undefined })}
            placeholder="Why this step is here, what it does."
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className={labelClass}>KPI target (optional)</label>
          <input
            type="text"
            value={step.kpiTarget || ""}
            onChange={(e) => onUpdate({ kpiTarget: e.target.value || undefined })}
            placeholder="≥3% CVR · 100 leads/mo"
            className={inputClass}
          />
        </div>

        {step.kind === "page" && (
          <div>
            <label className={labelClass}>Funnel stage</label>
            <select
              value={step.stage || "mofu"}
              onChange={(e) =>
                onUpdate({ stage: e.target.value as PageStep["stage"] })
              }
              className={inputClass}
            >
              <option value="tofu">TOFU (top of funnel)</option>
              <option value="mofu">MOFU (middle)</option>
              <option value="bofu">BOFU (bottom)</option>
            </select>
          </div>
        )}

        {step.kind === "lead-magnet" && (
          <div>
            <label className={labelClass}>Format</label>
            <select
              value={step.format}
              onChange={(e) =>
                onUpdate({ format: e.target.value as LeadMagnetFormat })
              }
              className={inputClass}
            >
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
              <option value="tool">Tool</option>
              <option value="quiz">Quiz</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}

        {step.kind === "email-sequence" && (
          <div>
            <label className={labelClass}>Email count</label>
            <input
              type="number"
              min={1}
              value={step.emailCount || ""}
              onChange={(e) =>
                onUpdate({ emailCount: Number(e.target.value) || undefined })
              }
              className={inputClass}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function defaultLabelFor(step: RoadmapStep): string {
  switch (step.kind) {
    case "traffic":
      return trafficSourceConfigs[step.source].label;
    case "page":
      return pageNodeConfigs[step.pageType].label;
    case "lead-magnet":
      return leadMagnetConfig.label;
    case "email-sequence":
      return emailSequenceConfig.label;
  }
}
