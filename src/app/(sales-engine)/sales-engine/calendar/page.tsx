"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  BoltIcon,
  TrashIcon,
  ArrowPathIcon,
  LinkIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import {
  PhotoIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  NewspaperIcon,
} from "@heroicons/react/24/solid";
import {
  getPosts,
  savePosts,
  type ContentPost,
  type Creator,
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
  optimalSlots,
  isOptimalSlot,
  getSlotScore,
  getBestDay,
  getBestTimes,
  getTopSlots,
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
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function cardColors(status: PostStatus): { bg: string; text: string; dot: string } {
  switch (status) {
    case "scheduled":
      return { bg: "#ECFDF5", text: "#059669", dot: "#10B981" }; // green
    case "created":
      return { bg: "#EFF6FF", text: "#2563EB", dot: "#3B82F6" }; // blue
    default: // draft
      return { bg: "#F3F3F5", text: "#7A7A7A", dot: "#94A3B8" }; // grey
  }
}

function FormatBadge({ format, size = "sm" }: { format: PostFormat; size?: "sm" | "xs" }) {
  const Icon = formatIcons[format];
  if (size === "xs") return <Icon className="size-2.5 shrink-0 opacity-60" />;
  return <Icon className="size-3 shrink-0 opacity-50" />;
}

// ── Calendar PIN Gate ──

const CALENDAR_PINS: Record<string, Creator> = {
  "1111": "dylan",
  "2222": "ajay",
};
const PIN_SESSION_KEY = "calendar-creator-pin";

function CalendarPinGate({ onUnlock }: { onUnlock: (creator: Creator) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      const creator = CALENDAR_PINS[next];
      if (creator) {
        sessionStorage.setItem(PIN_SESSION_KEY, JSON.stringify({ creator }));
        onUnlock(creator);
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => { setPin(""); setShake(false); }, 500);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace") { setPin(p => p.slice(0, -1)); setError(false); }
    else if (/^\d$/.test(e.key)) handleDigit(e.key);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center animate-fadeInUp">
      <div className="w-full max-w-[280px] text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F3F3F5] border border-[#E5E5EA] mb-5">
          <LockClosedIcon className="size-6 text-[#7A7A7A]" />
        </div>
        <h1 className="text-xl font-bold tracking-tight mb-1">Content Calendar</h1>
        <p className="text-sm text-[#999] mb-8">Enter your PIN to continue</p>

        {/* PIN dots */}
        <div className={`flex justify-center gap-3 mb-8 ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                i < pin.length
                  ? error ? "bg-red-400 scale-110" : "bg-[#1B1B1B] scale-110"
                  : "bg-[#E5E5EA]"
              }`}
            />
          ))}
        </div>

        {/* Number pad */}
        <div
          className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto outline-none"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          ref={inputRef as React.RefObject<HTMLDivElement>}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              onClick={() => handleDigit(String(n))}
              className="h-14 rounded-xl bg-white border border-[#E5E5EA] text-lg font-semibold text-[#1B1B1B] hover:bg-[#F7F8FA] active:bg-[#EDEDEF] transition-colors"
            >
              {n}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit("0")}
            className="h-14 rounded-xl bg-white border border-[#E5E5EA] text-lg font-semibold text-[#1B1B1B] hover:bg-[#F7F8FA] active:bg-[#EDEDEF] transition-colors"
          >
            0
          </button>
          <button
            onClick={() => { setPin(p => p.slice(0, -1)); setError(false); }}
            className="h-14 rounded-xl text-sm font-medium text-[#999] hover:text-[#1B1B1B] hover:bg-[#F7F8FA] transition-colors"
          >
            ⌫
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mt-4">Incorrect PIN</p>}
      </div>
    </div>
  );
}

// ── Main Component ──

