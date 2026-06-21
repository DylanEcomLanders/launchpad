"use client";

import { useMemo, useState } from "react";
import {
  CheckCircleIcon,
  XMarkIcon,
  SparklesIcon,
  EyeIcon,
  BeakerIcon,
  ArrowRightIcon,
  PlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckSolid } from "@heroicons/react/24/solid";
import {
  TASKS,
  CLIENTS,
  CLIENT_BY_ID,
  POD_BY_ID,
  PHASE_LABEL,
  LEAD_STRATEGIST,
  fmtDayMonth,
  type Phase,
  type Task,
} from "../mock-data";
import { AnnotationStrip, SectionHeader, Avatar } from "../components";
import { inputClass } from "@/lib/form-styles";
import { useStrategyStore, HYP_CYCLE, type HypStatus } from "./use-strategy-store";

const ONBOARDING_PHASES: Phase[] = ["onboarding", "research"];
const REVIEW_PHASES: Phase[] = ["internal-design-qa", "external-design-review"];

export default function StrategyClient() {
  const store = useStrategyStore();
  const [openClientId, setOpenClientId] = useState<string | null>(null);

  const shape = useMemo(
    () => TASKS.filter((t) => t.phase && ONBOARDING_PHASES.includes(t.phase) && t.status !== "done"),
    [],
  );
  const review = useMemo(
    () => TASKS.filter((t) => t.phase && REVIEW_PHASES.includes(t.phase) && t.status !== "done"),
    [],
  );
  const tests = useMemo(() => TASKS.filter((t) => t.testResult), []);
  const clients = useMemo(() => CLIENTS.filter((c) => c.strategy), []);

  const handled = store.state.handled;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <AnnotationStrip title="What changed — Strategy (now interactive)">
        <p>
          Built around {LEAD_STRATEGIST.name}&apos;s touchpoints: <strong>shape at onboarding</strong>,{" "}
          <strong>designs ready for review</strong>, and <strong>tests to track</strong> — across all
          three pods.
        </p>
        <p>
          The <strong>strategy home per client is editable and saves to this browser</strong> — add
          and stage hypotheses, edit the thesis, manage focus areas, log notes. Marks here persist
          across reload.
        </p>
      </AnnotationStrip>

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold text-[#E5E5EA]">Strategy</h1>
        <span className="rounded-full border border-[#2A2A2A] bg-[#222222] px-2 py-0.5 text-[11px] text-[#71757D]">
          {LEAD_STRATEGIST.name} · {LEAD_STRATEGIST.role}
        </span>
        <button
          onClick={store.reset}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[#2A2A2A] px-2 py-1 text-[11px] font-medium text-[#71757D] hover:text-[#E5E5EA]"
          title="Clear saved changes and restore the seed data"
        >
          <ArrowPathIcon className="size-3.5" /> Reset preview data
        </button>
      </div>
      <p className="mb-6 text-sm text-[#71757D]">Across all three pods · changes save to this browser.</p>

      {/* Touchpoints */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <TouchpointColumn icon={<SparklesIcon className="size-4" />} title="Shape at onboarding" empty="Nothing new to shape" count={shape.length}>
          {shape.map((t) => (
            <TouchpointRow key={t.id} task={t} meta={t.phase ? PHASE_LABEL[t.phase] : ""} idleLabel="Set direction" doneLabel="Direction set" done={handled.includes(t.id)} onAction={() => store.toggleHandled(t.id)} />
          ))}
        </TouchpointColumn>

        <TouchpointColumn icon={<EyeIcon className="size-4" />} title="Ready for strategic review" empty="Nothing awaiting review" count={review.length}>
          {review.map((t) => (
            <TouchpointRow key={t.id} task={t} meta={t.phase ? PHASE_LABEL[t.phase] : ""} idleLabel="Sign off" doneLabel="Signed off" done={handled.includes(t.id)} onAction={() => store.toggleHandled(t.id)} />
          ))}
        </TouchpointColumn>

        <TouchpointColumn icon={<BeakerIcon className="size-4" />} title="Tests to track" empty="No tests live" count={tests.length}>
          {tests.map((t) => (
            <TestRow key={t.id} task={t} />
          ))}
        </TouchpointColumn>
      </div>

      {/* Strategy by client */}
      <SectionHeader>Strategy by client</SectionHeader>
      <div className="grid gap-4 md:grid-cols-2">
        {clients.map((c) => {
          const st = store.state.clients[c.id];
          return (
            <button
              key={c.id}
              onClick={() => setOpenClientId(c.id)}
              className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-[#C5C5C5] hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#E5E5EA]">{c.name}</span>
                <span className="text-[11px] text-[#71757D]">{POD_BY_ID[c.podId]?.tagline}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#71757D]">{st?.thesis}</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-[#71757D]">
                <span>{st?.focus.length ?? 0} focus areas</span>
                <span>·</span>
                <span>{st?.hypotheses.length ?? 0} hypotheses</span>
                {st && st.notes.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{st.notes.length} notes</span>
                  </>
                )}
                <ArrowRightIcon className="ml-auto size-3.5" />
              </div>
            </button>
          );
        })}
      </div>

      {openClientId && <ClientStrategyPanel clientId={openClientId} store={store} onClose={() => setOpenClientId(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function TouchpointColumn({ icon, title, count, empty, children }: { icon: React.ReactNode; title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[#71757D]">{icon}</span>
        <h3 className="text-[13px] font-semibold text-[#E5E5EA]">{title}</h3>
        <span className="ml-auto text-[11px] tabular-nums text-[#71757D]">{count}</span>
      </div>
      {count === 0 ? (
        <p className="py-4 text-center text-[12px] text-[#C5C5C5]">{empty}</p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
}

function TouchpointRow({ task, meta, idleLabel, doneLabel, done, onAction }: { task: Task; meta: string; idleLabel: string; doneLabel: string; done: boolean; onAction: () => void }) {
  return (
    <div className="rounded-lg border border-[#404040] bg-[#0C0C0C] p-2.5">
      <div className="text-[13px] font-medium text-[#E5E5EA]">{task.title}</div>
      <div className="mt-0.5 text-[11px] text-[#71757D]">
        {CLIENT_BY_ID[task.clientId]?.name} · {meta}
      </div>
      <button
        onClick={onAction}
        className={`mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-all ${
          done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#2A2A2A] bg-[#181818] text-[#71757D] hover:text-[#E5E5EA]"
        }`}
      >
        {done ? <CheckSolid className="size-3.5" /> : <CheckCircleIcon className="size-3.5" />}
        {done ? doneLabel : idleLabel}
      </button>
    </div>
  );
}

function TestResultChip({ task }: { task: Task }) {
  const r = task.testResult;
  if (!r) return null;
  if (r.status === "winner") return <span className="text-[11px] font-semibold text-emerald-700">Winner · +{r.lift}%</span>;
  if (r.status === "loser") return <span className="text-[11px] font-semibold text-rose-700">Lost · {r.lift}%</span>;
  return <span className="text-[11px] font-medium text-[#71757D]">Awaiting results</span>;
}

function TestRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#F0F0F2] bg-[#0C0C0C] p-2.5">
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-[#E5E5EA]">{task.title}</div>
        <div className="text-[11px] text-[#71757D]">{CLIENT_BY_ID[task.clientId]?.name}</div>
      </div>
      <TestResultChip task={task} />
    </div>
  );
}

const HYP_STATUS_META: Record<HypStatus, { label: string; cls: string }> = {
  idea: { label: "Idea", cls: "bg-[#222222] text-[#71757D] border-[#2A2A2A]" },
  testing: { label: "Testing", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  validated: { label: "Validated", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function ClientStrategyPanel({
  clientId,
  store,
  onClose,
}: {
  clientId: string;
  store: ReturnType<typeof useStrategyStore>;
  onClose: () => void;
}) {
  const client = CLIENT_BY_ID[clientId];
  const st = store.state.clients[clientId];
  const tests = TASKS.filter((t) => t.clientId === clientId && t.testResult);
  const [focusDraft, setFocusDraft] = useState("");
  const [hypDraft, setHypDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  if (!st) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-[#2A2A2A] bg-[#181818] p-6 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#71757D]">Strategy home</div>
            <h3 className="mt-1 text-lg font-semibold text-[#E5E5EA]">{client?.name}</h3>
            <p className="text-[12px] text-[#71757D]">{POD_BY_ID[client?.podId ?? ""]?.tagline}</p>
          </div>
          <button onClick={onClose} className="text-[#71757D] hover:text-[#E5E5EA]">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Thesis — editable */}
        <div className="mt-5">
          <SectionHeader>Thesis</SectionHeader>
          <textarea
            value={st.thesis}
            onChange={(e) => store.setThesis(clientId, e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] px-3 py-2 text-[13px] leading-relaxed text-[#3A3A3A] focus:border-white focus:bg-[#181818] focus:outline-none focus:ring-1 focus:ring-[#1B1B1B]/10"
          />
        </div>

        {/* Focus areas — add / remove */}
        <div className="mt-5">
          <SectionHeader>Focus areas</SectionHeader>
          <div className="flex flex-wrap gap-1.5">
            {st.focus.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[12px] text-[#3A3A3A]">
                {f}
                <button onClick={() => store.removeFocus(clientId, i)} className="text-[#C5C5C5] hover:text-rose-600">
                  <XMarkIcon className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (focusDraft.trim()) {
                store.addFocus(clientId, focusDraft.trim());
                setFocusDraft("");
              }
            }}
            className="mt-2 flex gap-2"
          >
            <input value={focusDraft} onChange={(e) => setFocusDraft(e.target.value)} placeholder="Add focus area…" className={`${inputClass} py-1.5 text-[12px]`} />
            <button type="submit" className="shrink-0 rounded-lg border border-[#2A2A2A] px-2.5 text-[#71757D] hover:text-[#E5E5EA]">
              <PlusIcon className="size-4" />
            </button>
          </form>
        </div>

        {/* Hypotheses — add / edit text / cycle status / remove */}
        <div className="mt-5">
          <SectionHeader>Hypotheses</SectionHeader>
          <div className="space-y-1.5">
            {st.hypotheses.map((h) => (
              <div key={h.id} className="flex items-center gap-2 rounded-lg border border-[#F0F0F2] bg-[#181818] p-2">
                <input
                  value={h.text}
                  onChange={(e) => store.updateHyp(clientId, h.id, { text: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#3A3A3A] focus:outline-none"
                />
                <button
                  onClick={() => store.cycleHyp(clientId, h.id)}
                  title={`Click to advance (${HYP_CYCLE.join(" → ")})`}
                  className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${HYP_STATUS_META[h.status].cls}`}
                >
                  {HYP_STATUS_META[h.status].label}
                </button>
                <button onClick={() => store.removeHyp(clientId, h.id)} className="shrink-0 text-[#C5C5C5] hover:text-rose-600">
                  <XMarkIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (hypDraft.trim()) {
                store.addHyp(clientId, hypDraft.trim());
                setHypDraft("");
              }
            }}
            className="mt-2 flex gap-2"
          >
            <input value={hypDraft} onChange={(e) => setHypDraft(e.target.value)} placeholder="Add a hypothesis…" className={`${inputClass} py-1.5 text-[12px]`} />
            <button type="submit" className="shrink-0 rounded-lg border border-[#2A2A2A] px-2.5 text-[#71757D] hover:text-[#E5E5EA]">
              <PlusIcon className="size-4" />
            </button>
          </form>
        </div>

        {/* Tests — read-only, from delivery */}
        <div className="mt-5">
          <SectionHeader>Tests for this client</SectionHeader>
          {tests.length === 0 ? (
            <p className="text-[12px] text-[#C5C5C5]">No tests shipped yet.</p>
          ) : (
            <div className="space-y-1.5">
              {tests.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#F0F0F2] bg-[#181818] p-2.5">
                  <span className="truncate text-[13px] text-[#3A3A3A]">{t.title}</span>
                  <TestResultChip task={t} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes — add / timeline */}
        <div className="mt-5">
          <SectionHeader>Strategist notes</SectionHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (noteDraft.trim()) {
                store.addNote(clientId, noteDraft.trim());
                setNoteDraft("");
              }
            }}
            className="mb-3 flex gap-2"
          >
            <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add a note…" className={`${inputClass} py-1.5 text-[12px]`} />
            <button type="submit" className="shrink-0 rounded-lg bg-[#1B1B1B] px-3 text-sm font-medium text-white hover:bg-[#F3F4F6]">
              Add
            </button>
          </form>
          {st.notes.length === 0 ? (
            <p className="text-[12px] text-[#C5C5C5]">No notes yet.</p>
          ) : (
            <div className="space-y-2.5">
              {st.notes.map((n) => (
                <div key={n.id} className="border-l-2 border-[#2A2A2A] pl-3">
                  <div className="text-[11px] text-[#71757D]">
                    {fmtDayMonth(n.at)} · {LEAD_STRATEGIST.name}
                  </div>
                  <div className="text-[13px] text-[#3A3A3A]">{n.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-[#F0F0F2] pt-4 text-[12px] text-[#71757D]">
          <Avatar name={LEAD_STRATEGIST.name} id={LEAD_STRATEGIST.id} size={20} />
          Owned by {LEAD_STRATEGIST.name} · saved to this browser
        </div>
      </div>
    </div>
  );
}
