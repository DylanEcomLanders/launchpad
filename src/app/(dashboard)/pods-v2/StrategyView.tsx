"use client";

/* Strategy view: third toggle option on /pods-v2.
 *
 * Two tracked touchpoints:
 *   - Briefs: one row per onboarding (auto-created when PM assigns to
 *     a pod, or added manually here).
 *   - Results: one row per live test.
 *
 * Wired interactions:
 *   - Tick to mark done → moves row to Done section
 *   - Untick from Done → moves back to active
 *   - "Add brief manually" / "Add result manually" → opens form modal
 *   - Three-dot row menu → Remove
 *   - "View" on brief row → onboarding popup with deliverable list
 *
 * Reads + writes go through src/lib/strategy/data.ts (Supabase).
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
import {
  createBrief,
  createResult,
  listBriefs,
  listResults,
  removeBrief as apiRemoveBrief,
  removeResult as apiRemoveResult,
  updateBrief,
  updateResult,
} from "@/lib/strategy/data";
import type {
  BriefDeliverable,
  BriefStatus,
  ResultStatus,
  StrategyBrief,
  StrategyResult,
} from "@/lib/strategy/types";

type PodId = "Pod 1" | "Pod 2" | "Pod 3";

type BriefRow = StrategyBrief;
type ResultRow = StrategyResult;
type Deliverable = BriefDeliverable;

const BRIEF_ORDER: Record<BriefStatus, number> = { needs_brief: 0, drafting: 1, in_review: 2, approved: 3 };
const RESULT_ORDER: Record<ResultStatus, number> = { overdue: 0, ready: 1, running: 2, read: 3 };

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
  read: "Read",
};

const POD_OPTIONS: PodId[] = ["Pod 1", "Pod 2", "Pod 3"];

const todayShort = () =>
  new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function StrategyView() {
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [popupBriefId, setPopupBriefId] = useState<string | null>(null);
  const [addBriefOpen, setAddBriefOpen] = useState(false);
  const [addResultOpen, setAddResultOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [b, r] = await Promise.all([listBriefs(), listResults()]);
      if (!cancelled) {
        setBriefs(b);
        setResults(r);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeBriefs = briefs.filter((b) => !b.done).sort((a, b) => BRIEF_ORDER[a.status] - BRIEF_ORDER[b.status]);
  const doneBriefs = briefs.filter((b) => b.done);
  const activeResults = results.filter((r) => !r.done).sort((a, b) => RESULT_ORDER[a.status] - RESULT_ORDER[b.status]);
  const doneResults = results.filter((r) => r.done);

  const totalActive = activeBriefs.length + activeResults.length;
  const actCount =
    activeBriefs.filter((b) => b.status === "needs_brief" || (b.status === "drafting" && b.is_overdue)).length +
    activeResults.filter((r) => r.status === "overdue" || r.status === "ready").length;

  const toggleBriefDone = async (id: string) => {
    const current = briefs.find((b) => b.id === id);
    if (!current) return;
    const next = !current.done;
    setBriefs((p) => p.map((b) => (b.id === id ? { ...b, done: next } : b)));
    await updateBrief(id, { done: next, done_at: next ? new Date().toISOString() : undefined });
  };
  const removeBrief = async (id: string) => {
    setBriefs((p) => p.filter((b) => b.id !== id));
    await apiRemoveBrief(id);
  };
  const addBrief = async (b: Omit<BriefRow, "id" | "created_at" | "updated_at" | "done">) => {
    const created = await createBrief(b);
    if (created) setBriefs((p) => [created, ...p]);
  };

  const toggleResultDone = async (id: string) => {
    const current = results.find((r) => r.id === id);
    if (!current) return;
    const next = !current.done;
    setResults((p) => p.map((r) => (r.id === id ? { ...r, done: next } : r)));
    await updateResult(id, { done: next, done_at: next ? new Date().toISOString() : undefined });
  };
  const removeResult = async (id: string) => {
    setResults((p) => p.filter((r) => r.id !== id));
    await apiRemoveResult(id);
  };
  const addResult = async (r: Omit<ResultRow, "id" | "created_at" | "updated_at" | "done">) => {
    const created = await createResult(r);
    if (created) setResults((p) => [created, ...p]);
  };

  const popupBrief = briefs.find((b) => b.id === popupBriefId) ?? null;

  return (
    <div className="mt-6">
      <p className="mb-4 text-[12px] text-subtle">
        {totalActive} in flight ·{" "}
        <span className="font-semibold text-danger">{actCount} need attention</span>
      </p>

      <div className="space-y-4">
        {/* Briefs */}
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Briefs</span>
              <span className="text-[10px] tabular-nums text-subtle">{activeBriefs.length}</span>
              <span className="text-[11px] text-subtle">· Auto-added when onboarding lands on a pod · one row per client</span>
            </div>
          </div>

          <table className="min-w-full text-left text-[12px]">
            <thead className="bg-background text-[10px] font-semibold uppercase tracking-wider text-subtle">
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
            <tbody className="divide-y divide-border">
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
                  <td colSpan={7} className="px-4 py-3 text-center text-[11px] italic text-subtle">
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
                <tbody className="divide-y divide-border">
                  {doneBriefs.map((b) => (
                    <DoneBriefRow key={b.id} b={b} onUntick={() => toggleBriefDone(b.id)} />
                  ))}
                </tbody>
              </table>
            </DoneSection>
          )}
        </section>

        {/* Results */}
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Results</span>
              <span className="text-[10px] tabular-nums text-subtle">{activeResults.length}</span>
              <span className="text-[11px] text-subtle">· Live tests · how long they have been running</span>
            </div>
          </div>

          <table className="min-w-full text-left text-[12px]">
            <thead className="bg-background text-[10px] font-semibold uppercase tracking-wider text-subtle">
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
            <tbody className="divide-y divide-border">
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
                  <td colSpan={8} className="px-4 py-3 text-center text-[11px] italic text-subtle">
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
                <tbody className="divide-y divide-border">
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
    return <span className="inline-flex items-center rounded border border-danger/20 bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">Needs brief</span>;
  if (b.status === "drafting" && b.is_overdue)
    return <span className="inline-flex items-center rounded border border-danger/20 bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">Drafting, overdue</span>;
  if (b.status === "in_review")
    return <span className="inline-flex items-center rounded border border-warning/20 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">In review</span>;
  return <span className="inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted">{BRIEF_STATUS_LABEL[b.status]}</span>;
}

