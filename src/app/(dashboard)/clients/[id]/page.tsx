"use client";

/* ── Client detail dashboard ──
 * Answers "how is this client doing, and will they renew?" — not "is the
 * paperwork done?". Renewal readiness + results LEAD; compliance collapses to a
 * strip that only shouts on a gap.
 *
 * Runs on TRUTH: the engagement, dates, tier and delivery come from the kanban
 * project (kanban_clients); the Optimisation journey projects off the Results
 * Engine. The only thing native to this page is the CSM overlay — renewal date,
 * MRR, and the compliance/cadence checklist — which the CSM owns per account and
 * which lives on the `client_csm` satellite, keyed by the canonical client id.
 *
 * Every section is tagged `internal` | `client` via <Section visibility>. The
 * tagging is load-bearing for the future client render mode; keep it.
 */

import { ReactNode, useCallback, useEffect, useState } from "react";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { getClientOptimisation, type ClientOptimisation } from "@/lib/results-engine/data";
import { OptimisationFeed } from "@/components/client-portal/optimisation-feed";
import { clientDetailFromKanban, type ClientDetail } from "@/lib/clients/roster";
import {
  setRenewalDate,
  setMrr,
  toggleChecklistItem,
  addChecklistItem,
  removeChecklistItem,
} from "@/lib/client-csm/store";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  PaperClipIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowTrendingUpIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  ROLE_LABEL,
  engagementTitle,
  engagementBilled,
  itemDone,
  itemDueISO,
  itemDueDay,
  itemOverdue,
  daysUntil,
  complianceState,
  type ChecklistItem,
} from "@/lib/command-centre/model";

