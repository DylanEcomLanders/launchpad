"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import FunnelCanvas, { type FunnelCanvasHandle } from "@/components/funnel-builder/FunnelCanvas";
import { inputClass, labelClass } from "@/lib/form-styles";
import { getGrowthEngine, saveGrowthEngine } from "@/lib/growth-engine/data";
import type { GrowthEngineData, GrowthChannel } from "@/lib/growth-engine/types";
import { CHANNELS, STAGES, STATUS_COLORS } from "@/lib/growth-engine/constants";
import type { SerializedNode, SerializedEdge, FunnelNodeData, TrafficSource, PageNodeType } from "@/lib/funnel-builder/types";
import { trafficSources, pageNodeTypes, trafficSourceConfigs, pageNodeConfigs, statusColors } from "@/lib/funnel-builder/constants";
import type { Node, Edge } from "@xyflow/react";

type Profile = "dylan" | "ajay";

const PROFILES = [
  { key: "dylan" as Profile, label: "Dylan", initials: "DE" },
  { key: "ajay" as Profile, label: "Ajay", initials: "AJ" },
];

const PLATFORMS: { key: GrowthChannel; label: string; icon: string; color: string }[] = [
  { key: "twitter", label: "Twitter / X", icon: "𝕏", color: "#1A1A1A" },
  { key: "linkedin", label: "LinkedIn", icon: "in", color: "#0A66C2" },
  { key: "tiktok", label: "TikTok", icon: "♪", color: "#7C3AED" },
  { key: "instagram", label: "Instagram", icon: "◎", color: "#E1306C" },
  { key: "email", label: "Email", icon: "✉", color: "#059669" },
  { key: "paid-media", label: "Paid", icon: "$", color: "#E37400" },
  { key: "outbound", label: "Outbound", icon: "→", color: "#6366F1" },
];

