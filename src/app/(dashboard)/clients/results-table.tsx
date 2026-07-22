"use client";

/* ── Projects: Test Results grid ──
 * The rigid, structured alternative to a free TipTap table. Fixed columns, real
 * inputs, a Status dropdown with a coloured pill, plus MULTIPLE screenshots per
 * test (variants / before-after / result shots) managed in a gallery. Rows are
 * the source of truth; the parent mirrors them to the section body for the PDF.
 */

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlusIcon, TrashIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { TEST_STATUSES } from "@/lib/pod-projects/templates";
import type { TestRow, TestStatus } from "@/lib/pod-projects/types";
import { uploadImage } from "@/lib/cx/images";

const tone = (s: TestStatus) => TEST_STATUSES.find((x) => x.value === s)?.tone ?? "text-muted";

/** Normalise legacy single `image` into the `images` array. */
const imagesOf = (r: TestRow): string[] => r.images ?? (r.image ? [r.image] : []);

/* Downscale + compress an uploaded image so several fit in localStorage. */
function fileToDataUrl(file: File, maxW = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function ResultsTable({
  rows,
  onChange,
  onAddRow,
  canEdit = true,
}: {
  rows: TestRow[];
  onChange: (rows: TestRow[]) => void;
  onAddRow: () => void;
  canEdit?: boolean;
}) {
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const patch = (id: string, p: Partial<TestRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const setImages = (id: string, images: string[]) => patch(id, { images, image: undefined });

  async function addImages(id: string, files: FileList | null) {
    if (!files?.length) return;
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const added: string[] = [];
    for (const f of Array.from(files)) {
      try {
        // Upload to Storage (permanent URL); fall back to a downscaled base64.
        added.push((await uploadImage(f)) ?? (await fileToDataUrl(f)));
      } catch {
        /* skip bad image */
      }
    }
    if (added.length) setImages(id, [...imagesOf(row), ...added]);
  }

  const cell = "w-full bg-transparent px-2.5 py-2 text-sm text-foreground placeholder:text-subtle focus:outline-none";
  const galleryRow = galleryId ? rows.find((r) => r.id === galleryId) : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-[1040px] px-6 py-8 md:px-10">
        <p className="mb-3 text-sm text-muted">Every test we ship and what it moved — one row per test.</p>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-hover text-2xs font-semibold uppercase tracking-wide text-subtle">
                <th className="w-[20%] px-2.5 py-2 font-semibold">Test</th>
                <th className="w-[30%] px-2.5 py-2 font-semibold">Hypothesis</th>
                <th className="w-[13%] px-2.5 py-2 font-semibold">Metric</th>
                <th className="w-[10%] px-2.5 py-2 font-semibold">Uplift</th>
                <th className="w-[13%] px-2.5 py-2 font-semibold">Status</th>
                <th className="w-16 px-2.5 py-2 font-semibold">Shots</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2.5 py-6 text-center text-sm text-subtle">
                    No tests yet — add the first one below.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="group/row border-t border-border-faint">
                  <td className="align-top">
                    <input className={cell} value={r.test} placeholder="…" readOnly={!canEdit} onChange={(e) => patch(r.id, { test: e.target.value })} />
                  </td>
                  <td className="align-top">
                    <input className={cell} value={r.hypothesis} placeholder="…" readOnly={!canEdit} onChange={(e) => patch(r.id, { hypothesis: e.target.value })} />
                  </td>
                  <td className="align-top">
                    <input className={cell} value={r.metric} placeholder="…" readOnly={!canEdit} onChange={(e) => patch(r.id, { metric: e.target.value })} />
                  </td>
                  <td className="align-top">
                    <input className={cell} value={r.uplift} placeholder="…" readOnly={!canEdit} onChange={(e) => patch(r.id, { uplift: e.target.value })} />
                  </td>
                  <td className="align-top">
                    <select
                      value={r.status}
                      disabled={!canEdit}
                      onChange={(e) => patch(r.id, { status: e.target.value as TestStatus })}
                      className={`w-full appearance-none bg-transparent px-2.5 py-2 text-sm font-medium focus:outline-none ${canEdit ? "cursor-pointer" : ""} ${tone(r.status)}`}
                    >
                      {TEST_STATUSES.map((s) => (
                        <option key={s.value} value={s.value} className="bg-surface-raised text-foreground">
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 align-middle">
                    <ShotCell images={imagesOf(r)} canEdit={canEdit} onOpen={() => setGalleryId(r.id)} onAdd={(files) => addImages(r.id, files)} />
                  </td>
                  <td className="align-middle">
                    {canEdit && (
                      <button
                        onClick={() => remove(r.id)}
                        title="Delete row"
                        className="flex size-6 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-danger group-hover/row:opacity-100"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <button
            onClick={onAddRow}
            className="mt-2.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-subtle transition-colors hover:text-foreground"
          >
            <PlusIcon className="size-3.5" /> Add test
          </button>
        )}
      </div>

      {galleryRow && (
        <Gallery
          title={galleryRow.test || "Test"}
          images={imagesOf(galleryRow)}
          canEdit={canEdit}
          onAdd={(files) => addImages(galleryRow.id, files)}
          onRemoveAt={(i) => setImages(galleryRow.id, imagesOf(galleryRow).filter((_, idx) => idx !== i))}
          onClose={() => setGalleryId(null)}
        />
      )}
    </div>
  );
}

/* Compact cell: first thumbnail + a "+N" count, or a dashed upload button. */
function ShotCell({
  images,
  onOpen,
  onAdd,
  canEdit = true,
}: {
  images: string[];
  onOpen: () => void;
  onAdd: (files: FileList | null) => void;
  canEdit?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center">
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onAdd(e.target.files)} />
      {images.length ? (
        <button onClick={onOpen} title="View screenshots" className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt="Screenshot" className="h-8 w-12 cursor-pointer rounded border border-border object-cover" />
          {images.length > 1 && (
            <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-surface-raised px-1 text-[10px] font-semibold text-foreground ring-1 ring-border">
              {images.length}
            </span>
          )}
        </button>
      ) : canEdit ? (
        <button
          onClick={() => inputRef.current?.click()}
          title="Add screenshots"
          className="flex h-8 w-12 items-center justify-center rounded border border-dashed border-border text-subtle transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <PhotoIcon className="size-4" />
        </button>
      ) : (
        <span className="text-2xs text-subtle/60" aria-hidden />
      )}
    </div>
  );
}

/* Gallery — view all shots for a test, add more, remove, click to enlarge. */
function Gallery({
  title,
  images,
  onAdd,
  onRemoveAt,
  onClose,
  canEdit = true,
}: {
  title: string;
  images: string[];
  onAdd: (files: FileList | null) => void;
  onRemoveAt: (index: number) => void;
  onClose: () => void;
  canEdit?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-6 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-panel-line bg-surface-raised"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-faint px-4 py-2.5">
          <span className="truncate text-sm font-medium text-foreground">
            {title} <span className="text-subtle">· {images.length} shot{images.length === 1 ? "" : "s"}</span>
          </span>
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onAdd(e.target.files)} />
            {canEdit && (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-2xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <PlusIcon className="size-3.5" /> Add
              </button>
            )}
            <button onClick={onClose} title="Close" className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-surface-hover hover:text-foreground">
              <XMarkIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 scrollbar-thin sm:grid-cols-3">
          {images.length === 0 && <p className="col-span-full py-8 text-center text-sm text-subtle">No screenshots yet — add some.</p>}
          {images.map((src, i) => (
            <div key={i} className="group/img relative overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Shot ${i + 1}`} onClick={() => setZoom(src)} className="aspect-video w-full cursor-zoom-in object-cover" />
              {canEdit && (
                <button
                  onClick={() => onRemoveAt(i)}
                  title="Remove"
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md bg-background/70 text-muted opacity-0 transition-opacity hover:text-danger group-hover/img:opacity-100"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-10 grid place-items-center bg-background/85 p-8"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Screenshot" className="max-h-full max-w-full rounded-lg border border-border" />
        </div>
      )}
    </div>,
    document.body,
  );
}
