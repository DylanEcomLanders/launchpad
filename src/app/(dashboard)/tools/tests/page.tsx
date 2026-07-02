"use client";

/* ── Test tracker (list) ── */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, BeakerIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { daysRunning, emptyTest, sigProgress, testsStore } from "@/lib/tests/data";
import {
  OUTCOME_LABEL,
  OUTCOME_TINT,
  STATUS_LABEL,
  STATUS_TINT,
  type AbTest,
  type TestStatus,
} from "@/lib/tests/types";

const TABS: { value: "active" | "concluded"; label: string }[] = [
  { value: "active", label: "Live + drafting" },
  { value: "concluded", label: "Concluded + killed" },
];

export default function TestsListPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const router = useRouter();
  const [tests, setTests] = useState<AbTest[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<"active" | "concluded">("active");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await testsStore.getAll();
      if (cancelled) return;
      setTests(rows.sort((a, b) => (b.started_at || b.created_at).localeCompare(a.started_at || a.created_at)));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeStatuses: TestStatus[] = ["drafting", "live", "paused"];
    return tests.filter((t) => {
      const inTab = tab === "active" ? activeStatuses.includes(t.status) : !activeStatuses.includes(t.status);
      if (!inTab) return false;
      if (!q) return true;
      return (
        t.hypothesis_line.toLowerCase().includes(q) ||
        t.client_name.toLowerCase().includes(q) ||
        t.surface.toLowerCase().includes(q)
      );
    });
  }, [tests, tab, search]);

  async function createNew() {
    const t = emptyTest();
    await testsStore.create(t);
    router.push(`/tools/tests/${t.id}`);
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-surface rounded-2xl p-8 text-center border border-border"><p className="text-sm text-subtle">Admin / CRO only.</p></div></div>);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-9 rounded-xl bg-surface-raised border border-border flex items-center justify-center">
              <BeakerIcon className="size-5 text-foreground" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Tests
            </h1>
          </div>
          <p className="text-sm text-muted max-w-2xl">
            Every test in one place - hypothesis, runtime, significance, result, write-up. Strategist calls each test against the target significance.
          </p>
        </div>
        <button onClick={createNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-background hover:bg-foreground">
          <PlusIcon className="size-4" />
          New test
        </button>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-subtle" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search hypothesis, client, surface" className="w-full pl-9 pr-3 py-2 rounded-md bg-surface border border-border text-[13px] text-foreground placeholder:text-subtle focus:outline-none focus:ring-ring" />
        </div>
        <div className="flex items-center gap-1.5">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${tab === t.value ? "bg-white text-background" : "bg-surface text-muted hover:bg-surface-raised"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!hydrated ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-2xl p-12 text-center border border-border">
          <p className="text-sm text-subtle">{tab === "active" ? "No live or drafting tests right now." : "No concluded tests yet."}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const days = daysRunning(t);
            return (
              <li key={t.id}>
                <Link href={`/tools/tests/${t.id}`} className="block bg-surface rounded-xl p-4 border border-border hover:border-border transition-all">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[t.status]}`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                        {t.outcome && (
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${OUTCOME_TINT[t.outcome]}`}>
                            {OUTCOME_LABEL[t.outcome]}
                            {t.uplift_pct !== undefined && ` ${t.uplift_pct >= 0 ? "+" : ""}${t.uplift_pct}%`}
                          </span>
                        )}
                        <span className="text-sm text-foreground truncate">
                          {t.client_name || "Unattached"}
                          {t.surface && ` · ${t.surface}`}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted line-clamp-2">
                        {t.hypothesis_line || <span className="italic text-subtle">No hypothesis yet</span>}
                      </p>
                      {t.status === "live" && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-subtle mb-1">
                            <span>{days !== null ? `${days}d running` : "—"}</span>
                            {t.significance_reached_pct !== undefined && (
                              <span>· {t.significance_reached_pct}% sig (target {t.significance_target_pct}%)</span>
                            )}
                          </div>
                          <div className="h-1 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-success rounded-full transition-all" style={{ width: `${sigProgress(t)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
