"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PlusIcon,
  XMarkIcon,
  PencilSquareIcon,
  CheckIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { supabase } from "@/lib/supabase";
import type { CroTest, CroTestInsert, CroTestStatus } from "@/lib/types";

/* ── Shared classes ─────────────────────────────────────────────── */

const inputClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors placeholder:text-[#CCCCCC]";

const selectClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors";

const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2";

const smallInputClass =
  "w-full px-2.5 py-2 bg-white border border-[#E5E5E5] rounded-md text-xs focus:outline-none focus:border-[#0A0A0A] transition-colors tabular-nums";

/* ── Status config ──────────────────────────────────────────────── */

const statusConfig: Record<
  CroTestStatus,
  { bg: string; text: string; dot: string; label: string; pulse?: boolean }
> = {
  live: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", label: "Live", pulse: true },
  paused: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", label: "Paused" },
  winner: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Winner" },
  loser: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400", label: "Loser" },
  inconclusive: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400", label: "Inconclusive" },
};

const ALL_STATUSES: CroTestStatus[] = ["live", "paused", "winner", "loser", "inconclusive"];

/* ── Swimlane config ────────────────────────────────────────────── */

interface SwimlaneConfig {
  title: string;
  dot: string;
  pulse: boolean;
  emptyText: string;
}

const swimlaneConfig: Record<string, SwimlaneConfig> = {
  attention: {
    title: "Needs Attention",
    dot: "bg-red-500",
    pulse: true,
    emptyText: "Nothing needs attention right now",
  },
  running: {
    title: "Live & Running",
    dot: "bg-green-500",
    pulse: true,
    emptyText: "No live tests running",
  },
  winners: {
    title: "Winners",
    dot: "bg-emerald-500",
    pulse: false,
    emptyText: "No winners yet",
  },
  losers: {
    title: "Losers & Inconclusive",
    dot: "bg-gray-400",
    pulse: false,
    emptyText: "No losers or inconclusive tests",
  },
};

/* ── Weekly checklist items ─────────────────────────────────────── */

const MONDAY_CHECKS = [
  "Confirm all live tests are tracking correctly",
  "Check sample sizes are on pace",
  "Verify no test conflicts or overlap",
  "Next test queued and ready",
];

const FRIDAY_CHECKS = [
  "Pull latest metrics for all live tests",
  "Call winners/losers for tests at 95%+ sig",
  "Log results to CRO system",
  "Brief next test to team",
];

/* ── Demo data (used when cro_tests table doesn't exist yet) ───── */

const DEMO_DATA: CroTest[] = [
  {
    id: "demo-1",
    client_name: "Gymshark",
    test_name: "PDP Trust Badges Above Fold",
    variant_name: "V1 — Badges + Star Rating",
    hypothesis: "Adding trust badges and star ratings above fold will increase CVR by 8%",
    status: "live",
    start_date: "2026-02-18",
    cvr_control: 3.21,
    cvr_variant: 3.85,
    rpv_control: 245,
    rpv_variant: 312,
    aov_control: 6500,
    aov_variant: 6720,
    stat_sig: 87,
    sample_size: 14320,
    notes: "Tracking well — expect 95% sig by next Friday",
    created_at: "2026-02-18T10:00:00Z",
    updated_at: "2026-03-05T14:30:00Z",
  },
  {
    id: "demo-2",
    client_name: "Gymshark",
    test_name: "Cart Drawer Upsell Module",
    variant_name: "V1 — Recommended Products Carousel",
    hypothesis:
      "Adding a recommended products carousel in the cart drawer will increase AOV by 12%",
    status: "live",
    start_date: "2026-02-24",
    cvr_control: 4.1,
    cvr_variant: 4.05,
    rpv_control: 380,
    rpv_variant: 435,
    aov_control: 7200,
    aov_variant: 8150,
    stat_sig: 62,
    sample_size: 8540,
    notes: "CVR neutral but AOV uplift looking strong",
    created_at: "2026-02-24T09:00:00Z",
    updated_at: "2026-03-04T16:00:00Z",
  },
  {
    id: "demo-3",
    client_name: "Huel",
    test_name: "Subscription CTA Colour Change",
    variant_name: "V1 — Green CTA to Orange CTA",
    hypothesis:
      "Switching the subscribe CTA from green to orange will improve click-through by 5%",
    status: "winner",
    start_date: "2026-01-20",
    cvr_control: 2.45,
    cvr_variant: 3.12,
    rpv_control: 190,
    rpv_variant: 248,
    aov_control: 5400,
    aov_variant: 5520,
    stat_sig: 97,
    sample_size: 32100,
    notes: "Winner — deployed to 100% on 28 Feb. +27% CVR uplift",
    created_at: "2026-01-20T10:00:00Z",
    updated_at: "2026-02-28T11:00:00Z",
  },
  {
    id: "demo-4",
    client_name: "Huel",
    test_name: "PLP Quick-Add Buttons",
    variant_name: "V1 — Add to Cart on Hover",
    hypothesis: "Quick-add on PLP cards will reduce funnel friction and increase CVR by 6%",
    status: "live",
    start_date: "2026-02-28",
    cvr_control: 1.88,
    cvr_variant: 2.15,
    rpv_control: 155,
    rpv_variant: 178,
    aov_control: 4800,
    aov_variant: 4910,
    stat_sig: 41,
    sample_size: 4200,
    notes: "Only 6 days in — need more traffic",
    created_at: "2026-02-28T09:00:00Z",
    updated_at: "2026-03-05T10:00:00Z",
  },
  {
    id: "demo-5",
    client_name: "REPRESENT",
    test_name: "Sticky ATC Bar on Mobile PDP",
    variant_name: "V1 — Fixed Bottom Bar with Price",
    hypothesis: "Sticky add-to-cart on mobile will catch users who scroll past the main CTA",
    status: "live",
    start_date: "2026-02-10",
    cvr_control: 2.9,
    cvr_variant: 3.48,
    rpv_control: 410,
    rpv_variant: 502,
    aov_control: 12500,
    aov_variant: 12800,
    stat_sig: 92,
    sample_size: 19800,
    notes: "Very close to sig — hold until Friday",
    created_at: "2026-02-10T10:00:00Z",
    updated_at: "2026-03-05T15:00:00Z",
  },
  {
    id: "demo-6",
    client_name: "REPRESENT",
    test_name: "Collection Page Social Proof Banners",
    variant_name: "V1 — X people viewing + Recent Purchases",
    hypothesis: "Social proof messaging on collection pages will increase click-through to PDP",
    status: "loser",
    start_date: "2026-01-13",
    cvr_control: 3.15,
    cvr_variant: 2.88,
    rpv_control: 445,
    rpv_variant: 398,
    aov_control: 12200,
    aov_variant: 11900,
    stat_sig: 96,
    sample_size: 28500,
    notes: "Negative impact — likely felt spammy on premium brand. Rolled back",
    created_at: "2026-01-13T10:00:00Z",
    updated_at: "2026-02-15T09:00:00Z",
  },
  {
    id: "demo-7",
    client_name: "Castore",
    test_name: "Free Shipping Progress Bar in Cart",
    variant_name: "V1 — Animated Bar + Threshold Message",
    hypothesis: "Showing progress toward free shipping will increase AOV by pushing add-ons",
    status: "live",
    start_date: "2026-03-01",
    cvr_control: 3.55,
    cvr_variant: 3.6,
    rpv_control: 320,
    rpv_variant: 385,
    aov_control: 8900,
    aov_variant: 10200,
    stat_sig: 34,
    sample_size: 3100,
    notes: "Early days but AOV trend is very positive",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-05T12:00:00Z",
  },
  {
    id: "demo-8",
    client_name: "Castore",
    test_name: "Homepage Hero Personalisation",
    variant_name: "V1 — Sport-specific hero based on browse history",
    hypothesis: "Personalised hero banners will improve homepage CVR by 10%",
    status: "paused",
    start_date: "2026-02-05",
    cvr_control: 1.2,
    cvr_variant: 1.35,
    rpv_control: 110,
    rpv_variant: 128,
    aov_control: 7500,
    aov_variant: 7600,
    stat_sig: 55,
    sample_size: 11200,
    notes: "Paused — tracking script broke after theme update, fixing this week",
    created_at: "2026-02-05T10:00:00Z",
    updated_at: "2026-03-03T14:00:00Z",
  },
];

/* ── Helpers ─────────────────────────────────────────────────────── */

function uid() {
  return "temp-" + Math.random().toString(36).slice(2, 9);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysBetween(startDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function calcDelta(control: number, variant: number): { value: number; positive: boolean } {
  if (control === 0) return { value: 0, positive: variant >= 0 };
  const delta = ((variant - control) / control) * 100;
  return { value: Math.abs(delta), positive: delta >= 0 };
}

function penceToPounds(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(pence / 100);
}

function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getWeekStart(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function needsAttention(test: CroTest): boolean {
  if (test.status === "paused") return true;
  if (test.status === "live" && Number(test.stat_sig) >= 80) return true;
  if (test.status === "live" && daysBetween(test.start_date) > 30 && Number(test.stat_sig) < 50)
    return true;
  return false;
}

/* ── Sub-components ──────────────────────────────────────────────── */

function PulseDot({ color, pulse = false, size = "sm" }: { color: string; pulse?: boolean; size?: "sm" | "md" }) {
  const dims = size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";
  const ringDims = size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";
  return (
    <span className={`relative inline-flex ${dims}`}>
      {pulse && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-40`} />
      )}
      <span className={`relative inline-flex rounded-full ${ringDims} ${color}`} />
    </span>
  );
}

function StatusBadge({ status }: { status: CroTestStatus }) {
  const sc = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${sc.bg} ${sc.text}`}
    >
      <PulseDot color={sc.dot} pulse={sc.pulse} />
      {sc.label}
    </span>
  );
}

function StatSigBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const color = pct >= 95 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-400" : "bg-[#D4D4D4]";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-[#6B6B6B] w-10 text-right">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function MetricRow({
  label,
  control,
  variant,
  format,
}: {
  label: string;
  control: number;
  variant: number;
  format: "pct" | "currency";
}) {
  const delta = calcDelta(control, variant);
  const prefix = delta.positive ? "+" : "-";
  const color = delta.positive ? "text-emerald-600" : "text-red-500";

  const fmtVal = (v: number) =>
    format === "currency" ? penceToPounds(v) : `${Number(v).toFixed(2)}%`;

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-[#AAAAAA] uppercase tracking-wider font-medium w-12">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#999] tabular-nums">{fmtVal(control)}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" className="text-[#D4D4D4]">
          <path d="M0 4h9M7 1l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span className="text-sm text-[#0A0A0A] font-semibold tabular-nums">{fmtVal(variant)}</span>
        {control > 0 && (
          <span className={`text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
            delta.positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          }`}>
            {prefix}{delta.value.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Activity timeline event types ───────────────────────────────── */

interface TimelineEvent {
  date: string;
  clientName: string;
  testName: string;
  type: "started" | "winner" | "loser" | "paused" | "approaching";
}

const eventConfig: Record<
  TimelineEvent["type"],
  { dot: string; label: string; bg: string; text: string }
> = {
  started: { dot: "bg-blue-500", label: "Started", bg: "bg-blue-50", text: "text-blue-700" },
  winner: { dot: "bg-emerald-500", label: "Winner", bg: "bg-emerald-50", text: "text-emerald-700" },
  loser: { dot: "bg-red-500", label: "Loser", bg: "bg-red-50", text: "text-red-700" },
  paused: { dot: "bg-amber-400", label: "Paused", bg: "bg-amber-50", text: "text-amber-700" },
  approaching: { dot: "bg-amber-400", label: "Near Sig", bg: "bg-amber-50", text: "text-amber-700" },
};

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════ */

export default function CroMonitorPage() {
  const [tests, setTests] = useState<CroTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<CroTestInsert>({
    client_name: "",
    test_name: "",
    variant_name: "",
    hypothesis: "",
    start_date: todayStr(),
  });
  const [submitting, setSubmitting] = useState(false);

  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [editForms, setEditForms] = useState<Record<string, Partial<CroTest>>>({});

  const [checklistTab, setChecklistTab] = useState<"monday" | "friday">("monday");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [timelinePeriod, setTimelinePeriod] = useState<"week" | "month">("week");

  /* ── Data fetch ────────────────────────────────────────────────── */

  const fetchTests = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("cro_tests")
      .select("*")
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (err) {
      setTests(DEMO_DATA);
      setIsDemo(true);
      setError(null);
    } else {
      setTests((data as CroTest[]) || []);
      setIsDemo(false);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  /* ── Checklist persistence ─────────────────────────────────────── */

  useEffect(() => {
    const weekKey = getWeekKey();
    const stored = localStorage.getItem(`cro-checklist-${weekKey}`);
    if (stored) {
      try { setCheckedItems(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  function toggleCheck(key: string) {
    setCheckedItems((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(`cro-checklist-${getWeekKey()}`, JSON.stringify(next));
      return next;
    });
  }

  /* ── Derived data ──────────────────────────────────────────────── */

  const uniqueClients = useMemo(
    () => Array.from(new Set(tests.map((t) => t.client_name))).sort(),
    [tests]
  );

  const summary = useMemo(() => {
    const live = tests.filter((t) => t.status === "live");
    const attention = tests.filter(needsAttention);
    const now = new Date();
    const winnersThisMonth = tests.filter(
      (t) =>
        t.status === "winner" &&
        new Date(t.updated_at).getMonth() === now.getMonth() &&
        new Date(t.updated_at).getFullYear() === now.getFullYear()
    );
    const completed = tests.filter(
      (t) => t.status === "winner" || t.status === "loser" || t.status === "inconclusive"
    );
    return {
      totalLive: live.length,
      needsAttention: attention.length,
      winnersThisMonth: winnersThisMonth.length,
      completed: completed.length,
    };
  }, [tests]);

  const swimlanes = useMemo(() => {
    const attention: CroTest[] = [];
    const running: CroTest[] = [];
    const winners: CroTest[] = [];
    const losers: CroTest[] = [];

    for (const test of tests) {
      if (test.status === "winner") {
        winners.push(test);
      } else if (test.status === "loser" || test.status === "inconclusive") {
        losers.push(test);
      } else if (needsAttention(test)) {
        attention.push(test);
      } else if (test.status === "live") {
        running.push(test);
      } else {
        attention.push(test);
      }
    }

    winners.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    losers.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return { attention, running, winners, losers };
  }, [tests]);

  const timelineEvents = useMemo(() => {
    const periodStart = timelinePeriod === "week" ? getWeekStart() : getMonthStart();
    const now = new Date();
    const events: TimelineEvent[] = [];

    for (const test of tests) {
      const startDate = new Date(test.start_date + "T00:00:00");
      const updatedAt = new Date(test.updated_at);

      if (startDate >= periodStart && startDate <= now) {
        events.push({ date: test.start_date, clientName: test.client_name, testName: test.test_name, type: "started" });
      }

      if (updatedAt >= periodStart && updatedAt <= now) {
        if (test.status === "winner") {
          events.push({ date: test.updated_at, clientName: test.client_name, testName: test.test_name, type: "winner" });
        } else if (test.status === "loser") {
          events.push({ date: test.updated_at, clientName: test.client_name, testName: test.test_name, type: "loser" });
        } else if (test.status === "paused") {
          events.push({ date: test.updated_at, clientName: test.client_name, testName: test.test_name, type: "paused" });
        } else if (test.status === "live" && Number(test.stat_sig) >= 80) {
          events.push({ date: test.updated_at, clientName: test.client_name, testName: test.test_name, type: "approaching" });
        }
      }
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return events;
  }, [tests, timelinePeriod]);

  /* ── CRUD ──────────────────────────────────────────────────────── */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_name.trim() || !form.test_name.trim()) return;

    setSubmitting(true);
    const tempTest: CroTest = {
      id: uid(),
      ...form,
      client_name: form.client_name.trim(),
      test_name: form.test_name.trim(),
      variant_name: form.variant_name.trim(),
      hypothesis: form.hypothesis.trim(),
      status: "live",
      cvr_control: 0, cvr_variant: 0,
      rpv_control: 0, rpv_variant: 0,
      aov_control: 0, aov_variant: 0,
      stat_sig: 0, sample_size: 0,
      notes: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTests((prev) => [tempTest, ...prev]);

    const { data, error: err } = await supabase
      .from("cro_tests")
      .insert({
        client_name: form.client_name.trim(),
        test_name: form.test_name.trim(),
        variant_name: form.variant_name.trim(),
        hypothesis: form.hypothesis.trim(),
        start_date: form.start_date,
      })
      .select()
      .single();

    if (err) {
      setTests((prev) => prev.filter((t) => t.id !== tempTest.id));
      setError(err.message);
    } else {
      setTests((prev) => prev.map((t) => (t.id === tempTest.id ? (data as CroTest) : t)));
      setForm({ client_name: "", test_name: "", variant_name: "", hypothesis: "", start_date: todayStr() });
      setShowAddForm(false);
    }
    setSubmitting(false);
  }

  function startEdit(test: CroTest) {
    setExpandedTests((prev) => ({ ...prev, [test.id]: true }));
    setEditForms((prev) => ({
      ...prev,
      [test.id]: {
        cvr_control: test.cvr_control, cvr_variant: test.cvr_variant,
        rpv_control: test.rpv_control, rpv_variant: test.rpv_variant,
        aov_control: test.aov_control, aov_variant: test.aov_variant,
        stat_sig: test.stat_sig, sample_size: test.sample_size,
        status: test.status, notes: test.notes,
      },
    }));
  }

  function cancelEdit(id: string) {
    setExpandedTests((prev) => ({ ...prev, [id]: false }));
    setEditForms((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }

  function updateEditField(id: string, key: string, value: string | number) {
    setEditForms((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  async function handleSave(testId: string) {
    const updates = editForms[testId];
    if (!updates) return;
    setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, ...updates } : t)));
    setExpandedTests((prev) => ({ ...prev, [testId]: false }));
    const { error: err } = await supabase.from("cro_tests").update(updates).eq("id", testId);
    if (err) { setError(err.message); fetchTests(); }
    setEditForms((prev) => { const next = { ...prev }; delete next[testId]; return next; });
  }

  async function handleDelete(testId: string) {
    const prev = tests;
    setTests((p) => p.filter((t) => t.id !== testId));
    cancelEdit(testId);
    const { error: err } = await supabase.from("cro_tests").delete().eq("id", testId);
    if (err) { setTests(prev); setError(err.message); }
  }

  /* ── Render: Test Card ─────────────────────────────────────────── */

  function renderTestCard(test: CroTest) {
    const isExpanded = expandedTests[test.id];
    const days = daysBetween(test.start_date);
    const hasMetrics =
      Number(test.cvr_control) > 0 || Number(test.cvr_variant) > 0 ||
      Number(test.rpv_control) > 0 || Number(test.rpv_variant) > 0;

    return (
      <div key={test.id} className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden hover:border-[#D0D0D0] transition-colors">
        <div className="p-6">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">
                {test.client_name}
              </span>
              <span className="w-px h-3 bg-[#E5E5E5]" />
              <span className="text-[11px] text-[#AAAAAA] tabular-nums">{days}d</span>
              <StatusBadge status={test.status} />
            </div>
            <button
              onClick={() => (isExpanded ? cancelEdit(test.id) : startEdit(test))}
              className="p-2 -m-1 text-[#CCCCCC] hover:text-[#0A0A0A] transition-colors rounded-lg hover:bg-[#F5F5F5]"
            >
              <PencilSquareIcon className="size-4" />
            </button>
          </div>

          {/* Test name + variant */}
          <h3 className="text-[15px] font-semibold leading-snug mb-1">{test.test_name}</h3>
          {test.variant_name && (
            <p className="text-xs text-[#AAAAAA] mb-5">{test.variant_name}</p>
          )}
          {!test.variant_name && <div className="mb-5" />}

          {/* Metrics */}
          {hasMetrics && (
            <div className="border-t border-[#F0F0F0] pt-4 mb-4 space-y-0.5">
              <MetricRow label="CVR" control={test.cvr_control} variant={test.cvr_variant} format="pct" />
              <MetricRow label="RPV" control={test.rpv_control} variant={test.rpv_variant} format="currency" />
              <MetricRow label="AOV" control={test.aov_control} variant={test.aov_variant} format="currency" />
            </div>
          )}

          {/* Stat sig + sessions */}
          <div className="border-t border-[#F0F0F0] pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#AAAAAA] uppercase tracking-wider font-semibold">Statistical Significance</span>
              <span className="text-[11px] text-[#AAAAAA] tabular-nums">
                {Number(test.sample_size).toLocaleString()} sessions
              </span>
            </div>
            <StatSigBar value={Number(test.stat_sig)} />
          </div>

          {/* Notes */}
          {test.notes && !isExpanded && (
            <p className="mt-4 text-xs text-[#999] leading-relaxed">{test.notes}</p>
          )}
        </div>

        {/* Edit panel */}
        {isExpanded && editForms[test.id] && (
          <div className="px-6 pb-6 pt-5 border-t border-[#E5E5E5] bg-[#FAFAFA] space-y-5">
            {test.hypothesis && (
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                <span className="font-semibold text-[#0A0A0A]">Hypothesis: </span>
                {test.hypothesis}
              </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "cvr_control", label: "CVR Control (%)", step: "0.01" },
                { key: "cvr_variant", label: "CVR Variant (%)", step: "0.01" },
                { key: "rpv_control", label: "RPV Control (p)", step: "1" },
                { key: "rpv_variant", label: "RPV Variant (p)", step: "1" },
                { key: "aov_control", label: "AOV Control (p)", step: "1" },
                { key: "aov_variant", label: "AOV Variant (p)", step: "1" },
                { key: "stat_sig", label: "Stat Sig (%)", step: "0.1" },
                { key: "sample_size", label: "Sample Size", step: "1" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    step={field.step}
                    min={field.key === "stat_sig" ? "0" : undefined}
                    max={field.key === "stat_sig" ? "100" : undefined}
                    value={(editForms[test.id] as Record<string, number | undefined>)[field.key] ?? ""}
                    onChange={(e) => updateEditField(test.id, field.key, Number(e.target.value))}
                    className={smallInputClass}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1.5">Status</label>
                <select
                  value={editForms[test.id].status ?? test.status}
                  onChange={(e) => updateEditField(test.id, "status", e.target.value)}
                  className={selectClass}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{statusConfig[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1.5">Notes</label>
                <input
                  type="text"
                  value={editForms[test.id].notes ?? ""}
                  onChange={(e) => updateEditField(test.id, "notes", e.target.value)}
                  placeholder="Freeform notes..."
                  className={smallInputClass}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => handleSave(test.id)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0A0A0A] text-white text-xs font-medium rounded-lg hover:bg-accent hover:text-[#0A0A0A] transition-colors"
              >
                <CheckIcon className="size-3.5" /> Save
              </button>
              <button
                onClick={() => cancelEdit(test.id)}
                className="px-5 py-2.5 border border-[#E5E5E5] bg-white text-[#6B6B6B] text-xs font-medium rounded-lg hover:bg-[#F5F5F5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(test.id)}
                className="ml-auto flex items-center gap-1.5 px-4 py-2.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <TrashIcon className="size-3.5" /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Render: Swimlane ──────────────────────────────────────────── */

  function renderSwimlane(key: string, items: CroTest[]) {
    const cfg = swimlaneConfig[key];
    return (
      <section>
        <div className="flex items-center gap-3 mb-5">
          <PulseDot color={cfg.dot} pulse={cfg.pulse} size="md" />
          <h2 className="text-sm font-semibold text-[#0A0A0A]">{cfg.title}</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-[#F0F0F0] text-[11px] font-semibold text-[#6B6B6B] tabular-nums">
            {items.length}
          </span>
        </div>
        {items.length === 0 ? (
          <div className="border border-dashed border-[#E5E5E5] rounded-xl py-8 text-center">
            <p className="text-sm text-[#CCCCCC]">{cfg.emptyText}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {items.map((test) => renderTestCard(test))}
          </div>
        )}
      </section>
    );
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-14">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            CRO Test Monitor
          </h1>
          <p className="text-[#999] text-sm">
            Track live A/B tests, review results, and maintain your weekly CRO cadence
          </p>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <div className="mb-8 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Showing demo data — run the SQL migration in Supabase to start tracking real tests.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-8 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-medium">Dismiss</button>
          </div>
        )}

        <div className="space-y-14">
          {/* ── Overview Stats ────────────────────────────────────── */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: summary.totalLive, label: "Live Tests", color: "text-[#0A0A0A]", dot: "bg-green-500", pulse: true },
                { value: summary.needsAttention, label: "Needs Attention", color: "text-amber-600", dot: "bg-red-500", pulse: true },
                { value: summary.winnersThisMonth, label: "Winners This Month", color: "text-emerald-600", dot: "bg-emerald-500", pulse: false },
                { value: summary.completed, label: "Tests Completed", color: "text-[#0A0A0A]", dot: "bg-gray-400", pulse: false },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white border border-[#E5E5E5] rounded-xl p-5 hover:border-[#D0D0D0] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <PulseDot color={stat.dot} pulse={stat.pulse} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                      {stat.label}
                    </span>
                  </div>
                  <div className={`text-3xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Activity Timeline ────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[#0A0A0A]">Activity</h2>
              <div className="inline-flex rounded-lg border border-[#E5E5E5] bg-white p-0.5">
                {(["week", "month"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setTimelinePeriod(p)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      timelinePeriod === p
                        ? "bg-[#0A0A0A] text-white"
                        : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                    }`}
                  >
                    This {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
              {timelineEvents.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[#CCCCCC]">No activity this {timelinePeriod}</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F0F0F0]">
                  {timelineEvents.map((event, i) => {
                    const cfg = eventConfig[event.type];
                    return (
                      <div
                        key={`${event.type}-${event.testName}-${i}`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFA] transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className="text-xs text-[#AAAAAA] tabular-nums w-16 shrink-0">
                          {formatDateShort(event.date)}
                        </span>
                        <span className="text-xs font-semibold text-[#6B6B6B] shrink-0">
                          {event.clientName}
                        </span>
                        <span className="text-xs text-[#0A0A0A] truncate flex-1">
                          {event.testName}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── Add Test ─────────────────────────────────────────── */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-accent hover:text-[#0A0A0A] transition-colors"
            >
              {showAddForm ? <XMarkIcon className="size-4" /> : <PlusIcon className="size-4" />}
              {showAddForm ? "Cancel" : "Add Test"}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleSubmit} className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Client Name</label>
                  <input type="text" value={form.client_name} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} placeholder="e.g. Gymshark" className={inputClass} list="cro-clients" required />
                  <datalist id="cro-clients">{uniqueClients.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className={labelClass}>Test Name</label>
                  <input type="text" value={form.test_name} onChange={(e) => setForm((p) => ({ ...p, test_name: e.target.value }))} placeholder="e.g. PDP Trust Badge Above Fold" className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>Variant Name</label>
                  <input type="text" value={form.variant_name} onChange={(e) => setForm((p) => ({ ...p, variant_name: e.target.value }))} placeholder="e.g. V1 — Badge + Reviews" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Hypothesis</label>
                  <input type="text" value={form.hypothesis} onChange={(e) => setForm((p) => ({ ...p, hypothesis: e.target.value }))} placeholder="e.g. Trust badges increase CVR by 5%" className={inputClass} />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting || !form.client_name.trim() || !form.test_name.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-accent hover:text-[#0A0A0A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? <ArrowPathIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
                Add Test
              </button>
            </form>
          )}

          {/* ── Swimlanes ────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <ArrowPathIcon className="size-5 animate-spin text-[#CCCCCC]" />
            </div>
          ) : (
            <div className="space-y-14">
              {renderSwimlane("attention", swimlanes.attention)}
              {renderSwimlane("running", swimlanes.running)}
              {renderSwimlane("winners", swimlanes.winners)}
              {renderSwimlane("losers", swimlanes.losers)}
            </div>
          )}

          {/* ── Weekly Checklist ──────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[#0A0A0A]">Weekly Review</h2>
              <div className="inline-flex rounded-lg border border-[#E5E5E5] bg-white p-0.5">
                <button
                  onClick={() => setChecklistTab("monday")}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    checklistTab === "monday" ? "bg-[#0A0A0A] text-white" : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                  }`}
                >
                  Monday
                </button>
                <button
                  onClick={() => setChecklistTab("friday")}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    checklistTab === "friday" ? "bg-[#0A0A0A] text-white" : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                  }`}
                >
                  Friday
                </button>
              </div>
            </div>

            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                {checklistTab === "monday" ? "Launch Check" : "Results Review"}
              </p>
              {(checklistTab === "monday" ? MONDAY_CHECKS : FRIDAY_CHECKS).map((item, i) => {
                const key = `${checklistTab}-${i}`;
                const isChecked = !!checkedItems[key];
                return (
                  <label key={key} className="flex items-center gap-4 cursor-pointer group py-1">
                    <button
                      type="button"
                      onClick={() => toggleCheck(key)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                        isChecked
                          ? "bg-[#0A0A0A] border-[#0A0A0A]"
                          : "border-[#D4D4D4] bg-white group-hover:border-[#999]"
                      }`}
                    >
                      {isChecked && <CheckIcon className="size-3 text-white" />}
                    </button>
                    <span className={`text-sm transition-colors ${isChecked ? "line-through text-[#CCCCCC]" : "text-[#333]"}`}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
