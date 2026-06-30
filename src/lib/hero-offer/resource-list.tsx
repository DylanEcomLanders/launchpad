"use client";

/* ── ResourceList ──
 *
 * Compact attached-links footer for any Hero Offer card. Slots into
 * the bottom of a SectionCard / LayerCard / ObjectionCard /
 * MilestoneCard / PricingCard with a hairline divider. Renders the
 * resources for one parent (already filtered by the caller); admin
 * gets an inline + Add Resource form.
 *
 * Page-level state owns the full offer_resources list and passes a
 * slice down per card. Keeps fetches to one per page load.
 */

import { useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckIcon,
  PresentationChartLineIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  VideoCameraIcon,
  LinkIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { inputClass } from "@/lib/form-styles";
import type {
  OfferResource,
  OfferResourceKind,
  OfferResourceParent,
} from "./types";

/* Each kind gets its own glyph so the eye can scan a long list of
 * attached resources by type without reading the labels. Falls back
 * to a plain link icon for the catch-all "link" kind. */
const KIND_META: Record<
  OfferResourceKind,
  { icon: typeof LinkIcon; label: string }
> = {
  deck: { icon: PresentationChartLineIcon, label: "Deck" },
  template: { icon: DocumentDuplicateIcon, label: "Template" },
  doc: { icon: DocumentTextIcon, label: "Doc" },
  sop: { icon: ClipboardDocumentListIcon, label: "SOP" },
  loom: { icon: VideoCameraIcon, label: "Loom" },
  link: { icon: LinkIcon, label: "Link" },
};

const KIND_ORDER: OfferResourceKind[] = [
  "deck",
  "template",
  "doc",
  "sop",
  "loom",
  "link",
];

/* Accent token drives the focus/hover tint per stage so resources
 * sit inside the parent card's identity (emerald on Start &
 * Acquisition, cyan on Execution, sky on Retention). Falls back to a
 * neutral gray when not specified. */
type Accent = "emerald" | "cyan" | "sky" | "neutral";
const ACCENT_RING: Record<Accent, string> = {
  emerald: "hover:ring-emerald-500/30 focus:ring-emerald-500/40",
  cyan: "hover:ring-cyan-500/30 focus:ring-cyan-500/40",
  sky: "hover:ring-sky-500/30 focus:ring-sky-500/40",
  neutral: "hover:ring-white/[0.12] focus:ring-white/[0.18]",
};
const ACCENT_DASHED_HOVER: Record<Accent, string> = {
  emerald: "hover:ring-emerald-500/40 hover:bg-emerald-500/[0.04]",
  cyan: "hover:ring-cyan-500/40 hover:bg-cyan-500/[0.04]",
  sky: "hover:ring-sky-500/40 hover:bg-sky-500/[0.04]",
  neutral: "hover:ring-white/[0.18] hover:bg-white/[0.02]",
};

export function ResourceList({
  parentType,
  parentId,
  resources,
  isAdmin,
  accent = "neutral",
  embedded = true,
  onCreate,
  onUpdate,
  onRemove,
}: {
  parentType: OfferResourceParent;
  parentId: string;
  resources: OfferResource[];
  isAdmin: boolean;
  accent?: Accent;
  /* True (default) when rendered inside a parent card - we add the
   * top divider + margin so it reads as a footer. False for
   * standalone usage (e.g. root-level resources block) where the
   * divider would just be a line floating above nothing. */
  embedded?: boolean;
  onCreate: (resource: Omit<OfferResource, "id">) => void | Promise<void>;
  onUpdate: (
    id: string,
    patch: Partial<OfferResource>,
  ) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* Hide entirely for team members on an empty card - no point
   * showing a "no resources yet" label that they can't action. */
  if (!isAdmin && resources.length === 0) return null;

  return (
    <div className={embedded ? "mt-4 pt-3 border-t border-white/[0.04]" : ""}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider text-subtle font-semibold">
          Resources
        </div>
        {isAdmin && !addOpen && (
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-subtle hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-3" />
            Add
          </button>
        )}
      </div>

      {resources.length === 0 && !addOpen && (
        <p className="text-[11px] italic text-subtle">
          Nothing attached yet.
        </p>
      )}

      {resources.length > 0 && (
        <ul className="space-y-1.5">
          {resources.map((r) =>
            editingId === r.id ? (
              <li key={r.id}>
                <ResourceForm
                  initial={r}
                  accent={accent}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => {
                    onUpdate(r.id, patch);
                    setEditingId(null);
                  }}
                  onDelete={() => {
                    onRemove(r.id);
                    setEditingId(null);
                  }}
                />
              </li>
            ) : (
              <li key={r.id}>
                <ResourceRow
                  resource={r}
                  isAdmin={isAdmin}
                  accent={accent}
                  onEdit={() => setEditingId(r.id)}
                />
              </li>
            ),
          )}
        </ul>
      )}

      {addOpen && (
        <div className="mt-2">
          <ResourceForm
            initial={{
              parent_type: parentType,
              parent_id: parentId,
              title: "",
              url: "",
              kind: "link",
            }}
            accent={accent}
            onCancel={() => setAddOpen(false)}
            onSave={(patch) => {
              onCreate({
                parent_type: parentType,
                parent_id: parentId,
                title: patch.title ?? "Untitled",
                url: patch.url ?? "",
                kind: (patch.kind as OfferResourceKind) ?? "link",
              });
              setAddOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ResourceRow({
  resource,
  isAdmin,
  accent,
  onEdit,
}: {
  resource: OfferResource;
  isAdmin: boolean;
  accent: Accent;
  onEdit: () => void;
}) {
  const meta = KIND_META[resource.kind] ?? KIND_META.link;
  const Icon = meta.icon;

  return (
    <div
      className={`group flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-md ring-1 ring-transparent ${ACCENT_RING[accent]} transition-all`}
    >
      <Icon className="size-3.5 text-subtle shrink-0" />
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 text-[12px] text-foreground hover:text-white truncate"
      >
        {resource.title || resource.url || "Untitled"}
      </a>
      <span className="text-[9px] uppercase tracking-wider text-subtle opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
        {meta.label}
      </span>
      <ArrowTopRightOnSquareIcon className="size-3 text-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      {isAdmin && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onEdit();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-subtle hover:text-foreground shrink-0"
          title="Edit resource"
        >
          <PencilSquareIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function ResourceForm({
  initial,
  accent,
  onCancel,
  onSave,
  onDelete,
}: {
  initial: Partial<OfferResource> & { parent_type: OfferResourceParent; parent_id: string };
  accent: Accent;
  onCancel: () => void;
  onSave: (patch: Partial<OfferResource>) => void;
  onDelete?: () => void;
}) {
  const [titleDraft, setTitleDraft] = useState(initial.title ?? "");
  const [urlDraft, setUrlDraft] = useState(initial.url ?? "");
  const [kindDraft, setKindDraft] = useState<OfferResourceKind>(
    (initial.kind as OfferResourceKind) ?? "link",
  );

  return (
    <div
      className={`bg-black/40 rounded-lg p-3 space-y-2 ring-1 ring-white/[0.06] ${ACCENT_DASHED_HOVER[accent]}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          placeholder="Title (e.g. Sales Deck v3)"
          className={`${inputClass} h-8 text-[12px]`}
          autoFocus
        />
        <select
          value={kindDraft}
          onChange={(e) =>
            setKindDraft(e.target.value as OfferResourceKind)
          }
          className={`${inputClass} h-8 text-[12px]`}
        >
          {KIND_ORDER.map((k) => (
            <option key={k} value={k}>
              {KIND_META[k].label}
            </option>
          ))}
        </select>
      </div>
      <input
        value={urlDraft}
        onChange={(e) => setUrlDraft(e.target.value)}
        placeholder="https://..."
        className={`${inputClass} h-8 text-[12px]`}
      />
      <div className="flex items-center justify-between pt-1">
        {onDelete ? (
          <button
            onClick={onDelete}
            className="text-[10px] uppercase tracking-wider text-subtle hover:text-rose-400"
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider text-subtle hover:text-white"
          >
            <XMarkIcon className="size-3" />
            Cancel
          </button>
          <button
            onClick={() => {
              const t = titleDraft.trim();
              const u = urlDraft.trim();
              if (!t && !u) {
                onCancel();
                return;
              }
              onSave({
                title: t || u,
                url: u,
                kind: kindDraft,
              });
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider bg-white text-background hover:bg-foreground"
          >
            <CheckIcon className="size-3" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
