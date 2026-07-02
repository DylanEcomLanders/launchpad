"use client";

import { useRef, useState } from "react";
import {
  Bucket,
  Client,
  Project,
  ProjectStatus,
  ROLE_LABEL,
  PodMember,
} from "@/lib/pods-v2/types";
import { isMonday } from "@/lib/pods-v2/calc";
import { formatDayMonth } from "@/lib/dates";
import { PodAvatar } from "@/lib/pods-v2/avatars/PodAvatar";

/* Resize a user-picked image file to a square-friendly avatar and
 * return a JPEG data URL. Used as a fallback when the Supabase
 * company-avatars bucket isn't set up, keeps the upload affordance
 * working without infra plumbing. */
async function imageFileToDataUrl(
  file: File,
  maxEdgePx: number,
  quality: number,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
  // If we can't get a canvas (SSR, shouldn't happen here) or the image
  // is small enough, just return the raw data URL.
  if (typeof document === "undefined") return dataUrl;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to decode image"));
    i.src = dataUrl;
  });
  const longEdge = Math.max(img.width, img.height);
  if (longEdge <= maxEdgePx) return dataUrl;
  const scale = maxEdgePx / longEdge;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

const BUCKET_COLOR: Record<Bucket, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-blue-50 text-blue-700 border-blue-200",
  C: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  Bespoke: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  queued: "bg-surface-raised text-subtle border-border",
  in_progress: "bg-info/10 text-info border-info/20",
  in_review: "bg-warning/10 text-warning border-warning/20",
  shipped: "bg-success/10 text-success border-success/20",
  slipped: "bg-danger/10 text-danger border-danger/20",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  queued: "Queued",
  in_progress: "In progress",
  in_review: "In review",
  shipped: "Shipped",
  slipped: "Slipped",
};

export function BucketBadge({ bucket }: { bucket: Bucket }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${BUCKET_COLOR[bucket]}`}
    >
      {bucket}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function BrandWarmBadge({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center rounded-md border border-info/20 bg-info/10 px-1.5 py-0.5 text-[10px] font-medium text-info">
      Brand-warm
    </span>
  );
}

export function CapacityMeter({
  used,
  total,
  label,
  cycleRetainers,
  nextMonthUsed,
  thisWeekUsed,
  nextWeekUsed,
}: {
  used: number;
  total: number;
  label?: string;
  /** Conversion Engine retainers running on this pod. Surfaced as a
   * forward-looking note so the bar reads as "this month" while the
   * full 90-day pipeline is still visible. */
  cycleRetainers?: number;
  /** Projected utilisation for the *next* 4-week window, sum of
   * design-discipline points whose due_date is in weeks 5-8 from now.
   * When provided, renders a thin secondary bar + label so capacity
   * planning can see the cliff before it hits. */
  nextMonthUsed?: number;
  /** Per-week loads. Weekly cap = total / 4 (40pts/month → 10pts/week).
   *  When provided, a tiny two-cell strip below the monthly bar shows
   *  This week + Next week so the PM can plan around real cadence. */
  thisWeekUsed?: number;
  nextWeekUsed?: number;
}) {
  const weeklyCap = total > 0 ? total / 4 : 0;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const tone =
    pct >= 100
      ? "bg-danger"
      : pct >= 80
        ? "bg-warning"
        : "bg-success";
  const ring =
    pct >= 100
      ? "border-danger/20 bg-danger/10"
      : pct >= 80
        ? "border-warning/20 bg-warning/10"
        : "border-border bg-surface";
  return (
    <div className={`rounded-xl border p-3 ${ring}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
          {label ?? "Capacity"}
        </span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{used}</span>
          <span className="text-subtle"> / {total} pts</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full ${tone} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextMonthUsed != null && (
        <div className="mt-1.5">
          <div className="flex items-baseline justify-between text-[10px]">
            <span className="font-semibold uppercase tracking-wider text-subtle">
              Next month
            </span>
            <span className="tabular-nums text-subtle">
              <span
                className={
                  nextMonthUsed >= total
                    ? "font-semibold text-danger"
                    : nextMonthUsed >= total * 0.8
                      ? "font-semibold text-warning"
                      : "font-semibold text-foreground"
                }
              >
                {nextMonthUsed}
              </span>
              <span> / {total} pts</span>
            </span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-raised">
            <div
              className={`h-full transition-all ${
                nextMonthUsed >= total
                  ? "bg-danger"
                  : nextMonthUsed >= total * 0.8
                    ? "bg-warning"
                    : "bg-success"
              }`}
              style={{ width: `${Math.min(100, Math.round((nextMonthUsed / total) * 100))}%` }}
            />
          </div>
        </div>
      )}
      {(thisWeekUsed != null || nextWeekUsed != null) && weeklyCap > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <WeekCell label="This week" used={thisWeekUsed ?? 0} cap={weeklyCap} />
          <WeekCell label="Next week" used={nextWeekUsed ?? 0} cap={weeklyCap} />
        </div>
      )}
      {cycleRetainers != null && cycleRetainers > 0 && (
        <div className="mt-1.5 text-[10px] text-success">
          {cycleRetainers} CE retainer{cycleRetainers === 1 ? "" : "s"} running · 90-day cycle queued
        </div>
      )}
    </div>
  );
}

/** Compact per-week capacity cell rendered inside the CapacityMeter
 *  monthly card. Mirrors the same tone scale (emerald/amber/rose) so
 *  this-week / next-week reads at the same glance as the headline bar. */
