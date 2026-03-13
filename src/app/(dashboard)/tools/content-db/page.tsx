"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, textareaClass, selectClass } from "@/lib/form-styles";
import {
  getContentEntries,
  createContentEntry,
  updateContentEntry,
  deleteContentEntry,
} from "@/lib/content-database/data";
import type {
  ContentEntry,
  ContentEntryInsert,
  ContentPlatform,
  ContentCategory,
} from "@/lib/content-database/types";
import { contentPlatforms, contentCategories } from "@/lib/content-database/types";
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  PencilSquareIcon,
  StarIcon,
  ArrowPathIcon,
  EyeIcon,
  HandThumbUpIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  LinkIcon,
} from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";

/* ── Helpers ─────────────────────────────────────────────────────── */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

function platformIcon(p: ContentPlatform): string {
  return p === "twitter" ? "𝕏" : "in";
}

type SortMode = "newest" | "engagement" | "impressions";

const defaultInsert: ContentEntryInsert = {
  platform: "twitter",
  category: "insight",
  content: "",
  post_url: "",
  post_date: new Date().toISOString().slice(0, 10),
  impressions: 0,
  engagements: 0,
  clicks: 0,
  is_winner: false,
  tags: [],
  notes: "",
};

/* ══════════════════════════════════════════════════════════════════ */

