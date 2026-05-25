"use client";

/* Strategy view: third toggle option on /pods-v2.
 *
 * Two tracked touchpoints:
 *   - Briefs: one row per onboarding submission (auto-populated when
 *     PM assigns an onboarding to a pod, or added manually).
 *   - Results: one row per live test.
 *
 * Wired interactions:
 *   - Tick to mark done → moves row to Done section
 *   - Untick from Done → moves back to active
 *   - "Add brief manually" / "Add result manually" → opens form modal
 *   - Three-dot row menu → Remove
 *   - "View" on brief row → onboarding popup with deliverable list
 *
 * Mock data + local state only. Production would swap to real fetch +
 * Supabase mutators.
 */

import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type PodId = "Pod 1" | "Pod 2" | "Pod 3";
type BriefStatus = "needs_brief" | "drafting" | "in_review" | "approved";
type ResultStatus = "running" | "ready" | "overdue";

interface Deliverable {
  type: string;
  label?: string;
}

interface BriefRow {
  id: string;
  client: string;
  pod: PodId;
  status: BriefStatus;
  onboarding_received: string;
  is_overdue?: boolean;
  deliverables: Deliverable[];
  retainer?: string;
  done?: boolean;
}

interface ResultRow {
  id: string;
  client: string;
  pod: PodId;
  project: string;
  live_since: string;
  live_days: number;
  status: ResultStatus;
  done?: boolean;
}

// ─── Mock data ───────────────────────────────────────────────────────

const BRIEFS_INITIAL: BriefRow[] = [
  { id: "b1", client: "Trip CBD", pod: "Pod 3", status: "needs_brief", onboarding_received: "25 May", retainer: "Bucket B", deliverables: [{ type: "Quiz", label: "Skin-type segmentation" }, { type: "PDP", label: "CBD Oil 1000mg" }, { type: "PDP", label: "Gummies bundle" }, { type: "Homepage" }] },
  { id: "b2", client: "Loop Earplugs", pod: "Pod 2", status: "drafting", onboarding_received: "15 May", is_overdue: true, retainer: "8k retainer", deliverables: [{ type: "PDP", label: "Quiet bundle" }, { type: "PDP", label: "Engage bundle" }, { type: "PDP", label: "Experience bundle" }, { type: "Quiz", label: "Use-case segmentation" }] },
  { id: "b3", client: "Hydrant", pod: "Pod 2", status: "drafting", onboarding_received: "21 May", retainer: "8k retainer", deliverables: [{ type: "Email", label: "Welcome 1" }, { type: "Email", label: "Welcome 2" }, { type: "Email", label: "Welcome 3" }, { type: "Email", label: "Lifecycle 1" }, { type: "Email", label: "Lifecycle 2" }] },
  { id: "b4", client: "Pact Coffee", pod: "Pod 1", status: "in_review", onboarding_received: "12 May", retainer: "8k retainer", deliverables: [{ type: "Page", label: "Subscription landing" }, { type: "PDP", label: "Checkout cart updates" }] },
  { id: "b5", client: "Beam", pod: "Pod 3", status: "approved", onboarding_received: "5 May", retainer: "Bucket C", done: true, deliverables: [{ type: "PDP", label: "Sleep gummies" }, { type: "Homepage" }] },
];

const RESULTS_INITIAL: ResultRow[] = [
  { id: "r1", client: "Loop Earplugs", pod: "Pod 2", project: "Bundle angle B", live_since: "11 May", live_days: 14, status: "overdue" },
  { id: "r2", client: "Hydrant", pod: "Pod 2", project: "Free shipping floor test", live_since: "16 May", live_days: 9, status: "ready" },
  { id: "r3", client: "Pact Coffee", pod: "Pod 1", project: "Subscription upsell variant", live_since: "20 May", live_days: 5, status: "running" },
  { id: "r4", client: "Three Spirit", pod: "Pod 1", project: "Quiz funnel A/B", live_since: "19 May", live_days: 6, status: "running" },
  { id: "r5", client: "Hydrant", pod: "Pod 2", project: "Hero hook variant", live_since: "1 May", live_days: 24, status: "running", done: true },
];

