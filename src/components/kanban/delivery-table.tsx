"use client";

/* ── Delivery · Table view ──
 * A phase-banded table over the live kanban deliverables — the same data the
 * board renders, read as columns. Built on the app's shared table primitives so
 * it reads like the KPI + Clients surfaces: quiet sentence-case headers, one set
 * of columns for every band, generous rows. A light phase-count strip up top,
 * then rows grouped into five collapsible phase bands. Click a row → a slide-out
 * with its phase history + team.
 *
 * Presentation only — no writes. Moving deliverables + the subtask editor stay
 * on the board.
 */

import { useMemo, useState } from "react";
import { XMarkIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Table, THead, TBody, TR, TH, TD, Num } from "@/components/ui";
import {
  previewPhaseMeta,
  statusForHoursInPhase,
  calendarDaysInCurrentPhase,
  revisionRoundCount,
  activeAssigneeFor,
  daysBetween,
  WORKING_HOURS_PER_DAY,
  MOCK_TODAY,
  type PreviewPhase,
  type StuckStatus,
  type PhaseHistoryEntry,
} from "@/lib/projects/preview-phases";
import type { MockClient } from "@/lib/projects/mock-data";

type Band = "tickets" | "intake" | "p1" | "p2" | "p3";

const BANDS: { key: Band; label: string; color: string }[] = [
  { key: "tickets", label: "Tickets", color: "#EF4444" },
  { key: "intake", label: "Setup", color: "#71717A" },
  { key: "p1", label: "Phase 1 · Design", color: "#7C3AED" },
  { key: "p2", label: "Phase 2 · Development", color: "#0F9D6C" },
  { key: "p3", label: "Phase 3 · Approval + Launch", color: "#16A34A" },
];

function bandForPhase(p: PreviewPhase): Band | null {
  switch (p) {
    case "tickets":
      return "tickets";
    case "not-started":
      return "intake";
    case "strategy":
    case "design":
    case "internal-revisions":
    case "external-revisions":
      return "p1";
    case "development":
    case "qa":
      return "p2";
    case "client-approval":
    case "launch":
    case "done":
      return "p3";
    // test-backlog + launch-testing have left the delivery board (Results Engine)
    default:
      return null;
  }
}

const STATUS_TEXT: Record<StuckStatus, string> = {
  "on-track": "text-muted",
  approaching: "text-status-approaching",
  stuck: "text-status-late",
};

interface Row {
  id: string;
  title: string;
  category?: string;
  client: string;
  band: Band;
  phase: PreviewPhase;
  phaseLabel: string;
  phaseColor: string;
  owner: string;
  days: number;
  status: StuckStatus;
  loops: number;
  history: PhaseHistoryEntry[];
  designer?: string;
  secondaryDesigner?: string;
  developer?: string;
  secondaryDeveloper?: string;
}

const EYEBROW = "text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle";

