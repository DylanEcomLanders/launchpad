"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { MustDoGate } from "@/lib/pods-v2/types";
import {
  CRO_BRIEF_ITEMS,
  DESIGN_HANDOFF_ITEMS,
  DEV_HANDOFF_ITEMS,
  DEV_HANDOFF_CATEGORIES,
  LAUNCH_PREP_ITEMS,
} from "@/lib/portal/qa-gates";
import type { GateCategory } from "@/lib/portal/qa-gates";

export type MustDoGateKey = "cro_brief" | "design_handoff" | "dev_handoff" | "launch_prep";

/* Strip em / en dashes from imported portal copy so the modal stays inside
 * the no-dash convention without forcing a sweep of the portal source.
 * Replace with comma since the dashes are almost always "X, Y" clarifiers. */
function clean(s: string): string {
  return s.replace(/\s*[,,]\s*/g, ", ");
}

interface MustDoConfig {
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  border: string;
  owner: string;
  items: string[];
  /** When set, the checklist renders grouped + collapsible per category,
   * matching the portal Dev QA presentation. Sums to items.length. */
  categories?: GateCategory[];
  linkLabel?: string;
  linkPlaceholder?: string;
  /** When true, the modal renders a multi-URL Preview URLs section above
   * the checklist (Dev QA flow). */
  hasPreviewUrls?: boolean;
}

/* Same item content as the portal QA gates so the team works against
 * one source of truth. Items are cleaned of em-dashes at module init. */
export const MUST_DO_CONFIG: Record<MustDoGateKey, MustDoConfig> = {
  cro_brief: {
    title: "Design Brief",
    subtitle: "CRO scopes the work before design starts. Matches the portal CRO Design gate.",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    owner: "CRO Strategist",
    items: CRO_BRIEF_ITEMS.map(clean),
    linkLabel: "Brief doc",
    linkPlaceholder: "https://docs.google.com/document/...",
  },
  design_handoff: {
    title: "Dev Handover",
    subtitle: "Designer hands the build off to development. Matches the portal Design Handoff gate.",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    owner: "Designer",
    items: DESIGN_HANDOFF_ITEMS.map(clean),
    linkLabel: "Figma link",
    linkPlaceholder: "https://figma.com/file/...",
  },
  dev_handoff: {
    title: "Dev QA",
    subtitle: "Internal dev self-QA before senior review and launch. Mirrors the portal Dev to Senior Dev QA checklist.",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    owner: "Developer",
    items: DEV_HANDOFF_ITEMS.map(clean),
    categories: DEV_HANDOFF_CATEGORIES,
    hasPreviewUrls: true,
  },
  launch_prep: {
    title: "Handoff / Testing",
    subtitle: "Final pre-launch checklist. Matches the portal Handoff / Testing gate.",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    owner: "Senior Developer",
    items: LAUNCH_PREP_ITEMS.map(clean),
  },
};

export function gateProgress(
  config: MustDoConfig,
  gate: MustDoGate | undefined,
): { checked: number; total: number; complete: boolean } {
  const items = gate?.items ?? {};
  const checked = config.items.filter((label) => items[label] === true).length;
  const total = config.items.length;
  return { checked, total, complete: checked === total && total > 0 };
}

