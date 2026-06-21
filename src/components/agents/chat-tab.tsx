"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PaperAirplaneIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { Agent, AgentStatus } from "@/lib/agents/types";
import { textareaClass } from "@/lib/form-styles";
import { PixelPortrait } from "./pixel-portrait";

interface ChatTabProps {
  agent: Agent;
  /** Optimistic status updates so the sprite swap happens immediately,
   * without waiting on a DB round-trip. The server-side flip in /run is
   * best-effort persistence; the UI is driven from here. */
  onStatusChange: (status: AgentStatus) => void;
  /** Fired after the run completes so the parent reloads tasks. */
  onRunComplete: () => void;
}

interface ToolCall {
  name: string;
  input: unknown;
  result: unknown;
}

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  pending?: boolean;
  /** Tools the agent called for this turn (only set on agent messages
   * after the response lands). Surfaces in the bubble as a small chip
   * row so hallucinations are auditable. */
  toolCalls?: ToolCall[];
}

const STORAGE_PREFIX = "launchpad-chat-";
/** Cap how much history we ship back to the server. Keeps requests bounded
 * and Anthropic context costs sane — Dylan rarely needs >10 turns of
 * back-and-forth to land an answer with Felix. */
const HISTORY_TURNS_SENT = 10;

function loadThread(storageKey: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as Message[]) : [];
    // Drop any orphaned pending bubbles from a crash mid-send.
    return parsed.filter((m) => !m.pending);
  } catch {
    return [];
  }
}

export function ChatTab({ agent, onStatusChange, onRunComplete }: ChatTabProps) {
  const storageKey = `${STORAGE_PREFIX}${agent.id}`;
  const isReal = agent.runner === "real";

  /* Lazy init reads localStorage synchronously on first render. This is
   * critical: if we used useState([]) + a load useEffect, the persist
   * useEffect would race and write the empty initial state back to
   * localStorage before the load could populate it (clobbering the saved
   * thread). The lazy initializer means `messages` already has the saved
   * data by the time any effect runs. */
  const [messages, setMessages] = useState<Message[]>(() => loadThread(storageKey));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Re-load when the agent changes (user navigates from /agents/felix
   * to /agents/wren without the component unmounting). The lazy init
   * above handles the very first mount. */
  const lastKeyRef = useRef(storageKey);
  useEffect(() => {
    if (storageKey === lastKeyRef.current) return;
    lastKeyRef.current = storageKey;
    setMessages(loadThread(storageKey));
  }, [storageKey]);

  /* Persist on every message change. Skipped while sending so the
   * "…thinking" placeholder bubble doesn't get checkpointed — the next
   * write after the response lands captures the full turn. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sending) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      /* quota exceeded — silently drop, the UI still works in-memory */
    }
  }, [messages, sending, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const historyForApi = useMemo(
    () =>
      messages
        .filter((m) => !m.pending && m.text.trim().length > 0)
        .slice(-HISTORY_TURNS_SENT)
        .map((m) => ({ role: m.role, text: m.text })),
    [messages]
  );

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: trimmed };
    const pendingId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: pendingId, role: "agent", text: "", pending: true }]);
    setInput("");
    setSending(true);

    /* Capture the pre-run status so we can RESTORE it on completion
     * rather than always dropping back to IDLE. Fixes the bug where
     * sending a chat to a BLOCKED agent would silently un-block it. */
    const previousStatus = agent.status;
    const shouldFlip = previousStatus !== "OFFLINE";
    if (shouldFlip) onStatusChange("WORKING");

    try {
      const res = await fetch(`/api/agents/${agent.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed, history: historyForApi }),
      });
      const json = await res.json();
      const output = res.ok ? (json.output as string) : `Error: ${json.error || "unknown"}`;
      const toolCalls = Array.isArray(json.toolCalls) ? (json.toolCalls as ToolCall[]) : undefined;
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingId
            ? { ...msg, text: output, pending: false, toolCalls }
            : msg
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((m) => m.map((mm) => (mm.id === pendingId ? { ...mm, text: `Error: ${msg}`, pending: false } : mm)));
    } finally {
      if (shouldFlip) onStatusChange(previousStatus);
      onRunComplete();
      setSending(false);
    }
  }

  function clearConversation() {
    setMessages([]);
    if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
  }

  const footerLabel = isReal
    ? `${agent.model} · ${messages.filter((m) => !m.pending).length} turns in this thread`
    : `Stub mode · ${agent.model} · responses simulated with 1.5s delay`;

  const emptyStateCopy = isReal
    ? `Ask ${agent.name} anything about what's happening across the agency. Conversation persists, so follow-ups remember context.`
    : `Brief them with a task — responses are mocked in v0.5 while we wire the API.`;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#181818] shadow-[var(--shadow-soft)] flex flex-col h-[560px]">
      {/* Header — only shown when there's a thread to clear */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-3 py-2">
          <span className="text-[11px] uppercase tracking-wider text-[#71757D]">
            Conversation with {agent.name}
          </span>
          <button
            onClick={clearConversation}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[#71757D] hover:bg-[#222222] hover:text-[#E5E5EA] transition-colors"
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            <TrashIcon className="size-3" />
            Clear
          </button>
        </div>
      )}

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PixelPortrait agent={agent} size={64} className="mb-3" static />
            <p className="text-sm font-medium text-[#E5E5EA]">{agent.name} is ready.</p>
            <p className="text-xs text-[#71757D] mt-1 max-w-xs">{emptyStateCopy}</p>
          </div>
        ) : (
          messages.map((msg) => <Bubble key={msg.id} msg={msg} agent={agent} />)
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#2A2A2A] p-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Brief ${agent.name}…`}
            rows={2}
            className={textareaClass}
            disabled={sending}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="shrink-0 inline-flex items-center justify-center size-10 rounded-lg bg-white text-[#0C0C0C] hover:bg-[#F3F4F6] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <PaperAirplaneIcon className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-[#71757D]">{footerLabel}</p>
      </div>
    </div>
  );
}