export default function ContentDatabasePage() {
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ContentCategory | "all">("all");
  const [winnersOnly, setWinnersOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("newest");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentEntry | null>(null);
  const [form, setForm] = useState<ContentEntryInsert>(defaultInsert);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Fetch ─────────────────────────────────────────────────────── */

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContentEntries();
      setEntries(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  /* ── Filtered + sorted ─────────────────────────────────────────── */

  const filtered = useMemo(() => {
    let list = [...entries];

    if (platformFilter !== "all") list = list.filter((e) => e.platform === platformFilter);
    if (categoryFilter !== "all") list = list.filter((e) => e.category === categoryFilter);
    if (winnersOnly) list = list.filter((e) => e.is_winner);

    switch (sort) {
      case "engagement":
        list.sort((a, b) => b.engagement_rate - a.engagement_rate);
        break;
      case "impressions":
        list.sort((a, b) => b.impressions - a.impressions);
        break;
      default:
        list.sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime());
    }
    return list;
  }, [entries, platformFilter, categoryFilter, winnersOnly, sort]);

  /* ── Stats ─────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const total = entries.length;
    const avgRate =
      total > 0
        ? Math.round((entries.reduce((s, e) => s + e.engagement_rate, 0) / total) * 100) / 100
        : 0;
    const winners = entries.filter((e) => e.is_winner).length;
    const platCounts: Record<string, number> = {};
    entries.forEach((e) => {
      platCounts[e.platform] = (platCounts[e.platform] || 0) + 1;
    });
    const topPlatform =
      Object.entries(platCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const topPlatformLabel =
      contentPlatforms.find((p) => p.id === topPlatform)?.label || topPlatform;

    return { total, avgRate, winners, topPlatform: topPlatformLabel };
  }, [entries]);

  /* ── Winner analysis ───────────────────────────────────────────── */

  const winnerAnalysis = useMemo(() => {
    const w = entries.filter((e) => e.is_winner);
    if (w.length === 0) return null;

    const avgImpressions = Math.round(w.reduce((s, e) => s + e.impressions, 0) / w.length);
    const avgEngagements = Math.round(w.reduce((s, e) => s + e.engagements, 0) / w.length);
    const avgRate =
      Math.round((w.reduce((s, e) => s + e.engagement_rate, 0) / w.length) * 100) / 100;

    const catCounts: Record<string, number> = {};
    w.forEach((e) => {
      catCounts[e.category] = (catCounts[e.category] || 0) + 1;
    });
    const topCategory =
      Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const topCategoryLabel =
      contentCategories.find((c) => c.id === topCategory)?.label || topCategory;

    const tagCounts: Record<string, number> = {};
    w.forEach((e) => e.tags.forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }));
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    return { avgImpressions, avgEngagements, avgRate, topCategoryLabel, topTags, count: w.length };
  }, [entries]);

  /* ── Modal handlers ────────────────────────────────────────────── */

  function openAdd() {
    setEditing(null);
    setForm({ ...defaultInsert, post_date: new Date().toISOString().slice(0, 10) });
    setTagInput("");
    setModalOpen(true);
  }

  function openEdit(entry: ContentEntry) {
    setEditing(entry);
    setForm({
      platform: entry.platform,
      category: entry.category,
      content: entry.content,
      post_url: entry.post_url,
      post_date: entry.post_date ? entry.post_date.slice(0, 10) : "",
      impressions: entry.impressions,
      engagements: entry.engagements,
      clicks: entry.clicks,
      is_winner: entry.is_winner,
      tags: entry.tags,
      notes: entry.notes,
    });
    setTagInput("");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await updateContentEntry(editing.id, form);
      } else {
        await createContentEntry(form);
      }
      await fetchEntries();
      setModalOpen(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteContentEntry(id);
    } catch {
      await fetchEntries();
    }
  }

  async function toggleWinner(entry: ContentEntry) {
    const newVal = !entry.is_winner;
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, is_winner: newVal } : e))
    );
    try {
      await updateContentEntry(entry.id, { is_winner: newVal });
    } catch {
      await fetchEntries();
    }
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }

  const hasFilters = platformFilter !== "all" || categoryFilter !== "all" || winnersOnly;

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Content Database
            </h1>
            <p className="text-[#6B6B6B] text-sm mt-2">
              Track social posts, log performance, tag winners, find what works.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#1A1A1A] transition-colors"
          >
            <PlusIcon className="size-4" />
            Add Post
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Posts", value: stats.total.toString() },
            { label: "Avg Engagement", value: `${stats.avgRate}%` },
            { label: "Winners", value: stats.winners.toString() },
            { label: "Top Platform", value: stats.topPlatform },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg px-4 py-3"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                {s.label}
              </div>
              <div className="text-lg font-semibold tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Platform pills */}
          <div className="inline-flex rounded-md border border-[#E5E5E5] overflow-hidden">
            {[{ id: "all" as const, label: "All" }, ...contentPlatforms].map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatformFilter(p.id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  platformFilter === p.id
                    ? "bg-[#0A0A0A] text-white"
                    : "bg-white text-[#6B6B6B] hover:bg-[#F5F5F5]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Category select */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ContentCategory | "all")}
            className={`${selectClass} !w-auto !py-1.5 !text-xs`}
          >
            <option value="all">All Categories</option>
            {contentCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Winners toggle */}
          <button
            onClick={() => setWinnersOnly(!winnersOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              winnersOnly
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-white border-[#E5E5E5] text-[#6B6B6B] hover:bg-[#F5F5F5]"
            }`}
          >
            <StarIcon className={`size-3 ${winnersOnly ? "text-amber-500" : "text-[#CCCCCC]"}`} />
            Winners
          </button>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className={`${selectClass} !w-auto !py-1.5 !text-xs`}
          >
            <option value="newest">Newest First</option>
            <option value="engagement">Best Engagement</option>
            <option value="impressions">Most Impressions</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => {
                setPlatformFilter("all");
                setCategoryFilter("all");
                setWinnersOnly(false);
              }}
              className="text-xs text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Content List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <ArrowPathIcon className="size-5 animate-spin text-[#AAAAAA]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-12 text-center">
            <p className="text-[#6B6B6B] text-sm">
              {hasFilters
                ? "No posts match your filters."
                : "No posts yet. Add your first post to start tracking."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="bg-white border border-[#E5E5E5] rounded-lg p-4 hover:border-[#CCCCCC] transition-colors"
              >
                {/* Top row: platform + date + actions */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center size-6 rounded text-[10px] font-bold ${
                        entry.platform === "twitter"
                          ? "bg-black text-white"
                          : "bg-[#0A66C2] text-white"
                      }`}
                    >
                      {platformIcon(entry.platform)}
                    </span>
                    <span className="text-xs text-[#AAAAAA]">{formatDate(entry.post_date)}</span>
                    <span className="text-xs text-[#CCCCCC]">·</span>
                    <span className="text-xs text-[#AAAAAA]">
                      {contentCategories.find((c) => c.id === entry.category)?.label || entry.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleWinner(entry)}
                      className="p-1.5 rounded hover:bg-[#F5F5F5] transition-colors"
                      title={entry.is_winner ? "Remove winner" : "Mark as winner"}
                    >
                      {entry.is_winner ? (
                        <StarIcon className="size-4 text-amber-500" />
                      ) : (
                        <StarOutline className="size-4 text-[#CCCCCC] hover:text-amber-400" />
                      )}
                    </button>
                    {entry.post_url && (
                      <a
                        href={entry.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-[#F5F5F5] transition-colors"
                        title="View post"
                      >
                        <LinkIcon className="size-3.5 text-[#AAAAAA]" />
                      </a>
                    )}
                    <button
                      onClick={() => openEdit(entry)}
                      className="p-1.5 rounded hover:bg-[#F5F5F5] transition-colors"
                      title="Edit"
                    >
                      <PencilSquareIcon className="size-3.5 text-[#AAAAAA]" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 rounded hover:bg-[#F5F5F5] transition-colors group"
                      title="Delete"
                    >
                      <TrashIcon className="size-3.5 text-[#AAAAAA] group-hover:text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-[#333] line-clamp-2 mb-3">{entry.content}</p>

                {/* Metrics row */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B6B6B]">
                  <span className="flex items-center gap-1">
                    <EyeIcon className="size-3 text-[#AAAAAA]" />
                    {formatNumber(entry.impressions)}
                  </span>
                  <span className="flex items-center gap-1">
                    <HandThumbUpIcon className="size-3 text-[#AAAAAA]" />
                    {formatNumber(entry.engagements)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CursorArrowRaysIcon className="size-3 text-[#AAAAAA]" />
                    {formatNumber(entry.clicks)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ChartBarIcon className="size-3 text-[#AAAAAA]" />
                    {entry.engagement_rate}%
                  </span>
                </div>

                {/* Tags */}
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[#F0F0F0] text-[#6B6B6B] text-[10px] font-medium rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {entry.notes && (
                  <p className="text-xs text-[#AAAAAA] mt-2 italic line-clamp-1">
                    {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Winner Analysis Panel */}
        {winnersOnly && winnerAnalysis && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-4 flex items-center gap-1.5">
              <StarIcon className="size-3.5" />
              Winner Analysis — {winnerAnalysis.count} winning posts
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/60 mb-0.5">
                  Avg Impressions
                </div>
                <div className="text-sm font-semibold text-amber-900">
                  {formatNumber(winnerAnalysis.avgImpressions)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/60 mb-0.5">
                  Avg Engagements
                </div>
                <div className="text-sm font-semibold text-amber-900">
                  {formatNumber(winnerAnalysis.avgEngagements)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/60 mb-0.5">
                  Avg Eng. Rate
                </div>
                <div className="text-sm font-semibold text-amber-900">
                  {winnerAnalysis.avgRate}%
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/60 mb-0.5">
                  Top Category
                </div>
                <div className="text-sm font-semibold text-amber-900">
                  {winnerAnalysis.topCategoryLabel}
                </div>
              </div>
            </div>
            {winnerAnalysis.topTags.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/60 mb-1.5">
                  Most Common Tags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {winnerAnalysis.topTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-medium rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit Post" : "Add Post"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded hover:bg-[#F0F0F0]"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Platform + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                    Platform
                  </label>
                  <select
                    value={form.platform}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, platform: e.target.value as ContentPlatform }))
                    }
                    className={selectClass}
                  >
                    {contentPlatforms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        category: e.target.value as ContentCategory,
                      }))
                    }
                    className={selectClass}
                  >
                    {contentCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                  Post Content
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  placeholder="Paste your post content here..."
                  className={textareaClass}
                />
              </div>

              {/* Post URL + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                    Post URL
                  </label>
                  <input
                    type="url"
                    value={form.post_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, post_url: e.target.value }))}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                    Post Date
                  </label>
                  <input
                    type="date"
                    value={form.post_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, post_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                    Impressions
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.impressions || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        impressions: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                    Engagements
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.engagements || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        engagements: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                    Clicks
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.clicks || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        clicks: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                  Tags
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add tag + Enter"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    onClick={addTag}
                    className="px-3 py-2 bg-[#F0F0F0] border border-[#E5E5E5] rounded-md text-sm hover:bg-[#E5E5E5] transition-colors"
                  >
                    Add
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0F0F0] text-[#6B6B6B] text-xs rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-500"
                        >
                          <XMarkIcon className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Winner toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_winner}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, is_winner: e.target.checked }))
                  }
                  className="rounded border-[#E5E5E5] text-amber-500 focus:ring-amber-500/30"
                />
                <span className="text-sm text-[#6B6B6B] flex items-center gap-1">
                  <StarIcon className="size-3.5 text-amber-500" />
                  Mark as winner
                </span>
              </label>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="What worked? What didn't? Key learnings..."
                  className={textareaClass}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSave}
                disabled={saving || !form.content.trim()}
                className="w-full py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#1A1A1A] transition-colors disabled:opacity-40"
              >
                {saving ? "Saving..." : editing ? "Update Post" : "Add Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
