"use client";

/* ── Milestone detail ── */

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  clientMilestonesStore,
  daysUntilDue,
  nowISO,
  resolvedStatus,
  uid,
} from "@/lib/client-milestones/data";
import {
  MILESTONE_TITLE,
  STATUS_LABEL,
  STATUS_TINT,
  type ClientMilestone,
  type MilestoneChecklistItem,
  type MilestoneStatus,
} from "@/lib/client-milestones/types";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

const STATUSES: MilestoneStatus[] = ["upcoming", "due", "in_progress", "completed", "skipped"];

export default function MilestoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [m, setM] = useState<ClientMilestone | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await clientMilestonesStore.getAll();
      if (cancelled) return;
      const found = rows.find((r) => r.id === id);
      if (!found) setNotFound(true);
      else setM(found);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const isFirstSave = useRef(true);
  useEffect(() => {
    if (!m) return;
    if (isFirstSave.current) { isFirstSave.current = false; return; }
    const t = setTimeout(async () => {
      setSaving(true);
      const stamped = { ...m, updated_at: nowISO() };
      if (m.status === "completed" && !m.completed_at) stamped.completed_at = nowISO();
      await clientMilestonesStore.update(m.id, stamped);
      setSaving(false);
      setSavedAt(stamped.updated_at);
    }, 600);
    return () => clearTimeout(t);
  }, [m]);

  function patch(p: Partial<ClientMilestone>) {
    setM((prev) => (prev ? { ...prev, ...p } : prev));
  }
  function toggleItem(itemId: string) {
    if (!m) return;
    const items = m.items.map((i) => i.id === itemId ? (i.done_at ? { ...i, done_at: undefined } : { ...i, done_at: nowISO() }) : i);
    const next: Partial<ClientMilestone> = { items };
    if (items.every((i) => i.done_at) && m.status !== "completed") {
      next.status = "completed";
      next.completed_at = nowISO();
    }
    patch(next);
  }
  function addItem() {
    if (!m) return;
    patch({ items: [...m.items, { id: uid(), title: "New item" } as MilestoneChecklistItem] });
  }
  function updateItem(itemId: string, p: Partial<MilestoneChecklistItem>) {
    if (!m) return;
    patch({ items: m.items.map((i) => (i.id === itemId ? { ...i, ...p } : i)) });
  }
  function removeItem(itemId: string) {
    if (!m) return;
    patch({ items: m.items.filter((i) => i.id !== itemId) });
  }
  async function deleteMilestone() {
    if (!m) return;
    if (!window.confirm("Delete this milestone?")) return;
    await clientMilestonesStore.remove(m.id);
    router.push("/tools/lifecycle");
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D]">Admin / CRO only.</p></div></div>);
  if (!hydrated) return (<div className="p-6 space-y-3 max-w-5xl mx-auto">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-[#0C0C0C] rounded-xl animate-pulse" />)}</div>);
  if (notFound || !m) return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D] mb-3">Milestone not found.</p><Link href="/tools/lifecycle" className="text-[12px] uppercase tracking-wider text-sky-300">← Back</Link></div></div>);

  const status = resolvedStatus(m);
  const dUntil = daysUntilDue(m);
  const done = m.items.filter((i) => i.done_at).length;
  const pct = m.items.length === 0 ? 0 : Math.round((done / m.items.length) * 100);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/tools/lifecycle" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA] mb-3">
            <ArrowLeftIcon className="size-3.5" />
            All lifecycle
          </Link>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="size-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex flex-col items-center justify-center text-center shadow-[0_8px_24px_rgba(14,165,233,0.3)] shrink-0">
              <div className="text-sm font-bold text-white leading-none">{m.day}</div>
            </div>
            <h1 className="text-2xl font-semibold text-[#E5E5EA] truncate">{m.client_name}</h1>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>
          <div className="text-[12px] text-[#9CA3AF]">{MILESTONE_TITLE[m.day]}</div>
          <div className="text-[11px] text-[#71757D] mt-1">
            Due {new Date(m.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            {dUntil >= 0 ? ` · in ${dUntil}d` : ` · ${-dUntil}d overdue`}
            {savedAt && ` · saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            {saving && ` · saving…`}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={m.status} onChange={(e) => patch({ status: e.target.value as MilestoneStatus })} className={`${inputClass} w-auto`}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button onClick={deleteMilestone} className="p-1.5 rounded-md text-[#71757D] hover:text-rose-400"><TrashIcon className="size-4" /></button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-gradient-to-br from-sky-500/10 to-cyan-500/10 rounded-2xl p-5 ring-1 ring-sky-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold">Progress</div>
          <div className="text-[11px] font-mono text-sky-200">{done} / {m.items.length}</div>
        </div>
        <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Owner */}
      <div className="bg-[#0F0F10] rounded-2xl p-5 ring-1 ring-white/[0.04]">
        <label className={labelClass}>Owner (CSM running this milestone)</label>
        <input value={m.owner} onChange={(e) => patch({ owner: e.target.value })} className={inputClass} />
      </div>

      {/* Checklist */}
      <div className="bg-[#0F0F10] rounded-2xl p-5 ring-1 ring-white/[0.04]">
        <h2 className="text-sm font-semibold text-[#E5E5EA] mb-4">Checklist</h2>
        <ul className="space-y-2">
          {m.items.map((item) => (
            <li key={item.id} className={`bg-black/40 rounded-xl p-3 ring-1 flex items-start gap-3 ${item.done_at ? "ring-emerald-500/20" : "ring-white/[0.04]"}`}>
              <button onClick={() => toggleItem(item.id)} className={`size-5 rounded-md ring-1 shrink-0 flex items-center justify-center mt-0.5 ${item.done_at ? "bg-emerald-500 ring-emerald-500 text-white" : "ring-white/[0.15] hover:ring-emerald-500/40"}`}>
                {item.done_at && <CheckIcon className="size-3.5" />}
              </button>
              <input value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })} className={`${inputClass} flex-1 ${item.done_at ? "text-[#71757D] line-through" : ""}`} />
              <button onClick={() => removeItem(item.id)} className="p-1 text-[#71757D] hover:text-rose-400"><TrashIcon className="size-3.5" /></button>
            </li>
          ))}
        </ul>
        <button onClick={addItem} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222]">
          <PlusIcon className="size-3.5" /> Add item
        </button>
      </div>

      {/* Notes */}
      <div className="bg-[#0F0F10] rounded-2xl p-5 ring-1 ring-white/[0.04]">
        <h2 className="text-sm font-semibold text-[#E5E5EA] mb-3">Notes (markdown)</h2>
        <textarea value={m.notes} onChange={(e) => patch({ notes: e.target.value })} rows={5} className={`${textareaClass} font-mono text-[13px]`} placeholder="Retro, decisions, expansion conversation, anything specific to this milestone." />
      </div>
    </div>
  );
}
