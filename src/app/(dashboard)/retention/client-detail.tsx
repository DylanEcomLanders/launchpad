"use client";

import { useState, type ReactNode } from "react";
import { inputClass, selectClass, textareaClass, labelClass } from "@/lib/form-styles";
import type { ClientReview, ClientResult, RetentionTask, HealthBand } from "@/lib/retention/types";
import { logReview, logResult, logTask, toggleTask, setHealthOverride, type ClientRow } from "@/lib/retention/data";
import { shippedTestsForClient } from "@/lib/retention/kanban";
import { BAND_META, HealthPill, PillarDots, UpsellBadge, fmtDate, fmtMoney, renewalLabel } from "./ui";

function newId(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.floor(performance.now())}`;
  return `${prefix}-${rnd}`;
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

type TimelineItem = { date: string; kind: "review" | "result" | "task" | "test"; node: ReactNode };

export function ClientDetail({
  row,
  reviews,
  results,
  tasks,
  onClose,
  onChanged,
}: {
  row: ClientRow;
  reviews: ClientReview[];
  results: ClientResult[];
  tasks: RetentionTask[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { client, health } = row;
  const [tab, setTab] = useState<"review" | "result" | "task">("review");
  const [saving, setSaving] = useState(false);

  // Review form
  const [rvType, setRvType] = useState<ClientReview["type"]>("qbr");
  const [rvDate, setRvDate] = useState(todayStr());
  const [rvNotes, setRvNotes] = useState("");
  const [rvNext, setRvNext] = useState("");
  // Result form
  const [resTitle, setResTitle] = useState("");
  const [resMetric, setResMetric] = useState("");
  const [resDate, setResDate] = useState(todayStr());
  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState(todayStr());

  const shippedTests = shippedTestsForClient(client.name);

  async function withSave(fn: () => Promise<void>) {
    setSaving(true);
    try {
      await fn();
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function submitReview() {
    if (!rvNotes.trim()) return;
    await withSave(() =>
      logReview({
        id: newId("rev"),
        client_id: client.id,
        type: rvType,
        held_at: rvDate,
        notes: rvNotes.trim(),
        next_due_at: rvNext || null,
        created_at: new Date().toISOString(),
      }),
    );
    setRvNotes("");
    setRvNext("");
  }
  async function submitResult() {
    if (!resTitle.trim()) return;
    await withSave(() =>
      logResult({
        id: newId("res"),
        client_id: client.id,
        title: resTitle.trim(),
        metric: resMetric.trim(),
        logged_at: resDate,
        created_at: new Date().toISOString(),
      }),
    );
    setResTitle("");
    setResMetric("");
  }
  async function submitTask() {
    if (!taskTitle.trim()) return;
    await withSave(() =>
      logTask({
        id: newId("task"),
        client_id: client.id,
        title: taskTitle.trim(),
        due_at: taskDue,
        completed_at: null,
        created_at: new Date().toISOString(),
      }),
    );
    setTaskTitle("");
  }

  // ── Timeline ──
  const items: TimelineItem[] = [];
  for (const r of reviews) {
    items.push({
      date: r.held_at,
      kind: "review",
      node: (
        <div>
          <span className="text-foreground">{r.type === "qbr" ? "QBR" : "Strategic review"}</span>
          {r.notes && <span className="text-subtle"> — {r.notes}</span>}
        </div>
      ),
    });
  }
  for (const r of results) {
    items.push({
      date: r.logged_at,
      kind: "result",
      node: (
        <div>
          <span className="text-emerald-400 font-medium">{r.metric || "Result"}</span>
          <span className="text-subtle"> — {r.title}</span>
        </div>
      ),
    });
  }
  for (const t of shippedTests) {
    items.push({
      date: t.concludedAt,
      kind: "test",
      node: (
        <div>
          <span className="text-foreground">Test shipped: {t.title}</span>
          <span className="text-subtle"> — {t.outcome}{t.metric ? `, ${t.metric} ${t.upliftPct > 0 ? "+" : ""}${t.upliftPct}%` : ""}</span>
        </div>
      ),
    });
  }
  for (const t of tasks) {
    items.push({
      date: t.due_at,
      kind: "task",
      node: (
        <button
          onClick={() => withSave(() => toggleTask(t))}
          className="text-left group"
        >
          <span className={t.completed_at ? "text-subtle line-through" : "text-foreground"}>
            {t.completed_at ? "☑" : "☐"} {t.title}
          </span>
          <span className="text-subtle"> — due {fmtDate(t.due_at)}</span>
        </button>
      ),
    });
  }
  items.sort((a, b) => b.date.localeCompare(a.date));

  const kindDot: Record<TimelineItem["kind"], string> = {
    review: "#8B5CF6",
    result: "#10B981",
    test: "#3B82F6",
    task: "#71757D",
  };

  const renewal = renewalLabel(row.daysToRenewal);
  const override = client.health_override ?? null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-xl h-full overflow-y-auto bg-background border-l border-border p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{client.name}</h2>
            <div className="mt-1 text-sm text-subtle">
              {client.plan.toUpperCase()} · {fmtMoney(client.mrr)}/mo · CSM {client.owner_id ?? "unassigned"}
            </div>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-foreground text-xl leading-none">×</button>
        </div>

        {/* Health + override */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <HealthPill band={health.band} overridden={health.overridden} />
          <span className={`text-sm ${renewal.tone}`}>Renews in {renewal.text} · {fmtDate(client.renewal_date)}</span>
        </div>
        <div className="mt-2 text-xs text-subtle">{health.reasons.join(" · ")}</div>

        {/* Pillar breakdown — the KPIs behind the band */}
        <div className="mt-4 bg-surface border border-border rounded-lg px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-subtle mb-2">Health pillars</div>
          <PillarDots pillars={health.pillars} showDetail />
        </div>

        {/* What to sell next */}
        <div className="mt-3 bg-surface border border-border rounded-lg px-3 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] uppercase tracking-wider text-subtle">What to sell next</div>
            <UpsellBadge move={row.upsell.move} label={row.upsell.label} />
          </div>
          <div className="text-xs text-subtle">{row.upsell.reason}</div>
        </div>

        <div className="mt-4">
          <div className={labelClass}>Health override</div>
          <div className="flex gap-2">
            {([null, "green", "amber", "red"] as (HealthBand | null)[]).map((b) => {
              const active = override === b;
              const lbl = b === null ? "Auto" : BAND_META[b].label;
              return (
                <button
                  key={b ?? "auto"}
                  disabled={saving}
                  onClick={() => withSave(() => setHealthOverride(client, b))}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    active
                      ? b === null
                        ? "bg-foreground text-background border-foreground"
                        : BAND_META[b].chip
                      : "bg-surface border-border text-subtle hover:text-foreground"
                  }`}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Tests shipped (mo)" value={row.testsShipped == null ? "n/a" : `${row.testsShipped}/${row.testsCommitted}`} />
          <Stat label="Results (60d)" value={String(row.resultsInLookback)} />
          <Stat label="Last review" value={row.lastReviewAt ? fmtDate(row.lastReviewAt) : "—"} />
          <Stat label="Last contact" value={row.lastContactAt ? fmtDate(row.lastContactAt) : "—"} />
        </div>

        {/* Log form */}
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex gap-2 mb-4">
            {(["review", "result", "task"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  tab === t ? "bg-foreground text-background" : "bg-surface border border-border text-subtle hover:text-foreground"
                }`}
              >
                Log {t}
              </button>
            ))}
          </div>

          {tab === "review" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Type</label>
                  <select className={selectClass} value={rvType} onChange={(e) => setRvType(e.target.value as ClientReview["type"])}>
                    <option value="qbr">QBR</option>
                    <option value="strategic_review">Strategic review</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Held</label>
                  <input type="date" className={inputClass} value={rvDate} onChange={(e) => setRvDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea className={textareaClass} rows={3} value={rvNotes} onChange={(e) => setRvNotes(e.target.value)} placeholder="What was covered, decisions, next steps" />
              </div>
              <div>
                <label className={labelClass}>Next due (optional)</label>
                <input type="date" className={inputClass} value={rvNext} onChange={(e) => setRvNext(e.target.value)} />
              </div>
              <button disabled={saving || !rvNotes.trim()} onClick={submitReview} className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40">Save review</button>
            </div>
          )}

          {tab === "result" && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Title</label>
                <input className={inputClass} value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="Bundle PDP layout" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Metric</label>
                  <input className={inputClass} value={resMetric} onChange={(e) => setResMetric(e.target.value)} placeholder="+12% CVR on PDP" />
                </div>
                <div>
                  <label className={labelClass}>Logged</label>
                  <input type="date" className={inputClass} value={resDate} onChange={(e) => setResDate(e.target.value)} />
                </div>
              </div>
              <button disabled={saving || !resTitle.trim()} onClick={submitResult} className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40">Save result</button>
            </div>
          )}

          {tab === "task" && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Task</label>
                <input className={inputClass} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Prep renewal deck" />
              </div>
              <div>
                <label className={labelClass}>Due</label>
                <input type="date" className={inputClass} value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
              </div>
              <button disabled={saving || !taskTitle.trim()} onClick={submitTask} className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40">Save task</button>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="mt-6 border-t border-border pt-5">
          <div className={labelClass}>Timeline</div>
          {items.length === 0 ? (
            <div className="text-sm text-subtle">Nothing logged yet.</div>
          ) : (
            <div className="space-y-3">
              {items.map((it, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center pt-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: kindDot[it.kind] }} />
                  </div>
                  <div className="flex-1">
                    {it.node}
                    <div className="text-xs text-subtle mt-0.5">{fmtDate(it.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-subtle">{label}</div>
      <div className="text-foreground font-medium mt-0.5">{value}</div>
    </div>
  );
}
