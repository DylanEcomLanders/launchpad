"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlusIcon, XMarkIcon, TrashIcon } from "@heroicons/react/24/solid";
import {
  createNote,
  deleteNote,
  getNotes,
  NOTE_COLORS,
  updateNote,
  type NoteColor,
  type TackboardNote,
} from "@/lib/tackboard";

const COLOR_CLASSES: Record<NoteColor, string> = {
  yellow: "bg-[#FFF4A3] text-[#3B2E05]",
  pink: "bg-[#FFC9D9] text-[#4A0E1F]",
  blue: "bg-[#BEE1FF] text-[#0B2A44]",
  green: "bg-[#C5F0C0] text-[#0E3A17]",
  orange: "bg-[#FFD4A8] text-[#4A2204]",
  purple: "bg-[#D9C5FF] text-[#2A1048]",
};

const AUTHOR_KEY = "tackboard-author";

export function Tackboard({ loginMode = false }: { loginMode?: boolean } = {}) {
  const [notes, setNotes] = useState<TackboardNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState("");
  const [authorPrompt, setAuthorPrompt] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

  // Load author + notes
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthor(localStorage.getItem(AUTHOR_KEY) || "");
    }
    (async () => {
      const data = await getNotes();
      setNotes(data);
      setLoading(false);
    })();
  }, []);

  const saveAuthor = (name: string) => {
    setAuthor(name);
    if (typeof window !== "undefined") localStorage.setItem(AUTHOR_KEY, name);
    setAuthorPrompt(false);
  };

  // ── Add note ──
  const addNote = useCallback(async () => {
    if (!author) {
      setAuthorPrompt(true);
      return;
    }
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const x = Math.max(4, Math.min(90, Math.random() * 70 + 10));
    const y = Math.max(10, Math.min(70, Math.random() * 50 + 15));
    const color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
    const rotation = Math.random() * 10 - 5;
    const created = await createNote({ content: "", author, color, x, y, rotation });
    if (created) {
      setNotes((n) => [...n, created]);
      setEditingId(created.id);
      setDraftContent("");
      setNewlyCreatedId(created.id);
      setTimeout(() => setNewlyCreatedId((cur) => (cur === created.id ? null : cur)), 650);
    }
    void rect;
  }, [author]);

  // ── Edit save ──
  const saveEdit = async (id: string) => {
    await updateNote(id, { content: draftContent });
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, content: draftContent } : x)));
    setEditingId(null);
    setDraftContent("");
  };

  // ── Delete ──
  const removeNote = async (id: string) => {
    await deleteNote(id);
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  // ── Drag ──
  const onMouseDown = (e: React.MouseEvent, note: TackboardNote) => {
    if (editingId === note.id) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      id: note.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setDraggingId(note.id);
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !boardRef.current) return;
      const boardRect = boardRef.current.getBoundingClientRect();
      const x = ((e.clientX - dragRef.current.offsetX - boardRect.left) / boardRect.width) * 100;
      const y = ((e.clientY - dragRef.current.offsetY - boardRect.top) / boardRect.height) * 100;
      const clampedX = Math.max(0, Math.min(94, x));
      const clampedY = Math.max(0, Math.min(94, y));
      setNotes((prev) => prev.map((n) => (n.id === dragRef.current!.id ? { ...n, x: clampedX, y: clampedY } : n)));
    };
    const onUp = async () => {
      if (!dragRef.current) return;
      const id = dragRef.current.id;
      dragRef.current = null;
      setDraggingId(null);
      // Persist final position
      setNotes((prev) => {
        const note = prev.find((n) => n.id === id);
        if (note) void updateNote(id, { x: note.x, y: note.y });
        return prev;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="relative h-screen overflow-hidden bg-[#0A0A0A] text-white">
      {/* Dotted pattern bg */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Header — tucked small in login mode so it doesn't fight the login card */}
      {loginMode ? (
        <div className="relative z-10 flex items-center justify-between px-6 pt-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">
            Team Tackboard
          </p>
          <button
            onClick={addNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 text-white text-[11px] font-medium rounded-lg hover:bg-white/20 backdrop-blur-xl transition-colors"
          >
            <PlusIcon className="size-3" />
            Add note
          </button>
        </div>
      ) : (
        <div className="relative z-10 flex items-start justify-between px-8 pt-8 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Tackboard</h1>
            <p className="text-sm text-white/50 mt-1">
              {author ? (
                <>
                  Posting as <span className="text-white/80 font-medium">{author}</span> ·{" "}
                  <button onClick={() => setAuthorPrompt(true)} className="underline hover:text-white">change</button>
                </>
              ) : (
                "Drop a goal, a win, a reminder — visible to the whole team."
              )}
            </p>
          </div>
          <button
            onClick={addNote}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#1A1A1A] text-xs font-semibold rounded-lg hover:bg-white/90 transition-colors"
          >
            <PlusIcon className="size-3.5" />
            New note
          </button>
        </div>
      )}

      {/* Board */}
      <div ref={boardRef} className="relative z-10 h-[calc(100vh-100px)] select-none">
        {loading ? (
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40 text-sm">
            Loading the board…
          </p>
        ) : notes.length === 0 ? (
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40 text-sm">
            No notes yet. Hit <span className="text-white">+ New note</span> to start.
          </p>
        ) : (
          notes.map((note) => {
            const isEditing = editingId === note.id;
            return (
              <div
                key={note.id}
                onMouseDown={(e) => onMouseDown(e, note)}
                onDoubleClick={() => {
                  setEditingId(note.id);
                  setDraftContent(note.content);
                }}
                className={`tack-sticky absolute w-52 min-h-[150px] p-4 ${COLOR_CLASSES[note.color]} ${
                  isEditing ? "cursor-text" : "cursor-grab active:cursor-grabbing"
                } ${draggingId === note.id ? "tack-dragging" : ""} ${
                  newlyCreatedId === note.id ? "tack-popin" : ""
                } group`}
                style={{
                  left: `${note.x}%`,
                  top: `${note.y}%`,
                  ["--tack-rot" as string]: `${note.rotation}deg`,
                }}
              >
                {/* Paper sheen */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none opacity-60"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.04) 80%, rgba(0,0,0,0.08) 100%)",
                  }}
                />

                {/* Pin */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 size-3.5 rounded-full bg-gradient-to-br from-[#FF5A5A] to-[#B01F1F] shadow-[0_2px_4px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.5)] ring-1 ring-black/30" />

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNote(note.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-current/70 hover:text-current"
                  title="Delete"
                >
                  <TrashIcon className="size-3" />
                </button>

                {isEditing ? (
                  <div className="flex flex-col h-full" onMouseDown={(e) => e.stopPropagation()}>
                    <textarea
                      autoFocus
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          saveEdit(note.id);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      placeholder="Write it down…"
                      className="flex-1 w-full bg-transparent outline-none resize-none text-sm font-handwriting leading-snug placeholder:text-current/40"
                    />
                    <div className="flex items-center justify-between mt-2 text-[10px] opacity-70">
                      <span>⌘+Enter to save</span>
                      <button
                        onClick={() => saveEdit(note.id)}
                        className="font-semibold hover:opacity-100 opacity-80"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm leading-snug whitespace-pre-wrap break-words min-h-[80px]">
                      {note.content || <span className="opacity-40 italic">Double-click to write…</span>}
                    </p>
                    <p className="text-[10px] opacity-60 mt-2 font-medium">— {note.author}</p>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Author prompt */}
      {authorPrompt && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">What's your name?</h2>
            <p className="text-xs text-[#777] mb-4">Saved to this browser — shows on notes you post.</p>
            <input
              autoFocus
              defaultValue={author}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveAuthor((e.target as HTMLInputElement).value.trim());
                if (e.key === "Escape") setAuthorPrompt(false);
              }}
              placeholder="e.g. Dylan"
              className="w-full px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg text-[#1A1A1A] focus:border-[#1B1B1B] outline-none"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setAuthorPrompt(false)}
                className="text-xs font-medium text-[#777] hover:text-[#1A1A1A] px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>("input[autofocus]") || (document.activeElement as HTMLInputElement);
                  const val = input?.value?.trim() || "";
                  if (val) saveAuthor(val);
                }}
                className="text-xs font-semibold text-white bg-[#1A1A1A] hover:bg-[#333] px-3 py-1.5 rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tack-sticky {
          transform: rotate(var(--tack-rot));
          transform-origin: 50% 0%;
          will-change: transform, box-shadow;
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.28s ease;
          box-shadow:
            0 1px 1px rgba(0,0,0,0.18),
            0 10px 18px rgba(0,0,0,0.42),
            0 22px 38px rgba(0,0,0,0.22);
        }
        .tack-sticky::after {
          content: "";
          position: absolute;
          left: 4%;
          right: 4%;
          bottom: -3px;
          height: 10px;
          background: radial-gradient(ellipse at center, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 70%);
          filter: blur(4px);
          z-index: -1;
          opacity: 0.8;
          pointer-events: none;
        }
        .tack-sticky:hover {
          transform: rotate(var(--tack-rot)) translateY(-5px) scale(1.035);
          box-shadow:
            0 2px 2px rgba(0,0,0,0.18),
            0 18px 26px rgba(0,0,0,0.48),
            0 32px 60px rgba(0,0,0,0.28);
          z-index: 10;
        }
        .tack-dragging,
        .tack-sticky.tack-dragging:hover {
          transform: rotate(var(--tack-rot)) scale(1.08) !important;
          box-shadow:
            0 4px 4px rgba(0,0,0,0.22),
            0 30px 50px rgba(0,0,0,0.6),
            0 54px 90px rgba(0,0,0,0.35) !important;
          z-index: 20;
          transition: none !important;
          cursor: grabbing;
        }
        .tack-popin {
          animation: tack-pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes tack-pop-in {
          0%   { transform: rotate(var(--tack-rot)) scale(0.3);  opacity: 0; }
          60%  { transform: rotate(var(--tack-rot)) scale(1.08); opacity: 1; }
          100% { transform: rotate(var(--tack-rot)) scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
