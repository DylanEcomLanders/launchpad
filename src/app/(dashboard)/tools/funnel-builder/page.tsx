"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import {
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import FunnelCanvas, { type FunnelCanvasHandle } from "@/components/funnel-builder/FunnelCanvas";
import { inputClass, selectClass, labelClass } from "@/lib/form-styles";
import {
  getFunnels,
  createFunnel,
  updateFunnel,
  deleteFunnel,
} from "@/lib/funnel-builder/data";
import type { FunnelData } from "@/lib/funnel-builder/types";
import { funnelTemplates } from "@/lib/funnel-builder/templates";
import {
  trafficSources,
  pageNodeTypes,
  trafficSourceConfigs,
  pageNodeConfigs,
  statusColors,
} from "@/lib/funnel-builder/constants";
import type {
  FunnelNodeData,
  FunnelMode,
  FunnelNodeStatus,
  TrafficWarmth,
  TrafficSource,
  PageNodeType,
  SerializedNode,
  SerializedEdge,
  ContentSlot,
} from "@/lib/funnel-builder/types";
import { leadMagnetConfig, emailSequenceConfig, cvrBenchmarks } from "@/lib/funnel-builder/constants";
import type { Node, Edge } from "@xyflow/react";

/* ── Helper ── */
function genId() {
  return `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Calculate funnel health score (0-100) */
function calcHealthScore(nodes: SerializedNode[]): number {
  if (nodes.length === 0) return 0;

  // 1. Live status (40%)
  const liveCount = nodes.filter((n) => n.data.status === "live").length;
  const liveScore = (liveCount / nodes.length) * 100;

  // 2. CVR vs benchmarks (40%) — only for nodes with CVR data
  const nodesWithCvr = nodes.filter((n) => n.data.metrics?.cvr != null);
  let cvrScore = 50; // default if no CVR data
  if (nodesWithCvr.length > 0) {
    const scores = nodesWithCvr.map((n) => {
      const benchmark = cvrBenchmarks[n.data.subType as string] || 3;
      const actual = n.data.metrics!.cvr!;
      return Math.min(100, (actual / benchmark) * 100);
    });
    cvrScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // 3. Content completion (20%)
  const nodesWithSlots = nodes.filter((n) => n.data.contentSlots);
  let contentScore = 50; // default if no content slots
  if (nodesWithSlots.length > 0) {
    const completions = nodesWithSlots.map((n) => {
      const slots = Object.values(n.data.contentSlots!);
      return (slots.filter(Boolean).length / slots.length) * 100;
    });
    contentScore = completions.reduce((a, b) => a + b, 0) / completions.length;
  }

  return Math.round(liveScore * 0.4 + cvrScore * 0.4 + contentScore * 0.2);
}

function healthColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-500";
}

function healthBg(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function templateToNodes(
  tmpl: (typeof funnelTemplates)[number]
): { nodes: SerializedNode[]; edges: SerializedEdge[] } {
  const nodes: SerializedNode[] = tmpl.nodes.map((n, i) => ({
    ...n,
    id: `t${i}_${genId()}`,
  }));
  const edges: SerializedEdge[] = tmpl.edges.map((e, i) => ({
    id: `e${i}_${Date.now().toString(36)}`,
    source: nodes[e.source].id,
    target: nodes[e.target].id,
    type: "funnelEdge",
  }));
  return { nodes, edges };
}

export default function FunnelBuilderPage() {
  const [funnels, setFunnels] = useState<FunnelData[]>([]);
  const [activeFunnel, setActiveFunnel] = useState<FunnelData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasHandle = useRef<FunnelCanvasHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current canvas state refs (updated on change)
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  useEffect(() => {
    getFunnels().then(setFunnels);
  }, []);

  const reloadFunnels = () => getFunnels().then(setFunnels);

  /* ── CRUD ── */

  const handleCreate = async (templateId?: string) => {
    const tmpl = templateId
      ? funnelTemplates.find((t) => t.id === templateId)
      : null;
    const initial = tmpl
      ? templateToNodes(tmpl)
      : { nodes: [], edges: [] };

    const funnel = await createFunnel({
      name: tmpl ? `${tmpl.name} Funnel` : "New Funnel",
      clientName: "",
      mode: "strategy",
      nodes: initial.nodes,
      edges: initial.edges,
    });
    await reloadFunnels();
    setActiveFunnel(funnel);
    setSelectedNode(null);
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    await deleteFunnel(id);
    await reloadFunnels();
    if (activeFunnel?.id === id) {
      setActiveFunnel(null);
      setSelectedNode(null);
    }
    setDeleteConfirm(null);
  };

  const handleBack = async () => {
    if (activeFunnel) {
      await updateFunnel(activeFunnel.id, {
        nodes: nodesRef.current as unknown as SerializedNode[],
        edges: edgesRef.current as unknown as SerializedEdge[],
      });
    }
    setActiveFunnel(null);
    setSelectedNode(null);
    await reloadFunnels();
  };

  /* ── Auto-save ── */
  const debouncedSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (activeFunnel) {
        updateFunnel(activeFunnel.id, {
          nodes: nodesRef.current as unknown as SerializedNode[],
          edges: edgesRef.current as unknown as SerializedEdge[],
        });
      }
    }, 1000);
  }, [activeFunnel]);

  const handleNodesChange = useCallback(
    (nodes: Node[]) => {
      nodesRef.current = nodes;
      debouncedSave();
    },
    [debouncedSave]
  );

  const handleEdgesChange = useCallback(
    (edges: Edge[]) => {
      edgesRef.current = edges;
      debouncedSave();
    },
    [debouncedSave]
  );

  /* ── Mode / Name / Client ── */
  const updateField = (field: string, value: string) => {
    if (!activeFunnel) return;
    setActiveFunnel({ ...activeFunnel, [field]: value });
    updateFunnel(activeFunnel.id, { [field]: value });
  };

  /* ── Selected node editing ── */
  const updateNodeData = (field: string, value: string | number) => {
    if (!selectedNode || !activeFunnel) return;
    const updatedNodes = nodesRef.current.map((n) =>
      n.id === selectedNode.id
        ? {
            ...n,
            data: {
              ...(n.data as unknown as FunnelNodeData),
              [field]: value,
              ...(field === "subType" && {
                label:
                  trafficSourceConfigs[value as TrafficSource]?.label ||
                  pageNodeConfigs[value as PageNodeType]?.label ||
                  value,
              }),
            },
          }
        : n
    );
    nodesRef.current = updatedNodes;
    canvasHandle.current?.setNodes(updatedNodes);
    // Update selectedNode in place so the editor panel stays in sync
    const updatedSelected = updatedNodes.find((n) => n.id === selectedNode.id);
    if (updatedSelected) setSelectedNode(updatedSelected);
    debouncedSave();
  };

  const updateNodeMetric = (field: string, value: string) => {
    if (!selectedNode || !activeFunnel) return;
    const num = value === "" ? undefined : Number(value);
    const updatedNodes = nodesRef.current.map((n) =>
      n.id === selectedNode.id
        ? {
            ...n,
            data: {
              ...(n.data as unknown as FunnelNodeData),
              metrics: {
                ...((n.data as unknown as FunnelNodeData).metrics || {}),
                [field]: num,
              },
            },
          }
        : n
    );
    nodesRef.current = updatedNodes;
    canvasHandle.current?.setNodes(updatedNodes);
    const updatedSelected = updatedNodes.find((n) => n.id === selectedNode.id);
    if (updatedSelected) setSelectedNode(updatedSelected);
    debouncedSave();
  };

  const deleteNode = async () => {
    if (!selectedNode || !activeFunnel) return;
    const nodeId = selectedNode.id;
    const updatedNodes = nodesRef.current.filter((n) => n.id !== nodeId);
    const updatedEdges = edgesRef.current.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );
    nodesRef.current = updatedNodes;
    edgesRef.current = updatedEdges;
    canvasHandle.current?.setNodes(updatedNodes);
    canvasHandle.current?.setEdges(updatedEdges);
    setSelectedNode(null);
    const saved = await updateFunnel(activeFunnel.id, {
      nodes: updatedNodes as unknown as SerializedNode[],
      edges: updatedEdges as unknown as SerializedEdge[],
    });
    if (saved) setActiveFunnel(saved);
  };

  /* ── Export PNG ── */
  const handleExport = async () => {
    const el = canvasRef.current?.querySelector(".react-flow__viewport") as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#FAFAFA",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${activeFunnel?.name || "funnel"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  /* ── Drag start from palette ── */
  const onDragStart = (
    event: React.DragEvent,
    nodeType: "traffic" | "page" | "lead-magnet" | "email-sequence",
    subType: string
  ) => {
    const data: FunnelNodeData = {
      nodeType,
      subType: subType as TrafficSource | PageNodeType,
      label:
        trafficSourceConfigs[subType as TrafficSource]?.label ||
        pageNodeConfigs[subType as PageNodeType]?.label ||
        (nodeType === "lead-magnet" ? "Lead Magnet" : nodeType === "email-sequence" ? "Email Sequence" : subType),
      status: "planned",
      ...(nodeType === "lead-magnet" ? { leadMagnetFormat: "pdf" as const, contentSlots: { headline: false, hook: false, offer: false, cta: false, socialProof: false } } : {}),
      ...(nodeType === "email-sequence" ? { emailSequenceMetrics: { emailCount: 5, openRate: undefined, clickRate: undefined } } : {}),
      ...((nodeType === "page") ? { contentSlots: { headline: false, hook: false, offer: false, cta: false, socialProof: false } } : {}),
    };
    event.dataTransfer.setData("application/reactflow", JSON.stringify(data));
    event.dataTransfer.effectAllowed = "move";
  };

  /* ── Funnel List View ── */
  if (!activeFunnel) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <DecorativeBlocks />
        <div className="relative z-10 max-w-4xl mx-auto py-10 px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Funnel Builder</h1>
            <p className="text-sm text-[#7A7A7A] mt-1">
              Visually map out e-commerce purchase funnels for clients
            </p>
          </div>

          {/* Create buttons */}
          <div className="mb-8">
            <p className={labelClass}>Start from template</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {funnelTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleCreate(t.id)}
                  className="text-left p-4 bg-white border border-[#E5E5EA] rounded-lg hover:border-[#1B1B1B] transition-colors"
                >
                  <p className="text-sm font-semibold text-[#1B1B1B]">{t.name}</p>
                  <p className="text-xs text-[#7A7A7A] mt-0.5">{t.description}</p>
                </button>
              ))}
              <button
                onClick={() => handleCreate()}
                className="flex items-center justify-center gap-2 p-4 border border-dashed border-[#E5E5EA] rounded-lg text-[#7A7A7A] hover:border-[#1B1B1B] hover:text-[#1B1B1B] transition-colors"
              >
                <PlusIcon className="size-4" />
                <span className="text-sm font-medium">Blank Canvas</span>
              </button>
            </div>
          </div>

          {/* Existing funnels */}
          {funnels.length > 0 && (
            <div>
              <p className={labelClass}>Your funnels</p>
              <div className="space-y-2">
                {funnels.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-4 bg-white border border-[#E5E5EA] rounded-lg hover:border-[#CCC] transition-colors"
                  >
                    <button
                      onClick={() => {
                        setActiveFunnel(f);
                        setSelectedNode(null);
                      }}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-semibold text-[#1B1B1B]">
                        {f.name || "Untitled Funnel"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-[#7A7A7A]">
                          {f.nodes.length} nodes · {f.clientName || "No client"} · {f.mode === "performance" ? "Performance" : "Strategy"}
                        </p>
                        {f.nodes.length > 0 && (() => {
                          const score = calcHealthScore(f.nodes);
                          return (
                            <span className={`text-[10px] font-bold ${healthColor(score)}`}>{score}/100</span>
                          );
                        })()}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(f.id);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        deleteConfirm === f.id
                          ? "bg-red-50 text-red-500"
                          : "text-[#AAA] hover:text-red-400"
                      }`}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Editor View ── */
  const nodeData = selectedNode?.data as unknown as FunnelNodeData | undefined;

  return (
    <div className="flex h-[calc(100vh-1rem)] overflow-hidden">
      {/* Left Sidebar: Palette + Node Editor */}
      <div className="w-64 flex-shrink-0 border-r border-[#E5E5EA] bg-white flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5EA]">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors mb-3"
          >
            <ArrowLeftIcon className="size-3" />
            Back
          </button>
          <input
            type="text"
            value={activeFunnel.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full text-sm font-semibold text-[#1B1B1B] bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
            placeholder="Funnel name..."
          />
          <input
            type="text"
            value={activeFunnel.clientName}
            onChange={(e) => updateField("clientName", e.target.value)}
            className="w-full text-xs text-[#7A7A7A] bg-transparent border-0 p-0 mt-1 focus:outline-none focus:ring-0"
            placeholder="Client name..."
          />
        </div>

        {/* Health Score */}
        {activeFunnel.nodes.length > 0 && (() => {
          const score = calcHealthScore(activeFunnel.nodes);
          return (
            <div className="p-4 border-b border-[#E5E5EA]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Health</span>
                <span className={`text-sm font-bold ${healthColor(score)}`}>{score}</span>
              </div>
              <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div className={`h-full ${healthBg(score)} rounded-full transition-all`} style={{ width: `${score}%` }} />
              </div>
            </div>
          );
        })()}

        {/* Mode + Export */}
        <div className="p-4 border-b border-[#E5E5EA] space-y-2">
          <div className="flex bg-[#F5F5F5] rounded-lg p-0.5">
            {(["strategy", "performance"] as FunnelMode[]).map((m) => (
              <button
                key={m}
                onClick={() => updateField("mode", m)}
                className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors ${
                  activeFunnel.mode === m
                    ? "bg-white text-[#1B1B1B] shadow-sm"
                    : "text-[#999]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5] transition-colors"
          >
            <ArrowDownTrayIcon className="size-3" />
            Export PNG
          </button>
        </div>

        {/* Node Palette */}
        {!selectedNode && (
          <div className="p-4 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">
              Traffic Sources
            </p>
            <div className="space-y-1 mb-4">
              {trafficSources.map((s) => (
                <div
                  key={s}
                  draggable
                  onDragStart={(e) => onDragStart(e, "traffic", s)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#FAFAFA] border border-[#E5E5EA] cursor-grab hover:border-[#CCC] transition-colors text-xs"
                >
                  <span
                    className="text-[8px] font-bold uppercase px-1 py-0.5 rounded"
                    style={{
                      background: trafficSourceConfigs[s].color,
                      color: trafficSourceConfigs[s].textColor,
                    }}
                  >
                    {trafficSourceConfigs[s].short}
                  </span>
                  <span className="text-[#555]">{trafficSourceConfigs[s].label}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">
              Pages
            </p>
            <div className="space-y-1 mb-4">
              {pageNodeTypes.map((p) => (
                <div
                  key={p}
                  draggable
                  onDragStart={(e) => onDragStart(e, "page", p)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#FAFAFA] border border-[#E5E5EA] cursor-grab hover:border-[#CCC] transition-colors text-xs"
                >
                  <span
                    className="text-[8px] font-bold uppercase px-1 py-0.5 rounded"
                    style={{
                      background: pageNodeConfigs[p].color,
                      color: pageNodeConfigs[p].textColor,
                    }}
                  >
                    {pageNodeConfigs[p].short}
                  </span>
                  <span className="text-[#555]">{pageNodeConfigs[p].label}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">
              Lead Gen
            </p>
            <div className="space-y-1">
              <div
                draggable
                onDragStart={(e) => onDragStart(e, "lead-magnet", "Lead Magnet")}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#F0FDF4] border border-[#BBF7D0] cursor-grab hover:border-[#15803D] transition-colors text-xs"
              >
                <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-[#E6F9ED] text-[#15803D]">LM</span>
                <span className="text-[#555]">Lead Magnet</span>
              </div>
              <div
                draggable
                onDragStart={(e) => onDragStart(e, "email-sequence", "Email Sequence")}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#FFF7ED] border border-[#FED7AA] cursor-grab hover:border-[#C2410C] transition-colors text-xs"
              >
                <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-[#FDF2E9] text-[#C2410C]">SEQ</span>
                <span className="text-[#555]">Email Sequence</span>
              </div>
            </div>
          </div>
        )}

        {/* Node Editor */}
        {selectedNode && nodeData && (
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">
                Edit Node
              </p>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[10px] text-[#AAA] hover:text-[#1B1B1B]"
              >
                Done
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelClass}>Label</label>
                <input
                  type="text"
                  value={nodeData.label}
                  onChange={(e) => updateNodeData("label", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Type</label>
                <select
                  value={nodeData.subType}
                  onChange={(e) => updateNodeData("subType", e.target.value)}
                  className={selectClass}
                >
                  {nodeData.nodeType === "traffic" ? (
                    trafficSources.map((s) => (
                      <option key={s} value={s}>
                        {trafficSourceConfigs[s].label}
                      </option>
                    ))
                  ) : (
                    pageNodeTypes.map((p) => (
                      <option key={p} value={p}>
                        {pageNodeConfigs[p].label}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={nodeData.status}
                  onChange={(e) => updateNodeData("status", e.target.value)}
                  className={selectClass}
                >
                  <option value="planned">Planned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="live">Live</option>
                </select>
              </div>

              {/* Warmth (traffic nodes only) */}
              {nodeData.nodeType === "traffic" && (
                <div>
                  <label className={labelClass}>Traffic Warmth</label>
                  <select
                    value={nodeData.warmth || ""}
                    onChange={(e) => updateNodeData("warmth", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">No warmth set</option>
                    <option value="cold">Cold</option>
                    <option value="warm">Warm</option>
                    <option value="hot">Hot</option>
                  </select>
                </div>
              )}

              {/* Funnel Stage */}
              <div>
                <label className={labelClass}>Funnel Stage</label>
                <select
                  value={nodeData.stage || ""}
                  onChange={(e) => updateNodeData("stage", e.target.value)}
                  className={selectClass}
                >
                  <option value="">No stage set</option>
                  <option value="tofu">TOFU (Top of Funnel)</option>
                  <option value="mofu">MOFU (Middle of Funnel)</option>
                  <option value="bofu">BOFU (Bottom of Funnel)</option>
                </select>
              </div>

              {/* Lead Magnet format */}
              {nodeData.nodeType === "lead-magnet" && (
                <div>
                  <label className={labelClass}>Format</label>
                  <select
                    value={nodeData.leadMagnetFormat || "pdf"}
                    onChange={(e) => updateNodeData("leadMagnetFormat", e.target.value)}
                    className={selectClass}
                  >
                    <option value="pdf">PDF Guide</option>
                    <option value="video">Video</option>
                    <option value="tool">Tool / Calculator</option>
                    <option value="quiz">Quiz</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {/* Email Sequence fields */}
              {nodeData.nodeType === "email-sequence" && (
                <div className="space-y-2">
                  <div>
                    <label className={labelClass}>Email Count</label>
                    <input
                      type="number"
                      min={1}
                      value={nodeData.emailSequenceMetrics?.emailCount || ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value);
                        const updatedNodes = nodesRef.current.map((n) =>
                          n.id === selectedNode.id ? { ...n, data: { ...(n.data as unknown as FunnelNodeData), emailSequenceMetrics: { ...((n.data as unknown as FunnelNodeData).emailSequenceMetrics || {}), emailCount: val } } } : n
                        );
                        nodesRef.current = updatedNodes;
                        canvasHandle.current?.setNodes(updatedNodes);
                        const u = updatedNodes.find((n) => n.id === selectedNode.id);
                        if (u) setSelectedNode(u);
                        debouncedSave();
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Open Rate %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={nodeData.emailSequenceMetrics?.openRate ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value);
                        const updatedNodes = nodesRef.current.map((n) =>
                          n.id === selectedNode.id ? { ...n, data: { ...(n.data as unknown as FunnelNodeData), emailSequenceMetrics: { ...((n.data as unknown as FunnelNodeData).emailSequenceMetrics || {}), openRate: val } } } : n
                        );
                        nodesRef.current = updatedNodes;
                        canvasHandle.current?.setNodes(updatedNodes);
                        const u = updatedNodes.find((n) => n.id === selectedNode.id);
                        if (u) setSelectedNode(u);
                        debouncedSave();
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Click Rate %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={nodeData.emailSequenceMetrics?.clickRate ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value);
                        const updatedNodes = nodesRef.current.map((n) =>
                          n.id === selectedNode.id ? { ...n, data: { ...(n.data as unknown as FunnelNodeData), emailSequenceMetrics: { ...((n.data as unknown as FunnelNodeData).emailSequenceMetrics || {}), clickRate: val } } } : n
                        );
                        nodesRef.current = updatedNodes;
                        canvasHandle.current?.setNodes(updatedNodes);
                        const u = updatedNodes.find((n) => n.id === selectedNode.id);
                        if (u) setSelectedNode(u);
                        debouncedSave();
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {/* Content Slots (page + lead magnet nodes) */}
              {(nodeData.nodeType === "page" || nodeData.nodeType === "lead-magnet") && (
                <div className="pt-3 border-t border-[#E5E5EA]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Content Checklist</p>
                  {(["headline", "hook", "offer", "cta", "socialProof"] as const).map((slot) => {
                    const checked = nodeData.contentSlots?.[slot] || false;
                    const labels: Record<string, string> = { headline: "Headline written", hook: "Hook written", offer: "Offer defined", cta: "CTA written", socialProof: "Social proof added" };
                    return (
                      <label key={slot} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const updatedNodes = nodesRef.current.map((n) =>
                              n.id === selectedNode.id ? { ...n, data: { ...(n.data as unknown as FunnelNodeData), contentSlots: { ...((n.data as unknown as FunnelNodeData).contentSlots || { headline: false, hook: false, offer: false, cta: false, socialProof: false }), [slot]: e.target.checked } } } : n
                            );
                            nodesRef.current = updatedNodes;
                            canvasHandle.current?.setNodes(updatedNodes);
                            const u = updatedNodes.find((n) => n.id === selectedNode.id);
                            if (u) setSelectedNode(u);
                            debouncedSave();
                          }}
                          className="size-3.5 rounded border-[#CCC] text-[#1B1B1B] focus:ring-0"
                        />
                        <span className={`text-xs ${checked ? "text-[#1B1B1B]" : "text-[#999]"}`}>{labels[slot]}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Preview URL */}
              <div>
                <label className={labelClass}>
                  {nodeData.nodeType === "traffic" ? "Ad Preview URL" : nodeData.nodeType === "lead-magnet" ? "Lead Magnet URL" : "Page URL"}
                </label>
                <input
                  type="url"
                  value={nodeData.previewUrl || ""}
                  onChange={(e) => updateNodeData("previewUrl", e.target.value)}
                  className={inputClass}
                  placeholder={nodeData.nodeType === "traffic" ? "https://fb.me/ad/..." : "https://store.com/..."}
                />
              </div>

              {/* Metrics (performance mode only) */}
              {activeFunnel.mode === "performance" && (
                <div className="pt-3 border-t border-[#E5E5EA]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">
                    Metrics
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-[#AAA] uppercase">Traffic</label>
                      <input
                        type="number"
                        value={nodeData.metrics?.traffic ?? ""}
                        onChange={(e) => updateNodeMetric("traffic", e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-[#E5E5EA] rounded"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#AAA] uppercase">CVR %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={nodeData.metrics?.cvr ?? ""}
                        onChange={(e) => updateNodeMetric("cvr", e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-[#E5E5EA] rounded"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#AAA] uppercase">AOV $</label>
                      <input
                        type="number"
                        value={nodeData.metrics?.aov ?? ""}
                        onChange={(e) => updateNodeMetric("aov", e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-[#E5E5EA] rounded"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#AAA] uppercase">Drop-off %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={nodeData.metrics?.dropOff ?? ""}
                        onChange={(e) => updateNodeMetric("dropOff", e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-[#E5E5EA] rounded"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={deleteNode}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors mt-4"
              >
                <TrashIcon className="size-3.5" />
                Delete Node
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="flex-1 relative">
        <FunnelCanvas
          ref={canvasHandle}
          key={activeFunnel.id}
          initialNodes={activeFunnel.nodes}
          initialEdges={activeFunnel.edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodeSelect={setSelectedNode}
        />
      </div>
    </div>
  );
}
