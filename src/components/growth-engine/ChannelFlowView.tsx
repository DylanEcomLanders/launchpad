"use client";

import { useState } from "react";
import { STAGES, ITEM_TYPES, STATUS_COLORS } from "@/lib/growth-engine/constants";
import { CHANNELS } from "@/lib/growth-engine/constants";
import type { GrowthItem, GrowthChannel, GrowthStage, GrowthItemStatus, GrowthItemType, TrafficWarmth } from "@/lib/growth-engine/types";
import { inputClass, labelClass } from "@/lib/form-styles";

interface Props {
  channel: GrowthChannel;
  items: GrowthItem[];
  onAddItem: (item: Omit<GrowthItem, "id">) => void;
  onUpdateItem: (id: string, patch: Partial<GrowthItem>) => void;
  onRemoveItem: (id: string) => void;
  onBack: () => void;
}

export default function ChannelFlowView({ channel, items, onAddItem, onUpdateItem, onRemoveItem, onBack }: Props) {
  const channelConfig = CHANNELS.find((c) => c.key === channel)!;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [addingToStage, setAddingToStage] = useState<GrowthStage | null>(null);

  // Form state
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<GrowthItemType>("content-piece");
  const [newStatus, setNewStatus] = useState<GrowthItemStatus>("planned");
  const [newUrl, setNewUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const resetForm = () => {
    setNewLabel("");
    setNewDesc("");
    setNewType("content-piece");
    setNewStatus("planned");
    setNewUrl("");
    setNewNotes("");
    setAddingToStage(null);
  };

  const handleAdd = () => {
    if (!addingToStage || !newLabel.trim()) return;
    const warmthMap: Record<GrowthStage, TrafficWarmth> = { content: "cold", capture: "warm", nurture: "warm", convert: "hot" };
    onAddItem({
      channel,
      stage: addingToStage,
      label: newLabel.trim(),
      description: newDesc.trim(),
      itemType: newType,
      status: newStatus,
      warmth: warmthMap[addingToStage],
      url: newUrl.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });
    resetForm();
  };

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Header */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[#777] hover:text-[#1A1A1A] mb-6 transition-colors">
        ← Back to Overview
      </button>

      <div className="flex items-center gap-3 mb-8">
        <span className="text-2xl" style={{ color: channelConfig.color }}>{channelConfig.icon}</span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{channelConfig.label} Funnel</h1>
          <p className="text-xs text-[#7A7A7A]">Map your journey from content to conversion</p>
        </div>
      </div>

      {/* Vertical flow */}
      <div className="space-y-0">
        {STAGES.map((stage, stageIdx) => {
          const stageItems = items.filter((i) => i.stage === stage.key);
          const isGap = stageItems.length === 0;
          const stageColor = stage.color;

          return (
            <div key={stage.key}>
              {/* Connector line */}
              {stageIdx > 0 && (
                <div className="flex justify-center py-2">
                  <div className="w-px h-8 bg-[#E5E5EA]" />
                </div>
              )}

              {/* Stage header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="size-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: stageColor }}>
                  {stageIdx + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{stage.label}</p>
                  <p className="text-[10px] text-[#AAA]">{stage.warmth} traffic</p>
                </div>
                {!isGap && (
                  <span className="text-[10px] text-[#AAA] ml-auto">{stageItems.length} item{stageItems.length !== 1 ? "s" : ""}</span>
                )}
              </div>

              {/* Items */}
              <div className="ml-4 border-l-2 pl-6 space-y-3" style={{ borderColor: isGap ? "#FFD4D4" : stageColor + "40" }}>
                {stageItems.map((item) => {
                  const isExpanded = expandedItem === item.id;
                  const colors = STATUS_COLORS[item.status];

                  return (
                    <div key={item.id} className={`border rounded-xl overflow-hidden transition-all ${colors.border} ${isExpanded ? "shadow-sm" : ""}`}>
                      {/* Item header — always visible */}
                      <button
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        className={`w-full text-left px-4 py-3 ${colors.bg} hover:brightness-95 transition-all`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`size-2 rounded-full shrink-0 ${colors.dot}`} />
                            <p className="text-sm font-medium text-[#1A1A1A] truncate">{item.label}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${colors.text} ${colors.bg}`}>
                              {item.status}
                            </span>
                            <svg className={`size-3.5 text-[#CCC] transition-transform ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        {item.description && !isExpanded && (
                          <p className="text-[10px] text-[#999] mt-0.5 truncate">{item.description}</p>
                        )}
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 py-3 bg-white border-t border-[#F0F0F0] space-y-3">
                          {item.description && (
                            <p className="text-xs text-[#666] leading-relaxed">{item.description}</p>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] uppercase text-[#AAA] font-semibold block mb-1">Status</label>
                              <select
                                value={item.status}
                                onChange={(e) => onUpdateItem(item.id, { status: e.target.value as GrowthItemStatus })}
                                className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded"
                              >
                                <option value="planned">Planned</option>
                                <option value="in-progress">In Progress</option>
                                <option value="live">Live</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] uppercase text-[#AAA] font-semibold block mb-1">Type</label>
                              <p className="text-xs text-[#777] py-1.5">{ITEM_TYPES.find((t) => t.key === item.itemType)?.label || item.itemType}</p>
                            </div>
                          </div>

                          {/* URL */}
                          <div>
                            <label className="text-[9px] uppercase text-[#AAA] font-semibold block mb-1">URL</label>
                            <input
                              type="url"
                              value={item.url || ""}
                              onChange={(e) => onUpdateItem(item.id, { url: e.target.value || undefined })}
                              className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded"
                              placeholder="https://..."
                            />
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="text-[9px] uppercase text-[#AAA] font-semibold block mb-1">Notes</label>
                            <textarea
                              value={item.notes || ""}
                              onChange={(e) => onUpdateItem(item.id, { notes: e.target.value || undefined })}
                              className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded min-h-[60px]"
                              placeholder="Strategy notes, ideas, next steps..."
                            />
                          </div>

                          {/* Metrics */}
                          {item.metrics && (
                            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#F0F0F0]">
                              {item.metrics.impressions !== undefined && (
                                <div>
                                  <p className="text-[8px] uppercase text-[#BBB]">Impressions</p>
                                  <p className="text-xs font-semibold">{item.metrics.impressions.toLocaleString()}</p>
                                </div>
                              )}
                              {item.metrics.clicks !== undefined && (
                                <div>
                                  <p className="text-[8px] uppercase text-[#BBB]">Clicks</p>
                                  <p className="text-xs font-semibold">{item.metrics.clicks.toLocaleString()}</p>
                                </div>
                              )}
                              {item.metrics.leads !== undefined && (
                                <div>
                                  <p className="text-[8px] uppercase text-[#BBB]">Leads</p>
                                  <p className="text-xs font-semibold">{item.metrics.leads.toLocaleString()}</p>
                                </div>
                              )}
                              {item.metrics.conversions !== undefined && (
                                <div>
                                  <p className="text-[8px] uppercase text-[#BBB]">Conversions</p>
                                  <p className="text-xs font-semibold">{item.metrics.conversions.toLocaleString()}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Delete */}
                          <div className="flex justify-end pt-2 border-t border-[#F0F0F0]">
                            {confirmDelete === item.id ? (
                              <div className="flex items-center gap-2">
                                <button onClick={() => { onRemoveItem(item.id); setConfirmDelete(null); setExpandedItem(null); }} className="text-[10px] font-medium text-white bg-red-500 px-2.5 py-1 rounded">Confirm</button>
                                <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-[#AAA]">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(item.id)} className="text-[10px] text-[#CCC] hover:text-red-500">Remove</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Gap indicator */}
                {isGap && addingToStage !== stage.key && (
                  <button
                    onClick={() => {
                      setAddingToStage(stage.key);
                      const stageTypes = ITEM_TYPES.filter((t) => t.stages.includes(stage.key));
                      if (stageTypes.length > 0) setNewType(stageTypes[0].key);
                    }}
                    className="w-full border-2 border-dashed border-red-200 rounded-xl py-4 text-center hover:border-red-300 hover:bg-red-50/30 transition-colors"
                  >
                    <p className="text-xs text-red-400 font-medium">Gap — no {stage.label.toLowerCase()} items</p>
                    <p className="text-[10px] text-red-300 mt-0.5">+ Add your first {stage.label.toLowerCase()} piece</p>
                  </button>
                )}

                {/* Add button for non-gap stages */}
                {!isGap && addingToStage !== stage.key && (
                  <button
                    onClick={() => {
                      setAddingToStage(stage.key);
                      const stageTypes = ITEM_TYPES.filter((t) => t.stages.includes(stage.key));
                      if (stageTypes.length > 0) setNewType(stageTypes[0].key);
                    }}
                    className="w-full border border-dashed border-[#E5E5EA] rounded-lg py-2.5 text-[10px] text-[#AAA] hover:border-[#999] hover:text-[#777] transition-colors"
                  >
                    + Add item
                  </button>
                )}

                {/* Add form */}
                {addingToStage === stage.key && (
                  <div className="border border-[#E5E5EA] rounded-xl p-4 bg-[#FAFAFA] space-y-3">
                    <div>
                      <label className={labelClass}>Label *</label>
                      <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className={inputClass} placeholder={`e.g. ${stage.key === "content" ? "Twitter thread about CRO" : stage.key === "capture" ? "Free CRO audit template" : stage.key === "nurture" ? "5-email welcome sequence" : "Discovery call booking"}`} autoFocus />
                    </div>
                    <div>
                      <label className={labelClass}>Description</label>
                      <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className={inputClass + " min-h-[60px]"} placeholder="What is this and how does it work?" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Type</label>
                        <select value={newType} onChange={(e) => setNewType(e.target.value as GrowthItemType)} className={inputClass}>
                          {ITEM_TYPES.filter((t) => t.stages.includes(stage.key)).map((t) => (
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
                    <div>
                      <label className={labelClass}>Notes (optional)</label>
                      <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className={inputClass + " min-h-[40px]"} placeholder="Strategy, ideas..." />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={handleAdd} disabled={!newLabel.trim()} className="px-4 py-2 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg disabled:opacity-30">Add</button>
                      <button onClick={resetForm} className="px-3 py-2 text-xs text-[#7A7A7A]">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
