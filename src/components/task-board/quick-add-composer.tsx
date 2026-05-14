"use client";

import { useRef, useState } from "react";
import { PaperClipIcon } from "@heroicons/react/24/outline";
import {
  TICKET_TYPE_OPTIONS,
  type Ticket,
  type TicketType,
} from "@/lib/tickets/types";
import { newTicketId } from "@/lib/tickets/data";
import {
  filterImages,
  imagesFromPaste,
  uploadBatch,
} from "@/lib/tickets/screenshots";
import { ScreenshotStrip } from "./screenshot-strip";

interface Props {
  raisedBy: string;
  clients: string[];
  onSubmit: (ticket: Ticket) => void;
  onCancel: () => void;
}

/* Inline composer (NOT a modal, modals kill flow). Cmd/Ctrl+Enter
 * submits. Whole capture flow should take <5 seconds.
 *
 * Screenshots: drop on the card, paste with Cmd+V, or click the paperclip
 * to file-pick. Uploads run in parallel and the URLs land on the ticket. */
export function QuickAddComposer({ raisedBy, clients, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TicketType>("client_request");
  const [client, setClient] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ingest = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading((n) => n + files.length);
    try {
      const urls = await uploadBatch(files);
      setScreenshots((prev) => [...prev, ...urls]);
    } finally {
      setUploading((n) => Math.max(0, n - files.length));
    }
  };

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
      screenshots: screenshots.length > 0 ? screenshots : undefined,
    };
    onSubmit(ticket);
    setTitle("");
    setClient("");
    setAssignedTo("");
    setScreenshots([]);
  };

  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm transition-colors ${
        dragOver ? "border-[#1A1A1A] bg-[#FAFAFA] ring-2 ring-[#1A1A1A]/10" : "border-[#1A1A1A]"
      }`}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        ingest(filterImages(e.dataTransfer.files));
      }}
      onPaste={(e) => {
        const files = imagesFromPaste(e);
        if (files.length > 0) {
          e.preventDefault();
          ingest(files);
        }
      }}
    >
      <input
        type="text"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="What needs triaging? (drop / paste a screenshot)"
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

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 border border-[#E5E5EA] rounded text-[#7A7A7A] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
          title="Attach screenshot"
        >
          <PaperClipIcon className="size-3" />
          Attach
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            ingest(filterImages(e.target.files));
            e.target.value = "";
          }}
        />
      </div>

      {(screenshots.length > 0 || uploading > 0) && (
        <div className="mt-2 flex items-center gap-2">
          <ScreenshotStrip
            urls={screenshots}
            onRemove={(url) =>
              setScreenshots((prev) => prev.filter((u) => u !== url))
            }
          />
          {uploading > 0 && (
            <span className="text-[10px] text-[#7A7A7A] italic">
              Uploading {uploading}…
            </span>
          )}
        </div>
      )}

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
            disabled={!title.trim() || uploading > 0}
            className="px-3 py-1 text-[10px] font-semibold rounded bg-[#1A1A1A] text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
