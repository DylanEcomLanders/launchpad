"use client";

/* ── Production ──
 * The advertorial job queue + health. Three tiles, one jobs table, a review
 * slide-over. Internal-only: nothing here is client-facing, and no draft
 * leaves as "used" without a human in the slide-over. Primitives only.
 */

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import {
  ADVERTORIAL_KIT_VERSION,
  listJobs,
  markUsed,
  markBinned,
  type JobRow,
} from "@/lib/advertorial/store";
import {
  jobGlyphStatus,
  JOB_STATUS_LABEL,
  type JobStatus,
} from "@/lib/advertorial/types";

type Bucket = "all" | "needs_review" | "used" | "binned";

const BADGE_TONE: Record<JobStatus, "neutral" | "success" | "warning" | "danger"> = {
  queued: "neutral",
  generating: "neutral",
  qa: "neutral",
  draft_ready: "warning",
  used: "success",
  binned: "danger",
  failed: "danger",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function pct(n: number, d: number): string {
  if (d === 0) return "-";
  return `${Math.round((n / d) * 100)}%`;
}

export default function ProductionPage() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [clientId, setClientId] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  function refresh() { setRows(listJobs()); }
  useEffect(() => { refresh(); setHydrated(true); }, []);

  const clients = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) seen.set(r.client.id, r.client.name);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const tiles = useMemo(() => {
    const month = "2026-07";
    const draftsThisMonth = rows.filter((r) => r.job.createdAt.startsWith(month)).length;
    const reviewed = rows.filter((r) => r.job.status === "used" || r.job.status === "binned");
    const used = reviewed.filter((r) => r.job.status === "used").length;
    const kit = reviewed.filter((r) => r.job.kitVersion === ADVERTORIAL_KIT_VERSION);
    const kitBinned = kit.filter((r) => r.job.status === "binned").length;
    return {
      draftsThisMonth,
      usedRate: pct(used, reviewed.length),
      binRate: pct(kitBinned, kit.length),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (clientId !== "all" && r.client.id !== clientId) return false;
      if (bucket === "needs_review") return r.job.status === "draft_ready";
      if (bucket === "used") return r.job.status === "used";
      if (bucket === "binned") return r.job.status === "binned";
      return true;
    });
  }, [rows, bucket, clientId]);

  const open = openId ? rows.find((r) => r.job.id === openId) ?? null : null;

  return (
    <div className="px-6 pb-20 pt-8 md:px-10">
      <PageHeader
        title="Production"
        subtitle="Advertorial drafts. Nothing here reaches a client until a human marks it used."
      />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Drafts this month" value={hydrated ? String(tiles.draftsThisMonth) : "-"} />
        <StatTile label="Used rate" value={hydrated ? tiles.usedRate : "-"} context="of reviewed" />
        <StatTile label={`Bin rate · kit ${ADVERTORIAL_KIT_VERSION}`} value={hydrated ? tiles.binRate : "-"} context="this kit version" />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={bucket}
          onChange={(v) => setBucket(v as Bucket)}
          options={[
            { label: "All", value: "all" },
            { label: "Needs review", value: "needs_review" },
            { label: "Used", value: "used" },
            { label: "Binned", value: "binned" },
          ]}
        />
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="h-8 rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:border-ring"
        >
          <option value="all">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 overflow-x-auto">
        <Table>
          <THead>
            <TR>
              <TH>Client</TH>
              <TH>Task</TH>
              <TH>Status</TH>
              <TH>Kit</TH>
              <TH align="right">QA flags</TH>
              <TH>Created</TH>
              <TH>Reviewed by</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((r) => (
              <TR key={r.job.id} onClick={() => setOpenId(r.job.id)} className="cursor-pointer">
                <TD>{r.client.name}</TD>
                <TD className="text-muted">{r.task.title}</TD>
                <TD>
                  <span className="inline-flex items-center gap-2">
                    <StatusGlyph status={jobGlyphStatus(r.job.status)} />
                    <Badge tone={BADGE_TONE[r.job.status]}>{JOB_STATUS_LABEL[r.job.status]}</Badge>
                  </span>
                </TD>
                <TD className="tabular-nums text-muted">{r.job.kitVersion}</TD>
                <TD align="right" className="tabular-nums">
                  {r.job.qaFlagsCount > 0 ? r.job.qaFlagsCount : <span className="text-subtle">-</span>}
                </TD>
                <TD className="tabular-nums text-muted">{fmtDate(r.job.createdAt)}</TD>
                <TD className="text-muted">{r.job.reviewedBy ?? <span className="text-subtle">-</span>}</TD>
              </TR>
            ))}
            {hydrated && filtered.length === 0 && (
              <TR>
                <TD className="py-8 text-center text-sm text-subtle">No jobs match this filter.</TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>

      {open && (
        <ReviewSlideOver
          row={open}
          onClose={() => setOpenId(null)}
          onUsed={() => { markUsed(open.job.id); refresh(); setOpenId(null); }}
          onBinned={(reason) => { markBinned(open.job.id, reason); refresh(); setOpenId(null); }}
        />
      )}
    </div>
  );
}