function WeekCell({
  label,
  used,
  cap,
}: {
  label: string;
  used: number;
  cap: number;
}) {
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const tone =
    used >= cap
      ? "bg-danger"
      : used >= cap * 0.8
        ? "bg-warning"
        : "bg-success";
  const valueTone =
    used >= cap
      ? "text-danger"
      : used >= cap * 0.8
        ? "text-warning"
        : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-surface px-2 py-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
          {label}
        </span>
        <span className="text-[11px] tabular-nums">
          <span className={`font-semibold ${valueTone}`}>{used}</span>
          <span className="text-subtle"> / {cap} pts</span>
        </span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-raised">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MemberAvatar({
  member,
  size = "default",
  onChangeAvatar,
}: {
  member: PodMember;
  size?: "default" | "sm" | "lg";
  /** When provided, hovering the avatar shows a "Change" overlay and
   * clicking opens a file picker. The new image is uploaded via
   * /api/company/upload (company-avatars bucket) and the URL is handed
   * back so the caller can persist it. */
  onChangeAvatar?: (newUrl: string) => void;
}) {
  const px = size === "sm" ? 40 : size === "lg" ? 72 : 56;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!onChangeAvatar) return;
    setUploading(true);
    try {
      // 1. Try Supabase upload (preferred, durable, shareable URL).
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "company-avatars");
      const res = await fetch("/api/company/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) {
        onChangeAvatar(json.url);
        return;
      }
      // 2. Fall back: downscale to a data URL so avatars work even when
      // the Supabase bucket isn't set up. Resize to max 256px on the
      // long edge to keep storage sane (~30-50KB per avatar).
      const dataUrl = await imageFileToDataUrl(file, 256, 0.85);
      onChangeAvatar(dataUrl);
    } catch {
      // Last-resort fallback (e.g. server error), same as above.
      try {
        const dataUrl = await imageFileToDataUrl(file, 256, 0.85);
        onChangeAvatar(dataUrl);
      } catch {
        alert("Couldn't upload, please try a different image (JPG/PNG/WebP under 5MB).");
      }
    } finally {
      setUploading(false);
    }
  }

  if (!onChangeAvatar) {
    return (
      <PodAvatar
        name={member.name}
        isPlaceholder={member.is_placeholder}
        avatarUrl={member.avatar_url}
        size={px}
      />
    );
  }

  return (
    <div
      className="group/avatar relative shrink-0 cursor-pointer"
      onClick={() => inputRef.current?.click()}
      title="Click to change photo"
    >
      <PodAvatar
        name={member.name}
        isPlaceholder={member.is_placeholder}
        avatarUrl={member.avatar_url}
        size={px}
      />
      <div
        style={{ width: px, height: (px * 100) / 120 }}
        className={`absolute inset-0 grid place-items-center rounded-md bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover/avatar:opacity-100 ${uploading ? "opacity-100" : ""}`}
      >
        {uploading ? "…" : "Change"}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function MemberRow({
  member,
  onChangeAvatar,
  isOoo,
  oooLabel,
}: {
  member: PodMember;
  onChangeAvatar?: (newUrl: string) => void;
  /** Whether the member is out-of-office today. Avatar dims and a small
   * "OOO" pill appears under the role line. */
  isOoo?: boolean;
  /** Optional human-friendly OOO range, e.g. "until 14 May". */
  oooLabel?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${isOoo ? "opacity-60" : ""}`}>
      <MemberAvatar member={member} onChangeAvatar={onChangeAvatar} />
      <div className="min-w-0 leading-tight">
        <div
          className={`truncate text-sm font-medium ${
            member.is_placeholder ? "italic text-subtle" : ""
          }`}
        >
          {member.is_placeholder ? "TO HIRE" : member.name}
        </div>
        <div className="truncate text-[11px] text-subtle">
          {ROLE_LABEL[member.role]}
          {isOoo && (
            <span className="ml-1 rounded border border-warning/20 bg-warning/10 px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-warning">
              OOO{oooLabel ? ` ${oooLabel}` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectCard({
  project,
  client,
  compact = false,
}: {
  project: Project;
  client?: Client;
  compact?: boolean;
}) {
  const midWeekKickoff = !isMonday(project.kickoff_date) && !project.is_rush;
  return (
    <div
      className={`rounded-lg border border-border bg-surface p-3 shadow-[var(--shadow-soft)] transition-all hover:border-muted ${
        compact ? "" : "min-h-[110px]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight">
            {project.name}
          </div>
          {client && (
            <div className="mt-0.5 truncate text-[11px] text-subtle">
              {client.name}
            </div>
          )}
        </div>
        <BucketBadge bucket={project.bucket} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={project.status} />
        {client && <BrandWarmBadge active={client.brand_warm} />}
        {project.is_rush && (
          <span className="inline-flex items-center rounded-md border border-danger/20 bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
            Rush
          </span>
        )}
        {midWeekKickoff && (
          <span className="inline-flex items-center rounded-md border border-danger/20 bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
            Mid-week kickoff
          </span>
        )}
      </div>

      {!compact && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-subtle">
          <span>Kickoff {formatDayMonth(project.kickoff_date)}</span>
          <span className="font-medium text-foreground">
            Ships {formatDayMonth(project.delivery_date)}
          </span>
        </div>
      )}
    </div>
  );
}

export function PodHeading({
  name,
  tagline,
}: {
  name: string;
  tagline: string;
}) {
  return (
    <div>
      <h1 className="text-3xl font-medium text-foreground">
        {name}
      </h1>
      <p className="mt-0.5 text-sm text-subtle">{tagline}</p>
    </div>
  );
}
