"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FunnelNodeData, ContentSlot } from "@/lib/funnel-builder/types";
import { pageNodeConfigs, statusColors, stageColors, type NodeTypeConfig } from "@/lib/funnel-builder/constants";
import { agencyNodeConfigs } from "@/lib/growth-engine/agency-nodes";
import type { PageNodeType } from "@/lib/funnel-builder/types";

// Merge ecom + agency configs so both render correctly
const allPageConfigs: Record<string, NodeTypeConfig> = { ...pageNodeConfigs, ...agencyNodeConfigs };

function contentCompletion(slots?: ContentSlot): { done: number; total: number } | null {
  if (!slots) return null;
  const values = Object.values(slots);
  const done = values.filter(Boolean).length;
  if (done === 0) return null;
  return { done, total: values.length };
}

function PageNodeComponent({ data: rawData, selected }: NodeProps) {
  const data = rawData as unknown as FunnelNodeData;
  const config: NodeTypeConfig =
    allPageConfigs[data.subType as string] || { label: data.subType || data.label, short: (data.subType || "?").slice(0, 3).toUpperCase(), color: "#F0F0F0", textColor: "#555" };
  const status = statusColors[data.status] || statusColors.planned;
  const stage = data.stage ? stageColors[data.stage] : null;
  const m = data.metrics;
  const hasMetrics = m && (m.traffic != null || m.cvr != null || m.aov != null);
  const cc = contentCompletion(data.contentSlots);

  return (
    <div
      className={`
        min-w-[180px] max-w-[240px] rounded-xl border bg-white transition-shadow
        ${selected ? "border-[#1B1B1B] shadow-lg" : "border-[#E5E5EA] shadow-sm hover:shadow-md"}
      `}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-[#1B1B1B] !border-2 !border-white" />

      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#F0F0F0]">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: config.color, color: config.textColor }}
          >
            {config.short}
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
        <p className="text-[13px] font-semibold text-[#1B1B1B] leading-tight">{data.label || config.label}</p>

        {/* Content completion badge */}
        {cc && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 h-1 bg-[#F0F0F0] rounded-full overflow-hidden">
              <div className="h-full bg-[#1B1B1B] rounded-full" style={{ width: `${(cc.done / cc.total) * 100}%` }} />
            </div>
            <span className="text-[9px] text-[#777]">{cc.done}/{cc.total}</span>
          </div>
        )}

        {/* Metrics */}
        {hasMetrics && (
          <div className="mt-3 pt-2.5 border-t border-[#F0F0F0] grid grid-cols-2 gap-x-4 gap-y-2">
            {m.traffic != null && (
              <div>
                <p className="text-[8px] text-[#AAA] uppercase tracking-wider mb-0.5">Traffic</p>
                <p className="text-xs font-semibold text-[#1B1B1B]">{m.traffic.toLocaleString()}</p>
              </div>
            )}
            {m.cvr != null && (
              <div>
                <p className="text-[8px] text-[#AAA] uppercase tracking-wider mb-0.5">CVR</p>
                <p className={`text-xs font-semibold ${m.cvr >= 3 ? "text-emerald-600" : m.cvr < 1 ? "text-red-500" : "text-[#1B1B1B]"}`}>
                  {m.cvr}%
                </p>
              </div>
            )}
            {m.aov != null && (
              <div>
                <p className="text-[8px] text-[#AAA] uppercase tracking-wider mb-0.5">AOV</p>
                <p className="text-xs font-semibold text-[#1B1B1B]">${m.aov}</p>
              </div>
            )}
            {m.dropOff != null && (
              <div>
                <p className="text-[8px] text-[#AAA] uppercase tracking-wider mb-0.5">Drop-off</p>
                <p className={`text-xs font-semibold ${m.dropOff > 50 ? "text-red-500" : "text-[#1B1B1B]"}`}>
                  {m.dropOff}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* Preview link */}
        {data.previewUrl && (
          <a
            href={data.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-2.5 px-2 py-1 text-[10px] font-medium text-[#2563EB] bg-[#EFF6FF] rounded-md hover:bg-[#DBEAFE] transition-colors"
          >
            <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2A2.5 2.5 0 002 4.5v7A2.5 2.5 0 004.5 14h7a2.5 2.5 0 002.5-2.5v-3a.5.5 0 00-1 0v3A1.5 1.5 0 0111.5 13h-7A1.5 1.5 0 013 11.5v-7A1.5 1.5 0 014.5 3h3a.5.5 0 000-1h-3zM9 2.5a.5.5 0 01.5-.5h4a.5.5 0 01.5.5v4a.5.5 0 01-1 0V3.707L8.354 8.354a.5.5 0 11-.708-.708L12.293 3H9.5a.5.5 0 01-.5-.5z" /></svg>
            View Page
          </a>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-[#1B1B1B] !border-2 !border-white" />
    </div>
  );
}

export default memo(PageNodeComponent);
