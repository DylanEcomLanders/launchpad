"use client";

/* ── Client detail dashboard ──
 * Answers "how is this client doing, and will they renew?" - not "is the
 * paperwork done?". Renewal readiness + results LEAD; compliance collapses to a
 * strip that only shouts on a gap.
 *
 * ONE dashboard, two modes. Every section is tagged `internal` | `client` via
 * the <Section visibility> prop (and <InternalOnly> for internal blocks inside
 * a client section). The future client portal is THIS component filtered to
 * `client` sections + rolled-up phases + a security wrapper - a render mode,
 * not a redesign. The tagging is load-bearing; keep it.
 *
 * Data sources per section are named inline. Sections sourced from the kanban
 * commercial layer (capacity meter, in-flight cards, results bank, artifacts)
 * are STUBBED here, not faked: this page runs on the command-centre model,
 * which isn't yet linked to a client's kanban board. They light up once that
 * link exists.
 */

import { ReactNode, useEffect, useRef, useState } from "react";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { getClientOptimisation, type ClientOptimisation } from "@/lib/results-engine/data";
import { OptimisationFeed } from "@/components/client-portal/optimisation-feed";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  PaperClipIcon,
  ArrowUpRightIcon,
  ArrowUpTrayIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  DocumentTextIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowTrendingUpIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import {
  getEngagementView,
  getResponsibilities,
  toggleItem,
  addDocument,
  removeDocument,
  addResult,
  removeResult,
  addWorkItem,
  removeWorkItem,
  setWorkItemPhase,
  ensurePortalToken,
  type EngagementView,
} from "@/lib/command-centre/store";
import {
  ROLE_LABEL,
  RESULT_OUTCOME_LABEL,
  WORK_PHASE_ORDER,
  WORK_PHASE_LABEL,
  engagementTitle,
  engagementBilled,
  itemDone,
  itemDueISO,
  itemDueDay,
  itemOverdue,
  daysUntil,
  complianceState,
  type ChecklistItem,
  type ClientDoc,
  type BankedResult,
  type ResultOutcome,
  type WorkItem,
  type WorkPhase,
  type Responsibilities,
} from "@/lib/command-centre/model";
import {
  uploadClientDocument,
  signDocumentPaths,
  deleteClientDocument,
} from "@/lib/command-centre/documents";
import { useCurrentUser } from "@/components/auth-gate";
import { NewEngagementModal } from "../_new-engagement";

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function fmtWD(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function monthsSince(iso: string, now = new Date()): number {
  return Math.max(
    0,
    Math.round((now.getTime() - new Date(iso).getTime()) / (30 * 86_400_000)),
  );
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
        <p className="text-3xs font-medium uppercase tracking-wider text-subtle">
          {eyebrow}
        </p>
        {right}
      </div>
      {children}
    </section>
  );
}

/* A section whose data comes from the kanban commercial layer, which isn't yet
 * linked to this engagement. Honest stub - never fabricated numbers. */
function NotLinkedStub({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-border-faint bg-surface p-5">
      <p className="text-sm text-subtle">{children}</p>
    </div>
  );
}

/* Copy / open the isolated client link (/client/[token]). The token is minted
 * on first use. This is the shareable, chrome-free client dashboard. */
