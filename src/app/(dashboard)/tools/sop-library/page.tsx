"use client";

/* ── SOP Library ──
 * A team-editable runbook, not a doc dump. Mono-numbered, searchable,
 * categorised. Click an SOP → a right slide-out with its video (Loom or file)
 * and directional steps. Add / edit in-app. Store: Supabase + localStorage
 * fallback (createStore), so it's shared once the `sops` table exists and works
 * locally until then.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlayCircleIcon,
  PhotoIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { Table, THead, TBody, TR, TH, TD, Num } from "@/components/ui";
import { getSOPs, createSOP, updateSOP, deleteSOP } from "@/lib/sop/data";
import { uploadSopImage } from "@/lib/sop/images";
import {
  SOP_CATEGORIES,
  type SOP,
  type SOPStep,
  type SOPCategory,
} from "@/lib/sop/types";
import { isLoomUrl, toLoomEmbed, isVideoFileUrl } from "@/lib/portal/loom";

function categoryConfig(cat: SOPCategory) {
  return SOP_CATEGORIES.find((c) => c.key === cat) || SOP_CATEGORIES[0];
}

/* Light markdown → HTML so freeform text (step bodies, notes, legacy content)
 * reads as formatted copy, not raw ## / ** / - characters. Escapes HTML first
 * (admin-authored, but no reason to allow raw tags). */
function renderMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/^###?\s+(.+)$/gm, '<span class="mt-2 mb-1 block text-2xs font-semibold uppercase tracking-wider text-subtle">$1</span>')
    .replace(/^#\s+(.+)$/gm, '<span class="mt-2 mb-1 block text-sm font-semibold text-foreground">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-surface-raised px-1 py-0.5 font-mono text-[12px]">$1</code>')
    .replace(/^\s*[-*]\s+(.+)$/gm, '<span class="flex gap-2"><span class="text-subtle">•</span><span>$1</span></span>')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<span class="flex gap-2"><span class="text-subtle">›</span><span>$1</span></span>')
    .replace(/\n{2,}/g, '<span class="block h-2"></span>')
    .replace(/\n/g, "<br/>");
}
/* Split a legacy markdown blob into heading-delimited blocks so old SOPs (one
 * big `content` string, no structured steps) render as separate boxes too, not
 * one wall. Each `#`/`##`/`###` heading starts a new block. */
