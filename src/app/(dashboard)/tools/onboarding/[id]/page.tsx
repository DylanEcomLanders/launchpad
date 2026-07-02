"use client";

/* ── Onboarding detail / checklist ── */

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  clientOnboardingsStore,
  completionPct,
  dayNumber,
  nowISO,
  uid,
} from "@/lib/client-onboarding/data";
import {
  OWNER_LABEL,
  STATUS_LABEL,
  STATUS_TINT,
  type ClientOnboarding,
  type OnboardingChecklistItem,
  type OnboardingStatus,
} from "@/lib/client-onboarding/types";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

const STATUSES: OnboardingStatus[] = ["in_progress", "completed", "abandoned"];
const OWNERS: OnboardingChecklistItem["owner_role"][] = ["csm", "strategist", "pod", "client"];

export default function OnboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [o, setO] = useState<ClientOnboarding | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await clientOnboardingsStore.getAll();
      if (cancelled) return;
      const found = rows.find((r) => r.id === id);
      if (!found) setNotFound(true);
      else setO(found);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const isFirstSave = useRef(true);
  useEffect(() => {
    if (!o) return;
    if (isFirstSave.current) { isFirstSave.current = false; return; }
    const t = setTimeout(async () => {
      setSaving(true);
      const stamped = { ...o, updated_at: nowISO() };
      if (o.status === "completed" && !o.completed_at) stamped.completed_at = nowISO();
      await clientOnboardingsStore.update(o.id, stamped);
      setSaving(false);
      setSavedAt(stamped.updated_at);
    }, 600);
    return () => clearTimeout(t);
  }, [o]);

  function patch(p: Partial<ClientOnboarding>) {
    setO((prev) => (prev ? { ...prev, ...p } : prev));
  }
  function toggleItem(itemId: string) {
    if (!o) return;
    const items = o.items.map((i) => {
      if (i.id !== itemId) return i;
      return i.done_at ? { ...i, done_at: undefined, done_by: undefined } : { ...i, done_at: nowISO() };
    });
    patch({ items });
    /* Auto-complete the onboarding when all items are ticked. */
    if (items.every((i) => i.done_at) && o.status === "in_progress") {
      patch({ status: "completed", completed_at: nowISO() });
    }
  }
  function updateItem(itemId: string, p: Partial<OnboardingChecklistItem>) {
    if (!o) return;
    patch({ items: o.items.map((i) => (i.id === itemId ? { ...i, ...p } : i)) });
  }
  function addItem() {
    if (!o) return;
    const order = o.items.length === 0 ? 0 : Math.max(...o.items.map((i) => i.order)) + 1;
    const item: OnboardingChecklistItem = {
      id: uid(),
      title: "New item",
      description: "",
      owner_role: "csm",
      order,
      due_offset_days: 7,
    };
    patch({ items: [...o.items, item] });
  }
  function removeItem(itemId: string) {
    if (!o) return;
    patch({ items: o.items.filter((i) => i.id !== itemId) });
  }
  async function deleteOnboarding() {
    if (!o) return;
    if (!window.confirm("Delete this onboarding?")) return;
    await clientOnboardingsStore.remove(o.id);
    router.push("/tools/onboarding");
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-background rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle">Admin / CRO only.</p></div></div>);
  if (!hydrated) return (<div className="p-6 space-y-3 max-w-5xl mx-auto">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-background rounded-xl animate-pulse" />)}</div>);
  if (notFound || !o) return (<div className="p-6"><div className="bg-background rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle mb-3">Onboarding not found.</p><Link href="/tools/onboarding" className="text-[12px] uppercase tracking-wider text-sky-300">← Back</Link></div></div>);

  const pct = completionPct(o);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/tools/onboarding" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-subtle hover:text-foreground mb-3">
            <ArrowLeftIcon className="size-3.5" />
            All onboardings
          </Link>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="size-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_8px_24px_rgba(14,165,233,0.3)] shrink-0">
              <SparklesIcon className="size-4 text-white" />
            </div>
            <input value={o.client_name} onChange={(e) => patch({ client_name: e.target.value })} className="text-2xl font-semibold text-foreground bg-transparent border-none outline-none focus:ring-0 min-w-0 flex-1" placeholder="Client name" />
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[o.status]}`}>
              {STATUS_LABEL[o.status]}
            </span>
          </div>
          <div className="text-[12px] text-subtle">
            Day {dayNumber(o)} · {pct}% done · {saving ? "Saving…" : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loaded"}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={o.status} onChange={(e) => patch({ status: e.target.value as OnboardingStatus })} className={`${inputClass} w-auto`}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button onClick={deleteOnboarding} className="p-1.5 rounded-md text-subtle hover:text-rose-400"><TrashIcon className="size-4" /></button>
        </div>
      </div>

      {/* Progress strip */}
      <div className="bg-gradient-to-br from-sky-500/10 to-cyan-500/10 rounded-2xl p-5 ring-1 ring-sky-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold">Progress</div>
          <div className="text-[11px] font-mono text-sky-200">{o.items.filter((i) => i.done_at).length} / {o.items.length}</div>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Meta */}
      <div className="bg-background rounded-2xl p-5 ring-1 ring-white/[0.04] grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label className={labelClass}>CSM</label><input value={o.csm_name} onChange={(e) => patch({ csm_name: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Strategist</label><input value={o.strategist_name} onChange={(e) => patch({ strategist_name: e.target.value })} className={inputClass} /></div>
      </div>

      {/* Checklist */}
      <div className="bg-background rounded-2xl ring-1 ring-white/[0.04] p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Checklist</h2>
        <ul className="space-y-2">
          {o.items
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                onToggle={() => toggleItem(item.id)}
                onChange={(p) => updateItem(item.id, p)}
                onDelete={() => removeItem(item.id)}
              />
            ))}
        </ul>
        <button onClick={addItem} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-surface text-muted hover:bg-surface-raised">
          <PlusIcon className="size-3.5" /> Add item
        </button>
      </div>

      {/* Notes */}
      <div className="bg-background rounded-2xl p-5 ring-1 ring-white/[0.04]">
        <h2 className="text-sm font-semibold text-foreground mb-3">Notes</h2>
        <textarea value={o.notes} onChange={(e) => patch({ notes: e.target.value })} rows={4} className={`${textareaClass} font-mono text-[13px]`} placeholder="Context, intel, anything specific to this onboarding." />
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  onToggle,
  onChange,
  onDelete,
}: {
  item: OnboardingChecklistItem;
  onToggle: () => void;
  onChange: (p: Partial<OnboardingChecklistItem>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className={`bg-black/40 rounded-xl p-3 ring-1 ${item.done_at ? "ring-emerald-500/20" : "ring-white/[0.04]"}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`size-5 rounded-md ring-1 shrink-0 flex items-center justify-center mt-0.5 ${item.done_at ? "bg-emerald-500 ring-emerald-500 text-white" : "ring-white/[0.15] hover:ring-emerald-500/40"}`}
          title={item.done_at ? "Mark not done" : "Mark done"}
        >
          {item.done_at && <CheckIcon className="size-3.5" />}
        </button>
        <button onClick={() => setExpanded((v) => !v)} className="flex-1 min-w-0 text-left">
          <div className={`text-[13px] ${item.done_at ? "text-subtle line-through" : "text-foreground"}`}>
            {item.title || "Untitled"}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-subtle mt-0.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><UserIcon className="size-3" /> {OWNER_LABEL[item.owner_role]}</span>
            <span>· Due day {item.due_offset_days}</span>
            {item.done_at && <span className="text-emerald-300">· done {new Date(item.done_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
          </div>
        </button>
        <button onClick={onDelete} className="p-1 text-subtle hover:text-rose-400" title="Delete"><TrashIcon className="size-3.5" /></button>
      </div>
      {expanded && (
        <div className="mt-3 ml-8 space-y-2">
          <input value={item.title} onChange={(e) => onChange({ title: e.target.value })} className={inputClass} placeholder="Title" />
          <textarea value={item.description} onChange={(e) => onChange({ description: e.target.value })} rows={2} className={`${textareaClass} text-[13px]`} placeholder="What needs doing" />
          <div className="grid grid-cols-2 gap-2">
            <select value={item.owner_role} onChange={(e) => onChange({ owner_role: e.target.value as OnboardingChecklistItem["owner_role"] })} className={inputClass}>
              {OWNERS.map((o) => <option key={o} value={o}>{OWNER_LABEL[o]}</option>)}
            </select>
            <input type="number" value={item.due_offset_days} onChange={(e) => onChange({ due_offset_days: Number(e.target.value) || 0 })} className={inputClass} placeholder="Due offset days" />
          </div>
        </div>
      )}
    </li>
  );
}
