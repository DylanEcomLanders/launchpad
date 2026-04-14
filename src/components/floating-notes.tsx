"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  PlusIcon,
  TrashIcon,
  MicrophoneIcon,
  StopIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface ActionItem {
  id: string;
  text: string;
  done: boolean;
}

interface DailyNote {
  id: string;
  date: string;
  rawTranscript: string;
  actionItems: ActionItem[];
  notes: string;
  created_at: string;
  updated_at: string;
}

const LS_KEY = "launchpad-private-notes";

const store = {
  getAll: async (): Promise<DailyNote[]> => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
      return [];
    }
  },
  create: async (note: DailyNote) => {
    const all = await store.getAll();
    all.push(note);
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  },
  update: async (id: string, updates: Partial<DailyNote>) => {
    const all = await store.getAll();
    const idx = all.findIndex((n) => n.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      localStorage.setItem(LS_KEY, JSON.stringify(all));
    }
  },
};

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function formatDateShort(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function dateNav(current: string, direction: number): string {
  const d = new Date(current + "T00:00:00");
  d.setDate(d.getDate() + direction);
  return d.toISOString().split("T")[0];
}

export function FloatingNotes() {
  const [open, setOpen] = useState(false);
  const [allNotes, setAllNotes] = useState<DailyNote[]>([]);
  const [currentDate, setCurrentDate] = useState(todayKey());
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [newActionText, setNewActionText] = useState("");
  const recognitionRef = useRef<any>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const data = await store.getAll();
    setAllNotes(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to today when opening
  useEffect(() => {
    if (open) {
      setCurrentDate(todayKey());
      load();
    }
  }, [open, load]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Keyboard shortcut: Cmd+Shift+N
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "n") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const currentNote = allNotes.find((n) => n.date === currentDate) || null;
  const isToday = currentDate === todayKey();

  const getOrCreateNote = useCallback(async (): Promise<DailyNote> => {
    const existing = allNotes.find((n) => n.date === currentDate);
    if (existing) return existing;
    const note: DailyNote = {
      id: currentDate,
      date: currentDate,
      rawTranscript: "",
      actionItems: [],
      notes: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.create(note);
    await load();
    return note;
  }, [allNotes, currentDate, load]);

  const debouncedSave = useCallback((note: DailyNote) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await store.update(note.id, {
        ...note,
        updated_at: new Date().toISOString(),
      });
      setSaving(false);
    }, 800);
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported. Use Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    let finalTranscript = "";
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
    setTranscript("");
  }, []);

  function extractActions(text: string): ActionItem[] {
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const keywords = [
      "need to", "should", "have to", "must", "going to", "want to",
      "let's", "we need", "i need", "make sure", "don't forget",
      "remember to", "set up", "create", "build", "fix", "update",
      "send", "share", "review", "check", "schedule",
    ];
    return sentences
      .filter((s) => keywords.some((k) => s.toLowerCase().includes(k)))
      .map((s) => ({
        id: crypto.randomUUID(),
        text: s.charAt(0).toUpperCase() + s.slice(1),
        done: false,
      }));
  }

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
    if (!transcript.trim()) return;
    const note = await getOrCreateNote();
    const updatedTranscript =
      (note.rawTranscript ? note.rawTranscript + "\n\n" : "") +
      transcript.trim();
    const newActions = extractActions(transcript);
    const updated = {
      ...note,
      rawTranscript: updatedTranscript,
      actionItems: [...note.actionItems, ...newActions],
      updated_at: new Date().toISOString(),
    };
    await store.update(note.id, updated);
    setTranscript("");
    load();
  }, [transcript, getOrCreateNote, load]);

  const toggleAction = async (actionId: string) => {
    if (!currentNote) return;
    const updated = {
      ...currentNote,
      actionItems: currentNote.actionItems.map((a) =>
        a.id === actionId ? { ...a, done: !a.done } : a
      ),
    };
    setAllNotes((prev) =>
      prev.map((n) => (n.id === updated.id ? updated : n))
    );
    debouncedSave(updated);
  };

  const addAction = async () => {
    if (!newActionText.trim()) return;
    const note = await getOrCreateNote();
    const action: ActionItem = {
      id: crypto.randomUUID(),
      text: newActionText.trim(),
      done: false,
    };
    const updated = {
      ...note,
      actionItems: [...note.actionItems, action],
      updated_at: new Date().toISOString(),
    };
    await store.update(note.id, updated);
    setNewActionText("");
    load();
  };

  const deleteAction = async (actionId: string) => {
    if (!currentNote) return;
    const updated = {
      ...currentNote,
      actionItems: currentNote.actionItems.filter((a) => a.id !== actionId),
    };
    await store.update(currentNote.id, updated);
    load();
  };

  const updateNotes = async (text: string) => {
    const note = currentNote || (await getOrCreateNote());
    const updated = { ...note, notes: text };
    setAllNotes((prev) =>
      prev.map((n) => (n.id === updated.id ? updated : n))
    );
    debouncedSave(updated);
  };

  const remaining = currentNote?.actionItems.filter((a) => !a.done).length || 0;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 right-4 z-[60] p-2 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 group"
        title="Notes (Cmd+Shift+N)"
      >
        <svg className="size-4 text-[#7A7A7A] group-hover:text-[#1B1B1B] transition-colors" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5zm12 2a1 1 0 01.894.553l3 6A1 1 0 0117 15h-6a1 1 0 01-.894-1.447l3-6A1 1 0 0114 7z" clipRule="evenodd" />
        </svg>
        {remaining > 0 && (
          <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {remaining}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed top-14 right-4 z-[60] w-[380px] max-h-[calc(100vh-80px)] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] border border-[#E5E5EA] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentDate(dateNav(currentDate, -1))}
                  className="p-0.5 text-[#CCC] hover:text-[#1B1B1B] transition-colors"
                >
                  <ChevronLeftIcon className="size-3.5" />
                </button>
                <button
                  onClick={() => !isToday && setCurrentDate(todayKey())}
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    isToday
                      ? "text-[#1B1B1B]"
                      : "text-[#666] hover:text-[#1B1B1B] hover:bg-[#F5F5F5]"
                  }`}
                >
                  {formatDateShort(currentDate)}
                  {isToday && (
                    <span className="ml-1 text-[9px] text-emerald-600 font-semibold">
                      TODAY
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setCurrentDate(dateNav(currentDate, 1))}
                  className="p-0.5 text-[#CCC] hover:text-[#1B1B1B] transition-colors"
                >
                  <ChevronRightIcon className="size-3.5" />
                </button>
              </div>
              <span className="text-[9px] text-[#CCC]">
                {saving ? "Saving..." : ""}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-[#CCC] hover:text-[#1B1B1B] transition-colors"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
            {/* Record */}
            {recording ? (
              <div className="border border-red-200 bg-red-50/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-red-600">
                      Recording...
                    </span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-[10px] font-medium rounded-md hover:bg-red-600"
                  >
                    <StopIcon className="size-2.5" /> Stop
                  </button>
                </div>
                {transcript && (
                  <p className="text-[11px] text-[#555] leading-relaxed bg-white rounded p-2 border border-[#E5E5EA]">
                    {transcript}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={startRecording}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-[#E5E5EA] rounded-lg text-[#999] hover:border-[#999] hover:text-[#1B1B1B] transition-colors"
              >
                <MicrophoneIcon className="size-3.5" />
                <span className="text-[11px] font-medium">Record</span>
              </button>
            )}

            {/* Action Items */}
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#BBB] mb-2">
                Actions{" "}
                {remaining > 0 && (
                  <span className="text-[#999]">({remaining})</span>
                )}
              </h3>
              <div className="space-y-1">
                {(currentNote?.actionItems || []).map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start gap-2 group"
                  >
                    <input
                      type="checkbox"
                      checked={action.done}
                      onChange={() => toggleAction(action.id)}
                      className="size-3.5 rounded border-[#CCC] text-[#1B1B1B] focus:ring-0 mt-0.5 cursor-pointer"
                    />
                    <p
                      className={`flex-1 text-xs leading-relaxed ${
                        action.done
                          ? "line-through text-[#CCC]"
                          : "text-[#444]"
                      }`}
                    >
                      {action.text}
                    </p>
                    <button
                      onClick={() => deleteAction(action.id)}
                      className="p-0.5 text-[#DDD] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <input
                  type="text"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addAction();
                  }}
                  placeholder="Add action..."
                  className="flex-1 text-xs px-2.5 py-1.5 border border-[#E5E5EA] rounded-md focus:outline-none focus:border-[#999] placeholder:text-[#DDD]"
                />
                <button
                  onClick={addAction}
                  disabled={!newActionText.trim()}
                  className="p-1 text-[#CCC] hover:text-[#1B1B1B] disabled:opacity-30"
                >
                  <PlusIcon className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#BBB] mb-2">
                Notes
              </h3>
              <textarea
                value={currentNote?.notes || ""}
                onChange={(e) => updateNotes(e.target.value)}
                placeholder="Quick notes..."
                className="w-full min-h-[80px] text-xs px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#DDD] resize-y leading-relaxed"
              />
            </div>

            {/* Transcript */}
            {currentNote?.rawTranscript && (
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#BBB] mb-2">
                  Transcript
                </h3>
                <div className="bg-[#FAFAFA] border border-[#E5E5EA] rounded-lg p-2.5">
                  <p className="text-[10px] text-[#888] leading-relaxed whitespace-pre-wrap">
                    {currentNote.rawTranscript}
                  </p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!currentNote && !recording && (
              <div className="text-center py-4">
                <p className="text-xs text-[#CCC]">No notes for this day</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