function contentToBlocks(md: string): { heading: string; body: string }[] {
  const blocks: { heading: string; body: string }[] = [];
  let current: { heading: string; body: string } | null = null;
  for (const line of md.split("\n")) {
    const h = line.match(/^#{1,3}\s+(.+?)\s*$/);
    if (h) {
      if (current) blocks.push(current);
      current = { heading: h[1].trim(), body: "" };
    } else {
      if (!current) current = { heading: "", body: "" };
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) blocks.push(current);
  return blocks
    .map((b) => ({ heading: b.heading, body: b.body.trim() }))
    .filter((b) => b.heading || b.body);
}
function fmtNum(n: number | undefined): string {
  return `#${String(n ?? 0).padStart(3, "0")}`;
}
function newStep(): SOPStep {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    body: "",
  };
}

/* Render a Loom embed or a direct video file. */
function VideoEmbed({ url }: { url: string }) {
  if (isLoomUrl(url)) {
    const embed = toLoomEmbed(url);
    if (!embed) return null;
    return (
      <div className="overflow-hidden rounded border border-border">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={embed}
            className="absolute inset-0 h-full w-full border-0"
            allowFullScreen
          />
        </div>
      </div>
    );
  }
  if (isVideoFileUrl(url)) {
    return (
      <video
        src={url}
        controls
        className="w-full rounded border border-border bg-black"
      />
    );
  }
  return null;
}

export default function SOPLibraryPage() {
  const role = useRole();
  const isAdmin = role === "admin";
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SOPCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState<SOPCategory>("operations");
  const [formTags, setFormTags] = useState("");
  const [formVideo, setFormVideo] = useState("");
  const [formSteps, setFormSteps] = useState<SOPStep[]>([]);
  const [formExit, setFormExit] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDraft, setFormDraft] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getSOPs();
    data.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    setSOPs(data);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = sops;
    if (!isAdmin) result = result.filter((s) => !s.draft);
    if (categoryFilter !== "all")
      result = result.filter((s) => s.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          fmtNum(s.number).includes(q) ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          (s.steps ?? []).some(
            (st) =>
              st.title.toLowerCase().includes(q) ||
              st.body.toLowerCase().includes(q),
          ) ||
          s.content.toLowerCase().includes(q),
      );
    }
    return result;
  }, [sops, categoryFilter, search, isAdmin]);

  const selected = selectedId ? sops.find((s) => s.id === selectedId) : null;

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormCategory("operations");
    setFormTags("");
    setFormVideo("");
    setFormSteps([newStep()]);
    setFormExit("");
    setFormNotes("");
    setFormDraft(true);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
    setSelectedId(null);
  };

  const openEdit = (sop: SOP) => {
    setFormTitle(sop.title);
    setFormDesc(sop.description);
    setFormCategory(sop.category);
    setFormTags(sop.tags.join(", "));
    setFormVideo(sop.loomUrl || "");
    setFormSteps(sop.steps && sop.steps.length ? sop.steps : [newStep()]);
    setFormExit((sop.exitCriteria ?? []).join("\n"));
    setFormNotes(sop.content || "");
    setFormDraft(sop.draft ?? false);
    setEditingId(sop.id);
    setShowForm(true);
    setSelectedId(null);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    const now = new Date().toISOString();
    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const steps = formSteps.filter((s) => s.title.trim() || s.body.trim());
    const exitCriteria = formExit
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (editingId) {
      await updateSOP(editingId, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCategory,
        tags,
        loomUrl: formVideo.trim() || undefined,
        steps,
        exitCriteria,
        content: formNotes,
        draft: formDraft,
        updated_at: now,
      });
    } else {
      const nextNumber =
        Math.max(0, ...sops.map((s) => s.number ?? 0)) + 1;
      const sop: SOP = {
        id: crypto.randomUUID(),
        number: nextNumber,
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCategory,
        tags,
        loomUrl: formVideo.trim() || undefined,
        steps,
        exitCriteria,
        content: formNotes,
        draft: formDraft,
        createdBy: role,
        created_at: now,
        updated_at: now,
      };
      await createSOP(sop);
    }
    resetForm();
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    await deleteSOP(id);
    setConfirmDelete(null);
    if (selectedId === id) setSelectedId(null);
    load();
  };

  // ── step editor helpers ──
  const addStep = () => setFormSteps((s) => [...s, newStep()]);
  const updateStep = (id: string, patch: Partial<SOPStep>) =>
    setFormSteps((s) => s.map((st) => (st.id === id ? { ...st, ...patch } : st)));
  const removeStep = (id: string) =>
    setFormSteps((s) => (s.length > 1 ? s.filter((st) => st.id !== id) : s));
  const moveStep = (id: string, dir: -1 | 1) =>
    setFormSteps((s) => {
      const i = s.findIndex((st) => st.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="px-6 pb-20 pt-10 md:px-10">
      {/* ── header + controls: left = identity, right = search + filters ── */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="shrink-0">
          <h1 className="text-xl font-semibold text-foreground">SOP Library</h1>
          <p className="mt-1 text-xs text-subtle">
            {sops.length} process{sops.length !== 1 ? "es" : ""} documented
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SOPs, steps, #number…"
                className="w-full rounded border border-border-faint bg-surface py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none"
              />
            </div>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="inline-flex shrink-0 items-center gap-1.5 rounded bg-foreground px-3 py-2 text-xs font-medium text-background transition-opacity hover:opacity-90"
              >
                <PlusIcon className="size-3.5" />
                New SOP
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 lg:justify-end">
            <FilterChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>
              All
            </FilterChip>
            {SOP_CATEGORIES.map((c) => (
              <FilterChip
                key={c.key}
                active={categoryFilter === c.key}
                onClick={() => setCategoryFilter(c.key)}
              >
                {c.label}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-subtle">Loading…</p>
      ) : (
        <div className="space-y-7">
          {SOP_CATEGORIES.filter(
            (c) => categoryFilter === "all" || c.key === categoryFilter,
          ).map((cat) => {
            const rows = filtered.filter((s) => s.category === cat.key);
            return (
              <section key={cat.key}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-2xs uppercase tracking-wider text-muted">
                    {cat.label}
                  </span>
                  <span className="font-mono text-2xs tabular-nums text-subtle">
                    {rows.length}
                  </span>
                </div>
                {rows.length === 0 ? (
                  <div className="rounded border border-dashed border-border-faint px-4 py-4 text-xs text-subtle">
                    {search.trim()
                      ? "No matches."
                      : `No ${cat.label} SOPs yet.`}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded border border-border-faint">
                    <Table>
                      <THead>
                        <TR hover={false}>
                          <TH className="w-16">#</TH>
                          <TH>Title</TH>
                          <TH>Status</TH>
                          <TH align="right">Steps</TH>
                          <TH>Video</TH>
                          <TH align="right">Updated</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {rows.map((sop) => (
                          <TR
                            key={sop.id}
                            className="cursor-pointer"
                            role="link"
                            tabIndex={0}
                            onClick={() => setSelectedId(sop.id)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && setSelectedId(sop.id)
                            }
                          >
                            <TD className="font-mono tabular-nums text-subtle">
                              {fmtNum(sop.number)}
                            </TD>
                            <TD>
                              <span className="font-medium text-foreground">
                                {sop.title}
                              </span>
                              {sop.description && (
                                <span className="mt-0.5 block max-w-md truncate text-xs text-subtle">
                                  {sop.description}
                                </span>
                              )}
                            </TD>
                            <TD>
                              {sop.draft ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-status-approaching">
                                  <span className="size-1.5 rounded-full bg-status-approaching" />
                                  Draft
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                                  <span className="size-1.5 rounded-full bg-status-ontrack" />
                                  Published
                                </span>
                              )}
                            </TD>
                            <TD align="right">
                              <Num className="text-muted">
                                {sop.steps?.length ?? 0}
                              </Num>
                            </TD>
                            <TD className="text-muted">
                              {sop.loomUrl ? (
                                <span className="inline-flex items-center gap-1">
                                  <PlayCircleIcon className="size-3.5" />
                                  Yes
                                </span>
                              ) : (
                                <span className="text-subtle">—</span>
                              )}
                            </TD>
                            <TD align="right">
                              <Num className="text-subtle">
                                {new Date(sop.updated_at).toLocaleDateString(
                                  "en-GB",
                                  { day: "numeric", month: "short" },
                                )}
                              </Num>
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ── detail slide-out ── */}
      {selected && (
        <Drawer onClose={() => setSelectedId(null)}>
          <SopDetail
            sop={selected}
            isAdmin={isAdmin}
            confirmDelete={confirmDelete === selected.id}
            onEdit={() => openEdit(selected)}
            onDelete={() => handleDelete(selected.id)}
            onTogglePublish={async () => {
              await updateSOP(selected.id, {
                draft: !selected.draft,
                updated_at: new Date().toISOString(),
              });
              load();
            }}
          />
        </Drawer>
      )}

      {/* ── create / edit slide-out ── */}
      {showForm && (
        <Drawer
          onClose={() => {
            setShowForm(false);
            resetForm();
          }}
        >
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-mono text-sm text-subtle">
                {editingId
                  ? fmtNum(sops.find((s) => s.id === editingId)?.number)
                  : fmtNum(Math.max(0, ...sops.map((s) => s.number ?? 0)) + 1)}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-subtle transition-colors hover:text-foreground"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Title">
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="How to…"
                  className={fieldCls}
                />
              </Field>
              <Field label="Summary">
                <input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="One line on what this covers"
                  className={fieldCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as SOPCategory)}
                    className={fieldCls}
                  >
                    {SOP_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tags (comma-separated)">
                  <input
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="portal, setup"
                    className={fieldCls}
                  />
                </Field>
              </div>
              <Field label="Video — Loom link or file URL (optional)">
                <input
                  value={formVideo}
                  onChange={(e) => setFormVideo(e.target.value)}
                  placeholder="https://loom.com/share/… or https://…/clip.mp4"
                  className={fieldCls}
                />
                {formVideo && (isLoomUrl(formVideo) || isVideoFileUrl(formVideo)) && (
                  <div className="mt-2">
                    <VideoEmbed url={formVideo} />
                  </div>
                )}
              </Field>

              {/* steps editor */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-3xs uppercase tracking-wider text-subtle">
                    Steps
                  </span>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
                  >
                    <PlusIcon className="size-3.5" /> Add step
                  </button>
                </div>
                <div className="space-y-2">
                  {formSteps.map((st, i) => (
                    <div
                      key={st.id}
                      className="rounded border border-border-faint bg-surface p-3"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-subtle">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <input
                          value={st.title}
                          onChange={(e) =>
                            updateStep(st.id, { title: e.target.value })
                          }
                          placeholder="Step title"
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-subtle focus:outline-none"
                        />
                        <button
                          onClick={() => moveStep(st.id, -1)}
                          disabled={i === 0}
                          className="text-subtle transition-colors hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUpIcon className="size-3.5" />
                        </button>
                        <button
                          onClick={() => moveStep(st.id, 1)}
                          disabled={i === formSteps.length - 1}
                          className="text-subtle transition-colors hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDownIcon className="size-3.5" />
                        </button>
                        <button
                          onClick={() => removeStep(st.id)}
                          className="text-subtle transition-colors hover:text-status-late"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                      <textarea
                        value={st.body}
                        onChange={(e) => updateStep(st.id, { body: e.target.value })}
                        placeholder="What to do, in plain, directional language."
                        rows={2}
                        className="w-full resize-y rounded border border-border-faint bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        {st.image ? (
                          <>
                            <img
                              src={st.image}
                              alt=""
                              className="h-12 rounded border border-border-faint"
                            />
                            <button
                              onClick={() => updateStep(st.id, { image: undefined })}
                              className="text-2xs text-subtle transition-colors hover:text-status-late"
                            >
                              Remove image
                            </button>
                          </>
                        ) : (
                          <label className="inline-flex cursor-pointer items-center gap-1.5 text-2xs text-muted transition-colors hover:text-foreground">
                            <PhotoIcon className="size-3.5" />
                            Attach image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (!file) return;
                                const url = await uploadSopImage(
                                  file,
                                  editingId ?? "new",
                                );
                                if (url) updateStep(st.id, { image: url });
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Field label="Done when — one check per line (optional)">
                <textarea
                  value={formExit}
                  onChange={(e) => setFormExit(e.target.value)}
                  rows={3}
                  placeholder={"Agreement reads Active\nAccess logged in the client record\nDelivery board live"}
                  className={fieldCls + " resize-y"}
                />
              </Field>

              <Field label="Notes (optional)">
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything that doesn't fit a step — context, gotchas, links."
                  className={fieldCls + " resize-y"}
                />
              </Field>

              <div className="flex items-center gap-3 border-t border-border-faint pt-4">
                <button
                  onClick={handleSave}
                  disabled={!formTitle.trim()}
                  className="rounded bg-foreground px-4 py-2 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-30"
                >
                  {formDraft
                    ? editingId
                      ? "Save draft"
                      : "Create as draft"
                    : editingId
                      ? "Save & publish"
                      : "Create & publish"}
                </button>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={!formDraft}
                    onChange={(e) => setFormDraft(!e.target.checked)}
                    className="size-3.5"
                  />
                  Publish immediately
                </label>
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}

/* ── pieces ── */

const fieldCls =
  "w-full rounded border border-border-faint bg-surface px-2.5 py-1.5 text-sm text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-3xs uppercase tracking-wider text-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded border px-3 py-1 font-mono text-2xs uppercase tracking-wider transition-colors ${
        active
          ? "border-border bg-surface-raised text-foreground"
          : "border-border-faint text-subtle hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Drawer({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* A major section in the detail view: a mono label, a hairline rule above it
 * (except the first), and generous space. No boxes. */
function Section({
  title,
  first,
  children,
}: {
  title: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        first
          ? "mt-8"
          : "mt-8 border-t border-border-faint pt-8"
      }
    >
      <p className="mb-5 font-mono text-3xs uppercase tracking-wider text-subtle">
        {title}
      </p>
      {children}
    </section>
  );
}

/* One step: number, title, body, and a "Visual guide" tab that reveals the
 * screenshot inline (click to enlarge). Hairline-separated from the next. */
function StepRow({
  index,
  step,
  onZoom,
}: {
  index: number;
  step: SOPStep;
  onZoom: (url: string) => void;
}) {
  const [showGuide, setShowGuide] = useState(false);
  return (
    <div className="border-t border-border-faint py-7 first:border-t-0">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm tabular-nums text-subtle">
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          {step.title && (
            <p className="text-base font-semibold text-foreground">
              {step.title}
            </p>
          )}
          {step.body && (
            <div
              className="mt-1.5 text-sm leading-relaxed tracking-normal text-foreground/85"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(step.body) }}
            />
          )}
          {step.image && (
            <div className="mt-3">
              <button
                onClick={() => setShowGuide((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded border border-border-faint px-2.5 py-1 text-xs text-muted transition-colors hover:border-border hover:text-foreground"
              >
                <PhotoIcon className="size-3.5" />
                {showGuide ? "Hide visual guide" : "Visual guide"}
              </button>
              {showGuide && (
                <button
                  onClick={() => onZoom(step.image!)}
                  className="mt-3 block overflow-hidden rounded border border-border-faint transition-opacity hover:opacity-90"
                  title="Click to enlarge"
                >
                  <img src={step.image} alt="" className="max-h-64 w-auto" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SopDetail({
  sop,
  isAdmin,
  confirmDelete,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  sop: SOP;
  isAdmin: boolean;
  confirmDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}) {
  const cat = categoryConfig(sop.category);
  const steps = sop.steps ?? [];
  const [lightbox, setLightbox] = useState<string | null>(null);
  const exit = sop.exitCriteria ?? [];
  return (
    <>
    <div className="p-8">
      {/* Header — number · category, then a big clear title + tight summary */}
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-sm tabular-nums text-subtle">
          {fmtNum(sop.number)}
        </span>
        <span className="font-mono text-2xs uppercase tracking-wider text-muted">
          {cat.label}
        </span>
        {sop.draft && (
          <span className="inline-flex items-center gap-1.5 text-2xs text-status-approaching">
            <span className="size-1.5 rounded-full bg-status-approaching" />
            Draft
          </span>
        )}
      </div>
      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foreground">
        {sop.title}
      </h1>
      {sop.description && (
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed tracking-normal text-muted">
          {sop.description}
        </p>
      )}

      {/* Walkthrough */}
      <Section title="Walkthrough" first>
        {sop.loomUrl ? (
          <VideoEmbed url={sop.loomUrl} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded border border-dashed border-border-faint py-10 text-center">
            <PlayCircleIcon className="size-7 text-subtle" />
            <p className="text-sm text-subtle">No walkthrough video yet.</p>
            {isAdmin && (
              <p className="text-xs text-subtle/70">
                Add a Loom link or video file when you edit.
              </p>
            )}
          </div>
        )}
      </Section>

      {/* Steps — hairline-separated, roomy, one screenshot behind a tab */}
      <Section title={`Steps${steps.length > 0 ? ` · ${steps.length}` : ""}`}>
        {steps.length > 0 ? (
          <div className="-mt-5">
            {steps.map((st, i) => (
              <StepRow
                key={st.id}
                index={i + 1}
                step={st}
                onZoom={setLightbox}
              />
            ))}
          </div>
        ) : sop.content ? (
          // Legacy SOPs (one markdown blob): split on headings, hairline-separated.
          <div className="-mt-5">
            {contentToBlocks(sop.content).map((b, i) =>
              b.heading && !b.body ? (
                <p
                  key={i}
                  className="border-t border-border-faint pt-5 font-mono text-2xs uppercase tracking-wider text-subtle first:border-t-0"
                >
                  {b.heading}
                </p>
              ) : (
                <div
                  key={i}
                  className="border-t border-border-faint py-7 first:border-t-0"
                >
                  {b.heading && (
                    <p className="text-base font-semibold text-foreground">
                      {b.heading}
                    </p>
                  )}
                  {b.body && (
                    <div
                      className={`text-sm leading-relaxed tracking-normal text-foreground/85 ${b.heading ? "mt-1.5" : ""}`}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(b.body) }}
                    />
                  )}
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="text-sm text-subtle">No steps yet.</p>
        )}
      </Section>

      {/* Exit criteria — "done when" checks so a new hire can self-verify */}
      {exit.length > 0 && (
        <Section title="Done when">
          <ul className="space-y-2.5">
            {exit.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-status-ontrack" />
                <span className="text-sm leading-relaxed tracking-normal text-foreground/85">{c}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {sop.content && steps.length > 0 && (
        <Section title="Notes">
          <div
            className="text-sm leading-relaxed tracking-normal text-foreground/85"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(sop.content) }}
          />
        </Section>
      )}

      {isAdmin && (
        <div className="mt-6 flex items-center gap-2 border-t border-border-faint pt-4">
          <button
            onClick={onTogglePublish}
            className={`rounded border px-3 py-1.5 text-2xs font-medium transition-colors ${
              sop.draft
                ? "border-status-ontrack/30 text-status-ontrack hover:bg-status-ontrack/10"
                : "border-status-approaching/30 text-status-approaching hover:bg-status-approaching/10"
            }`}
          >
            {sop.draft ? "Publish" : "Unpublish"}
          </button>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-2xs font-medium text-muted transition-colors hover:text-foreground"
          >
            <PencilIcon className="size-3" /> Edit
          </button>
          <button
            onClick={onDelete}
            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-2xs font-medium transition-colors ${
              confirmDelete
                ? "border-transparent bg-status-late text-white"
                : "border-status-late/30 text-status-late hover:bg-status-late/10"
            }`}
          >
            <TrashIcon className="size-3" />
            {confirmDelete ? "Confirm delete" : "Delete"}
          </button>
        </div>
      )}
    </div>

    {lightbox && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
        onClick={() => setLightbox(null)}
      >
        <img
          src={lightbox}
          alt=""
          className="max-h-full max-w-full rounded shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={() => setLightbox(null)}
          className="absolute right-5 top-5 rounded-full bg-white/10 p-1.5 text-white/80 hover:text-white"
          aria-label="Close"
        >
          <XMarkIcon className="size-5" />
        </button>
      </div>
    )}
    </>
  );
}
