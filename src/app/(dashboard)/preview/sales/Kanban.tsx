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
              className="w-[240px] shrink-0 flex flex-col rounded-xl bg-background border border-surface-raised transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("border-subtle", "bg-surface");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("border-subtle", "bg-surface");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-subtle", "bg-surface");
                if (draggedId) onMove(draggedId, stage.id);
                setDraggedId(null);
              }}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-surface-raised">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {stage.name}
                </span>
                <span className="text-[10px] text-subtle tabular-nums">{stage.probability}%</span>
                <span className="ml-auto text-[10px] text-subtle tabular-nums">
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
                      className={`bg-surface border rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all ${
                        selectedId === lead.id ? "border-foreground/40" : "border-border hover:border-subtle"
                      } ${draggedId === lead.id ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground leading-tight">{lead.company}</p>
                        <span className="shrink-0 size-5 rounded-full bg-border text-[9px] font-semibold text-muted flex items-center justify-center">
                          {ownerInitials(lead.owner_id)}
                        </span>
                      </div>
                      <p className="text-[10px] text-subtle mt-0.5">{lead.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-medium text-muted tabular-nums">
                          {fmtMoney(lead.expected_mrr)}/mo
                        </span>
                        {temp && (
                          <span className="ml-auto inline-flex items-center gap-1 text-[9px] text-muted">
                            <span className="size-1.5 rounded-full" style={{ background: temp.dot }} />
                            {temp.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {stageLeads.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-[10px] text-subtle">
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