function ClientLinkButton({ engagementId }: { engagementId: string }) {
  const [copied, setCopied] = useState(false);
  function link(): string | null {
    const token = ensurePortalToken(engagementId);
    if (!token) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/client/${token}`;
  }
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          const url = link();
          if (!url) return;
          void navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
      >
        <LinkIcon className="size-3.5" />
        {copied ? "Copied" : "Copy client link"}
      </button>
      <button
        onClick={() => {
          const url = link();
          if (url) window.open(url, "_blank", "noopener");
        }}
        className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
        title="Open the client view"
      >
        <ArrowTopRightOnSquareIcon className="size-3.5" />
        Open
      </button>
    </div>
  );
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [view, setView] = useState<EngagementView | null | undefined>(undefined);
  const [resp, setResp] = useState<Responsibilities | null>(null);
  const { clients: kanbanClients } = useKanbanData();
  const [optGroups, setOptGroups] = useState<ClientOptimisation[]>([]);

  const reload = () => {
    setView(getEngagementView(id));
    setResp(getResponsibilities());
  };
  useEffect(reload, [id]);

  /* Optimisation projection (§7 internal face): resolve this client to their
   * kanban projects (by name — the canonical client identity is kanban_clients)
   * and read their published Results-Engine journey. Read-only, no copy. */
  useEffect(() => {
    if (!view) {
      setOptGroups([]);
      return;
    }
    const name = view.client.name.trim().toLowerCase();
    const kc = kanbanClients.find((c) => c.name.trim().toLowerCase() === name);
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
  }, [view, kanbanClients]);

  if (view === undefined) return <div className="px-6 pt-10 md:px-10" />;
  if (view === null)
    return (
      <div className="px-6 pt-10 text-sm text-muted md:px-10">
        Engagement not found. <Link href="/clients" className="underline">Back to clients</Link>
      </div>
    );

  const { engagement: e, client, prior } = view;
  const all = [e, ...prior].sort(
    (a, b) =>
      (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) ||
      (a.startDate < b.startDate ? 1 : -1),
  );
  const recurring = all
    .filter((x) => x.type === "retainer" && x.status === "active")
    .reduce((s, x) => s + x.value, 0);
  const billed = all.reduce((s, x) => s + engagementBilled(x), 0);
  const active = e.status === "active";
  const clock = active
    ? new Date()
    : new Date(e.targetEndDate ?? e.renewalDate ?? e.startDate);

  // ── renewal signals (command-centre native) ──
  const renewTarget = e.type === "project" ? e.targetEndDate : e.renewalDate;
  const days = daysUntil(renewTarget, clock);
  const comp = complianceState(e);
  const missing = comp.total - comp.done;
  const slipping = e.items.filter(
    (i) => active && itemOverdue(i, e.startDate, clock),
  );
  const renewalState: RenewalState =
    days != null && days <= 30
      ? "renewal-window"
      : missing > 0 || slipping.length > 0
        ? "at-risk"
        : "on-track";

  // banked wins + live work (manual, POC — no kanban link)
  const results = (e.results ?? [])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  const wins = results.filter((r) => r.outcome === "winner").length;
  const bestUplift = results.reduce(
    (m, r) => (r.upliftPct != null && r.upliftPct > m ? r.upliftPct : m),
    0,
  );
  const workItems = e.workItems ?? [];

  const onToggle = (key: string) => {
    toggleItem(e.id, key);
    reload();
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
        <ClientLinkButton engagementId={e.id} />
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
                billed · client {monthsSince(all[all.length - 1].startDate)} mo
              </p>
            </div>
            <div className="text-right text-xs text-muted">
              {client.contactName && (
                <div className="text-foreground">
                  {client.contactName}{" "}
                  <span className="text-subtle">· {client.contactRole}</span>
                </div>
              )}
              {client.contactEmail && (
                <a
                  href={`mailto:${client.contactEmail}`}
                  className="underline-offset-2 hover:underline"
                >
                  {client.contactEmail}
                </a>
              )}
            </div>
          </div>

          {/* engagement switcher — thin, stays in the header */}
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
              <button
                data-admin
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-1 rounded border border-dashed border-border px-2.5 py-1 text-2xs text-subtle transition-colors hover:text-muted"
              >
                <PlusIcon className="size-3" />
                New
              </button>
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
          {/* countdown + banked value case */}
          <div className="rounded border border-border-faint bg-surface p-5">
            <p className="text-3xs uppercase tracking-wider text-subtle">
              {e.type === "project" ? "Delivers in" : "Renews in"}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
              {days == null ? "—" : `${days}d`}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {fmtDate(renewTarget) || "no date set"}
            </p>
            <div className="mt-4 border-t border-border-faint pt-4">
              <p className="text-3xs uppercase tracking-wider text-subtle">
                The value case
              </p>
              {results.length === 0 ? (
                <p className="mt-1.5 text-sm text-subtle">
                  No wins banked yet — the renewal case is thin.
                </p>
              ) : (
                <p className="mt-1.5 flex items-center gap-2 text-sm text-foreground">
                  <ArrowTrendingUpIcon className="size-4 text-status-ontrack" />
                  {wins} win{wins === 1 ? "" : "s"} banked
                  {bestUplift > 0 && (
                    <span className="text-muted">· best +{bestUplift}%</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* churn risk read */}
          <div className="rounded border border-border-faint bg-surface p-5">
            <p className="text-3xs uppercase tracking-wider text-subtle">
              Churn risk
            </p>
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
                    Renewal window open ({days}d) — book the conversation
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {/* 3 · CAPACITY THIS MONTH — the meter · internal (never client-facing) */}
      <Section visibility="internal" eyebrow="Capacity this month">
        {/* The token pool lives on the kanban board (Slice 1). Internal-only —
            a client never sees their token burn. Shown on the board, not
            re-tracked here (no double-entry). */}
        <NotLinkedStub>
          Token capacity is tracked on the delivery board. Internal only — never
          shown to the client.
        </NotLinkedStub>
      </Section>

      {/* 4 · IN FLIGHT — live delivery · client (abstracted: phase, no dates) */}
      <Section visibility="client" eyebrow="In flight">
        <InFlightSection
          engagementId={e.id}
          items={workItems}
          onChanged={reload}
        />
      </Section>

      {/* Optimisation — the client's live Results-Engine journey (§7), projected
          off kanban_clients. Read-only; the strategist controls what publishes. */}
      <Section visibility="client" eyebrow="Optimisation">
        <OptimisationFeed groups={optGroups} />
      </Section>

      {/* 5 · RESULTS — the wins · client (outcomes, never due-dates) */}
      <Section visibility="client" eyebrow="Results">
        <ResultsSection
          engagementId={e.id}
          results={results}
          onChanged={reload}
        />
      </Section>

      {/* 6 · LIBRARY — docs & strategy · client */}
      <Section visibility="client" eyebrow="Library">
        <div className="space-y-4">
          {/* Strategy artifacts (from the artifacts table, keyed to the kanban
              project). Not linked → grouped empty states. */}
          <div className="grid gap-3 sm:grid-cols-2">
            {LIBRARY_GROUPS.map((g) => (
              <div
                key={g.type}
                className="rounded border border-border-faint bg-surface p-4"
              >
                <p className="text-xs font-medium text-foreground">{g.label}</p>
                <p className="mt-1 text-2xs text-subtle">{g.empty}</p>
              </div>
            ))}
          </div>
          {/* Uploaded reference docs (invoices, agreements) — real, native to
              this engagement. Billing itself lives in Xero. */}
          <DocumentsSection
            engagementId={e.id}
            docs={e.documents ?? []}
            onChanged={reload}
          />
        </div>
      </Section>

      {/* 7 · CADENCE — the rhythm · internal (a reminder for us) */}
      <Section visibility="internal" eyebrow="Cadence">
        <div className="grid gap-3 sm:grid-cols-3">
          <CadenceCard
            label="Weekly digest"
            value={
              digest
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
            value={report ? fmtDate(itemDueISO(report, e.startDate, clock)) : "—"}
          />
          <CadenceCard
            label="Next QBR"
            value={qbr ? fmtDate(itemDueISO(qbr, e.startDate, clock)) : "Not on this tier"}
          />
        </div>
      </Section>

      {/* 8 · COMPLIANCE — collapsed strip · internal (demoted from hero) */}
      <Section visibility="internal" eyebrow="Compliance">
        <ComplianceStrip
          items={complianceItems}
          startDate={e.startDate}
          clock={clock}
          active={active}
          resp={resp}
          onToggle={onToggle}
        />
      </Section>

      {showNew && (
        <NewEngagementModal
          presetClientId={client.id}
          onClose={() => setShowNew(false)}
          onCreated={(newId) => router.push(`/clients/${newId}`)}
        />
      )}
    </div>
  );
}

/* ── pieces ── */

type RenewalState = "on-track" | "at-risk" | "renewal-window";
const RENEWAL_META: Record<
  RenewalState,
  { label: string; dot: string; text: string }
> = {
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

const LIBRARY_GROUPS: { type: string; label: string; empty: string }[] = [
  { type: "growth_plan", label: "Growth plan", empty: "No plan yet." },
  { type: "customer_research", label: "Customer research", empty: "No research yet." },
  { type: "competitor_audit", label: "Competitor audit", empty: "No audit yet." },
  { type: "offer_work", label: "Offer work", empty: "Nothing yet." },
  { type: "monthly_report", label: "Monthly reports", empty: "First report pending." },
  { type: "qbr", label: "QBR decks", empty: "No QBR yet." },
];

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
  resp,
  onToggle,
}: {
  items: ChecklistItem[];
  startDate: string;
  clock: Date;
  active: boolean;
  resp: Responsibilities | null;
  onToggle: (key: string) => void;
}) {
  const done = items.filter((i) => i.status === "done").length;
  const missing = items.length - done;
  const [open, setOpen] = useState(missing > 0);

  // Clean → thin green strip, nothing to expand.
  if (missing === 0) {
    return (
      <div className="flex items-center gap-2 rounded border border-status-ontrack/25 bg-status-ontrack/[0.05] px-4 py-2.5 text-xs">
        <CheckCircleIcon className="size-4 text-status-ontrack" />
        <span className="text-foreground">Compliance complete</span>
        <span className="text-subtle">· {done}/{items.length}</span>
      </div>
    );
  }

  // Gap → strip shouts + expands to show what's missing.
  return (
    <div className="rounded border border-status-late/25 bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs"
      >
        {open ? (
          <ChevronDownIcon className="size-3.5 text-subtle" />
        ) : (
          <ChevronRightIcon className="size-3.5 text-subtle" />
        )}
        <span className="size-1.5 rounded-full bg-status-late" />
        <span className="font-medium text-foreground">{missing} missing</span>
        <span className="text-subtle">· {done}/{items.length} done</span>
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
              owner={resp?.[item.ownerRole]}
              first={i === 0}
              onToggle={() => onToggle(item.key)}
            />
          ))}
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
  owner,
  first,
  onToggle,
}: {
  item: ChecklistItem;
  startDate: string;
  clock: Date;
  active: boolean;
  owner?: string;
  first: boolean;
  onToggle: () => void;
}) {
  const recurring = item.cadence !== "once";
  const done = itemDone(item, startDate, clock);
  const overdue = active && itemOverdue(item, startDate, clock);
  const dueISO = itemDueISO(item, startDate, clock);
  const dayN =
    recurring && (item.cadence === "monthly" || item.cadence === "quarterly")
      ? itemDueDay(item, startDate, clock)
      : null;
  const dayPrefix = dayN != null ? `Day ${dayN} · ` : "";
  const evidenceSmell = done && !recurring && item.needsEvidence && !item.evidence;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${first ? "" : "border-t border-border"}`}>
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
          <span>{owner ? `${owner} · ${ROLE_LABEL[item.ownerRole]}` : ROLE_LABEL[item.ownerRole]}</span>
          {recurring ? (
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
    </div>
  );
}

/* ── in flight (manual work items; client sees title + phase, no dates) ── */
function InFlightSection({
  engagementId,
  items,
  onChanged,
}: {
  engagementId: string;
  items: WorkItem[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<WorkPhase>("design");

  function commit() {
    if (!title.trim()) return;
    addWorkItem(engagementId, { id: newDocId(), title: title.trim(), phase });
    setTitle("");
    setPhase("design");
    setAdding(false);
    onChanged();
  }

  const ordered = items
    .slice()
    .sort((a, b) => WORK_PHASE_ORDER.indexOf(a.phase) - WORK_PHASE_ORDER.indexOf(b.phase));

  return (
    <div className="space-y-3">
      {ordered.length === 0 ? (
        <div className="rounded border border-border-faint bg-surface p-5 text-sm text-subtle">
          Nothing in flight yet. Add what the team&apos;s working on — the client
          sees the work and its phase, never dates.
        </div>
      ) : (
        <div className="divide-y divide-border rounded border border-border-faint bg-surface">
          {ordered.map((it) => (
            <div key={it.id} className="group flex items-center gap-3 px-4 py-3">
              <span className={`size-1.5 shrink-0 rounded-full ${WORK_PHASE_DOT[it.phase]}`} />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {it.title}
              </span>
              <select
                value={it.phase}
                onChange={(ev) => {
                  setWorkItemPhase(engagementId, it.id, ev.target.value as WorkPhase);
                  onChanged();
                }}
                className="rounded border border-border-faint bg-surface px-2 py-1 text-2xs text-muted focus:outline-none"
              >
                {WORK_PHASE_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {WORK_PHASE_LABEL[p]}
                  </option>
                ))}
              </select>
              <button
                data-admin
                onClick={() => {
                  removeWorkItem(engagementId, it.id);
                  onChanged();
                }}
                className="shrink-0 text-subtle opacity-0 transition-all hover:text-status-late group-hover:opacity-100"
                title="Remove"
              >
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div data-admin>
        {adding ? (
          <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-surface p-2">
            <input
              autoFocus
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") commit();
                if (ev.key === "Escape") setAdding(false);
              }}
              placeholder="What are we working on?"
              className="min-w-[160px] flex-1 bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-subtle focus:outline-none"
            />
            <select
              value={phase}
              onChange={(ev) => setPhase(ev.target.value as WorkPhase)}
              className="rounded border border-border-faint bg-surface px-2 py-1 text-2xs text-muted focus:outline-none"
            >
              {WORK_PHASE_ORDER.map((p) => (
                <option key={p} value={p}>
                  {WORK_PHASE_LABEL[p]}
                </option>
              ))}
            </select>
            <button
              onClick={commit}
              className="rounded bg-foreground px-2.5 py-1 text-2xs font-medium text-background transition-opacity hover:opacity-90"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
          >
            <PlusIcon className="size-3.5" />
            Add work item
          </button>
        )}
      </div>
    </div>
  );
}
const WORK_PHASE_DOT: Record<WorkPhase, string> = {
  strategy: "bg-subtle",
  design: "bg-status-approaching",
  development: "bg-[var(--ring,#5E6AD2)]",
  optimisation: "bg-status-ontrack",
};

/* ── results (manual banked wins; outcomes, never due-dates) ── */
const OUTCOME_STYLE: Record<ResultOutcome, string> = {
  winner: "text-status-ontrack",
  loser: "text-status-late",
  inconclusive: "text-subtle",
  shipped: "text-muted",
};
function ResultsSection({
  engagementId,
  results,
  onChanged,
}: {
  engagementId: string;
  results: BankedResult[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [metric, setMetric] = useState("");
  const [uplift, setUplift] = useState("");
  const [outcome, setOutcome] = useState<ResultOutcome>("winner");
  const [filter, setFilter] = useState<ResultOutcome | "all">("all");

  function commit() {
    if (!title.trim()) return;
    const raw = uplift.trim();
    const n = raw === "" ? undefined : Number(raw);
    addResult(engagementId, {
      id: newDocId(),
      title: title.trim(),
      hypothesis: hypothesis.trim() || undefined,
      metric: metric.trim() || undefined,
      upliftPct: n != null && Number.isFinite(n) ? n : undefined,
      outcome,
      date: new Date().toISOString().slice(0, 10),
    });
    setTitle("");
    setHypothesis("");
    setMetric("");
    setUplift("");
    setOutcome("winner");
    setAdding(false);
    onChanged();
  }

  const shown = filter === "all" ? results : results.filter((r) => r.outcome === filter);
  const outcomeFilters: (ResultOutcome | "all")[] = [
    "all",
    "winner",
    "loser",
    "inconclusive",
    "shipped",
  ];

  return (
    <div className="space-y-3">
      {results.length === 0 ? (
        <div className="rounded border border-border-faint bg-surface p-5 text-center">
          <ArrowTrendingUpIcon className="mx-auto size-6 text-subtle" />
          <p className="mt-2 text-sm text-subtle">No wins banked yet.</p>
          <p className="mt-0.5 text-2xs text-subtle/70">
            Bank a concluded test — hypothesis, outcome, and the headline uplift.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            {outcomeFilters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded border px-2 py-0.5 text-2xs capitalize transition-colors ${
                  filter === f
                    ? "border-border bg-surface-raised text-foreground"
                    : "border-border-faint text-muted hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : RESULT_OUTCOME_LABEL[f]}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <div className="rounded border border-border-faint bg-surface p-5 text-sm text-subtle">
              No {filter} results.
            </div>
          ) : (
            <div className="divide-y divide-border rounded border border-border-faint bg-surface">
              {shown.map((r) => (
                <div key={r.id} className="group flex items-start gap-3 px-4 py-3">
                  <span className={`w-16 shrink-0 pt-0.5 text-2xs font-medium ${OUTCOME_STYLE[r.outcome]}`}>
                    {RESULT_OUTCOME_LABEL[r.outcome]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground">{r.title}</div>
                    {r.hypothesis && (
                      <div className="mt-0.5 text-xs text-muted">{r.hypothesis}</div>
                    )}
                    <div className="mt-0.5 text-2xs text-subtle">
                      {r.metric ? `${r.metric} · ` : ""}
                      {fmtDate(r.date)}
                    </div>
                  </div>
                  {r.upliftPct != null && (
                    <span
                      className={`shrink-0 pt-0.5 text-sm font-semibold tabular-nums ${
                        r.upliftPct > 0
                          ? "text-status-ontrack"
                          : r.upliftPct < 0
                            ? "text-status-late"
                            : "text-subtle"
                      }`}
                    >
                      {r.upliftPct > 0 ? "+" : ""}
                      {r.upliftPct}%
                    </span>
                  )}
                  <button
                    data-admin
                    onClick={() => {
                      removeResult(engagementId, r.id);
                      onChanged();
                    }}
                    className="shrink-0 text-subtle opacity-0 transition-all hover:text-status-late group-hover:opacity-100"
                    title="Remove"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div data-admin>
      {adding ? (
        <div className="space-y-2 rounded border border-border bg-surface p-3">
          <input
            autoFocus
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") commit();
              if (ev.key === "Escape") setAdding(false);
            }}
            placeholder="What won? (e.g. Hero CTA copy test)"
            className="w-full rounded border border-border-faint bg-surface px-2.5 py-1.5 text-sm text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none"
          />
          <input
            value={hypothesis}
            onChange={(ev) => setHypothesis(ev.target.value)}
            placeholder="Hypothesis — what we believed + why (optional)"
            className="w-full rounded border border-border-faint bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={metric}
              onChange={(ev) => setMetric(ev.target.value)}
              placeholder="Metric (CVR)"
              className="w-24 rounded border border-border-faint bg-surface px-2 py-1 text-xs text-foreground placeholder:text-subtle focus:outline-none"
            />
            <input
              value={uplift}
              onChange={(ev) => setUplift(ev.target.value)}
              placeholder="Uplift %"
              inputMode="numeric"
              className="w-20 rounded border border-border-faint bg-surface px-2 py-1 text-xs text-foreground placeholder:text-subtle focus:outline-none"
            />
            <select
              value={outcome}
              onChange={(ev) => setOutcome(ev.target.value as ResultOutcome)}
              className="rounded border border-border-faint bg-surface px-2 py-1 text-xs text-muted focus:outline-none"
            >
              {(Object.keys(RESULT_OUTCOME_LABEL) as ResultOutcome[]).map((o) => (
                <option key={o} value={o}>
                  {RESULT_OUTCOME_LABEL[o]}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={() => setAdding(false)}
              className="rounded px-2.5 py-1 text-2xs text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={commit}
              className="rounded bg-foreground px-2.5 py-1 text-2xs font-medium text-background transition-opacity hover:opacity-90"
            >
              Bank result
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
        >
          <PlusIcon className="size-3.5" />
          Bank a result
        </button>
      )}
      </div>
    </div>
  );
}

/* ── documents (real PDF upload; billing lives in Xero) ── */
function newDocId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function fmtBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsSection({
  engagementId,
  docs,
  onChanged,
}: {
  engagementId: string;
  docs: ClientDoc[];
  onChanged: () => void;
}) {
  const user = useCurrentUser();
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (docs.length === 0) {
      setSigned({});
      return;
    }
    let cancelled = false;
    signDocumentPaths(docs.map((d) => d.path)).then((m) => {
      if (!cancelled) setSigned(m);
    });
    return () => {
      cancelled = true;
    };
  }, [docs]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    let failed = false;
    for (const file of Array.from(files)) {
      const path = await uploadClientDocument(file, engagementId);
      if (!path) {
        failed = true;
        continue;
      }
      addDocument(engagementId, {
        id: newDocId(),
        name: file.name,
        path,
        sizeBytes: file.size,
        kind: /invoice/i.test(file.name) ? "invoice" : "other",
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.name,
      });
    }
    setUploading(false);
    if (failed)
      setError("Upload failed. Check the 'client-documents' storage bucket exists in Supabase.");
    onChanged();
  }

  async function onRemove(doc: ClientDoc) {
    removeDocument(engagementId, doc.id);
    void deleteClientDocument(doc.path);
    onChanged();
  }

  const ordered = docs.slice().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  return (
    <div className="rounded border border-border-faint bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs font-medium text-foreground">Uploads</p>
          <p className="mt-0.5 text-2xs text-subtle">
            Invoices, agreements, decks. Billing itself lives in Xero.
          </p>
        </div>
        <button
          data-admin
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          <ArrowUpTrayIcon className="size-3.5" />
          {uploading ? "Uploading…" : "Upload PDF"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf,.doc,.docx,.xlsx,.png,.jpg"
          multiple
          className="hidden"
          onChange={(ev) => {
            void onFiles(ev.target.files);
            ev.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="mx-4 mb-3 rounded border border-status-late/30 bg-status-late/[0.06] px-3 py-2 text-2xs text-status-late">
          {error}
        </div>
      )}

      {ordered.length === 0 ? (
        <label
          data-admin
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={(ev) => {
            ev.preventDefault();
            void onFiles(ev.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          className="mx-4 mb-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded border border-dashed border-border-faint px-4 py-6 text-center transition-colors hover:border-border"
        >
          <DocumentTextIcon className="size-5 text-subtle" />
          <span className="text-2xs text-subtle">Drop a PDF or click to upload</span>
        </label>
      ) : (
        <div className="border-t border-border-faint">
          {ordered.map((doc, i) => (
            <div key={doc.id} className={`group flex items-center gap-3 px-4 py-3 ${i === 0 ? "" : "border-t border-border"}`}>
              <DocumentTextIcon className="size-4 shrink-0 text-subtle" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-foreground">{doc.name}</div>
                <div className="mt-0.5 text-2xs text-subtle">
                  {doc.kind === "invoice" ? "Invoice · " : ""}
                  {fmtDate(doc.uploadedAt)}
                  {doc.sizeBytes ? ` · ${fmtBytes(doc.sizeBytes)}` : ""}
                  {doc.uploadedBy ? ` · ${doc.uploadedBy}` : ""}
                </div>
              </div>
              {signed[doc.path] && (
                <a href={signed[doc.path]} target="_blank" rel="noopener noreferrer" className="shrink-0 text-subtle transition-colors hover:text-foreground" title="Open">
                  <ArrowTopRightOnSquareIcon className="size-4" />
                </a>
              )}
              <button data-admin onClick={() => void onRemove(doc)} className="shrink-0 text-subtle opacity-0 transition-all hover:text-status-late group-hover:opacity-100" title="Remove">
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
