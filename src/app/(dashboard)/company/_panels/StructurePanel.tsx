"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  MiniMap,
  type Node,
  type Edge,
  type NodeChange,
  applyNodeChanges,
  Position,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { peopleStore, nowISO } from "@/lib/company/data";
import { type Person, DEPARTMENTS } from "@/lib/company/types";
import { initials, deptColor } from "@/lib/company/ui";
import Link from "next/link";

const NODE_W = 220;
const NODE_H = 90;
const H_GAP = 40;
const V_GAP = 80;

function autoLayout(people: Person[]): Record<string, { x: number; y: number }> {
  // Build children map
  const children: Record<string, string[]> = {};
  for (const p of people) {
    if (p.reports_to) {
      (children[p.reports_to] ||= []).push(p.id);
    }
  }
  // Roots = people with no reports_to (or whose manager isn't in the set)
  const ids = new Set(people.map((p) => p.id));
  const roots = people.filter((p) => !p.reports_to || !ids.has(p.reports_to)).map((p) => p.id);

  const positions: Record<string, { x: number; y: number }> = {};

  // Recursive width calculation (subtree leaf count)
  const widths: Record<string, number> = {};
  function calcWidth(id: string): number {
    if (widths[id] != null) return widths[id];
    const kids = children[id] || [];
    if (kids.length === 0) {
      widths[id] = 1;
      return 1;
    }
    widths[id] = kids.reduce((s, k) => s + calcWidth(k), 0);
    return widths[id];
  }
  roots.forEach(calcWidth);

  // Place nodes top-down, left-to-right, centring parents over children
  let cursorX = 0;
  function place(id: string, depth: number): { left: number; right: number } {
    const kids = children[id] || [];
    if (kids.length === 0) {
      const x = cursorX * (NODE_W + H_GAP);
      const y = depth * (NODE_H + V_GAP);
      positions[id] = { x, y };
      cursorX += 1;
      return { left: x, right: x };
    }
    let left = Infinity;
    let right = -Infinity;
    for (const k of kids) {
      const span = place(k, depth + 1);
      if (span.left < left) left = span.left;
      if (span.right > right) right = span.right;
    }
    const x = (left + right) / 2;
    const y = depth * (NODE_H + V_GAP);
    positions[id] = { x, y };
    return { left, right };
  }
  roots.forEach((r) => place(r, 0));

  return positions;
}

