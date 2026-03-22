"use client";

import { useState, useEffect } from "react";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/sales-engine/types";
import { getLeads, saveLead, deleteLead, updateLeadStatus, createNewLead } from "@/lib/sales-engine/leads-data";
import { inputClass, labelClass } from "@/lib/form-styles";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLeads(await getLeads());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (lead: Lead) => {
    await saveLead(lead);
    setShowForm(false);
    setEditLead(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteLead(id);
    load();
  };

  const handleDrop = async (status: LeadStatus) => {
    if (!draggedId) return;
    await updateLeadStatus(draggedId, status);
    setDraggedId(null);
    load();
  };

  const activeStages = LEAD_STATUSES.filter(s => s.key !== "lost");
  const lostLeads = leads.filter(l => l.status === "lost");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0] shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Pipeline</h1>
          <p className="text-xs text-[#AAA]">{leads.length} lead{leads.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setEditLead(createNewLead({})); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B1B1B] text-white text-[11px] font-medium rounded-lg hover:bg-[#2D2D2D]"
        >
          <PlusIcon className="size-3.5" />
          Add Lead
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-4 min-w-max h-full">
            {activeStages.map((stage) => {
              const stageLeads = leads.filter(l => l.status === stage.key);
              return (
                <div
                  key={stage.key}
                  className="w-[260px] flex flex-col shrink-0"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-[#F7F8FA]"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("bg-[#F7F8FA]"); }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("bg-[#F7F8FA]"); handleDrop(stage.key); }}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="size-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">{stage.label}</span>
                    <span className="text-[10px] text-[#CCC] ml-auto">{stageLeads.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border border-dashed border-transparent transition-colors min-h-[100px] p-1">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggedId(lead.id)}
                        onDragEnd={() => setDraggedId(null)}
                        onClick={() => { setEditLead(lead); setShowForm(true); }}
                        className={`bg-white border border-[#E8E8E8] rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all ${
                          draggedId === lead.id ? "opacity-40" : ""
                        }`}
                      >
                        <p className="text-xs font-semibold text-[#1A1A1A] mb-1">{lead.brand_name || "Untitled"}</p>
                        {lead.contact_name && <p className="text-[10px] text-[#999]">{lead.contact_name}</p>}
                        {lead.notes && <p className="text-[10px] text-[#CCC] mt-1 line-clamp-2">{lead.notes}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          {lead.store_url && (
                            <a
                              href={lead.audit_token ? `/audit/${lead.audit_token}` : `/sales-engine/audits?url=${encodeURIComponent(lead.store_url)}&brand=${encodeURIComponent(lead.brand_name)}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-[9px] font-medium ${lead.audit_token ? "text-blue-500" : "text-[#AAA] hover:text-[#1A1A1A]"}`}
                            >
                              {lead.audit_token ? "View Audit" : "Run Audit"}
                            </a>
                          )}
                          {lead.follow_up_date && (
                            <span className={`text-[9px] ml-auto ${
                              new Date(lead.follow_up_date) < new Date() ? "text-red-400 font-semibold" : "text-[#CCC]"
                            }`}>
                              {new Date(lead.follow_up_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageLeads.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-[10px] text-[#CCC]">
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lost leads count */}
      {lostLeads.length > 0 && (
        <div className="px-6 py-2 border-t border-[#F0F0F0] text-[10px] text-[#AAA]">
          {lostLeads.length} lost lead{lostLeads.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Edit modal */}
      {showForm && editLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditLead(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{editLead.created_at ? "Edit Lead" : "New Lead"}</h3>
              <button onClick={() => { setShowForm(false); setEditLead(null); }} className="text-[#AAA] hover:text-[#1A1A1A]">
                <XMarkIcon className="size-4" />
              </button>
            </div>
            <LeadForm lead={editLead} onSave={handleSave} onDelete={handleDelete} />
          </div>
        </div>
      )}
    </div>
  );
}

function LeadForm({ lead, onSave, onDelete }: { lead: Lead; onSave: (l: Lead) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState(lead);
  const u = (k: string, v: string) => setForm({ ...form, [k]: v, updated_at: new Date().toISOString() });

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Brand Name *</label>
        <input type="text" value={form.brand_name} onChange={(e) => u("brand_name", e.target.value)} className={inputClass} placeholder="e.g., Pupford" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Contact Name</label>
          <input type="text" value={form.contact_name} onChange={(e) => u("contact_name", e.target.value)} className={inputClass} placeholder="Name" />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={form.contact_email} onChange={(e) => u("contact_email", e.target.value)} className={inputClass} placeholder="email" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Store URL</label>
        <input type="url" value={form.store_url || ""} onChange={(e) => u("store_url", e.target.value)} className={inputClass} placeholder="https://store.com" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Status</label>
          <select value={form.status} onChange={(e) => u("status", e.target.value)} className={inputClass}>
            {LEAD_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Follow-up Date</label>
          <input type="date" value={form.follow_up_date || ""} onChange={(e) => u("follow_up_date", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Source</label>
        <input type="text" value={form.source} onChange={(e) => u("source", e.target.value)} className={inputClass} placeholder="e.g., Cold outreach, Referral" />
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea value={form.notes} onChange={(e) => u("notes", e.target.value)} className={inputClass + " min-h-[60px]"} placeholder="Context, next steps..." />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave(form)}
          disabled={!form.brand_name.trim()}
          className="flex-1 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
        >
          Save
        </button>
        {lead.created_at && (
          <button
            onClick={() => onDelete(lead.id)}
            className="px-3 py-2 text-xs text-red-400 hover:text-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
