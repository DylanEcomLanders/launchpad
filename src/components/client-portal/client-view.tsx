"use client";

/* ── Client portal view ──
 * The isolated, read-only client surface. Rendered by /client/[token] inside
 * the chrome-free (portal) layout — no navbar, no internal links, nothing that
 * traces back to the internal system.
 *
 * Four things, all client-safe: who they are, what we're working on (phase, no
 * dates), the wins (with hypothesis + outcome filter), and their documents.
 * No tokens, no compliance, no renewal, no invoices, no Xero. This component
 * never writes — it's presentation only.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import {
  WORK_PHASE_LABEL,
  WORK_PHASE_ORDER,
  RESULT_OUTCOME_LABEL,
  engagementTitle,
  type Client,
  type Engagement,
  type ResultOutcome,
  type WorkPhase,
} from "@/lib/command-centre/model";
import { signDocumentPaths } from "@/lib/command-centre/documents";

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function monthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

const WORK_PHASE_DOT: Record<WorkPhase, string> = {
  strategy: "bg-subtle",
  design: "bg-status-approaching",
  development: "bg-[color:var(--ring,#5E6AD2)]",
  optimisation: "bg-status-ontrack",
};
const OUTCOME_STYLE: Record<ResultOutcome, string> = {
  winner: "text-status-ontrack",
  loser: "text-status-late",
  inconclusive: "text-subtle",
  shipped: "text-muted",
};

type OutcomeFilter = ResultOutcome | "all";

export function ClientPortalView({
  engagement: e,
  client,
}: {
  engagement: Engagement;
  client: Client;
}) {
  const workItems = (e.workItems ?? [])
    .slice()
    .sort((a, b) => WORK_PHASE_ORDER.indexOf(a.phase) - WORK_PHASE_ORDER.indexOf(b.phase));

  const results = (e.results ?? [])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  // Client sees shared documents only — never invoices.
  const docs = (e.documents ?? []).filter((d) => d.kind !== "invoice");
  const [signed, setSigned] = useState<Record<string, string>>({});
  useEffect(() => {
    if (docs.length === 0) return;
    let cancelled = false;
    signDocumentPaths(docs.map((d) => d.path)).then((m) => {
      if (!cancelled) setSigned(m);
    });
    return () => {
      cancelled = true;
    };
  }, [docs]);

  const [filter, setFilter] = useState<OutcomeFilter>("all");
  const shownResults = useMemo(
    () => (filter === "all" ? results : results.filter((r) => r.outcome === filter)),
    [results, filter],
  );
  const outcomeFilters: OutcomeFilter[] = [
    "all",
    "winner",
    "loser",
    "inconclusive",
    "shipped",
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
      {/* brand strip — deliberately minimal, no nav */}
      <div className="mb-10 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Ecom Landers
        </span>
        <span className="text-2xs text-subtle">Client dashboard</span>
      </div>

      {/* header */}
      <header className="mb-10">
        <p className="text-3xs uppercase tracking-wider text-subtle">
          {engagementTitle(e)}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          {client.name}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Partnering since {monthYear(e.startDate)}
        </p>
      </header>

      <div className="space-y-10">
        {/* in flight */}
        <section>
          <h2 className="mb-3 text-3xs font-medium uppercase tracking-wider text-subtle">
            What we&apos;re working on
          </h2>
          {workItems.length === 0 ? (
            <div className="rounded border border-border-faint bg-surface p-5 text-sm text-subtle">
              Work in progress will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border rounded border border-border-faint bg-surface">
              {workItems.map((it) => (
                <div key={it.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`size-1.5 shrink-0 rounded-full ${WORK_PHASE_DOT[it.phase]}`} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {it.title}
                  </span>
                  <span className="shrink-0 rounded border border-border-faint px-2 py-0.5 text-2xs text-muted">
                    {WORK_PHASE_LABEL[it.phase]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* results */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xs font-medium uppercase tracking-wider text-subtle">
              Results
            </h2>
            {results.length > 0 && (
              <div className="flex flex-wrap gap-1">
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
                    {f === "all" ? "All" : RESULT_OUTCOME_LABEL[f as ResultOutcome]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <div className="rounded border border-border-faint bg-surface p-6 text-center">
              <ArrowTrendingUpIcon className="mx-auto size-6 text-subtle" />
              <p className="mt-2 text-sm text-subtle">
                Results will appear here as tests conclude.
              </p>
            </div>
          ) : shownResults.length === 0 ? (
            <div className="rounded border border-border-faint bg-surface p-5 text-sm text-subtle">
              No {filter} results.
            </div>
          ) : (
            <div className="divide-y divide-border rounded border border-border-faint bg-surface">
              {shownResults.map((r) => (
                <div key={r.id} className="flex items-start gap-3 px-4 py-3.5">
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
                      className={`shrink-0 pt-0.5 text-base font-semibold tabular-nums ${
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
                </div>
              ))}
            </div>
          )}
        </section>

        {/* documents */}
        <section>
          <h2 className="mb-3 text-3xs font-medium uppercase tracking-wider text-subtle">
            Documents
          </h2>
          {docs.length === 0 ? (
            <div className="rounded border border-border-faint bg-surface p-5 text-sm text-subtle">
              New documents will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border rounded border border-border-faint bg-surface">
              {docs
                .slice()
                .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
                .map((doc) => (
                  <a
                    key={doc.id}
                    href={signed[doc.path] || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-raised"
                  >
                    <DocumentTextIcon className="size-4 shrink-0 text-subtle" />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {doc.name}
                    </span>
                    {signed[doc.path] && (
                      <ArrowTopRightOnSquareIcon className="size-4 shrink-0 text-subtle" />
                    )}
                  </a>
                ))}
            </div>
          )}
        </section>
      </div>

      <footer className="mt-16 border-t border-border-faint pt-6 text-center text-2xs text-subtle">
        Ecom Landers · your growth partner
      </footer>
    </div>
  );
}
