"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { getDeals, saveDeal, deleteDeal, moveDeal, createNewDeal } from "@/lib/sales-engine/pipeline-data";
import { DEAL_STAGES, type Deal, type DealStage, type DealOwner } from "@/lib/sales-engine/types";
import { inputClass, labelClass } from "@/lib/form-styles";

const activeStages = DEAL_STAGES.filter((s) => s.key !== "lost");

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await getDeals();
    setDeals(d);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (deal: Deal) => {
    await saveDeal(deal);
    setShowForm(false);
    setEditDeal(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteDeal(id);
    load();
  };

  const handleDrop = async (stage: DealStage) => {
    if (!dragId) return;
    await moveDeal(dragId, stage);
    setDragId(null);
    load();
  };

  const totalValue = deals.filter((d) => d.stage !== "lost").reduce((sum, d) => sum + d.value, 0);
  const wonValue = deals.filter((d) => d.stage === "won").reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="h-full flex flex-col py-8 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-sm text-[#7A7A7A] mt-0.5">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} · {"\u00A3"}{totalValue.toLocaleString()} pipeline · {"\u00A3"}{wonValue.toLocaleString()} won
          </p>
        </div>
        <button
          onClick={() => { setEditDeal(createNewDeal({})); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D]"
        >
          <PlusIcon className="size-3.5" />
          Add Deal
        </button>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 min-w-max h-full">
            {activeStages.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage.key);
              const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);

              return (
                <div
                  key={stage.key}
                  className="w-64 flex flex-col bg-[#FAFAFA] rounded-xl border border-[#EDEDEF] shrink-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(stage.key)}
                >
                  {/* Stage header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#EDEDEF]">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777]">{stage.label}</span>
                      <span className="text-[10px] text-[#BBB]">{stageDeals.length}</span>
                    </div>
                    {stageValue > 0 && (
                      <span className="text-[10px] font-medium text-[#999]">{"\u00A3"}{stageValue.toLocaleString()}</span>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={() => setDragId(deal.id)}
                        onClick={() => { setEditDeal(deal); setShowForm(true); }}
                        className="bg-white border border-[#E5E5EA] rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow"
                      >
                        <p className="text-xs font-semibold text-[#1A1A1A] mb-0.5">{deal.name || deal.brand_name || "Untitled"}</p>
                        <p className="text-[10px] text-[#999]">{deal.brand_name}</p>
                        {deal.value > 0 && (
                          <p className="text-[11px] font-semibold text-[#1A1A1A] mt-1.5">{"\u00A3"}{deal.value.toLocaleString()}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-[9px] font-semibold uppercase tracking-wider ${deal.owner === "dylan" ? "text-blue-500" : "text-purple-500"}`}>
                            {deal.owner}
                          </span>
                          {deal.next_follow_up && (
                            <span className="text-[9px] text-[#AAA]">
                              {new Date(deal.next_follow_up).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageDeals.length === 0 && (
                      <div className="py-6 text-center">
                        <p className="text-[10px] text-[#CCC]">No deals</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deal form modal */}
      {showForm && editDeal && (
        <DealFormModal
          deal={editDeal}
          onSave={handleSave}
          onDelete={editDeal.created_at !== editDeal.updated_at || deals.some(d => d.id === editDeal.id) ? () => { handleDelete(editDeal.id); setShowForm(false); setEditDeal(null); } : undefined}
          onClose={() => { setShowForm(false); setEditDeal(null); }}
        />
      )}
    </div>
  );
}

function DealFormModal({ deal, onSave, onDelete, onClose }: {
  deal: Deal;
  onSave: (d: Deal) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Deal>(deal);

  const update = (field: keyof Deal, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
          <h3 className="text-sm font-semibold">{deal.name ? "Edit Deal" : "New Deal"}</h3>
          <button onClick={onClose} className="text-[#AAA] hover:text-[#1A1A1A]"><XMarkIcon className="size-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Deal Name</label>
              <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} placeholder="e.g. Homepage redesign" />
            </div>
            <div>
              <label className={labelClass}>Brand</label>
              <input type="text" value={form.brand_name} onChange={(e) => update("brand_name", e.target.value)} className={inputClass} placeholder="Brand name" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Name</label>
              <input type="text" value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact Email</label>
              <input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Value ({"\u00A3"})</label>
              <input type="number" value={form.value} onChange={(e) => update("value", Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Stage</label>
              <select value={form.stage} onChange={(e) => update("stage", e.target.value)} className={inputClass}>
                {DEAL_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Owner</label>
              <select value={form.owner} onChange={(e) => update("owner", e.target.value)} className={inputClass}>
                <option value="dylan">Dylan</option>
                <option value="ajay">Ajay</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Source</label>
              <input type="text" value={form.source} onChange={(e) => update("source", e.target.value)} className={inputClass} placeholder="e.g. LinkedIn, Referral" />
            </div>
            <div>
              <label className={labelClass}>Next Follow-up</label>
              <input type="date" value={form.next_follow_up || ""} onChange={(e) => update("next_follow_up", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className={inputClass + " min-h-[60px]"} placeholder="Context, next steps..." />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-[#F0F0F0]">
          {onDelete ? (
            <button onClick={onDelete} className="text-[11px] text-red-400 hover:text-red-600">Delete</button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-[#7A7A7A]">Cancel</button>
            <button
              onClick={() => onSave(form)}
              disabled={!form.name.trim() && !form.brand_name.trim()}
              className="px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
            >
              Save Deal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