function Bubble({ msg, agent }: { msg: Message; agent: Agent }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-xl bg-white text-[#0C0C0C] px-3 py-2 text-sm leading-relaxed shadow-[var(--shadow-soft)] whitespace-pre-wrap">
          {msg.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-start">
      <PixelPortrait agent={agent} size={32} static />
      <div className="max-w-[80%] flex flex-col gap-1.5">
        <div className="rounded-xl bg-[#222222] px-3 py-2 text-sm leading-relaxed text-[#E5E5EA] whitespace-pre-wrap">
          {msg.pending ? (
            <span className="inline-flex gap-1 py-1">
              <span className="size-1.5 rounded-full bg-[#7A7A7A] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="size-1.5 rounded-full bg-[#7A7A7A] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 rounded-full bg-[#7A7A7A] animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          ) : (
            msg.text
          )}
        </div>
        {!msg.pending && msg.toolCalls && msg.toolCalls.length > 0 && (
          <ToolCallStrip calls={msg.toolCalls} />
        )}
        {!msg.pending && msg.toolCalls && msg.toolCalls.length === 0 && (
          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
            ⚠️ No tools called — this answer came from the model alone. Treat with caution.
          </div>
        )}
      </div>
    </div>
  );
}

/** Compact strip showing each tool call as an expandable chip. Click to
 * see the input args + raw result Felix actually saw. Lets Dylan spot
 * hallucinations: if the chip says count: 0 but Felix listed 5 things,
 * something's off. */
function ToolCallStrip({ calls }: { calls: ToolCall[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {calls.map((c, i) => (
          <button
            key={i}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
              openIdx === i
                ? "bg-white text-[#0C0C0C] border-white"
                : "bg-[#181818] text-[#71757D] border-[#2A2A2A] hover:text-[#E5E5EA] hover:border-white/40"
            }`}
            title="Tap to inspect what data Felix saw"
          >
            <span className="size-1 rounded-full bg-emerald-500" />
            {c.name}
            <span className="opacity-60">({summariseResult(c.result)})</span>
          </button>
        ))}
      </div>
      {openIdx !== null && (
        <div className="rounded-md border border-[#2A2A2A] bg-[#181818] p-2 text-[11px] font-mono text-[#E5E5EA] max-h-64 overflow-auto whitespace-pre-wrap">
          <div className="text-[#71757D] mb-1">input:</div>
          <pre className="mb-2">{safeJson(calls[openIdx].input)}</pre>
          <div className="text-[#71757D] mb-1">result:</div>
          <pre>{safeJson(calls[openIdx].result)}</pre>
        </div>
      )}
    </div>
  );
}

/** One-line summary of a tool result for the chip label. Surfaces count
 * fields that most launchpad/slack tools return — so Dylan sees "(0)"
 * or "(5 hits)" without expanding. */
function summariseResult(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const r = result as Record<string, unknown>;
  if (r.__truncated) return "truncated";
  if (typeof r.count === "number") return `${r.count}`;
  return "ok";
}

function safeJson(v: unknown): string {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
