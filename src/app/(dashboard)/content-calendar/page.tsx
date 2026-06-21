"use client";

/* ── Content Calendar — landing page ──
 * Hosts the three views from the spec (Calendar / Pipeline / Balance).
 * Pipeline is the first functional view; Calendar and Balance are
 * placeholders for phases 5 and 7. The Post Detail Drawer is wired
 * up here regardless of which view is active so + New Post works
 * from anywhere.
 */

import { useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  Squares2X2Icon,
  CalendarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  blankPost,
  groupByStatus,
  pillars as pillarsApi,
  posts as postsApi,
} from "@/lib/content-calendar/data";
import {
  PIPELINE_COLUMNS,
  PLATFORM_LABELS,
  STATUS_META,
  type ContentPillar,
  type ContentPost,
  type Platform,
  type PostStatus,
} from "@/lib/content-calendar/types";
import { PostDetailDrawer } from "@/components/content-calendar/post-detail-drawer";

type View = "calendar" | "pipeline" | "balance";

const VIEWS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "calendar", label: "Calendar", icon: <CalendarIcon className="size-4" /> },
  { id: "pipeline", label: "Pipeline", icon: <Squares2X2Icon className="size-4" /> },
  { id: "balance", label: "Balance", icon: <ChartBarIcon className="size-4" /> },
];

