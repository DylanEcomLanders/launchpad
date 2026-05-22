"use client";

/* ── R&D Tracker — idea detail ──
 * /rd/ideas/[id]. Minimal: title + why (editable), type dropdown,
 * status pill with dropdown, submitter + date (read-only), and a big
 * "Promote to Initiative" CTA that opens a modal pre-filled from this
 * idea, then redirects to the new initiative on confirm.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import {
  ideaStore,
  initiativeStore,
  getCurrentUserName,
  setCurrentUserName,
  uid,
  nowISO,
  timeAgo,
} from "@/lib/rd/data";
import type {
  Idea,
  IdeaStatus,
  Initiative,
  RdType,
} from "@/lib/rd/types";
import { IDEA_STATUSES, RD_TYPE_META } from "@/lib/rd/types";
import {
  TypeBadge,
  IdeaStatusPill,
  PromoteIdeaModal,
} from "../../components";
import { textareaClass } from "@/lib/form-styles";

export default function IdeaDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    ideaStore.getById(id).then((i) => {
      if (!alive) return;
      if (!i) setNotFound(true);
      else setIdea(i);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  async function patch(updates: Partial<Idea>) {
    if (!idea) return;
    const next = { ...idea, ...updates, updated_at: nowISO() };
    setIdea(next);
    await ideaStore.update(idea.id, { ...updates, updated_at: next.updated_at });
  }

  async function handlePromote(payload: {
    name: string;
    type: RdType;
    owner: string;
    north_star: string;
  }) {
    if (!idea) return;
    setCurrentUserName(payload.owner);
    const now = nowISO();
    const initiative: Initiative = {
      id: uid(),
      name: payload.name,
      type: payload.type,
      owner: payload.owner,
      north_star: payload.north_star,
      status: "active",
      promoted_from_idea_id: idea.id,
      created_at: now,
      updated_at: now,
    };
    await initiativeStore.create(initiative);
    await ideaStore.update(idea.id, {
      status: "promoted",
      updated_at: now,
    });
    router.push(`/rd/${initiative.id}`);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-16">
        <div className="text-[13px] text-[#7A7A7A]">Loading idea...</div>
      </div>
    );
  }
  if (notFound || !idea) {
    return (
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-16">
        <Link
          href="/rd"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors mb-6"
        >
          <ArrowLeftIcon className="size-4" />
          Back to R&amp;D
        </Link>
        <div className="text-[15px] text-[#1B1B1B]">Idea not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 pb-24">
      <Link
        href="/rd"
        className="inline-flex items-center gap-1.5 text-[13px] text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors mb-6"
      >
        <ArrowLeftIcon className="size-4" />
        Back to R&amp;D
      </Link>

      {/* Title */}
      <InlineTextSingle
        value={idea.title}
        onChange={(v) => patch({ title: v })}
        placeholder="Untitled idea"
        className="text-2xl font-semibold text-[#1B1B1B] tracking-tight"
      />

      {/* Status + type + meta */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <IdeaStatusDropdown
          value={idea.status}
          onChange={(s) => patch({ status: s })}
        />
        <IdeaTypeDropdown
          value={idea.type || null}
          onChange={(t) => patch({ type: t })}
        />
        <span className="text-[12px] text-[#A0A0A0]">·</span>
        <span className="text-[12px] text-[#7A7A7A]">
          {idea.submitted_by} · {timeAgo(idea.created_at)}
        </span>
      </div>

      {/* Why */}
      <div className="mt-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
          Why this matters
        </div>
        <WhyEditor value={idea.why || ""} onChange={(v) => patch({ why: v })} />
      </div>

      {/* Promote CTA */}
      {idea.status === "inbox" && (
        <div className="mt-10">
          <button
            onClick={() => setPromoteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B1B1B] text-white text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
          >
            <RocketLaunchIcon className="size-4" />
            Promote to Initiative
          </button>
        </div>
      )}
      {idea.status === "promoted" && (
        <div className="mt-10 text-[12px] text-[#7A7A7A]">
          This idea has been promoted to an initiative.
        </div>
      )}

      <PromoteIdeaModal
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onConfirm={handlePromote}
        initialName={idea.title}
        initialNorthStar={idea.why || ""}
        initialType={idea.type || undefined}
        defaultOwner={getCurrentUserName()}
      />
    </div>
  );
}

/* ─── Why editor (autosave on blur) ───────────────────────────── */

function WhyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <textarea
      className={`${textareaClass} text-[14px] leading-relaxed`}
      rows={4}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onChange(draft);
      }}
      placeholder="Context, problem, opportunity..."
    />
  );
}

/* ─── Inline single-line text (title) ─────────────────────────── */

function InlineTextSingle({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 0);
  }, [editing]);
  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`block w-full text-left rounded transition-colors hover:bg-[#F7F8FA] -mx-1 px-1 ${className || ""}`}
      >
        {value || (
          <span className="text-[#C5C5C5]">{placeholder || "Click to edit"}</span>
        )}
      </button>
    );
  }
  return (
    <input
      ref={inputRef}
      className={`block w-full bg-white border border-[#E5E5EA] rounded px-1 -mx-1 focus:outline-none focus:border-[#1B1B1B] ${className || ""}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
    />
  );
}

/* ─── Idea status dropdown ────────────────────────────────────── */

function IdeaStatusDropdown({
  value,
  onChange,
}: {
  value: IdeaStatus;
  onChange: (s: IdeaStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hover:opacity-80 transition-opacity"
      >
        <IdeaStatusPill status={value} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#E5E5EA] rounded-lg shadow-lg z-10 min-w-[140px] py-1">
          {IDEA_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#F7F8FA] transition-colors ${
                s === value ? "text-[#1B1B1B] font-medium" : "text-[#555]"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Idea type dropdown (nullable) ───────────────────────────── */

function IdeaTypeDropdown({
  value,
  onChange,
}: {
  value: RdType | null;
  onChange: (t: RdType | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const types = Object.keys(RD_TYPE_META) as RdType[];
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hover:opacity-80 transition-opacity"
      >
        {value ? (
          <TypeBadge type={value} />
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded bg-[#F0F0F0] text-[#7A7A7A]">
            Unsure
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#E5E5EA] rounded-lg shadow-lg z-10 min-w-[140px] py-1">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#F7F8FA] transition-colors ${
              !value ? "text-[#1B1B1B] font-medium" : "text-[#555]"
            }`}
          >
            Unsure
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#F7F8FA] transition-colors ${
                t === value ? "text-[#1B1B1B] font-medium" : "text-[#555]"
              }`}
            >
              {RD_TYPE_META[t].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
