"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { getContentItems, saveContentItem, deleteContentItem, createNewContentItem } from "@/lib/sales-engine/content-calendar";
import type { ContentItem, ContentStatus, ContentPlatform, DealOwner, FunnelStage } from "@/lib/sales-engine/types";
import { inputClass, labelClass } from "@/lib/form-styles";

const STATUS_COLS: { key: ContentStatus; label: string; color: string }[] = [
  { key: "idea", label: "Ideas", color: "#AAA" },
  { key: "drafted", label: "Drafted", color: "#3B82F6" },
  { key: "scheduled", label: "Scheduled", color: "#F59E0B" },
  { key: "published", label: "Published", color: "#10B981" },
];

const PLATFORMS: { key: ContentPlatform; label: string }[] = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "twitter", label: "X / Twitter" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
];

export default function ContentCalendarPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [filterAccount, setFilterAccount] = useState<"all" | DealOwner>("all");
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getContentItems();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterAccount === "all" ? items : items.filter((i) => i.account_id === filterAccount);

  const handleSave = async (item: ContentItem) => {
    await saveContentItem(item);
    setShowForm(false);
    setEditItem(null);
    load();
  };

  const handleDrop = async (status: ContentStatus) => {
    if (!dragId) return;
    const item = items.find((i) => i.id === dragId);
    if (item) {
      await saveContentItem({ ...item, status, updated_at: new Date().toISOString() });
      setDragId(null);
      load();
    }
  };

  return (
    <div className="h-full flex flex-col py-8 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-sm text-[#7A7A7A] mt-0.5">{items.length} piece{items.length !== 1 ? "s" : ""} of content</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Account filter */}
          <div className="flex gap-1">
            {(["all", "dylan", "ajay"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setFilterAccount(a)}
                className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full transition-colors ${
                  filterAccount === a ? "bg-[#1B1B1B] text-white" : "text-[#AAA] hover:text-[#1A1A1A]"
                }`}
              >
                {a === "all" ? "All" : a}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setEditItem(createNewContentItem({})); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D]"
          >
            <PlusIcon className="size-3.5" />
            Add Content
          </button>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 min-w-max h-full">
            {STATUS_COLS.map((col) => {
              const colItems = filtered.filter((i) => i.status === col.key);
              return (
                <div
                  key={col.key}
                  className="w-64 flex flex-col bg-[#FAFAFA] rounded-xl border border-[#EDEDEF] shrink-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(col.key)}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#EDEDEF]">
                    <div className="size-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777]">{col.label}</span>
                    <span className="text-[10px] text-[#BBB]">{colItems.length}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {colItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => setDragId(item.id)}
                        onClick={() => { setEditItem(item); setShowForm(true); }}
                        className="bg-white border border-[#E5E5EA] rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow"
                      >
                        <p className="text-xs font-semibold text-[#1A1A1A] mb-0.5">{item.title || "Untitled"}</p>
                        {item.body && <p className="text-[10px] text-[#999] line-clamp-2">{item.body}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[9px] font-medium text-[#AAA] uppercase">{item.platform}</span>
                          <span className={`text-[9px] font-semibold uppercase ${item.account_id === "dylan" ? "text-blue-500" : "text-purple-500"}`}>
                            {item.account_id}
                          </span>
                        </div>
                        {item.scheduled_date && (
                          <p className="text-[9px] text-[#BBB] mt-1">
                            {new Date(item.scheduled_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        )}
                      </div>
                    ))}

                    {colItems.length === 0 && (
                      <div className="py-6 text-center"><p className="text-[10px] text-[#CCC]">Empty</p></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && editItem && (
        <ContentFormModal
          item={editItem}
          onSave={handleSave}
          onDelete={items.some((i) => i.id === editItem.id) ? async () => { await deleteContentItem(editItem.id); setShowForm(false); setEditItem(null); load(); } : undefined}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function ContentFormModal({ item, onSave, onDelete, onClose }: {
  item: ContentItem;
  onSave: (i: ContentItem) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ContentItem>(item);
  const update = (field: keyof ContentItem, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
          <h3 className="text-sm font-semibold">{item.title ? "Edit Content" : "New Content"}</h3>
          <button onClick={onClose} className="text-[#AAA] hover:text-[#1A1A1A]"><XMarkIcon className="size-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} className={inputClass} placeholder="Content title or hook" />
          </div>
          <div>
            <label className={labelClass}>Body / Draft</label>
            <textarea value={form.body} onChange={(e) => update("body", e.target.value)} className={inputClass + " min-h-[100px]"} placeholder="Write your content..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Platform</label>
              <select value={form.platform} onChange={(e) => update("platform", e.target.value)} className={inputClass}>
                {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Account</label>
              <select value={form.account_id} onChange={(e) => update("account_id", e.target.value)} className={inputClass}>
                <option value="dylan">Dylan</option>
                <option value="ajay">Ajay</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value)} className={inputClass}>
                {STATUS_COLS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Funnel Stage</label>
              <select value={form.funnel_stage} onChange={(e) => update("funnel_stage", e.target.value)} className={inputClass}>
                <option value="tofu">TOFU</option>
                <option value="mofu">MOFU</option>
                <option value="bofu">BOFU</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <input type="text" value={form.category} onChange={(e) => update("category", e.target.value)} className={inputClass} placeholder="e.g. Case study" />
            </div>
            <div>
              <label className={labelClass}>Schedule Date</label>
              <input type="date" value={form.scheduled_date || ""} onChange={(e) => update("scheduled_date", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Published URL</label>
            <input type="url" value={form.published_url || ""} onChange={(e) => update("published_url", e.target.value)} className={inputClass} placeholder="https://..." />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-[#F0F0F0]">
          {onDelete ? <button onClick={onDelete} className="text-[11px] text-red-400 hover:text-red-600">Delete</button> : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-[#7A7A7A]">Cancel</button>
            <button onClick={() => onSave(form)} disabled={!form.title.trim()} className="px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
