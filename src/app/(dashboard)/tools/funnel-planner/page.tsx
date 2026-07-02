"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
  XMarkIcon,
  ListBulletIcon,
  ViewColumnsIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { inputClass, selectClass, labelClass, textareaClass } from "@/lib/form-styles";
import {
  type Platform,
  type FunnelStage,
  type ContentPiece,
  type ContentStatus,
  platforms,
  platformMap,
  funnelStages,
  funnelStageMap,
  loadFunnelPieces,
  saveFunnelPieces,
} from "@/lib/content-engine";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const statusOptions: { id: ContentStatus; label: string; color: string }[] = [
  { id: "idea", label: "Idea", color: "bg-surface-raised text-muted" },
  { id: "drafted", label: "Drafted", color: "bg-info/10 text-info" },
  { id: "scheduled", label: "Scheduled", color: "bg-warning/10 text-warning" },
  { id: "published", label: "Published", color: "bg-success/10 text-success" },
];

const emptyPiece: Omit<ContentPiece, "id" | "createdAt"> = {
  title: "",
  platform: "twitter",
  funnelStage: "tofu",
  format: "",
  status: "idea",
  topic: "",
  hook: "",
  cta: "",
  notes: "",
};

export default function FunnelPlannerPage() {
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [view, setView] = useState<"board" | "list">("board");
  const [filterPlatform, setFilterPlatform] = useState<Platform | "all">("all");
  const [filterStatus, setFilterStatus] = useState<ContentStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPiece);
  const [copied, setCopied] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setPieces(loadFunnelPieces());
  }, []);

  // Persist on change
  useEffect(() => {
    if (pieces.length > 0 || loadFunnelPieces().length > 0) {
      saveFunnelPieces(pieces);
    }
  }, [pieces]);

  const updateForm = useCallback(
    <K extends keyof typeof emptyPiece>(key: K, value: (typeof emptyPiece)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetForm = () => {
    setForm({ ...emptyPiece });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    if (editingId) {
      setPieces((prev) =>
        prev.map((p) => (p.id === editingId ? { ...p, ...form } : p))
      );
    } else {
      setPieces((prev) => [
        ...prev,
        { ...form, id: uid(), createdAt: new Date().toISOString() },
      ]);
    }
    resetForm();
  };

  const startEdit = (piece: ContentPiece) => {
    setForm({
      title: piece.title,
      platform: piece.platform,
      funnelStage: piece.funnelStage,
      format: piece.format,
      status: piece.status,
      topic: piece.topic,
      hook: piece.hook,
      cta: piece.cta,
      notes: piece.notes,
    });
    setEditingId(piece.id);
    setShowForm(true);
  };

  const deletePiece = (id: string) => {
    setPieces((prev) => prev.filter((p) => p.id !== id));
  };

  // Filtered pieces
  const filtered = useMemo(() => {
    return pieces.filter((p) => {
      if (filterPlatform !== "all" && p.platform !== filterPlatform) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      return true;
    });
  }, [pieces, filterPlatform, filterStatus]);

  // Funnel health stats
  const stats = useMemo(() => {
    const total = pieces.length;
    const byStage = {
      tofu: pieces.filter((p) => p.funnelStage === "tofu").length,
      mofu: pieces.filter((p) => p.funnelStage === "mofu").length,
      bofu: pieces.filter((p) => p.funnelStage === "bofu").length,
    };
    return { total, byStage };
  }, [pieces]);

  // Gap analysis
  const gaps = useMemo(() => {
    const missing: string[] = [];
    const platformStages: Record<string, Record<string, number>> = {};
    for (const p of platforms) {
      platformStages[p.id] = { tofu: 0, mofu: 0, bofu: 0 };
    }
    for (const piece of pieces) {
      if (platformStages[piece.platform]) {
        platformStages[piece.platform][piece.funnelStage]++;
      }
    }
    for (const p of platforms) {
      for (const s of funnelStages) {
        if (platformStages[p.id][s.id] === 0) {
          missing.push(`${p.label} \u00d7 ${s.label}`);
        }
      }
    }

    const recommendations: string[] = [];
    if (stats.byStage.bofu === 0 && stats.total > 0) {
      recommendations.push(
        "You have no BOFU content. Add posts with direct CTAs like 'Book a call' or 'DM to get started'."
      );
    }
    if (stats.byStage.mofu === 0 && stats.total > 0) {
      recommendations.push(
        "You have no MOFU content. Add case studies and process breakdowns to build trust."
      );
    }
    if (stats.total > 5 && stats.byStage.tofu > stats.total * 0.6) {
      recommendations.push(
        "Over 60% of your content is TOFU. Consider adding more MOFU/BOFU to convert your audience."
      );
    }

    return { missing, recommendations, platformStages };
  }, [pieces, stats]);

  // Formats for selected platform
  const availableFormats = useMemo(() => {
    const plat = platformMap[form.platform];
    return plat?.formats || [];
  }, [form.platform]);

  // CTA suggestions for selected stage
  const ctaSuggestions = useMemo(() => {
    const stage = funnelStageMap[form.funnelStage];
    return stage?.ctas || [];
  }, [form.funnelStage]);

  // Export as CSV
  const exportCSV = () => {
    const headers = "Title,Platform,Stage,Format,Status,Topic,Hook,CTA,Notes";
    const rows = pieces.map((p) =>
      [p.title, p.platform, p.funnelStage, p.format, p.status, p.topic, p.hook, p.cta, p.notes]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-funnel-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy summary
  const copySummary = async () => {
    const lines: string[] = ["Content Funnel Plan", ""];
    for (const stage of funnelStages) {
      const stagePieces = pieces.filter((p) => p.funnelStage === stage.id);
      lines.push(`## ${stage.fullLabel} (${stagePieces.length} pieces)`);
      for (const p of stagePieces) {
        const plat = platformMap[p.platform];
        lines.push(`- [${plat?.label}] ${p.title}${p.hook ? ` — "${p.hook}"` : ""}`);
      }
      lines.push("");
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pct = (n: number) => (stats.total === 0 ? 0 : Math.round((n / stats.total) * 100));

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-[28px] font-bold mb-2">
            Funnel Planner
          </h1>
          <p className="text-subtle">
            Map content to TOFU / MOFU / BOFU — see gaps at a glance
          </p>
        </div>

        {/* ── Funnel Health ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {funnelStages.map((stage) => {
            const count = stats.byStage[stage.id];
            const percent = pct(count);
            return (
              <div
                key={stage.id}
                className={`${stage.bgColor} ${stage.borderColor} border rounded-lg p-4`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}
                  >
                    {stage.label}
                  </span>
                  <span className={`text-lg font-bold ${stage.color}`}>
                    {count}
                  </span>
                </div>
                <p className="text-[10px] text-subtle">
                  {stage.fullLabel}
                </p>
                {stats.total > 0 && (
                  <div className="mt-2 h-1.5 bg-surface/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stage.id === "tofu"
                          ? "bg-blue-400"
                          : stage.id === "mofu"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Warnings ── */}
        {gaps.recommendations.length > 0 && (
          <div className="mb-8 space-y-2">
            {gaps.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-lg p-3"
              >
                <ExclamationTriangleIcon className="size-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-warning">{rec}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-xs font-medium rounded-md hover:bg-foreground/90 transition-colors"
            >
              <PlusIcon className="size-3.5" />
              Add Content
            </button>

            {pieces.length > 0 && (
              <>
                <button
                  onClick={copySummary}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-border bg-surface text-subtle hover:bg-surface-raised transition-colors"
                >
                  {copied ? (
                    <CheckIcon className="size-3.5 text-success" />
                  ) : (
                    <ClipboardDocumentIcon className="size-3.5" />
                  )}
                  {copied ? "Copied" : "Copy Summary"}
                </button>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-border bg-surface text-subtle hover:bg-surface-raised transition-colors"
                >
                  <ArrowDownTrayIcon className="size-3.5" />
                  CSV
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filters */}
            <select
              value={filterPlatform}
              onChange={(e) =>
                setFilterPlatform(e.target.value as Platform | "all")
              }
              className="px-2 py-1.5 text-xs border border-border rounded-md bg-surface text-subtle"
            >
              <option value="all">All platforms</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as ContentStatus | "all")
              }
              className="px-2 py-1.5 text-xs border border-border rounded-md bg-surface text-subtle"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* View toggle */}
            <div className="flex border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setView("board")}
                className={`p-1.5 ${
                  view === "board"
                    ? "bg-foreground text-background"
                    : "bg-surface text-subtle hover:bg-surface-raised"
                }`}
              >
                <ViewColumnsIcon className="size-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 ${
                  view === "list"
                    ? "bg-foreground text-background"
                    : "bg-surface text-subtle hover:bg-surface-raised"
                }`}
              >
                <ListBulletIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Add/Edit Form ── */}
        {showForm && (
          <div className="mb-8 bg-background border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">
                {editingId ? "Edit Content Piece" : "Add Content Piece"}
              </h3>
              <button onClick={resetForm} className="text-subtle hover:text-foreground">
                <XMarkIcon className="size-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="Content piece title..."
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Platform</label>
                  <select
                    value={form.platform}
                    onChange={(e) => {
                      updateForm("platform", e.target.value as Platform);
                      updateForm("format", "");
                    }}
                    className={selectClass}
                  >
                    {platforms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Format</label>
                  <select
                    value={form.format}
                    onChange={(e) => updateForm("format", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select format...</option>
                    {availableFormats.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateForm("status", e.target.value as ContentStatus)
                    }
                    className={selectClass}
                  >
                    {statusOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Funnel Stage Toggle */}
              <div>
                <label className={labelClass}>Funnel Stage</label>
                <div className="flex gap-2">
                  {funnelStages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() =>
                        updateForm("funnelStage", stage.id as FunnelStage)
                      }
                      className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md border transition-colors ${
                        form.funnelStage === stage.id
                          ? `${stage.bgColor} ${stage.borderColor} ${stage.color}`
                          : "bg-surface border-border text-subtle hover:bg-surface-raised"
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Topic</label>
                <input
                  type="text"
                  value={form.topic}
                  onChange={(e) => updateForm("topic", e.target.value)}
                  placeholder="Core subject..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Hook</label>
                <textarea
                  value={form.hook}
                  onChange={(e) => updateForm("hook", e.target.value)}
                  placeholder="Opening line..."
                  rows={2}
                  className={textareaClass}
                />
              </div>

              <div>
                <label className={labelClass}>CTA</label>
                <input
                  type="text"
                  value={form.cta}
                  onChange={(e) => updateForm("cta", e.target.value)}
                  placeholder="Call to action..."
                  className={inputClass}
                />
                {ctaSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ctaSuggestions.map((cta) => (
                      <button
                        key={cta}
                        onClick={() => updateForm("cta", cta)}
                        className="px-2 py-1 text-[10px] font-medium rounded border border-border bg-surface text-subtle hover:bg-surface-raised transition-colors"
                      >
                        {cta}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Notes{" "}
                  <span className="font-normal text-subtle">(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className={textareaClass}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!form.title.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingId ? "Save Changes" : "Add to Plan"}
              </button>
            </div>
          </div>
        )}

        {/* ── Board View ── */}
        {view === "board" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {funnelStages.map((stage) => {
              const stagePieces = filtered.filter(
                (p) => p.funnelStage === stage.id
              );
              return (
                <div key={stage.id}>
                  <div
                    className={`${stage.bgColor} ${stage.borderColor} border rounded-t-lg px-3 py-2 flex items-center justify-between`}
                  >
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}
                    >
                      {stage.label}
                    </span>
                    <span className={`text-xs font-bold ${stage.color}`}>
                      {stagePieces.length}
                    </span>
                  </div>
                  <div className="border border-t-0 border-border rounded-b-lg min-h-[200px] p-2 space-y-2">
                    {stagePieces.length === 0 && (
                      <p className="text-[10px] text-muted text-center py-8">
                        No content yet
                      </p>
                    )}
                    {stagePieces.map((piece) => {
                      const plat = platformMap[piece.platform];
                      const status = statusOptions.find(
                        (s) => s.id === piece.status
                      );
                      return (
                        <div
                          key={piece.id}
                          className="bg-surface border border-border rounded-md p-3"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold bg-surface-raised px-1.5 py-0.5 rounded">
                                {plat?.icon}
                              </span>
                              {piece.format && (
                                <span className="text-[9px] text-subtle">
                                  {plat?.formats.find(
                                    (f) => f.id === piece.format
                                  )?.label || piece.format}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${status?.color}`}
                            >
                              {status?.label}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-foreground mb-1 line-clamp-2">
                            {piece.title}
                          </p>
                          {piece.hook && (
                            <p className="text-[10px] text-subtle line-clamp-2 mb-2">
                              &ldquo;{piece.hook}&rdquo;
                            </p>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(piece)}
                              className="p-1 text-subtle hover:text-foreground transition-colors"
                            >
                              <PencilSquareIcon className="size-3" />
                            </button>
                            <button
                              onClick={() => deletePiece(piece.id)}
                              className="p-1 text-subtle hover:text-danger transition-colors"
                            >
                              <TrashIcon className="size-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── List View ── */}
        {view === "list" && (
          <div className="space-y-6">
            {funnelStages.map((stage) => {
              const stagePieces = filtered.filter(
                (p) => p.funnelStage === stage.id
              );
              return (
                <div key={stage.id}>
                  <div
                    className={`${stage.bgColor} ${stage.borderColor} border rounded-lg px-4 py-2 mb-2 flex items-center justify-between`}
                  >
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}
                    >
                      {stage.fullLabel}
                    </span>
                    <span className={`text-xs font-bold ${stage.color}`}>
                      {stagePieces.length}
                    </span>
                  </div>
                  {stagePieces.length === 0 ? (
                    <p className="text-xs text-muted py-4 text-center">
                      No content in this stage
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stagePieces.map((piece) => {
                        const plat = platformMap[piece.platform];
                        const status = statusOptions.find(
                          (s) => s.id === piece.status
                        );
                        return (
                          <div
                            key={piece.id}
                            className="flex items-center gap-3 bg-surface border border-border rounded-md px-4 py-3"
                          >
                            <span className="text-[10px] font-bold bg-surface-raised px-2 py-1 rounded shrink-0">
                              {plat?.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {piece.title}
                              </p>
                              {piece.hook && (
                                <p className="text-xs text-subtle truncate">
                                  &ldquo;{piece.hook}&rdquo;
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-medium px-2 py-1 rounded shrink-0 ${status?.color}`}
                            >
                              {status?.label}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => startEdit(piece)}
                                className="p-1.5 text-subtle hover:text-foreground transition-colors"
                              >
                                <PencilSquareIcon className="size-3.5" />
                              </button>
                              <button
                                onClick={() => deletePiece(piece.id)}
                                className="p-1.5 text-subtle hover:text-danger transition-colors"
                              >
                                <TrashIcon className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Gap Analysis ── */}
        {pieces.length > 0 && (
          <div className="mt-12 pt-12 border-t border-border">
            <h2 className="text-lg font-bold mb-4">
              Gap Analysis
            </h2>
            <div className="bg-surface-raised border border-border rounded-lg p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-3">
                Per-Platform Breakdown
              </p>
              <div className="space-y-2">
                {platforms.map((p) => {
                  const ps = gaps.platformStages[p.id];
                  if (!ps) return null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 text-xs"
                    >
                      <span className="font-bold text-[10px] bg-border px-2 py-1 rounded w-8 text-center">
                        {p.icon}
                      </span>
                      <span className="font-medium text-foreground w-24">
                        {p.label}
                      </span>
                      <span className="text-blue-600">
                        {ps.tofu} TOFU
                      </span>
                      <span className="text-muted">\u00b7</span>
                      <span className="text-amber-600">
                        {ps.mofu} MOFU
                      </span>
                      <span className="text-muted">\u00b7</span>
                      <span className="text-emerald-600">
                        {ps.bofu} BOFU
                      </span>
                    </div>
                  );
                })}
              </div>

              {gaps.missing.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">
                    Missing Combinations
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {gaps.missing.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] font-medium px-2 py-1 rounded bg-danger/10 text-danger border border-danger/20"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