function ReviewSlideOver({
  row,
  onClose,
  onUsed,
  onBinned,
}: {
  row: JobRow;
  onClose: () => void;
  onUsed: () => void;
  onBinned: (reason: string) => void;
}) {
  const { job, client } = row;
  const [binning, setBinning] = useState(false);
  const [reason, setReason] = useState("");
  const reviewable = job.status === "draft_ready";

  function download() {
    if (!job.draftHtml) return;
    const blob = new Blob([job.draftHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name.replace(/\s+/g, "-").toLowerCase()}-${job.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/70" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-background"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border-faint px-6 py-4">
          <div className="min-w-0">
            <p className="text-3xs font-semibold uppercase tracking-wider text-subtle">{client.name}</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-foreground">{row.task.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 text-subtle transition-colors hover:text-foreground">Close</button>
        </div>

        {/* AI-draft banner: monochrome */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border-faint bg-surface px-6 py-2.5 text-2xs text-subtle">
          <span className="font-semibold uppercase tracking-wider text-muted">AI draft · not client-ready</span>
          <span>kit {job.kitVersion}</span>
          <span>{job.model}</span>
          {job.startedAt && job.completedAt && (
            <span className="tabular-nums">
              {Math.max(1, Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000))}s
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Preview */}
          <div className="border-b border-border-faint p-4">
            {job.draftHtml ? (
              <iframe
                title="Advertorial draft"
                sandbox=""
                srcDoc={job.draftHtml}
                className="h-[52vh] w-full rounded border border-border bg-white"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded border border-border-faint text-sm text-subtle">
                {job.status === "generating" || job.status === "queued" || job.status === "qa"
                  ? "Generating…"
                  : job.status === "failed"
                    ? `Failed: ${job.error ?? "unknown error"}`
                    : "No draft."}
              </div>
            )}
          </div>

          {/* QA report */}
          {job.qaReport && (
            <div className="space-y-5 px-6 py-5">
              <div>
                <p className="mb-2 text-3xs font-semibold uppercase tracking-wider text-subtle">QA checklist</p>
                <ul className="space-y-1.5">
                  {job.qaReport.checklist.map((c, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className={c.ok ? "text-status-ontrack" : "text-status-late"}>{c.ok ? "✓" : "✕"}</span>
                      <span className={c.ok ? "text-muted" : "text-foreground"}>{c.item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {job.qaReport.compliance.violations.length > 0 && (
                <div>
                  <p className="mb-2 text-3xs font-semibold uppercase tracking-wider text-subtle">Compliance flags</p>
                  <ul className="space-y-2">
                    {job.qaReport.compliance.violations.map((v, i) => (
                      <li key={i} className="rounded border border-border-faint bg-surface p-3">
                        <div className="flex items-center gap-2 text-2xs">
                          <span className="text-status-late">✕</span>
                          <span className="font-medium text-foreground">{v.rule}</span>
                          <span className="text-subtle">· {v.location}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{v.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {job.qaReport.thinNotes.length > 0 && (
                <div>
                  <p className="mb-2 text-3xs font-semibold uppercase tracking-wider text-subtle">Where the brief was thin</p>
                  <ul className="space-y-1 text-xs text-muted">
                    {job.qaReport.thinNotes.map((n, i) => <li key={i}>· {n}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-border-faint px-6 py-4">
          {binning ? (
            <div className="space-y-2">
              <label className="text-2xs text-muted">Bin reason (feeds kit iteration)</label>
              <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this not usable?"
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring"
              />
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setBinning(false); setReason(""); }}>Cancel</Button>
                <Button variant="danger" size="sm" disabled={!reason.trim()} onClick={() => onBinned(reason.trim())}>Bin draft</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={download} disabled={!job.draftHtml}>Download HTML</Button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setBinning(true)} disabled={!reviewable}>Bin</Button>
                <Button variant="primary" size="sm" onClick={onUsed} disabled={!reviewable}>Mark used</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
