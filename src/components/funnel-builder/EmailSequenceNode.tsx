"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FunnelNodeData } from "@/lib/funnel-builder/types";
import { emailSequenceConfig, statusColors, stageColors } from "@/lib/funnel-builder/constants";

function EmailSequenceNodeComponent({ data: rawData, selected }: NodeProps) {
  const data = rawData as unknown as FunnelNodeData;
  const status = statusColors[data.status] || statusColors.planned;
  const stage = data.stage ? stageColors[data.stage] : null;
  const esm = data.emailSequenceMetrics;

  return (
    <div
      className={`
        min-w-[180px] max-w-[240px] rounded-xl border bg-white transition-shadow
        ${selected ? "border-[#C2410C] shadow-lg" : "border-[#FED7AA] shadow-sm hover:shadow-md"}
      `}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-[#C2410C] !border-2 !border-white" />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#FDF2E9]">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: emailSequenceConfig.color, color: emailSequenceConfig.textColor }}
          >
            {emailSequenceConfig.short}
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
        <p className="text-[13px] font-semibold text-[#1B1B1B] leading-tight">{data.label || "Email Sequence"}</p>

        {/* Metrics */}
        {esm && (esm.emailCount != null || esm.openRate != null || esm.clickRate != null) && (
          <div className="mt-2.5 pt-2 border-t border-[#FDF2E9] grid grid-cols-3 gap-2">
            {esm.emailCount != null && (
              <div>
                <p className="text-[8px] text-[#AAA] uppercase tracking-wider mb-0.5">Emails</p>
                <p className="text-xs font-semibold text-[#1B1B1B]">{esm.emailCount}</p>
              </div>
            )}
            {esm.openRate != null && (
              <div>
                <p className="text-[8px] text-[#AAA] uppercase tracking-wider mb-0.5">Open</p>
                <p className={`text-xs font-semibold ${esm.openRate >= 30 ? "text-emerald-600" : esm.openRate < 15 ? "text-red-500" : "text-[#1B1B1B]"}`}>
                  {esm.openRate}%
                </p>
              </div>
            )}
            {esm.clickRate != null && (
              <div>
                <p className="text-[8px] text-[#AAA] uppercase tracking-wider mb-0.5">Click</p>
                <p className={`text-xs font-semibold ${esm.clickRate >= 3 ? "text-emerald-600" : esm.clickRate < 1 ? "text-red-500" : "text-[#1B1B1B]"}`}>
                  {esm.clickRate}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-[#C2410C] !border-2 !border-white" />
    </div>
  );
}

export default memo(EmailSequenceNodeComponent);
