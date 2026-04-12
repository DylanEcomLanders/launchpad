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
  Cog6ToothIcon,
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
  type CaptionLength,
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
import {
  type VoiceProfile,
  getVoiceProfile,
  saveVoiceProfile,
} from "@/lib/sales-engine/voice-profiles";

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

function cardColors(status: PostStatus): { bg: string; text: string; dot: string; opacity: number } {
  switch (status) {
    case "scheduled":
      return { bg: "#ECFDF5", text: "#059669", dot: "#10B981", opacity: 0.5 }; // green, 50% opacity
    case "saved":
      return { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6", opacity: 1 }; // blue = Ready to Post
    default: // draft
      return { bg: "#F3F3F5", text: "#7A7A7A", dot: "#94A3B8", opacity: 1 }; // grey
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

  // Caption length
  const [captionLength, setCaptionLength] = useState<CaptionLength>("medium");
  // Per-platform caption variants from generation
  const [platformCaptions, setPlatformCaptions] = useState<Partial<Record<Platform, string[]>>>({});
  const [activeCaptionPlatform, setActiveCaptionPlatform] = useState<Platform>("x");

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
  const [syncing, setSyncing] = useState(false);
  const [typefullyResult, setTypefullyResult] = useState<{ sent: number; failed: number; failedErrors?: string[] } | null>(null);
  const [showTypefullyModal, setShowTypefullyModal] = useState(false);
  const [typefullyPlatforms, setTypefullyPlatforms] = useState<Set<Platform>>(new Set(["x", "linkedin"]));
  const [typefullyAdapting, setTypefullyAdapting] = useState(false);
  const [autoPlugX, setAutoPlugX] = useState(false);
  const [autoRetweetX, setAutoRetweetX] = useState(false);

  // Bulk upload state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkStartDate, setBulkStartDate] = useState<string>(toDateStr(new Date()));
  const [bulkPostsPerDay, setBulkPostsPerDay] = useState<number>(3);
  const [bulkSkipWeekends, setBulkSkipWeekends] = useState<boolean>(false);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  // Text import (Grok flow)
  const [bulkMode, setBulkMode] = useState<"images" | "text">("text");
  const [bulkTextFile, setBulkTextFile] = useState<File | null>(null);
  const [bulkParsedCaptions, setBulkParsedCaptions] = useState<string[]>([]);
  const [bulkParsing, setBulkParsing] = useState(false);

  // Persist X automation toggles
  useEffect(() => {
    setAutoPlugX(localStorage.getItem("typefully_autoplug_x") === "1");
    setAutoRetweetX(localStorage.getItem("typefully_autort_x") === "1");
  }, []);
  useEffect(() => { localStorage.setItem("typefully_autoplug_x", autoPlugX ? "1" : "0"); }, [autoPlugX]);
  useEffect(() => { localStorage.setItem("typefully_autort_x", autoRetweetX ? "1" : "0"); }, [autoRetweetX]);

  // Voice profile state
  const [showVoice, setShowVoice] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [voiceSaving, setVoiceSaving] = useState(false);
  const voiceFileInputRef = useRef<HTMLInputElement | null>(null);
  // Track AI-generated caption for edit detection
  const [aiGeneratedCaption, setAiGeneratedCaption] = useState<string | null>(null);

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
    // Migrate old posts: ensure creator + always target X + LinkedIn by default
    let cleaned = data.map(p => ({
      ...p,
      creator: p.creator || ("ajay" as Creator),
      platforms:
        Array.isArray(p.platforms) && p.platforms.length > 0
          ? (Array.from(new Set([...p.platforms, "x", "linkedin"])) as Platform[])
          : (["x", "linkedin"] as Platform[]),
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

    // Save if anything was cleaned up or backfilled
    const needsBackfill = data.some(
      p => !p.creator || !Array.isArray(p.platforms) || !p.platforms.includes("x") || !p.platforms.includes("linkedin")
    );
    if (keep.length !== data.length || needsBackfill) {
      await savePosts(keep);
    }
    setAllPosts(keep);
    setLoading(false);
  }, []);

  useEffect(() => { if (pinUnlocked) load(); }, [load, pinUnlocked]);

  // Load voice profile when creator changes
  useEffect(() => {
    if (!activeCreator) return;
    getVoiceProfile(activeCreator).then(setVoiceProfile);
  }, [activeCreator]);

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
    const platforms: Platform[] = ["linkedin", "x"];
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
      // Always default to both platforms — UI no longer lets you pick
      setStudioPost({ ...post, platforms: post.platforms?.length ? post.platforms : ["x", "linkedin"] });
      setSelectedCaption(-1);
      setDraftCaptions(post.platform_captions || (post.caption ? { [post.platform]: post.caption } : {}));
      setDraftFormats(post.post_format ? { [post.platform]: post.post_format } : {});
      setSourceCaptionForAdapt(post.caption || "");
    } else {
      setStudioPost({
        id: "",
        creator: creator,
        platform: "x",
        platforms: ["x", "linkedin"],
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
      setDraftCaptions({});
      setDraftFormats({});
      setSourceCaptionForAdapt("");
    }
    setCaptions([]);
    setCaptionError("");
    setPlatformCaptions({});
    setActiveCaptionPlatform("x");
    setAdaptingPlatform(null);
    adaptRequestRef.current = 0;
    setShowStudio(true);
  }

  function openStudioForSlot(date: string, time: string) {
    setStudioPost({
      id: "",
      creator: creator,
      platform: "x",
      platforms: ["x", "linkedin"],
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
    setPlatformCaptions({});
    setActiveCaptionPlatform("x");
    setSelectedCaption(-1);
    setDraftCaptions({});
    setDraftFormats({});
    setAdaptingPlatform(null);
    setSourceCaptionForAdapt("");
    adaptRequestRef.current = 0;
    setShowStudio(true);
  }

  async function handleSavePost() {
    const postPlatforms = studioPost.platforms || (studioPost.platform ? [studioPost.platform] : ["x"]);
    if (postPlatforms.length === 0 || !studioPost.scheduled_date) return;
    setSaving(true);
    const now = new Date().toISOString();

    // Both X and LinkedIn captions live in draftCaptions now.
    const mergedCaptions: Record<string, string> = { ...draftCaptions };
    const fallbackCaption = mergedCaptions.x || mergedCaptions.linkedin || studioPost.caption || "";

    const post: ContentPost = {
      id: studioPost.id || uuid(),
      creator: studioPost.creator || creator,
      group_id: studioPost.group_id,
      platform: postPlatforms[0] as Platform,
      platforms: postPlatforms as Platform[],
      content_type: studioPost.content_type || "educational",
      post_format: studioPost.post_format || "text",
      angle: studioPost.angle || "",
      caption: fallbackCaption,
      platform_captions: mergedCaptions as Record<Platform, string>,
      // Preserve existing scheduled state. Otherwise: if there's a real
      // caption, mark as 'saved' (ready to schedule). Empty caption stays draft.
      status: studioPost.status === "scheduled"
        ? "scheduled"
        : studioPost.status === "saved"
          ? "saved"
          : "draft",
      scheduled_date: studioPost.scheduled_date!,
      scheduled_time: studioPost.scheduled_time || "09:00",
      media_url: studioPost.media_url,
      media_data: studioPost.media_data,
      media_data_list: studioPost.media_data_list,
      analytics_score: studioPost.analytics_score || getSlotScore(
        postPlatforms[0] as Platform,
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

    setAiGeneratedCaption(null);

    setSaving(false);
    setShowStudio(false);
  }

  async function handleDeletePost(id: string) {
    const updated = allPosts.filter(p => p.id !== id);
    setAllPosts(updated);
    await savePosts(updated);
    setShowStudio(false);
  }

  // ── Typefully: Open platform picker ──
  function openTypefullyScheduler() {
    // Only "Ready to Post" (saved) posts get scheduled
    const readyPosts = weekPosts.filter(p => p.status === "saved" && p.caption?.trim());
    if (readyPosts.length === 0) {
      alert("No posts marked as Ready to Post. Mark posts as ready first (blue) before scheduling.");
      return;
    }
    // Filter out posts scheduled in the past
    const now = new Date();
    const future = readyPosts.filter(p => {
      const postDate = new Date(`${p.scheduled_date}T${p.scheduled_time || "09:00"}:00`);
      return postDate > now;
    });
    if (future.length === 0) {
      alert("All Ready to Post posts are in the past. Move them to a future date first.");
      return;
    }
    setShowTypefullyModal(true);
  }

  function toggleTypefullyPlatform(p: Platform) {
    setTypefullyPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  // ── Typefully: Schedule posts to selected platforms ──
  // Creates ONE SEPARATE DRAFT PER PLATFORM so each gets its own caption and image.
  async function scheduleToTypefully() {
    if (typefullyLoading) return; // hard guard against double-firing
    const selectedPlatforms = Array.from(typefullyPlatforms);
    if (selectedPlatforms.length === 0) {
      alert("Select at least one platform");
      return;
    }

    // Only schedule posts marked as "Ready to Post" (status === "saved")
    const now = new Date();
    const schedulable = weekPosts.filter(p => {
      if (!p.caption?.trim()) return false;
      if (p.status !== "saved") return false; // only Ready to Post (blue) posts
      const postDate = new Date(`${p.scheduled_date}T${p.scheduled_time || "09:00"}:00`);
      return postDate > now;
    });

    if (schedulable.length === 0) {
      alert("No Ready to Post posts found. Mark posts as ready (blue) before scheduling.");
      return;
    }

    setTypefullyLoading(true);
    setTypefullyResult(null);
    setShowTypefullyModal(false);

    try {
      // Step 1: Get social sets
      const setsRes = await fetch("/api/typefully?action=social-sets");
      const setsData = await setsRes.json();
      if (!setsRes.ok) throw new Error(setsData.error || "Failed to load Typefully accounts");
      const sets = setsData.sets;
      if (!sets || sets.length === 0) throw new Error("No Typefully accounts found.");
      const socialSetId = sets[0].id;

      // Step 2: Upload images server-side (base64 → API route → Typefully S3)
      // Each post can have up to 4 images.
      const mediaIdsByPost: Record<string, string[]> = {};
      for (const p of schedulable) {
        const images = p.media_data_list && p.media_data_list.length > 0
          ? p.media_data_list
          : (p.media_data ? [p.media_data] : []);
        if (images.length === 0) continue;
        const ids: string[] = [];
        for (const [idx, img] of images.entries()) {
          try {
            console.log(`[Typefully] Uploading image ${idx + 1}/${images.length} for post ${p.id}...`);
            const uploadRes = await fetch("/api/typefully", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "upload-media", social_set_id: socialSetId, base64_data: img }),
            });
            const uploadData = await uploadRes.json();
            console.log(`[Typefully] Upload response:`, uploadRes.status, uploadData);
            if (uploadRes.ok && uploadData.media_id) {
              ids.push(uploadData.media_id);
            } else {
              console.error(`[Typefully] Image upload failed:`, uploadData);
            }
          } catch (e) {
            console.error(`[Typefully] Image upload exception for post ${p.id}:`, e);
          }
        }
        if (ids.length > 0) mediaIdsByPost[p.id] = ids;
      }
      // Backwards-compat alias for the polling step below
      const mediaIds: Record<string, string> = {};
      for (const [pid, ids] of Object.entries(mediaIdsByPost)) {
        for (const id of ids) mediaIds[`${pid}:${id}`] = id;
      }

      // Step 2b: Wait for all uploaded media to finish processing
      if (Object.keys(mediaIds).length > 0) {
        console.log(`[Typefully] Waiting for ${Object.keys(mediaIds).length} image(s) to process...`);
        for (const [postId, mediaId] of Object.entries(mediaIds)) {
          let ready = false;
          for (let attempt = 0; attempt < 15; attempt++) {
            try {
              const statusRes = await fetch(`/api/typefully?action=media-status&social_set_id=${socialSetId}&media_id=${mediaId}`);
              const statusData = await statusRes.json();
              console.log(`[Typefully] Media ${mediaId} status:`, statusData.status || statusData);
              if (statusData.status === "ready" || statusData.status === "completed" || statusData.status === "processed") {
                ready = true;
                break;
              }
            } catch (e) {
              console.warn(`[Typefully] Media status check failed:`, e);
            }
            await new Promise(r => setTimeout(r, 2000)); // wait 2s between polls
          }
          if (!ready) {
            console.warn(`[Typefully] Media ${mediaId} still processing after 30s, proceeding anyway`);
          }
        }
      }

      // Step 3: Create ONE DRAFT PER PLATFORM per post (separate drafts = guaranteed different captions)
      let successCount = 0;
      let failCount = 0;
      const failedErrors: string[] = [];
      // Track which posts had EVERY targeted platform succeed — only those
      // get marked as scheduled, so partial failures stay re-schedulable.
      const fullySuccessfulPostIds = new Set<string>();
      // Per-post map of platform → newly created Typefully draft id
      const newDraftIdsByPost: Record<string, Partial<Record<Platform, string>>> = {};

      for (const p of schedulable) {
        // If post has explicit platforms, intersect with modal selection.
        // Otherwise (legacy posts with only `p.platform` set), trust the modal selection.
        const hasExplicit = Array.isArray(p.platforms) && p.platforms.length > 0;
        const targetPlats = hasExplicit
          ? p.platforms!.filter((pp: Platform) => selectedPlatforms.includes(pp))
          : selectedPlatforms;
        if (targetPlats.length === 0) continue;
        let postAllSucceeded = true;

        const timeParts = (p.scheduled_time || "09:00").split(":");
        const hh = (timeParts[0] || "09").padStart(2, "0");
        const mm = (timeParts[1] || "00").padStart(2, "0");
        const publishAt = new Date(`${p.scheduled_date}T${hh}:${mm}:00`).toISOString();

        for (const tp of targetPlats) {
          // Skip platforms that already have a live Typefully draft for this post
          if (p.typefully_draft_ids?.[tp as Platform]) {
            console.log(`[Typefully] Skipping ${tp} for post ${p.id} — already has draft ${p.typefully_draft_ids[tp as Platform]}`);
            continue;
          }
          // Use platform-specific caption, fall back to main caption
          const caption = p.platform_captions?.[tp as Platform] || p.caption;
          const payload = {
            action: "create",
            social_set_id: socialSetId,
            text: caption,
            platform: tp,
            publish_at: publishAt,
            ...(mediaIdsByPost[p.id]?.length ? { media_ids: mediaIdsByPost[p.id] } : {}),
            ...(tp === "x" && autoPlugX ? { auto_plug_enabled: true } : {}),
            ...(tp === "x" && autoRetweetX ? { auto_retweet_enabled: true } : {}),
          };

          // Single attempt — retries were creating duplicate drafts because
          // Typefully sometimes returns a non-2xx response after the draft was
          // already created. If it fails, report it and let the user reschedule.
          let lastError = "";
          let success = false;
          try {
            console.log(`[Typefully] Creating draft for ${tp}: "${caption?.slice(0, 50)}..."`);
            const draftRes = await fetch("/api/typefully", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const draftData = await draftRes.json().catch(() => ({}));
            console.log(`[Typefully] Draft response (${tp}):`, draftRes.status, draftData);
            if (draftRes.ok) {
              success = true;
              const newId = draftData?.draft?.id || draftData?.id;
              if (newId) {
                newDraftIdsByPost[p.id] = {
                  ...(newDraftIdsByPost[p.id] || {}),
                  [tp as Platform]: String(newId),
                };
              }
            } else {
              lastError = draftData.error || `HTTP ${draftRes.status}`;
            }
          } catch (e: any) {
            lastError = e?.message || "Network error";
          }

          if (success) {
            successCount++;
          } else {
            failCount++;
            postAllSucceeded = false;
            failedErrors.push(`${tp} (post ${p.id.slice(0, 6)}): ${lastError}`);
            console.error(`[Typefully] Draft failed (${tp}):`, lastError);
          }
        }
        if (postAllSucceeded) fullySuccessfulPostIds.add(p.id);
      }

      setTypefullyResult({
        sent: successCount,
        failed: failCount,
        failedErrors,
      });

      // Mark only fully successful posts as scheduled — partial failures
      // stay as 'saved' so the user can retry without double-scheduling.
      if (fullySuccessfulPostIds.size > 0 || Object.keys(newDraftIdsByPost).length > 0) {
        const updated = allPosts.map(p => {
          const newIds = newDraftIdsByPost[p.id];
          if (!newIds && !fullySuccessfulPostIds.has(p.id)) return p;
          return {
            ...p,
            ...(fullySuccessfulPostIds.has(p.id) ? { status: "scheduled" as PostStatus } : {}),
            ...(newIds ? { typefully_draft_ids: { ...(p.typefully_draft_ids || {}), ...newIds } } : {}),
          };
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

  // ── Typefully: Reconcile local state with what's actually in Typefully ──
  // For each locally scheduled post, check its stored draft ids still exist
  // in Typefully's scheduled list. If Typefully no longer has them (user
  // deleted them there), flip the post back to "saved" so it can be rescheduled.
  async function syncWithTypefully() {
    if (syncing) return;
    setSyncing(true);
    try {
      const setsRes = await fetch("/api/typefully?action=social-sets");
      const setsData = await setsRes.json();
      if (!setsRes.ok) throw new Error(setsData.error || "Failed to load Typefully accounts");
      const socialSetId = setsData.sets?.[0]?.id;
      if (!socialSetId) throw new Error("No Typefully account connected");

      const [schedRes, draftRes] = await Promise.all([
        fetch(`/api/typefully?action=drafts&social_set_id=${socialSetId}&status=scheduled`),
        fetch(`/api/typefully?action=drafts&social_set_id=${socialSetId}`),
      ]);
      const schedData = await schedRes.json();
      const draftData = await draftRes.json();
      console.log("[Sync] Typefully scheduled response:", schedData);
      console.log("[Sync] Typefully drafts response:", draftData);
      const liveIds = new Set<string>([
        ...((schedData.drafts || []).map((d: any) => String(d.id))),
        ...((draftData.drafts || []).map((d: any) => String(d.id))),
      ]);

      let reset = 0;
      let cleared = 0;
      const updated = allPosts.map(p => {
        if (!p.typefully_draft_ids) return p;
        const next: Partial<Record<Platform, string>> = {};
        let changed = false;
        for (const [plat, id] of Object.entries(p.typefully_draft_ids) as [Platform, string][]) {
          if (liveIds.has(String(id))) {
            next[plat] = id;
          } else {
            changed = true;
            cleared++;
          }
        }
        if (!changed) return p;
        const hasAny = Object.keys(next).length > 0;
        const newStatus: PostStatus = p.status === "scheduled" && !hasAny ? "saved" : p.status;
        if (newStatus !== p.status) reset++;
        return { ...p, typefully_draft_ids: hasAny ? next : undefined, status: newStatus };
      });
      // Import Typefully drafts that Launchpad doesn't know about
      const knownIds = new Set<string>();
      for (const p of updated) {
        if (p.typefully_draft_ids) {
          for (const id of Object.values(p.typefully_draft_ids)) if (id) knownIds.add(String(id));
        }
      }
      // Fuzzy dedupe: match legacy posts without stored draft IDs by caption+date
      const fuzzyKey = (text: string, date: string) =>
        `${(text || "").trim().slice(0, 40).toLowerCase()}|${date}`;
      const knownFuzzy = new Set<string>();
      for (const p of updated) {
        if (p.caption) knownFuzzy.add(fuzzyKey(p.caption, p.scheduled_date));
        if (p.platform_captions) {
          for (const t of Object.values(p.platform_captions)) {
            if (t) knownFuzzy.add(fuzzyKey(t, p.scheduled_date));
          }
        }
      }
      const allLiveDrafts: any[] = [
        ...(schedData.drafts || []),
        ...(draftData.drafts || []),
      ];
      const seen = new Set<string>();
      const imported: ContentPost[] = [];
      const normalizePlat = (k: string): Platform | null => {
        const kk = k.toLowerCase();
        if (kk === "x" || kk === "twitter") return "x";
        if (kk === "linkedin") return "linkedin";
        return null;
      };
      // Backfill draft ids onto existing posts that fuzzy-match
      const backfillUpdated = updated.map(p => {
        if (p.typefully_draft_ids && Object.keys(p.typefully_draft_ids).length > 0) return p;
        const match = allLiveDrafts.find(d => {
          const txt = (d as any).preview || (d as any).text || "";
          const rawDate = (d as any).scheduled_date || (d as any).publish_at;
          if (!rawDate) return false;
          const dt = new Date(rawDate);
          const yyyy = dt.getFullYear();
          const mm = String(dt.getMonth() + 1).padStart(2, "0");
          const dd = String(dt.getDate()).padStart(2, "0");
          const date = `${yyyy}-${mm}-${dd}`;
          return fuzzyKey(txt, date) === fuzzyKey(p.caption || "", p.scheduled_date);
        });
        if (!match) return p;
        const ids: Partial<Record<Platform, string>> = {};
        if ((match as any).x_post_enabled) ids.x = String(match.id);
        if ((match as any).linkedin_post_enabled) ids.linkedin = String(match.id);
        return { ...p, typefully_draft_ids: ids };
      });
      for (const p of backfillUpdated) {
        if (p.typefully_draft_ids) {
          for (const id of Object.values(p.typefully_draft_ids)) if (id) knownIds.add(String(id));
        }
      }
      for (const d of allLiveDrafts) {
        const id = String(d.id);
        if (seen.has(id) || knownIds.has(id)) continue;
        seen.add(id);
        // Fuzzy skip — matches existing post with same caption+date
        const txtForKey = (d as any).preview || (d as any).text || "";
        const rawDateForKey = (d as any).scheduled_date || (d as any).publish_at;
        if (rawDateForKey) {
          const dt2 = new Date(rawDateForKey);
          const yyyy2 = dt2.getFullYear();
          const mm2 = String(dt2.getMonth() + 1).padStart(2, "0");
          const dd2 = String(dt2.getDate()).padStart(2, "0");
          if (knownFuzzy.has(fuzzyKey(txtForKey, `${yyyy2}-${mm2}-${dd2}`))) {
            console.log(`[Sync] Fuzzy skip draft ${id} — matches existing post`);
            continue;
          }
        }
        // Typefully v2 real shape uses flat per-platform enabled flags:
        // { x_post_enabled, linkedin_post_enabled, preview, scheduled_date, status, ... }
        const rawPlats = (d as any).platforms;
        const platEntries: { key: Platform; text: string }[] = [];
        const previewText: string = (d as any).preview || (d as any).text || "";
        if ((d as any).x_post_enabled) platEntries.push({ key: "x", text: previewText });
        if ((d as any).linkedin_post_enabled) platEntries.push({ key: "linkedin", text: previewText });
        if (platEntries.length === 0 && !rawPlats && (d as any).platform) {
          const k = normalizePlat((d as any).platform);
          if (k) platEntries.push({ key: k, text: previewText });
        }
        if (Array.isArray(rawPlats)) {
          for (const entry of rawPlats) {
            const k = normalizePlat(entry.platform || entry.name || "");
            if (!k) continue;
            const txt = entry.posts?.[0]?.text || entry.text || (d as any).text || "";
            platEntries.push({ key: k, text: txt });
          }
        } else if (typeof rawPlats === "object") {
          for (const [rk, rv] of Object.entries(rawPlats)) {
            const k = normalizePlat(rk);
            if (!k) continue;
            const v: any = rv;
            if (v && v.enabled === false) continue;
            const txt = v?.posts?.[0]?.text || v?.text || (d as any).text || "";
            platEntries.push({ key: k, text: txt });
          }
        }
        // Fallback: if API returned nothing structured, treat as X post with top-level text
        if (platEntries.length === 0 && (d as any).text) {
          platEntries.push({ key: "x", text: (d as any).text });
        }
        if (platEntries.length === 0) {
          console.warn("[Sync] Skipping draft with no parseable platforms. Keys:", Object.keys(d || {}), "JSON:", JSON.stringify(d).slice(0, 500));
          continue;
        }
        const validPlats = platEntries.map(e => e.key);
        const primary = validPlats[0];
        const text = platEntries[0].text;
        const platform_captions: Partial<Record<Platform, string>> = {};
        for (const e of platEntries) platform_captions[e.key] = e.text;
        const whenRaw = (d as any).publish_at || (d as any).scheduled_date || (d as any).scheduled_at || (d as any).publishAt || (d as any).schedule_date;
        const when = whenRaw
          ? new Date(typeof whenRaw === "number" ? whenRaw : whenRaw)
          : new Date();
        const yyyy = when.getFullYear();
        const mm = String(when.getMonth() + 1).padStart(2, "0");
        const dd = String(when.getDate()).padStart(2, "0");
        const hh = String(when.getHours()).padStart(2, "0");
        const mi = String(when.getMinutes()).padStart(2, "0");
        const scheduled_date = `${yyyy}-${mm}-${dd}`;
        const scheduled_time = `${hh}:${mi}`;
        // Merge into an existing imported post if same date+time+fuzzy text
        // (Launchpad creates 1 Typefully draft per platform — we want them
        // collapsed back into a single multi-platform post on sync.)
        // Merge purely by date+time — Launchpad only ever schedules X+LinkedIn
        // pairs at the same slot, so matching time alone is safe and simpler.
        const mergeKey = `${scheduled_date}T${scheduled_time}`;
        const existing = imported.find(ip => `${ip.scheduled_date}T${ip.scheduled_time}` === mergeKey);
        if (existing) {
          const mergedPlats = Array.from(new Set([...(existing.platforms || []), ...validPlats])) as Platform[];
          existing.platforms = mergedPlats;
          existing.platform_captions = { ...(existing.platform_captions || {}), ...platform_captions };
          existing.typefully_draft_ids = { ...(existing.typefully_draft_ids || {}) };
          for (const pk of validPlats) existing.typefully_draft_ids[pk] = id;
          continue;
        }
        const typefully_draft_ids: Partial<Record<Platform, string>> = {};
        for (const pk of validPlats) typefully_draft_ids[pk] = id;
        imported.push({
          id: `tf-${id}`,
          creator,
          platform: primary,
          platforms: validPlats,
          content_type: "educational",
          post_format: "text",
          caption: text,
          platform_captions,
          status: (d.status === "scheduled" ? "scheduled" : "saved") as PostStatus,
          scheduled_date,
          scheduled_time,
          typefully_draft_ids,
          analytics_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      console.log(`[Sync] Imported ${imported.length} posts:`, imported);
      const finalPosts = [...backfillUpdated, ...imported];
      setAllPosts(finalPosts);
      await savePosts(finalPosts);
      alert(`Synced. Typefully returned ${schedData.drafts?.length || 0} scheduled + ${draftData.drafts?.length || 0} drafts. Imported ${imported.length}, cleared ${cleared} stale ref${cleared === 1 ? "" : "s"}, ${reset} post${reset === 1 ? "" : "s"} flipped back to saved.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
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

  async function downscaleImage(dataUrl: string, maxDim = 1024, quality = 0.75): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function generateCaptions(overrides?: { imageData?: string; targetPlatform?: Platform }) {
    // Default: generate for ALL platforms on the post in one call.
    // Pass targetPlatform to regenerate just one platform (per-section button).
    const postPlatforms: Platform[] = overrides?.targetPlatform
      ? [overrides.targetPlatform]
      : ((studioPost.platforms && studioPost.platforms.length > 0
          ? studioPost.platforms
          : ["x", "linkedin"]) as Platform[]);
    if (!studioPost.content_type) return;
    setCaptionLoading(true);
    setCaptionError("");
    setCaptions([]);
    // Do NOT wipe platformCaptions — keep other platforms' variants intact.
    try {
      let imageData = overrides?.imageData || studioPost.media_data || undefined;
      if (imageData && imageData.length > 500_000) {
        imageData = await downscaleImage(imageData);
      }

      const res = await fetch("/api/calendar/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: postPlatforms,
          contentType: contentTypeLabels[studioPost.content_type],
          postFormat: studioPost.post_format || "text",
          brief: studioPost.angle || studioPost.caption || `${contentTypeLabels[studioPost.content_type]} post about CRO and landing pages`,
          imageData,
          captionLength,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.slice(0, 200) || `Request failed (${res.status})`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Merge new variants into platformCaptions cache. Auto-pick variant 0
      // for each generated platform into draftCaptions so both textareas fill.
      if (data.variants) {
        setPlatformCaptions(prev => {
          const next = { ...prev };
          for (const v of data.variants) next[v.platform as Platform] = v.captions;
          return next;
        });
        setDraftCaptions(prev => {
          const next = { ...prev };
          for (const v of data.variants) {
            if (v.captions?.[0]) next[v.platform as Platform] = v.captions[0];
          }
          return next;
        });
        // Keep legacy single-caption state in sync with X (or first generated)
        const firstPlat = (data.variants[0]?.platform as Platform) || postPlatforms[0];
        const firstCap = data.variants.find((v: any) => v.platform === firstPlat)?.captions?.[0] || "";
        if (firstCap) {
          setStudioPost(prev => ({ ...prev, caption: prev.caption || firstCap }));
        }
        setCaptions([]);
      } else if (data.captions) {
        setCaptions(data.captions);
      }
    } catch (e: any) {
      setCaptionError(e.message || "Failed to generate captions");
    } finally {
      setCaptionLoading(false);
    }
  }

  function handleImageUpload(file: File) {
    handleImageUploads([file]);
  }

  function handleImageUploads(files: File[]) {
    const valid = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        alert(`${f.name} is over 5MB — skipped`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;

    Promise.all(valid.map(f => new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(f);
    }))).then(base64s => {
      setStudioPost(prev => {
        const existing = prev.media_data_list || (prev.media_data ? [prev.media_data] : []);
        const combined = [...existing, ...base64s].slice(0, 4); // Typefully cap = 4
        return {
          ...prev,
          media_data: combined[0],
          media_data_list: combined,
          post_format: "image" as PostFormat,
        };
      });
      // Auto-generate captions using the first image as visual context
      generateCaptions({ imageData: base64s[0] });
    });
  }

  // ── Bulk upload: drop N images, create N draft posts spread across days ──
  async function runBulkUpload() {
    if (bulkFiles.length === 0) return;
    setBulkLoading(true);
    try {
      const valid = bulkFiles.filter(f => f.size <= 5 * 1024 * 1024);
      if (valid.length === 0) {
        alert("All files are over 5MB");
        return;
      }

      // Read all to base64
      const base64s = await Promise.all(valid.map(f => new Promise<string>(resolve => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(f);
      })));

      // Compute scheduled slots: spread across days starting from bulkStartDate.
      // bulkPostsPerDay per day. Skip weekends if toggled. Use best slot for X.
      const contentTypes: ContentType[] = ["educational", "social_proof", "personal", "promotional"];
      const now = new Date();
      const start = new Date(bulkStartDate + "T00:00:00");
      if (start < new Date(now.toDateString())) start.setTime(new Date(now.toDateString()).getTime());

      const posts: ContentPost[] = [];
      const dayCursor = new Date(start);
      let postsToday = 0;
      const usedTypesByDate: Record<string, ContentType[]> = {};

      function nextDay() {
        dayCursor.setDate(dayCursor.getDate() + 1);
        postsToday = 0;
      }
      function isWeekend(d: Date) { return d.getDay() === 0 || d.getDay() === 6; }
      function pickTypeFor(dateStr: string, idx: number): ContentType {
        const used = usedTypesByDate[dateStr] || [];
        // Round-robin starting from idx, prefer unused for the day
        for (let i = 0; i < contentTypes.length; i++) {
          const t = contentTypes[(idx + i) % contentTypes.length];
          if (!used.includes(t)) return t;
        }
        return contentTypes[idx % contentTypes.length];
      }
      function pickTimeFor(dateStr: string, slotIdx: number): string {
        const dow = new Date(dateStr + "T00:00:00").getDay();
        const best = getBestTimes("x", dow);
        if (best.length > 0) {
          const t = best[slotIdx % best.length];
          return t.time || `${t.hour.toString().padStart(2, "0")}:${(t.minute || 0).toString().padStart(2, "0")}`;
        }
        // Fallback: spread across the day
        const fallback = ["09:00", "13:00", "17:00", "20:00"];
        return fallback[slotIdx % fallback.length];
      }

      // Pre-count existing posts per date for this creator so bulk upload
      // respects already-scheduled / saved / drafted slots and never overwrites.
      const existingByDate: Record<string, number> = {};
      for (const ep of allPosts) {
        if (ep.creator !== creator) continue;
        existingByDate[ep.scheduled_date] = (existingByDate[ep.scheduled_date] || 0) + 1;
      }

      const nowIso = new Date().toISOString();
      for (let i = 0; i < base64s.length; i++) {
        // Skip weekends if needed
        while (bulkSkipWeekends && isWeekend(dayCursor)) nextDay();
        // Skip days already at capacity (existing + freshly added)
        let dateStr = toDateStr(dayCursor);
        const totalForDay = () => (existingByDate[dateStr] || 0) + postsToday;
        while (totalForDay() >= bulkPostsPerDay) {
          nextDay();
          while (bulkSkipWeekends && isWeekend(dayCursor)) nextDay();
          dateStr = toDateStr(dayCursor);
        }
        if (postsToday >= bulkPostsPerDay) {
          nextDay();
          while (bulkSkipWeekends && isWeekend(dayCursor)) nextDay();
          dateStr = toDateStr(dayCursor);
        }
        const contentType = pickTypeFor(dateStr, i);
        const scheduledTime = pickTimeFor(dateStr, postsToday);
        usedTypesByDate[dateStr] = [...(usedTypesByDate[dateStr] || []), contentType];

        posts.push({
          id: uuid(),
          creator: creator,
          platform: "x",
          platforms: ["x", "linkedin"],
          content_type: contentType,
          post_format: "image",
          angle: "",
          caption: "",
          status: "draft",
          scheduled_date: dateStr,
          scheduled_time: scheduledTime,
          media_data: base64s[i],
          media_data_list: [base64s[i]],
          analytics_score: getSlotScore("x", dayCursor.getDay(), parseInt(scheduledTime)),
          created_at: nowIso,
          updated_at: nowIso,
        });
        postsToday++;
      }

      const updated = [...allPosts, ...posts];
      setAllPosts(updated);
      await savePosts(updated);
      setBulkFiles([]);
      setShowBulkModal(false);
      alert(`Created ${posts.length} draft posts. Open each to write captions before scheduling.`);
    } catch (e: any) {
      alert(e?.message || "Bulk upload failed");
    } finally {
      setBulkLoading(false);
    }
  }

  // ── Bulk text import: parse file then create posts with captions ──
  async function handleParseTextFile(file: File) {
    setBulkParsing(true);
    setBulkTextFile(file);
    try {
      // Parse locally for .txt — split by delimiter (priority order)
      const text = await file.text();
      let posts: string[];
      if (/^\[POST\s*\d*\]/im.test(text)) {
        // Preferred: [POST] or [POST 1] labels
        posts = text.split(/\r?\n?\[POST\s*\d*\]\r?\n?/i).filter(Boolean);
      } else if (text.includes("\n---\n") || text.includes("\r\n---\r\n")) {
        posts = text.split(/\r?\n---\r?\n/);
      } else if (text.includes("\n###\n") || text.includes("\r\n###\r\n")) {
        posts = text.split(/\r?\n###\r?\n/);
      } else if (text.includes("\n\n\n")) {
        posts = text.split(/\n\n\n+/);
      } else {
        posts = text.split(/\n\n+/);
      }
      const cleaned = posts.map(p => p.trim()).filter(p => p.length > 10);
      setBulkParsedCaptions(cleaned);
    } catch {
      alert("Failed to parse file");
    } finally {
      setBulkParsing(false);
    }
  }

  async function runBulkTextImport() {
    if (bulkParsedCaptions.length === 0) return;
    setBulkLoading(true);
    try {
      const contentTypes: ContentType[] = ["educational", "social_proof", "personal", "promotional"];
      const now = new Date();
      const start = new Date(bulkStartDate + "T00:00:00");
      if (start < new Date(now.toDateString())) start.setTime(new Date(now.toDateString()).getTime());

      const posts: ContentPost[] = [];
      const dayCursor = new Date(start);
      let postsToday = 0;

      function nextDay() {
        dayCursor.setDate(dayCursor.getDate() + 1);
        postsToday = 0;
      }
      function isWeekend(d: Date) { return d.getDay() === 0 || d.getDay() === 6; }
      function pickTimeFor(dateStr: string, slotIdx: number): string {
        const dow = new Date(dateStr + "T00:00:00").getDay();
        const best = getBestTimes("x", dow);
        if (best.length > 0) {
          const t = best[slotIdx % best.length];
          return t.time || `${t.hour.toString().padStart(2, "0")}:${(t.minute || 0).toString().padStart(2, "0")}`;
        }
        const fallback = ["08:45", "12:30", "17:15"];
        return fallback[slotIdx % fallback.length];
      }

      // Pre-count existing posts per date
      const existingByDate: Record<string, number> = {};
      for (const ep of allPosts) {
        if (ep.creator !== creator) continue;
        existingByDate[ep.scheduled_date] = (existingByDate[ep.scheduled_date] || 0) + 1;
      }

      const nowIso = new Date().toISOString();
      for (let i = 0; i < bulkParsedCaptions.length; i++) {
        while (bulkSkipWeekends && isWeekend(dayCursor)) nextDay();
        let dateStr = toDateStr(dayCursor);
        const totalForDay = () => (existingByDate[dateStr] || 0) + postsToday;
        while (totalForDay() >= bulkPostsPerDay) {
          nextDay();
          while (bulkSkipWeekends && isWeekend(dayCursor)) nextDay();
          dateStr = toDateStr(dayCursor);
        }
        if (postsToday >= bulkPostsPerDay) {
          nextDay();
          while (bulkSkipWeekends && isWeekend(dayCursor)) nextDay();
          dateStr = toDateStr(dayCursor);
        }

        const caption = bulkParsedCaptions[i];
        const scheduledTime = pickTimeFor(dateStr, postsToday);

        posts.push({
          id: uuid(),
          creator: creator,
          platform: "x",
          platforms: ["x", "linkedin"],
          content_type: contentTypes[i % contentTypes.length],
          post_format: "text",
          angle: caption.split("\n")[0].slice(0, 80),
          caption: caption,
          platform_captions: { x: caption },
          status: "draft",
          scheduled_date: dateStr,
          scheduled_time: scheduledTime,
          analytics_score: getSlotScore("x", dayCursor.getDay(), parseInt(scheduledTime)),
          created_at: nowIso,
          updated_at: nowIso,
        });
        postsToday++;
      }

      const updated = [...allPosts, ...posts];
      setAllPosts(updated);
      await savePosts(updated);
      setBulkParsedCaptions([]);
      setBulkTextFile(null);
      setShowBulkModal(false);
      const days = Math.ceil(bulkParsedCaptions.length / bulkPostsPerDay);
      alert(`Imported ${posts.length} posts across ${days} days. Open each to add media and generate LinkedIn captions.`);
    } catch (e: any) {
      alert(e?.message || "Bulk text import failed");
    } finally {
      setBulkLoading(false);
    }
  }

  function removeImageAt(idx: number) {
    setStudioPost(prev => {
      const list = prev.media_data_list || (prev.media_data ? [prev.media_data] : []);
      const next = list.filter((_, i) => i !== idx);
      return {
        ...prev,
        media_data: next[0],
        media_data_list: next.length > 0 ? next : undefined,
      };
    });
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
    const allPlatforms: Platform[] = ["x", "linkedin"];
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
    <div className="py-8 px-6 md:px-8 overflow-x-hidden flex flex-col h-[calc(100vh-64px)]">
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
            onClick={openTypefullyScheduler}
            disabled={typefullyLoading || weekPosts.filter(p => p.status === "saved" && p.caption?.trim()).length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUpTrayIcon className="size-3.5" />
            {typefullyLoading ? "Scheduling..." : `Schedule Ready (${weekPosts.filter(p => p.status === "saved" && p.caption?.trim()).length})`}
          </button>
          <button
            onClick={syncWithTypefully}
            disabled={syncing}
            title="Reconcile local state with Typefully — clears stale draft refs and flips orphaned posts back to saved"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E5EA] text-[#7A7A7A] hover:bg-[#F5F5F5] transition-colors disabled:opacity-40"
          >
            {syncing ? "Syncing..." : "Sync"}
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

      {/* ── Bulk upload modal ── */}
      {showBulkModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 animate-backdropFade" onClick={() => !bulkLoading && setShowBulkModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-[var(--shadow-elevated)] w-full max-w-md p-6 animate-fadeInUp max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-[#1B1B1B]">Bulk upload posts</h3>
                <button onClick={() => !bulkLoading && setShowBulkModal(false)} className="p-1 rounded-lg hover:bg-[#F3F3F5]">
                  <XMarkIcon className="size-5 text-[#7A7A7A]" />
                </button>
              </div>

              {/* Mode toggle */}
              <div className="flex gap-1 mb-4 bg-[#F3F3F5] p-1 rounded-lg">
                <button
                  onClick={() => { setBulkMode("text"); setBulkFiles([]); }}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${bulkMode === "text" ? "bg-white text-[#1B1B1B] shadow-sm" : "text-[#7A7A7A]"}`}
                >
                  <DocumentTextIcon className="size-3.5 inline mr-1 -mt-0.5" />
                  Import captions
                </button>
                <button
                  onClick={() => { setBulkMode("images"); setBulkParsedCaptions([]); setBulkTextFile(null); }}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${bulkMode === "images" ? "bg-white text-[#1B1B1B] shadow-sm" : "text-[#7A7A7A]"}`}
                >
                  <PhotoIcon className="size-3.5 inline mr-1 -mt-0.5" />
                  Upload images
                </button>
              </div>

              {bulkMode === "text" ? (
                <>
                  <p className="text-[11px] text-[#7A7A7A] leading-relaxed mb-4">
                    Upload a .txt file with each post labelled <code className="bg-[#F0F0F0] px-1 rounded text-[10px]">[POST]</code> on its own line. Each post becomes a draft — add media and mark Ready to Post.
                  </p>
                  <label className="block mb-4">
                    <div className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-[#E0E0E0] rounded-xl cursor-pointer hover:border-[#1B1B1B] hover:bg-[#FAFAFA] transition-colors">
                      <DocumentTextIcon className="size-7 text-[#CCC]" />
                      {bulkParsing ? (
                        <span className="text-xs text-[#999]">Parsing...</span>
                      ) : bulkParsedCaptions.length > 0 ? (
                        <>
                          <span className="text-xs font-medium text-[#1B1B1B]">{bulkParsedCaptions.length} posts found</span>
                          <span className="text-[10px] text-[#999]">{bulkTextFile?.name}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-medium text-[#1B1B1B]">Upload .txt file</span>
                          <span className="text-[10px] text-[#999]">Each post labelled with [POST] on its own line</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".txt,.text,text/plain"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleParseTextFile(file);
                      }}
                    />
                  </label>
                  {/* Preview first 3 */}
                  {bulkParsedCaptions.length > 0 && (
                    <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
                      <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">Preview</p>
                      {bulkParsedCaptions.slice(0, 3).map((cap, i) => (
                        <div key={i} className="px-3 py-2 bg-[#F7F8FA] rounded-lg text-[11px] text-[#444] whitespace-pre-wrap line-clamp-3">
                          {cap}
                        </div>
                      ))}
                      {bulkParsedCaptions.length > 3 && (
                        <p className="text-[10px] text-[#999] text-center">+ {bulkParsedCaptions.length - 3} more</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[11px] text-[#7A7A7A] leading-relaxed mb-4">
                    Drop up to 50 images. We&apos;ll create one draft post per image, spread across days. Captions stay empty so you can fill them in after.
                  </p>
                  <label className="block mb-4">
                    <div className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-[#E0E0E0] rounded-xl cursor-pointer hover:border-[#1B1B1B] hover:bg-[#FAFAFA] transition-colors">
                      <PhotoIcon className="size-7 text-[#CCC]" />
                      <span className="text-xs font-medium text-[#1B1B1B]">{bulkFiles.length > 0 ? `${bulkFiles.length} image${bulkFiles.length === 1 ? "" : "s"} selected` : "Click or drop images"}</span>
                      <span className="text-[10px] text-[#999]">Up to 50 · Max 5MB each</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []).slice(0, 50);
                        setBulkFiles(files);
                      }}
                    />
                  </label>
                </>
              )}

              {/* Settings */}
              <div className="space-y-3 mb-5">
                <div>
                  <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider mb-1.5">Start date</p>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={e => setBulkStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5E5EA] rounded-lg bg-white outline-none focus:border-[#1B1B1B] transition-colors"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider mb-1.5">Posts per day</p>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(n => (
                      <button
                        key={n}
                        onClick={() => setBulkPostsPerDay(n)}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          bulkPostsPerDay === n ? "bg-[#1B1B1B] text-white" : "bg-[#F3F3F5] text-[#7A7A7A] hover:bg-[#EBEBEB]"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkSkipWeekends}
                    onChange={e => setBulkSkipWeekends(e.target.checked)}
                    className="size-4 rounded border-[#E5E5EA]"
                  />
                  <span className="text-xs text-[#1B1B1B]">Skip weekends</span>
                </label>
              </div>

              {/* Preview summary */}
              {(bulkMode === "text" ? bulkParsedCaptions.length > 0 : bulkFiles.length > 0) && (
                <div className="px-3 py-2.5 bg-[#F7F8FA] rounded-lg mb-4">
                  <p className="text-[11px] text-[#1B1B1B]">
                    <span className="font-semibold">{bulkMode === "text" ? bulkParsedCaptions.length : bulkFiles.length}</span> posts ·{" "}
                    <span className="font-semibold">{Math.ceil((bulkMode === "text" ? bulkParsedCaptions.length : bulkFiles.length) / bulkPostsPerDay)}</span>{" "}
                    {bulkSkipWeekends ? "weekdays" : "days"} starting {new Date(bulkStartDate + "T00:00:00").toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkModal(false)}
                  disabled={bulkLoading}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-[#7A7A7A] bg-[#F3F3F5] rounded-lg hover:bg-[#EBEBEB] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={bulkMode === "text" ? runBulkTextImport : runBulkUpload}
                  disabled={bulkLoading || (bulkMode === "text" ? bulkParsedCaptions.length === 0 : bulkFiles.length === 0)}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-[#1B1B1B] rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40"
                >
                  {bulkLoading ? "Importing..." : `Import ${bulkMode === "text" ? bulkParsedCaptions.length : bulkFiles.length} post${(bulkMode === "text" ? bulkParsedCaptions.length : bulkFiles.length) === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Typefully platform picker modal ── */}
      {showTypefullyModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 animate-backdropFade" onClick={() => setShowTypefullyModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-[var(--shadow-elevated)] w-full max-w-sm p-6 animate-fadeInUp">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-[#1B1B1B]">Schedule to Typefully</h3>
                <button onClick={() => setShowTypefullyModal(false)} className="p-1 rounded-lg hover:bg-[#F3F3F5]">
                  <XMarkIcon className="size-5 text-[#7A7A7A]" />
                </button>
              </div>

              <p className="text-xs text-[#7A7A7A] mb-4">
                Pick the platforms to post to. Captions will be automatically adapted for each platform.
              </p>

              <div className="space-y-2 mb-6">
                {(["x", "linkedin"] as Platform[]).map(p => {
                  const selected = typefullyPlatforms.has(p);
                  return (
                    <button
                      key={p}
                      onClick={() => toggleTypefullyPlatform(p)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                        selected
                          ? "border-[#1B1B1B] bg-[#F7F8FA]"
                          : "border-[#E5E5EA] hover:border-[#C5C5C5]"
                      }`}
                    >
                      <span
                        className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selected ? "border-[#1B1B1B] bg-[#1B1B1B]" : "border-[#D4D4D4]"
                        }`}
                      >
                        {selected && <CheckIcon className="size-2.5 text-white" />}
                      </span>
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: platformColors[p] }} />
                      <span className="text-sm font-medium text-[#1B1B1B]">{platformLabels[p]}</span>
                    </button>
                  );
                })}
              </div>

              {/* X automation toggles */}
              {typefullyPlatforms.has("x") && (
                <div className="mb-4 p-3 border border-[#EDEDEF] rounded-lg space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[#999] font-semibold">X Automation (uses your Typefully defaults)</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPlugX}
                      onChange={(e) => setAutoPlugX(e.target.checked)}
                      className="size-3.5"
                    />
                    <span className="text-xs text-[#1B1B1B]">Auto-plug</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRetweetX}
                      onChange={(e) => setAutoRetweetX(e.target.checked)}
                      className="size-3.5"
                    />
                    <span className="text-xs text-[#1B1B1B]">Auto-retweet</span>
                  </label>
                </div>
              )}

              {/* Post count — only Ready to Post (blue) posts */}
              {(() => {
                const now = new Date();
                const readyCount = weekPosts.filter(p => {
                  if (p.status !== "saved") return false;
                  if (!p.caption?.trim()) return false;
                  return new Date(`${p.scheduled_date}T${p.scheduled_time || "09:00"}:00`) > now;
                }).length;
                return (
                  <p className="text-xs text-[#999] mb-4">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-blue-500" />
                      {readyCount} Ready to Post
                    </span>
                    {" "}post{readyCount !== 1 ? "s" : ""} will be scheduled to {typefullyPlatforms.size} platform{typefullyPlatforms.size !== 1 ? "s" : ""}
                    {typefullyPlatforms.size > 1 && " — captions auto-adapted per platform"}
                  </p>
                );
              })()}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowTypefullyModal(false)}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold border border-[#E5E5EA] text-[#7A7A7A] rounded-lg hover:bg-[#F5F5F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={scheduleToTypefully}
                  disabled={typefullyPlatforms.size === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40"
                >
                  <ArrowUpTrayIcon className="size-3.5" />
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </>
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

          {/* Bulk upload */}
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#E5E5EA] text-[#1B1B1B] text-xs font-medium rounded-lg hover:bg-[#F5F5F5] transition-colors"
          >
            <PhotoIcon className="size-3.5" />
            Bulk upload
          </button>

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

      <div className="flex flex-1 min-h-0 animate-fadeInUp-d2">
        {/* ── Main calendar grid ── */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* ═══ MONTH VIEW (default, like Untitled UI) ═══ */}
          {view === "month" && (
            <div className="border-x border-b border-[#E5E5EA] rounded-b-xl overflow-hidden flex-1 flex flex-col">
              {/* Day-of-week header row */}
              <div className="grid grid-cols-7 border-b border-[#E5E5EA]">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className={`px-3 py-2.5 text-xs font-semibold text-[#7A7A7A] ${d !== "Mon" ? "border-l border-[#E5E5EA]" : ""}`}>
                    {d}
                  </div>
                ))}
              </div>
              {/* Calendar grid — 6 rows of 7 */}
              <div className="flex-1 flex flex-col">
              {Array.from({ length: 6 }).map((_, row) => (
                <div key={row} className={`grid grid-cols-7 flex-1 ${row < 5 ? "border-b border-[#E5E5EA]" : ""}`}>
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
                              style={{ backgroundColor: cc.bg, color: cc.text, opacity: dragPostId === p.id ? 0.4 : cc.opacity }}
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
            </div>
          )}

          {/* ═══ WEEK VIEW ═══ */}
          {view === "week" && (
            <div className="border-x border-b border-[#E5E5EA] rounded-b-xl overflow-hidden flex-1 flex flex-col">
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
              <div className="grid grid-cols-7 flex-1">
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
                          style={{ backgroundColor: cc.bg, color: cc.text, opacity: dragPostId === p.id ? 0.4 : cc.opacity }}
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
            {(["draft", "saved", "scheduled"] as PostStatus[]).map(status => {
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

            {/* Platform tabs removed — both captions render side-by-side below */}

            {repurposeError && (
              <div className="shrink-0 px-5 py-2 bg-red-50 border-b border-red-100">
                <p className="text-[11px] text-red-500">{repurposeError}</p>
              </div>
            )}

            {/* ═══ UNIFIED POST EDITOR ═══ */}
            <div className="flex-1 overflow-y-auto">
              {/* ── Idea / Angle ── */}
              <div className="px-5 pt-4 pb-4 border-b border-[#F0F0F0]">
                <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2">Idea / Angle</p>
                <textarea
                  value={studioPost.angle || ""}
                  onChange={e => setStudioPost(prev => ({ ...prev, angle: e.target.value }))}
                  placeholder="What's the idea? e.g. Most brands test button colours but ignore the full purchase flow..."
                  className="w-full bg-[#F7F8FA] rounded-lg px-3 py-2.5 text-sm text-[#1B1B1B] leading-relaxed resize-none outline-none placeholder:text-[#CCC] border border-[#E5E5EA] focus:border-[#1B1B1B] transition-colors"
                  rows={2}
                />
              </div>

              {/* ── Format ── */}
              <div className="px-5 py-3 border-b border-[#F0F0F0]">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider shrink-0">Format</p>
                  <div className="flex gap-1">
                    {(["text", "image", "article"] as PostFormat[]).map(f => {
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

              </div>

              {/* ── 4. Image upload (only for image/article) ── */}
              {(studioPost.post_format === "image" || studioPost.post_format === "article") && (() => {
                const images = studioPost.media_data_list || (studioPost.media_data ? [studioPost.media_data] : []);
                const canAddMore = images.length < 4;
                return (
                  <div className="px-5 pt-4 pb-4 border-b border-[#F0F0F0]">
                    {images.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {images.map((src, i) => (
                            <div key={i} className="relative rounded-lg overflow-hidden border border-[#E5E5EA] aspect-square">
                              <img src={src} alt={`Post media ${i + 1}`} className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeImageAt(i)}
                                className="absolute top-1 right-1 px-1.5 py-0.5 bg-white/90 backdrop-blur-sm text-[9px] font-semibold text-red-400 rounded shadow-sm hover:bg-white transition-colors"
                              >
                                Remove
                              </button>
                              {i === 0 && images.length > 1 && (
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[8px] font-semibold rounded">1st</span>
                              )}
                            </div>
                          ))}
                          {canAddMore && (
                            <label className="flex flex-col items-center justify-center gap-1 aspect-square border border-dashed border-[#E0E0E0] rounded-lg cursor-pointer hover:border-[#B0B0B0] hover:bg-[#FAFAFA] transition-colors">
                              <PhotoIcon className="size-5 text-[#CCC]" />
                              <span className="text-[10px] text-[#999]">Add image</span>
                              <input type="file" accept="image/*" multiple className="hidden" onChange={e => { const fs = Array.from(e.target.files || []); if (fs.length) handleImageUploads(fs); }} />
                            </label>
                          )}
                        </div>
                        <p className="text-[9px] text-[#BBB] text-center">{images.length}/4 images · Typefully max</p>
                        {captionLoading && (
                          <p className="text-[10px] text-[#999] text-center animate-pulse">Generating captions...</p>
                        )}
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 py-5 border border-dashed border-[#E0E0E0] rounded-xl cursor-pointer hover:border-[#B0B0B0] hover:bg-[#FAFAFA] transition-colors">
                        <PhotoIcon className="size-5 text-[#CCC]" />
                        <span className="text-[11px] text-[#999]">Upload or paste image(s)</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={e => { const fs = Array.from(e.target.files || []); if (fs.length) handleImageUploads(fs); }} />
                      </label>
                    )}
                  </div>
                );
              })()}

              {/* ── 5. Caption Length toggle ── */}
              <div className="px-5 pt-4 pb-3 border-b border-[#F0F0F0]">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider shrink-0">Length</p>
                  <div className="flex gap-1">
                    {(["short", "medium", "long"] as CaptionLength[]).map(l => {
                      const active = captionLength === l;
                      return (
                        <button
                          key={l}
                          onClick={() => setCaptionLength(l)}
                          className={`px-3 py-1.5 text-[10px] font-medium rounded-lg transition-colors capitalize ${
                            active
                              ? "bg-[#1B1B1B] text-white"
                              : "text-[#999] hover:bg-[#F3F3F5]"
                          }`}
                        >
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── 6. Generate + Caption display ── */}
              <div className="px-5 pt-4 pb-5 border-b border-[#F0F0F0]">
                {/* Generate button */}
                <button
                  onClick={() => generateCaptions()}
                  disabled={captionLoading || !studioPost.angle?.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 mb-3"
                >
                  <SparklesIcon className="size-4" />
                  {captionLoading ? "Generating captions..." : "Generate Captions"}
                </button>
                {!studioPost.angle?.trim() && !studioPost.caption && (
                  <p className="text-[10px] text-[#BBB] text-center mb-3">Write an idea above first</p>
                )}

                {captionError && <p className="text-[11px] text-red-500 mb-2">{captionError}</p>}

                {/* Two stacked caption blocks — X and LinkedIn — both filled by Generate */}
                {(["x", "linkedin"] as Platform[]).map(plat => {
                  const variants = platformCaptions[plat] || [];
                  const value = draftCaptions[plat] || "";
                  return (
                    <div key={plat} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ backgroundColor: platformColors[plat] }} />
                          <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider">{platformLabels[plat]} Caption</p>
                        </div>
                        <button
                          onClick={() => generateCaptions({ targetPlatform: plat })}
                          disabled={captionLoading || !studioPost.angle?.trim()}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#7A7A7A] bg-[#F3F3F5] rounded-md hover:bg-[#EBEBEB] transition-colors disabled:opacity-50"
                        >
                          <SparklesIcon className="size-3" />
                          {captionLoading ? "..." : "Regenerate"}
                        </button>
                      </div>
                      {variants.length > 1 && (
                        <div className="flex gap-1 mb-2">
                          {variants.map((c, i) => {
                            const isActive = value === c;
                            return (
                              <button
                                key={i}
                                onClick={() => setDraftCaptions(prev => ({ ...prev, [plat]: c }))}
                                className={`flex-1 px-2 py-1 text-[9px] font-semibold rounded-md transition-colors ${
                                  isActive ? "bg-[#1B1B1B] text-white" : "bg-[#F3F3F5] text-[#999] hover:bg-[#EBEBEB]"
                                }`}
                              >
                                Variant {i + 1}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <textarea
                        value={value}
                        onChange={e => {
                          const val = e.target.value;
                          setDraftCaptions(prev => ({ ...prev, [plat]: val }));
                          // Keep legacy single caption in sync with X for back-compat
                          if (plat === "x") setStudioPost(prev => ({ ...prev, caption: val }));
                        }}
                        placeholder={`${platformLabels[plat]} caption will appear here...`}
                        className="w-full bg-[#F7F8FA] rounded-lg px-3 py-2.5 text-sm text-[#1B1B1B] leading-relaxed resize-none outline-none placeholder:text-[#CCC] border border-[#E5E5EA] focus:border-[#1B1B1B] transition-colors min-h-[100px] whitespace-pre-wrap"
                        rows={4}
                      />
                    </div>
                  );
                })}
              </div>

              {/* ── 7. Schedule (date + time) ── */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider">Schedule</p>
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
            </div>

            {/* ── 8. Footer (sticky bottom) ── */}
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
                {saving ? "Saving..." : "Save Draft"}
              </button>
              {/* Ready to Post toggle — marks post blue so it gets picked up by scheduler */}
              <button
                onClick={async () => {
                  const isCurrentlyReady = studioPost.status === "saved";
                  const newStatus: PostStatus = isCurrentlyReady ? "draft" : "saved";
                  // Save first with current data, then toggle status
                  const postPlatforms = studioPost.platforms || (studioPost.platform ? [studioPost.platform] : ["x"]);
                  const mergedCaptions: Record<string, string> = { ...draftCaptions };
                  const fallbackCaption = mergedCaptions.x || mergedCaptions.linkedin || studioPost.caption || "";
                  const now = new Date().toISOString();
                  const post: ContentPost = {
                    id: studioPost.id || uuid(),
                    creator: studioPost.creator || creator,
                    group_id: studioPost.group_id,
                    platform: (postPlatforms[0] || "x") as Platform,
                    platforms: postPlatforms as Platform[],
                    content_type: studioPost.content_type || "educational",
                    post_format: studioPost.post_format || "text",
                    angle: studioPost.angle || "",
                    caption: fallbackCaption,
                    platform_captions: mergedCaptions as Record<Platform, string>,
                    status: newStatus,
                    scheduled_date: studioPost.scheduled_date!,
                    scheduled_time: studioPost.scheduled_time || "09:00",
                    media_url: studioPost.media_url,
                    media_data: studioPost.media_data,
                    media_data_list: studioPost.media_data_list,
                    analytics_score: studioPost.analytics_score || 0,
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
                  setStudioPost(prev => ({ ...prev, ...post }));
                }}
                disabled={!studioPost.caption?.trim() || !studioPost.scheduled_date}
                className={`flex items-center gap-1 px-3 py-2.5 text-[10px] font-semibold rounded-lg transition-colors disabled:opacity-40 ${
                  studioPost.status === "saved"
                    ? "bg-blue-500 text-white hover:bg-blue-600 border border-blue-500"
                    : "border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100"
                }`}
              >
                <CheckIcon className="size-3" />
                {studioPost.status === "saved" ? "Ready ✓" : "Ready to Post"}
              </button>
              {studioPost.id && studioPost.status === "scheduled" && (
                <button
                  onClick={async () => {
                    const newStatus: PostStatus = "draft";
                    const updated = allPosts.map(p =>
                      p.id === studioPost.id ? { ...p, status: newStatus } : p
                    );
                    setAllPosts(updated);
                    await savePosts(updated);
                    setStudioPost(prev => ({ ...prev, status: newStatus }));
                  }}
                  className="flex items-center gap-1 px-3 py-2.5 text-[10px] font-semibold border border-amber-200 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                  title="Reset so it can be re-sent to Typefully"
                >
                  Reset
                </button>
              )}
              {studioPost.id && (
                <button
                  onClick={() => handleDeletePost(studioPost.id!)}
                  className="p-2.5 text-[#CCC] hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete post"
                >
                  <TrashIcon className="size-4" />
                </button>
              )}
            </div>
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

      {/* Voice Profile panel removed — TOV v3 is hardcoded in the captions API */}
    </div>
  );
}
