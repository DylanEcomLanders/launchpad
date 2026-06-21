"use client";

/* ── Test wins (proof deck candidates) ── */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrophyIcon,
  PlusIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { testsStore } from "@/lib/tests/data";
import { fromTest, nowISO, testWinsStore } from "@/lib/test-wins/data";
import {
  STATUS_LABEL,
  STATUS_TINT,
  type TestWin,
  type WinStatus,
} from "@/lib/test-wins/types";

export default function TestWinsPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const [wins, setWins] = useState<TestWin[]>([]);
  const [uncapturedWinners, setUncapturedWinners] = useState<{ test_id: string; client_name: string; uplift_pct?: number; hypothesis: string }[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [w, t] = await Promise.all([testWinsStore.getAll(), testsStore.getAll()]);
      if (cancelled) return;
      setWins(w.sort((a, b) => b.captured_at.localeCompare(a.captured_at)));
      const capturedIds = new Set(w.map((win) => win.source_test_id).filter(Boolean));
      setUncapturedWinners(
        t.filter((te) => te.outcome === "winner" && !capturedIds.has(te.id)).map((te) => ({
          test_id: te.id,
          client_name: te.client_name,
          uplift_pct: te.uplift_pct,
          hypothesis: te.hypothesis_line,
        })),
      );
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  async function captureFromTest(testId: string) {
    const tests = await testsStore.getAll();
    const t = tests.find((x) => x.id === testId);
    if (!t) return;
    const win = fromTest(t);
    await testWinsStore.create(win);
    setWins((prev) => [win, ...prev]);
    setUncapturedWinners((prev) => prev.filter((p) => p.test_id !== testId));
  }

  async function updateStatus(winId: string, status: WinStatus) {
    setWins((prev) => prev.map((w) => (w.id === winId ? { ...w, status, updated_at: nowISO() } : w)));
    await testWinsStore.update(winId, { status, updated_at: nowISO() });
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D]">Admin / CRO only.</p></div></div>);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.3)]">
            <TrophyIcon className="size-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
            Test wins
          </h1>
        </div>
        <p className="text-sm text-[#9CA3AF] max-w-2xl">
          Quick-capture every winning test as it concludes - the inbox ahead of the proof deck. Promote to a full case study when ready.
        </p>
      </header>

      {/* Uncaptured winners callout */}
      {hydrated && uncapturedWinners.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold mb-3">
            Winners not yet captured ({uncapturedWinners.length})
          </h2>
          <ul className="space-y-2">
            {uncapturedWinners.map((u) => (
              <li key={u.test_id} className="bg-emerald-500/5 ring-1 ring-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                <CheckCircleIcon className="size-5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#E5E5EA] flex items-center gap-2">
                    <span className="font-semibold">{u.client_name || "Unknown"}</span>
                    {u.uplift_pct !== undefined && <span className="text-emerald-300 font-mono">+{u.uplift_pct}%</span>}
                  </div>
                  <div className="text-[12px] text-[#9CA3AF] truncate">{u.hypothesis || "(no hypothesis)"}</div>
                </div>
                <button onClick={() => captureFromTest(u.test_id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA] shrink-0">
                  <PlusIcon className="size-3.5" />
                  Capture
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Captured wins */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3">
          Captured ({wins.length})
        </h2>
        {!hydrated ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-[#0C0C0C] rounded-xl animate-pulse" />)}</div>
        ) : wins.length === 0 ? (
          <div className="bg-[#0F0F10] rounded-2xl p-12 text-center ring-1 ring-white/[0.04]">
            <p className="text-sm text-[#71757D]">No wins captured yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {wins.map((w) => (
              <li key={w.id} className="bg-[#0F0F10] rounded-xl p-4 ring-1 ring-white/[0.04]">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-[#E5E5EA] truncate">
                        {w.client_anonymised || w.client_name}
                        {w.surface && <span className="text-[#71757D] font-normal"> · {w.surface}</span>}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[w.status]}`}>
                        {STATUS_LABEL[w.status]}
                      </span>
                      {w.uplift_pct !== undefined && (
                        <span className="text-emerald-300 font-mono text-[12px]">+{w.uplift_pct}%</span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#9CA3AF] line-clamp-2">{w.hypothesis || "(no hypothesis)"}</div>
                    <div className="text-[11px] text-[#71757D] mt-1">
                      {w.hero_metric}
                      {w.baseline_value && w.variant_value && ` · ${w.baseline_value} → ${w.variant_value}`}
                      {w.durability_days && ` · ${w.durability_days}d durable`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateStatus(w.id, w.status === "anonymised" ? "captured" : "anonymised")}
                      className="p-1.5 rounded-md text-[#71757D] hover:text-amber-300"
                      title="Toggle anonymised"
                    >
                      <EyeSlashIcon className="size-4" />
                    </button>
                    {w.status !== "archived" && (
                      <button
                        onClick={() => updateStatus(w.id, "archived")}
                        className="p-1.5 rounded-md text-[#71757D] hover:text-rose-400"
                        title="Archive"
                      >
                        <ArchiveBoxIcon className="size-4" />
                      </button>
                    )}
                    <Link
                      href="/tools/case-studies"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wider bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                      title="Open case studies (promote there)"
                    >
                      Promote
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
