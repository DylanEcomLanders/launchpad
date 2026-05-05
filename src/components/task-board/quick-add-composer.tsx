"use client";

import { useState } from "react";
import {
  TICKET_TYPE_OPTIONS,
  type Ticket,
  type TicketType,
} from "@/lib/tickets/types";
import { newTicketId } from "@/lib/tickets/data";

interface Props {
  raisedBy: string;
  clients: string[];
  onSubmit: (ticket: Ticket) => void;
  onCancel: () => void;
}

/* Inline composer (NOT a modal — modals kill flow). Cmd/Ctrl+Enter
 * submits. Whole capture flow should take <5 seconds. */
export function QuickAddComposer({ raisedBy, clients, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TicketType>("client_request");
  const [client, setClient] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    const ticket: Ticket = {
      id: newTicketId(),
      title: title.trim(),
      type,
      client_id: client || undefined,
      assigned_to: assignedTo || undefined,
      raised_by: raisedBy,
      raised_at: new Date().toISOString(),
      status: "open",
      shifted_count: 0,
    };
    onSubmit(ticket);
    setTitle("");
    setClient("");
    setAssignedTo("");
  };

  return (
    <div className="rounded-lg border border-[#1A1A1A] bg-white p-3 shadow-sm">
      <input
        type="text"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="What needs triaging?"
        className="w-full text-[13px] font-medium px-0 py-1 border-0 focus:outline-none placeholder:text-[#BBB]"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TicketType)}
          className="text-[10px] font-medium px-2 py-1 border border-[#E5E5EA] rounded bg-white focus:outline-none"
        >
          {TICKET_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          list="ticket-clients"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Client (optional)"
          className="text-[10px] px-2 py-1 border border-[#E5E5EA] rounded focus:outline-none w-[110px]"
        />
        <datalist id="ticket-clients">
          {clients.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <input
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="Assign to (optional)"
          className="text-[10px] px-2 py-1 border border-[#E5E5EA] rounded focus:outline-none w-[110px]"
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-[#AAA] uppercase tracking-wider">
          ⌘ + Enter to submit · Esc to cancel
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1 text-[10px] font-semibold text-[#7A7A7A] hover:text-[#1A1A1A]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            className="px-3 py-1 text-[10px] font-semibold rounded bg-[#1A1A1A] text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
