"use client";

/* ── Pod Projects: document editor ──
 * TipTap (ProseMirror) WYSIWYG with first-class tables — the whole reason to
 * move off Docs. Styled to the tokens via .pod-doc in globals.css; the toolbar
 * uses the shared control idiom. Content is uncontrolled inside TipTap; the
 * parent swaps documents by changing `docId`, which re-seeds the editor.
 */

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { type EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { uploadImage, fileToDataUrl } from "@/lib/cx/images";
import {
  Bars3BottomLeftIcon,
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
  CheckCircleIcon,
  TableCellsIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

function Btn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 min-w-7 items-center justify-center gap-1 rounded-md px-1.5 text-xs transition-colors disabled:opacity-30 ${
        active
          ? "bg-surface-raised text-foreground"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px shrink-0 bg-border" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  const inTable = editor.isActive("table");
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-background/90 px-4 py-1.5 backdrop-blur">
      <Btn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <span className="font-heading text-sm font-semibold">H1</span>
      </Btn>
      <Btn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <span className="font-heading text-xs font-semibold">H2</span>
      </Btn>
      <Btn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <span className="font-heading text-2xs font-semibold">H3</span>
      </Btn>
      <Btn title="Body text" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Bars3BottomLeftIcon className="size-4" />
      </Btn>
      <Divider />
      <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <BoldIcon className="size-4" />
      </Btn>
      <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <ItalicIcon className="size-4" />
      </Btn>
      <Btn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <ListBulletIcon className="size-4" />
      </Btn>
      <Btn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <NumberedListIcon className="size-4" />
      </Btn>
      <Btn title="Checklist" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <CheckCircleIcon className="size-4" />
      </Btn>
      <Divider />
      <Btn
        title="Insert table"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableCellsIcon className="size-4" />
      </Btn>
      {inTable && (
        <>
          <Btn title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <PlusIcon className="size-3.5" /><span className="text-3xs">col</span>
          </Btn>
          <Btn title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
            <PlusIcon className="size-3.5" /><span className="text-3xs">row</span>
          </Btn>
          <Btn title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
            <MinusIcon className="size-3.5" /><span className="text-3xs">col</span>
          </Btn>
          <Btn title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
            <MinusIcon className="size-3.5" /><span className="text-3xs">row</span>
          </Btn>
          <Btn title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
            <TrashIcon className="size-3.5" />
          </Btn>
        </>
      )}
    </div>
  );
}

/* Insert pasted/dropped images. Uploads to the cx-images Storage bucket and
 * inserts the URL; falls back to inline base64 if the bucket isn't set up yet.
 * Returns true when it handled at least one image (so the editor preventDefaults). */
function insertImageFiles(view: EditorView, files: FileList | null, pos?: number): boolean {
  const images = files ? Array.from(files).filter((f) => f.type.startsWith("image/")) : [];
  if (!images.length) return false;
  images.forEach((file) => {
    void (async () => {
      const src = (await uploadImage(file)) ?? (await fileToDataUrl(file));
      if (view.isDestroyed) return;
      const { schema, tr, selection } = view.state;
      const node = schema.nodes.image?.create({ src });
      if (!node) return;
      view.dispatch(tr.insert(pos ?? selection.from, node));
    })();
  });
  return true;
}

export function DocEditor({
  contentKey,
  initialBody,
  onChange,
  appendAction,
  editable = true,
}: {
  /** Unique per doc+section — changing it re-seeds the editor. */
  contentKey: string;
  initialBody: string;
  onChange: (html: string) => void;
  /** Optional footer button that appends a template block (e.g. "Add page brief"). */
  appendAction?: { label: string; html: string };
  /** false = read-only render (no toolbar, no typing) for member/view roles. */
  editable?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false, // SSR-safe (Next 16 / React 19)
    editable,
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ allowBase64: true, HTMLAttributes: { class: "pod-doc-img" } }),
      Placeholder.configure({ placeholder: "Start typing…" }),
    ],
    content: initialBody,
    editorProps: {
      attributes: { class: "pod-doc focus:outline-none" },
      handlePaste: (view, event) => insertImageFiles(view, event.clipboardData?.files ?? null),
      handleDrop: (view, event) => {
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        return insertImageFiles(view, event.dataTransfer?.files ?? null, pos);
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep editability in sync if the role/prop changes.
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(editable);
  }, [editor, editable]);

  // Swap content when the selected doc/section changes.
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(initialBody, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  if (!editor) {
    return <div className="px-4 py-6 text-sm text-subtle">Loading editor…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {editable && <Toolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Wider canvas so tables breathe; prose blocks self-cap to a readable
            measure via .pod-doc rules, tables span the full width. */}
        <div className="mx-auto max-w-[940px] px-6 py-10 md:px-10">
          <EditorContent editor={editor} />
          {editable && appendAction && (
            <button
              onClick={() => editor.chain().focus("end").insertContent(appendAction.html).run()}
              className="mt-4 flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-subtle transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <PlusIcon className="size-3.5" /> {appendAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