export function MustDoModal({
  gateKey,
  config,
  gate,
  onSave,
  onClose,
}: {
  gateKey: MustDoGateKey;
  config: MustDoConfig;
  gate: MustDoGate | undefined;
  onSave: (patch: Partial<MustDoGate>) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Record<string, boolean>>(gate?.items ?? {});
  const [notes, setNotes] = useState(gate?.notes ?? "");
  const [link, setLink] = useState(gate?.link ?? "");
  const [previewUrls, setPreviewUrls] = useState<{ url: string; label?: string }[]>(gate?.preview_urls ?? []);
  const [urlDraft, setUrlDraft] = useState("");
  /* Open the first category by default; collapsed for the rest so the
   * 151-item Dev QA isn't overwhelming on first open. */
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    if (!config.categories) return {};
    return { [config.categories[0].label]: true };
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const checked = config.items.filter((label) => items[label] === true).length;
  const total = config.items.length;
  const allTicked = checked === total;
  const wasComplete = !!gate?.completed_at;

  const toggleItem = (label: string) => {
    setItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const toggleCategory = (label: string) => {
    setOpenCategories((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const addPreviewUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    setPreviewUrls((prev) => [...prev, { url: trimmed }]);
    setUrlDraft("");
  };

  const removePreviewUrl = (idx: number) => {
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveProgress = () => {
    onSave({
      items,
      notes,
      link,
      preview_urls: previewUrls,
      completed_at: wasComplete && !allTicked ? undefined : gate?.completed_at,
    });
    onClose();
  };

  const handleComplete = () => {
    onSave({
      items,
      notes,
      link,
      preview_urls: previewUrls,
      completed_at: new Date().toISOString(),
    });
    onClose();
  };

  const renderItem = (label: string) => {
    const ticked = items[label] === true;
    return (
      <button
        key={label}
        onClick={() => toggleItem(label)}
        className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
          ticked
            ? "border-success bg-success/10"
            : "border-border bg-surface hover:border-border"
        }`}
      >
        <span
          className={`mt-0.5 size-4 rounded border-2 shrink-0 flex items-center justify-center ${
            ticked ? "bg-success border-success" : "border-border bg-surface"
          }`}
        >
          {ticked && <CheckIcon className="size-2.5 text-white" />}
        </span>
        <span className={`text-[13px] leading-snug ${ticked ? "text-success" : "text-foreground"}`}>
          {label}
        </span>
      </button>
    );
  };

  const categoryProgress = (cat: GateCategory): { done: number; total: number } => {
    const slice = config.items.slice(cat.startIndex, cat.startIndex + cat.count);
    const done = slice.filter((label) => items[label] === true).length;
    return { done, total: cat.count };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[640px] max-h-[88vh] overflow-y-auto rounded-2xl bg-surface shadow-2xl">
        <div
          className="sticky top-0 z-10 px-6 py-4 border-b flex items-baseline justify-between gap-4"
          style={{ background: config.bg, borderColor: config.border }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: config.color }}>
              {config.owner}
            </p>
            <h2 className="text-[18px] font-semibold mt-0.5" style={{ color: config.color }}>
              {config.title}
            </h2>
            <p className="text-[12px] mt-1" style={{ color: config.color, opacity: 0.75 }}>
              {config.subtitle}
            </p>
          </div>
          <div className="flex items-baseline gap-3 shrink-0">
            <span className="text-[14px] font-semibold tabular-nums" style={{ color: config.color }}>
              {checked}/{total}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface/40"
              style={{ color: config.color }}
              aria-label="Close"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {config.hasPreviewUrls && (
            <div className="mb-5 rounded-lg border border-border bg-background p-4">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-[12px] font-semibold text-foreground">Preview URLs</p>
                <span className="text-[10px] text-muted tabular-nums">{previewUrls.length} added</span>
              </div>
              <p className="text-[11px] text-muted mb-3 leading-snug">
                Add every page you're submitting for QA. These land in the internal Slack message on submit.
              </p>
              <div className="space-y-1.5">
                {previewUrls.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-[12px] text-info hover:underline truncate">
                      {p.url}
                    </a>
                    <button
                      onClick={() => removePreviewUrl(i)}
                      className="text-subtle hover:text-danger p-1"
                      title="Remove"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPreviewUrl(); } }}
                    placeholder="https://staging-..."
                    className="flex-1 text-[12px] px-2 py-1.5 border border-border rounded focus:outline-none focus:border-ring bg-surface"
                  />
                  <button
                    onClick={addPreviewUrl}
                    disabled={!urlDraft.trim()}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground border border-border hover:border-border px-2 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed bg-surface"
                  >
                    <PlusIcon className="size-3" />
                    Add URL
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
              Checklist
            </p>
            {!config.categories && (
              <span className="text-[11px] tabular-nums text-muted">{checked}/{total} ticked</span>
            )}
          </div>

          {config.categories ? (
            <div className="space-y-2">
              {config.categories.map((cat) => {
                const isOpen = openCategories[cat.label] === true;
                const { done, total: catTotal } = categoryProgress(cat);
                const slice = config.items.slice(cat.startIndex, cat.startIndex + cat.count);
                return (
                  <div key={cat.label} className="rounded-lg border border-border bg-surface overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat.label)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-background transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDownIcon className="size-3.5 text-muted" /> : <ChevronRightIcon className="size-3.5 text-muted" />}
                        <span className="text-[13px] font-medium text-foreground">{cat.label}</span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold tabular-nums ${
                          done === catTotal ? "text-success" : "text-muted"
                        }`}
                      >
                        {done}/{catTotal}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 space-y-1.5">
                        {slice.map(renderItem)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="space-y-2">
              {config.items.map((label) => <li key={label}>{renderItem(label)}</li>)}
            </ul>
          )}

          {config.linkLabel && (
            <div className="mt-5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-subtle mb-1.5">
                {config.linkLabel}
              </label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={config.linkPlaceholder}
                className="w-full text-[13px] px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-ring"
              />
            </div>
          )}

          <div className="mt-5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-subtle mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you check, what to revisit, anything the next gate needs to know."
              rows={3}
              className="w-full text-[13px] px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-ring resize-y"
            />
          </div>

          {wasComplete && (
            <p className="mt-4 text-[11px] text-success">
              Completed {new Date(gate!.completed_at!).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 px-6 py-4 border-t border-border bg-surface flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="text-[12px] text-muted hover:text-foreground px-3 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProgress}
            className="text-[12px] font-medium text-foreground border border-border hover:border-border px-3 py-2 rounded-lg"
          >
            Save progress
          </button>
          <button
            onClick={handleComplete}
            disabled={!allTicked}
            className="text-[12px] font-semibold text-white bg-success hover:bg-success/90 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg"
          >
            {wasComplete ? "Update completion" : "Mark complete"}
          </button>
        </div>
      </div>
    </div>
  );
}
