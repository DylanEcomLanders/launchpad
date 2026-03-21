"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  getTickets, updateTicketStatus, saveTicket, getChannelMappings, saveChannelMapping, deleteChannelMapping,
  TICKET_STATUSES, ticketAge,
  type Ticket, type TicketStatus, type TicketPriority, type TicketType, type ChannelMapping,
} from "@/lib/slack-tickets";
import { loadSettings, type TeamMember } from "@/lib/settings";
import { inputClass, labelClass } from "@/lib/form-styles";

const TICKET_TYPES: { key: TicketType; label: string; color: string }[] = [
  { key: "unassigned", label: "Unassigned", color: "#CCC" },
  { key: "design", label: "Design", color: "#8B5CF6" },
  { key: "dev", label: "Dev", color: "#3B82F6" },
  { key: "cro", label: "CRO", color: "#10B981" },
  { key: "other", label: "Other", color: "#777" },
];

const priorityColors: Record<TicketPriority, string> = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#F97316",
  urgent: "#EF4444",
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [mappings, setMappings] = useState<ChannelMapping[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");
  const [filterClient, setFilterClient] = useState("all");
  const [showMappings, setShowMappings] = useState(false);
  const [newChannelId, setNewChannelId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, m, s] = await Promise.all([getTickets(), getChannelMappings(), loadSettings()]);
    setTickets(t);
    setMappings(m);
    setTeam(s.team || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clients = [...new Set(tickets.map((t) => t.client_name))].sort();

  const filtered = tickets
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => filterClient === "all" || t.client_name === filterClient)
    .sort((a, b) => {
      // Open first, then by priority, then by age
      const statusOrder = { open: 0, in_progress: 1, quoted: 2, resolved: 3 };
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
      return b.created_at.localeCompare(a.created_at);
    });

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;

  const handleAddMapping = async () => {
    if (!newChannelId.trim() || !newClientName.trim()) return;
    await saveChannelMapping({ channel_id: newChannelId.trim(), client_name: newClientName.trim() });
    setNewChannelId("");
    setNewClientName("");
    load();
  };

  const handleUpdateNotes = async (ticket: Ticket, notes: string) => {
    await saveTicket({ ...ticket, notes, updated_at: new Date().toISOString() });
    setSelectedTicket(null);
    load();
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-sm text-[#7A7A7A] mt-0.5">
            {openCount > 0 ? `${openCount} open` : "No open tickets"}
            {inProgressCount > 0 ? ` · ${inProgressCount} in progress` : ""}
            {` · ${tickets.length} total`}
          </p>
        </div>
        <button
          onClick={() => setShowMappings(!showMappings)}
          className="text-[11px] font-medium text-[#777] border border-[#E5E5EA] px-3 py-1.5 rounded-lg hover:bg-[#F5F5F5]"
        >
          {showMappings ? "Hide Mappings" : "Channel Mappings"}
        </button>
      </div>

      {/* Channel Mappings */}
      {showMappings && (
        <div className="border border-[#E5E5EA] rounded-xl bg-white p-5 mb-6">
          <h3 className="text-xs font-semibold text-[#1A1A1A] mb-1">Channel → Client Mappings</h3>
          <p className="text-[10px] text-[#AAA] mb-4">Map Slack channel IDs to client names. Tickets logged from a channel auto-assign to the client.</p>

          {mappings.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {mappings.map((m) => (
                <div key={m.channel_id} className="flex items-center justify-between py-1.5 px-3 bg-[#FAFAFA] rounded-lg">
                  <div className="flex items-center gap-3">
                    <code className="text-[10px] text-[#999] font-mono">{m.channel_id}</code>
                    <span className="text-xs font-medium text-[#1A1A1A]">{m.client_name}</span>
                  </div>
                  <button
                    onClick={async () => { await deleteChannelMapping(m.channel_id); load(); }}
                    className="text-[10px] text-[#CCC] hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className={labelClass}>Channel ID</label>
              <input type="text" value={newChannelId} onChange={(e) => setNewChannelId(e.target.value)} className={inputClass} placeholder="C0123456789" />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Client Name</label>
              <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className={inputClass} placeholder="e.g. Contempee" />
            </div>
            <button
              onClick={handleAddMapping}
              disabled={!newChannelId.trim() || !newClientName.trim()}
              className="px-3 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg disabled:opacity-30"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1">
          {[{ key: "all" as const, label: "All" }, ...TICKET_STATUSES].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full transition-colors ${
                filterStatus === s.key ? "bg-[#1B1B1B] text-white" : "text-[#AAA] hover:text-[#1A1A1A]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {clients.length > 1 && (
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="text-[10px] text-[#777] border border-[#E5E5EA] rounded px-2 py-1"
          >
            <option value="all">All clients</option>
            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Tickets list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="border border-[#E5E5EA] rounded-xl overflow-hidden">
          {filtered.map((ticket) => {
            const si = TICKET_STATUSES.find((s) => s.key === ticket.status) || TICKET_STATUSES[0];
            const age = ticketAge(ticket.created_at);
            const isOld = ticket.status === "open" && Date.now() - new Date(ticket.created_at).getTime() > 48 * 3600000;

            return (
              <div
                key={ticket.id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-[#EDEDEF] last:border-0 hover:bg-[#FAFAFA] cursor-pointer ${isOld ? "bg-red-50/30" : ""}`}
                onClick={() => setSelectedTicket(ticket)}
              >
                {/* Priority dot */}
                <div className="size-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: priorityColors[ticket.priority] }} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-[#1A1A1A]">{ticket.title}</p>
                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: si.color + "15", color: si.color }}>
                      {si.label}
                    </span>
                    {ticket.ticket_type && ticket.ticket_type !== "unassigned" && (() => {
                      const tt = TICKET_TYPES.find((t) => t.key === ticket.ticket_type);
                      return tt ? (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tt.color + "15", color: tt.color }}>
                          {tt.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-[10px] text-[#999] mt-0.5 line-clamp-1">{ticket.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] font-medium text-[#777]">{ticket.client_name}</span>
                    <span className="text-[9px] text-[#BBB]">{ticket.submitted_by}</span>
                    <span className={`text-[9px] ${isOld ? "text-red-500 font-semibold" : "text-[#CCC]"}`}>{age}</span>
                    {ticket.attachment_url && (
                      <a href={ticket.attachment_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[9px] text-blue-500 hover:underline">
                        Attachment
                      </a>
                    )}
                  </div>
                </div>

                {/* Status cycle */}
                <select
                  value={ticket.status}
                  onChange={async (e) => {
                    e.stopPropagation();
                    await updateTicketStatus(ticket.id, e.target.value as TicketStatus);
                    load();
                  }}
                  className="text-[10px] text-[#777] border border-[#E5E5EA] rounded px-1.5 py-1 shrink-0 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {TICKET_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <p className="text-sm text-[#AAA]">No tickets</p>
          <p className="text-xs text-[#CCC] mt-1">Tickets logged via /ticket in Slack will appear here</p>
        </div>
      )}

      {/* Ticket detail modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          team={team}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={async (status) => {
            await updateTicketStatus(selectedTicket.id, status);
            setSelectedTicket(null);
            load();
          }}
          onSaveNotes={(notes) => handleUpdateNotes(selectedTicket, notes)}
          onSaveTicket={async (updated) => {
            const prev = selectedTicket;
            await saveTicket({ ...updated, updated_at: new Date().toISOString() });

            // If ticket_type just changed from unassigned → design/dev, create ClickUp task
            const wasUnassigned = !prev?.ticket_type || prev.ticket_type === "unassigned";
            const nowAssigned = updated.ticket_type && updated.ticket_type !== "unassigned";
            if (wasUnassigned && nowAssigned && !updated.clickup_task_id) {
              try {
                const res = await fetch("/api/tickets/create-clickup", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ticketId: updated.id, ticket: updated }),
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.taskId) {
                    await saveTicket({ ...updated, clickup_task_id: data.taskId, updated_at: new Date().toISOString() });
                  }
                }
              } catch { /* non-critical */ }
            }

            setSelectedTicket(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function TicketDetailModal({ ticket, team, onClose, onStatusChange, onSaveNotes, onSaveTicket }: {
  ticket: Ticket;
  team: TeamMember[];
  onClose: () => void;
  onStatusChange: (status: TicketStatus) => void;
  onSaveNotes: (notes: string) => void;
  onSaveTicket: (ticket: Ticket) => void;
}) {
  const [notes, setNotes] = useState(ticket.notes);
  const si = TICKET_STATUSES.find((s) => s.key === ticket.status) || TICKET_STATUSES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: priorityColors[ticket.priority] }} />
            <h3 className="text-sm font-semibold">{ticket.title}</h3>
          </div>
          <button onClick={onClose} className="text-[#AAA] hover:text-[#1A1A1A]"><XMarkIcon className="size-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-4 text-[10px] text-[#999]">
            <span className="font-medium text-[#777]">{ticket.client_name}</span>
            <span>by {ticket.submitted_by}</span>
            <span>{ticketAge(ticket.created_at)} ago</span>
            <span className="font-semibold uppercase" style={{ color: si.color }}>{si.label}</span>
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Description</p>
            <p className="text-xs text-[#555] leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Attachment */}
          {ticket.attachment_url && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Attachment</p>
              <a href={ticket.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline break-all">
                {ticket.attachment_url}
              </a>
            </div>
          )}

          {/* Status */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Status</p>
            <div className="flex gap-1.5">
              {TICKET_STATUSES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => onStatusChange(s.key)}
                  className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors ${
                    ticket.status === s.key
                      ? "text-white border-transparent"
                      : "text-[#777] border-[#E5E5EA] hover:border-[#999]"
                  }`}
                  style={ticket.status === s.key ? { backgroundColor: s.color } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Type</p>
            <div className="flex gap-1.5">
              {TICKET_TYPES.filter((t) => t.key !== "unassigned").map((t) => (
                <button
                  key={t.key}
                  onClick={() => onSaveTicket({ ...ticket, ticket_type: t.key })}
                  className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors ${
                    ticket.ticket_type === t.key
                      ? "text-white border-transparent"
                      : "text-[#777] border-[#E5E5EA] hover:border-[#999]"
                  }`}
                  style={ticket.ticket_type === t.key ? { backgroundColor: t.color } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Assignee</p>
            <select
              value={ticket.assignee_id || ""}
              onChange={(e) => onSaveTicket({ ...ticket, assignee_id: e.target.value || undefined })}
              className="text-xs text-[#777] border border-[#E5E5EA] rounded-lg px-2.5 py-1.5 w-full"
            >
              <option value="">Unassigned</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
              ))}
            </select>
          </div>

          {/* Internal notes */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Internal Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass + " min-h-[60px]"}
              placeholder="Internal notes — not visible to client"
            />
            {notes !== ticket.notes && (
              <button
                onClick={() => onSaveNotes(notes)}
                className="mt-2 px-3 py-1.5 bg-[#1B1B1B] text-white text-[10px] font-medium rounded-lg"
              >
                Save Notes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
