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
import { templateStore, ensureTemplate, uid, nowISO } from "@/lib/agreements/data";
import type { AgreementTemplate, Clause } from "@/lib/agreements/types";
import { inputClass, labelClass, selectClass, textareaClass } from "@/lib/form-styles";

export default function TemplatesEditorPage() {
  const [ctTpl, setCtTpl] = useState<AgreementTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    ensureTemplate("contract").then((c) => {
      setCtTpl(c);
      setLoading(false);
    });
  }, []);

  const current = ctTpl;
  const setCurrent = setCtTpl;

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
        <div className="text-sm text-[#71757D]">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 pb-32">
      {/* Back */}
      <Link
        href="/company/contracts"
        className="inline-flex items-center gap-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] transition-colors mb-6"
      >
        <ArrowLeftIcon className="size-4" />
        Back to contracts
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#E5E5EA]">
          Agreement templates
        </h1>
        <p className="text-[13px] text-[#71757D] mt-1 max-w-lg">
          Edits here apply to new agreements only. Already-signed documents keep
          the clauses they were signed under.
        </p>
      </div>

      {/* Legal disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 mb-6 bg-[#222222] border border-[#383838] rounded-lg text-[13px] text-[#E5E5EA]">
        <ExclamationTriangleIcon className="size-4 shrink-0 mt-0.5" />
        <div>
          <strong>Have a solicitor review the seeded clauses before using these
          for any real engagement.</strong>{" "}
          They&apos;re a sensible UK micro-agency starting point, not legal advice.
        </div>
      </div>

      {/* Document title + revision */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 mb-6">
        <div>
          <label className={labelClass}>Document title</label>
          <input
            className={inputClass}
            value={current.body.title}
            onChange={(e) => patchBody("title", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Revision label</label>
          <input
            className={inputClass}
            value={current.revision}
            onChange={(e) => patchRevision(e.target.value)}
            placeholder="e.g. v1.1 - tightened IP"
          />
        </div>
      </div>

      {/* Intro */}
      <div className="mb-6">
        <label className={labelClass}>Intro paragraph</label>
        <textarea
          className={`${textareaClass} min-h-[140px]`}
          value={current.body.intro}
          onChange={(e) => patchBody("intro", e.target.value)}
        />
        <PlaceholderHint />
      </div>

      {/* Clauses */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className={labelClass}>Numbered clauses</label>
          <button
            onClick={addClause}
            className="inline-flex items-center gap-1 text-[12px] text-[#E5E5EA] hover:underline"
          >
            <PlusIcon className="size-3.5" /> Add clause
          </button>
        </div>
        <div className="space-y-3">
          {current.body.clauses.map((c, idx) => (
            <div
              key={c.id}
              className="bg-[#181818] border border-[#2A2A2A] rounded-lg p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-[11px] font-mono text-[#71757D] mt-2 w-8 shrink-0">
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
                  className="p-2 text-[#71757D] hover:text-[#B22B2B] transition-colors"
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
      <div className="mb-8">
        <label className={labelClass}>Outro paragraph</label>
        <textarea
          className={`${textareaClass} min-h-[80px]`}
          value={current.body.outro}
          onChange={(e) => patchBody("outro", e.target.value)}
        />
      </div>

      {/* Save bar — sticks to the bottom of the viewport so long edits don't
          require scrolling back up to commit. */}
      <div className="fixed bottom-0 left-0 right-0 md:left-56 bg-[#181818]/95 backdrop-blur border-t border-[#2A2A2A] z-10">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between gap-4">
          <div className="text-[12px] text-[#71757D]">
            {savedAt ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600">
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
            className="px-4 py-2 bg-white text-[#0C0C0C] text-sm font-medium rounded-lg hover:bg-[#F3F4F6] transition-colors disabled:opacity-40"
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
    <p className="text-[11px] text-[#71757D] mt-1.5 leading-relaxed">
      Use <code className="bg-[#222222] px-1 py-0.5 rounded">{"{{ placeholder }}"}</code>{" "}
      to inject person data. Available:{" "}
      <code className="bg-[#222222] px-1 py-0.5 rounded">person_full_name</code>,{" "}
      <code className="bg-[#222222] px-1 py-0.5 rounded">person_job_title</code>,{" "}
      <code className="bg-[#222222] px-1 py-0.5 rounded">person_employment_type</code>,{" "}
      <code className="bg-[#222222] px-1 py-0.5 rounded">start_date</code>,{" "}
      <code className="bg-[#222222] px-1 py-0.5 rounded">effective_date</code>,{" "}
      <code className="bg-[#222222] px-1 py-0.5 rounded">comp_amount</code>,{" "}
      <code className="bg-[#222222] px-1 py-0.5 rounded">comp_currency</code>,{" "}
      <code className="bg-[#222222] px-1 py-0.5 rounded">comp_frequency</code>.
    </p>
  );
}
