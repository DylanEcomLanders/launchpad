"use client";

/* ── Extra blocks editor ──
 * Editor UI for the optional blocks that get spliced into the public
 * page between fixed spine sections. Groups blocks by anchor; within
 * each anchor, blocks are draggable to reorder. Each block has a
 * type-specific inline editor (screenshot-collage, prose).
 *
 * Drag-and-drop is HTML5 native (no library) — same pattern used in
 * pipeline.tsx, calendar.tsx, growth-engine. Drag is restricted to
 * within the same anchor; cross-anchor moves use the "Move to" select
 * on each block.
 *
 * Props:
 * - slug: case study slug, used as the storage path prefix for uploads
 * - extraBlocks: current array of blocks
 * - onChange: emits the next full array (parent owns state)
 */

import { useState } from "react";
import { TrashIcon, PlusIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";
import {
  EXTRA_BLOCK_ANCHORS,
  EXTRA_BLOCK_TYPES,
  type ExtraBlock,
  type ExtraBlockAnchor,
  type ExtraBlockType,
  type ScreenshotCollageBlock,
  type ProseBlock,
  type ScreenshotLayout,
  slotsForLayout,
} from "@/lib/case-studies/types";
import { ScreenshotLayoutPicker } from "@/components/case-studies/screenshot-layout-picker";
import { ImageUpload } from "./image-upload";

interface Props {
  slug: string;
  extraBlocks: ExtraBlock[];
  onChange: (next: ExtraBlock[]) => void;
}

function genBlockId(): string {
  return `xb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* Build a fresh block of the given type, slotted at the end of the
 * given anchor (order = max+1). Defaults are intentionally minimal —
 * the editor surfaces every field for direct edit. */
function makeBlock(
  type: ExtraBlockType,
  anchor: ExtraBlockAnchor,
  existing: ExtraBlock[],
): ExtraBlock {
  const inAnchor = existing.filter((b) => b.anchor === anchor);
  const nextOrder = inAnchor.length === 0 ? 0 : Math.max(...inAnchor.map((b) => b.order)) + 1;
  const base = { id: genBlockId(), anchor, order: nextOrder };
  if (type === "screenshot-collage") {
    return {
      ...base,
      type: "screenshot-collage",
      screenshots: [],
      layout: "three",
    } satisfies ScreenshotCollageBlock;
  }
  return {
    ...base,
    type: "prose",
    body: "",
  } satisfies ProseBlock;
}

export function ExtraBlocksEditor({ slug, extraBlocks, onChange }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const updateBlock = (id: string, patch: Partial<ExtraBlock>) => {
    onChange(
      extraBlocks.map((b) => (b.id === id ? ({ ...b, ...patch } as ExtraBlock) : b)),
    );
  };

  const deleteBlock = (id: string) => {
    onChange(extraBlocks.filter((b) => b.id !== id));
  };

  const addBlock = (type: ExtraBlockType, anchor: ExtraBlockAnchor) => {
    onChange([...extraBlocks, makeBlock(type, anchor, extraBlocks)]);
  };

  /* When a block is dropped onto another within the same anchor, splice
   * the dragged one in just before the drop target. Reassign order
   * indices afterwards so the array reflects intended sequence. */
  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const dragged = extraBlocks.find((b) => b.id === draggingId);
    const target = extraBlocks.find((b) => b.id === targetId);
    if (!dragged || !target || dragged.anchor !== target.anchor) {
      setDraggingId(null);
      return;
    }
    const sameAnchor = extraBlocks
      .filter((b) => b.anchor === dragged.anchor && b.id !== dragged.id)
      .sort((a, b) => a.order - b.order);
    const targetIdx = sameAnchor.findIndex((b) => b.id === targetId);
    sameAnchor.splice(targetIdx, 0, dragged);
    const reorderedIds = new Map(sameAnchor.map((b, i) => [b.id, i]));
    onChange(
      extraBlocks.map((b) =>
        reorderedIds.has(b.id) ? { ...b, order: reorderedIds.get(b.id)! } : b,
      ),
    );
    setDraggingId(null);
  };

  const moveToAnchor = (id: string, nextAnchor: ExtraBlockAnchor) => {
    const block = extraBlocks.find((b) => b.id === id);
    if (!block || block.anchor === nextAnchor) return;
    const inDest = extraBlocks.filter((b) => b.anchor === nextAnchor);
    const newOrder = inDest.length === 0 ? 0 : Math.max(...inDest.map((b) => b.order)) + 1;
    updateBlock(id, { anchor: nextAnchor, order: newOrder } as Partial<ExtraBlock>);
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-subtle leading-relaxed">
        Slot extra screenshot collages or prose blocks between the fixed sections of the
        case study. Drag within an anchor to reorder; use the &ldquo;Move to&rdquo; menu to send a
        block to a different anchor.
      </p>

      {EXTRA_BLOCK_ANCHORS.map((anchor) => {
        const blocks = extraBlocks
          .filter((b) => b.anchor === anchor.id)
          .sort((a, b) => a.order - b.order);
        return (
          <div
            key={anchor.id}
            className="border border-border rounded-lg p-4 bg-background"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  {anchor.label}
                </p>
                <p className="text-[10px] text-subtle mt-0.5">
                  {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
                </p>
              </div>
              <AddBlockMenu onAdd={(type) => addBlock(type, anchor.id)} />
            </div>

            {blocks.length > 0 && (
              <div className="space-y-3">
                {blocks.map((block) => (
                  <BlockCard
                    key={block.id}
                    slug={slug}
                    block={block}
                    isDragging={draggingId === block.id}
                    onDragStart={() => setDraggingId(block.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onDrop={() => handleDrop(block.id)}
                    onUpdate={(patch) => updateBlock(block.id, patch)}
                    onDelete={() => deleteBlock(block.id)}
                    onMoveTo={(a) => moveToAnchor(block.id, a)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Per-anchor "+ Add block" dropdown ── */
function AddBlockMenu({ onAdd }: { onAdd: (type: ExtraBlockType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-white bg-white text-background rounded-md hover:bg-foreground transition-colors"
      >
        <PlusIcon className="size-3.5" />
        Add block
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-72 bg-surface border border-border rounded-md shadow-lg z-20 overflow-hidden">
            {EXTRA_BLOCK_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onAdd(t.id);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-background border-b border-surface-raised last:border-b-0"
              >
                <p className="text-xs font-semibold text-foreground">{t.label}</p>
                <p className="text-[10px] text-subtle mt-0.5 leading-relaxed">
                  {t.description}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Single block card ──
 * Drag handle on the left, content middle, controls on the right.
 * Inline edit fields below depending on block type. */
interface BlockCardProps {
  slug: string;
  block: ExtraBlock;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onUpdate: (patch: Partial<ExtraBlock>) => void;
  onDelete: () => void;
  onMoveTo: (anchor: ExtraBlockAnchor) => void;
}

function BlockCard({
  slug,
  block,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onUpdate,
  onDelete,
  onMoveTo,
}: BlockCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add("ring-2", "ring-surface/20");
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove("ring-2", "ring-surface/20");
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("ring-2", "ring-surface/20");
        onDrop();
      }}
      className={`bg-surface border border-border rounded-md p-3 transition-opacity ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Bars3Icon className="size-4 text-subtle cursor-grab active:cursor-grabbing flex-shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
          {block.type === "screenshot-collage" ? "Screenshot collage" : "Prose block"}
        </span>
        <div className="flex-1" />
        <select
          value={block.anchor}
          onChange={(e) => onMoveTo(e.target.value as ExtraBlockAnchor)}
          className="text-[10px] border border-border rounded px-2 py-1 bg-surface"
          title="Move to anchor"
        >
          {EXTRA_BLOCK_ANCHORS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-subtle hover:text-red-500 transition-colors"
          title="Delete block"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>

      {block.type === "screenshot-collage" ? (
        <ScreenshotCollageEditor
          slug={slug}
          block={block}
          onUpdate={(patch) => onUpdate(patch)}
        />
      ) : (
        <ProseEditor block={block} onUpdate={(patch) => onUpdate(patch)} />
      )}
    </div>
  );
}

/* ── Screenshot collage block editor ── */
function ScreenshotCollageEditor({
  slug,
  block,
  onUpdate,
}: {
  slug: string;
  block: ScreenshotCollageBlock;
  onUpdate: (patch: Partial<ScreenshotCollageBlock>) => void;
}) {
  const layout = block.layout || "three";
  const slots = slotsForLayout(layout);
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Headline (optional)</label>
        <input
          type="text"
          value={block.headline || ""}
          onChange={(e) => onUpdate({ headline: e.target.value || undefined })}
          placeholder="Optional H3 above the collage"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Layout</label>
        <ScreenshotLayoutPicker
          value={layout}
          onChange={(next) => {
            // Trim screenshots if the new layout has fewer slots
            const nextSlots = slotsForLayout(next as ScreenshotLayout);
            const screenshots = block.screenshots.slice(0, nextSlots);
            onUpdate({ layout: next as ScreenshotLayout, screenshots });
          }}
        />
      </div>

      <div>
        <label className={labelClass}>Screenshots ({slots} slot{slots === 1 ? "" : "s"})</label>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: slots }).map((_, i) => (
            <ImageUpload
              key={i}
              slug={slug}
              aspect="auto"
              value={block.screenshots[i]}
              onChange={(next) => {
                const screenshots = [...block.screenshots];
                if (next) {
                  screenshots[i] = next;
                } else {
                  screenshots.splice(i, 1);
                }
                onUpdate({ screenshots });
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Prose block editor ── */
function ProseEditor({
  block,
  onUpdate,
}: {
  block: ProseBlock;
  onUpdate: (patch: Partial<ProseBlock>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Headline (optional)</label>
        <input
          type="text"
          value={block.headline || ""}
          onChange={(e) => onUpdate({ headline: e.target.value || undefined })}
          placeholder="Optional H3 above the body"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Body</label>
        <textarea
          value={block.body}
          onChange={(e) => onUpdate({ body: e.target.value })}
          rows={4}
          placeholder="Paragraph(s) — line breaks render as line breaks"
          className={textareaClass}
        />
      </div>
    </div>
  );
}