export default function ContentCalendarPage() {
  const [view, setView] = useState<View>("pipeline");
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [activePost, setActivePost] = useState<ContentPost | null>(null);
  const [pillarFilter, setPillarFilter] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const [p, ps] = await Promise.all([pillarsApi.list(), postsApi.list()]);
    setPillars(p);
    setPosts(ps);
    setLoading(false);
  }

  async function handleSave(post: ContentPost) {
    /* If the post isn't in our list yet, persist as create.
     * Otherwise update. The drawer doesn't know about this distinction. */
    const exists = posts.some((p) => p.id === post.id);
    if (exists) {
      await postsApi.update(post.id, post);
    } else {
      await postsApi.create(post);
    }
    /* Optimistic local update so the UI doesn't blink while we
     * wait on the next refresh. */
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id);
      if (idx === -1) return [post, ...prev];
      const next = prev.slice();
      next[idx] = post;
      return next;
    });
  }

  async function handleDelete(id: string) {
    await postsApi.remove(id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  function openNew() {
    setActivePost(blankPost());
  }

  const filtered = useMemo(() => {
    if (pillarFilter === "all") return posts;
    return posts.filter((p) => p.pillar_id === pillarFilter);
  }, [posts, pillarFilter]);

  const grouped = useMemo(() => groupByStatus(filtered), [filtered]);

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Content Calendar</h1>
          <p className="text-sm text-[#71757D] mt-1">
            Personal social pipeline across Twitter and LinkedIn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-[#0C0C0C] text-xs font-medium rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <PlusIcon className="size-3.5" />
            New post
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-[#2A2A2A]">
        {VIEWS.map((v) => {
          const active = view === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
                active
                  ? "border-[#1A1A1A] text-[#E5E5EA]"
                  : "border-transparent text-[#71757D] hover:text-[#E5E5EA]"
              }`}
            >
              {v.icon}
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <FilterChip
          active={pillarFilter === "all"}
          onClick={() => setPillarFilter("all")}
          label="All pillars"
        />
        {pillars.map((p) => (
          <FilterChip
            key={p.id}
            active={pillarFilter === p.id}
            onClick={() => setPillarFilter(p.id)}
            label={p.name}
            color={p.color_hex}
          />
        ))}
      </div>

      {/* View body */}
      {loading ? (
        <div className="text-sm text-[#71757D] py-12 text-center">Loading...</div>
      ) : view === "pipeline" ? (
        <PipelineView
          grouped={grouped}
          pillars={pillars}
          onCardClick={setActivePost}
          onCreate={openNew}
        />
      ) : view === "calendar" ? (
        <Placeholder
          title="Calendar view"
          subtitle="Monthly grid is phase 5. Use Pipeline for now."
        />
      ) : (
        <Placeholder
          title="Pillar Balance"
          subtitle="Bar chart of posts per pillar vs target is phase 7."
        />
      )}

      {/* Drawer */}
      {activePost && (
        <PostDetailDrawer
          post={activePost}
          pillars={pillars}
          onClose={() => {
            setActivePost(null);
            void refresh();
          }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

/* ── Pipeline (kanban) ──────────────────────────────────────────── */

function PipelineView({
  grouped,
  pillars,
  onCardClick,
  onCreate,
}: {
  grouped: Record<PostStatus, ContentPost[]>;
  pillars: ContentPillar[];
  onCardClick: (post: ContentPost) => void;
  onCreate: () => void;
}) {
  const empty = PIPELINE_COLUMNS.every((s) => grouped[s].length === 0);
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-[#2A2A2A] py-16 text-center">
        <p className="text-sm text-[#71757D]">No posts yet.</p>
        <button
          onClick={onCreate}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#0C0C0C] text-xs font-medium rounded-lg hover:bg-[#F3F4F6]"
        >
          <PlusIcon className="size-3.5" />
          Capture your first idea
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {PIPELINE_COLUMNS.map((status) => {
        const meta = STATUS_META[status];
        const items = grouped[status];
        return (
          <div key={status} className="bg-[#0C0C0C] rounded-xl p-3 min-h-[200px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </span>
                <span className="text-[11px] text-[#9CA3AF] tabular-nums">
                  {items.length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  pillars={pillars}
                  onClick={() => onCardClick(post)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PostCard({
  post,
  pillars,
  onClick,
}: {
  post: ContentPost;
  pillars: ContentPillar[];
  onClick: () => void;
}) {
  const pillar = pillars.find((p) => p.id === post.pillar_id);
  const preview =
    post.twitter_copy || post.linkedin_copy || post.notes || "(empty)";
  const firstMedia = post.media[0];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-[#181818] rounded-lg border border-[#2A2A2A] hover:border-[#1A1A1A] hover:shadow-[var(--shadow-soft)] transition-all overflow-hidden"
    >
      {/* Pillar stripe */}
      <div
        className="h-1"
        style={{ background: pillar?.color_hex || "#E5E5EA" }}
      />
      <div className="p-3">
        <p className="text-xs text-[#E5E5EA] line-clamp-3 leading-relaxed">
          {preview.slice(0, 80)}
          {preview.length > 80 ? "…" : ""}
        </p>
        <div className="flex items-center justify-between mt-2.5 gap-2">
          <div className="flex items-center gap-1">
            {post.platforms.map((p: Platform) => (
              <span
                key={p}
                className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#222222] text-[#71757D]"
                title={PLATFORM_LABELS[p]}
              >
                {p === "twitter" ? "X" : "in"}
              </span>
            ))}
          </div>
          {post.scheduled_for && (
            <span className="text-[10px] text-[#71757D] tabular-nums">
              {new Date(post.scheduled_for).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
        {firstMedia && (
          <div className="mt-2 aspect-video rounded overflow-hidden bg-[#0C0C0C]">
            {firstMedia.file_type === "video" ? (
              <video
                src={firstMedia.file_url}
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={firstMedia.thumbnail_url || firstMedia.file_url}
                alt={firstMedia.alt_text || ""}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-white text-[#0C0C0C] border-[#1A1A1A]"
          : "bg-[#181818] text-[#71757D] border-[#2A2A2A] hover:border-[#1A1A1A]"
      }`}
    >
      {color && (
        <span
          className="size-2 rounded-full"
          style={{ background: color }}
        />
      )}
      {label}
    </button>
  );
}

function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#2A2A2A] py-16 text-center">
      <p className="text-sm font-semibold text-[#E5E5EA]">{title}</p>
      <p className="text-xs text-[#71757D] mt-1">{subtitle}</p>
    </div>
  );
}