function fmtDate(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function fmtWD(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function monthsSince(iso: string, now = new Date()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.round((now.getTime() - t) / (30 * 86_400_000)));
}

/* ── visibility tagging (load-bearing for the portal) ── */
type Visibility = "internal" | "client";

function Section({
  visibility,
  eyebrow,
  right,
  children,
}: {
  visibility: Visibility;
  eyebrow: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section data-visibility={visibility}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-3xs font-medium uppercase tracking-wider text-subtle">{eyebrow}</p>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { clients: kanbanClients } = useKanbanData();
  const [detail, setDetail] = useState<ClientDetail | null | undefined>(undefined);
  const [optGroups, setOptGroups] = useState<ClientOptimisation[]>([]);

  const reload = useCallback(() => {
    if (kanbanClients.length === 0) return;
    clientDetailFromKanban(id, kanbanClients).then(setDetail);
  }, [id, kanbanClients]);
  useEffect(reload, [reload]);

  /* Optimisation projection (§7 internal face): the client's kanban projects →
   * their published Results-Engine journey. Read-only, no copy. */
  useEffect(() => {
    if (!detail) {
      setOptGroups([]);
      return;
    }
    const kc = kanbanClients.find((c) => c.id === detail.clientId);
    const projectIds = kc ? kc.projects.map((p) => p.id) : [];
    if (projectIds.length === 0) {
      setOptGroups([]);
      return;
    }
    let cancelled = false;
    getClientOptimisation(projectIds).then((g) => {
      if (!cancelled) setOptGroups(g);
    });
    return () => {
      cancelled = true;
    };
  }, [detail, kanbanClients]);

  if (detail === undefined) return <div className="px-6 pt-10 md:px-10" />;
  if (detail === null)
    return (
      <div className="px-6 pt-10 text-sm text-muted md:px-10">
        Engagement not found. <Link href="/clients" className="underline">Back to clients</Link>
      </div>
    );

  const { engagement: e, client, prior, clientId } = detail;
  const all = [e, ...prior].sort(
    (a, b) =>
      (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) ||
      (a.startDate < b.startDate ? 1 : -1),
  );
  const recurring = all
    .filter((x) => x.type === "retainer" && x.status === "active")
    .reduce((s, x) => s + x.value, 0);
  const billed = all.reduce((s, x) => {
    const b = engagementBilled(x); // NaN when a retainer has value 0 + no start date
    return s + (Number.isFinite(b) ? b : 0);
  }, 0);
  const active = e.status === "active";
  const clock = new Date();
  const oldestStart = all.map((x) => x.startDate).filter(Boolean).sort()[0] ?? "";

  // ── renewal signals ──
  const days = daysUntil(e.renewalDate, clock);
  const comp = complianceState(e);
  const missing = comp.total - comp.done;
  const slipping = e.items.filter((i) => active && e.startDate && itemOverdue(i, e.startDate, clock));
  const renewalState: RenewalState =
    days != null && days <= 30
      ? "renewal-window"
      : missing > 0 || slipping.length > 0
        ? "at-risk"
        : "on-track";

  const onToggle = (key: string) => {
    void toggleChecklistItem(clientId, key).then(reload);
  };
  const onAddItem = (label: string) => {
    void addChecklistItem(clientId, {
      label,
      group: "compliance",
      cadence: "once",
      ownerRole: "onboarding",
    }).then(reload);
  };
  const onRemoveItem = (key: string) => {
    void removeChecklistItem(clientId, key).then(reload);
  };

  // cadence items
  const digest = e.items.find((i) => i.key === "digest");
  const report = e.items.find((i) => i.key === "monthly_report");
  const qbr = e.items.find((i) => i.key === "quarterly_call");
  const complianceItems = e.items.filter((i) => i.group === "compliance");

  return (
    <div className="space-y-8 px-6 pb-24 pt-8 md:px-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs text-subtle transition-colors hover:text-muted"
        >
          <ArrowLeftIcon className="size-3.5" />
          Clients
        </Link>
      </div>

      {/* 1 · HEADER — account identity & worth · client */}
      <section data-visibility="client">
        <div className="rounded border border-border-faint bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-xl font-semibold">{client.name}</h1>
              <p className="mt-1 text-sm text-muted">
                {recurring > 0 && (
                  <>
                    <span className="font-medium tabular-nums text-foreground">
                      £{recurring.toLocaleString()}
                    </span>
                    /mo ·{" "}
                  </>
                )}
                <span className="font-medium tabular-nums text-foreground">
                  £{billed.toLocaleString()}
                </span>{" "}
                billed · client {monthsSince(oldestStart)} mo
              </p>
            </div>
            {/* CSM-owned commercial fields — entered per account, stored on the
                satellite, never fabricated. */}
            <div className="flex flex-wrap items-center gap-2">
              <MrrEditor
                clientId={clientId}
                value={e.value || undefined}
                onSaved={reload}
              />
              <RenewalEditor
                clientId={clientId}
                value={e.renewalDate}
                onSaved={reload}
              />
            </div>
          </div>

          {/* engagement switcher — a client can hold a build + a retainer */}
          {all.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border-faint pt-4">
              {all.map((x) => (
                <button
                  key={x.id}
                  onClick={() => x.id !== e.id && router.push(`/clients/${x.id}`)}
                  className={`rounded border px-2.5 py-1 text-2xs transition-colors ${
                    x.id === e.id
                      ? "border-border bg-surface-raised text-foreground"
                      : "border-border-faint text-muted hover:bg-surface-raised"
                  }`}
                >
                  <span
                    className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${
                      x.status === "active" ? "bg-status-ontrack" : "bg-subtle"
                    }`}
                  />
                  {engagementTitle(x)}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2 · RENEWAL READINESS · internal (our call, not the client's) */}
      <Section
        visibility="internal"
        eyebrow="Renewal readiness"
        right={<RenewalStatePill state={renewalState} />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {/* countdown */}
          <div className="rounded border border-border-faint bg-surface p-5">
            <p className="text-3xs uppercase tracking-wider text-subtle">
              {e.type === "project" ? "Ends in" : "Renews in"}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
              {days == null ? "—" : `${days}d`}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {fmtDate(e.renewalDate) || "no renewal date set"}
            </p>
            <div className="mt-4 border-t border-border-faint pt-4">
              <p className="text-3xs uppercase tracking-wider text-subtle">The value case</p>
              {optGroups.length === 0 ? (
                <p className="mt-1.5 text-sm text-subtle">
                  No results published yet, the renewal case is thin.
                </p>
              ) : (
                <p className="mt-1.5 flex items-center gap-2 text-sm text-foreground">
                  <ArrowTrendingUpIcon className="size-4 text-status-ontrack" />
                  Live results below: see the Optimisation journey
                </p>
              )}
            </div>
          </div>

          {/* churn risk read */}
          <div className="rounded border border-border-faint bg-surface p-5">
            <p className="text-3xs uppercase tracking-wider text-subtle">Churn risk</p>
            {renewalState === "on-track" && missing === 0 && slipping.length === 0 ? (
              <p className="mt-1.5 text-sm text-status-ontrack">
                No open risks. Compliance clean, cadence on time.
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1 text-sm text-muted">
                {missing > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-status-late" />
                    {missing} compliance gap{missing > 1 ? "s" : ""}
                  </li>
                )}
                {slipping.map((i) => (
                  <li key={i.key} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-status-approaching" />
                    {i.label} overdue
                  </li>
                ))}
                {days != null && days <= 30 && (
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-status-late" />
                    Renewal window open ({days}d): book the conversation
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {/* Optimisation — the client's live Results-Engine journey (§7), projected
          off kanban_clients. Read-only; the strategist controls what publishes. */}
      <Section visibility="client" eyebrow="Optimisation">
        <OptimisationFeed groups={optGroups} />
      </Section>

      {/* CADENCE — the rhythm · internal (a reminder for us) */}
      <Section visibility="internal" eyebrow="Cadence">
        <div className="grid gap-3 sm:grid-cols-3">
          <CadenceCard
            label="Weekly digest"
            value={
              digest && e.startDate
                ? active
                  ? itemDone(digest, e.startDate, clock)
                    ? `Next ${fmtDate(itemDueISO(digest, e.startDate, clock))}`
                    : `Due ${fmtDate(itemDueISO(digest, e.startDate, clock))}`
                  : "—"
                : "—"
            }
          />
          <CadenceCard
            label="Next report"
            value={report && e.startDate ? fmtDate(itemDueISO(report, e.startDate, clock)) : "—"}
          />
          <CadenceCard
            label="Next QBR"
            value={qbr && e.startDate ? fmtDate(itemDueISO(qbr, e.startDate, clock)) : "Not on this tier"}
          />
        </div>
      </Section>

      {/* COMPLIANCE — collapsed strip · internal (editable checklist) */}
      <Section visibility="internal" eyebrow="Compliance">
        <ComplianceStrip
          items={complianceItems}
          startDate={e.startDate}
          clock={clock}
          active={active}
          onToggle={onToggle}
          onRemove={onRemoveItem}
          onAdd={onAddItem}
        />
      </Section>
    </div>
  );
}

/* ── CSM editors (write to the client_csm satellite) ── */

function MrrEditor({
  clientId,
  value,
  onSaved,
}: {
  clientId: string;
  value?: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  function open() {
    setDraft(value != null ? String(value) : "");
    setEditing(true);
  }
  function commit() {
    const raw = draft.trim();
    const n = raw === "" ? undefined : Number(raw);
    void setMrr(clientId, n).then(() => {
      setEditing(false);
      onSaved();
    });
  }
  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded border border-border bg-surface px-2 py-1">
        <span className="text-2xs text-subtle">£</span>
        <input
          autoFocus
          value={draft}
          inputMode="numeric"
          onChange={(ev) => setDraft(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") commit();
            if (ev.key === "Escape") setEditing(false);
          }}
          placeholder="MRR"
          className="w-20 bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
        />
        <button
          onClick={commit}
          className="rounded bg-foreground px-1.5 py-0.5 text-3xs font-medium text-background"
        >
          Save
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={open}
      className="rounded border border-border-faint px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
      title="Set MRR"
    >
      {value != null ? (
        <span className="tabular-nums">£{value.toLocaleString()}/mo</span>
      ) : (
        <span className="text-subtle">Set MRR</span>
      )}
    </button>
  );
}

function RenewalEditor({
  clientId,
  value,
  onSaved,
}: {
  clientId: string;
  value?: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  function open() {
    setDraft(value ?? "");
    setEditing(true);
  }
  function commit(next: string) {
    void setRenewalDate(clientId, next || undefined).then(() => {
      setEditing(false);
      onSaved();
    });
  }
  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        value={draft}
        onChange={(ev) => {
          setDraft(ev.target.value);
          commit(ev.target.value);
        }}
        onBlur={() => setEditing(false)}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground focus:outline-none"
      />
    );
  }
  return (
    <button
      onClick={open}
      className="rounded border border-border-faint px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
      title="Set renewal date"
    >
      {value ? `Renews ${fmtDate(value)}` : <span className="text-subtle">Set renewal</span>}
    </button>
  );
}

/* ── pieces ── */

type RenewalState = "on-track" | "at-risk" | "renewal-window";
const RENEWAL_META: Record<RenewalState, { label: string; dot: string; text: string }> = {
  "on-track": { label: "On track", dot: "bg-status-ontrack", text: "text-status-ontrack" },
  "at-risk": { label: "At risk", dot: "bg-status-approaching", text: "text-status-approaching" },
  "renewal-window": { label: "Renewal window", dot: "bg-status-late", text: "text-status-late" },
};
function RenewalStatePill({ state }: { state: RenewalState }) {
  const m = RENEWAL_META[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${m.text}`}>
      <span className={`size-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function CadenceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border-faint bg-surface p-4">
      <p className="text-3xs uppercase tracking-wider text-subtle">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function ComplianceStrip({
  items,
  startDate,
  clock,
  active,
  onToggle,
  onRemove,
  onAdd,
}: {
  items: ChecklistItem[];
  startDate: string;
  clock: Date;
  active: boolean;
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onAdd: (label: string) => void;
}) {
  const done = items.filter((i) => i.status === "done").length;
  const missing = items.length - done;
  const [open, setOpen] = useState(missing > 0);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");

  function commitAdd() {
    if (!label.trim()) return;
    onAdd(label.trim());
    setLabel("");
    setAdding(false);
    setOpen(true);
  }

  return (
    <div className={`rounded border ${missing === 0 ? "border-status-ontrack/25" : "border-status-late/25"} bg-surface`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs"
      >
        {open ? (
          <ChevronDownIcon className="size-3.5 text-subtle" />
        ) : (
          <ChevronRightIcon className="size-3.5 text-subtle" />
        )}
        {missing === 0 ? (
          <>
            <CheckCircleIcon className="size-4 text-status-ontrack" />
            <span className="text-foreground">Compliance complete</span>
            <span className="text-subtle">· {done}/{items.length}</span>
          </>
        ) : (
          <>
            <span className="size-1.5 rounded-full bg-status-late" />
            <span className="font-medium text-foreground">{missing} missing</span>
            <span className="text-subtle">· {done}/{items.length} done</span>
          </>
        )}
      </button>
      {open && (
        <div className="border-t border-border-faint">
          {items.map((item, i) => (
            <ChecklistRow
              key={item.key}
              item={item}
              startDate={startDate}
              clock={clock}
              active={active}
              first={i === 0}
              onToggle={() => onToggle(item.key)}
              onRemove={() => onRemove(item.key)}
            />
          ))}
          <div data-admin className="border-t border-border px-4 py-2.5">
            {adding ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={label}
                  onChange={(ev) => setLabel(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") commitAdd();
                    if (ev.key === "Escape") setAdding(false);
                  }}
                  placeholder="Add a checklist item…"
                  className="min-w-[160px] flex-1 rounded border border-border-faint bg-surface px-2 py-1 text-sm text-foreground placeholder:text-subtle focus:outline-none"
                />
                <button
                  onClick={commitAdd}
                  className="rounded bg-foreground px-2.5 py-1 text-2xs font-medium text-background"
                >
                  Add
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="rounded px-2 py-1 text-2xs text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
              >
                <PlusIcon className="size-3.5" />
                Add item
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  startDate,
  clock,
  active,
  first,
  onToggle,
  onRemove,
}: {
  item: ChecklistItem;
  startDate: string;
  clock: Date;
  active: boolean;
  first: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const recurring = item.cadence !== "once";
  const anchor = startDate || undefined;
  const done = anchor ? itemDone(item, anchor, clock) : item.status === "done";
  const overdue = active && !!anchor && itemOverdue(item, anchor, clock);
  const dueISO = anchor ? itemDueISO(item, anchor, clock) : undefined;
  const dayN =
    recurring && anchor && (item.cadence === "monthly" || item.cadence === "quarterly")
      ? itemDueDay(item, anchor, clock)
      : null;
  const dayPrefix = dayN != null ? `Day ${dayN} · ` : "";
  const evidenceSmell = done && !recurring && item.needsEvidence && !item.evidence;

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 ${first ? "" : "border-t border-border"}`}>
      <button onClick={onToggle} className="shrink-0" aria-label={done ? "Mark not done" : "Mark done"}>
        {done ? (
          <CheckCircleIcon className="size-5 text-status-ontrack" />
        ) : (
          <span className={`block size-[18px] rounded-full border ${overdue ? "border-status-late" : "border-border"}`} />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${done && !recurring ? "text-muted" : "text-foreground"}`}>{item.label}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-subtle">
          <span>{ROLE_LABEL[item.ownerRole]}</span>
          {recurring && anchor ? (
            !active ? (
              <><span>·</span><span>cadence ended</span></>
            ) : done ? (
              <><span>·</span><span>done this cycle</span><span>·</span><span className="text-muted">next {dayPrefix}{fmtWD(dueISO)}</span></>
            ) : (
              <><span>·</span><span className={overdue ? "text-status-late" : ""}>{overdue ? "overdue" : "due"} {dayPrefix}{fmtDate(dueISO)}</span></>
            )
          ) : done && item.completedAt ? (
            <><span>·</span><span>done {fmtDate(item.completedAt)}</span></>
          ) : dueISO ? (
            <><span>·</span><span className={overdue ? "text-status-late" : ""}>{overdue ? "overdue" : "due"} {fmtDate(dueISO)}</span></>
          ) : null}
        </div>
      </div>
      {done && item.evidence ? (
        <a href="#" className="inline-flex shrink-0 items-center gap-1.5 rounded border border-border px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"><PaperClipIcon className="size-3" />{item.evidence}</a>
      ) : evidenceSmell ? (
        <button className="inline-flex shrink-0 items-center gap-1.5 rounded border border-dashed border-status-approaching/40 px-2 py-1 text-xs text-status-approaching"><ArrowUpRightIcon className="size-3" />Attach evidence</button>
      ) : null}
      <button
        data-admin
        onClick={onRemove}
        className="shrink-0 text-subtle opacity-0 transition-all hover:text-status-late group-hover:opacity-100"
        title="Remove item"
      >
        <TrashIcon className="size-4" />
      </button>
    </div>
  );
}