function resultStatusPill(r: ResultRow) {
  if (r.status === "overdue")
    return <span className="inline-flex items-center rounded border border-danger/20 bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">Read overdue</span>;
  if (r.status === "ready")
    return <span className="inline-flex items-center rounded border border-success/20 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">Ready to read</span>;
  return <span className="inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted">{RESULT_STATUS_LABEL[r.status]}</span>;
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
    <tr className="group hover:bg-background">
      <td className="px-2 py-2"><TickButton onClick={onTick} /></td>
      <td className="px-3 py-2 text-[12px] font-semibold text-foreground whitespace-nowrap">
        <a href="#" className="hover:text-foreground hover:underline">{b.client_name}</a>
      </td>
      <td className="px-3 py-2 text-[11px] text-subtle whitespace-nowrap">{b.pod_id}</td>
      <td className="px-3 py-2">{briefStatusPill(b)}</td>
      <td className={`px-3 py-2 text-[11px] tabular-nums whitespace-nowrap ${b.is_overdue ? "font-semibold text-danger" : "text-subtle"}`}>{b.onboarding_received}</td>
      <td className="px-3 py-2">
        <button
          onClick={onViewOnboarding}
          className="inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted hover:border-border hover:text-foreground"
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
    <tr className="group hover:bg-background">
      <td className="px-2 py-2"><TickButton onClick={onTick} /></td>
      <td className="px-3 py-2 text-[12px] font-semibold text-foreground whitespace-nowrap">
        <a href="#" className="hover:text-foreground hover:underline">{r.client_name}</a>
      </td>
      <td className="px-3 py-2 text-[11px] text-subtle whitespace-nowrap">{r.pod_id}</td>
      <td className="px-3 py-2 text-[12px] text-foreground">{r.project}</td>
      <td className="px-3 py-2">{resultStatusPill(r)}</td>
      <td className="px-3 py-2 text-[11px] text-subtle tabular-nums whitespace-nowrap">{r.live_since}</td>
      <td className={`px-3 py-2 text-[11px] tabular-nums whitespace-nowrap ${isLong ? "font-semibold text-danger" : "text-subtle"}`}>Day {r.live_days}</td>
      <td className="px-2 py-2"><RowMenu onRemove={onRemove} /></td>
    </tr>
  );
}

function DoneBriefRow({ b, onUntick }: { b: BriefRow; onUntick: () => void }) {
  return (
    <tr className="group hover:bg-background">
      <td className="px-2 py-2"><DoneTickButton onClick={onUntick} /></td>
      <td className="px-3 py-2 text-[12px] font-medium text-subtle line-through whitespace-nowrap">{b.client_name}</td>
      <td className="px-3 py-2 text-[11px] text-subtle whitespace-nowrap">{b.pod_id}</td>
      <td className="px-3 py-2"><span className="inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-subtle">{BRIEF_STATUS_LABEL[b.status]}</span></td>
      <td className="px-3 py-2 text-[11px] text-subtle tabular-nums whitespace-nowrap">{b.onboarding_received}</td>
      <td className="px-3 py-2 text-[10px] text-subtle">{b.deliverables.length} deliverables</td>
      <td className="px-2 py-2"></td>
    </tr>
  );
}

