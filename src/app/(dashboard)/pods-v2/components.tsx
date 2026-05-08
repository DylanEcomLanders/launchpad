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

const BUCKET_COLOR: Record<Bucket, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-blue-50 text-blue-700 border-blue-200",
  C: "bg-amber-50 text-amber-800 border-amber-200",
  Bespoke: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  queued: "bg-[#F3F3F5] text-[#7A7A7A] border-[#E5E5EA]",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  in_review: "bg-amber-50 text-amber-800 border-amber-200",
  shipped: "bg-emerald-50 text-emerald-700 border-emerald-200",
  slipped: "bg-rose-50 text-rose-700 border-rose-200",
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
    <span className="inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
      Brand-warm
    </span>
  );
}

export function CapacityMeter({
  used,
  total,
  label,
}: {
  used: number;
  total: number;
  label?: string;
}) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const tone =
    pct >= 100
      ? "bg-rose-500"
      : pct >= 80
        ? "bg-amber-500"
        : "bg-emerald-500";
  const ring =
    pct >= 100
      ? "border-rose-200 bg-rose-50"
      : pct >= 80
        ? "border-amber-200 bg-amber-50"
        : "border-[#E5E5EA] bg-white";
  return (
    <div className={`rounded-xl border p-3 ${ring}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
          {label ?? "Capacity"}
        </span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{used}</span>
          <span className="text-[#7A7A7A]"> / {total} pts</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EDEDEF]">
        <div
          className={`h-full ${tone} transition-all`}
          style={{ width: `${pct}%` }}
        />
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
  const px = size === "sm" ? 36 : size === "lg" ? 64 : 48;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "company-avatars");
      const res = await fetch("/api/company/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url && onChangeAvatar) onChangeAvatar(json.url);
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
}: {
  member: PodMember;
  onChangeAvatar?: (newUrl: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <MemberAvatar member={member} onChangeAvatar={onChangeAvatar} />
      <div className="min-w-0 leading-tight">
        <div
          className={`truncate text-sm font-medium ${
            member.is_placeholder ? "italic text-[#A0A0A0]" : ""
          }`}
        >
          {member.is_placeholder ? "TO HIRE" : member.name}
        </div>
        <div className="truncate text-[11px] text-[#7A7A7A]">
          {ROLE_LABEL[member.role]}
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
      className={`rounded-lg border border-[#E5E5EA] bg-white p-3 shadow-[var(--shadow-soft)] transition-all hover:border-[#C5C5C5] ${
        compact ? "" : "min-h-[110px]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight">
            {project.name}
          </div>
          {client && (
            <div className="mt-0.5 truncate text-[11px] text-[#7A7A7A]">
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
          <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
            Rush
          </span>
        )}
        {midWeekKickoff && (
          <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-800">
            Mid-week kickoff
          </span>
        )}
      </div>

      {!compact && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#7A7A7A]">
          <span>Kickoff {formatDayMonth(project.kickoff_date)}</span>
          <span className="font-medium text-[#1B1B1B]">
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
      <h1 className="text-3xl font-medium tracking-tight text-[#1B1B1B]">
        {name}
      </h1>
      <p className="mt-0.5 text-sm text-[#7A7A7A]">{tagline}</p>
    </div>
  );
}
