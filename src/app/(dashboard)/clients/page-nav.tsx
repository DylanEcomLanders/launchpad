"use client";

/* ── Pod Projects: page nav (right, "On This Page") ──
 * The pages of the active brand, as a right-hand vertical index (docs-TOC
 * style). Groups list their children indented under a guide line; the active
 * page gets a left accent bar. Pages isolate; add / rename (double-click) /
 * delete (hover ×, with confirm) live here. No progress count on groups — an
 * open-ended cadence like Reports has no meaningful total.
 */

import { useEffect, useRef, useState } from "react";
import { PlusIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import type { DocSection } from "@/lib/pod-projects/types";

const done = (s: DocSection) => (s.children?.length ? s.children.every((c) => c.done) : !!s.done);

export function PageNav({
  sections,
  activeId,
  autoEditId,
  onSelect,
  onAddSection,
  onRename,
  onDelete,
  canEdit = true,
}: {
  sections: DocSection[];
  activeId: string | null;
  autoEditId?: string | null;
  onSelect: (section: DocSection) => void;
  onAddSection: (parentId: string | null) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoEditId) {
      setEditingId(autoEditId);
      setDraft("New page");
    }
  }, [autoEditId]);
  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  function commit() {
    if (editingId) onRename(editingId, draft.trim() || "Untitled");
    setEditingId(null);
  }

  function renameInput(id: string) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditingId(null);
        }}
        className="my-0.5 w-full rounded-md bg-surface-raised px-2 py-1 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring/50"
      />
    );
  }

  /* A selectable page row. `accent` draws the left "current page" bar. */
  function row(section: DocSection, onClick: () => void) {
    if (section.id === editingId) return <div key={section.id}>{renameInput(section.id)}</div>;
    const active = section.id === activeId;
    const complete = done(section) && !section.children?.length;
    return (
      <div key={section.id} className="group/row relative flex items-center pr-1">
        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-ring" />}
        <button
          onClick={onClick}
          onDoubleClick={() => {
            if (!canEdit) return;
            setEditingId(section.id);
            setDraft(section.title);
          }}
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 pl-2.5 pr-1 text-left text-[13px] transition-colors ${
            active
              ? "font-medium text-foreground"
              : complete
                ? "text-subtle hover:text-foreground"
                : "text-muted hover:text-foreground"
          }`}
        >
          {complete && <CheckCircleIcon className="size-3.5 shrink-0 text-status-ontrack" />}
          <span className="truncate">{section.title}</span>
        </button>
        {canEdit && (
          <button
            onClick={() => {
              if (confirm(`Delete "${section.title}"? This cannot be undone.`)) onDelete(section.id);
            }}
            title="Delete page"
            className="flex size-5 shrink-0 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-danger group-hover/row:opacity-100"
          >
            <span className="text-xs leading-none">×</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        <Bars3Icon className="size-3.5 text-subtle" />
        <span className="font-mono text-4xs font-medium uppercase tracking-widest text-subtle">On this page</span>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        {sections.map((section, i) => {
          const isGroup = !!section.children?.length && section.body === "";
          const prevGroup = i > 0 && !!sections[i - 1].children?.length && sections[i - 1].body === "";
          // Clear space around every section boundary — a group, or a standalone
          // page that follows one — so the list reads in tidy blocks.
          const spacer = i > 0 && (isGroup || prevGroup) ? "mt-4" : "";

          if (!isGroup) return <div key={section.id} className={spacer}>{row(section, () => onSelect(section))}</div>;
          return (
            <div key={section.id} className={spacer}>
              {/* mono subheader — everything sits on the same left edge as the rows */}
              <div className="group/grp relative flex items-center pr-1">
                <span className="flex-1 truncate px-2.5 pb-1 pt-0.5 font-mono text-4xs font-medium uppercase tracking-widest text-subtle">
                  {section.title}
                </span>
                {done(section) && <CheckCircleIcon className="mr-1 size-3.5 shrink-0 text-status-ontrack" />}
                {canEdit && (
                  <button
                    onClick={() => onAddSection(section.id)}
                    title={`Add to ${section.title}`}
                    className="flex size-5 shrink-0 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-foreground group-hover/grp:opacity-100"
                  >
                    <PlusIcon className="size-3" />
                  </button>
                )}
              </div>
              {section.children!.map((c) => row(c, () => onSelect(c)))}
            </div>
          );
        })}

        {canEdit && (
          <button
            onClick={() => onAddSection(null)}
            className="mt-4 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-left text-3xs text-subtle transition-colors hover:text-foreground"
          >
            <PlusIcon className="size-3" /> New page
          </button>
        )}
      </nav>
    </aside>
  );
}
