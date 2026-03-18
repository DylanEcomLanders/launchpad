"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import TrafficNode from "./TrafficNode";
import PageNode from "./PageNode";
import FunnelEdge from "./FunnelEdge";
import type { FunnelNodeData, SerializedNode, SerializedEdge } from "@/lib/funnel-builder/types";

interface FunnelCanvasProps {
  initialNodes: SerializedNode[];
  initialEdges: SerializedEdge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeSelect?: (node: Node | null) => void;
  readOnly?: boolean;
}

const nodeTypes = { trafficNode: TrafficNode, pageNode: PageNode };
const edgeTypes = { funnelEdge: FunnelEdge };

const defaultEdgeOptions = {
  type: "funnelEdge",
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#CCC" },
};

export default function FunnelCanvas({
  initialNodes,
  initialEdges,
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
  onNodeSelect,
  readOnly = false,
}: FunnelCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as unknown as Edge[]);
  const reactFlowRef = useRef<HTMLDivElement>(null);

  // Sync changes back to parent
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      // Defer callback to next tick so state is updated
      setTimeout(() => {
        onNodesChangeCallback?.(nodes);
      }, 0);
    },
    [onNodesChange, onNodesChangeCallback, nodes]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      setTimeout(() => {
        onEdgesChangeCallback?.(edges);
      }, 0);
    },
    [onEdgesChange, onEdgesChangeCallback, edges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge({ ...params, ...defaultEdgeOptions }, eds);
        setTimeout(() => onEdgesChangeCallback?.(newEdges), 0);
        return newEdges;
      });
    },
    [setEdges, onEdgesChangeCallback]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      onNodeSelect?.(selectedNodes.length === 1 ? selectedNodes[0] : null);
    },
    [onNodeSelect]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/reactflow");
      if (!raw) return;

      const data: FunnelNodeData = JSON.parse(raw);
      const bounds = reactFlowRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const newNode: Node = {
        id: `node_${Date.now().toString(36)}`,
        type: data.nodeType === "traffic" ? "trafficNode" : "pageNode",
        position: { x: event.clientX - bounds.left - 80, y: event.clientY - bounds.top - 30 },
        data: data as unknown as Record<string, unknown>,
      };

      setNodes((nds) => {
        const updated = [...nds, newNode];
        setTimeout(() => onNodesChangeCallback?.(updated), 0);
        return updated;
      });
    },
    [setNodes, onNodesChangeCallback]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div ref={reactFlowRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onSelectionChange={onSelectionChange}
        onDrop={readOnly ? undefined : onDrop}
        onDragOver={readOnly ? undefined : onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        className="bg-[#FAFAFA]"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#E5E5EA" />
        <Controls
          showInteractive={false}
          className="!bg-white !border-[#E5E5EA] !shadow-sm [&>button]:!border-[#E5E5EA] [&>button]:!bg-white [&>button:hover]:!bg-[#F5F5F5]"
        />
        <MiniMap
          nodeColor="#E5E5EA"
          maskColor="rgba(255,255,255,0.8)"
          className="!bg-[#FAFAFA] !border-[#E5E5EA]"
        />
      </ReactFlow>
    </div>
  );
}

/** Expose setNodes/setEdges for parent to update externally */
export { useNodesState, useEdgesState };
