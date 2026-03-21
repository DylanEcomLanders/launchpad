"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { getLeads, saveLead, deleteLead, updateLeadStatus, createNewLead } from "@/lib/sales-engine/leads-data";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/sales-engine/types";
import { inputClass, labelClass } from "@/lib/form-styles";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLeads(await getLeads());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus === "all" ? leads : leads.filter((l) => l.status === filterStatus);
  const sorted = [...filtered].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const handleSave = async (lead: Lead) => {
    await saveLead(lead);
    setShowForm(false);
    setEditLead(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    await deleteLead(id);
    setConfirmDelete(null);
    load();
  };

  const cycleStatus = async (lead: Lead) => {
    const statuses: LeadStatus[] = ["new", "contacted", "interested", "not_interested"];
    const idx = statuses.indexOf(lead.status);
    const next = statuses[(idx + 1) % statuses.length];
    await updateLeadStatus(lead.id, next);
    load();
  };

  const statusInfo = (s: LeadStatus) => LEAD_STATUSES.find((ls) => ls.key === s) || LEAD_STATUSES[0];

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-[#7A7A7A] mt-0.5">{leads.length} lead{leads.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setEditLead(createNewLead({})); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D]"
        >
          <PlusIcon className="size-3.5" />
          Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-4">
        {[{ key: "all" as const, label: "All" }, ...LEAD_STATUSES].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key)}
            className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full transition-colors ${
              filterStatus === s.key ? "bg-[#1B1B1B] text-white" : "text-[#AAA] hover:text-[#1A1A1A]"
            }`}
          >
            {s.label} {s.key !== "all" && `(${leads.filter((l) => l.status === s.key).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
        </div>
      ) : sorted.length > 0 ? (
        <div className="border border-[#E5E5EA] rounded-xl overflow-hidden">
          {sorted.map((lead) => {
            const si = statusInfo(lead.status);
            return (
              <div key={lead.id} className="flex items-center gap-4 px-4 py-3 border-b border-[#EDEDEF] last:border-0 hover:bg-[#FAFAFA] group">
                {/* Status dot — click to cycle */}
                <button
                  onClick={() => cycleStatus(lead)}
                  className="shrink-0"
                  title={`${si.label} — click to change`}
                >
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: si.color }} />
                </button>

                {/* Main info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => { setEditLead(lead); setShowForm(true); }}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-[#1A1A1A]">{lead.brand_name || "Untitled"}</p>
                    <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: si.color + "15", color: si.color }}>
                      {si.label}
                    </span>
                  </div>
                  {lead.contact_name && <p className="text-[10px] text-[#999] mt-0.5">{lead.contact_name}{lead.contact_email ? ` · ${lead.contact_email}` : ""}</p>}
                  {lead.notes && <p className="text-[10px] text-[#BBB] mt-0.5 truncate">{lead.notes}</p>}
                </div>

                {/* Source */}
                {lead.source && <span className="text-[9px] text-[#CCC] shrink-0">{lead.source}</span>}

                {/* Follow-up */}
                {lead.follow_up_date && (
                  <span className={`text-[9px] shrink-0 ${
                    new Date(lead.follow_up_date) < new Date() ? "text-red-400 font-semibold" : "text-[#BBB]"
                  }`}>
                    {new Date(lead.follow_up_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(lead.id)}
                  className={`shrink-0 text-[10px] transition-colors ${
                    confirmDelete === lead.id ? "text-red-500 font-semibold" : "text-[#CCC] hover:text-red-400 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {confirmDelete === lead.id ? "Confirm" : "Delete"}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <p className="text-sm text-[#AAA]">No leads yet</p>
          <p className="text-xs text-[#CCC] mt-1">Add leads manually or from Ecom Prospecting</p>
        </div>
      )}

      {/* Form modal */}
      {showForm && editLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditLead(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
              <h3 className="text-sm font-semibold">{leads.some((l) => l.id === editLead.id) ? "Edit Lead" : "New Lead"}</h3>
              <button onClick={() => { setShowForm(false); setEditLead(null); }} className="text-[#AAA] hover:text-[#1A1A1A]"><XMarkIcon className="size-5" /></button>
            </div>
            <LeadForm lead={editLead} onSave={handleSave} />
          </div>
        </div>
      )}
    </div>
  );
}

function LeadForm({ lead, onSave }: { lead: Lead; onSave: (l: Lead) => void }) {
  const [form, setForm] = useState(lead);
  const u = (f: keyof Lead, v: string) => setForm((p) => ({ ...p, [f]: v }));

  return (
    <div className="p-5 space-y-3">
      <div>
        <label className={labelClass}>Brand Name</label>
        <input type="text" value={form.brand_name} onChange={(e) => u("brand_name", e.target.value)} className={inputClass} placeholder="e.g. Nutribloom" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Contact Name</label>
          <input type="text" value={form.contact_name} onChange={(e) => u("contact_name", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={form.contact_email} onChange={(e) => u("contact_email", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Source</label>
          <input type="text" value={form.source} onChange={(e) => u("source", e.target.value)} className={inputClass} placeholder="e.g. LinkedIn, Loom" />
        </div>
        <div>
          <label className={labelClass}>Follow-up Date</label>
          <input type="date" value={form.follow_up_date || ""} onChange={(e) => u("follow_up_date", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Status</label>
        <select value={form.status} onChange={(e) => u("status", e.target.value)} className={inputClass}>
          {LEAD_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea value={form.notes} onChange={(e) => u("notes", e.target.value)} className={inputClass + " min-h-[60px]"} placeholder="Context, next steps..." />
      </div>
      <button
        onClick={() => onSave(form)}
        disabled={!form.brand_name.trim()}
        className="w-full py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
      >
        Save Lead
      </button>
    </div>
  );
}
