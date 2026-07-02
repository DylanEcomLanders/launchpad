"use client";

// Unified inbox: conversation list (left) + thread with inline reply (middle)
// + lead context panel with temperature / notes / tasks (right). One screen.
// Channel is chosen per-reply; LinkedIn replies are "logged" (manual), every
// other channel "sends" via its adapter (mock). All mutations bubble up to
// client.tsx.

import { useState } from "react";
import {
  PaperAirplaneIcon,
  PlusIcon,
  CheckCircleIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { inputClass, textareaClass } from "@/lib/form-styles";
import type {
  Channel,
  Lead,
  LeadMessage,
  LeadTask,
  Temperature,
} from "@/lib/sales-dashboard/types";
import { ADAPTERS } from "@/lib/sales-dashboard/adapters";
import { MOCK_TODAY } from "@/lib/sales-dashboard/config";

const CHANNEL_META: Record<Channel, { label: string; color: string }> = {
  email: { label: "Email", color: "#5B8DEF" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  twitter: { label: "X", color: "#1DA1F2" },
  instagram: { label: "Instagram", color: "#E1306C" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  cal_com: { label: "Cal.com", color: "#9CA3AF" },
  lander: { label: "Lander", color: "#F5A623" },
  manual: { label: "Manual", color: "#71757D" },
};

const TEMPS: Temperature[] = ["hot", "warm", "cold", "nurture"];
const TEMP_COLOR: Record<Temperature, string> = {
  hot: "#F97066",
  warm: "#F5A623",
  cold: "#5B8DEF",
  nurture: "#9CA3AF",
};

function ChannelTag({ channel }: { channel: Channel }) {
  const m = CHANNEL_META[channel];
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full"
      style={{ background: `${m.color}1A`, color: m.color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

const timeShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function Inbox({
  leads,
  messages,
  tasks,
  selectedLeadId,
  onSelectLead,
  onSend,
  onSetTemperature,
  onUpdateNotes,
  onToggleTask,
  onAddTask,
  onMerge,
}: {
  leads: Lead[];
  messages: LeadMessage[];
  tasks: LeadTask[];
  selectedLeadId: string | null;
  onSelectLead: (id: string) => void;
  onSend: (leadId: string, channel: Channel, body: string) => void;
  onSetTemperature: (leadId: string, t: Temperature) => void;
  onUpdateNotes: (leadId: string, notes: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (leadId: string, title: string) => void;
  onMerge: (targetId: string, sourceId: string) => void;
}) {
  // Conversations = leads that have at least one message, newest activity first.
  const convos = leads
    .map((lead) => {
      const thread = messages
        .filter((m) => m.lead_id === lead.id)
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      const last = thread[thread.length - 1];
      const unread = thread.filter((m) => !m.is_read && m.direction === "inbound").length;
      return { lead, thread, last, unread };
    })
    .filter((c) => c.last)
    .sort((a, b) => +new Date(b.last!.created_at) - +new Date(a.last!.created_at));

  const selected = convos.find((c) => c.lead.id === selectedLeadId) ?? convos[0] ?? null;

  return (
    <div className="grid grid-cols-[300px_1fr_300px] h-[calc(100vh-220px)] min-h-[560px] rounded-xl border border-surface-raised overflow-hidden bg-background">
      {/* Conversation list */}
      <div className="border-r border-surface-raised overflow-y-auto">
        {convos.map(({ lead, last, unread }) => (
          <button
            key={lead.id}
            onClick={() => onSelectLead(lead.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-surface transition-colors ${
              selected?.lead.id === lead.id ? "bg-surface" : "hover:bg-surface"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-sm truncate ${unread ? "font-semibold text-foreground" : "font-medium text-muted"}`}
              >
                {lead.company}
              </span>
              {unread > 0 && (
                <span className="ml-auto shrink-0 size-4 rounded-full bg-foreground text-background text-[11px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {last && <ChannelTag channel={last.channel} />}
              <span className="text-[11px] text-subtle ml-auto">{last && timeShort(last.created_at)}</span>
            </div>
            {last && (
              <p className="text-[12px] text-subtle mt-1 line-clamp-1">
                {last.direction === "outbound" ? "You: " : ""}
                {last.body}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Thread + reply */}
      {selected ? (
        <ThreadPane
          key={selected.lead.id}
          lead={selected.lead}
          thread={selected.thread}
          onSend={onSend}
          onMerge={onMerge}
          otherConvos={convos
            .filter((c) => c.lead.id !== selected.lead.id)
            .map((c) => ({ id: c.lead.id, company: c.lead.company, channel: c.last!.channel }))}
        />
      ) : (
        <div className="flex items-center justify-center text-sm text-subtle">No conversations</div>
      )}

      {/* Lead context */}
      {selected ? (
        <ContextPane
          lead={selected.lead}
          tasks={tasks.filter((t) => t.lead_id === selected.lead.id)}
          onSetTemperature={onSetTemperature}
          onUpdateNotes={onUpdateNotes}
          onToggleTask={onToggleTask}
          onAddTask={onAddTask}
        />
      ) : (
        <div className="border-l border-surface-raised" />
      )}
    </div>
  );
}

function ThreadPane({
  lead,
  thread,
  onSend,
  onMerge,
  otherConvos,
}: {
  lead: Lead;
  thread: LeadMessage[];
  onSend: (leadId: string, channel: Channel, body: string) => void;
  onMerge: (targetId: string, sourceId: string) => void;
  otherConvos: { id: string; company: string; channel: Channel }[];
}) {
  // Channels present in this conversation (a merged contact has more than one).
  const channelsPresent = thread.reduce<Channel[]>((acc, m) => {
    if (!acc.includes(m.channel)) acc.push(m.channel);
    return acc;
  }, []);

  // Sub-tab: "all" or a specific channel. Lets you switch between e.g. the
  // Email conversation and the WhatsApp conversation for the same person.
  const [filter, setFilter] = useState<Channel | "all">("all");
  const activeFilter = filter !== "all" && !channelsPresent.includes(filter) ? "all" : filter;
  const shown = activeFilter === "all" ? thread : thread.filter((m) => m.channel === activeFilter);

  // Reply goes out on the channel you're viewing (auto, no guessing). When
  // viewing "All", it uses the channel of the most recent message.
  const lastChannel = thread[thread.length - 1]?.channel ?? "email";
  const replyChannel: Channel = activeFilter === "all" ? lastChannel : activeFilter;
  const canSend = !!ADAPTERS[replyChannel];
  const isManual = canSend && !ADAPTERS[replyChannel]?.twoWay;

  const [body, setBody] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);

  const submit = () => {
    if (!body.trim() || !canSend) return;
    onSend(lead.id, replyChannel, body.trim());
    setBody("");
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-surface-raised flex items-center gap-2 relative">
        <span className="text-sm font-semibold text-foreground">{lead.company}</span>
        <span className="text-[12px] text-subtle">{lead.name}</span>
        <div className="ml-auto relative">
          <button
            onClick={() => setMergeOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground border border-border hover:border-subtle rounded-md px-2 py-1 transition-colors"
          >
            <LinkIcon className="size-3.5" />
            Link conversation
          </button>
          {mergeOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-surface border border-border rounded-lg shadow-[var(--shadow-elevated)] z-10 p-1">
              <p className="text-[11px] text-subtle px-2 py-1.5">Merge another conversation into {lead.company}:</p>
              <div className="max-h-48 overflow-y-auto">
                {otherConvos.length === 0 && (
                  <p className="text-[12px] text-subtle px-2 py-2">No other conversations.</p>
                )}
                {otherConvos.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onMerge(lead.id, c.id);
                      setMergeOpen(false);
                    }}
                    className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md hover:bg-surface-raised transition-colors"
                  >
                    <ChannelTag channel={c.channel} />
                    <span className="text-[13px] text-foreground truncate">{c.company}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Channel sub-tabs (only when more than one channel is present) */}
      {channelsPresent.length > 1 && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-surface-raised">
          <SubTab label={`All (${thread.length})`} active={activeFilter === "all"} onClick={() => setFilter("all")} />
          {channelsPresent.map((c) => (
            <SubTab
              key={c}
              label={`${CHANNEL_META[c].label} (${thread.filter((m) => m.channel === c).length})`}
              active={activeFilter === c}
              color={CHANNEL_META[c].color}
              onClick={() => setFilter(c)}
            />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {shown.map((m) => (
          <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[78%]">
              <div className="flex items-center gap-1.5 mb-1">
                <ChannelTag channel={m.channel} />
                <span className="text-[11px] text-subtle">{timeShort(m.created_at)}</span>
              </div>
              <div
                className={`rounded-lg px-3 py-2 text-[14px] leading-relaxed ${
                  m.direction === "outbound"
                    ? "bg-foreground text-background"
                    : "bg-surface text-foreground border border-border"
                }`}
              >
                {m.subject && <p className="font-semibold mb-0.5">{m.subject}</p>}
                {m.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inline reply — channel is determined by the thread you're viewing */}
      <div className="border-t border-surface-raised p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-subtle">
            Replying via
            <ChannelTag channel={replyChannel} />
          </span>
          {isManual && <span className="text-[11px] text-warning">no API — logs as a manual message</span>}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder={isManual ? "Log what you sent…" : "Type a reply… (⌘↵ to send)"}
            className={textareaClass + " min-h-[44px] flex-1 text-[13px]"}
          />
          <button
            onClick={submit}
            disabled={!body.trim() || !canSend}
            className="shrink-0 size-9 rounded-lg bg-foreground text-background flex items-center justify-center hover:bg-white disabled:opacity-30 transition-colors"
          >
            <PaperAirplaneIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SubTab({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full transition-colors ${
        active ? "bg-foreground text-background font-medium" : "text-muted hover:bg-surface"
      }`}
    >
      {color && <span className="size-1.5 rounded-full" style={{ background: color }} />}
      {label}
    </button>
  );
}

function ContextPane({
  lead,
  tasks,
  onSetTemperature,
  onUpdateNotes,
  onToggleTask,
  onAddTask,
}: {
  lead: Lead;
  tasks: LeadTask[];
  onSetTemperature: (leadId: string, t: Temperature) => void;
  onUpdateNotes: (leadId: string, notes: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (leadId: string, title: string) => void;
}) {
  const [notes, setNotes] = useState(lead.notes);
  const [newTask, setNewTask] = useState("");
  const overdue = (t: LeadTask) => !t.completed_at && new Date(t.due_at) < new Date(`${MOCK_TODAY}T23:59:59Z`);

  return (
    <div className="border-l border-surface-raised overflow-y-auto p-3 space-y-4">
      {/* Temperature */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-1.5">Temperature</p>
        <div className="flex flex-wrap gap-1">
          {TEMPS.map((t) => (
            <button
              key={t}
              onClick={() => onSetTemperature(lead.id, t)}
              className={`inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-full border transition-colors ${
                lead.temperature === t ? "font-semibold" : "border-border text-muted hover:border-subtle"
              }`}
              style={
                lead.temperature === t
                  ? { borderColor: TEMP_COLOR[t], color: TEMP_COLOR[t], background: `${TEMP_COLOR[t]}1A` }
                  : undefined
              }
            >
              <span className="size-1.5 rounded-full" style={{ background: TEMP_COLOR[t] }} />
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-1.5">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => onUpdateNotes(lead.id, notes)}
          className={inputClass + " min-h-[72px] text-[13px]"}
          placeholder="Context, next steps…"
        />
      </div>

      {/* Tasks */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-1.5">Tasks</p>
        <div className="space-y-1.5">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => onToggleTask(t.id)}
              className="w-full flex items-start gap-2 text-left group"
            >
              {t.completed_at ? (
                <CheckCircleSolid className="size-4 text-success shrink-0 mt-0.5" />
              ) : (
                <CheckCircleIcon className="size-4 text-subtle group-hover:text-muted shrink-0 mt-0.5" />
              )}
              <span className="flex-1">
                <span
                  className={`text-[13px] ${t.completed_at ? "line-through text-subtle" : "text-foreground"}`}
                >
                  {t.title}
                </span>
                <span
                  className={`block text-[11px] ${overdue(t) ? "text-danger font-semibold" : "text-subtle"}`}
                >
                  {overdue(t) ? "overdue · " : ""}
                  {timeShort(t.due_at)}
                </span>
              </span>
            </button>
          ))}
          {tasks.length === 0 && <p className="text-[12px] text-subtle">No tasks</p>}
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTask.trim()) {
                onAddTask(lead.id, newTask.trim());
                setNewTask("");
              }
            }}
            placeholder="Add task…"
            className="flex-1 bg-surface border border-border rounded-md text-[12px] text-foreground px-2 py-1.5 focus:outline-none placeholder:text-subtle"
          />
          <button
            onClick={() => {
              if (newTask.trim()) {
                onAddTask(lead.id, newTask.trim());
                setNewTask("");
              }
            }}
            className="shrink-0 size-7 rounded-md bg-surface border border-border text-muted flex items-center justify-center hover:border-subtle"
          >
            <PlusIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
