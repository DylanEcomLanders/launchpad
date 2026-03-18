"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FunnelNodeData } from "@/lib/funnel-builder/types";
import { trafficSourceConfigs, warmthColors, type NodeTypeConfig } from "@/lib/funnel-builder/constants";
import type { TrafficSource } from "@/lib/funnel-builder/types";

function TrafficNodeComponent({ data, selected }: NodeProps & { data: FunnelNodeData }) {
  const config: NodeTypeConfig =
    trafficSourceConfigs[data.subType as TrafficSource] || { label: data.subType, short: "?", color: "#F5F5F5", textColor: "#777" };
  const warmth = data.warmth ? warmthColors[data.warmth] : null;

  return (
    <div
      className={`
        min-w-[140px] rounded-lg border bg-white shadow-sm transition-shadow
        ${selected ? "border-[#1B1B1B] shadow-md" : "border-[#E5E5EA]"}
      `}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: config.color, color: config.textColor }}
          >
            {config.short}
          </span>
          {warmth && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: warmth.bg, color: warmth.text }}
            >
              {warmth.label}
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-[#1B1B1B] truncate">{data.label}</p>
        {data.metrics?.traffic != null && (
          <p className="text-[10px] text-[#777] mt-1">
            {data.metrics.traffic.toLocaleString()} visits
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#1B1B1B] !border-0" />
    </div>
  );
}

export default memo(TrafficNodeComponent);
