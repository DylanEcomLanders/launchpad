"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FunnelNodeData, ContentSlot } from "@/lib/funnel-builder/types";
import { leadMagnetConfig, statusColors, stageColors } from "@/lib/funnel-builder/constants";

function contentCompletion(slots?: ContentSlot): { done: number; total: number } {
  if (!slots) return { done: 0, total: 5 };
  const values = Object.values(slots);
  return { done: values.filter(Boolean).length, total: values.length };
}

function LeadMagnetNodeComponent({ data: rawData, selected }: NodeProps) {
  const data = rawData as unknown as FunnelNodeData;
  const status = statusColors[data.status] || statusColors.planned;
  const stage = data.stage ? stageColors[data.stage] : null;
  const format = data.leadMagnetFormat || "pdf";
  const optInCvr = data.leadMagnetMetrics?.optInCvr;
  const { done, total } = contentCompletion(data.contentSlots);

  return (
    <div
      className={`
        min-w-[180px] max-w-[240px] rounded-xl border bg-white transition-shadow
        ${selected ? "border-[#15803D] shadow-lg" : "border-[#BBF7D0] shadow-sm hover:shadow-md"}
      `}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-[#15803D] !border-2 !border-white" />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#E6F9ED]">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: leadMagnetConfig.color, color: leadMagnetConfig.textColor }}
          >
            {leadMagnetConfig.short}
          </span>
          {stage && (
            <span
              className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
              style={{ background: stage.bg, color: stage.text }}
            >
              {stage.label}
            </span>
          )}
        </div>
        <span
          className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: status.bg, color: status.text }}
        >
          <span className="size-1.5 rounded-full" style={{ background: status.dot }} />
          {data.status}
        </span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <p className="text-[13px] font-semibold text-[#1B1B1B] leading-tight">{data.label}</p>
        <p className="text-[10px] text-[#777] mt-1 capitalize">{format}</p>

        {/* Metrics */}
        {optInCvr != null && (
          <div className="mt-2 pt-2 border-t border-[#E6F9ED]">
            <p className="text-[8px] text-[#AAA] uppercase tracking-wider mb-0.5">Opt-in CVR</p>
            <p className={`text-xs font-semibold ${optInCvr >= 25 ? "text-emerald-600" : optInCvr < 10 ? "text-red-500" : "text-[#1B1B1B]"}`}>
              {optInCvr}%
            </p>
          </div>
        )}

        {/* Content completion badge */}
        {done > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 h-1 bg-[#E6F9ED] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <span className="text-[9px] text-[#777]">{done}/{total}</span>
          </div>
        )}

        {data.previewUrl && (
          <a href={data.previewUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-2.5 px-2 py-1 text-[10px] font-medium text-[#15803D] bg-[#E6F9ED] rounded-md hover:bg-[#BBF7D0] transition-colors">
            <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2A2.5 2.5 0 002 4.5v7A2.5 2.5 0 004.5 14h7a2.5 2.5 0 002.5-2.5v-3a.5.5 0 00-1 0v3A1.5 1.5 0 0111.5 13h-7A1.5 1.5 0 013 11.5v-7A1.5 1.5 0 014.5 3h3a.5.5 0 000-1h-3zM9 2.5a.5.5 0 01.5-.5h4a.5.5 0 01.5.5v4a.5.5 0 01-1 0V3.707L8.354 8.354a.5.5 0 11-.708-.708L12.293 3H9.5a.5.5 0 01-.5-.5z" /></svg>
            Preview
          </a>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-[#15803D] !border-2 !border-white" />
    </div>
  );
}

export default memo(LeadMagnetNodeComponent);
