"use client";

/* ── Brain library v1 ──
 *
 * Searchable record of what we've tried, what worked, why. Reads
 * ab_tests directly - any concluded test is a brain-library entry,
 * tag-filterable. Auto-grows as the team runs more tests; no
 * separate data layer to maintain.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { testsStore } from "@/lib/tests/data";
import type { AbTest, TestOutcome } from "@/lib/tests/types";

const SURFACE_TAGS = ["pdp", "cart", "checkout", "landing", "post-purchase", "klaviyo", "ad-creative"];
const OUTCOME_FILTERS: { value: TestOutcome | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "winner", label: "Winners" },
  { value: "loser", label: "Losers" },
  { value: "inconclusive", label: "Inconclusive" },
];

export default function KnowledgePage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const [tests, setTests] = useState<AbTest[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<TestOutcome | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await testsStore.getAll();
      if (cancelled) return;
      /* Only concluded tests appear in the library - in-flight tests
       * don't yet have a learning. */
      const concluded = all.filter((t) => t.outcome);
      setTests(concluded.sort((a, b) => (b.ended_at || b.updated_at).localeCompare(a.ended_at || a.updated_at)));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  async function toggleTag(testId: string, tag: string) {
    const t = tests.find((x) => x.id === testId);
    if (!t) return;
    const current = new Set(t.tags || []);
    if (current.has(tag)) current.delete(tag);
    else current.add(tag);
    const next = { ...t, tags: [...current] };
    setTests((prev) => prev.map((x) => (x.id === testId ? next : x)));
    await testsStore.update(testId, { tags: next.tags });
  }

  const allTags = useMemo(() => {
    const set = new Set<string>(SURFACE_TAGS);
    tests.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
    return [...set].sort();
  }, [tests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tests.filter((t) => {
      if (outcomeFilter !== "all" && t.outcome !== outcomeFilter) return false;
      if (tagFilter && !(t.tags || []).includes(tagFilter)) return false;
      if (!q) return true;
      return (
        t.hypothesis_line.toLowerCase().includes(q) ||
        t.client_name.toLowerCase().includes(q) ||
        t.surface.toLowerCase().includes(q) ||
        t.write_up.toLowerCase().includes(q) ||
        t.learnings.toLowerCase().includes(q)
      );
    });
  }, [tests, search, outcomeFilter, tagFilter]);

  const stats = useMemo(() => {
    const total = tests.length;
    const wins = tests.filter((t) => t.outcome === "winner").length;
    return { total, wins, winRate: total === 0 ? 0 : Math.round((wins / total) * 100) };
  }, [tests]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-sky-500 flex items-center justify-center shadow-[0_8px_24px_rgba(6,182,212,0.3)]">
            <AcademicCapIcon className="size-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
            Brain library
          </h1>
        </div>
        <p className="text-sm text-muted max-w-2xl">
          What we&apos;ve tried, what worked, why. Every concluded test - searchable, tag-filterable. The patterns of what works across our Shopify stores, brought out from the team&apos;s head.
        </p>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Tests in library" value={stats.total} />
        <Stat label="Winners" value={stats.wins} accent="emerald" />
        <Stat label="Win rate" value={`${stats.winRate}%`} accent="emerald" />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-subtle" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search hypothesis, client, surface, write-up, learning" className="w-full pl-9 pr-3 py-2 rounded-md bg-background ring-1 ring-white/[0.06] text-[13px] text-foreground placeholder:text-subtle focus:outline-none focus:ring-cyan-500/40" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {OUTCOME_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setOutcomeFilter(f.value)} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${outcomeFilter === f.value ? "bg-white text-background" : "bg-surface text-muted hover:bg-surface-raised"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-subtle font-semibold">Tags:</span>
          <button onClick={() => setTagFilter(null)} className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider ${tagFilter === null ? "bg-white text-background" : "bg-surface text-muted hover:bg-surface-raised"}`}>
            All
          </button>
          {allTags.map((tag) => (
            <button key={tag} onClick={() => setTagFilter(tag === tagFilter ? null : tag)} className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider ${tag === tagFilter ? "bg-cyan-500/30 text-cyan-100 ring-1 ring-cyan-400/40" : "bg-surface text-muted hover:bg-surface-raised"}`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {!hydrated ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-background rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-background rounded-2xl p-12 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-subtle">
            {tests.length === 0 ? "No concluded tests yet. The library fills as you call tests." : "No tests match the current filter."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((t) => (
            <li key={t.id} className="bg-background rounded-2xl p-5 ring-1 ring-white/[0.04]">
              <div className="flex items-start gap-3 mb-3">
                <OutcomeIcon outcome={t.outcome!} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-foreground">{t.client_name || "Unattached"}</span>
                    {t.surface && <span className="text-[12px] text-subtle">· {t.surface}</span>}
                    {t.uplift_pct !== undefined && (
                      <span className={`text-[12px] font-mono ${t.outcome === "winner" ? "text-emerald-300" : t.outcome === "loser" ? "text-rose-300" : "text-zinc-300"}`}>
                        {t.uplift_pct >= 0 ? "+" : ""}{t.uplift_pct}%
                      </span>
                    )}
                    {t.ended_at && (
                      <span className="text-[11px] text-subtle ml-auto">{new Date(t.ended_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    )}
                  </div>
                  <p className="text-[13px] text-foreground mb-2">{t.hypothesis_line || "(no hypothesis)"}</p>
                  {t.learnings && (
                    <div className="text-[12px] text-muted bg-black/40 rounded-lg p-3 ring-1 ring-white/[0.04] mb-2">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold mb-1">Learning</div>
                      {t.learnings}
                    </div>
                  )}
                  <div className="flex items-center gap-1 flex-wrap">
                    {(t.tags || []).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => isAdmin && toggleTag(t.id, tag)}
                        className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                      >
                        {tag} {isAdmin && "×"}
                      </button>
                    ))}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          const tag = window.prompt("Add tag (lowercase, e.g. pdp, cart, hero, color-swatch)");
                          if (tag) toggleTag(t.id, tag.trim().toLowerCase());
                        }}
                        className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider bg-surface text-subtle hover:bg-surface-raised hover:text-foreground"
                      >
                        + tag
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OutcomeIcon({ outcome }: { outcome: TestOutcome }) {
  if (outcome === "winner") return <CheckCircleIcon className="size-5 text-emerald-400 shrink-0 mt-0.5" />;
  if (outcome === "loser") return <XCircleIcon className="size-5 text-rose-400 shrink-0 mt-0.5" />;
  return <ExclamationCircleIcon className="size-5 text-zinc-400 shrink-0 mt-0.5" />;
}

function Stat({ label, value, accent = "default" }: { label: string; value: number | string; accent?: "default" | "emerald" }) {
  return (
    <div className="bg-background rounded-xl p-4 ring-1 ring-white/[0.04]">
      <div className="text-[10px] uppercase tracking-wider text-subtle font-semibold">{label}</div>
      <div className={`text-2xl font-semibold ${accent === "emerald" ? "text-emerald-300" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