export default function CalendarPage() {
  const [allPosts, setAllPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCreator, setActiveCreator] = useState<Creator | null>(null);
  const [pinUnlocked, setPinUnlocked] = useState(false);
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

  // Weekly draft state
  interface DraftPost {
    content_type: ContentType;
    post_format: PostFormat;
    scheduled_date: string;
    scheduled_time: string;
    angle: string;
    brief: string;
    selected: boolean;
  }
  const [showWeeklyDraft, setShowWeeklyDraft] = useState(false);
  const [draftPosts, setDraftPosts] = useState<DraftPost[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftSaving, setDraftSaving] = useState(false);

  // Studio step flow: 1=format, 2=type, 3=media, 4=caption, 5=schedule
  const [studioStep, setStudioStep] = useState(1);

  // Repurpose state
  const [repurposeLoading, setRepurposeLoading] = useState(false);
  const [repurposeError, setRepurposeError] = useState("");

  // Per-platform draft caption cache (for auto-adaptation)
  const [draftCaptions, setDraftCaptions] = useState<Partial<Record<Platform, string>>>({});
  const [draftFormats, setDraftFormats] = useState<Partial<Record<Platform, PostFormat>>>({});
  const [adaptingPlatform, setAdaptingPlatform] = useState<Platform | null>(null);
  const [sourceCaptionForAdapt, setSourceCaptionForAdapt] = useState<string>("");
  const adaptRequestRef = useRef(0); // to discard stale adapt responses

  // Typefully state
  const [typefullyLoading, setTypefullyLoading] = useState(false);
  const [typefullyResult, setTypefullyResult] = useState<{ sent: number; failed: number; failedErrors?: string[] } | null>(null);

  // Drag & drop state
  const [dragPostId, setDragPostId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // ── PIN session check ──
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(PIN_SESSION_KEY);
      if (stored) {
        const { creator } = JSON.parse(stored);
        if (creator) { setActiveCreator(creator); setPinUnlocked(true); }
      }
    } catch { /* ignore */ }
  }, []);

  const handlePinUnlock = useCallback((creator: Creator) => {
    setActiveCreator(creator);
    setPinUnlocked(true);
  }, []);

  const handleLockCalendar = useCallback(() => {
    sessionStorage.removeItem(PIN_SESSION_KEY);
    setPinUnlocked(false);
    setActiveCreator(null);
  }, []);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const monthDates = useMemo(
    () => getMonthDates(monthDate.getFullYear(), monthDate.getMonth()),
    [monthDate]
  );

  // ── Load data ──
  const load = useCallback(async () => {
    setLoading(true);
    const data = await getPosts();
    // Migrate old posts without creator field
    let cleaned = data.map(p => ({
      ...p,
      creator: p.creator || ("ajay" as Creator),
    }));

    // Enforce max 3 draft posts per day per creator — discard extras
    const keep: ContentPost[] = [];
    const draftCount: Record<string, number> = {}; // "creator|date" → count
    // Keep non-drafts first, then drafts up to 3 per day per creator (newest first)
    const nonDrafts = cleaned.filter(p => p.status !== "draft");
    const drafts = cleaned.filter(p => p.status === "draft")
      .sort((a, b) => b.created_at.localeCompare(a.created_at)); // newest first
    keep.push(...nonDrafts);
    for (const p of drafts) {
      const key = `${p.creator}|${p.scheduled_date}`;
      draftCount[key] = (draftCount[key] || 0) + 1;
      if (draftCount[key] <= 3) keep.push(p);
    }

    // Save if anything was cleaned up
    if (keep.length !== data.length || data.some(p => !p.creator)) {
      await savePosts(keep);
    }
    setAllPosts(keep);
    setLoading(false);
  }, []);

  useEffect(() => { if (pinUnlocked) load(); }, [load, pinUnlocked]);

  // Filter by active creator — hooks must run before any early return
  const creator = (activeCreator || "dylan") as Creator;
  const posts = useMemo(() => allPosts.filter(p => p.creator === creator), [allPosts, creator]);

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
    const platforms: Platform[] = ["linkedin", "instagram", "x", "tiktok"];
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

  // Show PIN gate if not unlocked (AFTER all hooks)
  if (!pinUnlocked) return <CalendarPinGate onUnlock={handlePinUnlock} />;

  // ── Actions ──

  function openStudio(post?: ContentPost) {
    if (post) {
      setStudioPost({ ...post });
      setSelectedCaption(-1);
      setStudioStep(4); // jump to caption step for existing posts
      // Seed draft cache with existing caption
      setDraftCaptions(post.caption ? { [post.platform]: post.caption } : {});
      setDraftFormats(post.post_format ? { [post.platform]: post.post_format } : {});
      setSourceCaptionForAdapt(post.caption || "");
    } else {
      setStudioPost({
        id: "",
        creator: creator,
        platform: "x",
        content_type: "educational",
        post_format: "text",
        angle: "",
        caption: "",
        status: "draft",
        scheduled_date: toDateStr(new Date()),
        scheduled_time: "09:00",
        analytics_score: 0,
      });
      setSelectedCaption(-1);
      setStudioStep(1); // start from beginning
      setDraftCaptions({});
      setDraftFormats({});
      setSourceCaptionForAdapt("");
    }
    setCaptions([]);
    setCaptionError("");
    setAdaptingPlatform(null);
    adaptRequestRef.current = 0;
    setShowStudio(true);
  }

  function openStudioForSlot(date: string, time: string) {
    setStudioPost({
      id: "",
      creator: creator,
      platform: "x",
      content_type: "educational",
      post_format: "text",
      angle: "",
      caption: "",
      status: "draft",
      scheduled_date: date,
      scheduled_time: time,
      analytics_score: 0,
    });
    setCaptions([]);
    setCaptionError("");
    setSelectedCaption(-1);
    setStudioStep(1);
    setDraftCaptions({});
    setDraftFormats({});
    setAdaptingPlatform(null);
    setSourceCaptionForAdapt("");
    adaptRequestRef.current = 0;
    setShowStudio(true);
  }

  async function handleSavePost() {
    if (!studioPost.platform || !studioPost.scheduled_date) return;
    setSaving(true);
    const now = new Date().toISOString();
    const post: ContentPost = {
      id: studioPost.id || uuid(),
      creator: studioPost.creator || creator,
      group_id: studioPost.group_id,
      platform: studioPost.platform!,
      content_type: studioPost.content_type || "educational",
      post_format: studioPost.post_format || "text",
      angle: studioPost.angle || "",
      caption: studioPost.caption || "",
      status: studioPost.status || "draft",
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
    const existing = allPosts.findIndex(p => p.id === post.id);
    let updated: ContentPost[];
    if (existing >= 0) {
      updated = allPosts.map(p => p.id === post.id ? post : p);
    } else {
      updated = [...allPosts, post];
    }
    setAllPosts(updated);
    await savePosts(updated);
    setSaving(false);
    setShowStudio(false);
  }

  async function handleDeletePost(id: string) {
    const updated = allPosts.filter(p => p.id !== id);
    setAllPosts(updated);
    await savePosts(updated);
    setShowStudio(false);
  }

  // ── Typefully: Schedule posts ──
  async function scheduleToTypefully() {
    // Get posts for the current week view that have captions
    const allSchedulable = weekPosts.filter(p => p.caption && p.caption.trim());
    if (allSchedulable.length === 0) {
      alert("No posts with captions to schedule. Write your captions first!");
      return;
    }

    // Filter out posts scheduled in the past
    const now = new Date();
    const schedulable = allSchedulable.filter(p => {
      const postDate = new Date(`${p.scheduled_date}T${p.scheduled_time || "09:00"}:00`);
      return postDate > now;
    });

    const skipped = allSchedulable.length - schedulable.length;
    if (schedulable.length === 0) {
      alert(`All ${allSchedulable.length} post${allSchedulable.length > 1 ? "s" : ""} are scheduled in the past. Move them to a future date first.`);
      return;
    }

    const count = schedulable.length;
    const skippedMsg = skipped > 0 ? `\n\n(${skipped} post${skipped > 1 ? "s" : ""} in the past will be skipped)` : "";
    if (!confirm(`Schedule ${count} post${count > 1 ? "s" : ""} to Typefully for this week?${skippedMsg}`)) return;

    setTypefullyLoading(true);
    setTypefullyResult(null);

    try {
      // Step 1: Get social sets to find the right account
      const setsRes = await fetch("/api/typefully?action=social-sets");
      const setsData = await setsRes.json();
      if (!setsRes.ok) throw new Error(setsData.error || "Failed to load Typefully accounts");

      const sets = setsData.sets;
      if (!sets || sets.length === 0) throw new Error("No Typefully accounts found. Connect an account in Typefully first.");

      // Use the first social set (most users have one)
      const socialSetId = sets[0].id;

      // Step 2: Upload images for posts that have media_data
      const mediaIds: Record<string, string> = {};
      for (const p of schedulable) {
        if (p.media_data && (p.post_format === "image" || p.post_format === "video")) {
          try {
            const uploadRes = await fetch("/api/typefully", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "upload-media",
                social_set_id: socialSetId,
                base64_data: p.media_data,
              }),
            });
            const uploadData = await uploadRes.json();
            if (uploadRes.ok && uploadData.media_id) {
              mediaIds[p.id] = uploadData.media_id;
            }
          } catch (e) {
            console.warn(`Failed to upload image for post ${p.id}:`, e);
          }
        }
      }

      // Step 3: Build the batch payload
      const batchPosts = schedulable.map(p => {
        // Ensure time is properly formatted HH:mm
        const timeParts = (p.scheduled_time || "09:00").split(":");
        const hh = (timeParts[0] || "09").padStart(2, "0");
        const mm = (timeParts[1] || "00").padStart(2, "0");
        return {
          text: p.caption,
          platform: p.platform as "x" | "linkedin" | "instagram",
          publish_at: `${p.scheduled_date}T${hh}:${mm}:00Z`,
          ...(mediaIds[p.id] ? { media_ids: [mediaIds[p.id]] } : {}),
        };
      });

      // Step 4: Send the batch
      const res = await fetch("/api/typefully", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule-batch",
          social_set_id: socialSetId,
          posts: batchPosts,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to schedule posts");

      const sent = result.success?.length || 0;
      const failed = result.errors?.length || 0;
      const failedErrors = (result.errors || []).map((e: any) => e.error || "Unknown error");
      if (failed > 0) {
        console.error("Typefully scheduling errors:", result.errors);
      }
      setTypefullyResult({ sent, failed, failedErrors });

      // Mark successfully scheduled posts
      if (sent > 0) {
        const updated = allPosts.map(p => {
          if (schedulable.some(s => s.id === p.id)) {
            return { ...p, status: "scheduled" as PostStatus };
          }
          return p;
        });
        setAllPosts(updated);
        await savePosts(updated);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to schedule to Typefully");
    } finally {
      setTypefullyLoading(false);
    }
  }

  async function clearAllPosts() {
    if (!confirm("Delete ALL posts for " + (creator === "ajay" ? "Ajay" : "Dylan") + "?")) return;
    const updated = allPosts.filter(p => p.creator !== creator);
    setAllPosts(updated);
    await savePosts(updated);
  }

  // ── Drag & Drop helpers ──

  function handleDragStart(e: React.DragEvent, postId: string) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", postId);
    setDragPostId(postId);
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDate !== dateStr) setDragOverDate(dateStr);
  }

  function handleDragLeave() {
    setDragOverDate(null);
  }

  async function handleDrop(e: React.DragEvent, targetDate: string) {
    e.preventDefault();
    setDragOverDate(null);
    const postId = e.dataTransfer.getData("text/plain") || dragPostId;
    if (!postId) return;
    setDragPostId(null);

    const post = allPosts.find(p => p.id === postId);
    if (!post || post.scheduled_date === targetDate) return;

    const now = new Date().toISOString();
    const updated = allPosts.map(p =>
      p.id === postId ? { ...p, scheduled_date: targetDate, updated_at: now } : p
    );
    setAllPosts(updated);
    await savePosts(updated);
  }

  function handleDragEnd() {
    setDragPostId(null);
    setDragOverDate(null);
  }

  async function generateCaptions(overrides?: { imageData?: string }) {
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
          brief: studioPost.angle || studioPost.caption || `${contentTypeLabels[studioPost.content_type]} post about CRO and landing pages`,
          imageData: overrides?.imageData || studioPost.media_data || undefined,
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

  function handleImageUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setStudioPost(prev => ({ ...prev, media_data: base64 }));
      // Auto-generate captions based on the image
      generateCaptions({ imageData: base64 });
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleImageUpload(file);
        return;
      }
    }
  }

  // ── Auto-adapt caption for a target platform ──
  async function adaptCaptionForPlatform(
    sourceCaption: string,
    sourcePlatform: Platform,
    targetPlatform: Platform
  ) {
    const requestId = ++adaptRequestRef.current;
    setAdaptingPlatform(targetPlatform);

    try {
      const res = await fetch("/api/calendar/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePlatform: platformLabels[sourcePlatform],
          sourceCaption,
          sourceFormat: studioPost.post_format || "text",
          contentType: contentTypeLabels[studioPost.content_type || "educational"],
          targetPlatforms: [platformLabels[targetPlatform]],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Only apply if this is still the latest request
      if (requestId !== adaptRequestRef.current) return;

      const variant = data.variants?.[0];
      if (variant) {
        const adaptedCaption = variant.caption;
        const adaptedFormat = (variant.post_format || "text") as PostFormat;

        setDraftCaptions(prev => ({ ...prev, [targetPlatform]: adaptedCaption }));
        setDraftFormats(prev => ({ ...prev, [targetPlatform]: adaptedFormat }));
        setStudioPost(prev => ({
          ...prev,
          caption: adaptedCaption,
          post_format: adaptedFormat,
        }));
      }
    } catch (e: any) {
      console.error("Adapt caption error:", e);
    } finally {
      if (requestId === adaptRequestRef.current) {
        setAdaptingPlatform(null);
      }
    }
  }

  // ── Switch platform tab with auto-adaptation ──
  function handlePlatformSwitch(targetPlatform: Platform) {
    const currentPlatform = studioPost.platform;
    if (targetPlatform === currentPlatform) return;

    // Save current caption to draft cache before switching
    if (currentPlatform && studioPost.caption?.trim()) {
      setDraftCaptions(prev => ({ ...prev, [currentPlatform]: studioPost.caption! }));
      setDraftFormats(prev => ({ ...prev, [currentPlatform]: studioPost.post_format || "text" }));
      // Track source caption for re-adaptation detection
      if (!sourceCaptionForAdapt && studioPost.caption?.trim()) {
        setSourceCaptionForAdapt(studioPost.caption);
      }
    }

    // Check if we already have a cached draft for this platform
    if (draftCaptions[targetPlatform]) {
      setStudioPost(prev => ({
        ...prev,
        platform: targetPlatform,
        caption: draftCaptions[targetPlatform]!,
        post_format: draftFormats[targetPlatform] || prev.post_format || "text",
      }));
      setCaptions([]);
      setSelectedCaption(-1);
      return;
    }

    // If we have a caption to adapt from, auto-adapt
    const captionToAdapt = studioPost.caption?.trim() || sourceCaptionForAdapt;
    const sourceP = currentPlatform || "x";

    if (captionToAdapt) {
      setStudioPost(prev => ({
        ...prev,
        platform: targetPlatform,
        caption: "", // will be filled by adapt
      }));
      setCaptions([]);
      setSelectedCaption(-1);
      adaptCaptionForPlatform(captionToAdapt, sourceP as Platform, targetPlatform);
    } else {
      // No caption yet — just switch platform
      setStudioPost(prev => ({ ...prev, platform: targetPlatform }));
      setCaptions([]);
      setSelectedCaption(-1);
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
          platforms: ["linkedin", "instagram", "x", "tiktok"],
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
      status: "draft",
    }));
  }

  // ── Repurpose ──

  function getGroupSiblings(groupId?: string): ContentPost[] {
    if (!groupId) return [];
    return posts.filter(p => p.group_id === groupId);
  }

  async function repurposePost() {
    if (!studioPost.caption?.trim() || !studioPost.platform) return;
    setRepurposeLoading(true);
    setRepurposeError("");

    // Figure out which platforms we need variants for
    const allPlatforms: Platform[] = ["x", "linkedin", "instagram", "tiktok"];
    const currentGroupId = studioPost.group_id || studioPost.id || uuid();
    const existingSiblings = getGroupSiblings(currentGroupId);
    const existingPlatforms = new Set(existingSiblings.map(p => p.platform));
    existingPlatforms.add(studioPost.platform);
    const targetPlatforms = allPlatforms.filter(p => !existingPlatforms.has(p));

    if (targetPlatforms.length === 0) {
      setRepurposeError("Already repurposed to all platforms");
      setRepurposeLoading(false);
      return;
    }

    try {
      // First, ensure current post has a group_id and is saved
      if (!studioPost.group_id) {
        setStudioPost(prev => ({ ...prev, group_id: currentGroupId }));
        // Update the current post in the posts array
        const now = new Date().toISOString();
        const currentPost: ContentPost = {
          id: studioPost.id || uuid(),
          creator: studioPost.creator || creator,
          group_id: currentGroupId,
          platform: studioPost.platform!,
          content_type: studioPost.content_type || "educational",
          post_format: studioPost.post_format || "text",
          caption: studioPost.caption || "",
          status: studioPost.status || "draft",
          scheduled_date: studioPost.scheduled_date || toDateStr(new Date()),
          scheduled_time: studioPost.scheduled_time || "09:00",
          media_url: studioPost.media_url,
          media_data: studioPost.media_data,
          analytics_score: studioPost.analytics_score || 0,
          created_at: studioPost.created_at || now,
          updated_at: now,
        };
        const existingIdx = allPosts.findIndex(p => p.id === currentPost.id);
        if (existingIdx >= 0) {
          const updated = allPosts.map(p => p.id === currentPost.id ? currentPost : p);
          setAllPosts(updated);
          await savePosts(updated);
        } else {
          const updated = [...allPosts, currentPost];
          setAllPosts(updated);
          await savePosts(updated);
        }
      }

      // Use cached draft captions where available, only call API for uncached platforms
      const uncachedPlatforms = targetPlatforms.filter(p => !draftCaptions[p]);
      let apiVariants: any[] = [];

      if (uncachedPlatforms.length > 0) {
        const res = await fetch("/api/calendar/repurpose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourcePlatform: platformLabels[studioPost.platform],
            sourceCaption: studioPost.caption,
            sourceFormat: studioPost.post_format || "text",
            contentType: contentTypeLabels[studioPost.content_type || "educational"],
            targetPlatforms: uncachedPlatforms.map(p => platformLabels[p]),
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        apiVariants = data.variants || [];
      }

      // Merge cached drafts with API results
      const cachedVariants = targetPlatforms
        .filter(p => draftCaptions[p])
        .map(p => ({
          platform: platformLabels[p],
          post_format: draftFormats[p] || "text",
          caption: draftCaptions[p]!,
        }));

      const allVariants = [...cachedVariants, ...apiVariants];

      // Create new posts for each variant
      const now = new Date().toISOString();
      const newPosts: ContentPost[] = allVariants.map((v: any) => {
        const platform = (Object.entries(platformLabels).find(([, label]) => label.toLowerCase() === v.platform.toLowerCase())?.[0] || v.platform.toLowerCase()) as Platform;
        return {
          id: uuid(),
          creator: studioPost.creator || creator,
          group_id: currentGroupId,
          platform,
          content_type: studioPost.content_type || "educational",
          post_format: (v.post_format || "text") as PostFormat,
          caption: v.caption,
          status: "draft" as PostStatus,
          scheduled_date: studioPost.scheduled_date || toDateStr(new Date()),
          scheduled_time: studioPost.scheduled_time || "09:00",
          analytics_score: getSlotScore(
            platform,
            new Date((studioPost.scheduled_date || toDateStr(new Date())) + "T00:00:00").getDay(),
            parseInt(studioPost.scheduled_time || "9")
          ),
          created_at: now,
          updated_at: now,
        };
      });

      const updatedPosts = [...allPosts, ...newPosts];
      // Make sure the source post has the group_id too
      const final = updatedPosts.map(p =>
        p.id === studioPost.id ? { ...p, group_id: currentGroupId } : p
      );
      setAllPosts(final);
      await savePosts(final);

      // Update studio post to reflect group_id
      setStudioPost(prev => ({ ...prev, group_id: currentGroupId }));

    } catch (e: any) {
      setRepurposeError(e.message || "Failed to repurpose");
    } finally {
      setRepurposeLoading(false);
    }
  }

  function switchToSibling(platform: Platform) {
    const groupId = studioPost.group_id;
    if (!groupId) return;
    const sibling = posts.find(p => p.group_id === groupId && p.platform === platform);
    if (sibling) {
      setStudioPost({ ...sibling });
      setCaptions([]);
      setCaptionError("");
      setSelectedCaption(-1);
    }
  }

  // ── Weekly draft ──

  async function generateWeeklyDraft() {
    setDraftLoading(true);
    setDraftError("");
    setDraftPosts([]);
    setShowWeeklyDraft(true);

    // Build performance insights from existing posts
    const typeCounts: Record<string, number> = {};
    const platCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};
    let totalScore = 0;
    const recentGood: string[] = [];

    posts.forEach(p => {
      typeCounts[p.content_type] = (typeCounts[p.content_type] || 0) + 1;
      platCounts[p.platform] = (platCounts[p.platform] || 0) + 1;
      const dayName = new Date(p.scheduled_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long" });
      dayCounts[dayName] = (dayCounts[dayName] || 0) + p.analytics_score;
      totalScore += p.analytics_score;
      if (p.analytics_score >= 85 && p.caption) {
        recentGood.push(p.caption.slice(0, 80));
      }
    });

    const topTypes = Object.entries(typeCounts).sort(([, a], [, b]) => b - a).slice(0, 2).map(([k]) => contentTypeLabels[k as ContentType]).join(", ");
    const topPlats = Object.entries(platCounts).sort(([, a], [, b]) => b - a).slice(0, 2).map(([k]) => platformLabels[k as Platform]).join(", ");
    const topDays = Object.entries(dayCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([k]) => k).join(", ");

    try {
      const res = await fetch("/api/calendar/weekly-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekDates: weekDates.map(d => toDateStr(d)),
          existingPosts: weekPosts.map(p => ({
            platform: p.platform,
            scheduled_date: p.scheduled_date,
            scheduled_time: p.scheduled_time,
            caption: p.caption,
          })),
          pastPerformance: posts.length > 0 ? {
            topContentTypes: topTypes || "N/A",
            topPlatforms: topPlats || "N/A",
            topDays: topDays || "N/A",
            avgScore: posts.length > 0 ? Math.round(totalScore / posts.length) : "N/A",
            recentCaptions: recentGood.slice(0, 3).join(" | ") || "N/A",
          } : null,
          optimalSlots: optimalSlots.filter(s => s.score >= 70),
          platforms: ["linkedin", "instagram", "x", "tiktok"],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDraftPosts((data.drafts || []).map((d: any) => ({ ...d, selected: true })));
    } catch (e: any) {
      setDraftError(e.message || "Failed to generate weekly draft");
    } finally {
      setDraftLoading(false);
    }
  }

  async function applyDrafts() {
    const selected = draftPosts.filter(d => d.selected);
    if (selected.length === 0) return;
    setDraftSaving(true);
    const now = new Date().toISOString();

    // Figure out which dates the draft covers
    const draftDates = new Set(selected.map(d => d.scheduled_date));

    // Remove existing draft posts for this creator on those dates (replace, don't stack)
    const kept = allPosts.filter(p => {
      if (p.creator !== creator) return true; // other creator's posts untouched
      if (!draftDates.has(p.scheduled_date)) return true; // different week untouched
      if (p.status !== "draft") return true; // non-draft posts (created/scheduled) kept
      return false; // remove old drafts for this week
    });

    // All ideas land as X posts — repurpose to other platforms later
    const newPosts: ContentPost[] = selected.map(d => ({
      id: uuid(),
      creator: creator,
      platform: "x" as Platform,
      content_type: d.content_type,
      post_format: d.post_format || "text",
      angle: d.angle,
      caption: "",
      status: "draft" as PostStatus,
      scheduled_date: d.scheduled_date,
      scheduled_time: d.scheduled_time,
      analytics_score: getSlotScore(
        "x",
        new Date(d.scheduled_date + "T00:00:00").getDay(),
        parseInt(d.scheduled_time)
      ),
      created_at: now,
      updated_at: now,
    }));
    const updated = [...kept, ...newPosts];
    setAllPosts(updated);
    await savePosts(updated);
    setDraftSaving(false);
    setShowWeeklyDraft(false);
    setDraftPosts([]);
  }

  function toggleDraft(index: number) {
    setDraftPosts(prev => prev.map((d, i) => i === index ? { ...d, selected: !d.selected } : d));
  }

  function removeDraft(index: number) {
    setDraftPosts(prev => prev.filter((_, i) => i !== index));
  }

  // ── Render helpers ──

  function postsForSlot(date: string, hour: number): ContentPost[] {
    return weekPosts.filter(p => {
      if (p.scheduled_date !== date) return false;
      const postHour = parseInt(p.scheduled_time?.split(":")[0] || "0");
      return postHour === hour;
    });
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-fadeInUp">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
            <p className="text-sm text-[#7A7A7A] mt-0.5">Plan, write, and organise content before publishing</p>
          </div>
          {/* Active creator badge + lock */}
          <div className="flex items-center gap-2 ml-2">
            <div className="flex items-center gap-2 bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2">
              <span className={`size-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${
                creator === "ajay" ? "bg-[#1B1B1B]" : "bg-[#2563EB]"
              }`}>
                {creator === "ajay" ? "AJ" : "DE"}
              </span>
              <span className="text-sm font-semibold text-[#1B1B1B]">{creator === "ajay" ? "Ajay" : "Dylan"}</span>
            </div>
            <button
              onClick={handleLockCalendar}
              title="Lock calendar"
              className="p-2 rounded-lg text-[#C5C5C5] hover:text-[#1B1B1B] hover:bg-[#F3F3F5] transition-colors"
            >
              <LockClosedIcon className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {posts.length > 0 && (
            <button
              onClick={clearAllPosts}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="size-3.5" />
              Clear All
            </button>
          )}
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
          <button
            onClick={scheduleToTypefully}
            disabled={typefullyLoading || weekPosts.filter(p => p.caption?.trim()).length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUpTrayIcon className="size-3.5" />
            {typefullyLoading ? "Scheduling..." : "Schedule to Typefully"}
          </button>
          <button
            onClick={generateWeeklyDraft}
            disabled={draftLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[#1B1B1B] text-white hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
          >
            <BoltIcon className="size-3.5" />
            {draftLoading ? "Generating..." : "Weekly Draft"}
          </button>
        </div>
      </div>

      {/* Typefully result toast */}
      {typefullyResult && (
        <div className="mb-4 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 animate-fadeInUp">
          <div className="flex items-center gap-2">
            <CheckIcon className="size-4 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              {typefullyResult.sent} post{typefullyResult.sent !== 1 ? "s" : ""} scheduled to Typefully
              {typefullyResult.failed > 0 && <span className="text-red-500 ml-1">({typefullyResult.failed} failed{typefullyResult.failedErrors?.[0] ? `: ${typefullyResult.failedErrors[0].slice(0, 200)}` : ""})</span>}
            </p>
          </div>
          <button onClick={() => setTypefullyResult(null)} className="text-emerald-400 hover:text-emerald-600">
            <XMarkIcon className="size-4" />
          </button>
        </div>
      )}

      {/* ── Calendar header bar (like Untitled UI) ── */}
      <div className="border border-[#E5E5EA] rounded-t-xl bg-white px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fadeInUp-d1">
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

      <div className="flex animate-fadeInUp-d2">
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

                    const dStr = toDateStr(d);
                    const isDragOver = dragOverDate === dStr;

                    return (
                      <div
                        key={col}
                        className={`min-h-[120px] px-3 py-2 ${col > 0 ? "border-l border-[#E5E5EA]" : ""} ${
                          !isCurrentMonth ? "bg-[#FAFAFA]" : "bg-white"
                        } ${isDragOver ? "!bg-blue-50 ring-2 ring-inset ring-blue-300" : ""} transition-colors group`}
                        onDragOver={(e) => handleDragOver(e, dStr)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dStr)}
                      >
                        {/* Date number + add button */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-sm font-semibold ${
                            isToday
                              ? "text-white bg-[#1B1B1B] size-7 flex items-center justify-center rounded-full"
                              : isCurrentMonth ? "text-[#1B1B1B]" : "text-[#CCC]"
                          }`}>
                            {d.getDate()}
                          </span>
                          <button
                            onClick={() => openStudioForSlot(dStr, "09:00")}
                            className="size-5 flex items-center justify-center rounded hover:bg-[#F0F0F0] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <PlusIcon className="size-3 text-[#AAA]" />
                          </button>
                        </div>

                        {/* Event cards */}
                        <div className="space-y-1">
                          {dayPosts.slice(0, 3).map(p => {
                            const cc = cardColors(p.status);
                            return (
                            <div
                              key={p.id}
                              draggable
                              onMouseDown={(e) => { e.stopPropagation(); }}
                              onClick={(e) => { e.stopPropagation(); openStudio(p); }}
                              onDragStart={(e) => handleDragStart(e, p.id)}
                              onDragEnd={handleDragEnd}
                              className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all hover:shadow-sm cursor-pointer group/card relative ${
                                dragPostId === p.id ? "opacity-40 cursor-grabbing" : ""
                              }`}
                              style={{ backgroundColor: cc.bg, color: cc.text }}
                            >
                              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: cc.dot }} />
                              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: platformColors[p.platform] }} />
                              <FormatBadge format={p.post_format || "text"} size="xs" />
                              {p.group_id && <LinkIcon className="size-2 shrink-0 opacity-40" />}
                              <span className="font-medium truncate">{(p.angle || p.caption).slice(0, 16)}{(p.angle || p.caption).length > 16 ? "..." : ""}</span>
                              <span className="text-[10px] ml-auto shrink-0 opacity-70">{fmtTime(p.scheduled_time)}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeletePost(p.id); }}
                                className="hidden group-hover/card:flex items-center justify-center size-4 rounded hover:bg-red-100 shrink-0 transition-colors"
                                title="Delete post"
                              >
                                <XMarkIcon className="size-2.5 text-red-400" />
                              </button>
                            </div>
                            );
                          })}
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
                  const dStr = toDateStr(d);
                  const dayPosts = postsForDate(dStr).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
                  const isToday = dStr === toDateStr(new Date());
                  const isDragOver = dragOverDate === dStr;

                  return (
                    <div
                      key={i}
                      className={`${i > 0 ? "border-l border-[#E5E5EA]" : ""} ${isToday ? "bg-[#F5F8FF]/50" : ""} ${isDragOver ? "!bg-blue-50 ring-2 ring-inset ring-blue-300" : ""} px-2 py-2 transition-colors group`}
                      onDragOver={(e) => handleDragOver(e, dStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dStr)}
                    >
                      {dayPosts.map(p => {
                        const cc = cardColors(p.status);
                        return (
                        <div
                          key={p.id}
                          draggable
                          onMouseDown={(e) => { e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); openStudio(p); }}
                          onDragStart={(e) => handleDragStart(e, p.id)}
                          onDragEnd={handleDragEnd}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md mb-1.5 transition-all hover:shadow-sm cursor-pointer group/card relative ${
                            dragPostId === p.id ? "opacity-40 cursor-grabbing" : ""
                          }`}
                          style={{ backgroundColor: cc.bg, color: cc.text }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: cc.dot }} />
                            <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: platformColors[p.platform] }} />
                            <FormatBadge format={p.post_format || "text"} size="xs" />
                            {p.group_id && <LinkIcon className="size-2 shrink-0 opacity-40" />}
                            <span className="text-[11px] font-medium truncate flex-1">{(p.angle || p.caption).slice(0, 20)}{(p.angle || p.caption).length > 20 ? "..." : ""}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePost(p.id); }}
                              className="hidden group-hover/card:flex items-center justify-center size-4 rounded hover:bg-red-100 shrink-0 transition-colors"
                              title="Delete post"
                            >
                              <XMarkIcon className="size-2.5 text-red-400" />
                            </button>
                          </div>
                          <span className="text-[10px] opacity-70 ml-3.5">{fmtTime(p.scheduled_time)}</span>
                        </div>
                        );
                      })}
                      {/* Add post button — only in empty space */}
                      <button
                        onClick={() => openStudioForSlot(dStr, "09:00")}
                        className={`w-full flex items-center justify-center gap-1 py-2 rounded-md text-[10px] text-[#BBB] hover:bg-[#F3F3F5] hover:text-[#999] transition-all ${
                          dayPosts.length === 0 ? "mt-4" : "mt-1 opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <PlusIcon className="size-3" />
                        Add
                      </button>
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
            {(["draft", "created", "scheduled"] as PostStatus[]).map(status => {
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
                        <span className="text-[10px] text-[#555] truncate">{(p.angle || p.caption).slice(0, 30)}...</span>
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
          <div className="fixed inset-0 z-40 bg-black/20 animate-backdropFade" onClick={() => setShowStudio(false)} />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-[var(--shadow-elevated)] flex flex-col animate-slideIn" onPaste={handlePaste}>
            {/* Header */}
            <div className="shrink-0 bg-white border-b border-[#E5E5EA] px-5 py-3 flex items-center justify-between z-10">
              <h2 className="text-sm font-bold text-[#1B1B1B]">{studioPost.id ? "Edit Post" : "New Post"}</h2>
              <button onClick={() => setShowStudio(false)} className="p-1 rounded-lg hover:bg-[#F3F3F5]">
                <XMarkIcon className="size-5 text-[#7A7A7A]" />
              </button>
            </div>

            {/* Platform tabs — always visible */}
            {(() => {
              const siblings = studioPost.group_id ? getGroupSiblings(studioPost.group_id) : [];
              const hasSiblings = siblings.length > 1;
              const platformOrder: Platform[] = ["x", "linkedin", "instagram", "tiktok"];

              // For linked posts: show platforms with siblings + any with draft captions
              // For single posts: show all platforms as selector
              const tabPlatforms = hasSiblings
                ? platformOrder.filter(p => siblings.some(s => s.platform === p) || draftCaptions[p])
                : platformOrder;

              return (
                <div className="shrink-0 border-b border-[#E5E5EA]">
                  <div className="flex">
                    {tabPlatforms.map(p => {
                      const isActive = studioPost.platform === p;
                      const sibling = siblings.find(s => s.platform === p);
                      const hasDraft = !!draftCaptions[p];
                      const isAdapting = adaptingPlatform === p;
                      return (
                        <button
                          key={p}
                          onClick={() => {
                            if (hasSiblings && sibling) {
                              switchToSibling(p);
                            } else {
                              handlePlatformSwitch(p);
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-semibold transition-colors border-b-2 ${
                            isActive
                              ? "border-[#1B1B1B] text-[#1B1B1B]"
                              : "border-transparent text-[#B0B0B0] hover:text-[#555]"
                          }`}
                        >
                          <span className={`size-2 rounded-full ${isAdapting ? "animate-pulse" : ""}`} style={{ backgroundColor: isActive ? platformColors[p] : hasDraft ? platformColors[p] + "80" : "#D4D4D4" }} />
                          {platformLabels[p]}
                          {hasSiblings && sibling && (
                            <span className={`text-[8px] px-1 py-0.5 rounded-full ${
                              isActive ? "bg-[#F3F3F5]" : "bg-[#EDEDEF]"
                            }`}>
                              {statusLabels[sibling.status]}
                            </span>
                          )}
                          {!hasSiblings && hasDraft && !isActive && (
                            <span className="size-1 rounded-full bg-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {repurposeError && (
              <div className="shrink-0 px-5 py-2 bg-red-50 border-b border-red-100">
                <p className="text-[11px] text-red-500">{repurposeError}</p>
              </div>
            )}

            {/* ═══ EXISTING POST — Clean detail view ═══ */}
            {studioPost.id ? (
              <>
                <div className="flex-1 overflow-y-auto">
                  {/* ── Angle / Idea section ── */}
                  <div className="px-5 pt-4 pb-4 border-b border-[#F0F0F0]">
                    <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2">Idea</p>
                    <textarea
                      value={studioPost.angle || ""}
                      onChange={e => setStudioPost(prev => ({ ...prev, angle: e.target.value }))}
                      placeholder="What's the hook? One punchy line..."
                      className="w-full bg-[#F7F8FA] rounded-lg px-3 py-2.5 text-sm text-[#1B1B1B] leading-relaxed resize-none outline-none placeholder:text-[#CCC] border border-[#E5E5EA] focus:border-[#1B1B1B] transition-colors"
                      rows={2}
                    />
                  </div>

                  {/* ── Caption section ── */}
                  <div className="px-5 pt-4 pb-5 border-b border-[#F0F0F0]">
                    {/* Image preview */}
                    {studioPost.media_data && (
                      <div className="relative rounded-xl overflow-hidden border border-[#E5E5EA] mb-4">
                        <img src={studioPost.media_data} alt="Post media" className="w-full h-36 object-cover" />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <label className="cursor-pointer px-2 py-1 bg-white/90 backdrop-blur-sm text-[9px] font-semibold rounded-lg shadow-sm hover:bg-white transition-colors">
                            Replace
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                          </label>
                          <button onClick={() => setStudioPost(prev => ({ ...prev, media_data: undefined }))} className="px-2 py-1 bg-white/90 backdrop-blur-sm text-[9px] font-semibold text-red-400 rounded-lg shadow-sm hover:bg-white transition-colors">
                            Remove
                          </button>
                        </div>
                        {captionLoading && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-[9px] font-semibold rounded-lg backdrop-blur-sm animate-pulse">
                            Generating captions...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Upload image prompt */}
                    {!studioPost.media_data && (studioPost.post_format === "image" || studioPost.post_format === "video") && (
                      <label className="flex items-center justify-center gap-2 py-5 border border-dashed border-[#E0E0E0] rounded-xl cursor-pointer hover:border-[#B0B0B0] hover:bg-[#FAFAFA] transition-colors mb-4">
                        <PhotoIcon className="size-5 text-[#CCC]" />
                        <span className="text-[11px] text-[#999]">Upload or paste image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                      </label>
                    )}

                    {/* Caption — adapting / generate / edit */}
                    {adaptingPlatform === studioPost.platform ? (
                      <div className="py-6">
                        <div className="flex items-center justify-center gap-2">
                          <ArrowPathIcon className="size-4 text-[#999] animate-spin" />
                          <p className="text-xs text-[#999]">Adapting for {platformLabels[studioPost.platform || "x"]}...</p>
                        </div>
                      </div>
                    ) : !studioPost.caption ? (
                      <div>
                        <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-3">Caption</p>
                        <button
                          onClick={() => generateCaptions()}
                          disabled={captionLoading || !studioPost.angle?.trim()}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40"
                        >
                          <SparklesIcon className="size-4" />
                          {captionLoading ? "Generating captions..." : "Generate Caption from Idea"}
                        </button>
                        {!studioPost.angle?.trim() && (
                          <p className="text-[10px] text-[#BBB] text-center mt-2">Write an idea above first</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider">Caption</p>
                          <button
                            onClick={() => generateCaptions()}
                            disabled={captionLoading}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#7A7A7A] bg-[#F3F3F5] rounded-md hover:bg-[#EBEBEB] transition-colors disabled:opacity-50"
                          >
                            <SparklesIcon className="size-3" />
                            {captionLoading ? "Generating..." : "Regenerate"}
                          </button>
                        </div>
                        <textarea
                          value={studioPost.caption || ""}
                          onChange={e => {
                            const val = e.target.value;
                            setStudioPost(prev => ({ ...prev, caption: val }));
                            // Update draft cache so switching tabs preserves edits
                            if (studioPost.platform) {
                              setDraftCaptions(prev => ({ ...prev, [studioPost.platform!]: val }));
                            }
                          }}
                          placeholder="Write your caption..."
                          className="w-full bg-transparent text-sm text-[#1B1B1B] leading-relaxed resize-none outline-none placeholder:text-[#CCC] min-h-[80px]"
                          rows={3}
                        />
                      </div>
                    )}

                    {captionError && <p className="text-[11px] text-red-500 mt-2">{captionError}</p>}
                    {captions.length > 0 && (
                      <div className="space-y-2 mt-3 pt-3 border-t border-[#F0F0F0]">
                        <p className="text-[10px] font-semibold text-[#AAA] uppercase tracking-wider">Pick a variant</p>
                        {captions.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedCaption(i);
                              setStudioPost(prev => ({ ...prev, caption: c }));
                              if (studioPost.platform) {
                                setDraftCaptions(prev => ({ ...prev, [studioPost.platform!]: c }));
                                if (!sourceCaptionForAdapt) setSourceCaptionForAdapt(c);
                              }
                            }}
                            className={`w-full text-left p-3 rounded-lg border transition-colors text-xs leading-relaxed ${
                              selectedCaption === i ? "border-[#1B1B1B] bg-[#F7F8FA]" : "border-[#E5E5EA] hover:bg-[#FAFAFA]"
                            }`}
                          >
                            {selectedCaption === i && <span className="float-right ml-2"><CheckIcon className="size-3.5 text-emerald-500" /></span>}
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Settings section ── */}
                  <div className="px-5 py-4 space-y-4">
                    {/* Format row */}
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider shrink-0">Format</p>
                      <div className="flex gap-1">
                        {(["text", "image", "article", "video"] as PostFormat[]).map(f => {
                          const Icon = formatIcons[f];
                          const active = studioPost.post_format === f;
                          return (
                            <button
                              key={f}
                              onClick={() => setStudioPost(prev => ({ ...prev, post_format: f }))}
                              className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
                                active
                                  ? "bg-[#1B1B1B] text-white"
                                  : "text-[#999] hover:bg-[#F3F3F5]"
                              }`}
                            >
                              <Icon className="size-3" />
                              {postFormatLabels[f]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[#F0F0F0]" />

                    {/* Type row */}
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider shrink-0">Type</p>
                      <div className="flex gap-1">
                        {(["educational", "social_proof", "personal", "promotional"] as ContentType[]).map(t => {
                          const active = studioPost.content_type === t;
                          return (
                            <button
                              key={t}
                              onClick={() => setStudioPost(prev => ({ ...prev, content_type: t }))}
                              className={`px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
                                active ? "text-white" : "text-[#999] hover:bg-[#F3F3F5]"
                              }`}
                              style={active ? { backgroundColor: contentTypeColors[t] } : {}}
                            >
                              {contentTypeLabels[t]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[#F0F0F0]" />

                    {/* Schedule row */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider">Schedule</p>
                        {/* Slot score inline */}
                        {studioPost.platform && studioPost.scheduled_date && studioPost.scheduled_time && (() => {
                          const score = getSlotScore(studioPost.platform, new Date(studioPost.scheduled_date + "T00:00:00").getDay(), parseInt(studioPost.scheduled_time));
                          return score > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[#999]">Slot score</span>
                              <span className={`text-[10px] font-bold ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-[#999]"}`}>{score}/100</span>
                              {score >= 80 && <span className="text-[8px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Optimal</span>}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={studioPost.scheduled_date || ""}
                          onChange={e => setStudioPost(prev => ({ ...prev, scheduled_date: e.target.value }))}
                          className="w-full px-3 py-2 text-xs border border-[#E5E5EA] rounded-lg bg-white outline-none focus:border-[#1B1B1B] transition-colors"
                        />
                        <input
                          type="time"
                          value={studioPost.scheduled_time || ""}
                          onChange={e => setStudioPost(prev => ({ ...prev, scheduled_time: e.target.value }))}
                          className="w-full px-3 py-2 text-xs border border-[#E5E5EA] rounded-lg bg-white outline-none focus:border-[#1B1B1B] transition-colors"
                        />
                      </div>

                      {/* Suggested times from analytics */}
                      {studioPost.platform && studioPost.scheduled_date && (() => {
                        const dayOfWeek = new Date(studioPost.scheduled_date + "T00:00:00").getDay();
                        const bestTimes = getBestTimes(studioPost.platform, dayOfWeek);
                        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                        // Also show top slots for this platform (different days)
                        const topSlots = getTopSlots(studioPost.platform).filter(s => s.day !== dayOfWeek).slice(0, 2);

                        return bestTimes.length > 0 || topSlots.length > 0 ? (
                          <div className="mt-2.5">
                            {bestTimes.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] text-[#BBB]">Best for {dayNames[dayOfWeek]}:</span>
                                {bestTimes.map((t, i) => {
                                  const timeStr = t.time || `${t.hour.toString().padStart(2, "0")}:${(t.minute || 0).toString().padStart(2, "0")}`;
                                  const displayHour = t.hour % 12 || 12;
                                  const displayMin = (t.minute || 0).toString().padStart(2, "0");
                                  const ampm = t.hour >= 12 ? "PM" : "AM";
                                  return (
                                  <button
                                    key={i}
                                    onClick={() => setStudioPost(prev => ({ ...prev, scheduled_time: timeStr }))}
                                    className={`text-[9px] font-semibold px-2 py-1 rounded-md transition-colors ${
                                      studioPost.scheduled_time === timeStr
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-[#F3F3F5] text-[#666] hover:bg-[#EBEBEB]"
                                    }`}
                                  >
                                    {displayHour}:{displayMin} {ampm}
                                    <span className="ml-1 text-[8px] opacity-60">{t.score}</span>
                                  </button>
                                  );
                                })}
                              </div>
                            )}
                            {bestTimes.length === 0 && topSlots.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] text-[#BBB]">Try instead:</span>
                                {topSlots.map((t, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      // Find the date for this day of week in the current week context
                                      const current = new Date(studioPost.scheduled_date + "T00:00:00");
                                      const currentDay = current.getDay();
                                      const diff = t.day - currentDay;
                                      const target = new Date(current);
                                      target.setDate(target.getDate() + diff);
                                      const timeStr = t.time || `${t.hour.toString().padStart(2, "0")}:${(t.minute || 0).toString().padStart(2, "0")}`;
                                      setStudioPost(prev => ({
                                        ...prev,
                                        scheduled_date: toDateStr(target),
                                        scheduled_time: timeStr
                                      }));
                                    }}
                                    className="text-[9px] font-semibold px-2 py-1 rounded-md bg-[#F3F3F5] text-[#666] hover:bg-[#EBEBEB] transition-colors"
                                  >
                                    {dayNames[t.day]} {t.hour % 12 || 12}:{(t.minute || 0).toString().padStart(2, "0")}{t.hour >= 12 ? "pm" : "am"}
                                    <span className="ml-1 text-[8px] opacity-60">{t.score}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[#F0F0F0]" />

                    {/* Status row */}
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider shrink-0">Status</p>
                      <div className="flex gap-1">
                        {(["draft", "created", "scheduled"] as PostStatus[]).map(s => {
                          const active = studioPost.status === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setStudioPost(prev => ({ ...prev, status: s }))}
                              className={`px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
                                active ? "text-white" : "text-[#999] hover:bg-[#F3F3F5]"
                              }`}
                              style={active ? { backgroundColor: statusColors[s] } : {}}
                            >
                              {statusLabels[s]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-[#E5E5EA] px-5 py-3 bg-white flex items-center gap-2">
                  <button
                    onClick={repurposePost}
                    disabled={repurposeLoading || !studioPost.caption?.trim()}
                    className="flex items-center gap-1 px-3 py-2.5 text-[10px] font-semibold border border-[#E5E5EA] text-[#7A7A7A] rounded-lg hover:bg-[#F5F5F5] transition-colors disabled:opacity-40"
                  >
                    <ArrowPathIcon className={`size-3 ${repurposeLoading ? "animate-spin" : ""}`} />
                    {repurposeLoading ? "..." : "Repurpose"}
                  </button>
                  <button
                    onClick={handleSavePost}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => handleDeletePost(studioPost.id!)}
                    className="p-2.5 text-[#CCC] hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete post"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* ═══ NEW POST — Step-by-step wizard ═══ */}

                {/* Step progress */}
                <div className="shrink-0 px-5 pt-4 pb-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onClick={() => setStudioStep(s)}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        s <= studioStep ? "bg-[#1B1B1B]" : "bg-[#E5E5EA]"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                  {/* ── STEP 1: Post Format ── */}
                  {studioStep === 1 && (
                    <div className="animate-fadeIn">
                      <p className="text-lg font-bold text-[#1B1B1B] mb-1">What type of post?</p>
                      <p className="text-xs text-[#7A7A7A] mb-5">Choose the format first — this determines what content you need.</p>
                      <div className="grid grid-cols-2 gap-3">
                        {(["text", "image", "article", "video"] as PostFormat[]).map(f => {
                          const Icon = formatIcons[f];
                          const descriptions: Record<PostFormat, string> = {
                            text: "Pure text post — the caption IS the content",
                            image: "Photo or graphic with a caption",
                            article: "Long-form article or blog post",
                            video: "Reel, TikTok, or video content",
                          };
                          return (
                            <button
                              key={f}
                              onClick={() => {
                                setStudioPost(prev => ({ ...prev, post_format: f }));
                                setStudioStep(2);
                              }}
                              className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all hover:shadow-sm text-left ${
                                studioPost.post_format === f
                                  ? "border-[#1B1B1B] bg-[#F7F8FA]"
                                  : "border-[#E5E5EA] hover:border-[#C5C5C5]"
                              }`}
                            >
                              <Icon className="size-6 text-[#1B1B1B]" />
                              <div>
                                <p className="text-xs font-semibold text-[#1B1B1B]">{postFormatLabels[f]}</p>
                                <p className="text-[10px] text-[#7A7A7A] mt-0.5">{descriptions[f]}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Content Type ── */}
                  {studioStep === 2 && (
                    <div className="animate-fadeIn">
                      <p className="text-lg font-bold text-[#1B1B1B] mb-1">What's the angle?</p>
                      <p className="text-xs text-[#7A7A7A] mb-5">Pick the content category — this helps AI generate the right tone.</p>
                      <div className="space-y-2.5">
                        {(["educational", "social_proof", "personal", "promotional"] as ContentType[]).map(t => {
                          const descriptions: Record<ContentType, string> = {
                            educational: "Teach something — frameworks, insights, how-tos",
                            social_proof: "Results, case studies, before/after",
                            personal: "Behind the scenes, opinions, agency life",
                            promotional: "Offers, availability, CTAs",
                          };
                          return (
                            <button
                              key={t}
                              onClick={() => {
                                setStudioPost(prev => ({ ...prev, content_type: t }));
                                const fmt = studioPost.post_format;
                                setStudioStep(fmt === "image" || fmt === "video" ? 3 : 4);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all hover:shadow-sm text-left ${
                                studioPost.content_type === t
                                  ? "border-[#1B1B1B] bg-[#F7F8FA]"
                                  : "border-[#E5E5EA] hover:border-[#C5C5C5]"
                              }`}
                            >
                              <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: contentTypeColors[t] }} />
                              <div>
                                <p className="text-xs font-semibold text-[#1B1B1B]">{contentTypeLabels[t]}</p>
                                <p className="text-[10px] text-[#7A7A7A]">{descriptions[t]}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: Media Upload (image/video only) ── */}
                  {studioStep === 3 && (
                    <div className="animate-fadeIn">
                      <p className="text-lg font-bold text-[#1B1B1B] mb-1">
                        {studioPost.post_format === "video" ? "Add a thumbnail" : "Upload your image"}
                      </p>
                      <p className="text-xs text-[#7A7A7A] mb-5">
                        {studioPost.post_format === "image"
                          ? "Upload the image — AI will write captions based on it automatically."
                          : "Add a thumbnail for the video — or skip this step."}
                      </p>

                      {studioPost.media_data ? (
                        <div className="relative rounded-xl overflow-hidden border border-[#E5E5EA] bg-[#FAFAFA] mb-4">
                          <img src={studioPost.media_data} alt="Post media" className="w-full h-56 object-cover" />
                          <div className="absolute top-2 right-2 flex gap-1.5">
                            <label className="cursor-pointer px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-semibold rounded-lg shadow-sm hover:bg-white transition-colors">
                              Replace
                              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                            </label>
                            <button onClick={() => setStudioPost(prev => ({ ...prev, media_data: undefined }))} className="px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-red-500 rounded-lg shadow-sm hover:bg-white transition-colors">
                              Remove
                            </button>
                          </div>
                          {captionLoading && (
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-[9px] font-semibold rounded-lg backdrop-blur-sm animate-pulse">
                              Generating captions from image...
                            </div>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 py-12 border-2 border-dashed border-[#E5E5EA] rounded-xl cursor-pointer hover:border-[#C5C5C5] hover:bg-[#FAFAFA] transition-colors mb-4">
                          <PhotoIcon className="size-10 text-[#CCC]" />
                          <span className="text-xs text-[#7A7A7A]">Click to upload or paste a screenshot</span>
                          <span className="text-[10px] text-[#AAA]">PNG, JPG, WebP — captions auto-generate</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                        </label>
                      )}

                      <button
                        onClick={() => setStudioStep(4)}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
                      >
                        {studioPost.media_data ? "Continue" : "Skip — add image later"}
                      </button>
                    </div>
                  )}

                  {/* ── STEP 4: Caption ── */}
                  {studioStep === 4 && (
                    <div className="animate-fadeIn">
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: platformColors[studioPost.platform || "x"] + "15", color: platformColors[studioPost.platform || "x"] }}>
                          {platformLabels[studioPost.platform || "x"]}
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: contentTypeColors[studioPost.content_type || "educational"] + "15", color: contentTypeColors[studioPost.content_type || "educational"] }}>
                          {contentTypeLabels[studioPost.content_type || "educational"]}
                        </span>
                        <span className="text-[9px] font-semibold text-[#7A7A7A] bg-[#F3F3F5] px-1.5 py-0.5 rounded-full">
                          {postFormatLabels[studioPost.post_format || "text"]}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <label className={`${labelClass} !mb-0`}>Caption</label>
                        <button
                          onClick={() => generateCaptions()}
                          disabled={captionLoading}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
                        >
                          <SparklesIcon className="size-3" />
                          {captionLoading ? "Generating..." : "Generate"}
                        </button>
                      </div>
                      <textarea
                        value={studioPost.caption || ""}
                        onChange={e => {
                          const val = e.target.value;
                          setStudioPost(prev => ({ ...prev, caption: val }));
                          if (studioPost.platform) {
                            setDraftCaptions(prev => ({ ...prev, [studioPost.platform!]: val }));
                          }
                        }}
                        placeholder={studioPost.platform === "x" ? "Write your tweet..." : "Write your caption..."}
                        className={`${textareaClass} min-h-[100px]`}
                        rows={4}
                        autoFocus
                      />

                      {captionError && <p className="text-[11px] text-red-500 mt-2">{captionError}</p>}
                      {captions.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">Pick a variant</p>
                          {captions.map((c, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedCaption(i);
                                setStudioPost(prev => ({ ...prev, caption: c }));
                                if (studioPost.platform) {
                                  setDraftCaptions(prev => ({ ...prev, [studioPost.platform!]: c }));
                                  if (!sourceCaptionForAdapt) setSourceCaptionForAdapt(c);
                                }
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-colors text-xs leading-relaxed ${
                                selectedCaption === i ? "border-[#1B1B1B] bg-[#F7F8FA]" : "border-[#E5E5EA] hover:bg-[#FAFAFA]"
                              }`}
                            >
                              {selectedCaption === i && <span className="float-right ml-2"><CheckIcon className="size-3.5 text-emerald-500" /></span>}
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── STEP 5: Schedule & Status ── */}
                  {studioStep === 5 && (
                    <div className="animate-fadeIn">
                      <p className="text-lg font-bold text-[#1B1B1B] mb-1">Schedule & status</p>
                      <p className="text-xs text-[#7A7A7A] mb-5">Set when this goes out and mark its current status.</p>

                      {!studioPost.group_id && (
                        <div className="mb-5">
                          <label className={labelClass}>Platform</label>
                          <div className="flex gap-2">
                            {(["x", "linkedin", "instagram", "tiktok"] as Platform[]).map(p => (
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
                      )}

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className={labelClass}>Date</label>
                          <input type="date" value={studioPost.scheduled_date || ""} onChange={e => setStudioPost(prev => ({ ...prev, scheduled_date: e.target.value }))} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Time</label>
                          <input type="time" value={studioPost.scheduled_time || ""} onChange={e => setStudioPost(prev => ({ ...prev, scheduled_time: e.target.value }))} className={inputClass} />
                        </div>
                      </div>

                      {studioPost.platform && studioPost.scheduled_date && studioPost.scheduled_time && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F7F8FA] mb-5">
                          <ClockIcon className="size-3.5 text-[#7A7A7A]" />
                          <span className="text-[11px] text-[#7A7A7A]">
                            Slot score: <span className="font-semibold text-[#1B1B1B]">{getSlotScore(studioPost.platform, new Date(studioPost.scheduled_date + "T00:00:00").getDay(), parseInt(studioPost.scheduled_time)) || "—"}</span>/100
                          </span>
                          {getSlotScore(studioPost.platform, new Date(studioPost.scheduled_date + "T00:00:00").getDay(), parseInt(studioPost.scheduled_time)) >= 80 && (
                            <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Optimal</span>
                          )}
                        </div>
                      )}

                      <label className={labelClass}>Status</label>
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {(["draft", "created", "scheduled"] as PostStatus[]).map(s => (
                          <button
                            key={s}
                            onClick={() => setStudioPost(prev => ({ ...prev, status: s }))}
                            className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-full border transition-colors ${
                              studioPost.status === s ? "text-white" : "border-[#E5E5EA] text-[#7A7A7A] hover:bg-[#F5F5F5]"
                            }`}
                            style={studioPost.status === s ? { backgroundColor: statusColors[s], borderColor: statusColors[s] } : {}}
                          >
                            {statusLabels[s]}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleSavePost}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
                      >
                        <CheckIcon className="size-3.5" />
                        {saving ? "Saving..." : "Save Post"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Step navigation footer */}
                <div className="shrink-0 border-t border-[#E5E5EA] px-5 py-3 bg-white flex items-center justify-between">
                  <button
                    onClick={() => setStudioStep(s => Math.max(1, s - 1))}
                    disabled={studioStep === 1}
                    className="px-3 py-1.5 text-[11px] font-medium text-[#7A7A7A] hover:text-[#1B1B1B] disabled:opacity-30 transition-colors"
                  >
                    Back
                  </button>
                  <div className="text-[10px] text-[#AAA]">
                    {studioStep === 1 && "Format"}
                    {studioStep === 2 && "Content type"}
                    {studioStep === 3 && "Media"}
                    {studioStep === 4 && "Caption"}
                    {studioStep === 5 && "Schedule"}
                  </div>
                  {studioStep < 5 ? (
                    <button
                      onClick={() => {
                        if (studioStep === 2 && studioPost.post_format !== "image" && studioPost.post_format !== "video") {
                          setStudioStep(4);
                        } else {
                          setStudioStep(s => Math.min(5, s + 1));
                        }
                      }}
                      className="px-3 py-1.5 text-[11px] font-semibold text-[#1B1B1B] hover:bg-[#F5F5F5] rounded-lg transition-colors"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={handleSavePost}
                      disabled={saving}
                      className="px-3 py-1.5 text-[11px] font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ═══ IDEA ENGINE (slide-in drawer) ═══ */}
      {showIdeas && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 animate-backdropFade" onClick={() => setShowIdeas(false)} />
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

      {/* ═══ WEEKLY DRAFT (slide-in drawer) ═══ */}
      {showWeeklyDraft && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 animate-backdropFade" onClick={() => { if (!draftLoading) setShowWeeklyDraft(false); }} />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-[var(--shadow-elevated)] flex flex-col animate-slideIn">
            {/* Header */}
            <div className="shrink-0 bg-white border-b border-[#E5E5EA] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BoltIcon className="size-4 text-amber-500" />
                <div>
                  <h2 className="text-sm font-bold text-[#1B1B1B]">Weekly Draft</h2>
                  <p className="text-[10px] text-[#7A7A7A]">
                    {weekDates[0].toLocaleDateString("en-GB", { month: "short", day: "numeric" })} – {weekDates[6].toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {draftPosts.length > 0 && !draftLoading && (
                  <button
                    onClick={generateWeeklyDraft}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold border border-[#E5E5EA] text-[#7A7A7A] rounded-lg hover:bg-[#F5F5F5] transition-colors"
                  >
                    <SparklesIcon className="size-3" />
                    Regenerate
                  </button>
                )}
                <button onClick={() => setShowWeeklyDraft(false)} className="p-1 rounded-lg hover:bg-[#F3F3F5]">
                  <XMarkIcon className="size-5 text-[#7A7A7A]" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {draftError && (
                <p className="text-[11px] text-red-500 mb-3">{draftError}</p>
              )}

              {draftLoading && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7F8FA] rounded-full">
                      <SparklesIcon className="size-4 text-amber-500 animate-pulse" />
                      <span className="text-xs font-medium text-[#7A7A7A]">Analysing performance & generating drafts...</span>
                    </div>
                  </div>
                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div key={i} className="animate-pulse border border-[#E5E5EA] rounded-xl p-4">
                      <div className="flex gap-2 mb-3">
                        <div className="h-3 w-16 bg-[#F0F0F0] rounded-full" />
                        <div className="h-3 w-14 bg-[#F0F0F0] rounded-full" />
                        <div className="h-3 w-12 bg-[#F0F0F0] rounded-full" />
                      </div>
                      <div className="h-3 w-3/4 bg-[#F0F0F0] rounded mb-2" />
                      <div className="h-10 w-full bg-[#F0F0F0] rounded" />
                    </div>
                  ))}
                </div>
              )}

              {!draftLoading && draftPosts.length > 0 && (() => {
                // Group by date
                const byDate: Record<string, { draft: typeof draftPosts[0]; index: number }[]> = {};
                draftPosts.forEach((d, i) => {
                  if (!byDate[d.scheduled_date]) byDate[d.scheduled_date] = [];
                  byDate[d.scheduled_date].push({ draft: d, index: i });
                });
                const sortedDates = Object.keys(byDate).sort();

                return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
                      {draftPosts.filter(d => d.selected).length} of {draftPosts.length} ideas · {sortedDates.length} days
                    </p>
                    <button
                      onClick={() => setDraftPosts(prev => prev.map(d => ({ ...d, selected: !prev.every(p => p.selected) })))}
                      className="text-[10px] font-semibold text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
                    >
                      {draftPosts.every(d => d.selected) ? "Deselect all" : "Select all"}
                    </button>
                  </div>

                  {sortedDates.map(date => {
                    const dayItems = byDate[date];
                    const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
                    const allSelected = dayItems.every(d => d.draft.selected);

                    return (
                      <div key={date}>
                        {/* Day header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-[#1B1B1B]">{dayLabel}</h4>
                            <span className="text-[9px] text-[#AAA]">{dayItems.length} posts</span>
                          </div>
                          <button
                            onClick={() => {
                              const indices = dayItems.map(d => d.index);
                              setDraftPosts(prev => prev.map((d, i) => indices.includes(i) ? { ...d, selected: !allSelected } : d));
                            }}
                            className="text-[9px] font-semibold text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
                          >
                            {allSelected ? "Deselect day" : "Select day"}
                          </button>
                        </div>

                        {/* Day posts */}
                        <div className="space-y-2 mb-1">
                          {dayItems.map(({ draft, index }) => {
                            const Icon = formatIcons[draft.post_format] || DocumentTextIcon;
                            const fmtTimeStr = (() => { const [h,m] = draft.scheduled_time.split(":").map(Number); return `${h % 12 || 12}:${m.toString().padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`; })();

                            return (
                              <div
                                key={index}
                                className={`border rounded-lg px-3 py-2.5 transition-all ${
                                  draft.selected
                                    ? "border-[#D4D4D4] bg-white"
                                    : "border-[#E5E5EA] bg-[#FAFAFA] opacity-40"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => toggleDraft(index)}
                                    className={`size-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                      draft.selected ? "bg-[#1B1B1B] border-[#1B1B1B]" : "border-[#D4D4D4]"
                                    }`}
                                  >
                                    {draft.selected && <CheckIcon className="size-2.5 text-white" />}
                                  </button>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="text-[9px] font-semibold text-[#555]">{fmtTimeStr}</span>
                                      <span
                                        className="text-[8px] font-semibold px-1 py-0.5 rounded-full"
                                        style={{ backgroundColor: contentTypeColors[draft.content_type] + "15", color: contentTypeColors[draft.content_type] }}
                                      >
                                        {contentTypeLabels[draft.content_type]}
                                      </span>
                                      <span className="flex items-center gap-0.5 text-[8px] font-semibold text-[#999] bg-[#F3F3F5] px-1 py-0.5 rounded-full">
                                        <Icon className="size-2" />
                                        {postFormatLabels[draft.post_format]}
                                      </span>
                                    </div>
                                    <p className="text-[11px] font-semibold text-[#1B1B1B] leading-snug">{draft.angle}</p>
                                    <p className="text-[10px] text-[#7A7A7A] mt-0.5 leading-relaxed">{draft.brief}</p>
                                  </div>

                                  {/* Remove */}
                                  <button onClick={() => removeDraft(index)} className="p-0.5 rounded hover:bg-red-50 shrink-0">
                                    <TrashIcon className="size-3 text-[#CCC] hover:text-red-400" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                );
              })()}

              {!draftLoading && draftPosts.length === 0 && !draftError && (
                <div className="text-center py-10">
                  <BoltIcon className="size-8 text-[#DDD] mx-auto mb-2" />
                  <p className="text-xs text-[#AAA]">Generating your weekly content plan...</p>
                </div>
              )}
            </div>

            {/* Footer — Apply */}
            {!draftLoading && draftPosts.length > 0 && (
              <div className="shrink-0 border-t border-[#E5E5EA] px-5 py-4 bg-white">
                <button
                  onClick={applyDrafts}
                  disabled={draftSaving || draftPosts.filter(d => d.selected).length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
                >
                  <CheckIcon className="size-3.5" />
                  {draftSaving ? "Adding to calendar..." : `Add ${draftPosts.filter(d => d.selected).length} ideas to calendar`}
                </button>
                <p className="text-[10px] text-[#AAA] text-center mt-2">
                  Ideas land as X posts — click each to write the caption, then Repurpose to all platforms
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
