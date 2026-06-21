"use client";

// Pipeline kanban — native HTML5 drag-and-drop (matches the existing
// sales-engine/pipeline board; the repo has no dnd library and we don't add
// one). Drag a lead card across stage columns -> onMove(leadId, stageId).
// Dropping into a won stage is handled upstream (opens the deal modal).

import { useState } from "react";
import type { Lead, PipelineStage, Temperature } from "@/lib/sales-dashboard/types";
import type { Owner } from "@/lib/sales-dashboard/mock-data";

const TEMP_STYLE: Record<Temperature, { dot: string; label: string }> = {
  hot: { dot: "#F97066", label: "Hot" },
  warm: { dot: "#F5A623", label: "Warm" },
  cold: { dot: "#5B8DEF", label: "Cold" },
  nurture: { dot: "#9CA3AF", label: "Nurture" },
};

const fmtMoney = (n: number) =>
  n >= 1000 ? `£${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `£${n}`;

export function Kanban({
  leads,
  stages,
  owners,
  onMove,
  onSelect,
  selectedId,
}: {
  leads: Lead[];
  stages: PipelineStage[];
  owners: Owner[];
  onMove: (leadId: string, stageId: string) => void;
  onSelect: (leadId: string) => void;
  selectedId: string | null;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const ownerInitials = (id: string) => owners.find((o) => o.id === id)?.initials ?? "?";

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 min-w-max pb-1">
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage_id === stage.id);
          const stageValue = stageLeads.reduce((s, l) => s + l.expected_mrr, 0);
          return (
            <div
              key={stage.id}
              className="w-[240px] shrink-0 flex flex-col rounded-xl bg-[#141414] border border-[#222222] transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("border-[#3A3A3A]", "bg-[#181818]");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("border-[#3A3A3A]", "bg-[#181818]");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-[#3A3A3A]", "bg-[#181818]");
                if (draggedId) onMove(draggedId, stage.id);
                setDraggedId(null);
              }}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#222222]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  {stage.name}
                </span>
                <span className="text-[10px] text-[#71757D] tabular-nums">{stage.probability}%</span>
                <span className="ml-auto text-[10px] text-[#71757D] tabular-nums">
                  {stageLeads.length} · {fmtMoney(stageValue)}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 p-2 min-h-[60vh]">
                {stageLeads.map((lead) => {
                  const temp = lead.temperature ? TEMP_STYLE[lead.temperature] : null;
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedId(lead.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onClick={() => onSelect(lead.id)}
                      className={`bg-[#1C1C1C] border rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all ${
                        selectedId === lead.id ? "border-[#E5E5EA]/40" : "border-[#2A2A2A] hover:border-[#3A3A3A]"
                      } ${draggedId === lead.id ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-[#E5E5EA] leading-tight">{lead.company}</p>
                        <span className="shrink-0 size-5 rounded-full bg-[#2A2A2A] text-[9px] font-semibold text-[#9CA3AF] flex items-center justify-center">
                          {ownerInitials(lead.owner_id)}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#71757D] mt-0.5">{lead.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-medium text-[#9CA3AF] tabular-nums">
                          {fmtMoney(lead.expected_mrr)}/mo
                        </span>
                        {temp && (
                          <span className="ml-auto inline-flex items-center gap-1 text-[9px] text-[#9CA3AF]">
                            <span className="size-1.5 rounded-full" style={{ background: temp.dot }} />
                            {temp.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {stageLeads.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-[10px] text-[#3A3A3A]">
                    Drop here
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