export default function StructurePanel() {
  const [people, setPeople] = useState<Person[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    peopleStore.getAll().then((rows) => {
      setPeople(rows);
      setHydrated(true);
    });
  }, []);

  const edges = useMemo<Edge[]>(() => {
    return people
      .filter((p) => p.reports_to && people.find((x) => x.id === p.reports_to))
      .map((p) => ({
        id: `${p.reports_to}-${p.id}`,
        source: p.reports_to!,
        target: p.id,
        type: "smoothstep",
        style: { stroke: "#C5C5C5", strokeWidth: 1.5 },
      }));
  }, [people]);

  // Initial node placement
  useEffect(() => {
    if (!hydrated) return;
    const auto = autoLayout(people);
    const next: Node[] = people.map((p) => {
      const fallback = auto[p.id] || { x: 0, y: 0 };
      const x = p.chart_position_x ?? fallback.x;
      const y = p.chart_position_y ?? fallback.y;
      return {
        id: p.id,
        type: "person",
        position: { x, y },
        data: { person: p, onOpen: () => setPreviewId(p.id) },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    });
    setNodes(next);
  }, [hydrated, people]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [],
  );

  // Save positions on drag stop
  const onNodeDragStop = useCallback(
    async (_e: React.MouseEvent, node: Node) => {
      const updates: Partial<Person> = {
        chart_position_x: node.position.x,
        chart_position_y: node.position.y,
        updated_at: nowISO(),
      };
      await peopleStore.update(node.id, updates);
    },
    [],
  );

  function resetLayout() {
    if (!confirm("Reset all chart positions to auto-layout?")) return;
    const auto = autoLayout(people);
    const next: Node[] = people.map((p) => ({
      id: p.id,
      type: "person",
      position: auto[p.id] || { x: 0, y: 0 },
      data: { person: p, onOpen: () => setPreviewId(p.id) },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }));
    setNodes(next);
    Promise.all(
      people.map((p) =>
        peopleStore.update(p.id, {
          chart_position_x: auto[p.id]?.x,
          chart_position_y: auto[p.id]?.y,
        }),
      ),
    );
  }

  const previewPerson = previewId ? people.find((p) => p.id === previewId) : null;

  if (!hydrated) {
    return <div className="h-96 bg-background rounded-xl animate-pulse" />;
  }

  if (people.length === 0) {
    return (
      <div className="bg-background border border-dashed border-white/[0.04] rounded-xl p-12 text-center">
        <div className="text-sm text-subtle mb-3">
          No people yet - add team members to see the org chart.
        </div>
        <Link
          href="/company/people"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface text-background text-sm rounded-lg hover:opacity-90"
        >
          Go to People
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background border border-white/[0.04] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)]" style={{ height: "75vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={{ person: PersonNode }}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#E5E5EA" gap={16} />
        <Controls position="bottom-right" />
        <MiniMap nodeColor={(n) => deptColor((n.data as { person: Person })?.person?.department)} pannable zoomable />
        <Panel position="top-left" className="bg-background border border-white/[0.04] rounded-lg p-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2">
            <button
              onClick={resetLayout}
              className="px-2 py-1 text-xs text-foreground hover:bg-background rounded"
            >
              Reset layout
            </button>
          </div>
        </Panel>
        <Panel position="top-right" className="bg-background border border-white/[0.04] rounded-lg p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] max-w-[220px]">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-subtle mb-2">
            Departments
          </div>
          <div className="space-y-1">
            {DEPARTMENTS.map((d) => (
              <div key={d} className="flex items-center gap-2 text-xs">
                <span className="size-2 rounded-full" style={{ background: deptColor(d) }} />
                <span className="text-subtle">{d}</span>
              </div>
            ))}
          </div>
        </Panel>
      </ReactFlow>

      {previewPerson && <PreviewPanel person={previewPerson} onClose={() => setPreviewId(null)} />}
    </div>
  );
}

function PersonNode({ data }: { data: { person: Person; onOpen: () => void } }) {
  const { person, onOpen } = data;
  return (
    <div
      onClick={onOpen}
      className="bg-background border border-white/[0.04] rounded-lg p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-white/[0.12] transition-colors cursor-pointer"
      style={{ width: NODE_W, height: NODE_H }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t" style={{ background: deptColor(person.department) }} />
      <div className="flex items-start gap-2 pt-1">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar_url} alt={person.full_name} className="size-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div
            className="size-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ background: deptColor(person.department) }}
          >
            {initials(person.full_name)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {person.preferred_name || person.full_name}
          </div>
          <div className="text-[11px] text-subtle truncate">{person.job_title || "—"}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function PreviewPanel({ person, onClose }: { person: Person; onClose: () => void }) {
  return (
    <div className="absolute right-4 top-4 bg-background border border-white/[0.04] rounded-xl p-4 shadow-2xl w-72 z-10">
      <div className="flex items-start gap-3 mb-3">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar_url} alt={person.full_name} className="size-12 rounded-full object-cover" />
        ) : (
          <div
            className="size-12 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ background: deptColor(person.department) }}
          >
            {initials(person.full_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground truncate">{person.full_name}</div>
          <div className="text-xs text-subtle truncate">{person.job_title || "—"}</div>
        </div>
        <button onClick={onClose} className="text-subtle hover:text-foreground text-lg leading-none">
          ×
        </button>
      </div>
      <div className="space-y-1.5 text-xs text-subtle">
        {person.department && (
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: deptColor(person.department) }} />
            {person.department}
          </div>
        )}
        {person.email && <div>📧 {person.email}</div>}
        {person.location && <div>📍 {person.location}</div>}
      </div>
      <Link
        href={`/company/people/${person.id}`}
        className="mt-3 block text-center text-sm bg-white text-background py-2 rounded-lg hover:opacity-90"
      >
        Open profile →
      </Link>
    </div>
  );
}
