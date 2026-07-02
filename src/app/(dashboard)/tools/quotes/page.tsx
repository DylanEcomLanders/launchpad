"use client";

// Quote tool — compose a quote with free-form line items and generate a
// tokened public HTML page (/quote/<token>) for the client to view.
// Standalone from the older /tools/proposals tier-link system.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/components/auth-gate";
import {
  listQuotes,
  createQuote,
  trashQuote,
  restoreQuote,
  deleteQuote,
} from "@/lib/quotes/data";
import {
  quoteTotals,
  formatGBP,
  DEFAULT_INCLUDES,
  type Quote,
  type QuoteLine,
  type LineCadence,
} from "@/lib/quotes/types";

function lineId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const blankLine = (): QuoteLine => ({
  id: lineId(),
  description: "",
  detail: "",
  qty: 1,
  unitPrice: 0,
  cadence: "one_off",
});

export default function QuotesPage() {
  const me = useCurrentUser();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"active" | "trash">("active");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Builder state
  const [building, setBuilding] = useState(false);
  const [clientName, setClientName] = useState("");
  const [intro, setIntro] = useState("");
  const [includes, setIncludes] = useState<string[]>([...DEFAULT_INCLUDES]);
  const [footnote, setFootnote] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([blankLine()]);
  const [saving, setSaving] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setQuotes(await listQuotes());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totals = useMemo(() => quoteTotals(lines), [lines]);

  const shown = quotes.filter((q) =>
    view === "trash" ? !!q.trashed_at : !q.trashed_at,
  );
  const trashCount = quotes.filter((q) => !!q.trashed_at).length;

  function updateLine(id: string, patch: Partial<QuoteLine>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, blankLine()]);
  }
  function removeLine(id: string) {
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));
  }

  function resetBuilder() {
    setClientName("");
    setIntro("");
    setIncludes([...DEFAULT_INCLUDES]);
    setFootnote("");
    setLines([blankLine()]);
    setError(null);
    setBuilding(false);
  }

  async function generate() {
    setError(null);
    if (!clientName.trim()) {
      setError("Add a client name first.");
      return;
    }
    const validLines = lines.filter((l) => l.description.trim());
    if (validLines.length === 0) {
      setError("Add at least one line item with a description.");
      return;
    }
    setSaving(true);
    setNewLink(null);
    try {
      const quote = await createQuote({
        clientName: clientName.trim(),
        intro: intro.trim() || undefined,
        includes: includes.map((s) => s.trim()).filter(Boolean),
        footnote: footnote.trim() || undefined,
        lines: validLines.map((l) => ({ ...l, detail: l.detail?.trim() || undefined })),
        preparedBy: me?.name,
      });
      if (quote) {
        setNewLink(`${window.location.origin}/quote/${quote.token}`);
        resetBuilder();
        refresh();
      } else {
        setError("Couldn't generate the link just now. Give it a second and try again.");
      }
    } catch {
      setError("Couldn't generate the link just now. Give it a second and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(link: string, id: string) {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">
          Acquisition
        </p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold text-foreground">
          Quotes
        </h1>
        <p className="mt-1 text-sm text-muted">
          Build a quote and send the client a clean link to view it. No PDF.
        </p>
      </div>

      {/* New-link banner */}
      {newLink && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/20 px-4 py-3">
          <span className="flex-1 truncate text-xs text-emerald-800">{newLink}</span>
          <button
            onClick={() => copyLink(newLink, "new")}
            className="shrink-0 text-xs font-medium text-emerald-700 hover:text-emerald-900"
          >
            {copiedId === "new" ? "Copied" : "Copy link"}
          </button>
        </div>
      )}

      {/* Builder */}
      {building ? (
        <div className="mb-8 rounded-2xl border border-border/80 bg-surface p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted">
              New quote
            </h2>
            <button
              onClick={resetBuilder}
              className="text-xs text-subtle hover:text-muted"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <Field label="Client name">
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Harvestory"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-border"
              />
            </Field>
            <Field label="Intro (optional)">
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={2}
                placeholder="A line or two setting up the quote."
                className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-border"
              />
            </Field>

            {/* Line items */}
            <div>
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-subtle">
                Line items
              </span>
              <div className="space-y-3">
                {lines.map((l) => (
                  <div key={l.id} className="rounded-lg border border-border p-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={l.description}
                        onChange={(e) => updateLine(l.id, { description: e.target.value })}
                        placeholder="Item (e.g. PDP redesign)"
                        className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-border"
                      />
                      <input
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })}
                        className="w-14 rounded-lg border border-border px-2 py-2 text-center text-sm tabular-nums outline-none focus:border-border"
                        title="Qty"
                      />
                      <div className="flex items-center rounded-lg border border-border">
                        <span className="pl-2 text-sm text-subtle">£</span>
                        <input
                          type="number"
                          min={0}
                          value={l.unitPrice}
                          onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) })}
                          className="w-20 px-1.5 py-2 text-right text-sm tabular-nums outline-none"
                          title="Unit price"
                        />
                      </div>
                      <select
                        value={l.cadence}
                        onChange={(e) => updateLine(l.id, { cadence: e.target.value as LineCadence })}
                        className="rounded-lg border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-border"
                      >
                        <option value="one_off">One-off</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      <button
                        onClick={() => removeLine(l.id)}
                        disabled={lines.length === 1}
                        className="px-1 text-border hover:text-rose-500 disabled:opacity-30"
                        title="Remove line"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      value={l.detail ?? ""}
                      onChange={(e) => updateLine(l.id, { detail: e.target.value })}
                      placeholder="What this delivers (optional — shown under the item)"
                      className="mt-2 w-full rounded-lg border border-border bg-surface-raised/50 px-3 py-1.5 text-xs outline-none focus:border-border"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={addLine}
                className="mt-2 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-subtle hover:border-border hover:text-muted"
              >
                + Add line
              </button>
            </div>

            {/* Live totals */}
            <div className="rounded-lg bg-surface-raised px-4 py-3">
              {totals.oneOff > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">One-off</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatGBP(totals.oneOff)}
                  </span>
                </div>
              )}
              {totals.monthly > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Monthly</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatGBP(totals.monthly)}/mo
                  </span>
                </div>
              )}
              {totals.oneOff === 0 && totals.monthly === 0 && (
                <span className="text-xs text-subtle">Add line items to see totals.</span>
              )}
            </div>

            <Field label="What's included (pre-filled — edit if you like)">
              <div className="space-y-2">
                {includes.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={item}
                      onChange={(e) =>
                        setIncludes((prev) =>
                          prev.map((v, idx) => (idx === i ? e.target.value : v)),
                        )
                      }
                      placeholder="e.g. 30 days of support post-launch"
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setIncludes((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 rounded-lg px-2 py-1 text-sm text-subtle hover:bg-surface-raised hover:text-muted"
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setIncludes((prev) => [...prev, ""])}
                  className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted hover:border-slate-400 hover:text-muted"
                >
                  + Add item
                </button>
              </div>
            </Field>

            <Field label="Footnote / terms (optional)">
              <textarea
                value={footnote}
                onChange={(e) => setFootnote(e.target.value)}
                rows={2}
                placeholder="Terms, validity, payment schedule."
                className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-border"
              />
            </Field>

            <div className="flex items-center gap-3">
              <button
                disabled={saving}
                onClick={generate}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Generating…" : "Generate quote link"}
              </button>
              {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setBuilding(true)}
          className="mb-8 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + New quote
        </button>
      )}

      {/* List */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {(["active", "trash"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                view === v ? "bg-white text-background" : "text-muted hover:text-foreground"
              }`}
            >
              {v}
              {v === "trash" && trashCount > 0 ? ` (${trashCount})` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-subtle">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-subtle">
            {view === "trash" ? "Trash is empty." : "No quotes yet."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {shown.map((q) => {
              const t = quoteTotals(q.data.lines);
              const link = `${window.location.origin}/quote/${q.token}`;
              return (
                <div key={q.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {q.data.clientName}
                      </span>
                      {q.viewed_at && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Viewed
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-subtle">
                      {fmtDate(q.created_at)} ·{" "}
                      {t.oneOff > 0 && formatGBP(t.oneOff)}
                      {t.oneOff > 0 && t.monthly > 0 && " + "}
                      {t.monthly > 0 && `${formatGBP(t.monthly)}/mo`}
                      {t.oneOff === 0 && t.monthly === 0 && "—"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {view === "active" ? (
                      <>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-muted hover:text-foreground"
                        >
                          View
                        </a>
                        <button
                          onClick={() => copyLink(link, q.id)}
                          className="text-xs font-medium text-muted hover:text-foreground"
                        >
                          {copiedId === q.id ? "Copied" : "Copy"}
                        </button>
                        <button
                          onClick={async () => {
                            await trashQuote(q.id);
                            refresh();
                          }}
                          className="text-xs text-border hover:text-rose-500"
                        >
                          Trash
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={async () => {
                            await restoreQuote(q.id);
                            refresh();
                          }}
                          className="text-xs font-medium text-muted hover:text-foreground"
                        >
                          Restore
                        </button>
                        <button
                          onClick={async () => {
                            await deleteQuote(q.id);
                            refresh();
                          }}
                          className="text-xs text-rose-400 hover:text-rose-600"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}
