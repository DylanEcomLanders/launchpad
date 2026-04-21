"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import {
  createRoadmapItem,
  deleteRoadmapItem,
  getRoadmapItems,
  groupByStage,
  moveRoadmapItem,
  STAGE_LABELS,
  STAGE_ORDER,
  updateRoadmapItem,
} from "@/lib/portal/roadmap";
import type {
  AssetType,
  RoadmapItem,
  RoadmapPriority,
  RoadmapStage,
} from "@/lib/portal/roadmap-types";
import { ASSET_TYPE_LABELS } from "@/lib/portal/roadmap-types";
import { inputClass, labelClass, selectClass, textareaClass } from "@/lib/form-styles";

type Props = {
  portalId: string;
  readOnly?: boolean; // true when rendered in the client view
};

const priorityPill: Record<RoadmapPriority, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-[#F3F3F5] text-[#777]",
};

function formatMonth(ym: string): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return "";
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function formatShippedDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

// When shown to the client, omit the Backlog section and keep Shipped trimmed to recent.
function visibleStagesFor(readOnly: boolean): RoadmapStage[] {
  return readOnly ? ["in-progress", "next-up", "shipped"] : STAGE_ORDER;
}

export function RoadmapList({ portalId, readOnly = false }: Props) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getRoadmapItems(portalId);
    setItems(data);
    setLoading(false);
  }, [portalId]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => groupByStage(items), [items]);

  const handleMove = async (id: string, toStage: RoadmapStage) => {
    await moveRoadmapItem(id, toStage);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this roadmap item?")) return;
    await deleteRoadmapItem(id);
    load();
  };

  const handleSaveNew = async (draft: Omit<RoadmapItem, "id" | "created_at" | "updated_at" | "portal_id">) => {
    setSaving(true);
    await createRoadmapItem({ ...draft, portal_id: portalId });
    setSaving(false);
    setShowAddForm(false);
    load();
  };

  const handleSaveEdit = async (id: string, patch: Partial<RoadmapItem>) => {
    setSaving(true);
    await updateRoadmapItem(id, patch);
    setSaving(false);
    setEditingId(null);
    load();
  };

  if (loading) {
    return <p className="text-sm text-[#999]">Loading roadmap…</p>;
  }

  return (
    <div className="space-y-8">
      {/* Add form (admin only) */}
      {!readOnly && (
        <div>
          {showAddForm ? (
            <RoadmapForm
              onSave={handleSaveNew}
              onCancel={() => setShowAddForm(false)}
              saving={saving}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-[#1B1B1B] rounded-lg hover:bg-[#2D2D2D] transition-colors"
            >
              <PlusIcon className="size-3.5" />
              Add roadmap item
            </button>
          )}
        </div>
      )}

      {/* Stage sections */}
      {visibleStagesFor(readOnly).map((stage) => {
        const stageItems = grouped[stage];
        // Hide empty In Progress / Next Up / Shipped from client view. Admin always shows all.
        if (readOnly && stageItems.length === 0) return null;
        return (
          <section key={stage}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA]">
                {STAGE_LABELS[stage]}
              </h3>
              <span className="text-[10px] text-[#CCC]">{stageItems.length}</span>
            </div>

            {stageItems.length === 0 ? (
              <p className="text-xs text-[#BBB] italic">Nothing here yet.</p>
            ) : (
              <div className="divide-y divide-[#F0F0F0] border border-[#E8E8E8] rounded-xl bg-white">
                {stageItems.map((item) =>
                  editingId === item.id ? (
                    <div key={item.id} className="p-4">
                      <RoadmapForm
                        initial={item}
                        onSave={(patch) => handleSaveEdit(item.id, patch)}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                      />
                    </div>
                  ) : (
                    <RoadmapRow
                      key={item.id}
                      item={item}
                      readOnly={readOnly}
                      onEdit={() => setEditingId(item.id)}
                      onDelete={() => handleDelete(item.id)}
                      onMove={(next) => handleMove(item.id, next)}
                    />
                  )
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ── Row ── */

function RoadmapRow({
  item,
  readOnly,
  onEdit,
  onDelete,
  onMove,
}: {
  item: RoadmapItem;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (stage: RoadmapStage) => void;
}) {
  const linkChips: { label: string; url: string }[] = [];
  if (item.figma_url) linkChips.push({ label: "Figma", url: item.figma_url });
  if (item.staging_url) linkChips.push({ label: "Preview", url: item.staging_url });
  if (item.live_url) linkChips.push({ label: "Live", url: item.live_url });

  return (
    <div className="p-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-[#1A1A1A] truncate">{item.title}</p>
          <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${priorityPill[item.priority]}`}>
            {item.priority}
          </span>
          {item.target_month && (
            <span className="text-[10px] text-[#999]">{formatMonth(item.target_month)}</span>
          )}
          {item.shipped_at && (
            <span className="text-[10px] text-emerald-600 font-medium">Shipped {formatShippedDate(item.shipped_at)}</span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-[#666] leading-relaxed mb-2">{item.description}</p>
        )}

        {item.impact_hypothesis && (
          <p className="text-[11px] text-[#888] italic mb-2">{item.impact_hypothesis}</p>
        )}

        {item.outcome && (
          <p className="text-[11px] text-emerald-600 font-semibold mb-2">{item.outcome}</p>
        )}

        {linkChips.length > 0 && (
          <div className="flex items-center gap-3 mt-1">
            {linkChips.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#555] hover:text-[#1A1A1A] transition-colors"
              >
                {l.label}
                <ArrowTopRightOnSquareIcon className="size-2.5" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Admin actions */}
      {!readOnly && (
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={item.stage}
            onChange={(e) => onMove(e.target.value as RoadmapStage)}
            className="text-[11px] px-2 py-1 border border-[#E8E8E8] rounded-md bg-white text-[#555] focus:border-[#1B1B1B] outline-none"
          >
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
          <button
            onClick={onEdit}
            className="p-1.5 text-[#999] hover:text-[#1A1A1A] transition-colors"
            title="Edit"
          >
            <PencilSquareIcon className="size-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-[#999] hover:text-red-600 transition-colors"
            title="Delete"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Form (used for both add + edit) ── */

type RoadmapDraft = Omit<RoadmapItem, "id" | "created_at" | "updated_at" | "portal_id">;

function RoadmapForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: RoadmapItem;
  onSave: (draft: RoadmapDraft) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [impactHypothesis, setImpactHypothesis] = useState(initial?.impact_hypothesis ?? "");
  const [stage, setStage] = useState<RoadmapStage>(initial?.stage ?? "backlog");
  const [priority, setPriority] = useState<RoadmapPriority>(initial?.priority ?? "medium");
  const [assetType, setAssetType] = useState<AssetType>(initial?.asset_type ?? "test");
  const [targetMonth, setTargetMonth] = useState(initial?.target_month ?? "");
  const [figmaUrl, setFigmaUrl] = useState(initial?.figma_url ?? "");
  const [stagingUrl, setStagingUrl] = useState(initial?.staging_url ?? "");
  const [liveUrl, setLiveUrl] = useState(initial?.live_url ?? "");
  const [outcome, setOutcome] = useState(initial?.outcome ?? "");

  const canSave = title.trim().length > 0;

  const handleSubmit = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      impact_hypothesis: impactHypothesis.trim(),
      stage,
      priority,
      asset_type: assetType,
      target_month: targetMonth,
      sort_index: initial?.sort_index ?? 0,
      figma_url: figmaUrl.trim(),
      staging_url: stagingUrl.trim(),
      live_url: liveUrl.trim(),
      outcome: outcome.trim(),
      started_at: initial?.started_at ?? null,
      shipped_at: initial?.shipped_at ?? null,
    });
  };

  return (
    <div className="border border-[#E8E8E8] rounded-xl bg-[#FAFAFA] p-4 space-y-3">
      <div>
        <label className={labelClass}>Title *</label>
        <input
          className={inputClass}
          placeholder="e.g. Homepage redesign"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={`${textareaClass} min-h-[60px]`}
          placeholder="One or two lines of context for the team + client"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Impact hypothesis (optional)</label>
        <input
          className={inputClass}
          placeholder="We believe a sticky CTA will lift PDP CVR by 2-3%"
          value={impactHypothesis}
          onChange={(e) => setImpactHypothesis(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Type</label>
          <select className={selectClass} value={assetType} onChange={(e) => setAssetType(e.target.value as AssetType)}>
            {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((t) => (
              <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Stage</label>
          <select className={selectClass} value={stage} onChange={(e) => setStage(e.target.value as RoadmapStage)}>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value as RoadmapPriority)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Target month</label>
          <input
            type="month"
            className={inputClass}
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Figma URL</label>
          <input
            className={inputClass}
            placeholder="https://www.figma.com/…"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Staging URL</label>
          <input
            className={inputClass}
            placeholder="https://…preview"
            value={stagingUrl}
            onChange={(e) => setStagingUrl(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Live URL</label>
          <input
            className={inputClass}
            placeholder="https://…"
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
          />
        </div>
      </div>

      {stage === "shipped" && (
        <div>
          <label className={labelClass}>Outcome (optional)</label>
          <input
            className={inputClass}
            placeholder="+3.2% CVR lift"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          />
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleSubmit}
          disabled={!canSave || saving}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#1B1B1B] rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Add item"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-[#777] hover:text-[#1A1A1A] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