const BRIEF_ORDER: Record<BriefStatus, number> = { needs_brief: 0, drafting: 1, in_review: 2, approved: 3 };
const RESULT_ORDER: Record<ResultStatus, number> = { overdue: 0, ready: 1, running: 2 };

const BRIEF_STATUS_LABEL: Record<BriefStatus, string> = {
  needs_brief: "Needs brief",
  drafting: "Drafting",
  in_review: "In review",
  approved: "Approved",
};

const RESULT_STATUS_LABEL: Record<ResultStatus, string> = {
  running: "Running",
  ready: "Ready to read",
  overdue: "Read overdue",
};

const POD_OPTIONS: PodId[] = ["Pod 1", "Pod 2", "Pod 3"];

const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const todayShort = () =>
  new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function StrategyView() {
  const [briefs, setBriefs] = useState<BriefRow[]>(BRIEFS_INITIAL);
  const [results, setResults] = useState<ResultRow[]>(RESULTS_INITIAL);
  const [popupBriefId, setPopupBriefId] = useState<string | null>(null);
  const [addBriefOpen, setAddBriefOpen] = useState(false);
  const [addResultOpen, setAddResultOpen] = useState(false);

  const activeBriefs = briefs.filter((b) => !b.done).sort((a, b) => BRIEF_ORDER[a.status] - BRIEF_ORDER[b.status]);
  const doneBriefs = briefs.filter((b) => b.done);
  const activeResults = results.filter((r) => !r.done).sort((a, b) => RESULT_ORDER[a.status] - RESULT_ORDER[b.status]);
  const doneResults = results.filter((r) => r.done);

  const totalActive = activeBriefs.length + activeResults.length;
  const actCount =
    activeBriefs.filter((b) => b.status === "needs_brief" || (b.status === "drafting" && b.is_overdue)).length +
    activeResults.filter((r) => r.status === "overdue" || r.status === "ready").length;

  const toggleBriefDone = (id: string) => setBriefs((p) => p.map((b) => (b.id === id ? { ...b, done: !b.done } : b)));
  const removeBrief = (id: string) => setBriefs((p) => p.filter((b) => b.id !== id));
  const addBrief = (b: Omit<BriefRow, "id">) => setBriefs((p) => [{ ...b, id: newId() }, ...p]);

  const toggleResultDone = (id: string) => setResults((p) => p.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  const removeResult = (id: string) => setResults((p) => p.filter((r) => r.id !== id));
  const addResult = (r: Omit<ResultRow, "id">) => setResults((p) => [{ ...r, id: newId() }, ...p]);

  const popupBrief = briefs.find((b) => b.id === popupBriefId) ?? null;

  return (
    <div className="mt-6">
      <p className="mb-4 text-[12px] text-[#7A7A7A]">
        {totalActive} in flight ·{" "}
        <span className="font-semibold text-rose-700">{actCount} need attention</span>
      </p>

      <div className="space-y-4">
        {/* Briefs */}
        <section className="overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
          <div className="flex items-baseline justify-between border-b border-[#F0F0F0] px-4 py-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">Briefs</span>
              <span className="text-[10px] tabular-nums text-[#A0A0A0]">{activeBriefs.length}</span>
              <span className="text-[11px] text-[#A0A0A0]">· Auto-added when onboarding lands on a pod · one row per client</span>
            </div>
          </div>

          <table className="min-w-full text-left text-[12px]">
            <thead className="bg-[#FAFAFB] text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
              <tr>
                <th className="w-6 px-2 py-2"></th>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Pod</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Onboarding received</th>
                <th className="px-3 py-2 text-left">Onboarding</th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {activeBriefs.map((b) => (
                <BriefTableRow
                  key={b.id}
                  b={b}
                  onTick={() => toggleBriefDone(b.id)}
                  onViewOnboarding={() => setPopupBriefId(b.id)}
                  onRemove={() => removeBrief(b.id)}
                />
              ))}
              {activeBriefs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-center text-[11px] italic text-[#A0A0A0]">
                    No active briefs. Add one manually or wait for a new onboarding.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <SectionFooter label="Add brief manually" onClick={() => setAddBriefOpen(true)} />

          {doneBriefs.length > 0 && (
            <DoneSection count={doneBriefs.length}>
              <table className="min-w-full text-left text-[12px]">
                <tbody className="divide-y divide-[#F0F0F0]">
                  {doneBriefs.map((b) => (
                    <DoneBriefRow key={b.id} b={b} onUntick={() => toggleBriefDone(b.id)} />
                  ))}
                </tbody>
              </table>
            </DoneSection>
          )}
        </section>

        {/* Results */}
        <section className="overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
          <div className="flex items-baseline justify-between border-b border-[#F0F0F0] px-4 py-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Results</span>
              <span className="text-[10px] tabular-nums text-[#A0A0A0]">{activeResults.length}</span>
              <span className="text-[11px] text-[#A0A0A0]">· Live tests · how long they have been running</span>
            </div>
          </div>

          <table className="min-w-full text-left text-[12px]">
            <thead className="bg-[#FAFAFB] text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
              <tr>
                <th className="w-6 px-2 py-2"></th>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Pod</th>
                <th className="px-3 py-2 text-left">Project</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Live since</th>
                <th className="px-3 py-2 text-left">Days live</th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {activeResults.map((r) => (
                <ResultTableRow
                  key={r.id}
                  r={r}
                  onTick={() => toggleResultDone(r.id)}
                  onRemove={() => removeResult(r.id)}
                />
              ))}
              {activeResults.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-3 text-center text-[11px] italic text-[#A0A0A0]">
                    No live tests right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <SectionFooter label="Add result manually" onClick={() => setAddResultOpen(true)} />

          {doneResults.length > 0 && (
            <DoneSection count={doneResults.length}>
              <table className="min-w-full text-left text-[12px]">
                <tbody className="divide-y divide-[#F0F0F0]">
                  {doneResults.map((r) => (
                    <DoneResultRow key={r.id} r={r} onUntick={() => toggleResultDone(r.id)} />
                  ))}
                </tbody>
              </table>
            </DoneSection>
          )}
        </section>
      </div>

      {popupBrief && <OnboardingPopup brief={popupBrief} onClose={() => setPopupBriefId(null)} />}
      {addBriefOpen && (
        <AddBriefModal
          onClose={() => setAddBriefOpen(false)}
          onSave={(b) => {
            addBrief(b);
            setAddBriefOpen(false);
          }}
        />
      )}
      {addResultOpen && (
        <AddResultModal
          onClose={() => setAddResultOpen(false)}
          onSave={(r) => {
            addResult(r);
            setAddResultOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Status pills ────────────────────────────────────────────────────

function briefStatusPill(b: BriefRow) {
  if (b.status === "needs_brief")
    return <span className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Needs brief</span>;
  if (b.status === "drafting" && b.is_overdue)
    return <span className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Drafting, overdue</span>;
  if (b.status === "in_review")
    return <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">In review</span>;
  return <span className="inline-flex items-center rounded border border-[#E5E5EA] bg-[#FAFAFB] px-1.5 py-0.5 text-[10px] font-medium text-[#4A4A4A]">{BRIEF_STATUS_LABEL[b.status]}</span>;
}

function resultStatusPill(r: ResultRow) {
  if (r.status === "overdue")
    return <span className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Read overdue</span>;
  if (r.status === "ready")
    return <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Ready to read</span>;
  return <span className="inline-flex items-center rounded border border-[#E5E5EA] bg-[#FAFAFB] px-1.5 py-0.5 text-[10px] font-medium text-[#4A4A4A]">{RESULT_STATUS_LABEL[r.status]}</span>;
}

// ─── Rows ────────────────────────────────────────────────────────────

function BriefTableRow({
  b, onTick, onViewOnboarding, onRemove,
}: {
  b: BriefRow;
  onTick: () => void;
  onViewOnboarding: () => void;
  onRemove: () => void;
}) {
  return (
    <tr className="group hover:bg-[#FAFAFB]">
      <td className="px-2 py-2"><TickButton onClick={onTick} /></td>
      <td className="px-3 py-2 text-[12px] font-semibold text-[#1B1B1B] whitespace-nowrap">
        <a href="#" className="hover:text-violet-700 hover:underline">{b.client}</a>
      </td>
      <td className="px-3 py-2 text-[11px] text-[#7A7A7A] whitespace-nowrap">{b.pod}</td>
      <td className="px-3 py-2">{briefStatusPill(b)}</td>
      <td className={`px-3 py-2 text-[11px] tabular-nums whitespace-nowrap ${b.is_overdue ? "font-semibold text-rose-700" : "text-[#7A7A7A]"}`}>{b.onboarding_received}</td>
      <td className="px-3 py-2">
        <button
          onClick={onViewOnboarding}
          className="inline-flex items-center gap-1 rounded border border-[#E5E5EA] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#4A4A4A] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
        >
          <EyeIcon className="h-3 w-3" />
          View ({b.deliverables.length})
        </button>
      </td>
      <td className="px-2 py-2"><RowMenu onRemove={onRemove} /></td>
    </tr>
  );
}

function ResultTableRow({ r, onTick, onRemove }: { r: ResultRow; onTick: () => void; onRemove: () => void }) {
  const isLong = r.live_days >= 14;
  return (
    <tr className="group hover:bg-[#FAFAFB]">
      <td className="px-2 py-2"><TickButton onClick={onTick} /></td>
      <td className="px-3 py-2 text-[12px] font-semibold text-[#1B1B1B] whitespace-nowrap">
        <a href="#" className="hover:text-emerald-700 hover:underline">{r.client}</a>
      </td>
      <td className="px-3 py-2 text-[11px] text-[#7A7A7A] whitespace-nowrap">{r.pod}</td>
      <td className="px-3 py-2 text-[12px] text-[#1B1B1B]">{r.project}</td>
      <td className="px-3 py-2">{resultStatusPill(r)}</td>
      <td className="px-3 py-2 text-[11px] text-[#7A7A7A] tabular-nums whitespace-nowrap">{r.live_since}</td>
      <td className={`px-3 py-2 text-[11px] tabular-nums whitespace-nowrap ${isLong ? "font-semibold text-rose-700" : "text-[#4A4A4A]"}`}>Day {r.live_days}</td>
      <td className="px-2 py-2"><RowMenu onRemove={onRemove} /></td>
    </tr>
  );
}

function DoneBriefRow({ b, onUntick }: { b: BriefRow; onUntick: () => void }) {
  return (
    <tr className="group hover:bg-[#FAFAFB]">
      <td className="px-2 py-2"><DoneTickButton onClick={onUntick} /></td>
      <td className="px-3 py-2 text-[12px] font-medium text-[#7A7A7A] line-through whitespace-nowrap">{b.client}</td>
      <td className="px-3 py-2 text-[11px] text-[#A0A0A0] whitespace-nowrap">{b.pod}</td>
      <td className="px-3 py-2"><span className="inline-flex items-center rounded border border-[#E5E5EA] bg-[#FAFAFB] px-1.5 py-0.5 text-[10px] font-medium text-[#A0A0A0]">{BRIEF_STATUS_LABEL[b.status]}</span></td>
      <td className="px-3 py-2 text-[11px] text-[#A0A0A0] tabular-nums whitespace-nowrap">{b.onboarding_received}</td>
      <td className="px-3 py-2 text-[10px] text-[#A0A0A0]">{b.deliverables.length} deliverables</td>
      <td className="px-2 py-2"></td>
    </tr>
  );
}

function DoneResultRow({ r, onUntick }: { r: ResultRow; onUntick: () => void }) {
  return (
    <tr className="group hover:bg-[#FAFAFB]">
      <td className="px-2 py-2"><DoneTickButton onClick={onUntick} /></td>
      <td className="px-3 py-2 text-[12px] font-medium text-[#7A7A7A] line-through whitespace-nowrap">{r.client}</td>
      <td className="px-3 py-2 text-[11px] text-[#A0A0A0] whitespace-nowrap">{r.pod}</td>
      <td className="px-3 py-2 text-[12px] text-[#A0A0A0] line-through">{r.project}</td>
      <td className="px-3 py-2"><span className="inline-flex items-center rounded border border-[#E5E5EA] bg-[#FAFAFB] px-1.5 py-0.5 text-[10px] font-medium text-[#A0A0A0]">Read</span></td>
      <td className="px-3 py-2 text-[11px] text-[#A0A0A0] tabular-nums whitespace-nowrap">{r.live_since}</td>
      <td className="px-3 py-2 text-[11px] text-[#A0A0A0] tabular-nums whitespace-nowrap">Day {r.live_days}</td>
      <td className="px-2 py-2"></td>
    </tr>
  );
}

// ─── Affordances ─────────────────────────────────────────────────────

function TickButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="Mark done"
      className="grid h-4 w-4 place-items-center rounded border border-[#D5D5D8] bg-white text-transparent transition-colors hover:border-emerald-500 hover:text-emerald-600"
    >
      <CheckIcon className="h-3 w-3" />
    </button>
  );
}

function DoneTickButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="Reopen"
      className="grid h-4 w-4 place-items-center rounded border border-emerald-500 bg-emerald-500 text-white transition-colors hover:border-[#7A7A7A] hover:bg-white hover:text-[#7A7A7A]"
    >
      <CheckIcon className="h-3 w-3" />
    </button>
  );
}

function RowMenu({ onRemove }: { onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={`rounded p-1 text-[#A0A0A0] transition-opacity hover:bg-[#F3F3F5] hover:text-[#1B1B1B] ${open ? "opacity-100 bg-[#F3F3F5] text-[#1B1B1B]" : "opacity-0 group-hover:opacity-100"}`}
        title="Edit or remove"
      >
        <EllipsisHorizontalIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-10 min-w-[140px] overflow-hidden rounded-md border border-[#E5E5EA] bg-white shadow-lg">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-rose-700 hover:bg-rose-50"
          >
            <TrashIcon className="h-3 w-3" />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function SectionFooter({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="border-t border-[#F0F0F0] bg-[#FAFAFB] px-4 py-1.5">
      <button onClick={onClick} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7A7A7A] hover:text-[#1B1B1B]">
        <PlusIcon className="h-3 w-3" />
        {label}
      </button>
    </div>
  );
}

function DoneSection({ count, children }: { count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[#F0F0F0]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 bg-[#FAFAFB] px-4 py-1.5 text-left text-[11px] font-medium text-[#7A7A7A] hover:text-[#1B1B1B]">
        {open ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
        Done · {count}
      </button>
      {open && <div className="border-t border-[#F0F0F0]">{children}</div>}
    </div>
  );
}

// ─── Onboarding popup ───────────────────────────────────────────────

function OnboardingPopup({ brief, onClose }: { brief: BriefRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[#E5E5EA] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[#F0F0F0] px-5 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">Onboarding · {brief.client}</div>
            <div className="mt-0.5 text-[16px] font-semibold text-[#1B1B1B]">{brief.deliverables.length} deliverables</div>
            <div className="mt-0.5 text-[11px] text-[#7A7A7A]">{brief.pod} · {brief.retainer ?? "—"} · Received {brief.onboarding_received}</div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-[#A0A0A0] hover:bg-[#F3F3F5] hover:text-[#1B1B1B]">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">Scope</div>
          <ul className="space-y-1">
            {brief.deliverables.map((d, i) => (
              <li key={i} className="flex items-baseline gap-2 rounded border border-[#F0F0F0] bg-[#FAFAFB] px-2.5 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] w-16 shrink-0">{d.type}</span>
                <span className="text-[12px] text-[#1B1B1B]">{d.label ?? <span className="italic text-[#A0A0A0]">No label</span>}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between border-t border-[#F0F0F0] bg-[#FAFAFB] px-5 py-3">
          <a href="#" className="text-[11px] font-medium text-[#1B1B1B] hover:underline">Open {brief.client} engagement →</a>
          <button onClick={onClose} className="rounded-md border border-[#E5E5EA] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1B1B1B] hover:border-[#1B1B1B]">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add modals ──────────────────────────────────────────────────────

function ModalShell({ title, onClose, children, onSave }: { title: string; onClose: () => void; children: React.ReactNode; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#E5E5EA] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[#F0F0F0] px-5 py-3.5">
          <div className="text-[14px] font-semibold text-[#1B1B1B]">{title}</div>
          <button onClick={onClose} className="rounded p-1 text-[#A0A0A0] hover:bg-[#F3F3F5] hover:text-[#1B1B1B]">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-[#F0F0F0] bg-[#FAFAFB] px-5 py-2.5">
          <button onClick={onClose} className="rounded-md border border-[#E5E5EA] bg-white px-3 py-1.5 text-[11px] font-medium text-[#4A4A4A] hover:border-[#1B1B1B] hover:text-[#1B1B1B]">Cancel</button>
          <button onClick={onSave} className="rounded-md bg-[#1B1B1B] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-black">Save</button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = "w-full rounded border border-[#E5E5EA] bg-white px-2.5 py-1.5 text-[12px] text-[#1B1B1B] focus:border-[#1B1B1B] focus:outline-none";

function AddBriefModal({ onClose, onSave }: { onClose: () => void; onSave: (b: Omit<BriefRow, "id">) => void }) {
  const [client, setClient] = useState("");
  const [pod, setPod] = useState<PodId>("Pod 1");
  const [status, setStatus] = useState<BriefStatus>("needs_brief");
  const [received, setReceived] = useState(todayShort());
  const [retainer, setRetainer] = useState("");
  const [deliverableCount, setDeliverableCount] = useState(1);

  const save = () => {
    if (!client.trim()) return;
    onSave({
      client: client.trim(),
      pod,
      status,
      onboarding_received: received,
      retainer: retainer.trim() || undefined,
      deliverables: Array.from({ length: deliverableCount }, () => ({ type: "Deliverable" })),
    });
  };

  return (
    <ModalShell title="Add brief manually" onClose={onClose} onSave={save}>
      <FormField label="Client">
        <input className={inputClass} value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Hydrant" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Pod">
          <select className={inputClass} value={pod} onChange={(e) => setPod(e.target.value as PodId)}>
            {POD_OPTIONS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField label="Status">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as BriefStatus)}>
            {(Object.keys(BRIEF_STATUS_LABEL) as BriefStatus[]).map((s) => (
              <option key={s} value={s}>{BRIEF_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Onboarding received">
          <input className={inputClass} value={received} onChange={(e) => setReceived(e.target.value)} placeholder="e.g. 25 May" />
        </FormField>
        <FormField label="Retainer (optional)">
          <input className={inputClass} value={retainer} onChange={(e) => setRetainer(e.target.value)} placeholder="e.g. 8k retainer" />
        </FormField>
      </div>
      <FormField label="Deliverable count (placeholder)">
        <input
          type="number"
          min={0}
          className={inputClass}
          value={deliverableCount}
          onChange={(e) => setDeliverableCount(Math.max(0, parseInt(e.target.value || "0", 10)))}
        />
      </FormField>
    </ModalShell>
  );
}

function AddResultModal({ onClose, onSave }: { onClose: () => void; onSave: (r: Omit<ResultRow, "id">) => void }) {
  const [client, setClient] = useState("");
  const [pod, setPod] = useState<PodId>("Pod 1");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState<ResultStatus>("running");
  const [liveSince, setLiveSince] = useState(todayShort());
  const [liveDays, setLiveDays] = useState(0);

  const save = () => {
    if (!client.trim() || !project.trim()) return;
    onSave({
      client: client.trim(),
      pod,
      project: project.trim(),
      status,
      live_since: liveSince,
      live_days: liveDays,
    });
  };

  return (
    <ModalShell title="Add result manually" onClose={onClose} onSave={save}>
      <FormField label="Client">
        <input className={inputClass} value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Hydrant" />
      </FormField>
      <FormField label="Project / test">
        <input className={inputClass} value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. Free shipping floor" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Pod">
          <select className={inputClass} value={pod} onChange={(e) => setPod(e.target.value as PodId)}>
            {POD_OPTIONS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField label="Status">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ResultStatus)}>
            {(Object.keys(RESULT_STATUS_LABEL) as ResultStatus[]).map((s) => (
              <option key={s} value={s}>{RESULT_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Live since">
          <input className={inputClass} value={liveSince} onChange={(e) => setLiveSince(e.target.value)} placeholder="e.g. 16 May" />
        </FormField>
        <FormField label="Days live">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={liveDays}
            onChange={(e) => setLiveDays(Math.max(0, parseInt(e.target.value || "0", 10)))}
          />
        </FormField>
      </div>
    </ModalShell>
  );
}
