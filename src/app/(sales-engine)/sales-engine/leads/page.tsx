"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, TrashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  getProspects,
  saveProspects,
  PROSPECT_STATUSES,
  type Prospect,
  type ProspectStatus,
} from "@/lib/sales-engine/leads-db";

export default function LeadsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProspectStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getProspects();
    setProspects(data.sort((a, b) => {
      // Priority leads first, then by created_at desc
      if (a.priority_flag && !b.priority_flag) return -1;
      if (!a.priority_flag && b.priority_flag) return 1;
      return b.created_at.localeCompare(a.created_at);
    }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function persist(next: Prospect[]) {
    setProspects(next);
    await saveProspects(next);
  }

  function addProspect() {
    const now = new Date().toISOString();
    const p: Prospect = {
      id: crypto.randomUUID(),
      name: "",
      brand: "",
      url: "",
      rev_estimate: "",
      status: "new",
      created_at: now,
      updated_at: now,
    };
    const next = [p, ...prospects];
    persist(next);
    setEditingId(p.id);
  }

  function updateField(id: string, field: keyof Prospect, value: string) {
    const next = prospects.map(p =>
      p.id === id ? { ...p, [field]: value, updated_at: new Date().toISOString() } : p
    );
    setProspects(next);
  }

  async function saveRow(id: string) {
    setEditingId(null);
    await saveProspects(prospects);
  }

  async function deleteProspect(id: string) {
    const next = prospects.filter(p => p.id !== id);
    await persist(next);
  }

  const filtered = filterStatus === "all"
    ? prospects
    : prospects.filter(p => p.status === filterStatus);

  const counts = {
    all: prospects.length,
    new: prospects.filter(p => p.status === "new").length,
    reached_out: prospects.filter(p => p.status === "reached_out").length,
    responded: prospects.filter(p => p.status === "responded").length,
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1B1B1B]">Leads</h1>
            <p className="text-sm text-[#999] mt-1">Track prospects and outreach status</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2 text-[#999] hover:text-[#1B1B1B] transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="size-4" />
            </button>
            <button
              onClick={addProspect}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
            >
              <PlusIcon className="size-3.5" />
              Add Lead
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#F0F0F0]">
          {(["all", "new", "reached_out", "responded"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                filterStatus === s
                  ? "border-[#1B1B1B] text-[#1B1B1B]"
                  : "border-transparent text-[#999] hover:text-[#666]"
              }`}
            >
              {s === "all" ? "All" : PROSPECT_STATUSES[s].label}
              <span className="ml-1.5 text-[10px] text-[#999]">{counts[s]}</span>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-sm text-[#999]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-[#999]">No leads yet</p>
            <button
              onClick={addProspect}
              className="mt-3 text-xs text-[#1B1B1B] font-medium hover:underline"
            >
              + Add your first lead
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F0F0F0]">
                  <th className="text-left py-3 px-3 text-xs font-medium text-[#999] uppercase tracking-wider w-5"></th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-[#999] uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-[#999] uppercase tracking-wider">Brand</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-[#999] uppercase tracking-wider">URL</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-[#999] uppercase tracking-wider">Rev</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-[#999] uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-[#999] uppercase tracking-wider">Status</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const isEditing = editingId === p.id;
                  const st = PROSPECT_STATUSES[p.status];
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                      onClick={() => { if (!isEditing) setEditingId(p.id); }}
                    >
                      {/* Priority flag */}
                      <td className="py-2.5 px-1 text-center">
                        {p.priority_flag && <span className="inline-block size-2 rounded-full bg-amber-400" title="Priority" />}
                      </td>
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={p.name}
                            onChange={e => updateField(p.id, "name", e.target.value)}
                            onBlur={() => saveRow(p.id)}
                            onKeyDown={e => e.key === "Enter" && saveRow(p.id)}
                            placeholder="Contact name"
                            className="w-full px-2 py-1 text-sm border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B]"
                          />
                        ) : (
                          <span className={p.name ? "text-[#1B1B1B]" : "text-[#CCC]"}>
                            {p.name || "---"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <input
                            value={p.brand}
                            onChange={e => updateField(p.id, "brand", e.target.value)}
                            onBlur={() => saveRow(p.id)}
                            onKeyDown={e => e.key === "Enter" && saveRow(p.id)}
                            placeholder="Brand name"
                            className="w-full px-2 py-1 text-sm border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B]"
                          />
                        ) : (
                          <span className={p.brand ? "text-[#1B1B1B] font-medium" : "text-[#CCC]"}>
                            {p.brand || "---"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <input
                            value={p.url}
                            onChange={e => updateField(p.id, "url", e.target.value)}
                            onBlur={() => saveRow(p.id)}
                            onKeyDown={e => e.key === "Enter" && saveRow(p.id)}
                            placeholder="https://..."
                            className="w-full px-2 py-1 text-sm border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B]"
                          />
                        ) : p.url ? (
                          <a
                            href={p.url.startsWith("http") ? p.url : `https://${p.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-blue-600 hover:underline truncate block max-w-[200px]"
                          >
                            {p.url.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          <span className="text-[#CCC]">---</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <input
                            value={p.rev_estimate}
                            onChange={e => updateField(p.id, "rev_estimate", e.target.value)}
                            onBlur={() => saveRow(p.id)}
                            onKeyDown={e => e.key === "Enter" && saveRow(p.id)}
                            placeholder="e.g. 500k/mo"
                            className="w-full px-2 py-1 text-sm border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B]"
                          />
                        ) : (
                          <span className={p.rev_estimate ? "text-[#1B1B1B]" : "text-[#CCC]"}>
                            {p.rev_estimate || "---"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {p.email ? (
                          <a
                            href={`mailto:${p.email}`}
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-blue-600 hover:underline truncate block max-w-[180px]"
                          >
                            {p.email}
                          </a>
                        ) : (
                          <span className="text-[#CCC] text-xs">---</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={p.status}
                          onChange={async e => {
                            const next = prospects.map(x =>
                              x.id === p.id
                                ? { ...x, status: e.target.value as ProspectStatus, updated_at: new Date().toISOString() }
                                : x
                            );
                            await persist(next);
                          }}
                          onClick={e => e.stopPropagation()}
                          className="text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none"
                          style={{
                            backgroundColor: `${st.color}18`,
                            color: st.color,
                          }}
                        >
                          {Object.entries(PROSPECT_STATUSES).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-1">
                        <button
                          onClick={e => { e.stopPropagation(); deleteProspect(p.id); }}
                          className="p-1.5 text-[#CCC] hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
