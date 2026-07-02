"use client";

/* ── R&D Tracker — shared components ──
 * Type badge, progress bar, modals. Kept small + dumb so the dashboard
 * and detail pages can compose them without prop-drilling state.
 */

import { useEffect, useRef, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { inputClass, labelClass, selectClass, textareaClass } from "@/lib/form-styles";
import {
  RD_TYPE_META,
  type RdType,
  type InitiativeStatus,
  type IdeaStatus,
} from "@/lib/rd/types";

/* ── Type badge ─────────────────────────────────────────────────── */

export function TypeBadge({ type, size = "md" }: { type: RdType; size?: "sm" | "md" }) {
  const meta = RD_TYPE_META[type];
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-0.5";
  const text = size === "sm" ? "text-[10px]" : "text-[11px]";
  return (
    <span
      className={`inline-flex items-center ${padding} ${text} font-semibold uppercase tracking-wider rounded`}
      style={{ background: meta.bg, color: meta.fg }}
    >
      {meta.label}
    </span>
  );
}

/* ── Progress bar ───────────────────────────────────────────────── */

export function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
      <div
        className="h-full bg-surface transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ── Status pill ────────────────────────────────────────────────── */

const INITIATIVE_STATUS_STYLE: Record<InitiativeStatus, { cls: string; label: string }> = {
  active:  { cls: "bg-success/10 text-success", label: "Active" },
  parked:  { cls: "bg-surface-raised text-subtle", label: "Parked" },
  shipped: { cls: "bg-info/10 text-info", label: "Shipped" },
  killed:  { cls: "bg-danger/10 text-danger", label: "Killed" },
};
const IDEA_STATUS_STYLE: Record<IdeaStatus, { cls: string; label: string }> = {
  inbox:    { cls: "bg-warning/10 text-warning", label: "Inbox" },
  promoted: { cls: "bg-info/10 text-info", label: "Promoted" },
  parked:   { cls: "bg-surface-raised text-subtle", label: "Parked" },
  killed:   { cls: "bg-danger/10 text-danger", label: "Killed" },
};

export function InitiativeStatusPill({ status }: { status: InitiativeStatus }) {
  const s = INITIATIVE_STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
export function IdeaStatusPill({ status }: { status: IdeaStatus }) {
  const s = IDEA_STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

/* ── Modal shell ────────────────────────────────────────────────── */
/* Matches the shape used by case-studies + portfolio-v2: portal,
 * darkened backdrop, rounded white card, header with close button. */

export function ModalShell({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className={`bg-surface rounded-2xl w-full ${maxWidth} shadow-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="text-subtle hover:text-foreground text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}

/* ── New initiative modal ───────────────────────────────────────── */

export function NewInitiativeModal({
  open,
  onClose,
  onCreate,
  defaultOwner,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    type: RdType;
    owner: string;
    north_star: string;
  }) => Promise<void> | void;
  defaultOwner: string;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<RdType>("ops");
  const [owner, setOwner] = useState(defaultOwner);
  const [northStar, setNorthStar] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setName("");
      setType("ops");
      setOwner(defaultOwner);
      setNorthStar("");
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultOwner]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await onCreate({
      name: name.trim(),
      type,
      owner: owner.trim() || "Unassigned",
      north_star: northStar.trim(),
    });
  };
  return (
    <ModalShell open={open} onClose={onClose} title="New initiative">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            ref={inputRef}
            required
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Design system v2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select
              className={selectClass}
              value={type}
              onChange={(e) => setType(e.target.value as RdType)}
            >
              <option value="design">Design</option>
              <option value="dev">Dev</option>
              <option value="ops">Ops</option>
              <option value="offer">Offer</option>
              <option value="tooling">Tooling</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Owner</label>
            <input
              className={inputClass}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="First name"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>North star</label>
          <textarea
            className={textareaClass}
            rows={2}
            value={northStar}
            onChange={(e) => setNorthStar(e.target.value)}
            placeholder="What does done look like?"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-subtle hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="px-4 py-2 bg-foreground text-surface text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-40"
          >
            {busy ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ── Add idea modal ─────────────────────────────────────────────── */

export function AddIdeaModal({
  open,
  onClose,
  onCreate,
  defaultSubmitter,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    why: string;
    type: RdType | null;
    submitted_by: string;
  }) => Promise<void> | void;
  defaultSubmitter: string;
}) {
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [type, setType] = useState<RdType | "">("");
  const [submitter, setSubmitter] = useState(defaultSubmitter);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setTitle("");
      setWhy("");
      setType("");
      setSubmitter(defaultSubmitter);
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultSubmitter]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    await onCreate({
      title: title.trim(),
      why: why.trim(),
      type: type ? (type as RdType) : null,
      submitted_by: submitter.trim() || "Anonymous",
    });
  };
  return (
    <ModalShell open={open} onClose={onClose} title="Add idea">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input
            ref={inputRef}
            required
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="One-line summary"
          />
        </div>
        <div>
          <label className={labelClass}>Why this matters</label>
          <textarea
            className={textareaClass}
            rows={3}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="Context, problem, opportunity"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type (optional)</label>
            <select
              className={selectClass}
              value={type}
              onChange={(e) => setType(e.target.value as RdType | "")}
            >
              <option value="">Unsure</option>
              <option value="design">Design</option>
              <option value="dev">Dev</option>
              <option value="ops">Ops</option>
              <option value="offer">Offer</option>
              <option value="tooling">Tooling</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Your name</label>
            <input
              className={inputClass}
              value={submitter}
              onChange={(e) => setSubmitter(e.target.value)}
              placeholder="First name"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-subtle hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="px-4 py-2 bg-foreground text-surface text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-40"
          >
            {busy ? "Adding..." : "Add idea"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ── Promote-idea modal ─────────────────────────────────────────── */

export function PromoteIdeaModal({
  open,
  onClose,
  onConfirm,
  initialName,
  initialNorthStar,
  initialType,
  defaultOwner,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    name: string;
    type: RdType;
    owner: string;
    north_star: string;
  }) => Promise<void> | void;
  initialName: string;
  initialNorthStar: string;
  initialType: RdType | null | undefined;
  defaultOwner: string;
}) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<RdType>(initialType || "ops");
  const [owner, setOwner] = useState(defaultOwner);
  const [northStar, setNorthStar] = useState(initialNorthStar);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName(initialName);
      setType(initialType || "ops");
      setOwner(defaultOwner);
      setNorthStar(initialNorthStar);
      setBusy(false);
    }
  }, [open, initialName, initialNorthStar, initialType, defaultOwner]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await onConfirm({
      name: name.trim(),
      type,
      owner: owner.trim() || "Unassigned",
      north_star: northStar.trim(),
    });
  };
  return (
    <ModalShell open={open} onClose={onClose} title="Promote to initiative">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Initiative name</label>
          <input
            required
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select
              className={selectClass}
              value={type}
              onChange={(e) => setType(e.target.value as RdType)}
            >
              <option value="design">Design</option>
              <option value="dev">Dev</option>
              <option value="ops">Ops</option>
              <option value="offer">Offer</option>
              <option value="tooling">Tooling</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Owner</label>
            <input
              className={inputClass}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="First name"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>North star</label>
          <textarea
            className={textareaClass}
            rows={2}
            value={northStar}
            onChange={(e) => setNorthStar(e.target.value)}
            placeholder="What does done look like?"
          />
        </div>
        <p className="text-[11px] text-subtle leading-relaxed">
          The original idea will be marked as promoted and stay linked from the
          new initiative's meta.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-subtle hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="px-4 py-2 bg-foreground text-surface text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-40"
          >
            {busy ? "Promoting..." : "Promote"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
