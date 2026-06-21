"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import {
  loadOfferContent,
  saveOfferContent,
  getOfferContent,
  type OfferContentOverrides,
} from "@/lib/offer-content";
import { parseMarkdown, type MarkdownSection } from "@/lib/offer-markdown";

type PageKey = "faq" | "objections";

interface Props {
  /** Which key in OfferContentOverrides to read/write under. */
  pageKey: PageKey;
  /** Raw markdown file content (defaults). */
  defaultContent: string;
  /** Heading level that defines a section boundary (3 for FAQ, 2 for Objections). */
  sectionLevel: 2 | 3;
}

const PROSE_CLASS =
  "prose prose-sm max-w-none prose-headings:text-[#E5E5EA] prose-p:text-[#C7C9CD] prose-strong:text-[#E5E5EA] prose-a:text-blue-600 prose-table:text-xs prose-th:text-[#71757D] prose-th:font-medium prose-th:uppercase prose-th:tracking-wider prose-th:text-[10px] prose-td:py-2 prose-blockquote:border-amber-400 prose-blockquote:bg-amber-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-amber-900 prose-code:bg-[#222222] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[#E5E5EA] prose-code:font-mono prose-code:text-xs prose-pre:bg-[#1B1B1B] prose-pre:text-[#E5E5EA]";

export function EditableSectionedDoc({ pageKey, defaultContent, sectionLevel }: Props) {
  const parsed = parseMarkdown(defaultContent, sectionLevel);

  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    const c = getOfferContent();
    return c[pageKey] ?? {};
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Hydrate from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    loadOfferContent().then((c) => {
      if (cancelled) return;
      setOverrides(c[pageKey] ?? {});
    });
    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  const getSectionMarkdown = (s: MarkdownSection) => overrides[s.id] ?? s.markdown;

  const startEdit = (s: MarkdownSection) => {
    setEditingId(s.id);
    setDraft(getSectionMarkdown(s));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };

  const persist = async (next: Record<string, string>) => {
    setOverrides(next);
    const current = getOfferContent();
    await saveOfferContent({ ...current, [pageKey]: next });
  };

  const saveEdit = async (s: MarkdownSection) => {
    setSaving(true);
    const next = { ...overrides };
    if (draft.trim() === s.markdown.trim()) {
      // Edited back to default — drop the override
      delete next[s.id];
    } else {
      next[s.id] = draft;
    }
    await persist(next);
    setSaving(false);
    setEditingId(null);
    setDraft("");
  };

  const resetSection = async (s: MarkdownSection) => {
    const next = { ...overrides };
    delete next[s.id];
    await persist(next);
    if (editingId === s.id) {
      setEditingId(null);
      setDraft("");
    }
  };

  return (
    <div>
      {/* Title */}
      {parsed.title && (
        <h1 className="text-2xl font-semibold text-[#E5E5EA] mb-3">
          {parsed.title}
        </h1>
      )}

      {/* Intro */}
      {parsed.intro && (
        <article className={`${PROSE_CLASS} mb-6`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.intro}</ReactMarkdown>
        </article>
      )}

      {/* Groups */}
      {parsed.groups.map((g, gi) => (
        <div key={gi} className="mb-8">
          {g.heading && (
            <h2 className="text-base font-semibold text-[#E5E5EA] mb-3 mt-6 pb-1.5 border-b border-[#2A2A2A]">
              {g.heading}
            </h2>
          )}
          <div className="space-y-3">
            {g.sections.map((s) => {
              const isEditing = editingId === s.id;
              const isOverridden = overrides[s.id] !== undefined;
              return (
                <div
                  key={s.id}
                  className={`group relative rounded-lg border p-4 transition-colors ${
                    isEditing
                      ? "border-white bg-[#181818]"
                      : isOverridden
                        ? "border-[#2A2A2A] bg-amber-500/15"
                        : "border-[#2A2A2A] bg-[#181818] hover:border-[#2A2A2A]"
                  }`}
                >
                  {isOverridden && !isEditing && (
                    <span className="absolute top-2 right-12 text-[9px] font-semibold uppercase tracking-wider text-[#92400E] bg-amber-500/15 px-1.5 py-0.5 rounded">
                      Edited
                    </span>
                  )}

                  {/* Edit / reset controls */}
                  {!isEditing && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isOverridden && (
                        <button
                          onClick={() => resetSection(s)}
                          title="Reset to default"
                          className="p-1 rounded hover:bg-[#222222] text-[#71757D] hover:text-[#E5E5EA]"
                        >
                          <ArrowUturnLeftIcon className="size-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(s)}
                        title="Edit"
                        className="p-1 rounded hover:bg-[#222222] text-[#71757D] hover:text-[#E5E5EA]"
                      >
                        <PencilSquareIcon className="size-3.5" />
                      </button>
                    </div>
                  )}

                  {isEditing ? (
                    <div>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={Math.max(6, draft.split("\n").length + 1)}
                        className="w-full font-mono text-[12px] leading-relaxed border border-[#2A2A2A] rounded-md p-3 focus:outline-none focus:border-white focus:ring-1 focus:ring-[#1B1B1B] resize-y"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[10px] text-[#71757D]">
                          Markdown — heading line included. Save returns it to default if you revert all changes.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9CA3AF] hover:text-[#E5E5EA] px-2 py-1 rounded disabled:opacity-50"
                          >
                            <XMarkIcon className="size-3" />
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(s)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E5E5EA] bg-[#222222] hover:bg-[#2A2A2A] px-2.5 py-1 rounded disabled:opacity-50"
                          >
                            <CheckIcon className="size-3" />
                            {saving ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <article className={PROSE_CLASS}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {getSectionMarkdown(s)}
                      </ReactMarkdown>
                    </article>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
