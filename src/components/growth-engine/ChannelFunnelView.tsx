"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { growthNodeTypes, GROWTH_PALETTE } from "./GrowthNodes";
import type { GrowthChannel } from "@/lib/growth-engine/types";
import { CHANNELS } from "@/lib/growth-engine/constants";

interface Props {
  channel: GrowthChannel;
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave: (nodes: Node[], edges: Edge[]) => void;
  onBack: () => void;
}

function ChannelFunnelViewInner({ channel, initialNodes, initialEdges, onSave, onBack }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const channelConfig = CHANNELS.find((c) => c.key === channel);

  // Debounced save
  const debouncedSave = useCallback((n: Node[], e: Edge[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave(n, e), 1000);
  }, [onSave]);

  const handleNodesChange: typeof onNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    setNodes((nds) => { debouncedSave(nds, edges); return nds; });
  }, [onNodesChange, setNodes, edges, debouncedSave]);

  const handleEdgesChange: typeof onEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    setEdges((eds) => { debouncedSave(nodes, eds); return eds; });
  }, [onEdgesChange, setEdges, nodes, debouncedSave]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => {
      const newEdges = addEdge({ ...params, type: "smoothstep", animated: true }, eds);
      debouncedSave(nodes, newEdges);
      return newEdges;
    });
  }, [setEdges, nodes, debouncedSave]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/growthnode");
    if (!type || !reactFlowWrapper.current) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = { x: event.clientX - bounds.left - 100, y: event.clientY - bounds.top - 30 };

    const paletteItem = GROWTH_PALETTE.find((p) => p.type === type);
    const newNode: Node = {
      id: `gn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      position,
      data: {
        label: paletteItem?.label || "New Node",
        status: "planned",
        warmth: "cold",
      },
    };

    setNodes((nds) => {
      const updated = [...nds, newNode];
      debouncedSave(updated, edges);
      return updated;
    });
  }, [setNodes, edges, debouncedSave]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[] }) => {
    setSelectedNode(selected.length === 1 ? selected[0] : null);
  }, []);

  // Node editor
  const updateNodeData = useCallback((field: string, value: unknown) => {
    if (!selectedNode) return;
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === selectedNode.id ? { ...n, data: { ...n.data, [field]: value } } : n
      );
      debouncedSave(updated, edges);
      return updated;
    });
  }, [selectedNode, setNodes, edges, debouncedSave]);

  const nodeTypes = useMemo(() => growthNodeTypes, []);

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left sidebar — palette or editor */}
      <div className="w-64 border-r border-[#E5E5EA] bg-white overflow-y-auto shrink-0">
        {/* Back button */}
        <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-3 text-xs text-[#777] hover:text-[#1A1A1A] border-b border-[#F0F0F0] w-full">
          ← Back to Overview
        </button>

        {/* Channel header */}
        <div className="px-4 py-3 border-b border-[#F0F0F0]">
          <div className="flex items-center gap-2">
            <span className="text-lg" style={{ color: channelConfig?.color }}>{channelConfig?.icon}</span>
            <div>
              <p className="text-sm font-semibold">{channelConfig?.label} Funnel</p>
              <p className="text-[10px] text-[#AAA]">Drag nodes to build your funnel</p>
            </div>
          </div>
        </div>

        {selectedNode ? (
          /* Node editor */
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Edit Node</p>
            <div>
              <label className="text-[10px] text-[#777] block mb-1">Label</label>
              <input
                type="text"
                value={String(selectedNode.data?.label || "")}
                onChange={(e) => updateNodeData("label", e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#777] block mb-1">Status</label>
              <select
                value={String(selectedNode.data?.status || "planned")}
                onChange={(e) => updateNodeData("status", e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded"
              >
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#777] block mb-1">Notes</label>
              <textarea
                value={String(selectedNode.data?.notes || "")}
                onChange={(e) => updateNodeData("notes", e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded min-h-[60px]"
                placeholder="Add notes..."
              />
            </div>
            <div>
              <label className="text-[10px] text-[#777] block mb-1">URL</label>
              <input
                type="url"
                value={String(selectedNode.data?.url || "")}
                onChange={(e) => updateNodeData("url", e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded"
                placeholder="https://..."
              />
            </div>
          </div>
        ) : (
          /* Palette */
          <div className="p-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Drag to Canvas</p>
            {GROWTH_PALETTE.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/growthnode", item.type);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="flex items-center gap-2 px-3 py-2.5 border border-[#E5E5EA] rounded-lg cursor-grab hover:border-[#999] hover:shadow-sm transition-all"
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium text-[#1A1A1A]">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ type: "smoothstep", animated: true }}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#F0F0F0" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function ChannelFunnelView(props: Props) {
  return (
    <ReactFlowProvider>
      <ChannelFunnelViewInner {...props} />
    </ReactFlowProvider>
  );
}
