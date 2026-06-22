"use client";

/* ── Objection library ──
 *
 * Shell - the data already lives in offer_objections. This surface
 * promotes it from "sub-section of the playbook" to its own tool so
 * the closer can search/filter in real time during a call.
 *
 * Polish later: in-line edit, tag system, "most-heard" sorting, voice
 * search, the smart pull on /tools/proposals discovery-call form.
 */

import { useEffect, useState } from "react";
import { MegaphoneIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { offerObjectionsStore } from "@/lib/hero-offer/data";
import type { OfferObjection } from "@/lib/hero-offer/types";
import { ToolShell } from "@/lib/hero-offer/tool-shell";

export default function ObjectionsPage() {
  const [rows, setRows] = useState<OfferObjection[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await offerObjectionsStore.getAll();
      if (cancelled) return;
      setRows(all.sort((a, b) => a.order - b.order));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? rows.filter((r) => r.objection.toLowerCase().includes(needle) || r.response.toLowerCase().includes(needle))
    : rows;

  return (
    <ToolShell
      title="Objection library"
      blurb="Every objection we've heard, and the response that lands. Searchable in real time during a call."
      parentHref="/hero-offer/acquisition"
      parentLabel="Back to Acquisition"
      status="shell"
      accent="emerald"
      icon={<MegaphoneIcon className="size-5" />}
    >
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#71757D]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the objection or the response…"
          className="w-full pl-9 pr-3 py-2 rounded-md bg-[#0F0F10] ring-1 ring-white/[0.06] text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-emerald-500/40"
        />
      </div>

      {!hydrated ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-[#0C0C0C] rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0F0F10] rounded-2xl p-12 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-[#71757D]">
            {rows.length === 0
              ? "No objections logged yet. Add them via /hero-offer/acquisition — they'll appear here automatically."
              : "Nothing matches that search."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((o) => (
            <li key={o.id} className="bg-[#0F0F10] rounded-2xl p-5 ring-1 ring-white/[0.04]">
              <div className="text-sm font-semibold text-[#E5E5EA] mb-2">&ldquo;{o.objection}&rdquo;</div>
              <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{o.response || <span className="italic text-[#71757D]">No response yet.</span>}</p>
            </li>
          ))}
        </ul>
      )}
    </ToolShell>
  );
}
