"use client";

/* ── Roadmaps (list) ── */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, MapIcon } from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { emptyRoadmap, roadmapsStore } from "@/lib/roadmaps/data";
import { HORIZONS, type Roadmap } from "@/lib/roadmaps/types";

export default function RoadmapsListPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const router = useRouter();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await roadmapsStore.getAll();
      if (cancelled) return;
      setRoadmaps(rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  async function createNew() {
    const r = emptyRoadmap();
    await roadmapsStore.create(r);
    router.push(`/tools/roadmap/${r.id}`);
  }

  if (!isAdmin) {
    return (<div className="p-6"><div className="bg-background rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle">Admin / CRO only.</p></div></div>);
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(6,182,212,0.3)]">
              <MapIcon className="size-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
              Roadmaps
            </h1>
          </div>
          <p className="text-sm text-muted max-w-2xl">
            30/60/90 plans per client. Items scored by ICE (Impact × Confidence × Ease), sequenced into horizons.
          </p>
        </div>
        <button onClick={createNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-background hover:bg-foreground">
          <PlusIcon className="size-4" />
          New roadmap
        </button>
      </header>

      {!hydrated ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-background rounded-xl animate-pulse" />)}</div>
      ) : roadmaps.length === 0 ? (
        <div className="bg-background rounded-2xl p-12 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle">No roadmaps yet. Start one per client.</p></div>
      ) : (
        <ul className="space-y-2">
          {roadmaps.map((r) => (
            <li key={r.id}>
              <Link href={`/tools/roadmap/${r.id}`} className="block bg-background rounded-xl p-4 ring-1 ring-white/[0.04] hover:ring-cyan-500/30 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate mb-1">
                      {r.client_name || "Untitled roadmap"}
                    </div>
                    <div className="text-[12px] text-subtle flex items-center gap-2 flex-wrap">
                      {r.quarter_label && <span>{r.quarter_label}</span>}
                      {r.strategist && <span>· {r.strategist}</span>}
                      <span>· {r.items.length} items</span>
                      {HORIZONS.map((h) => {
                        const count = r.items.filter((i) => i.horizon === h).length;
                        return count > 0 ? (
                          <span key={h} className="px-1.5 py-0.5 rounded bg-surface text-[10px] uppercase tracking-wider">
                            D{h}: {count}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
