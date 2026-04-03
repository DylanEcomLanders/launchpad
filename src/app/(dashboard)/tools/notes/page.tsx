"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PlusIcon, TrashIcon, MicrophoneIcon, StopIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { createStore } from "@/lib/supabase-store";

interface ActionItem {
  id: string;
  text: string;
  done: boolean;
}

interface DailyNote {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  rawTranscript: string;
  actionItems: ActionItem[];
  notes: string; // free-form notes
  created_at: string;
  updated_at: string;
}

const store = createStore<DailyNote>({ table: "daily_notes", lsKey: "launchpad-daily-notes" });

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function dateNav(current: string, direction: number): string {
  const d = new Date(current + "T00:00:00");
  d.setDate(d.getDate() + direction);
  return d.toISOString().split("T")[0];
}

export default function NotesPage() {
  const [allNotes, setAllNotes] = useState<DailyNote[]>([]);
  const [currentDate, setCurrentDate] = useState(todayKey());
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const recognitionRef = useRef<any>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await store.getAll();
    setAllNotes(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentNote = allNotes.find((n) => n.date === currentDate) || null;
  const isToday = currentDate === todayKey();
  const isFuture = currentDate > todayKey();

  // Get or create today's note
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

  // Auto-save with debounce
  const debouncedSave = useCallback((note: DailyNote) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await store.update(note.id, { ...note, updated_at: new Date().toISOString() });
      setSaving(false);
    }, 800);
  }, []);

  // Speech recognition
  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Use Chrome.");
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

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
    setTranscript("");
  }, []);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);

    if (!transcript.trim()) return;

    // Save transcript and extract action items
    const note = await getOrCreateNote();
    const updatedTranscript = (note.rawTranscript ? note.rawTranscript + "\n\n" : "") + transcript.trim();

    // Simple action item extraction — lines that sound like tasks
    const newActions = extractActions(transcript);
    const updatedActions = [...note.actionItems, ...newActions];

    const updated = { ...note, rawTranscript: updatedTranscript, actionItems: updatedActions, updated_at: new Date().toISOString() };
    await store.update(note.id, updated);
    setTranscript("");
    load();
  }, [transcript, getOrCreateNote, load]);

  // Extract action items from transcript
  function extractActions(text: string): ActionItem[] {
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    const actionKeywords = ["need to", "should", "have to", "must", "going to", "want to", "let's", "we need", "i need", "make sure", "don't forget", "remember to", "set up", "create", "build", "fix", "update", "send", "share", "review", "check", "organise", "organize", "schedule"];

    return sentences
      .filter((s) => actionKeywords.some((k) => s.toLowerCase().includes(k)))
      .map((s) => ({
        id: crypto.randomUUID(),
        text: s.charAt(0).toUpperCase() + s.slice(1),
        done: false,
      }));
  }

  // Toggle action item
  const toggleAction = async (actionId: string) => {
    if (!currentNote) return;
    const updated = {
      ...currentNote,
      actionItems: currentNote.actionItems.map((a) =>
        a.id === actionId ? { ...a, done: !a.done } : a
      ),
    };
    setAllNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    debouncedSave(updated);
  };

  // Add manual action item
  const [newActionText, setNewActionText] = useState("");
  const addAction = async () => {
    if (!newActionText.trim()) return;
    const note = await getOrCreateNote();
    const action: ActionItem = { id: crypto.randomUUID(), text: newActionText.trim(), done: false };
    const updated = { ...note, actionItems: [...note.actionItems, action], updated_at: new Date().toISOString() };
    await store.update(note.id, updated);
    setNewActionText("");
    load();
  };

  // Delete action
  const deleteAction = async (actionId: string) => {
    if (!currentNote) return;
    const updated = { ...currentNote, actionItems: currentNote.actionItems.filter((a) => a.id !== actionId) };
    await store.update(currentNote.id, updated);
    load();
  };

  // Update free-form notes
  const updateNotes = async (text: string) => {
    const note = currentNote || (await getOrCreateNote());
    const updated = { ...note, notes: text };
    setAllNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    debouncedSave(updated);
  };

  // Days with notes (for navigation dots)
  const noteDates = new Set(allNotes.map((n) => n.date));

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <span className="text-[10px] text-[#CCC]">{saving ? "Saving..." : "Auto-saved"}</span>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-6 bg-white border border-[#E5E5EA] rounded-xl px-4 py-3">
        <button onClick={() => setCurrentDate(dateNav(currentDate, -1))} className="p-1 text-[#999] hover:text-[#1A1A1A] transition-colors">
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#1A1A1A]">{formatDate(currentDate)}</p>
          {isToday && <p className="text-[10px] text-emerald-600 font-medium">Today</p>}
        </div>
        <button onClick={() => setCurrentDate(dateNav(currentDate, 1))} className="p-1 text-[#999] hover:text-[#1A1A1A] transition-colors">
          <ChevronRightIcon className="size-5" />
        </button>
      </div>

      {/* Quick jump to today */}
      {!isToday && (
        <button onClick={() => setCurrentDate(todayKey())} className="text-xs text-[#2563EB] hover:underline mb-4 block">
          Jump to today
        </button>
      )}

      {/* Record button */}
      <div className="mb-6">
        {recording ? (
          <div className="border border-red-200 bg-red-50/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-red-600">Recording...</span>
              </div>
              <button onClick={stopRecording} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600">
                <StopIcon className="size-3" /> Stop
              </button>
            </div>
            {transcript && (
              <p className="text-xs text-[#555] leading-relaxed bg-white rounded-lg p-3 border border-[#E5E5EA]">{transcript}</p>
            )}
          </div>
        ) : (
          <button
            onClick={startRecording}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#E5E5EA] rounded-xl text-[#777] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
          >
            <MicrophoneIcon className="size-4" />
            <span className="text-xs font-medium">Tap to record</span>
          </button>
        )}
      </div>

      {/* Action Items */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">
            Action Items {currentNote?.actionItems.length ? `(${currentNote.actionItems.filter(a => !a.done).length} remaining)` : ""}
          </h2>
        </div>

        <div className="space-y-1.5">
          {(currentNote?.actionItems || []).map((action) => (
            <div key={action.id} className="flex items-start gap-2.5 group">
              <input
                type="checkbox"
                checked={action.done}
                onChange={() => toggleAction(action.id)}
                className="size-4 rounded border-[#CCC] text-[#1B1B1B] focus:ring-0 mt-0.5 cursor-pointer"
              />
              <p className={`flex-1 text-sm leading-relaxed ${action.done ? "line-through text-[#CCC]" : "text-[#333]"}`}>
                {action.text}
              </p>
              <button onClick={() => deleteAction(action.id)} className="p-0.5 text-[#DDD] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <TrashIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Add manual action */}
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            value={newActionText}
            onChange={(e) => setNewActionText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addAction(); }}
            placeholder="Add action item..."
            className="flex-1 text-sm px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#CCC]"
          />
          <button onClick={addAction} disabled={!newActionText.trim()} className="p-2 text-[#CCC] hover:text-[#1A1A1A] disabled:opacity-30">
            <PlusIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Free-form notes */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Notes</h2>
        <textarea
          value={currentNote?.notes || ""}
          onChange={(e) => updateNotes(e.target.value)}
          placeholder="Free-form notes for the day..."
          className="w-full min-h-[150px] text-sm px-4 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:border-[#999] placeholder:text-[#CCC] resize-y leading-relaxed"
        />
      </div>

      {/* Raw transcript */}
      {currentNote?.rawTranscript && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Transcript</h2>
          <div className="bg-[#FAFAFA] border border-[#E5E5EA] rounded-xl p-4">
            <p className="text-xs text-[#777] leading-relaxed whitespace-pre-wrap">{currentNote.rawTranscript}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!currentNote && !recording && (
        <div className="text-center py-8">
          <p className="text-sm text-[#CCC]">No notes for this day</p>
          <p className="text-xs text-[#DDD] mt-1">Tap record or type to start</p>
        </div>
      )}
    </div>
  );
}