function DoneResultRow({ r, onUntick }: { r: ResultRow; onUntick: () => void }) {
  return (
    <tr className="group hover:bg-background">
      <td className="px-2 py-2"><DoneTickButton onClick={onUntick} /></td>
      <td className="px-3 py-2 text-[12px] font-medium text-subtle line-through whitespace-nowrap">{r.client_name}</td>
      <td className="px-3 py-2 text-[11px] text-subtle whitespace-nowrap">{r.pod_id}</td>
      <td className="px-3 py-2 text-[12px] text-subtle line-through">{r.project}</td>
      <td className="px-3 py-2"><span className="inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-subtle">Read</span></td>
      <td className="px-3 py-2 text-[11px] text-subtle tabular-nums whitespace-nowrap">{r.live_since}</td>
      <td className="px-3 py-2 text-[11px] text-subtle tabular-nums whitespace-nowrap">Day {r.live_days}</td>
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
      className="grid h-4 w-4 place-items-center rounded border border-muted bg-surface text-transparent transition-colors hover:border-success hover:text-success"
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
      className="grid h-4 w-4 place-items-center rounded border border-success bg-success text-white transition-colors hover:border-subtle hover:bg-surface hover:text-subtle"
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
        className={`rounded p-1 text-subtle transition-opacity hover:bg-surface-raised hover:text-foreground ${open ? "opacity-100 bg-surface-raised text-foreground" : "opacity-0 group-hover:opacity-100"}`}
        title="Edit or remove"
      >
        <EllipsisHorizontalIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-10 min-w-[140px] overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-danger hover:bg-danger/10"
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
    <div className="border-t border-border bg-background px-4 py-1.5">
      <button onClick={onClick} className="inline-flex items-center gap-1 text-[11px] font-medium text-subtle hover:text-foreground">
        <PlusIcon className="h-3 w-3" />
        {label}
      </button>
    </div>
  );
}

function DoneSection({ count, children }: { count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 bg-background px-4 py-1.5 text-left text-[11px] font-medium text-subtle hover:text-foreground">
        {open ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
        Done · {count}
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

// ─── Onboarding popup ───────────────────────────────────────────────

function OnboardingPopup({ brief, onClose }: { brief: BriefRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Onboarding · {brief.client_name}</div>
            <div className="mt-0.5 text-[16px] font-semibold text-foreground">{brief.deliverables.length} deliverables</div>
            <div className="mt-0.5 text-[11px] text-subtle">{brief.pod_id} · {brief.retainer ?? "—"} · Received {brief.onboarding_received}</div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-subtle hover:bg-surface-raised hover:text-foreground">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">Scope</div>
          <ul className="space-y-1">
            {brief.deliverables.map((d, i) => (
              <li key={i} className="flex items-baseline gap-2 rounded border border-border bg-background px-2.5 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle w-16 shrink-0">{d.type}</span>
                <span className="text-[12px] text-foreground">{d.label ?? <span className="italic text-subtle">No label</span>}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between border-t border-border bg-background px-5 py-3">
          <a href="#" className="text-[11px] font-medium text-foreground hover:underline">Open {brief.client_name} engagement →</a>
          <button onClick={onClose} className="rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-surface-hover">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add modals ──────────────────────────────────────────────────────

function ModalShell({ title, onClose, children, onSave }: { title: string; onClose: () => void; children: React.ReactNode; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-border px-5 py-3.5">
          <div className="text-[14px] font-semibold text-foreground">{title}</div>
          <button onClick={onClose} className="rounded p-1 text-subtle hover:bg-surface-raised hover:text-foreground">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-background px-5 py-2.5">
          <button onClick={onClose} className="rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-muted hover:bg-surface-hover hover:text-foreground">Cancel</button>
          <button onClick={onSave} className="rounded-md bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background hover:opacity-90">Save</button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-subtle">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = "w-full rounded border border-border bg-surface px-2.5 py-1.5 text-[12px] text-foreground focus:border-ring focus:outline-none";

function AddBriefModal({ onClose, onSave }: { onClose: () => void; onSave: (b: Omit<BriefRow, "id" | "created_at" | "updated_at" | "done">) => void }) {
  const [client, setClient] = useState("");
  const [pod, setPod] = useState<PodId>("Pod 1");
  const [status, setStatus] = useState<BriefStatus>("needs_brief");
  const [received, setReceived] = useState(todayShort());
  const [retainer, setRetainer] = useState("");
  const [deliverableCount, setDeliverableCount] = useState(1);

  const save = () => {
    if (!client.trim()) return;
    const name = client.trim();
    onSave({
      client_id: `manual-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      client_name: name,
      pod_id: pod,
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

function AddResultModal({ onClose, onSave }: { onClose: () => void; onSave: (r: Omit<ResultRow, "id" | "created_at" | "updated_at" | "done">) => void }) {
  const [client, setClient] = useState("");
  const [pod, setPod] = useState<PodId>("Pod 1");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState<ResultStatus>("running");
  const [liveSince, setLiveSince] = useState(todayShort());
  const [liveDays, setLiveDays] = useState(0);

  const save = () => {
    if (!client.trim() || !project.trim()) return;
    const name = client.trim();
    onSave({
      client_id: `manual-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      client_name: name,
      pod_id: pod,
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
