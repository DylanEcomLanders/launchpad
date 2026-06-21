"use client";

/* ── Onboarding list ── */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, SparklesIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  clientOnboardingsStore,
  completionPct,
  dayNumber,
  emptyOnboarding,
  overdueItems,
} from "@/lib/client-onboarding/data";
import { STATUS_LABEL, STATUS_TINT, type ClientOnboarding } from "@/lib/client-onboarding/types";

export default function OnboardingListPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const router = useRouter();
  const [rows, setRows] = useState<ClientOnboarding[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await clientOnboardingsStore.getAll();
      if (cancelled) return;
      setRows(data.sort((a, b) => b.started_at.localeCompare(a.started_at)));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  async function createNew() {
    const o = emptyOnboarding();
    await clientOnboardingsStore.create(o);
    router.push(`/tools/onboarding/${o.id}`);
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D]">Admin / CRO only.</p></div></div>);

  const active = rows.filter((r) => r.status === "in_progress");
  const done = rows.filter((r) => r.status !== "in_progress");

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_8px_24px_rgba(14,165,233,0.3)]">
              <SparklesIcon className="size-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
              Onboarding
            </h1>
          </div>
          <p className="text-sm text-[#9CA3AF] max-w-2xl">
            First-week wow per client. Bulletproof checklist - pack sent, call done, deep-dive complete, roadmap delivered, first test live.
          </p>
        </div>
        <button onClick={createNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA]">
          <PlusIcon className="size-4" /> New onboarding
        </button>
      </header>

      {!hydrated ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-[#0C0C0C] rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          <Section title={`Active (${active.length})`} rows={active} />
          {done.length > 0 && <Section title={`Closed (${done.length})`} rows={done} />}
        </>
      )}
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: ClientOnboarding[] }) {
  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-[#71757D]">Nothing here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const pct = completionPct(r);
            const overdue = overdueItems(r);
            return (
              <li key={r.id}>
                <Link href={`/tools/onboarding/${r.id}`} className="block bg-[#0F0F10] rounded-xl p-4 ring-1 ring-white/[0.04] hover:ring-sky-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-[#E5E5EA] truncate">
                          {r.client_name || "Untitled"}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                        {overdue.length > 0 && r.status === "in_progress" && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30 flex items-center gap-1">
                            <ExclamationTriangleIcon className="size-3" />
                            {overdue.length} overdue
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[#71757D] flex items-center gap-2 flex-wrap">
                        <span>Day {dayNumber(r)}</span>
                        {r.csm_name && <span>· CSM {r.csm_name}</span>}
                        {r.strategist_name && <span>· {r.strategist_name}</span>}
                        <span className="text-emerald-300/80">· {pct}% done</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