export function DeliveryTableView({
  clients,
  loading,
}: {
  clients: MockClient[];
  loading: boolean;
}) {
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Set<Band>>(new Set());
  const [selected, setSelected] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const c of clients) {
      for (const proj of c.projects) {
        for (const d of proj.deliverables) {
          const band = bandForPhase(d.phase);
          if (!band) continue;
          const meta = previewPhaseMeta(d.phase);
          const status = statusForHoursInPhase(d.phase, d.hoursInPhase);
          const days = d.phaseHistory?.length
            ? calendarDaysInCurrentPhase(d.phaseHistory)
            : Math.round((d.hoursInPhase || 0) / WORKING_HOURS_PER_DAY);
          out.push({
            id: d.id,
            title: d.title,
            category: d.category,
            client: c.name,
            band,
            phase: d.phase,
            phaseLabel: meta?.label ?? d.phase,
            phaseColor: meta?.color ?? "#888",
            owner: activeAssigneeFor(d.phase, {
              designer: d.designer,
              secondaryDesigner: d.secondaryDesigner,
              developer: d.developer,
              secondaryDeveloper: d.secondaryDeveloper,
            }).name,
            days,
            status,
            loops: revisionRoundCount(d.phaseHistory),
            history: d.phaseHistory ?? [],
            designer: d.designer,
            secondaryDesigner: d.secondaryDesigner,
            developer: d.developer,
            secondaryDeveloper: d.secondaryDeveloper,
          });
        }
      }
    }
    return out;
  }, [clients]);

  const shown = useMemo(
    () => (clientFilter === "all" ? rows : rows.filter((r) => r.client === clientFilter)),
    [rows, clientFilter],
  );

  const byBand = useMemo(() => {
    const m = new Map<Band, Row[]>();
    BANDS.forEach((b) => m.set(b.key, []));
    shown.forEach((r) => m.get(r.band)!.push(r));
    return m;
  }, [shown]);

  const toggle = (b: Band) =>
    setCollapsed((s) => {
      const n = new Set(s);
      n.has(b) ? n.delete(b) : n.add(b);
      return n;
    });

  return (
    <div>
      {/* toolbar: project filter */}
      <div className="mb-5 flex items-center justify-between">
        <p className={EYEBROW}>Delivery · {shown.length} live</p>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="rounded border border-border-faint bg-surface px-3 py-1.5 text-sm text-foreground focus:border-subtle focus:outline-none"
        >
          <option value="all">All projects</option>
          {clients.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* phase-count strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {BANDS.map((b) => {
          const items = byBand.get(b.key) ?? [];
          const risk = items.filter((r) => r.status !== "on-track").length;
          const stuck = items.some((r) => r.status === "stuck");
          return (
            <button
              key={b.key}
              onClick={() => {
                setCollapsed((s) => {
                  const n = new Set(s);
                  n.delete(b.key);
                  return n;
                });
                document.getElementById("band-" + b.key)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              className="rounded border border-border-faint bg-surface px-4 py-3.5 text-left transition-colors hover:border-border"
            >
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: b.color }} />
                <span className="text-2xs font-medium uppercase tracking-wider text-subtle">{b.label}</span>
              </div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">{items.length}</div>
              <div className={`mt-1 text-2xs ${risk ? (stuck ? "text-status-late" : "text-status-approaching") : "text-subtle"}`}>
                {risk ? `${risk} at risk` : "on track"}
              </div>
            </button>
          );
        })}
      </div>

      {/* one fixed-width table, header shown once, bands as collapsible groups */}
      {loading ? (
        <p className="py-16 text-center text-sm text-subtle">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded border border-border-faint">
          <Table className="table-fixed">
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "9%" }} />
            </colgroup>
            <THead>
              <TR hover={false}>
                <TH>Deliverable</TH>
                <TH>Client</TH>
                <TH>Focus</TH>
                <TH>Owner</TH>
                <TH align="right">In phase</TH>
              </TR>
            </THead>
            {BANDS.map((b) => {
              const items = byBand.get(b.key) ?? [];
              const isOpen = !collapsed.has(b.key);
              const risk = items.filter((r) => r.status !== "on-track").length;
              const stuck = items.some((r) => r.status === "stuck");
              return (
                <TBody key={b.key}>
                  {/* group divider */}
                  <TR
                    hover={false}
                    id={"band-" + b.key}
                    className="cursor-pointer bg-surface hover:bg-surface-raised"
                    onClick={() => toggle(b.key)}
                  >
                    <TD colSpan={5} className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <ChevronRightIcon
                          className={`size-3.5 text-subtle transition-transform ${isOpen ? "rotate-90" : ""}`}
                        />
                        <span className="size-1.5 rounded-full" style={{ background: b.color }} />
                        <span className={EYEBROW}>{b.label}</span>
                        <span className="text-2xs tabular-nums text-subtle">{items.length}</span>
                        {risk > 0 && (
                          <span className={`text-2xs tabular-nums ${stuck ? "text-status-late" : "text-status-approaching"}`}>
                            {risk} at risk
                          </span>
                        )}
                      </div>
                    </TD>
                  </TR>
                  {isOpen &&
                    (items.length === 0 ? (
                      <TR hover={false}>
                        <TD colSpan={5} className="py-3 text-xs text-subtle">
                          Nothing in this phase.
                        </TD>
                      </TR>
                    ) : (
                      items.map((r) => (
                        <TR key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                          <TD className="truncate">
                            <span className="font-medium text-foreground">{r.title}</span>
                            {r.category && <span className="ml-2 text-2xs text-subtle">{r.category}</span>}
                          </TD>
                          <TD className="truncate text-muted">{r.client}</TD>
                          <TD className="truncate">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="size-1.5 shrink-0 rounded-full" style={{ background: r.phaseColor }} />
                              <span className="truncate text-muted">{r.phaseLabel}</span>
                            </span>
                          </TD>
                          <TD className="truncate text-muted">{r.owner}</TD>
                          <TD align="right">
                            <Num className={STATUS_TEXT[r.status]}>{r.days}d</Num>
                          </TD>
                        </TR>
                      ))
                    ))}
                </TBody>
              );
            })}
          </Table>
        </div>
      )}

      {selected && <DetailPanel row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DetailPanel({ row, onClose }: { row: Row; onClose: () => void }) {
  const hist = row.history.map((h, i) => {
    const next = row.history[i + 1];
    const dur = daysBetween(h.enteredAt, next ? next.enteredAt : MOCK_TODAY);
    const meta = previewPhaseMeta(h.phase);
    return { label: meta?.label ?? h.phase, dur, now: i === row.history.length - 1 };
  });
  const team: { role: string; name?: string }[] = [
    { role: "Designer", name: row.designer },
    { role: "2nd designer", name: row.secondaryDesigner },
    { role: "Developer", name: row.developer },
    { role: "2nd developer", name: row.secondaryDeveloper },
  ].filter((t) => t.name);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-7">
          <button onClick={onClose} className="absolute right-5 top-5 text-subtle transition-colors hover:text-foreground">
            <XMarkIcon className="size-5" />
          </button>

          <p className={EYEBROW}>{row.category ?? "Deliverable"}</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground">{row.title}</h2>
          <p className="mt-2 text-sm text-muted">
            {row.client} · <span style={{ color: row.phaseColor }}>{row.phaseLabel}</span> · {row.days}d in phase
          </p>

          <Section label="Phase history">
            <div className="flex flex-col">
              {hist.map((h, i) => (
                <div key={i} className="grid grid-cols-[15px_1fr_auto] items-center gap-3 py-1.5">
                  <span
                    className={`size-2 rounded-full ${h.now ? "bg-status-ontrack" : "bg-subtle"}`}
                    style={h.now ? { boxShadow: "0 0 0 3px rgba(16,185,129,.15)" } : undefined}
                  />
                  <span className={`text-sm text-foreground ${h.now ? "font-medium" : ""}`}>
                    {h.label}
                    {h.now ? " · now" : ""}
                  </span>
                  <Num className="text-xs text-subtle">{h.dur}d</Num>
                </div>
              ))}
              {row.loops > 0 && (
                <p className="mt-2 text-xs text-status-approaching">
                  {row.loops} revision {row.loops === 1 ? "round" : "rounds"} — bounced back for changes.
                </p>
              )}
            </div>
          </Section>

          <Section label="Team">
            <div className="flex flex-col gap-2.5">
              {team.map((t) => (
                <div key={t.role} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-2xs font-medium uppercase tracking-wider text-subtle">{t.role}</span>
                  <span className="text-foreground">{t.name}</span>
                </div>
              ))}
            </div>
          </Section>

          <p className="mt-8 text-xs text-subtle">
            Moving phases and the subtask checklist stay on the board — open this card on the board to edit.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 border-t border-border-faint pt-6">
      <p className={`${EYEBROW} mb-4`}>{label}</p>
      {children}
    </section>
  );
}
