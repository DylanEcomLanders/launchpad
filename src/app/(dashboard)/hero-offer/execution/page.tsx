"use client";

/* ── Hero Offer / Execution ──
 *
 * How to wow on delivery. One card per conversion-engine layer:
 *   - name
 *   - what's included
 *   - deliverables
 *   - turnaround / dates
 *   - the bar to hit ("wow")
 *
 * Structured, not free-form markdown. Edited via a form, not a
 * textarea, so every layer carries the same fields.
 */

import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  offerLayersStore,
  offerResourcesStore,
  nextOrder,
  nowISO,
  uid,
} from "@/lib/hero-offer/data";
import { seedExecutionLayers } from "@/lib/hero-offer/seed";
import type { OfferLayer, OfferResource } from "@/lib/hero-offer/types";
import { ResourceList } from "@/lib/hero-offer/resource-list";
import { inputClass, textareaClass, labelClass } from "@/lib/form-styles";

export default function ExecutionPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [layers, setLayers] = useState<OfferLayer[]>([]);
  const [resources, setResources] = useState<OfferResource[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [rows, res] = await Promise.all([
        offerLayersStore.getAll(),
        offerResourcesStore.getAll(),
      ]);
      if (cancelled) return;
      const sorted = rows.sort((a, b) => a.order - b.order);
      if (sorted.length === 0 && (role === "admin" || role === "cro")) {
        const seeded = await seedExecutionLayers();
        if (cancelled) return;
        setLayers(seeded);
      } else {
        setLayers(sorted);
      }
      setResources(res);
      setHydrated(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [role]);

  async function addLayer() {
    const row: OfferLayer = {
      id: uid(),
      name: "New layer",
      included: "",
      deliverables: "",
      turnaround: "",
      bar: "",
      order: nextOrder(layers),
      updated_at: nowISO(),
    };
    await offerLayersStore.create(row);
    setLayers((prev) => [...prev, row]);
    setEditingId(row.id);
  }
  async function patchLayer(id: string, patch: Partial<OfferLayer>) {
    const current = layers.find((l) => l.id === id);
    if (!current) return;
    const next = { ...current, ...patch, updated_at: nowISO() };
    setLayers((prev) => prev.map((l) => (l.id === id ? next : l)));
    await offerLayersStore.update(id, next);
  }
  async function removeLayer(id: string) {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    await offerLayersStore.remove(id);
  }

  /* ── Resource CRUD ── */
  async function createResource(input: Omit<OfferResource, "id">) {
    const row: OfferResource = { id: uid(), ...input };
    setResources((prev) => [...prev, row]);
    await offerResourcesStore.create(row);
  }
  async function updateResource(id: string, patch: Partial<OfferResource>) {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
    await offerResourcesStore.update(id, patch);
  }
  async function removeResource(id: string) {
    setResources((prev) => prev.filter((r) => r.id !== id));
    await offerResourcesStore.remove(id);
  }

  if (!hydrated) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 bg-[#0C0C0C] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-[#9CA3AF] max-w-3xl">
        Every layer of the conversion engine, with what&apos;s included,
        what gets delivered, how long it takes, and the bar to hit for
        each. This is the team&apos;s spec.
      </div>

      <div className="space-y-3">
        {layers.length === 0 ? (
          <div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]">
            <p className="text-sm text-[#71757D]">
              No layers yet.{" "}
              {isAdmin
                ? "Add the first conversion engine layer below."
                : "Ask an admin to add them."}
            </p>
          </div>
        ) : (
          layers.map((l) => (
            <LayerCard
              key={l.id}
              layer={l}
              isAdmin={isAdmin}
              editing={editingId === l.id}
              onEdit={() => setEditingId(l.id)}
              onCancel={() => setEditingId(null)}
              onSave={(patch) => {
                patchLayer(l.id, patch);
                setEditingId(null);
              }}
              onDelete={() => removeLayer(l.id)}
              footer={
                <ResourceList
                  parentType="layer"
                  parentId={l.id}
                  resources={resources.filter(
                    (r) =>
                      r.parent_type === "layer" && r.parent_id === l.id,
                  )}
                  isAdmin={isAdmin}
                  accent="cyan"
                  onCreate={createResource}
                  onUpdate={updateResource}
                  onRemove={removeResource}
                />
              }
            />
          ))
        )}
        {isAdmin && (
          <button
            onClick={addLayer}
            className="w-full py-3 rounded-2xl text-[13px] text-[#71757D] ring-1 ring-dashed ring-white/[0.08] hover:ring-cyan-500/40 hover:text-[#E5E5EA] hover:bg-cyan-500/[0.04] transition-all"
          >
            + Add layer
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── LayerCard ─── */
function LayerCard({
  layer,
  isAdmin,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  footer,
}: {
  layer: OfferLayer;
  isAdmin: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<OfferLayer>) => void;
  onDelete: () => void;
  footer?: ReactNode;
}) {
  const [name, setName] = useState(layer.name);
  const [included, setIncluded] = useState(layer.included);
  const [deliverables, setDeliverables] = useState(layer.deliverables);
  const [turnaround, setTurnaround] = useState(layer.turnaround);
  const [bar, setBar] = useState(layer.bar);

  useEffect(() => {
    if (editing) {
      setName(layer.name);
      setIncluded(layer.included);
      setDeliverables(layer.deliverables);
      setTurnaround(layer.turnaround);
      setBar(layer.bar);
    }
  }, [editing, layer]);

  if (editing) {
    return (
      <div className="bg-[#0F0F10] rounded-2xl p-5 space-y-4 ring-1 ring-cyan-500/30 shadow-[0_8px_32px_rgba(6,182,212,0.12)]">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          <div>
            <label className={labelClass}>Layer name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Audit & roadmap"
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Turnaround</label>
            <input
              value={turnaround}
              onChange={(e) => setTurnaround(e.target.value)}
              className={inputClass}
              placeholder="e.g. 5 working days"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>What&apos;s included (markdown)</label>
          <textarea
            value={included}
            onChange={(e) => setIncluded(e.target.value)}
            rows={4}
            className={`${textareaClass} font-mono text-[13px]`}
            placeholder="The summary of what this layer covers."
          />
        </div>
        <div>
          <label className={labelClass}>Deliverables (markdown)</label>
          <textarea
            value={deliverables}
            onChange={(e) => setDeliverables(e.target.value)}
            rows={4}
            className={`${textareaClass} font-mono text-[13px]`}
            placeholder="- Bullet list of tangible outputs"
          />
        </div>
        <div>
          <label className={labelClass}>
            The bar (&ldquo;wow&rdquo;) (markdown)
          </label>
          <textarea
            value={bar}
            onChange={(e) => setBar(e.target.value)}
            rows={3}
            className={`${textareaClass} font-mono text-[13px]`}
            placeholder="What &lsquo;wow&rsquo; looks like for this layer."
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onDelete}
            className="text-[11px] uppercase tracking-wider text-[#71757D] hover:text-rose-400"
          >
            Delete layer
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-[#71757D] hover:text-white"
            >
              <XMarkIcon className="size-3.5" />
              Cancel
            </button>
            <button
              onClick={() =>
                onSave({
                  name: name.trim() || "Untitled",
                  included,
                  deliverables,
                  turnaround: turnaround.trim(),
                  bar,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA]"
            >
              <CheckIcon className="size-3.5" />
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0F0F10] rounded-2xl p-5 group ring-1 ring-white/[0.04] hover:ring-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[#E5E5EA]">{layer.name}</h3>
          {layer.turnaround && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/15 to-teal-500/15 ring-1 ring-cyan-500/30 text-[10px] uppercase tracking-wider text-cyan-200">
              {layer.turnaround}
            </div>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#71757D] hover:text-[#E5E5EA]"
            title="Edit layer"
          >
            <PencilSquareIcon className="size-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <LayerBlock title="What's included" body={layer.included} />
        <LayerBlock title="Deliverables" body={layer.deliverables} />
        <LayerBlock title='The bar ("wow")' body={layer.bar} />
      </div>
      {footer}
    </div>
  );
}

function LayerBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-black/40 rounded-xl p-4 ring-1 ring-white/[0.04]">
      <div className="text-[10px] uppercase tracking-wider text-[#71757D] font-semibold mb-2">
        {title}
      </div>
      {body.trim() ? (
        <div className="prose prose-invert prose-sm max-w-none prose-p:text-[#9CA3AF] prose-li:text-[#9CA3AF] prose-strong:text-[#E5E5EA]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-xs text-[#71757D] italic">Not filled in.</p>
      )}
    </div>
  );
}
