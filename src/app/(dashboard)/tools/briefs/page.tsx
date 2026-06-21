"use client";

/* ── Briefs (list) ── */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { briefsStore, emptyBrief } from "@/lib/briefs/data";
import {
  KIND_LABEL,
  KIND_TINT,
  STATUS_LABEL,
  STATUS_TINT,
  type Brief,
  type BriefKind,
} from "@/lib/briefs/types";

const KIND_FILTERS: { value: BriefKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "design", label: "Design" },
  { value: "dev", label: "Dev" },
  { value: "hypothesis", label: "Hypothesis" },
];

export default function BriefsListPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const router = useRouter();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<BriefKind | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await briefsStore.getAll();
      if (cancelled) return;
      setBriefs(rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return briefs.filter((b) => {
      if (filter !== "all" && b.kind !== filter) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.client_name.toLowerCase().includes(q) ||
        b.owner.toLowerCase().includes(q)
      );
    });
  }, [briefs, filter, search]);

  async function createNew(kind: BriefKind) {
    const b = emptyBrief(kind);
    await briefsStore.create(b);
    router.push(`/tools/briefs/${b.id}`);
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D]">Admin / CRO only.</p></div></div>);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(6,182,212,0.3)]">
              <DocumentDuplicateIcon className="size-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
              Briefs
            </h1>
          </div>
          <p className="text-sm text-[#9CA3AF] max-w-2xl">
            Design / Dev / Hypothesis briefs as fillable forms with shareable outputs. Templates per Hero Offer / Execution.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => createNew("hypothesis")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600">
            <PlusIcon className="size-3.5" /> Hypothesis
          </button>
          <button onClick={() => createNew("design")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-cyan-500 text-white hover:bg-cyan-600">
            <PlusIcon className="size-3.5" /> Design
          </button>
          <button onClick={() => createNew("dev")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-sky-500 text-white hover:bg-sky-600">
            <PlusIcon className="size-3.5" /> Dev
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#71757D]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, client, owner" className="w-full pl-9 pr-3 py-2 rounded-md bg-[#0F0F10] ring-1 ring-white/[0.06] text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-emerald-500/40" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {KIND_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${filter === f.value ? "bg-white text-[#0C0C0C]" : "bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222]"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!hydrated ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-[#0C0C0C] rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0F0F10] rounded-2xl p-12 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-[#71757D]">{briefs.length === 0 ? "No briefs yet. Create one from the buttons above." : "No briefs match the current filter."}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((b) => (
            <li key={b.id}>
              <Link href={`/tools/briefs/${b.id}`} className="block bg-[#0F0F10] rounded-xl p-4 ring-1 ring-white/[0.04] hover:ring-cyan-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold shrink-0 ${KIND_TINT[b.kind]}`}>
                        {KIND_LABEL[b.kind]}
                      </span>
                      <span className="text-sm font-semibold text-[#E5E5EA] truncate">{b.title || "Untitled"}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[b.status]}`}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </div>
                    <div className="text-[12px] text-[#71757D] flex items-center gap-2 flex-wrap">
                      {b.client_name && <span>{b.client_name}</span>}
                      {b.project_label && <span>· {b.project_label}</span>}
                      {b.owner && <span>· {b.owner}</span>}
                      {b.deadline && <span>· due {new Date(b.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                    </div>
                  </div>
                  {b.status !== "draft" && (
                    <a href={`/brief-output/${b.output_slug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#71757D] hover:text-emerald-300 shrink-0">
                      View
                      <ArrowTopRightOnSquareIcon className="size-3.5" />
                    </a>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
