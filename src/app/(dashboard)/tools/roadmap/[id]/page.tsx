"use client";

/* ── Roadmap detail / editor (3-horizon kanban with ICE) ── */

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  MapIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  emptyItem,
  iceScore,
  nowISO,
  roadmapsStore,
} from "@/lib/roadmaps/data";
import {
  HORIZONS,
  HORIZON_LABEL,
  ITEM_TYPE_LABEL,
  ITEM_TYPE_TINT,
  STATUS_LABEL,
  STATUS_TINT,
  type Roadmap,
  type RoadmapHorizon,
  type RoadmapItem,
  type RoadmapItemStatus,
  type RoadmapItemType,
} from "@/lib/roadmaps/types";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

const ITEM_TYPES: RoadmapItemType[] = ["page", "test", "other"];
const ITEM_STATUSES: RoadmapItemStatus[] = ["planned", "in_progress", "done", "skipped"];

export default function RoadmapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await roadmapsStore.getAll();
      if (cancelled) return;
      const found = rows.find((r) => r.id === id);
      if (!found) setNotFound(true);
      else setRoadmap(found);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const isFirstSave = useRef(true);
  useEffect(() => {
    if (!roadmap) return;
    if (isFirstSave.current) { isFirstSave.current = false; return; }
    const t = setTimeout(async () => {
      setSaving(true);
      const stamped = { ...roadmap, updated_at: nowISO() };
      await roadmapsStore.update(roadmap.id, stamped);
      setSaving(false);
      setSavedAt(stamped.updated_at);
    }, 600);
    return () => clearTimeout(t);
  }, [roadmap]);

  function patch(p: Partial<Roadmap>) {
    setRoadmap((prev) => (prev ? { ...prev, ...p } : prev));
  }
  function addItem(horizon: RoadmapHorizon) {
    if (!roadmap) return;
    const order = roadmap.items.length === 0 ? 0 : Math.max(...roadmap.items.map((i) => i.order)) + 10;
    const item = emptyItem(horizon, order);
    patch({ items: [...roadmap.items, item] });
    setEditingItemId(item.id);
  }
  function updateItem(itemId: string, p: Partial<RoadmapItem>) {
    if (!roadmap) return;
    patch({ items: roadmap.items.map((i) => (i.id === itemId ? { ...i, ...p } : i)) });
  }
  function removeItem(itemId: string) {
    if (!roadmap) return;
    patch({ items: roadmap.items.filter((i) => i.id !== itemId) });
  }
  async function deleteRoadmap() {
    if (!roadmap) return;
    if (!window.confirm("Delete this roadmap? Can't be undone.")) return;
    await roadmapsStore.remove(roadmap.id);
    router.push("/tools/roadmap");
  }

  const itemsByHorizon = useMemo(() => {
    const out: Record<RoadmapHorizon, RoadmapItem[]> = { 30: [], 60: [], 90: [] };
    if (!roadmap) return out;
    /* Within each horizon, sort by ICE descending then order so the
     * highest-impact items rise to the top. */
    for (const h of HORIZONS) {
      out[h] = roadmap.items
        .filter((i) => i.horizon === h)
        .sort((a, b) => iceScore(b) - iceScore(a) || a.order - b.order);
    }
    return out;
  }, [roadmap]);

  if (!isAdmin) {
    return (<div className="p-6"><div className="bg-background rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle">Admin / CRO only.</p></div></div>);
  }
  if (!hydrated) {
    return (<div className="p-6 space-y-3 max-w-6xl mx-auto">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-background rounded-xl animate-pulse" />)}</div>);
  }
  if (notFound || !roadmap) {
    return (<div className="p-6"><div className="bg-background rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle mb-3">Roadmap not found.</p><Link href="/tools/roadmap" className="text-[12px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200">← Back</Link></div></div>);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/tools/roadmap" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-subtle hover:text-foreground mb-3">
            <ArrowLeftIcon className="size-3.5" />
            All roadmaps
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(6,182,212,0.3)] shrink-0">
              <MapIcon className="size-4 text-white" />
            </div>
            <input
              value={roadmap.client_name}
              onChange={(e) => patch({ client_name: e.target.value })}
              placeholder="Client name"
              className="text-2xl font-semibold text-foreground bg-transparent border-none outline-none focus:ring-0 min-w-0 flex-1"
            />
          </div>
          <div className="text-[12px] text-subtle">
            {saving ? "Saving…" : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loaded"}
          </div>
        </div>
        <button onClick={deleteRoadmap} className="p-1.5 rounded-md text-subtle hover:text-rose-400 hover:bg-rose-500/[0.1]" title="Delete">
          <TrashIcon className="size-4" />
        </button>
      </div>

      {/* Meta */}
      <div className="bg-background rounded-2xl p-5 ring-1 ring-white/[0.04] grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Strategist</label>
          <input value={roadmap.strategist} onChange={(e) => patch({ strategist: e.target.value })} className={inputClass} placeholder="Dylan / Ajay" />
        </div>
        <div>
          <label className={labelClass}>Quarter / period label</label>
          <input value={roadmap.quarter_label} onChange={(e) => patch({ quarter_label: e.target.value })} className={inputClass} placeholder="Q3 2026" />
        </div>
      </div>

      {/* 3-horizon columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {HORIZONS.map((h) => (
          <div key={h} className="min-h-0">
            <div className="bg-gradient-to-br from-cyan-500/15 to-teal-500/5 rounded-xl ring-1 ring-cyan-500/30 px-4 py-3 mb-2 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-cyan-300">
                  {HORIZON_LABEL[h]}
                </div>
                <div className="text-[11px] text-subtle mt-0.5">{itemsByHorizon[h].length} items</div>
              </div>
              <button onClick={() => addItem(h)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wider bg-white/5 hover:bg-white/10 text-foreground">
                <PlusIcon className="size-3" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {itemsByHorizon[h].length === 0 ? (
                <div className="bg-background/60 rounded-xl p-4 ring-1 ring-white/[0.03] text-center">
                  <p className="text-[11px] italic text-subtle">Empty</p>
                </div>
              ) : (
                itemsByHorizon[h].map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    editing={editingItemId === item.id}
                    onEdit={() => setEditingItemId(item.id)}
                    onCancel={() => setEditingItemId(null)}
                    onChange={(p) => updateItem(item.id, p)}
                    onDelete={() => removeItem(item.id)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  editing,
  onEdit,
  onCancel,
  onChange,
  onDelete,
}: {
  item: RoadmapItem;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onChange: (p: Partial<RoadmapItem>) => void;
  onDelete: () => void;
}) {
  const ice = iceScore(item);

  if (editing) {
    return (
      <div className="bg-background rounded-xl p-3 space-y-2 ring-1 ring-cyan-500/30 shadow-[0_8px_32px_rgba(6,182,212,0.12)]">
        <input
          value={item.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className={`${inputClass} h-8 text-[13px]`}
          placeholder="Item title"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-2">
          <select value={item.type} onChange={(e) => onChange({ type: e.target.value as RoadmapItemType })} className={`${inputClass} h-8 text-[12px]`}>
            {ITEM_TYPES.map((t) => <option key={t} value={t}>{ITEM_TYPE_LABEL[t]}</option>)}
          </select>
          <select value={item.status} onChange={(e) => onChange({ status: e.target.value as RoadmapItemStatus })} className={`${inputClass} h-8 text-[12px]`}>
            {ITEM_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ScoreField label="Impact" value={item.impact} onChange={(v) => onChange({ impact: v })} />
          <ScoreField label="Confidence" value={item.confidence} onChange={(v) => onChange({ confidence: v })} />
          <ScoreField label="Ease" value={item.ease} onChange={(v) => onChange({ ease: v })} />
        </div>
        <textarea
          value={item.hypothesis || ""}
          onChange={(e) => onChange({ hypothesis: e.target.value })}
          rows={2}
          className={`${textareaClass} font-mono text-[12px]`}
          placeholder="Hypothesis (because we observed X, we believe Y will Z)"
        />
        <div className="flex items-center justify-between">
          <button onClick={onDelete} className="text-[10px] uppercase tracking-wider text-subtle hover:text-rose-400">
            Delete
          </button>
          <button onClick={onCancel} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wider bg-white text-background hover:bg-foreground">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl p-3 ring-1 ring-white/[0.04] hover:ring-cyan-500/30 transition-all group">
      <button onClick={onEdit} className="w-full text-left">
        <div className="flex items-start gap-2 mb-2">
          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold shrink-0 ${ITEM_TYPE_TINT[item.type]}`}>
            {ITEM_TYPE_LABEL[item.type]}
          </span>
          <span className="text-[10px] text-cyan-300 font-mono shrink-0">ICE {ice}</span>
          <ChevronDownIcon className="size-3 text-subtle ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-[13px] text-foreground mb-2">
          {item.title || <span className="italic text-subtle">Untitled</span>}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${STATUS_TINT[item.status]}`}>
            {STATUS_LABEL[item.status]}
          </span>
          {item.owner_role && (
            <span className="text-[9px] uppercase tracking-wider text-subtle">{item.owner_role}</span>
          )}
        </div>
        {item.hypothesis && (
          <div className="mt-2 pt-2 border-t border-white/[0.04] text-[11px] text-muted line-clamp-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.hypothesis}</ReactMarkdown>
          </div>
        )}
      </button>
    </div>
  );
}

function ScoreField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-subtle mb-1">{label}</div>
      <input
        type="number"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
        className={`${inputClass} h-7 text-[12px] text-center`}
      />
    </div>
  );
}
