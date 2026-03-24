"use client";

import { useState, useEffect, useCallback } from "react";
import { CHANNELS, STAGES, ITEM_TYPES, STATUS_COLORS } from "@/lib/growth-engine/constants";
import { getGrowthEngine, saveGrowthEngine, addItem, updateItem, removeItem } from "@/lib/growth-engine/data";
import type { GrowthEngineData, GrowthItem, GrowthChannel, GrowthStage, GrowthItemStatus, GrowthItemType, TrafficWarmth } from "@/lib/growth-engine/types";
import { inputClass, labelClass } from "@/lib/form-styles";

export default function GrowthEnginePage() {
  const [engine, setEngine] = useState<GrowthEngineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cellPanel, setCellPanel] = useState<{ channel: GrowthChannel; stage: GrowthStage } | null>(null);
  const [editItem, setEditItem] = useState<GrowthItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New item form
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<GrowthItemType>("content-piece");
  const [newStatus, setNewStatus] = useState<GrowthItemStatus>("planned");
  const [newWarmth, setNewWarmth] = useState<TrafficWarmth>("cold");
  const [newUrl, setNewUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getGrowthEngine();
    setEngine(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getItemsForCell = (channel: GrowthChannel, stage: GrowthStage) =>
    (engine?.items || []).filter((i) => i.channel === channel && i.stage === stage);

  const getCellStatus = (channel: GrowthChannel, stage: GrowthStage): GrowthItemStatus => {
    const items = getItemsForCell(channel, stage);
    if (items.length === 0) return "gap";
    if (items.some((i) => i.status === "live")) return "live";
    if (items.some((i) => i.status === "in-progress")) return "in-progress";
    return "planned";
  };

  // Stats
  const totalItems = engine?.items.length || 0;
  const liveItems = (engine?.items || []).filter((i) => i.status === "live").length;
  const gapCount = CHANNELS.reduce((acc, ch) =>
    acc + STAGES.reduce((a, st) => a + (getItemsForCell(ch.key, st.key).length === 0 ? 1 : 0), 0), 0);
  const activeChannels = CHANNELS.filter((ch) =>
    STAGES.some((st) => getItemsForCell(ch.key, st.key).length > 0)).length;

  const handleAddItem = async () => {
    if (!cellPanel || !newLabel.trim()) return;
    const item: GrowthItem = {
      id: crypto.randomUUID(),
      channel: cellPanel.channel,
      stage: cellPanel.stage,
      label: newLabel.trim(),
      description: newDesc.trim(),
      itemType: newType,
      status: newStatus,
      warmth: newWarmth,
      url: newUrl.trim() || undefined,
    };
    const updated = await addItem(item);
    setEngine(updated);
    resetForm();
  };

  const handleUpdateItem = async (id: string, patch: Partial<GrowthItem>) => {
    const updated = await updateItem(id, patch);
    setEngine(updated);
  };

  const handleRemoveItem = async (id: string) => {
    const updated = await removeItem(id);
    setEngine(updated);
  };

  const resetForm = () => {
    setNewLabel("");
    setNewDesc("");
    setNewType("content-piece");
    setNewStatus("planned");
    setNewWarmth("cold");
    setNewUrl("");
    setShowAddForm(false);
  };

  if (loading || !engine) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[#F0F0F0] rounded" />
          <div className="h-64 bg-[#F0F0F0] rounded-xl" />
        </div>
      </div>
    );
  }

  const cellItems = cellPanel ? getItemsForCell(cellPanel.channel, cellPanel.stage) : [];
  const cellChannel = cellPanel ? CHANNELS.find((c) => c.key === cellPanel.channel) : null;
  const cellStage = cellPanel ? STAGES.find((s) => s.key === cellPanel.stage) : null;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Growth Engine</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">
          {activeChannels}/{CHANNELS.length} channels active · {gapCount} gaps · {totalItems} items ({liveItems} live)
        </p>
      </div>

      {/* Overview Grid */}
      <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden mb-6">
        {/* Header row */}
        <div className="grid grid-cols-[140px_1fr_1fr_1fr_1fr] border-b border-[#E5E5EA]">
          <div className="px-4 py-3 bg-[#FAFAFA]" />
          {STAGES.map((stage) => (
            <div key={stage.key} className="px-4 py-3 bg-[#FAFAFA] border-l border-[#E5E5EA]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">{stage.label}</p>
              <p className="text-[9px] text-[#CCC]">{stage.warmth}</p>
            </div>
          ))}
        </div>

        {/* Channel rows */}
        {CHANNELS.map((channel) => (
          <div key={channel.key} className="grid grid-cols-[140px_1fr_1fr_1fr_1fr] border-b border-[#F0F0F0] last:border-0">
            {/* Channel label */}
            <div className="px-4 py-3.5 flex items-center gap-2">
              <span className="text-sm" style={{ color: channel.color }}>{channel.icon}</span>
              <span className="text-xs font-medium text-[#1A1A1A]">{channel.label}</span>
            </div>

            {/* Stage cells */}
            {STAGES.map((stage) => {
              const items = getItemsForCell(channel.key, stage.key);
              const status = getCellStatus(channel.key, stage.key);
              const colors = STATUS_COLORS[status];
              const isActive = cellPanel?.channel === channel.key && cellPanel?.stage === stage.key;

              return (
                <button
                  key={stage.key}
                  onClick={() => setCellPanel({ channel: channel.key, stage: stage.key })}
                  className={`px-3 py-3.5 border-l border-[#F0F0F0] text-left transition-colors hover:bg-[#F7F8FA] ${
                    isActive ? "bg-[#F0F4FF] ring-1 ring-inset ring-blue-200" : ""
                  }`}
                >
                  {items.length === 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-red-300" />
                      <span className="text-[10px] text-red-400">Gap</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`size-1.5 rounded-full ${colors.dot}`} />
                        <span className={`text-[10px] font-medium ${colors.text}`}>
                          {items.length} {items.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#999] truncate">
                        {items[0]?.label}{items.length > 1 ? ` +${items.length - 1}` : ""}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Gap summary */}
      {gapCount > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">
            Gaps ({gapCount})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.flatMap((ch) =>
              STAGES.filter((st) => getItemsForCell(ch.key, st.key).length === 0).map((st) => (
                <button
                  key={`${ch.key}-${st.key}`}
                  onClick={() => setCellPanel({ channel: ch.key, stage: st.key })}
                  className="px-2 py-1 text-[10px] bg-red-50 text-red-500 border border-red-200 rounded-full hover:bg-red-100 transition-colors"
                >
                  {ch.label} × {st.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Cell Panel (slide-over) */}
      {cellPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setCellPanel(null); resetForm(); }} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
            {/* Panel header */}
            <div className="sticky top-0 bg-white border-b border-[#E5E5EA] px-5 py-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm" style={{ color: cellChannel?.color }}>{cellChannel?.icon}</span>
                    <p className="text-sm font-semibold">{cellChannel?.label}</p>
                    <span className="text-[10px] text-[#AAA]">·</span>
                    <p className="text-sm text-[#777]">{cellStage?.label}</p>
                  </div>
                  <p className="text-[10px] text-[#AAA]">{cellItems.length} items</p>
                </div>
                <button onClick={() => { setCellPanel(null); resetForm(); }} className="p-1 text-[#AAA] hover:text-[#1A1A1A]">
                  <svg className="size-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Existing items */}
              {cellItems.map((item) => (
                <div key={item.id} className={`border rounded-lg p-3.5 ${STATUS_COLORS[item.status].border} ${STATUS_COLORS[item.status].bg}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">{item.label}</p>
                      {item.description && <p className="text-xs text-[#777] mt-0.5">{item.description}</p>}
                    </div>
                    <button onClick={() => handleRemoveItem(item.id)} className="text-[10px] text-[#CCC] hover:text-red-500">×</button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={item.status}
                      onChange={(e) => handleUpdateItem(item.id, { status: e.target.value as GrowthItemStatus })}
                      className="text-[10px] px-1.5 py-0.5 border border-[#E5E5EA] rounded bg-white"
                    >
                      <option value="planned">Planned</option>
                      <option value="in-progress">In Progress</option>
                      <option value="live">Live</option>
                    </select>
                    <select
                      value={item.warmth}
                      onChange={(e) => handleUpdateItem(item.id, { warmth: e.target.value as TrafficWarmth })}
                      className="text-[10px] px-1.5 py-0.5 border border-[#E5E5EA] rounded bg-white"
                    >
                      <option value="cold">Cold</option>
                      <option value="warm">Warm</option>
                      <option value="hot">Hot</option>
                    </select>
                    <span className="text-[10px] text-[#CCC]">{ITEM_TYPES.find((t) => t.key === item.itemType)?.label}</span>
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 mt-1.5 block truncate">{item.url}</a>
                  )}
                </div>
              ))}

              {/* Add form */}
              {showAddForm ? (
                <div className="border border-[#E5E5EA] rounded-lg p-4 bg-[#FAFAFA] space-y-3">
                  <div>
                    <label className={labelClass}>Label *</label>
                    <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className={inputClass} placeholder="e.g. Twitter thread funnel" autoFocus />
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className={inputClass} placeholder="What this does..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Type</label>
                      <select value={newType} onChange={(e) => setNewType(e.target.value as GrowthItemType)} className={inputClass}>
                        {ITEM_TYPES.filter((t) => t.stages.includes(cellPanel.stage)).map((t) => (
                          <option key={t.key} value={t.key}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as GrowthItemStatus)} className={inputClass}>
                        <option value="planned">Planned</option>
                        <option value="in-progress">In Progress</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>URL (optional)</label>
                    <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className={inputClass} placeholder="https://..." />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleAddItem} disabled={!newLabel.trim()} className="px-3 py-1.5 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg disabled:opacity-30">Add</button>
                    <button onClick={resetForm} className="px-3 py-1.5 text-xs text-[#7A7A7A]">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    // Default type based on stage
                    const stageTypes = ITEM_TYPES.filter((t) => t.stages.includes(cellPanel.stage));
                    if (stageTypes.length > 0) setNewType(stageTypes[0].key);
                    // Default warmth based on stage
                    const warmthMap: Record<GrowthStage, TrafficWarmth> = { content: "cold", capture: "warm", nurture: "warm", convert: "hot" };
                    setNewWarmth(warmthMap[cellPanel.stage]);
                  }}
                  className="w-full border-2 border-dashed border-[#E5E5EA] rounded-lg py-3 text-xs text-[#AAA] hover:border-[#999] hover:text-[#777] transition-colors"
                >
                  + Add Item
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
