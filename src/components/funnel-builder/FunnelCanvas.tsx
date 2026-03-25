"use client";

import { useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
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

/* ── Undo / Redo history ── */
interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

export interface FunnelCanvasHandle {
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
}

const FunnelCanvasInner = forwardRef<FunnelCanvasHandle, FunnelCanvasProps>(function FunnelCanvasInner({
  initialNodes,
  initialEdges,
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
  onNodeSelect,
  readOnly = false,
}, ref) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as unknown as Edge[]);
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Expose setNodes/setEdges to parent
  useImperativeHandle(ref, () => ({
    setNodes: (n: Node[]) => setNodes(n),
    setEdges: (e: Edge[]) => setEdges(e),
  }), [setNodes, setEdges]);

  // Undo/redo stacks
  const history = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const isUndoRedo = useRef(false);

  // Keep refs in sync for undo snapshots
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Push a snapshot before a meaningful change
  const pushSnapshot = useCallback(() => {
    if (isUndoRedo.current) return;
    history.current.push({
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current)),
    });
    if (history.current.length > MAX_HISTORY) history.current.shift();
    future.current = []; // clear redo stack on new action
  }, []);

  const undo = useCallback(() => {
    if (history.current.length === 0) return;
    const snap = history.current.pop()!;
    future.current.push({
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current)),
    });
    isUndoRedo.current = true;
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setTimeout(() => {
      isUndoRedo.current = false;
      onNodesChangeCallback?.(snap.nodes);
      onEdgesChangeCallback?.(snap.edges);
    }, 0);
  }, [setNodes, setEdges, onNodesChangeCallback, onEdgesChangeCallback]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const snap = future.current.pop()!;
    history.current.push({
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current)),
    });
    isUndoRedo.current = true;
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setTimeout(() => {
      isUndoRedo.current = false;
      onNodesChangeCallback?.(snap.nodes);
      onEdgesChangeCallback?.(snap.edges);
    }, 0);
  }, [setNodes, setEdges, onNodesChangeCallback, onEdgesChangeCallback]);

  // Keyboard listener: Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z = redo
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [readOnly, undo, redo]);

  // Sync changes back to parent
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      // Snapshot before removes/adds (not position drags)
      const hasStructural = changes.some(
        (c) => c.type === "remove" || c.type === "add"
      );
      if (hasStructural) pushSnapshot();

      onNodesChange(changes);
      setTimeout(() => {
        onNodesChangeCallback?.(nodesRef.current);
      }, 0);
    },
    [onNodesChange, onNodesChangeCallback, pushSnapshot]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      const hasStructural = changes.some(
        (c) => c.type === "remove" || c.type === "add"
      );
      if (hasStructural) pushSnapshot();

      onEdgesChange(changes);
      setTimeout(() => {
        onEdgesChangeCallback?.(edgesRef.current);
      }, 0);
    },
    [onEdgesChange, onEdgesChangeCallback, pushSnapshot]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      pushSnapshot();
      setEdges((eds) => {
        const newEdges = addEdge({ ...params, ...defaultEdgeOptions }, eds);
        setTimeout(() => onEdgesChangeCallback?.(newEdges), 0);
        return newEdges;
      });
    },
    [setEdges, onEdgesChangeCallback, pushSnapshot]
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

      pushSnapshot();

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newNode: Node = {
        id: `node_${Date.now().toString(36)}`,
        type: data.nodeType === "traffic" ? "trafficNode" : "pageNode",
        position,
        data: data as unknown as Record<string, unknown>,
      };

      setNodes((nds) => {
        const updated = [...nds, newNode];
        setTimeout(() => onNodesChangeCallback?.(updated), 0);
        return updated;
      });
    },
    [setNodes, onNodesChangeCallback, pushSnapshot]
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
        onNodeClick={(_event, node) => onNodeSelect?.(node)}
        onPaneClick={() => onNodeSelect?.(null)}
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
});

const FunnelCanvas = forwardRef<FunnelCanvasHandle, FunnelCanvasProps>(function FunnelCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <FunnelCanvasInner {...props} ref={ref} />
    </ReactFlowProvider>
  );
});

export default FunnelCanvas;