function genId() {
  return `gn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function GrowthEnginePage() {
  const [engine, setEngine] = useState<GrowthEngineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>("dylan");
  const [platform, setPlatform] = useState<GrowthChannel>("twitter");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const canvasRef = useRef<FunnelCanvasHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flow key = profile + platform
  const flowKey = `${profile}:${platform}`;

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getGrowthEngine();
    setEngine(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Get current flow
  const currentFlow = engine?.channelFlows?.[flowKey] || { nodes: [], edges: [] };

  // Debounced save
  const debouncedSave = useCallback(async (nodes: SerializedNode[], edges: SerializedEdge[]) => {
    if (!engine) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const updated = {
        ...engine,
        channelFlows: {
          ...engine.channelFlows,
          [flowKey]: { nodes, edges },
        },
      };
      setEngine(updated);
      await saveGrowthEngine(updated);
    }, 800);
  }, [engine, flowKey]);

  // Canvas change handlers
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  const handleNodesChange = useCallback((nodes: Node[]) => {
    nodesRef.current = nodes;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = nodes.map((n) => ({
      id: n.id,
      type: n.type || "pageNode",
      position: n.position,
      data: n.data as any,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debouncedSave(serialized, edgesRef.current.map((e) => ({
      id: e.id, source: e.source, target: e.target, type: e.type, data: e.data as any,
    })));
  }, [debouncedSave]);

  const handleEdgesChange = useCallback((edges: Edge[]) => {
    edgesRef.current = edges;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = edges.map((e) => ({
      id: e.id, source: e.source, target: e.target, type: e.type, data: e.data as any,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debouncedSave(nodesRef.current.map((n) => ({
      id: n.id, type: n.type || "pageNode", position: n.position, data: n.data as any,
    })), serialized);
  }, [debouncedSave]);

  // Update node data from editor
  const updateNodeData = useCallback((field: string, value: unknown) => {
    if (!selectedNode || !canvasRef.current) return;
    const updated = nodesRef.current.map((n) =>
      n.id === selectedNode.id ? { ...n, data: { ...n.data, [field]: value } } : n
    );
    canvasRef.current.setNodes(updated);
  }, [selectedNode]);

  // Overview stats
  const totalFlows = Object.keys(engine?.channelFlows || {}).length;
  const totalNodes = Object.values(engine?.channelFlows || {}).reduce(
    (acc, f) => acc + ((f as { nodes: unknown[] })?.nodes?.length || 0), 0
  );

  if (loading || !engine) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
      </div>
    );
  }

  const platformConfig = PLATFORMS.find((p) => p.key === platform)!;

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar — profile + platform tabs */}
      <div className="border-b border-[#E5E5EA] bg-white px-6 py-0 shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Profile switcher + title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 py-3">
              {PROFILES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => { setProfile(p.key); setSelectedNode(null); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                    profile === p.key
                      ? "bg-[#1A1A1A] text-white"
                      : "text-[#999] hover:text-[#1A1A1A] hover:bg-[#F5F5F5]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="h-5 w-px bg-[#E5E5EA]" />
            <h1 className="text-sm font-semibold text-[#1A1A1A]">Growth Engine</h1>
          </div>

          {/* Right: Stats */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-[#AAA]">{totalFlows} funnels · {totalNodes} nodes</span>
          </div>
        </div>

        {/* Platform tabs */}
        <div className="flex items-center gap-0 -mb-px">
          {PLATFORMS.map((p) => {
            const isActive = platform === p.key;
            const flowData = engine.channelFlows?.[`${profile}:${p.key}`];
            const nodeCount = (flowData as { nodes: unknown[] })?.nodes?.length || 0;
            return (
              <button
                key={p.key}
                onClick={() => { setPlatform(p.key); setSelectedNode(null); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-[#1A1A1A] text-[#1A1A1A]"
                    : "border-transparent text-[#999] hover:text-[#555]"
                }`}
              >
                <span style={{ color: isActive ? p.color : undefined }}>{p.icon}</span>
                {p.label}
                {nodeCount > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-[#1A1A1A] text-white" : "bg-[#F0F0F0] text-[#999]"}`}>
                    {nodeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main area — sidebar + canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — palette or node editor */}
        <div className="w-64 border-r border-[#E5E5EA] bg-white overflow-y-auto shrink-0">
          {selectedNode ? (
            /* Node editor */
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Edit Node</p>
                <button onClick={() => setSelectedNode(null)} className="text-[10px] text-[#CCC] hover:text-[#1A1A1A]">Done</button>
              </div>
              <div>
                <label className="text-[10px] text-[#777] block mb-1">Label</label>
                <input
                  type="text"
                  value={String((selectedNode.data as Record<string, unknown>)?.label || "")}
                  onChange={(e) => updateNodeData("label", e.target.value)}
                  className="w-full text-sm px-2 py-1.5 border border-[#E5E5EA] rounded"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#777] block mb-1">Status</label>
                <select
                  value={String((selectedNode.data as Record<string, unknown>)?.status || "planned")}
                  onChange={(e) => updateNodeData("status", e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded"
                >
                  <option value="planned">Planned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="live">Live</option>
                </select>
              </div>
              {selectedNode.type === "trafficNode" && (
                <div>
                  <label className="text-[10px] text-[#777] block mb-1">Warmth</label>
                  <select
                    value={String((selectedNode.data as Record<string, unknown>)?.warmth || "cold")}
                    onChange={(e) => updateNodeData("warmth", e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded"
                  >
                    <option value="cold">Cold</option>
                    <option value="warm">Warm</option>
                    <option value="hot">Hot</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] text-[#777] block mb-1">Preview URL</label>
                <input
                  type="url"
                  value={String((selectedNode.data as Record<string, unknown>)?.previewUrl || "")}
                  onChange={(e) => updateNodeData("previewUrl", e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-[10px] text-[#777] block mb-1">Notes</label>
                <textarea
                  value={String((selectedNode.data as Record<string, unknown>)?.notes || "")}
                  onChange={(e) => updateNodeData("notes", e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded min-h-[80px]"
                  placeholder="Strategy notes, ideas..."
                />
              </div>
            </div>
          ) : (
            /* Palette */
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">
                Traffic Sources
              </p>
              <div className="space-y-1.5 mb-5">
                {trafficSources.map((src) => {
                  const config = trafficSourceConfigs[src];
                  return (
                    <div
                      key={src}
                      draggable
                      onDragStart={(e) => {
                        const data = { nodeType: "traffic", subType: src, label: config.label, status: "planned" };
                        e.dataTransfer.setData("application/reactflow", JSON.stringify(data));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="flex items-center gap-2 px-3 py-2 border border-[#E5E5EA] rounded-lg cursor-grab hover:border-[#999] hover:shadow-sm transition-all"
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: config.color }} />
                      <span className="text-xs font-medium text-[#1A1A1A]">{config.label}</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">
                Pages & Actions
              </p>
              <div className="space-y-1.5">
                {pageNodeTypes.map((pType) => {
                  const config = pageNodeConfigs[pType];
                  return (
                    <div
                      key={pType}
                      draggable
                      onDragStart={(e) => {
                        const data = { nodeType: "page", subType: pType, label: config.label, status: "planned" };
                        e.dataTransfer.setData("application/reactflow", JSON.stringify(data));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="flex items-center gap-2 px-3 py-2 border border-[#E5E5EA] rounded-lg cursor-grab hover:border-[#999] hover:shadow-sm transition-all"
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: config.color }} />
                      <span className="text-xs font-medium text-[#1A1A1A]">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <FunnelCanvas
            key={flowKey}
            ref={canvasRef}
            initialNodes={currentFlow.nodes as any}
            initialEdges={currentFlow.edges as any}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
          />
        </div>
      </div>
    </div>
  );
}
