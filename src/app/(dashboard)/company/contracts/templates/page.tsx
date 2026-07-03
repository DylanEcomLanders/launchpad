"use client";

/* ── Master templates editor ──
 * /company/contracts/templates. Edit the NDA + Contract templates
 * used to spin up new agreements. Each agreement snapshots the
 * template at creation, so edits here only affect *future* agreements
 * - existing signed ones stay intact.
 *
 * Tab switcher between NDA + Contract. For each kind: title, intro,
 * outro (textareas), clauses list with add/edit/delete + an only_for
 * dropdown (none, employee, contractor) that gates the clause to one
 * employment type. Save updates the row.
 *
 * IMPORTANT: this is a legal document editor. There's a banner at the
 * top reminding Dylan to read the seeded clauses with a solicitor
 * before sending them. No validation on the text body itself - by
 * design.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { templateStore, getTemplatesForKind, uid, nowISO } from "@/lib/agreements/data";
import type { AgreementTemplate, Clause } from "@/lib/agreements/types";
import { TEMPLATE_ROLE_LABEL } from "@/lib/agreements/types";
import { inputClass, selectClass, textareaClass } from "@/lib/form-styles";

const fieldLabel = "block text-2xs uppercase tracking-wider text-subtle font-medium mb-2";

export default function TemplatesEditorPage() {
  /* Multi-template editor. Loads every contract template and shows a
   * top tab strip (Leadership / Designer / Developer / Custom). The
   * editor body below operates on whichever template is active. */
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    getTemplatesForKind("contract").then((all) => {
      setTemplates(all);
      setActiveId(all[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  const current = templates.find((t) => t.id === activeId) || null;
  const setCurrent = (next: AgreementTemplate | null) => {
    if (!next) return;
    setTemplates((prev) => prev.map((t) => (t.id === next.id ? next : t)));
  };

  function patchBody<K extends keyof AgreementTemplate["body"]>(
    field: K,
    value: AgreementTemplate["body"][K],
  ) {
    if (!current) return;
    setCurrent({ ...current, body: { ...current.body, [field]: value } });
    setDirty(true);
  }
  function patchRevision(value: string) {
    if (!current) return;
    setCurrent({ ...current, revision: value });
    setDirty(true);
  }
  function patchClause(idx: number, updates: Partial<Clause>) {
    if (!current) return;
    const next = [...current.body.clauses];
    next[idx] = { ...next[idx], ...updates };
    setCurrent({ ...current, body: { ...current.body, clauses: next } });
    setDirty(true);
  }
  function addClause() {
    if (!current) return;
    const next: Clause = {
      id: uid(),
      heading: "New clause",
      body: "Clause body...",
    };
    setCurrent({
      ...current,
      body: { ...current.body, clauses: [...current.body.clauses, next] },
    });
    setDirty(true);
  }
  function removeClause(idx: number) {
    if (!current) return;
    if (!confirm("Remove this clause?")) return;
    const next = current.body.clauses.filter((_, i) => i !== idx);
    setCurrent({ ...current, body: { ...current.body, clauses: next } });
    setDirty(true);
  }
  async function save() {
    if (!current || saving) return;
    setSaving(true);
    const now = nowISO();
    const updated = { ...current, updated_at: now };
    setCurrent(updated);
    await templateStore.update(current.id, {
      body: current.body,
      revision: current.revision,
      updated_at: now,
    });
    setSaving(false);
    setSavedAt(now);
    setDirty(false);
    setTimeout(() => setSavedAt(null), 2500);
  }

  if (loading || !current) {
    return (
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-12">
        <div className="text-sm text-subtle">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 pb-32 space-y-6">
      {/* Back */}
      <Link
        href="/company/contracts"
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        Back to contracts
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Agreement templates
        </h1>
        <p className="text-xs text-subtle mt-1 max-w-lg">
          Each role has its own template. Pick one below to edit. Edits apply to
          NEW agreements only - already-signed documents keep the clauses they
          were signed under.
        </p>
      </div>

      {/* Template tab strip - one tab per role. The active template
       * loads into the editor body below. Switching tabs preserves
       * unsaved edits on the current template since templates state
       * is held in React. */}
      <div className="flex flex-wrap gap-1.5">
        {templates.map((t) => {
          const active = activeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`inline-flex items-center gap-2 h-8 px-3 rounded border text-xs font-medium transition-colors ${
                active
                  ? "border-border bg-surface-raised text-foreground"
                  : "border-border bg-surface text-muted hover:bg-surface-raised hover:text-foreground"
              }`}
            >
              <span>{TEMPLATE_ROLE_LABEL[t.template_role]}</span>
              <span className="text-2xs font-mono text-subtle">{t.revision}</span>
            </button>
          );
        })}
      </div>

      {/* Legal disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 bg-surface-raised border border-border rounded text-xs text-muted">
        <ExclamationTriangleIcon className="size-4 shrink-0 mt-0.5 text-status-approaching" />
        <div>
          <strong className="text-foreground font-medium">Have a solicitor review the seeded clauses before using these
          for any real engagement.</strong>{" "}
          They&apos;re a sensible UK micro-agency starting point, not legal advice.
        </div>
      </div>

      {/* Document title + revision */}
      <div className="bg-surface border border-border-faint rounded p-5">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          <div>
            <label className={fieldLabel}>Document title</label>
            <input
              className={inputClass}
              value={current.body.title}
              onChange={(e) => patchBody("title", e.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabel}>Revision label</label>
            <input
              className={inputClass}
              value={current.revision}
              onChange={(e) => patchRevision(e.target.value)}
              placeholder="e.g. v1.1 - tightened IP"
            />
          </div>
        </div>

        {/* Intro */}
        <div className="mt-6 pt-6 border-t border-dashed border-border">
          <label className={fieldLabel}>Intro paragraph</label>
          <textarea
            className={`${textareaClass} min-h-[140px]`}
            value={current.body.intro}
            onChange={(e) => patchBody("intro", e.target.value)}
          />
          <PlaceholderHint />
        </div>
      </div>

      {/* Clauses */}
      <div className="bg-surface border border-border-faint rounded p-5">
        <div className="flex items-center justify-between mb-3">
          <label className={fieldLabel + " mb-0"}>Numbered clauses</label>
          <button
            onClick={addClause}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <PlusIcon className="size-3.5" /> Add clause
          </button>
        </div>
        <div className="space-y-3">
          {current.body.clauses.map((c, idx) => (
            <div
              key={c.id}
              className="bg-surface-raised border border-border rounded p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-2xs font-mono text-subtle mt-2 w-8 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <input
                  className={`${inputClass} flex-1 font-semibold`}
                  value={c.heading}
                  onChange={(e) => patchClause(idx, { heading: e.target.value })}
                />
                <select
                  className={`${selectClass} max-w-[160px]`}
                  value={c.only_for || ""}
                  onChange={(e) =>
                    patchClause(idx, {
                      only_for: (e.target.value || undefined) as Clause["only_for"],
                    })
                  }
                  title="Restrict this clause to one employment type"
                >
                  <option value="">Applies to both</option>
                  <option value="employee">Employees only</option>
                  <option value="contractor">Contractors only</option>
                </select>
                <button
                  onClick={() => removeClause(idx)}
                  className="p-2 text-subtle hover:text-status-late transition-colors"
                  aria-label="Remove clause"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
              <textarea
                className={`${textareaClass} min-h-[120px]`}
                value={c.body}
                onChange={(e) => patchClause(idx, { body: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Outro */}
      <div className="bg-surface border border-border-faint rounded p-5">
        <label className={fieldLabel}>Outro paragraph</label>
        <textarea
          className={`${textareaClass} min-h-[80px]`}
          value={current.body.outro}
          onChange={(e) => patchBody("outro", e.target.value)}
        />
      </div>

      {/* Save bar - sticks to the bottom of the viewport so long edits don't
          require scrolling back up to commit. */}
      <div className="fixed bottom-0 left-0 right-0 md:left-56 bg-background/95 backdrop-blur border-t border-border z-10">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between gap-4">
          <div className="text-xs text-subtle">
            {savedAt ? (
              <span className="inline-flex items-center gap-1.5 text-status-ontrack">
                <CheckIcon className="size-3.5" />
                Saved
              </span>
            ) : dirty ? (
              "Unsaved changes"
            ) : (
              "All changes saved"
            )}
          </div>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderHint() {
  return (
    <p className="text-2xs text-subtle mt-1.5 leading-relaxed">
      Use <code className="bg-surface-raised px-1 py-0.5 rounded">{"{{ placeholder }}"}</code>{" "}
      to inject person data. Available:{" "}
      <code className="bg-surface-raised px-1 py-0.5 rounded">person_full_name</code>,{" "}
      <code className="bg-surface-raised px-1 py-0.5 rounded">person_job_title</code>,{" "}
      <code className="bg-surface-raised px-1 py-0.5 rounded">person_employment_type</code>,{" "}
      <code className="bg-surface-raised px-1 py-0.5 rounded">start_date</code>,{" "}
      <code className="bg-surface-raised px-1 py-0.5 rounded">effective_date</code>,{" "}
      <code className="bg-surface-raised px-1 py-0.5 rounded">comp_amount</code>,{" "}
      <code className="bg-surface-raised px-1 py-0.5 rounded">comp_currency</code>,{" "}
      <code className="bg-surface-raised px-1 py-0.5 rounded">comp_frequency</code>.
    </p>
  );
}
