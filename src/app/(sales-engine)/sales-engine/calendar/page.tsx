"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  SparklesIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import {
  PhotoIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  NewspaperIcon,
} from "@heroicons/react/24/solid";
import {
  getPosts,
  savePosts,
  seedPosts,
  type ContentPost,
  type Platform,
  type ContentType,
  type PostStatus,
  type PostFormat,
  type ContentIdea,
  platformColors,
  platformLabels,
  contentTypeColors,
  contentTypeLabels,
  postFormatLabels,
  statusColors,
  statusLabels,
  isOptimalSlot,
  getSlotScore,
  getBestDay,
} from "@/lib/sales-engine/calendar-data";
import { inputClass, textareaClass, labelClass } from "@/lib/form-styles";

// ── Helpers ──

function getWeekDates(offset: number): Date[] {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return dd;
  });
}

function getMonthDates(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay() || 7;
  const start = new Date(first);
  start.setDate(start.getDate() - (startDay - 1));
  const dates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function uuid(): string {
  return crypto.randomUUID();
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am–8pm

const formatIcons: Record<PostFormat, typeof DocumentTextIcon> = {
  text: DocumentTextIcon,
  image: PhotoIcon,
  article: NewspaperIcon,
  video: VideoCameraIcon,
};

function FormatBadge({ format, size = "sm" }: { format: PostFormat; size?: "sm" | "xs" }) {
  const Icon = formatIcons[format];
  if (size === "xs") return <Icon className="size-2.5 shrink-0 opacity-60" />;
  return <Icon className="size-3 shrink-0 opacity-50" />;
}

// ── Main Component ──

export default function CalendarPage() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<"week" | "month">("week");
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [showStudio, setShowStudio] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);

  // Caption studio state
  const [studioPost, setStudioPost] = useState<Partial<ContentPost>>({});
  const [captions, setCaptions] = useState<string[]>([]);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState("");
  const [selectedCaption, setSelectedCaption] = useState(-1);
  const [saving, setSaving] = useState(false);

  // Idea engine state
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState("");

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const monthDates = useMemo(
    () => getMonthDates(monthDate.getFullYear(), monthDate.getMonth()),
    [monthDate]
  );

  // ── Load data ──
  const load = useCallback(async () => {
    setLoading(true);
    let data = await getPosts();
    if (data.length === 0) {
      data = seedPosts();
      await savePosts(data);
    }
    setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ──
  const weekPosts = useMemo(() => {
    const start = toDateStr(weekDates[0]);
    const end = toDateStr(weekDates[6]);
    return posts.filter(p => p.scheduled_date >= start && p.scheduled_date <= end);
  }, [posts, weekDates]);

  const contentMix = useMemo(() => {
    const mix = { educational: 0, social_proof: 0, personal: 0, promotional: 0 };
    weekPosts.forEach(p => { mix[p.content_type]++; });
    return mix;
  }, [weekPosts]);

  const totalPosts = weekPosts.length;
  const mixPct = useMemo(() => {
    if (totalPosts === 0) return { educational: 0, social_proof: 0, personal: 0, promotional: 0 };
    return {
      educational: Math.round((contentMix.educational / totalPosts) * 100),
      social_proof: Math.round((contentMix.social_proof / totalPosts) * 100),
      personal: Math.round((contentMix.personal / totalPosts) * 100),
      promotional: Math.round((contentMix.promotional / totalPosts) * 100),
    };
  }, [contentMix, totalPosts]);

  const promoWarning = mixPct.promotional > 30;

  // Gap detection: consecutive days with no posts
  const gapDays = useMemo(() => {
    let maxGap = 0, current = 0;
    for (let i = 0; i < 7; i++) {
      const dateStr = toDateStr(weekDates[i]);
      if (!weekPosts.some(p => p.scheduled_date === dateStr)) {
        current++;
        maxGap = Math.max(maxGap, current);
      } else {
        current = 0;
      }
    }
    return maxGap;
  }, [weekPosts, weekDates]);

  // Platform neglect: 5+ days without posts (check across all posts)
  const neglectedPlatforms = useMemo(() => {
    const neglected: Platform[] = [];
    const platforms: Platform[] = ["linkedin", "instagram", "x"];
    const today = new Date();
    platforms.forEach(p => {
      const platPosts = posts.filter(pp => pp.platform === p);
      if (platPosts.length === 0) { neglected.push(p); return; }
      const latest = platPosts.reduce((a, b) =>
        a.scheduled_date > b.scheduled_date ? a : b
      );
      const diff = Math.floor((today.getTime() - new Date(latest.scheduled_date).getTime()) / 86400000);
      if (diff >= 5) neglected.push(p);
    });
    return neglected;
  }, [posts]);

  // Best performing day (from mock analytics)
  const bestDay = useMemo(() => {
    const dayScores: Record<string, number> = {};
    weekPosts.forEach(p => {
      const d = new Date(p.scheduled_date + "T00:00:00");
      const name = d.toLocaleDateString("en-GB", { weekday: "short" });
      dayScores[name] = (dayScores[name] || 0) + p.analytics_score;
    });
    const sorted = Object.entries(dayScores).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] || "—";
  }, [weekPosts]);

  // Top content type
  const topType = useMemo(() => {
    const sorted = Object.entries(contentMix).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[1] > 0 ? contentTypeLabels[sorted[0][0] as ContentType] : "—";
  }, [contentMix]);

  // ── Actions ──

  function openStudio(post?: ContentPost) {
    if (post) {
      setStudioPost({ ...post });
      setSelectedCaption(-1);
    } else {
      setStudioPost({
        id: "",
        platform: "linkedin",
        content_type: "educational",
        post_format: "text",
        caption: "",
        status: "idea",
        scheduled_date: toDateStr(new Date()),
        scheduled_time: "09:00",
        analytics_score: 0,
      });
      setSelectedCaption(-1);
    }
    setCaptions([]);
    setCaptionError("");
    setShowStudio(true);
  }

  function openStudioForSlot(date: string, time: string) {
    setStudioPost({
      id: "",
      platform: "linkedin",
      content_type: "educational",
      post_format: "text",
      caption: "",
      status: "idea",
      scheduled_date: date,
      scheduled_time: time,
      analytics_score: 0,
    });
    setCaptions([]);
    setCaptionError("");
    setSelectedCaption(-1);
    setShowStudio(true);
  }

  async function handleSavePost() {
    if (!studioPost.platform || !studioPost.scheduled_date) return;
    setSaving(true);
    const now = new Date().toISOString();
    const post: ContentPost = {
      id: studioPost.id || uuid(),
      platform: studioPost.platform!,
      content_type: studioPost.content_type || "educational",
      post_format: studioPost.post_format || "text",
      caption: studioPost.caption || "",
      status: studioPost.status || "idea",
      scheduled_date: studioPost.scheduled_date!,
      scheduled_time: studioPost.scheduled_time || "09:00",
      media_url: studioPost.media_url,
      media_data: studioPost.media_data,
      analytics_score: studioPost.analytics_score || getSlotScore(
        studioPost.platform!,
        new Date(studioPost.scheduled_date! + "T00:00:00").getDay(),
        parseInt(studioPost.scheduled_time || "9")
      ),
      created_at: studioPost.created_at || now,
      updated_at: now,
    };
    const existing = posts.findIndex(p => p.id === post.id);
    let updated: ContentPost[];
    if (existing >= 0) {
      updated = posts.map(p => p.id === post.id ? post : p);
    } else {
      updated = [...posts, post];
    }
    setPosts(updated);
    await savePosts(updated);
    setSaving(false);
    setShowStudio(false);
  }

  async function handleDeletePost(id: string) {
    const updated = posts.filter(p => p.id !== id);
    setPosts(updated);
    await savePosts(updated);
    setShowStudio(false);
  }

  async function generateCaptions() {
    if (!studioPost.platform || !studioPost.content_type) return;
    setCaptionLoading(true);
    setCaptionError("");
    setCaptions([]);
    try {
      const res = await fetch("/api/calendar/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: studioPost.platform,
          contentType: contentTypeLabels[studioPost.content_type],
          postFormat: studioPost.post_format || "text",
          brief: studioPost.caption || `${contentTypeLabels[studioPost.content_type]} post about CRO and landing pages`,
          imageData: studioPost.media_data || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCaptions(data.captions || []);
    } catch (e: any) {
      setCaptionError(e.message || "Failed to generate captions");
    } finally {
      setCaptionLoading(false);
    }
  }

  async function generateIdeas() {
    setIdeasLoading(true);
    setIdeasError("");
    setIdeas([]);
    const gaps: string[] = [];
    if (gapDays >= 3) gaps.push(`${gapDays} consecutive days with no posts`);
    neglectedPlatforms.forEach(p => gaps.push(`${platformLabels[p]} has no recent posts`));
    if (promoWarning) gaps.push("Over 30% promotional content this week");
    try {
      const res = await fetch("/api/calendar/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentMix,
          gaps,
          platforms: ["linkedin", "instagram", "x"],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setIdeas(data.ideas || []);
    } catch (e: any) {
      setIdeasError(e.message || "Failed to generate ideas");
    } finally {
      setIdeasLoading(false);
    }
  }

  function addIdeaToCalendar(idea: ContentIdea) {
    openStudio();
    setStudioPost(prev => ({
      ...prev,
      platform: idea.platform,
      content_type: idea.type,
      post_format: "text",
      caption: idea.brief,
      status: "idea",
    }));
  }

  // ── Render helpers ──

  function postsForSlot(date: string, hour: number): ContentPost[] {
    const hStr = hour.toString().padStart(2, "0") + ":00";
    return weekPosts.filter(p => p.scheduled_date === date && p.scheduled_time === hStr);
  }

  function postsForDate(date: string): ContentPost[] {
    return posts.filter(p => p.scheduled_date === date);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[#F0F0F0] rounded-lg" />
          <div className="h-4 w-64 bg-[#F0F0F0] rounded" />
          <div className="h-[500px] bg-[#F0F0F0] rounded-xl mt-6" />
        </div>
      </div>
    );
  }

  // Format time for display (e.g. "9:00 AM")
  function fmtTime(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  // Current month info for header
  const displayDate = view === "month" ? monthDate : weekDates[3]; // mid-week for week view
  const monthLabel = displayDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const dateRangeLabel = view === "week"
    ? `${weekDates[0].toLocaleDateString("en-GB", { month: "short", day: "numeric" })} - ${weekDates[6].toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}`
    : `${monthDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}, ${monthDate.getFullYear()} - ${new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="py-8 px-6 md:px-8 overflow-x-hidden">
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-sm text-[#7A7A7A] mt-0.5">Plan, write, and organise content before publishing</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPipeline(!showPipeline)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              showPipeline ? "bg-[#1B1B1B] text-white border-[#1B1B1B]" : "border-[#E5E5EA] text-[#7A7A7A] hover:bg-[#F5F5F5]"
            }`}
          >
            <Squares2X2Icon className="size-3.5" />
            Pipeline
          </button>
          <button
            onClick={() => { setShowIdeas(true); if (ideas.length === 0) generateIdeas(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E5EA] text-[#7A7A7A] hover:bg-[#F5F5F5] transition-colors"
          >
            <LightBulbIcon className="size-3.5" />
            Idea Engine
          </button>
        </div>
      </div>

      {/* ── Calendar header bar (like Untitled UI) ── */}
      <div className="border border-[#E5E5EA] rounded-t-xl bg-white px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Month + date range */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-center bg-[#F7F8FA] rounded-lg px-2.5 py-1.5 border border-[#E5E5EA]">
              <p className="text-[9px] font-semibold uppercase text-[#7A7A7A] leading-tight">{displayDate.toLocaleDateString("en-GB", { month: "short" })}</p>
              <p className="text-lg font-bold text-[#1B1B1B] leading-tight">{displayDate.getDate()}</p>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1B1B1B]">{monthLabel}</h2>
              <p className="text-xs text-[#7A7A7A]">{dateRangeLabel}</p>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Nav arrows */}
          <div className="flex items-center border border-[#E5E5EA] rounded-lg overflow-hidden">
            <button
              onClick={() => view === "month"
                ? setMonthDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })
                : setWeekOffset(o => o - 1)
              }
              className="p-2 hover:bg-[#F5F5F5] transition-colors border-r border-[#E5E5EA]"
            >
              <ChevronLeftIcon className="size-4 text-[#7A7A7A]" />
            </button>
            <button
              onClick={() => view === "month"
                ? setMonthDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })
                : setWeekOffset(o => o + 1)
              }
              className="p-2 hover:bg-[#F5F5F5] transition-colors"
            >
              <ChevronRightIcon className="size-4 text-[#7A7A7A]" />
            </button>
          </div>

          {/* Today button */}
          <button
            onClick={() => { setWeekOffset(0); setMonthDate(new Date()); }}
            className="px-3 py-2 text-xs font-medium border border-[#E5E5EA] rounded-lg text-[#1B1B1B] hover:bg-[#F5F5F5] transition-colors"
          >
            Today
          </button>

          {/* View toggle */}
          <div className="flex items-center border border-[#E5E5EA] rounded-lg overflow-hidden">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                view === "month" ? "bg-[#F7F8FA] text-[#1B1B1B]" : "text-[#7A7A7A] hover:bg-[#F5F5F5]"
              }`}
            >
              Month view
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-2 text-xs font-medium transition-colors border-l border-[#E5E5EA] ${
                view === "week" ? "bg-[#F7F8FA] text-[#1B1B1B]" : "text-[#7A7A7A] hover:bg-[#F5F5F5]"
              }`}
            >
              Week view
            </button>
          </div>

          {/* Add post */}
          <button
            onClick={() => openStudio()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Add post
          </button>
        </div>
      </div>

      <div className="flex">
        {/* ── Main calendar grid ── */}
        <div className="flex-1 min-w-0">

          {/* ═══ MONTH VIEW (default, like Untitled UI) ═══ */}
          {view === "month" && (
            <div className="border-x border-b border-[#E5E5EA] rounded-b-xl overflow-hidden">
              {/* Day-of-week header row */}
              <div className="grid grid-cols-7 border-b border-[#E5E5EA]">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className={`px-3 py-2.5 text-xs font-semibold text-[#7A7A7A] ${d !== "Mon" ? "border-l border-[#E5E5EA]" : ""}`}>
                    {d}
                  </div>
                ))}
              </div>
              {/* Calendar grid — 6 rows of 7 */}
              {Array.from({ length: 6 }).map((_, row) => (
                <div key={row} className={`grid grid-cols-7 ${row < 5 ? "border-b border-[#E5E5EA]" : ""}`}>
                  {monthDates.slice(row * 7, row * 7 + 7).map((d, col) => {
                    const isCurrentMonth = d.getMonth() === monthDate.getMonth();
                    const isToday = toDateStr(d) === toDateStr(new Date());
                    const dayPosts = postsForDate(toDateStr(d));

                    return (
                      <div
                        key={col}
                        className={`min-h-[120px] px-3 py-2 ${col > 0 ? "border-l border-[#E5E5EA]" : ""} ${
                          !isCurrentMonth ? "bg-[#FAFAFA]" : "bg-white"
                        } hover:bg-[#F5F8FF] cursor-pointer transition-colors group`}
                        onClick={() => openStudioForSlot(toDateStr(d), "09:00")}
                      >
                        {/* Date number */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-sm font-semibold ${
                            isToday
                              ? "text-white bg-[#1B1B1B] size-7 flex items-center justify-center rounded-full"
                              : isCurrentMonth ? "text-[#1B1B1B]" : "text-[#CCC]"
                          }`}>
                            {d.getDate()}
                          </span>
                        </div>

                        {/* Event cards */}
                        <div className="space-y-1">
                          {dayPosts.slice(0, 3).map(p => (
                            <button
                              key={p.id}
                              onClick={(e) => { e.stopPropagation(); openStudio(p); }}
                              className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all hover:shadow-sm ${
                                p.status === "idea" ? "opacity-60" : ""
                              }`}
                              style={{
                                backgroundColor: platformColors[p.platform] + "12",
                                color: platformColors[p.platform],
                              }}
                            >
                              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: platformColors[p.platform] }} />
                              <FormatBadge format={p.post_format || "text"} size="xs" />
                              <span className="font-medium truncate">{p.caption.slice(0, 20)}{p.caption.length > 20 ? "..." : ""}</span>
                              <span className="text-[10px] ml-auto shrink-0 opacity-70">{fmtTime(p.scheduled_time)}</span>
                            </button>
                          ))}
                          {dayPosts.length > 3 && (
                            <p className="text-[10px] text-[#AAA] pl-2">{dayPosts.length - 3} more...</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ═══ WEEK VIEW ═══ */}
          {view === "week" && (
            <div className="border-x border-b border-[#E5E5EA] rounded-b-xl overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-[#E5E5EA]">
                {weekDates.map((d, i) => {
                  const isToday = toDateStr(d) === toDateStr(new Date());
                  return (
                    <div key={i} className={`px-3 py-3 ${i > 0 ? "border-l border-[#E5E5EA]" : ""} ${isToday ? "bg-[#F5F8FF]" : ""}`}>
                      <p className="text-xs font-semibold text-[#7A7A7A]">
                        {d.toLocaleDateString("en-GB", { weekday: "short" })}
                      </p>
                      <p className={`text-lg font-bold ${isToday ? "text-[#1B1B1B]" : "text-[#1B1B1B]"}`}>
                        {isToday ? (
                          <span className="text-white bg-[#1B1B1B] size-8 flex items-center justify-center rounded-full text-sm">{d.getDate()}</span>
                        ) : (
                          d.getDate()
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
              {/* Day columns with posts */}
              <div className="grid grid-cols-7 min-h-[480px]">
                {weekDates.map((d, i) => {
                  const dateStr = toDateStr(d);
                  const dayPosts = postsForDate(dateStr).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
                  const isToday = dateStr === toDateStr(new Date());

                  return (
                    <div
                      key={i}
                      className={`${i > 0 ? "border-l border-[#E5E5EA]" : ""} ${isToday ? "bg-[#F5F8FF]/50" : ""} px-2 py-2 hover:bg-[#F5F8FF]/30 cursor-pointer transition-colors group`}
                      onClick={() => openStudioForSlot(dateStr, "09:00")}
                    >
                      {dayPosts.map(p => (
                        <button
                          key={p.id}
                          onClick={(e) => { e.stopPropagation(); openStudio(p); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md mb-1.5 transition-all hover:shadow-sm ${
                            p.status === "idea" ? "opacity-60" : ""
                          }`}
                          style={{
                            backgroundColor: platformColors[p.platform] + "12",
                            color: platformColors[p.platform],
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: platformColors[p.platform] }} />
                            <FormatBadge format={p.post_format || "text"} size="xs" />
                            <span className="text-[11px] font-medium truncate">{p.caption.slice(0, 24)}{p.caption.length > 24 ? "..." : ""}</span>
                          </div>
                          <span className="text-[10px] opacity-70 ml-3.5">{fmtTime(p.scheduled_time)}</span>
                        </button>
                      ))}
                      {dayPosts.length === 0 && (
                        <div className="flex items-center justify-center h-12 opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlusIcon className="size-4 text-[#CCC]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Pipeline sidebar ── */}
        {showPipeline && (
          <div className="w-56 shrink-0 ml-4 border border-[#E5E5EA] rounded-xl p-4 self-start sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-[#1B1B1B]">Pipeline</h3>
              <button onClick={() => setShowPipeline(false)} className="p-0.5 hover:bg-[#F3F3F5] rounded">
                <XMarkIcon className="size-3.5 text-[#AAA]" />
              </button>
            </div>
            {(["idea", "scripted", "media_ready", "approved", "exported"] as PostStatus[]).map(status => {
              const statusPosts = posts.filter(p => p.status === status);
              return (
                <div key={status} className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: statusColors[status] }} />
                    <span className="text-[10px] font-semibold text-[#1B1B1B]">{statusLabels[status]}</span>
                    <span className="text-[10px] text-[#AAA] ml-auto">{statusPosts.length}</span>
                  </div>
                  {statusPosts.slice(0, 3).map(p => (
                    <button
                      key={p.id}
                      onClick={() => openStudio(p)}
                      className="w-full text-left px-2 py-1.5 rounded-lg mb-1 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: platformColors[p.platform] }} />
                        <span className="text-[10px] text-[#555] truncate">{p.caption.slice(0, 30)}...</span>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ CAPTION STUDIO (slide-in panel) ═══ */}
      {showStudio && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowStudio(false)} />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-[var(--shadow-elevated)] overflow-y-auto animate-slideIn">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-[#E5E5EA] px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-sm font-bold text-[#1B1B1B]">{studioPost.id ? "Edit Post" : "New Post"}</h2>
              <button onClick={() => setShowStudio(false)} className="p-1 rounded-lg hover:bg-[#F3F3F5]">
                <XMarkIcon className="size-5 text-[#7A7A7A]" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Platform */}
              <div>
                <label className={labelClass}>Platform</label>
                <div className="flex gap-2">
                  {(["linkedin", "instagram", "x"] as Platform[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setStudioPost(prev => ({ ...prev, platform: p }))}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        studioPost.platform === p
                          ? "border-[#1B1B1B] bg-[#1B1B1B] text-white"
                          : "border-[#E5E5EA] text-[#7A7A7A] hover:bg-[#F5F5F5]"
                      }`}
                    >
                      <span className="size-2 rounded-full inline-block mr-1.5" style={{ backgroundColor: studioPost.platform === p ? "white" : platformColors[p] }} />
                      {platformLabels[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content type */}
              <div>
                <label className={labelClass}>Content Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["educational", "social_proof", "personal", "promotional"] as ContentType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setStudioPost(prev => ({ ...prev, content_type: t }))}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors text-left ${
                        studioPost.content_type === t
                          ? "border-[#1B1B1B] bg-[#F5F5F5]"
                          : "border-[#E5E5EA] text-[#7A7A7A] hover:bg-[#F5F5F5]"
                      }`}
                    >
                      <span className="size-2 rounded-full inline-block mr-1.5" style={{ backgroundColor: contentTypeColors[t] }} />
                      {contentTypeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Post format */}
              <div>
                <label className={labelClass}>Post Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["text", "image", "article", "video"] as PostFormat[]).map(f => {
                    const Icon = formatIcons[f];
                    return (
                      <button
                        key={f}
                        onClick={() => setStudioPost(prev => ({ ...prev, post_format: f }))}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium rounded-lg border transition-colors ${
                          studioPost.post_format === f
                            ? "border-[#1B1B1B] bg-[#F5F5F5] text-[#1B1B1B]"
                            : "border-[#E5E5EA] text-[#7A7A7A] hover:bg-[#F5F5F5]"
                        }`}
                      >
                        <Icon className="size-4" />
                        {postFormatLabels[f]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Image upload (shown for image/video formats) */}
              {(studioPost.post_format === "image" || studioPost.post_format === "video") && (
                <div>
                  <label className={labelClass}>
                    {studioPost.post_format === "video" ? "Thumbnail" : "Image"}
                  </label>
                  {studioPost.media_data ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#E5E5EA] bg-[#FAFAFA]">
                      <img
                        src={studioPost.media_data}
                        alt="Post media"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <label className="cursor-pointer px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-semibold rounded-lg shadow-sm hover:bg-white transition-colors">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setStudioPost(prev => ({ ...prev, media_data: reader.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <button
                          onClick={() => setStudioPost(prev => ({ ...prev, media_data: undefined }))}
                          className="px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-red-500 rounded-lg shadow-sm hover:bg-white transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      {studioPost.post_format === "image" && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-[9px] font-semibold rounded-lg backdrop-blur-sm">
                          AI captions will be based on this image
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-[#E5E5EA] rounded-xl cursor-pointer hover:border-[#C5C5C5] hover:bg-[#FAFAFA] transition-colors">
                      <PhotoIcon className="size-8 text-[#CCC]" />
                      <span className="text-xs text-[#7A7A7A]">Click to upload {studioPost.post_format === "video" ? "thumbnail" : "image"}</span>
                      <span className="text-[10px] text-[#AAA]">PNG, JPG, WebP up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            alert("Image must be under 5MB");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setStudioPost(prev => ({ ...prev, media_data: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    value={studioPost.scheduled_date || ""}
                    onChange={e => setStudioPost(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Time</label>
                  <input
                    type="time"
                    value={studioPost.scheduled_time || ""}
                    onChange={e => setStudioPost(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Slot score */}
              {studioPost.platform && studioPost.scheduled_date && studioPost.scheduled_time && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F7F8FA]">
                  <ClockIcon className="size-3.5 text-[#7A7A7A]" />
                  <span className="text-[11px] text-[#7A7A7A]">
                    Slot score:{" "}
                    <span className="font-semibold text-[#1B1B1B]">
                      {getSlotScore(
                        studioPost.platform,
                        new Date(studioPost.scheduled_date + "T00:00:00").getDay(),
                        parseInt(studioPost.scheduled_time)
                      ) || "—"}
                    </span>
                    /100
                  </span>
                  {getSlotScore(
                    studioPost.platform,
                    new Date(studioPost.scheduled_date + "T00:00:00").getDay(),
                    parseInt(studioPost.scheduled_time)
                  ) >= 80 && (
                    <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Optimal</span>
                  )}
                </div>
              )}

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`${labelClass} !mb-0`}>Caption</label>
                  <button
                    onClick={generateCaptions}
                    disabled={captionLoading}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
                  >
                    <SparklesIcon className="size-3" />
                    {captionLoading ? "Generating..." : "Generate Captions"}
                  </button>
                </div>
                <textarea
                  value={studioPost.caption || ""}
                  onChange={e => setStudioPost(prev => ({ ...prev, caption: e.target.value }))}
                  placeholder="Write your caption or generate with AI..."
                  className={`${textareaClass} min-h-[100px]`}
                  rows={4}
                />
              </div>

              {/* Caption variants */}
              {captionError && (
                <p className="text-[11px] text-red-500">{captionError}</p>
              )}
              {captions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">Caption variants</p>
                  {captions.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedCaption(i);
                        setStudioPost(prev => ({ ...prev, caption: c }));
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors text-xs leading-relaxed ${
                        selectedCaption === i
                          ? "border-[#1B1B1B] bg-[#F7F8FA]"
                          : "border-[#E5E5EA] hover:bg-[#FAFAFA]"
                      }`}
                    >
                      {selectedCaption === i && (
                        <span className="float-right ml-2">
                          <CheckIcon className="size-3.5 text-emerald-500" />
                        </span>
                      )}
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {/* Status */}
              <div>
                <label className={labelClass}>Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {(["idea", "scripted", "media_ready", "approved", "exported"] as PostStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setStudioPost(prev => ({ ...prev, status: s }))}
                      className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-full border transition-colors ${
                        studioPost.status === s
                          ? "text-white"
                          : "border-[#E5E5EA] text-[#7A7A7A] hover:bg-[#F5F5F5]"
                      }`}
                      style={studioPost.status === s ? { backgroundColor: statusColors[s], borderColor: statusColors[s] } : {}}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSavePost}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
                >
                  <CheckIcon className="size-3.5" />
                  {saving ? "Saving..." : "Save Post"}
                </button>
                {studioPost.id && (
                  <button
                    onClick={() => handleDeletePost(studioPost.id!)}
                    className="px-4 py-2.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ IDEA ENGINE (slide-in drawer) ═══ */}
      {showIdeas && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowIdeas(false)} />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-[var(--shadow-elevated)] overflow-y-auto animate-slideIn">
            <div className="sticky top-0 bg-white border-b border-[#E5E5EA] px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <LightBulbIcon className="size-4 text-amber-500" />
                <h2 className="text-sm font-bold text-[#1B1B1B]">Idea Engine</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateIdeas}
                  disabled={ideasLoading}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
                >
                  <SparklesIcon className="size-3" />
                  {ideasLoading ? "Generating..." : "Refresh"}
                </button>
                <button onClick={() => setShowIdeas(false)} className="p-1 rounded-lg hover:bg-[#F3F3F5]">
                  <XMarkIcon className="size-5 text-[#7A7A7A]" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {ideasError && (
                <p className="text-[11px] text-red-500 mb-3">{ideasError}</p>
              )}
              {ideasLoading && (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse border border-[#E5E5EA] rounded-xl p-4">
                      <div className="h-3 w-20 bg-[#F0F0F0] rounded mb-2" />
                      <div className="h-4 w-full bg-[#F0F0F0] rounded" />
                    </div>
                  ))}
                </div>
              )}
              {!ideasLoading && ideas.length > 0 && (
                <div className="space-y-3">
                  {ideas.map((idea, i) => (
                    <div key={i} className="border border-[#E5E5EA] rounded-xl p-4 hover:border-[#C5C5C5] transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: platformColors[idea.platform] + "15", color: platformColors[idea.platform] }}
                        >
                          {platformLabels[idea.platform]}
                        </span>
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: contentTypeColors[idea.type] + "15", color: contentTypeColors[idea.type] }}
                        >
                          {contentTypeLabels[idea.type]}
                        </span>
                      </div>
                      <p className="text-xs text-[#1B1B1B] mb-3 leading-relaxed">{idea.brief}</p>
                      <button
                        onClick={() => addIdeaToCalendar(idea)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-[#1B1B1B] hover:text-[#555] transition-colors"
                      >
                        <PlusIcon className="size-3" />
                        Add to calendar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!ideasLoading && ideas.length === 0 && !ideasError && (
                <div className="text-center py-10">
                  <LightBulbIcon className="size-8 text-[#DDD] mx-auto mb-2" />
                  <p className="text-xs text-[#AAA]">Click Refresh to generate content ideas</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
