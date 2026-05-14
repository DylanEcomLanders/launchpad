"use client";

import { useRef, useState } from "react";
import {
  PlayIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpRightIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
import {
  AGE_COLORS,
  TICKET_TYPE_COLORS,
  TICKET_TYPE_LABELS,
  ageLabel,
  ageLevel,
  type Ticket,
} from "@/lib/tickets/types";
import {
  filterImages,
  imagesFromPaste,
  uploadBatch,
} from "@/lib/tickets/screenshots";
import { ScreenshotStrip } from "./screenshot-strip";

interface Props {
  ticket: Ticket;
  onStart: () => void;
  onDone: () => void;
  onKill: (reason: string) => void;
  /** Optional, if omitted, the Promote button is hidden (used on
   * team-facing surfaces where only leadership promotes). */
  onPromote?: () => void;
  /** Patch the ticket with new fields (e.g. add screenshots).
   * Optional, when omitted, the card is read-only for screenshots. */
  onUpdate?: (patch: Partial<Ticket>) => void;
}

/* Ticket card with age-based visual escalation. The left border colour
 * + badge update on every render based on now - raised_at, so the team
 * feels old tickets without reading dates.
 *
 * Screenshots: drop on the card or Cmd+V paste while it's focused. The
 * paperclip in the action row opens the file picker. */
export function TicketCard({
  ticket,
  onStart,
  onDone,
  onKill,
  onPromote,
  onUpdate,
}: Props) {
  const [killing, setKilling] = useState(false);
  const [killReason, setKillReason] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const level = ageLevel(ticket.raised_at);
  const colours = AGE_COLORS[level];
  const inProgress = ticket.status === "in_progress";
  const shifted = ticket.shifted_count || 0;
  const screenshots = ticket.screenshots || [];

  const ingest = async (files: File[]) => {
    if (!onUpdate || files.length === 0) return;
    setUploading((n) => n + files.length);
    try {
      const urls = await uploadBatch(files);
      if (urls.length > 0) {
        onUpdate({ screenshots: [...screenshots, ...urls] });
      }
    } finally {
      setUploading((n) => Math.max(0, n - files.length));
    }
  };

  const removeScreenshot = (url: string) => {
    if (!onUpdate) return;
    onUpdate({ screenshots: screenshots.filter((u) => u !== url) });
  };

  const submitKill = () => {
    if (!killReason.trim()) return;
    onKill(killReason.trim());
    setKilling(false);
    setKillReason("");
  };

  return (
    <div
      tabIndex={0}
      className={`group rounded-lg border bg-white px-3 py-2.5 transition-shadow hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 ${
        level === "critical" ? "animate-pulse-soft" : ""
      } ${dragOver ? "ring-2 ring-[#1A1A1A]/20" : ""}`}
      style={{
        borderColor: colours.border,
        borderLeftWidth: 3,
      }}
      onDragOver={(e) => {
        if (!onUpdate) return;
        if (Array.from(e.dataTransfer.types).includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!onUpdate) return;
        e.preventDefault();
        setDragOver(false);
        ingest(filterImages(e.dataTransfer.files));
      }}
      onPaste={(e) => {
        if (!onUpdate) return;
        const files = imagesFromPaste(e);
        if (files.length > 0) {
          e.preventDefault();
          ingest(files);
        }
      }}
    >
      {/* Header row, type, age, in-progress chip */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: TICKET_TYPE_COLORS[ticket.type] }}
        >
          {TICKET_TYPE_LABELS[ticket.type]}
        </span>
        {inProgress && (
          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
            In progress
          </span>
        )}
        {shifted >= 3 && (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700"
            title="Shifted 3+ times, kill or promote"
          >
            ⚠ shifted {shifted}×
          </span>
        )}
        <span
          className="ml-auto text-[10px] font-semibold tabular-nums"
          style={{ color: colours.badge }}
        >
          {ageLabel(ticket.raised_at)}
        </span>
      </div>

      {/* Title */}
      <p className="text-[13px] leading-snug text-[#1A1A1A] mb-1">
        {ticket.title}
      </p>

      {/* Meta */}
      {(ticket.client_id || ticket.assigned_to) && (
        <p className="text-[11px] text-[#7A7A7A] leading-snug">
          {ticket.client_id && <span>{ticket.client_id}</span>}
          {ticket.client_id && ticket.assigned_to && <span> · </span>}
          {ticket.assigned_to && <span>→ {ticket.assigned_to}</span>}
        </p>
      )}

      {/* Notes */}
      {ticket.notes && (
        <p className="mt-1 text-[11px] italic leading-snug text-[#888]">
          {ticket.notes}
        </p>
      )}

      {/* Screenshots */}
      {(screenshots.length > 0 || uploading > 0) && (
        <div className="mt-2 flex items-center gap-2">
          <ScreenshotStrip
            urls={screenshots}
            onRemove={onUpdate ? removeScreenshot : undefined}
            compact
          />
          {uploading > 0 && (
            <span className="text-[10px] text-[#7A7A7A] italic">
              Uploading…
            </span>
          )}
        </div>
      )}

      {/* Actions, appear on hover */}
      {!killing && (
        <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!inProgress && (
            <button
              type="button"
              onClick={onStart}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded border border-[#E5E5EA] text-[#1A1A1A] hover:bg-[#F3F3F5]"
              title="Start (assigns to you)"
            >
              <PlayIcon className="size-3" />
              Start
            </button>
          )}
          <button
            type="button"
            onClick={onDone}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded border border-[#E5E5EA] text-[#059669] hover:bg-[#F0FDF4]"
            title="Mark done"
          >
            <CheckIcon className="size-3" />
            Done
          </button>
          <button
            type="button"
            onClick={() => setKilling(true)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded border border-[#E5E5EA] text-[#DC2626] hover:bg-[#FEF2F2]"
            title="Kill with reason"
          >
            <XMarkIcon className="size-3" />
            Kill
          </button>
          {onUpdate && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded border border-[#E5E5EA] text-[#7A7A7A] hover:text-[#1A1A1A]"
              title="Attach screenshot (drop or paste also works)"
            >
              <PaperClipIcon className="size-3" />
            </button>
          )}
          {onPromote && (
            <button
              type="button"
              onClick={onPromote}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded border border-[#E5E5EA] text-[#1A1A1A] hover:bg-[#F3F3F5] ml-auto"
              title="Promote to a full task"
            >
              <ArrowUpRightIcon className="size-3" />
              Promote
            </button>
          )}
        </div>
      )}

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

      {killing && (
        <div className="mt-2 flex items-center gap-1">
          <input
            type="text"
            autoFocus
            value={killReason}
            onChange={(e) => setKillReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitKill();
              if (e.key === "Escape") {
                setKilling(false);
                setKillReason("");
              }
            }}
            placeholder="Why kill?"
            className="flex-1 text-[11px] px-2 py-1 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#999]"
          />
          <button
            type="button"
            onClick={submitKill}
            disabled={!killReason.trim()}
            className="px-2 py-1 text-[10px] font-semibold rounded bg-[#DC2626] text-white disabled:opacity-40"
          >
            Kill
          </button>
          <button
            type="button"
            onClick={() => {
              setKilling(false);
              setKillReason("");
            }}
            className="px-2 py-1 text-[10px] font-semibold rounded text-[#7A7A7A] hover:text-[#1A1A1A]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
