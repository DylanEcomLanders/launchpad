"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

/* ── Shared node shell ── */
function NodeShell({
  badge,
  badgeColor,
  statusDot,
  label,
  subtitle,
  metrics,
  children,
}: {
  badge: string;
  badgeColor: string;
  statusDot: string;
  label: string;
  subtitle?: string;
  metrics?: { label: string; value: string }[];
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-[#E8E8E8] min-w-[200px] max-w-[240px] overflow-hidden">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#999] !border-white !border-2" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#999] !border-white !border-2" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#FAFAFA] border-b border-[#F0F0F0]">
        <span className="text-[9px] font-bold uppercase tracking-wider text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: badgeColor }}>
          {badge}
        </span>
        <span className={`size-2 rounded-full ${statusDot}`} />
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold text-[#1A1A1A] leading-tight">{label}</p>
        {subtitle && <p className="text-[10px] text-[#999] mt-0.5">{subtitle}</p>}

        {metrics && metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-[#F0F0F0]">
            {metrics.map((m) => (
              <div key={m.label}>
                <p className="text-[8px] uppercase text-[#BBB]">{m.label}</p>
                <p className="text-[11px] font-semibold text-[#1A1A1A]">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

/* ── Status dot helper ── */
const statusDot = (status: string) =>
  status === "live" ? "bg-emerald-500" : status === "in-progress" ? "bg-blue-500" : "bg-[#CCC]";

/* ── Content Node ── */
export const ContentNode = memo(({ data }: NodeProps) => {
  const d = data as Record<string, unknown>;
  const metrics = d.metrics as Record<string, number> | undefined;
  return (
    <NodeShell
      badge="Content"
      badgeColor="#3B82F6"
      statusDot={statusDot(String(d.status || "planned"))}
      label={String(d.label || "Content Piece")}
      subtitle={String(d.platform || d.format || "")}
      metrics={metrics ? [
        { label: "Impressions", value: String(metrics.impressions ?? "—") },
        { label: "Engagement", value: metrics.clicks ? `${((metrics.clicks / (metrics.impressions || 1)) * 100).toFixed(1)}%` : "—" },
      ] : undefined}
    />
  );
});
ContentNode.displayName = "ContentNode";

/* ── Lead Magnet Node ── */
export const LeadMagnetNode = memo(({ data }: NodeProps) => {
  const d = data as Record<string, unknown>;
  const metrics = d.metrics as Record<string, number> | undefined;
  return (
    <NodeShell
      badge="Lead Magnet"
      badgeColor="#F59E0B"
      statusDot={statusDot(String(d.status || "planned"))}
      label={String(d.label || "Lead Magnet")}
      subtitle={String(d.magnetType || "Free guide / audit / tool")}
      metrics={metrics ? [
        { label: "Leads", value: String(metrics.leads ?? "—") },
        { label: "CVR", value: metrics.conversions && metrics.clicks ? `${((metrics.conversions / metrics.clicks) * 100).toFixed(1)}%` : "—" },
      ] : undefined}
    />
  );
});
LeadMagnetNode.displayName = "LeadMagnetNode";

/* ── Email Sequence Node ── */
export const EmailSequenceNode = memo(({ data }: NodeProps) => {
  const d = data as Record<string, unknown>;
  const metrics = d.metrics as Record<string, number> | undefined;
  return (
    <NodeShell
      badge="Email Sequence"
      badgeColor="#F97316"
      statusDot={statusDot(String(d.status || "planned"))}
      label={String(d.label || "Email Sequence")}
      subtitle={d.emailCount ? `${d.emailCount} emails` : "Nurture flow"}
      metrics={metrics ? [
        { label: "Open Rate", value: metrics.impressions ? `${metrics.impressions}%` : "—" },
        { label: "Click Rate", value: metrics.clicks ? `${metrics.clicks}%` : "—" },
      ] : undefined}
    />
  );
});
EmailSequenceNode.displayName = "EmailSequenceNode";

/* ── Outbound Node ── */
export const OutboundNode = memo(({ data }: NodeProps) => {
  const d = data as Record<string, unknown>;
  const metrics = d.metrics as Record<string, number> | undefined;
  return (
    <NodeShell
      badge="Outbound"
      badgeColor="#6366F1"
      statusDot={statusDot(String(d.status || "planned"))}
      label={String(d.label || "Outbound Campaign")}
      subtitle={String(d.method || "Cold DM / Email")}
      metrics={metrics ? [
        { label: "Sent", value: String(metrics.impressions ?? "—") },
        { label: "Response", value: metrics.clicks ? `${((metrics.clicks / (metrics.impressions || 1)) * 100).toFixed(1)}%` : "—" },
      ] : undefined}
    />
  );
});
OutboundNode.displayName = "OutboundNode";

/* ── Convert Node ── */
export const ConvertNode = memo(({ data }: NodeProps) => {
  const d = data as Record<string, unknown>;
  const metrics = d.metrics as Record<string, number> | undefined;
  return (
    <NodeShell
      badge="Convert"
      badgeColor="#EF4444"
      statusDot={statusDot(String(d.status || "planned"))}
      label={String(d.label || "Conversion Point")}
      subtitle={String(d.conversionType || "Call / Proposal / WhatsApp")}
      metrics={metrics ? [
        { label: "Calls", value: String(metrics.leads ?? "—") },
        { label: "Closed", value: String(metrics.conversions ?? "—") },
      ] : undefined}
    />
  );
});
ConvertNode.displayName = "ConvertNode";

/* ── Node type map for React Flow ── */
export const growthNodeTypes = {
  contentNode: ContentNode,
  leadMagnetNode: LeadMagnetNode,
  emailSequenceNode: EmailSequenceNode,
  outboundNode: OutboundNode,
  convertNode: ConvertNode,
};

/* ── Palette items for drag-and-drop ── */
export const GROWTH_PALETTE = [
  { type: "contentNode", label: "Content", color: "#3B82F6", stage: "content" },
  { type: "leadMagnetNode", label: "Lead Magnet", color: "#F59E0B", stage: "capture" },
  { type: "emailSequenceNode", label: "Email Sequence", color: "#F97316", stage: "nurture" },
  { type: "outboundNode", label: "Outbound", color: "#6366F1", stage: "content" },
  { type: "convertNode", label: "Convert", color: "#EF4444", stage: "convert" },
];
