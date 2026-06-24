"use client";

// Unified inbox: conversation list (left) + thread with inline reply (middle)
// + lead context panel with temperature / notes / tasks (right). One screen.
// Channel is chosen per-reply; LinkedIn replies are "logged" (manual), every
// other channel "sends" via its adapter (mock). All mutations bubble up to
// client.tsx.

import { useEffect, useState } from "react";
import {
  PaperAirplaneIcon,
  PlusIcon,
  CheckCircleIcon,
  LinkIcon,
  ArrowPathIcon,
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

/* Unlinked chat - same shape the /api/sales/chats endpoint returns
 * in the `unmatched` array. Inbox stores these client-side after
 * the fetch, renders them in their own section, and lets the user
 * promote them to leads. */
interface UnlinkedChat {
  id: string;
  attendee_handle: string;
  attendee_name?: string;
  last_message_preview?: string;
  last_message_at?: string;
  last_message_direction?: "inbound" | "outbound";
}

type ChatChannel = "whatsapp" | "linkedin" | "email";

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
  onRefresh,
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
  onRefresh: () => Promise<void>;
}) {
  /* Unlinked chats panel - WhatsApp by default since that's the
   * channel most likely to be wired live first. Changes when the
   * user picks a different channel in the dropdown above the list.
   * Re-fetches when the channel changes or after a promote so the
   * promoted chat moves out of the unlinked section automatically. */
  const [chatChannel, setChatChannel] = useState<ChatChannel>("whatsapp");
  const [unlinked, setUnlinked] = useState<UnlinkedChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [selectedUnlinkedId, setSelectedUnlinkedId] = useState<string | null>(null);
  const [promoting, setPromoting] = useState(false);
  /* Live preview of the selected unlinked chat - fetched on click
   * from /api/sales/chat-preview. Includes the contact's actual
   * name from the attendees endpoint. */
  const [preview, setPreview] = useState<{
    chatId: string;
    attendee_name?: string;
    attendee_handle: string;
    messages: Array<{
      body: string;
      direction?: "inbound" | "outbound";
      sent_at?: string;
      external_id?: string;
      attachments?: Array<{
        id: string;
        type: string;
        mimetype?: string;
      }>;
    }>;
    loading: boolean;
    error?: string;
  } | null>(null);

  /* Search query - filters BOTH matched conversations + unlinked
   * chats by name and by message body preview. Case-insensitive. */
  const [chatSearch, setChatSearch] = useState("");

  async function loadPreview(chat: UnlinkedChat) {
    setPreview({
      chatId: chat.id,
      attendee_handle: chat.attendee_handle,
      messages: [],
      loading: true,
    });
    try {
      const res = await fetch(
        `/api/sales/chat-preview?channel=${chatChannel}&chatId=${encodeURIComponent(chat.id)}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        attendee_name?: string;
        attendee_handle?: string;
        messages?: Array<{
          body: string;
          direction?: "inbound" | "outbound";
          sent_at?: string;
          external_id?: string;
        }>;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setPreview({
          chatId: chat.id,
          attendee_handle: chat.attendee_handle,
          messages: [],
          loading: false,
          error: json.error ?? `HTTP ${res.status}`,
        });
      } else {
        setPreview({
          chatId: chat.id,
          attendee_name: json.attendee_name ?? chat.attendee_name,
          attendee_handle: json.attendee_handle ?? chat.attendee_handle,
          messages: json.messages ?? [],
          loading: false,
        });
      }
    } catch (err) {
      setPreview({
        chatId: chat.id,
        attendee_handle: chat.attendee_handle,
        messages: [],
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function fetchUnlinked() {
    setChatsLoading(true);
    setChatsError(null);
    try {
      const res = await fetch(`/api/sales/chats?channel=${chatChannel}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        unmatched?: UnlinkedChat[];
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setChatsError(json.error ?? `HTTP ${res.status}`);
        setUnlinked([]);
      } else {
        setUnlinked(json.unmatched ?? []);
      }
    } catch (err) {
      setChatsError(err instanceof Error ? err.message : String(err));
      setUnlinked([]);
    } finally {
      setChatsLoading(false);
    }
  }

  useEffect(() => {
    fetchUnlinked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatChannel]);

  async function promoteChat(chat: UnlinkedChat) {
    if (promoting) return;
    setPromoting(true);
    try {
      const res = await fetch("/api/sales/promote-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: chatChannel,
          attendee_handle: chat.attendee_handle,
          attendee_name: chat.attendee_name,
          source: `${chatChannel} inbound`,
          owner: "Ajay",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        leadId?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setChatsError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      /* Refresh leads (so the new conversation shows in matched
       * section) AND re-fetch unlinked (so the promoted chat drops
       * out of it). Then select the new lead. */
      await onRefresh();
      await fetchUnlinked();
      setSelectedUnlinkedId(null);
      if (json.leadId) onSelectLead(json.leadId);
    } catch (err) {
      setChatsError(err instanceof Error ? err.message : String(err));
    } finally {
      setPromoting(false);
    }
  }
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

  /* Case-insensitive search across matched lead names + last
   * message bodies AND unlinked chat names. Empty query passes
   * everything through unchanged. */
  const search = chatSearch.trim().toLowerCase();
  const filteredConvos = search
    ? convos.filter((c) => {
        if (c.lead.company.toLowerCase().includes(search)) return true;
        if (c.lead.name.toLowerCase().includes(search)) return true;
        if (c.last?.body.toLowerCase().includes(search)) return true;
        return false;
      })
    : convos;
  const filteredUnlinked = search
    ? unlinked.filter((u) => {
        const name = (u.attendee_name ?? "").toLowerCase();
        const handle = (u.attendee_handle ?? "").toLowerCase();
        const preview = (u.last_message_preview ?? "").toLowerCase();
        return (
          name.includes(search) ||
          handle.includes(search) ||
          preview.includes(search)
        );
      })
    : unlinked;

  return (
    <div className="grid grid-cols-[300px_1fr_300px] h-[calc(100vh-220px)] min-h-[560px] rounded-xl border border-[#222222] overflow-hidden bg-[#141414]">
      {/* Conversation list */}
      <div className="border-r border-[#222222] overflow-y-auto flex flex-col">
        {/* Search bar - filters matched + unlinked together. */}
        <div className="sticky top-0 z-10 bg-[#141414] border-b border-[#1C1C1C] p-2">
          <input
            type="search"
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            placeholder="Search chats and messages…"
            className="w-full px-3 py-1.5 text-[12px] bg-[#181818] border border-[#2A2A2A] rounded-md text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:border-[#383838]"
          />
        </div>
        {filteredConvos.map(({ lead, last, unread }) => (
          <button
            key={lead.id}
            onClick={() => onSelectLead(lead.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-[#1C1C1C] transition-colors ${
              selected?.lead.id === lead.id ? "bg-[#1C1C1C]" : "hover:bg-[#181818]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-sm truncate ${unread ? "font-semibold text-[#E5E5EA]" : "font-medium text-[#9CA3AF]"}`}
              >
                {lead.company}
              </span>
              {unread > 0 && (
                <span className="ml-auto shrink-0 size-4 rounded-full bg-[#E5E5EA] text-[#0C0C0C] text-[11px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {last && <ChannelTag channel={last.channel} />}
              <span className="text-[11px] text-[#71757D] ml-auto">{last && timeShort(last.created_at)}</span>
            </div>
            {last && (
              <p className="text-[12px] text-[#71757D] mt-1 line-clamp-1">
                {last.direction === "outbound" ? "You: " : ""}
                {last.body}
              </p>
            )}
          </button>
        ))}

        {/* Unlinked chats section. Pulled from Unipile - chats that
          * don't tie to an existing Lead yet. User clicks to promote
          * (creates the lead + backfills history). */}
        <div className="border-t border-[#222222] mt-2">
          <div className="px-3 py-2.5 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[#71757D] font-semibold">
              Unlinked
            </span>
            <select
              value={chatChannel}
              onChange={(e) => {
                setChatChannel(e.target.value as ChatChannel);
                setSelectedUnlinkedId(null);
              }}
              className="ml-auto text-[10px] bg-[#181818] border border-[#2A2A2A] text-[#9CA3AF] rounded px-1.5 py-0.5"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="linkedin">LinkedIn</option>
              <option value="email">Email</option>
            </select>
            <button
              onClick={() => fetchUnlinked()}
              disabled={chatsLoading}
              className="text-[10px] text-[#71757D] hover:text-[#E5E5EA] disabled:opacity-40"
              title="Refresh"
            >
              {chatsLoading ? "…" : "↻"}
            </button>
          </div>
          {chatsError && (
            <p className="px-3 pb-2 text-[11px] text-rose-300">{chatsError}</p>
          )}
          {!chatsLoading && unlinked.length === 0 && !chatsError && (
            <p className="px-3 pb-3 text-[11px] text-[#71757D]">
              No unlinked {chatChannel} chats.
            </p>
          )}
          {filteredUnlinked.map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                setSelectedUnlinkedId(chat.id);
                onSelectLead("");
                loadPreview(chat);
              }}
              className={`w-full text-left px-3 py-2.5 border-b border-[#1C1C1C] transition-colors ${
                selectedUnlinkedId === chat.id
                  ? "bg-[#1C1C1C]"
                  : "hover:bg-[#181818]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#9CA3AF] truncate">
                  {chat.attendee_name || chat.attendee_handle}
                </span>
                <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wider text-amber-400/80 bg-amber-500/10 px-1 py-0.5 rounded">
                  New
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] uppercase tracking-wider text-[#71757D]">
                  {chatChannel}
                </span>
                {chat.last_message_at && (
                  <span className="text-[11px] text-[#71757D] ml-auto">
                    {timeShort(chat.last_message_at)}
                  </span>
                )}
              </div>
              {chat.last_message_preview && (
                <p className="text-[12px] text-[#71757D] mt-1 line-clamp-1">
                  {chat.last_message_direction === "outbound" ? "You: " : ""}
                  {chat.last_message_preview}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Thread + reply OR unlinked preview */}
      {selectedUnlinkedId ? (
        (() => {
          const chat = unlinked.find((c) => c.id === selectedUnlinkedId);
          if (!chat) return null;
          const displayName =
            preview?.attendee_name ||
            chat.attendee_name ||
            chat.attendee_handle;
          return (
            <div className="flex flex-col h-full min-h-0">
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-[#222222] flex items-center gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#E5E5EA] truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-[#71757D] truncate">
                    {chat.attendee_handle} · unlinked {chatChannel}
                  </div>
                </div>
                <button
                  onClick={() => promoteChat(chat)}
                  disabled={promoting}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0C0C0C] text-[12px] font-semibold rounded-full hover:bg-[#E5E5EA] transition-colors disabled:opacity-50 shrink-0"
                >
                  {promoting ? "Promoting…" : "Promote to lead"}
                </button>
              </div>

              {/* Live thread */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {preview?.loading && (
                  <p className="text-center text-[12px] text-[#71757D] py-8">
                    Loading conversation…
                  </p>
                )}
                {preview?.error && (
                  <p className="text-center text-[12px] text-rose-300 py-8">
                    {preview.error}
                  </p>
                )}
                {preview &&
                  !preview.loading &&
                  !preview.error &&
                  preview.messages.length === 0 && (
                    <p className="text-center text-[12px] text-[#71757D] py-8">
                      No messages in this conversation yet.
                    </p>
                  )}
                {preview?.messages.map((m, idx) => (
                  <div
                    key={m.external_id ?? idx}
                    className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[78%]">
                      {m.sent_at && (
                        <div className="text-[10px] text-[#71757D] mb-1 px-1">
                          {timeShort(m.sent_at)}
                        </div>
                      )}
                      {/* Image attachments render as <img> via the
                        * proxy route. WhatsApp media URLs require
                        * auth so we can't src them directly. */}
                      {m.attachments
                        ?.filter(
                          (a) =>
                            a.type === "img" ||
                            (a.mimetype ?? "").startsWith("image/"),
                        )
                        .map((a) => (
                          <a
                            key={a.id}
                            href={`/api/sales/attachment?channel=${chatChannel}&messageId=${m.external_id}&attachmentId=${a.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block mb-1"
                          >
                            <img
                              src={`/api/sales/attachment?channel=${chatChannel}&messageId=${m.external_id}&attachmentId=${a.id}`}
                              alt="attachment"
                              className="rounded-lg max-w-full max-h-64 object-cover border border-[#2A2A2A]"
                            />
                          </a>
                        ))}
                      {/* Hide body when it's our [Image] placeholder
                        * AND we already rendered the actual image. */}
                      {!(
                        m.body.startsWith("[") &&
                        m.body.endsWith("]") &&
                        (m.attachments?.length ?? 0) > 0
                      ) && (
                        <div
                          className={`rounded-lg px-3 py-2 text-[14px] leading-relaxed ${
                            m.direction === "outbound"
                              ? "bg-[#E5E5EA] text-[#0C0C0C]"
                              : "bg-[#1C1C1C] text-[#E5E5EA] border border-[#2A2A2A]"
                          }`}
                        >
                          {m.body}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      ) : selected ? (
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
        <div className="flex items-center justify-center text-sm text-[#71757D]">No conversations</div>
      )}

      {/* Lead context */}
      {selected && !selectedUnlinkedId ? (
        <ContextPane
          lead={selected.lead}
          tasks={tasks.filter((t) => t.lead_id === selected.lead.id)}
          onSetTemperature={onSetTemperature}
          onUpdateNotes={onUpdateNotes}
          onToggleTask={onToggleTask}
          onAddTask={onAddTask}
        />
      ) : (
        <div className="border-l border-[#222222]" />
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

  /* Backfill flow: pulls historical messages from Unipile for the
   * lead's recipient on the currently-active channel. Disabled when
   * viewing "All" or a channel Unipile can't handle (Twitter is
   * outbound-only stub, LinkedIn/email/WhatsApp work). */
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const canSync =
    activeFilter !== "all" &&
    (activeFilter === "whatsapp" ||
      activeFilter === "linkedin" ||
      activeFilter === "email");

  async function pullHistory() {
    if (!canSync || syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sales/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, channel: activeFilter }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        imported?: number;
        alreadyHad?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setSyncResult(`Failed: ${json.error ?? res.statusText}`);
      } else {
        setSyncResult(
          json.imported && json.imported > 0
            ? `Imported ${json.imported} message${json.imported === 1 ? "" : "s"}`
            : "Already up to date",
        );
      }
    } catch (err) {
      setSyncResult(
        `Failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncResult(null), 4000);
    }
  }

  const submit = () => {
    if (!body.trim() || !canSend) return;
    onSend(lead.id, replyChannel, body.trim());
    setBody("");
  };

  return (
    /* h-full + min-h-0 propagates the grid cell's bounded height
     * down so the messages list (flex-1 overflow-y-auto inside)
     * actually has something to scroll within. Without h-full the
     * column expands to fit content and overflow never triggers. */
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#222222] flex items-center gap-2 relative">
        <span className="text-sm font-semibold text-[#E5E5EA]">{lead.company}</span>
        <span className="text-[12px] text-[#71757D]">{lead.name}</span>
        <div className="ml-auto flex items-center gap-2 relative">
          {/* Sync history - pulls historical messages from Unipile
            * for the channel currently being viewed. Disabled in
            * "All" view (we need a specific channel to know what
            * to backfill) and on channels Unipile doesn't bridge. */}
          <button
            onClick={pullHistory}
            disabled={!canSync || syncing}
            title={
              !canSync
                ? "Switch to a single channel (WhatsApp / LinkedIn / Email) to sync its history"
                : syncResult ?? "Pull conversation history from this channel"
            }
            className="inline-flex items-center gap-1 text-[12px] text-[#9CA3AF] hover:text-[#E5E5EA] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-md px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#9CA3AF] disabled:hover:border-[#2A2A2A]"
          >
            <ArrowPathIcon
              className={`size-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing" : syncResult ? syncResult : "Sync history"}
          </button>
          <button
            onClick={() => setMergeOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[12px] text-[#9CA3AF] hover:text-[#E5E5EA] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-md px-2 py-1 transition-colors"
          >
            <LinkIcon className="size-3.5" />
            Link conversation
          </button>
          {mergeOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg shadow-[var(--shadow-elevated)] z-10 p-1">
              <p className="text-[11px] text-[#71757D] px-2 py-1.5">Merge another conversation into {lead.company}:</p>
              <div className="max-h-48 overflow-y-auto">
                {otherConvos.length === 0 && (
                  <p className="text-[12px] text-[#71757D] px-2 py-2">No other conversations.</p>
                )}
                {otherConvos.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onMerge(lead.id, c.id);
                      setMergeOpen(false);
                    }}
                    className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md hover:bg-[#222222] transition-colors"
                  >
                    <ChannelTag channel={c.channel} />
                    <span className="text-[13px] text-[#E5E5EA] truncate">{c.company}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Channel sub-tabs (only when more than one channel is present) */}
      {channelsPresent.length > 1 && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[#222222]">
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
                <span className="text-[11px] text-[#71757D]">{timeShort(m.created_at)}</span>
              </div>
              <div
                className={`rounded-lg px-3 py-2 text-[14px] leading-relaxed ${
                  m.direction === "outbound"
                    ? "bg-[#E5E5EA] text-[#0C0C0C]"
                    : "bg-[#1C1C1C] text-[#E5E5EA] border border-[#2A2A2A]"
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
      <div className="border-t border-[#222222] p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#71757D]">
            Replying via
            <ChannelTag channel={replyChannel} />
          </span>
          {isManual && <span className="text-[11px] text-[#F5A623]">no API — logs as a manual message</span>}
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
            className="shrink-0 size-9 rounded-lg bg-[#E5E5EA] text-[#0C0C0C] flex items-center justify-center hover:bg-white disabled:opacity-30 transition-colors"
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
        active ? "bg-[#E5E5EA] text-[#0C0C0C] font-medium" : "text-[#9CA3AF] hover:bg-[#1C1C1C]"
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
    <div className="border-l border-[#222222] overflow-y-auto p-3 space-y-4">
      {/* Temperature */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] mb-1.5">Temperature</p>
        <div className="flex flex-wrap gap-1">
          {TEMPS.map((t) => (
            <button
              key={t}
              onClick={() => onSetTemperature(lead.id, t)}
              className={`inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-full border transition-colors ${
                lead.temperature === t ? "font-semibold" : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#3A3A3A]"
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] mb-1.5">Notes</p>
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] mb-1.5">Tasks</p>
        <div className="space-y-1.5">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => onToggleTask(t.id)}
              className="w-full flex items-start gap-2 text-left group"
            >
              {t.completed_at ? (
                <CheckCircleSolid className="size-4 text-[#25D366] shrink-0 mt-0.5" />
              ) : (
                <CheckCircleIcon className="size-4 text-[#71757D] group-hover:text-[#9CA3AF] shrink-0 mt-0.5" />
              )}
              <span className="flex-1">
                <span
                  className={`text-[13px] ${t.completed_at ? "line-through text-[#71757D]" : "text-[#E5E5EA]"}`}
                >
                  {t.title}
                </span>
                <span
                  className={`block text-[11px] ${overdue(t) ? "text-[#F97066] font-semibold" : "text-[#71757D]"}`}
                >
                  {overdue(t) ? "overdue · " : ""}
                  {timeShort(t.due_at)}
                </span>
              </span>
            </button>
          ))}
          {tasks.length === 0 && <p className="text-[12px] text-[#71757D]">No tasks</p>}
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
            className="flex-1 bg-[#1C1C1C] border border-[#2A2A2A] rounded-md text-[12px] text-[#E5E5EA] px-2 py-1.5 focus:outline-none placeholder:text-[#71757D]"
          />
          <button
            onClick={() => {
              if (newTask.trim()) {
                onAddTask(lead.id, newTask.trim());
                setNewTask("");
              }
            }}
            className="shrink-0 size-7 rounded-md bg-[#1C1C1C] border border-[#2A2A2A] text-[#9CA3AF] flex items-center justify-center hover:border-[#3A3A3A]"
          >
            <PlusIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
