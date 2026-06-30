"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  MEMBER_BY_ID,
  PHASE_OPTIONS,
  PHASE_LABEL,
  PHASE_ORDER,
  type Member,
  type Phase,
  type PhaseSpan,
  type TaskState,
} from "./mock-data";

const PHASE_META = new Map(PHASE_OPTIONS.map((p) => [p.value, p]));

/** Restrained neutral ramp keyed by phase order, so a journey reads as a calm
 *  left-to-right progression instead of a rainbow. The only signal colour on
 *  the timeline is blue = client-side time. */
export function phaseRamp(phase: Phase): { bg: string; accent: string } {
  const idx = Math.max(0, PHASE_ORDER.indexOf(phase));
  const t = PHASE_ORDER.length > 1 ? idx / (PHASE_ORDER.length - 1) : 0;
  const bgL = 95 - t * 26; // 95% → 69%
  return { bg: `hsl(222 13% ${bgL}%)`, accent: `hsl(222 16% ${bgL - 22}%)` };
}

export const CLIENT_HATCH =
  "repeating-linear-gradient(45deg, rgba(37,99,235,0.55) 0, rgba(37,99,235,0.55) 2px, transparent 2px, transparent 5px)";

// ---------------------------------------------------------------------------
// Avatar — deterministic initials chip (no image plumbing in the preview)
// ---------------------------------------------------------------------------

const AVATAR_TONES = [
  "bg-white text-background",
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
  "bg-rose-100 text-rose-800",
];

function toneFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({
  name,
  id,
  size = 24,
  placeholder = false,
  title,
}: {
  name: string;
  id: string;
  size?: number;
  placeholder?: boolean;
  title?: string;
}) {
  const initials = placeholder
    ? "?"
    : name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
  return (
    <span
      title={title ?? name}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-white ${
        placeholder ? "border border-dashed border-muted bg-surface-raised text-subtle" : toneFor(id)
      }`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}

export function MemberChip({ id }: { id: string }) {
  const m = MEMBER_BY_ID[id];
  if (!m) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar name={m.name} id={m.id} size={20} placeholder={m.isPlaceholder} />
      <span className="text-[12px] text-subtle">{m.isPlaceholder ? "TO HIRE" : m.name}</span>
    </span>
  );
}

export function AvatarStack({ members }: { members: Member[] }) {
  return (
    <div className="flex -space-x-1.5">
      {members.map((m) => (
        <Avatar key={m.id} name={m.name} id={m.id} size={26} placeholder={m.isPlaceholder} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Annotation strip — "what changed & why", dismissible
// ---------------------------------------------------------------------------

export function AnnotationStrip({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-subtle shadow-[var(--shadow-soft)] hover:text-foreground"
      >
        <InformationCircleIcon className="size-4" /> Show notes
      </button>
    );
  return (
    <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-2.5">
        <InformationCircleIcon className="mt-0.5 size-5 shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              {title}
            </span>
            <button onClick={() => setOpen(false)} className="text-blue-400 hover:text-blue-700">
              <XMarkIcon className="size-4" />
            </button>
          </div>
          <div className="mt-1.5 space-y-1 text-[13px] leading-relaxed text-subtle">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

export function SectionHeader({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">{children}</h3>
      {right}
    </div>
  );
}

// ---------------------------------------------------------------------------
// State badge — the five honest delay-attribution states
// ---------------------------------------------------------------------------

export const STATE_META: Record<
  TaskState,
  { label: string; cls: string; dot: string }
> = {
  on_track: { label: "On track", cls: "bg-surface-raised text-subtle border-border", dot: "bg-muted" },
  due_soon: { label: "Due soon", cls: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  overdue_internal: { label: "Overdue", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  waiting_client: { label: "Waiting on client", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  blocked: { label: "Blocked", cls: "bg-orange-50 text-orange-800 border-orange-200", dot: "bg-orange-500" },
  done: { label: "Done", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

export function StateBadge({ state }: { state: TaskState }) {
  const m = STATE_META[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${m.cls}`}
    >
      <span className={`size-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function PhaseChip({ phase }: { phase: string }) {
  const meta = PHASE_META.get(phase as never);
  if (!meta) return null;
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Capacity bar — compact monthly meter (mirrors live CapacityMeter tone scale)
// ---------------------------------------------------------------------------

export function CapacityBar({
  used,
  total,
  label = "Capacity · this month",
}: {
  used: number;
  total: number;
  label?: string;
}) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const tone = pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{used}</span>
          <span className="text-subtle"> / {total} pts</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase timeline — per-task horizontal bar. Segment width ∝ days in phase.
// Client-side days render as a hatched overlay. Revisits stay as separate
// segments (per-visit spans), so revision loops are visible.
// ---------------------------------------------------------------------------

export function PhaseTimeline({
  spans,
  height = 26,
  showLegend = false,
}: {
  spans: PhaseSpan[];
  height?: number;
  showLegend?: boolean;
}) {
  const total = spans.reduce((s, sp) => s + sp.days, 0) || 1;
  return (
    <div>
      <div
        className="flex w-full overflow-hidden rounded-md border border-border"
        style={{ height }}
      >
        {spans.map((sp, i) => {
          const ramp = phaseRamp(sp.phase);
          const widthPct = (sp.days / total) * 100;
          const clientPct = sp.days > 0 ? (sp.clientDays / sp.days) * 100 : 0;
          return (
            <div
              key={i}
              className="relative h-full border-r border-white/70 last:border-r-0"
              style={{ width: `${widthPct}%`, backgroundColor: ramp.bg }}
              title={`${PHASE_LABEL[sp.phase]} · ${sp.days}d${
                sp.clientDays ? ` (${sp.clientDays}d client-side)` : ""
              }`}
            >
              {clientPct > 0 && (
                <span
                  className="absolute bottom-0 right-0 top-0"
                  style={{ width: `${clientPct}%`, backgroundImage: CLIENT_HATCH }}
                />
              )}
              {widthPct > 7 && (
                <span
                  className="absolute inset-0 grid place-items-center text-[9px] font-semibold tabular-nums"
                  style={{ color: ramp.accent }}
                >
                  {sp.days}d
                </span>
              )}
            </div>
          );
        })}
      </div>
      {showLegend && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-subtle">
          <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundImage: CLIENT_HATCH }} />
          Hatched = time waiting on the client (not counted against the pod)
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible disclosure (progressive disclosure for done / reference)
// ---------------------------------------------------------------------------

export function Disclosure({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[12px] font-medium text-subtle hover:text-foreground"
      >
        <ChevronDownIcon className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        {label}
        {count != null && <span className="text-subtle">({count})</span>}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] ${className}`}>
      {children}
    </div>
  );
}
