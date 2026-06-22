"use client";

/* ── Cadence + at-risk dashboard ── */

import { useEffect, useMemo, useState } from "react";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  PlusIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { clientOnboardingsStore } from "@/lib/client-onboarding/data";
import type { ClientOnboarding } from "@/lib/client-onboarding/types";
import { testsStore } from "@/lib/tests/data";
import type { AbTest } from "@/lib/tests/types";
import {
  clientTouchesStore,
  daysSinceLastTouch,
  emptyTouch,
  risksForClient,
} from "@/lib/client-touches/data";
import { TOUCH_LABEL, type ClientTouch, type TouchKind } from "@/lib/client-touches/types";
import { inputClass } from "@/lib/form-styles";

const KINDS: TouchKind[] = ["channel_message", "call", "email", "report_sent", "strategy_call", "qbr", "other"];

export default function CadencePage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [touches, setTouches] = useState<ClientTouch[]>([]);
  const [onboardings, setOnboardings] = useState<ClientOnboarding[]>([]);
  const [tests, setTests] = useState<AbTest[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [logging, setLogging] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ kind: TouchKind; summary: string; by: string; awaiting_reply: boolean }>({ kind: "channel_message", summary: "", by: "", awaiting_reply: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [t, o, te] = await Promise.all([
        clientTouchesStore.getAll(),
        clientOnboardingsStore.getAll(),
        testsStore.getAll(),
      ]);
      if (cancelled) return;
      setTouches(t);
      setOnboardings(o);
      setTests(te);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  /* Client list = union of onboarding names + touches names. */
  const clientNames = useMemo(() => {
    const set = new Set<string>();
    onboardings.forEach((o) => o.client_name && set.add(o.client_name));
    touches.forEach((t) => t.client_name && set.add(t.client_name));
    return [...set].sort();
  }, [onboardings, touches]);

  async function logTouch(clientName: string) {
    if (!draft.summary.trim()) return;
    const t = emptyTouch(clientName, draft.kind);
    t.summary = draft.summary.trim();
    t.by = draft.by.trim();
    t.awaiting_reply = draft.awaiting_reply;
    await clientTouchesStore.create(t);
    setTouches((prev) => [t, ...prev]);
    setLogging(null);
    setDraft({ kind: "channel_message", summary: "", by: draft.by, awaiting_reply: false });
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D]">Admin / CRO only.</p></div></div>);

  const rows = clientNames.map((c) => ({
    client_name: c,
    days_silent: daysSinceLastTouch(c, touches),
    last_touch: touches.filter((t) => t.client_name === c).sort((a, b) => b.at.localeCompare(a.at))[0],
    risks: risksForClient(c, touches, onboardings, tests),
  })).sort((a, b) => {
    /* Worst risk first. */
    const aMax = Math.max(0, ...a.risks.map((r) => r.severity === "danger" ? 2 : 1));
    const bMax = Math.max(0, ...b.risks.map((r) => r.severity === "danger" ? 2 : 1));
    return bMax - aMax || a.client_name.localeCompare(b.client_name);
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_8px_24px_rgba(14,165,233,0.3)]">
            <ChatBubbleOvalLeftEllipsisIcon className="size-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
            Cadence + at-risk
          </h1>
        </div>
        <p className="text-sm text-[#9CA3AF] max-w-2xl">
          Per-client comms cadence. Three at-risk signals from the playbook: channel silence (3d+), missed onboarding deadlines, test yield drought (3+ inconclusive).
        </p>
      </header>

      {!hydrated ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-[#0C0C0C] rounded-xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="bg-[#0F0F10] rounded-2xl p-12 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-[#71757D]">No clients to track yet. Start an onboarding or log a touch.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.client_name} className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-[#E5E5EA]">{r.client_name}</span>
                    {r.risks.length === 0 && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30 inline-flex items-center gap-1">
                        <CheckCircleIcon className="size-3" /> Healthy
                      </span>
                    )}
                    {r.risks.map((risk, i) => (
                      <span key={i} className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ${risk.severity === "danger" ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30" : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30"}`} title={risk.detail}>
                        {risk.severity === "danger" ? <ShieldExclamationIcon className="size-3" /> : <ExclamationTriangleIcon className="size-3" />}
                        {risk.label}
                      </span>
                    ))}
                  </div>
                  <div className="text-[12px] text-[#71757D]">
                    {r.last_touch ? (
                      <>
                        Last: {TOUCH_LABEL[r.last_touch.kind]} {r.days_silent === 0 ? "today" : `${r.days_silent}d ago`}
                        {r.last_touch.by && ` · ${r.last_touch.by}`}
                        {r.last_touch.awaiting_reply && <span className="text-amber-300"> · awaiting reply</span>}
                      </>
                    ) : (
                      "No touches logged"
                    )}
                  </div>
                  {r.last_touch?.summary && (
                    <div className="text-[12px] text-[#9CA3AF] mt-1 line-clamp-2">{r.last_touch.summary}</div>
                  )}
                </div>
                <button onClick={() => setLogging(r.client_name === logging ? null : r.client_name)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA] shrink-0">
                  <PhoneIcon className="size-3.5" />
                  {logging === r.client_name ? "Cancel" : "Log touch"}
                </button>
              </div>
              {logging === r.client_name && (
                <div className="border-t border-white/[0.04] p-4 bg-black/40 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[180px_140px_1fr] gap-2">
                    <select value={draft.kind} onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as TouchKind }))} className={`${inputClass} h-9 text-[12px]`}>
                      {KINDS.map((k) => <option key={k} value={k}>{TOUCH_LABEL[k]}</option>)}
                    </select>
                    <input value={draft.by} onChange={(e) => setDraft((d) => ({ ...d, by: e.target.value }))} placeholder="By (CSM name)" className={`${inputClass} h-9 text-[12px]`} />
                    <input value={draft.summary} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} placeholder="One-line summary" className={`${inputClass} h-9 text-[12px]`} onKeyDown={(e) => { if (e.key === "Enter") logTouch(r.client_name); }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                      <input type="checkbox" checked={draft.awaiting_reply} onChange={(e) => setDraft((d) => ({ ...d, awaiting_reply: e.target.checked }))} className="accent-amber-500" />
                      Awaiting their reply
                    </label>
                    <button onClick={() => logTouch(r.client_name)} disabled={!draft.summary.trim()} className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">
                      <PlusIcon className="size-3.5" />
                      Log
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
