"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FunnelNodeData } from "@/lib/funnel-builder/types";
import { trafficSourceConfigs, warmthColors, stageColors, type NodeTypeConfig } from "@/lib/funnel-builder/constants";
import type { TrafficSource } from "@/lib/funnel-builder/types";

function TrafficNodeComponent({ data: rawData, selected }: NodeProps) {
  const data = rawData as unknown as FunnelNodeData;
  const config: NodeTypeConfig =
    trafficSourceConfigs[data.subType as TrafficSource] || { label: data.subType, short: "?", color: "#F5F5F5", textColor: "#777" };
  const warmth = data.warmth ? warmthColors[data.warmth] : null;
  const stage = data.stage ? stageColors[data.stage] : null;

  return (
    <div
      className={`
        min-w-[170px] max-w-[220px] rounded-xl border bg-white transition-shadow
        ${selected ? "border-[#1B1B1B] shadow-lg" : "border-[#E5E5EA] shadow-sm hover:shadow-md"}
      `}
    >
      {/* Header bar */}
      <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-[#F0F0F0]">
        <span
          className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: config.color, color: config.textColor }}
        >
          {config.short}
        </span>
        {warmth && (
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: warmth.bg, color: warmth.text }}
          >
            {warmth.label}
          </span>
        )}
        {stage && (
          <span
            className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
            style={{ background: stage.bg, color: stage.text }}
          >
            {stage.label}
          </span>
        )}
        <span className="ml-auto text-[9px] font-medium text-[#CCC] uppercase tracking-wider">Traffic</span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <p className="text-[13px] font-semibold text-[#1B1B1B] leading-tight">{data.label}</p>

        {data.metrics?.traffic != null && (
          <p className="text-[11px] text-[#777] mt-2">
            <span className="font-semibold text-[#1B1B1B]">{data.metrics.traffic.toLocaleString()}</span> visits
          </p>
        )}

        {data.previewUrl && (
          <a
            href={data.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-2.5 px-2 py-1 text-[10px] font-medium text-[#2563EB] bg-[#EFF6FF] rounded-md hover:bg-[#DBEAFE] transition-colors"
          >
            <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2A2.5 2.5 0 002 4.5v7A2.5 2.5 0 004.5 14h7a2.5 2.5 0 002.5-2.5v-3a.5.5 0 00-1 0v3A1.5 1.5 0 0111.5 13h-7A1.5 1.5 0 013 11.5v-7A1.5 1.5 0 014.5 3h3a.5.5 0 000-1h-3zM9 2.5a.5.5 0 01.5-.5h4a.5.5 0 01.5.5v4a.5.5 0 01-1 0V3.707L8.354 8.354a.5.5 0 11-.708-.708L12.293 3H9.5a.5.5 0 01-.5-.5z" /></svg>
            Ad Preview
          </a>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-[#1B1B1B] !border-2 !border-white" />
    </div>
  );
}

export default memo(TrafficNodeComponent);
