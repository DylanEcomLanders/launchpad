"use client";

/* ── SectionCard ──
 *
 * Reusable inline-editable markdown card. Same shape across Start
 * here / Acquisition / Retention. Admin sees Edit + Delete; team
 * sees rendered markdown only.
 */

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { inputClass, textareaClass } from "@/lib/form-styles";

interface SectionLike {
  id: string;
  title: string;
  body: string;
}

export function SectionCard<T extends SectionLike>({
  section,
  isAdmin,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  section: T;
  isAdmin: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<T>) => void;
  onDelete: () => void;
}) {
  const [titleDraft, setTitleDraft] = useState(section.title);
  const [bodyDraft, setBodyDraft] = useState(section.body);

  useEffect(() => {
    if (editing) {
      setTitleDraft(section.title);
      setBodyDraft(section.body);
    }
  }, [editing, section.title, section.body]);

  if (editing) {
    return (
      <div className="bg-[#0F0F10] rounded-2xl p-5 space-y-3 ring-1 ring-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.12)]">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          placeholder="Section title"
          className={inputClass}
          autoFocus
        />
        <textarea
          value={bodyDraft}
          onChange={(e) => setBodyDraft(e.target.value)}
          placeholder="Markdown body..."
          rows={10}
          className={`${textareaClass} font-mono text-[13px]`}
        />
        <div className="flex items-center justify-between">
          <button
            onClick={onDelete}
            className="text-[11px] uppercase tracking-wider text-[#71757D] hover:text-rose-400"
          >
            Delete section
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
                  title: (titleDraft.trim() || "Untitled") as T["title"],
                  body: bodyDraft as T["body"],
                } as Partial<T>)
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
    <div className="bg-[#0F0F10] rounded-2xl p-5 group ring-1 ring-white/[0.04] hover:ring-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-[#E5E5EA]">{section.title}</h2>
        {isAdmin && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#71757D] hover:text-[#E5E5EA]"
            title="Edit section"
          >
            <PencilSquareIcon className="size-4" />
          </button>
        )}
      </div>
      {section.body.trim() ? (
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-[#E5E5EA] prose-p:text-[#9CA3AF] prose-li:text-[#9CA3AF] prose-strong:text-[#E5E5EA] prose-a:text-[#E5E5EA]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {section.body}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-xs text-[#71757D] italic">Empty section.</p>
      )}
    </div>
  );
}
