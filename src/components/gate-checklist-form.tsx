"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { CheckIcon, DocumentArrowUpIcon, TrashIcon, ArrowDownTrayIcon, EyeIcon, EyeSlashIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { QAGate, PortalProject, GateKey, BriefFile, UploadedFile } from "@/lib/portal/types";
import type { PortalData } from "@/lib/portal/types";
import {
  CRO_BRIEF_ITEMS, DESIGN_HANDOFF_ITEMS, DEV_HANDOFF_ITEMS, DEV_HANDOFF_CATEGORIES, LAUNCH_PREP_ITEMS,
  createDefaultGate, getGateProgress, isGateComplete, isDesignHandoffComplete,
} from "@/lib/portal/qa-gates";
import type { GateCategory } from "@/lib/portal/qa-gates";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

/* ── Launch prep items ── */

/* ── Gate mapping ── */
const gateMapping: Record<GateKey, {
  qaGateKey: "cro_brief" | "design_handoff" | "dev_handoff" | "launch_prep";
  title: string;
  subtitle: string;
  color: string;
  items: string[];
  type: "design-brief" | "design-handoff" | "checklist" | "categorised-checklist" | "handoff-testing";
  categories?: GateCategory[];
}> = {
  "design-brief": {
    qaGateKey: "cro_brief",
    title: "Design Brief",
    subtitle: "Upload the design brief document for this project",
    color: "#DC2626",
    items: CRO_BRIEF_ITEMS,
    type: "design-brief",
  },
  "dev-handover": {
    qaGateKey: "design_handoff",
    title: "Dev Handover",
    subtitle: "Everything the developer needs to build without asking questions",
    color: "#7C3AED",
    items: DESIGN_HANDOFF_ITEMS,
    type: "design-handoff",
  },
  "dev-qa": {
    qaGateKey: "dev_handoff",
    title: "Dev QA",
    subtitle: "Self-QA before submitting for internal review",
    color: "#059669",
    items: DEV_HANDOFF_ITEMS,
    type: "categorised-checklist",
    categories: DEV_HANDOFF_CATEGORIES,
  },
  "handoff-testing": {
    qaGateKey: "launch_prep",
    title: "Handoff / Testing",
    subtitle: "Final line in the sand before going live",
    color: "#2563EB",
    items: LAUNCH_PREP_ITEMS,
    type: "handoff-testing",
  },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function fileIcon(type: string) {
  if (type.includes("pdf")) return "PDF";
  if (type.includes("word") || type.includes("document")) return "DOC";
  return "TXT";
}

interface GateChecklistFormProps {
  gateKey: GateKey;
  project: PortalProject;
  portal: PortalData;
  onUpdate: (patch: Partial<PortalProject>) => Promise<void>;
  /** Fires after a successful submit. Use for side-effects like Slack notifications. */
  onAfterSubmit?: (gate: QAGate) => void | Promise<void>;
}

export function GateChecklistForm({ gateKey, project, portal, onUpdate, onAfterSubmit }: GateChecklistFormProps) {
  const config = gateMapping[gateKey];
  const gates = project.qa_gates || {};

  const [gate, setGateLocal] = useState<QAGate>(() => {
    const existing = gates[config.qaGateKey as keyof typeof gates] as QAGate | undefined;
    if (existing) {
      // If the checklist items have changed (different count or labels), reset to current definition
      const definitionLabels = config.items;
      const existingLabels = existing.items.map(i => i.label);
      const itemsMatch = definitionLabels.length === existingLabels.length && definitionLabels.every((l, i) => l === existingLabels[i]);
      if (!itemsMatch) {
        return { ...existing, items: definitionLabels.map(label => ({ label, checked: false })) };
      }
      return existing;
    }
    return createDefaultGate(config.items);
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [uploadingFonts, setUploadingFonts] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetsInputRef = useRef<HTMLInputElement>(null);
  const fontsInputRef = useRef<HTMLInputElement>(null);

  const progress = getGateProgress(gate);
  const isSubmitted = gate.status === "submitted";

  // Use a ref to always have the latest gates when saving, avoiding stale closures
  const gatesRef = useRef(gates);
  gatesRef.current = gates;

  const saveGate = useCallback(async (updatedGate: QAGate) => {
    setSaving(true);
    setGateLocal(updatedGate);
    const newGates = { ...gatesRef.current, [config.qaGateKey]: updatedGate };
    await onUpdate({ qa_gates: newGates });
    setSaving(false);
  }, [config.qaGateKey, onUpdate]);

  // Auto-heal: when the stored checklist no longer matches the current definition
  // (typically because the definition was updated after data was seeded), persist
  // the reset so both admin + team views read the same data on subsequent loads.
  const healedRef = useRef(false);
  useEffect(() => {
    if (healedRef.current) return;
    const existing = gatesRef.current[config.qaGateKey as keyof typeof gatesRef.current] as QAGate | undefined;
    if (!existing) return;
    const definitionLabels = config.items;
    const existingLabels = existing.items.map(i => i.label);
    const itemsMatch = definitionLabels.length === existingLabels.length && definitionLabels.every((l, i) => l === existingLabels[i]);
    if (!itemsMatch) {
      healedRef.current = true;
      saveGate({ ...existing, items: definitionLabels.map(label => ({ label, checked: false })) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleItem = (idx: number) => {
    if (isSubmitted) return;
    const updated = { ...gate, items: gate.items.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item) };
    setGateLocal(updated);
    saveGate(updated);
  };

  const handleSubmit = async () => {
    const submitted = { ...gate, status: "submitted" as const, submitted_at: new Date().toISOString(), submitted_by: "team" };
    await saveGate(submitted);
    if (onAfterSubmit) {
      try { await onAfterSubmit(submitted); } catch { /* fire-and-forget */ }
    }
  };

  const handleReopen = async () => {
    const reopened = { ...gate, status: "pending" as const, submitted_at: undefined, submitted_by: "" };
    await saveGate(reopened);
  };

  /* ── File upload for Design Brief ── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/design-brief/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        setUploading(false);
        return;
      }

      const briefFile: BriefFile = {
        filename: data.filename,
        originalName: data.originalName,
        url: data.url,
        size: data.size,
        type: data.type,
        uploaded_at: new Date().toISOString(),
      };

      const updated = { ...gate, brief_file: briefFile };
      await saveGate(updated);
    } catch {
      setUploadError("Upload failed — check connection");
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileDelete = async () => {
    if (!gate.brief_file) return;

    try {
      await fetch("/api/design-brief/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: gate.brief_file.filename }),
      });
    } catch {
      // File may already be gone — continue
    }

    const updated = { ...gate, brief_file: undefined };
    await saveGate(updated);
  };

  // Keep a ref to the latest gate for async handlers
  const gateRef = useRef(gate);
  gateRef.current = gate;

  /* ── Multi-file upload for handover (assets + fonts) ── */
  const handleHandoverUpload = async (
    files: FileList | null,
    field: "extra_assets_files" | "font_files_uploads",
    setLoading: (v: boolean) => void,
  ) => {
    if (!files || files.length === 0) return;
    setLoading(true);

    const existing = gateRef.current[field] || [];
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/design-brief/upload?bucket=Handover-files", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Upload failed:", err);
          continue;
        }
        const data = await res.json();
        newFiles.push({
          filename: data.filename,
          originalName: data.originalName,
          url: data.url,
          size: data.size,
          type: data.type,
          uploaded_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Upload error:", err);
      }
    }

    if (newFiles.length > 0) {
      // Read the latest gate ref again in case something changed during upload
      const latestGate = gateRef.current;
      const latestExisting = latestGate[field] || [];
      const updated = { ...latestGate, [field]: [...latestExisting, ...newFiles] };
      await saveGate(updated);
    }
    setLoading(false);
  };

  const handleHandoverFileDelete = async (
    field: "extra_assets_files" | "font_files_uploads",
    filename: string,
  ) => {
    try {
      await fetch("/api/design-brief/upload?bucket=Handover-files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
    } catch { /* file may already be gone */ }

    const updated = { ...gateRef.current, [field]: (gateRef.current[field] || []).filter(f => f.filename !== filename) };
    await saveGate(updated);
  };

  const isReady = config.type === "design-brief"
    ? !!gate.brief_file
    : config.type === "design-handoff"
      ? isDesignHandoffComplete(gate)
      : config.type === "handoff-testing"
        ? isGateComplete(gate) && !!gate.dev_lead_signoff && !!gate.client_approval_confirmed && !!gate.staging_url?.trim() && (gate.testing_mode === "client-test" || !!gate.intelligems_url?.trim())
        : isGateComplete(gate);

  const fieldClass = "w-full text-sm px-3 py-2.5 border border-[#E8E8E8] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#CCC] disabled:opacity-50 disabled:bg-[#FAFAFA]";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">{config.title}</h2>
          <p className="text-xs text-[#777]">{config.subtitle}</p>
        </div>
        {config.type !== "design-brief" && (
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-[#1A1A1A] tabular-nums">{progress.checked}/{progress.total}</p>
            {saving && <p className="text-[9px] text-[#CCC]">Saving...</p>}
          </div>
        )}
        {config.type === "design-brief" && saving && (
          <p className="text-[9px] text-[#CCC]">Saving...</p>
        )}
      </div>

      {/* Progress bar (not for design-brief) */}
      {config.type !== "design-brief" && (
        <div className="h-1.5 bg-[#F0F0F0] rounded-full mb-8 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${(progress.checked / progress.total) * 100}%`,
              backgroundColor: config.color,
            }}
          />
        </div>
      )}

      {/* Submitted banner */}
      {isSubmitted && (
        <div className="flex items-center justify-between mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckIcon className="size-4" />
            <span className="text-sm font-medium">
              Submitted {gate.submitted_at ? new Date(gate.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>
          <button onClick={handleReopen} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
            Reopen
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          DESIGN BRIEF — File upload + notes
         ══════════════════════════════════════════ */}
      {config.type === "design-brief" && (
        <div className="space-y-6">
          {/* File upload area */}
          {!gate.brief_file ? (
            <div>
              <label className="text-[11px] font-medium text-[#555] block mb-2">
                Design Brief Document <span className="text-red-400">*</span>
              </label>
              <label
                className={`flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  uploading
                    ? "border-[#CCC] bg-[#FAFAFA]"
                    : isSubmitted
                      ? "border-[#E8E8E8] bg-[#FAFAFA] cursor-not-allowed"
                      : "border-[#DDD] hover:border-[#999] hover:bg-[#FAFAFA]"
                }`}
              >
                {uploading ? (
                  <>
                    <div className="size-8 border-2 border-[#CCC] border-t-[#1A1A1A] rounded-full animate-spin" />
                    <p className="text-sm text-[#777]">Uploading...</p>
                  </>
                ) : (
                  <>
                    <DocumentArrowUpIcon className="size-8 text-[#CCC]" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#777]">Click to upload brief</p>
                      <p className="text-[11px] text-[#BBB] mt-1">Word (.doc, .docx), PDF, or text file</p>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".doc,.docx,.pdf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleFileUpload}
                  disabled={uploading || isSubmitted}
                  className="hidden"
                />
              </label>
              {uploadError && (
                <p className="text-xs text-red-500 mt-2">{uploadError}</p>
              )}
            </div>
          ) : (
            /* Uploaded file display */
            <div>
              <label className="text-[11px] font-medium text-[#555] block mb-2">
                Design Brief Document
              </label>
              <div className="flex items-center gap-3 p-4 bg-[#FAFAFA] border border-[#E8E8E8] rounded-xl">
                {/* File icon */}
                <div className="size-10 rounded-lg bg-white border border-[#E8E8E8] flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-[#999]">{fileIcon(gate.brief_file.type)}</span>
                </div>
                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{gate.brief_file.originalName}</p>
                  <p className="text-[11px] text-[#AAA]">
                    {formatFileSize(gate.brief_file.size)} — uploaded {new Date(gate.brief_file.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={async () => {
                      if (!showPreview && gate.brief_file?.type === "text/plain" && !textContent) {
                        try {
                          const res = await fetch(gate.brief_file.url);
                          const text = await res.text();
                          setTextContent(text);
                        } catch { setTextContent("Failed to load file content."); }
                      }
                      setShowPreview(!showPreview);
                    }}
                    className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors"
                    title={showPreview ? "Hide preview" : "Preview"}
                  >
                    {showPreview ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                  <a
                    href={gate.brief_file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="size-4" />
                  </a>
                  {!isSubmitted && (
                    <button
                      onClick={handleFileDelete}
                      className="p-2 text-[#CCC] hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                      title="Remove file"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Preview panel */}
              {showPreview && gate.brief_file && (
                <div className="mt-3 border border-[#E8E8E8] rounded-xl overflow-hidden bg-white">
                  {gate.brief_file.type === "application/pdf" ? (
                    <iframe
                      src={gate.brief_file.url}
                      className="w-full h-[600px]"
                      title="Brief preview"
                    />
                  ) : gate.brief_file.type === "text/plain" ? (
                    <pre className="p-4 text-sm text-[#444] whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono leading-relaxed">
                      {textContent || "Loading..."}
                    </pre>
                  ) : (
                    /* Word docs — use Google Docs Viewer */
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(gate.brief_file.url)}&embedded=true`}
                      className="w-full h-[600px]"
                      title="Brief preview"
                    />
                  )}
                </div>
              )}

              {/* Replace file */}
              {!isSubmitted && (
                <label className={`inline-block mt-2 text-xs text-[#999] hover:text-[#1A1A1A] cursor-pointer transition-colors ${showPreview ? "mt-3" : ""}`}>
                  Replace file
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".doc,.docx,.pdf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={async (e) => {
                      setShowPreview(false);
                      setTextContent(null);
                      await handleFileDelete();
                      await handleFileUpload(e);
                    }}
                    disabled={uploading || isSubmitted}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[11px] font-medium text-[#555] block mb-1.5">Notes</label>
            <textarea
              value={gate.notes}
              onChange={(e) => {
                if (isSubmitted) return;
                setGateLocal({ ...gate, notes: e.target.value });
              }}
              onBlur={() => saveGate(gate)}
              disabled={isSubmitted}
              placeholder="Any additional context, instructions, or notes for the design team..."
              className={`${fieldClass} min-h-[100px] resize-y`}
            />
          </div>

          {/* Submit */}
          {!isSubmitted && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-[10px] text-[#AAA]">
                {!gate.brief_file ? "Upload a brief document to submit" : "Ready to submit"}
              </p>
              <button
                onClick={handleSubmit}
                disabled={!isReady}
                className="px-5 py-2.5 text-sm font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                Submit Brief
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          DESIGN HANDOFF — Figma, Loom, Asset uploads, Font uploads + checklist
         ══════════════════════════════════════════ */}
      {config.type === "design-handoff" && (
        <div className="space-y-6 mb-8">
          {/* Figma Link */}
          <div>
            <label className="text-[11px] font-medium text-[#555] block mb-1.5">
              Figma Link <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={gate.figma_url || ""}
              onChange={(e) => {
                if (isSubmitted) return;
                setGateLocal({ ...gate, figma_url: e.target.value });
              }}
              onBlur={() => saveGate(gate)}
              disabled={isSubmitted}
              placeholder="https://www.figma.com/file/..."
              className={fieldClass}
            />
            <p className="text-[10px] text-[#BBB] mt-1">Link to the final design file</p>
          </div>

          {/* Loom Walkthrough */}
          <div>
            <label className="text-[11px] font-medium text-[#555] block mb-1.5">
              Loom Walkthrough <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={gate.loom_url || ""}
              onChange={(e) => {
                if (isSubmitted) return;
                setGateLocal({ ...gate, loom_url: e.target.value });
              }}
              onBlur={() => saveGate(gate)}
              disabled={isSubmitted}
              placeholder="https://www.loom.com/share/..."
              className={fieldClass}
            />
            <p className="text-[10px] text-[#BBB] mt-1">Walk the developer through the design</p>
          </div>

          {/* Font Files — REQUIRED */}
          <div>
            <label className="text-[11px] font-medium text-[#555] block mb-2">
              Font Files <span className="text-red-400">*</span>
            </label>
            {/* Uploaded font files list */}
            {(gate.font_files_uploads || []).length > 0 && (
              <div className="space-y-1.5 mb-3">
                {(gate.font_files_uploads || []).map((f) => (
                  <div key={f.filename} className="flex items-center gap-3 px-3 py-2.5 bg-[#FAFAFA] border border-[#E8E8E8] rounded-lg">
                    <div className="size-8 rounded bg-white border border-[#E8E8E8] flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-[#999]">
                        {f.originalName.split(".").pop()?.toUpperCase() || "FILE"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1A1A1A] truncate">{f.originalName}</p>
                      <p className="text-[10px] text-[#BBB]">{formatFileSize(f.size)}</p>
                    </div>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#999] hover:text-[#1A1A1A] transition-colors" title="Download">
                      <ArrowDownTrayIcon className="size-3.5" />
                    </a>
                    {!isSubmitted && (
                      <button onClick={() => handleHandoverFileDelete("font_files_uploads", f.filename)} className="p-1.5 text-[#CCC] hover:text-red-500 transition-colors" title="Remove">
                        <TrashIcon className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Upload button */}
            {!isSubmitted && (
              <label className={`flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                uploadingFonts ? "border-[#CCC] bg-[#FAFAFA]" : "border-[#DDD] hover:border-[#999]"
              }`}>
                {uploadingFonts ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 border-2 border-[#CCC] border-t-[#1A1A1A] rounded-full animate-spin" />
                    <span className="text-xs text-[#777]">Uploading...</span>
                  </div>
                ) : (
                  <>
                    <PlusIcon className="size-4 text-[#999]" />
                    <span className="text-xs text-[#777]">Upload font files (.ttf, .otf, .woff, .woff2)</span>
                  </>
                )}
                <input
                  ref={fontsInputRef}
                  type="file"
                  multiple
                  accept=".ttf,.otf,.woff,.woff2,.eot,font/ttf,font/otf,font/woff,font/woff2"
                  onChange={(e) => {
                    handleHandoverUpload(e.target.files, "font_files_uploads", setUploadingFonts);
                    if (fontsInputRef.current) fontsInputRef.current.value = "";
                  }}
                  disabled={uploadingFonts || isSubmitted}
                  className="hidden"
                />
              </label>
            )}
            {(gate.font_files_uploads || []).length === 0 && !uploadingFonts && (
              <p className="text-[10px] text-red-400 mt-1.5">At least one font file is required</p>
            )}
          </div>

          {/* Extra Assets — OPTIONAL */}
          <div>
            <label className="text-[11px] font-medium text-[#555] block mb-2">
              Extra Assets <span className="text-[10px] text-[#BBB] font-normal">(optional)</span>
            </label>
            {/* Uploaded asset files list */}
            {(gate.extra_assets_files || []).length > 0 && (
              <div className="space-y-1.5 mb-3">
                {(gate.extra_assets_files || []).map((f) => (
                  <div key={f.filename} className="flex items-center gap-3 px-3 py-2.5 bg-[#FAFAFA] border border-[#E8E8E8] rounded-lg">
                    <div className="size-8 rounded bg-white border border-[#E8E8E8] flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-[#999]">
                        {f.originalName.split(".").pop()?.toUpperCase() || "FILE"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1A1A1A] truncate">{f.originalName}</p>
                      <p className="text-[10px] text-[#BBB]">{formatFileSize(f.size)}</p>
                    </div>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#999] hover:text-[#1A1A1A] transition-colors" title="Download">
                      <ArrowDownTrayIcon className="size-3.5" />
                    </a>
                    {!isSubmitted && (
                      <button onClick={() => handleHandoverFileDelete("extra_assets_files", f.filename)} className="p-1.5 text-[#CCC] hover:text-red-500 transition-colors" title="Remove">
                        <TrashIcon className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Upload button */}
            {!isSubmitted && (
              <label className={`flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                uploadingAssets ? "border-[#CCC] bg-[#FAFAFA]" : "border-[#DDD] hover:border-[#999]"
              }`}>
                {uploadingAssets ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 border-2 border-[#CCC] border-t-[#1A1A1A] rounded-full animate-spin" />
                    <span className="text-xs text-[#777]">Uploading...</span>
                  </div>
                ) : (
                  <>
                    <PlusIcon className="size-4 text-[#999]" />
                    <span className="text-xs text-[#777]">Upload assets (videos, images, icons, etc.)</span>
                  </>
                )}
                <input
                  ref={assetsInputRef}
                  type="file"
                  multiple
                  onChange={(e) => {
                    handleHandoverUpload(e.target.files, "extra_assets_files", setUploadingAssets);
                    if (assetsInputRef.current) assetsInputRef.current.value = "";
                  }}
                  disabled={uploadingAssets || isSubmitted}
                  className="hidden"
                />
              </label>
            )}
            <p className="text-[10px] text-[#BBB] mt-1.5">Videos, images, icons, or any files the dev can't pull from Figma</p>
          </div>

          <div className="border-t border-[#F0F0F0] pt-4">
            <p className="text-[11px] font-medium text-[#555] mb-3">Confirm before submitting</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CATEGORISED CHECKLIST (dev-qa)
         ══════════════════════════════════════════ */}
      {config.type === "categorised-checklist" && config.categories && (
        <>
          {/* Preview URLs — one or more titled preview links to submit with QA */}
          <div className="mb-6 border border-[#E8E8E8] rounded-xl bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">Preview URLs</p>
                <p className="text-[11px] text-[#777] mt-0.5">Add every page you're submitting for QA. These land in the internal Slack message on submit.</p>
              </div>
              {!isSubmitted && (
                <button
                  onClick={() => {
                    const next = [...(gate.dev_qa_previews || []), { id: crypto.randomUUID(), title: "", url: "" }];
                    setGateLocal({ ...gate, dev_qa_previews: next });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[#777] hover:text-[#1A1A1A] border border-[#E8E8E8] rounded-lg hover:border-[#999] transition-colors"
                >
                  <PlusIcon className="size-3" />
                  Add URL
                </button>
              )}
            </div>
            {(gate.dev_qa_previews && gate.dev_qa_previews.length > 0) ? (
              <div className="space-y-2">
                {gate.dev_qa_previews.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p.title}
                      disabled={isSubmitted}
                      onChange={(e) => {
                        const next = [...(gate.dev_qa_previews || [])];
                        next[i] = { ...p, title: e.target.value };
                        setGateLocal({ ...gate, dev_qa_previews: next });
                      }}
                      onBlur={() => saveGate(gate)}
                      placeholder="Page name (e.g. PDP)"
                      className={`${fieldClass} flex-1 max-w-[180px]`}
                    />
                    <input
                      type="url"
                      value={p.url}
                      disabled={isSubmitted}
                      onChange={(e) => {
                        const next = [...(gate.dev_qa_previews || [])];
                        next[i] = { ...p, url: e.target.value };
                        setGateLocal({ ...gate, dev_qa_previews: next });
                      }}
                      onBlur={() => saveGate(gate)}
                      placeholder="https://preview.example.com/..."
                      className={`${fieldClass} flex-1`}
                    />
                    {!isSubmitted && (
                      <button
                        onClick={() => {
                          const next = (gate.dev_qa_previews || []).filter((_, idx) => idx !== i);
                          setGateLocal({ ...gate, dev_qa_previews: next });
                          saveGate({ ...gate, dev_qa_previews: next });
                        }}
                        className="p-1.5 text-[#BBB] hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#AAA] italic">No preview URLs added yet. Click <span className="font-medium">Add URL</span> above.</p>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {config.categories.map((cat) => {
              const catItems = gate.items.slice(cat.startIndex, cat.startIndex + cat.count);
              const catChecked = catItems.filter(i => i.checked).length;
              const catComplete = catChecked === cat.count;
              const catIdx = config.categories!.indexOf(cat);
                              const isCollapsed = collapsedCats[cat.label] ?? (catIdx !== 0);

              return (
                <div key={cat.label} className={`border rounded-xl overflow-hidden transition-colors ${catComplete ? "border-emerald-200 bg-emerald-50/20" : "border-[#E8E8E8]"}`}>
                  {/* Category header */}
                  <button
                    onClick={() => setCollapsedCats(prev => ({ ...prev, [cat.label]: !isCollapsed }))}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <ChevronDownIcon className={`size-3.5 text-[#999] transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                      <span className={`text-sm font-medium ${catComplete ? "text-emerald-700" : "text-[#1A1A1A]"}`}>
                        {cat.label}
                      </span>
                      {catComplete && (
                        <CheckIcon className="size-4 text-emerald-500" />
                      )}
                    </div>
                    <span className={`text-[11px] font-medium tabular-nums ${catComplete ? "text-emerald-600" : "text-[#AAA]"}`}>
                      {catChecked}/{cat.count}
                    </span>
                  </button>

                  {/* Category items */}
                  {!isCollapsed && (
                    <div className="px-4 pb-3 space-y-1.5">
                      {catItems.map((item, localIdx) => {
                        const globalIdx = cat.startIndex + localIdx;
                        return (
                          <label
                            key={globalIdx}
                            className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors cursor-pointer ${
                              item.checked ? "bg-emerald-50/50" : "hover:bg-[#FAFAFA]"
                            } ${isSubmitted ? "pointer-events-none opacity-60" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={item.checked}
                              disabled={isSubmitted}
                              onChange={() => toggleItem(globalIdx)}
                              className="size-4 mt-0.5 rounded border-[#CCC] text-emerald-600 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className={`text-sm ${item.checked ? "text-[#999] line-through" : "text-[#555]"}`}>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-[11px] font-medium text-[#555] block mb-1.5">Notes / Additional Context</label>
            <textarea
              value={gate.notes}
              onChange={(e) => {
                if (isSubmitted) return;
                setGateLocal({ ...gate, notes: e.target.value });
              }}
              onBlur={() => saveGate(gate)}
              disabled={isSubmitted}
              placeholder="Add links, context, or notes..."
              className={`${fieldClass} min-h-[80px] resize-y`}
            />
          </div>

          {/* Submit */}
          {!isSubmitted && (
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#AAA]">
                {isReady ? "All items checked — ready to submit" : `${progress.total - progress.checked} items remaining`}
              </p>
              <button
                onClick={handleSubmit}
                disabled={!isReady}
                className="px-5 py-2.5 text-sm font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          HANDOFF / TESTING — toggle, Intelligems, sign-offs + checklist
         ══════════════════════════════════════════ */}
      {config.type === "handoff-testing" && (
        <>
          <div className="space-y-6 mb-8">
            {/* Testing mode toggle */}
            <div>
              <label className="text-[11px] font-medium text-[#555] block mb-2">Who is testing?</label>
              <div className="flex gap-2">
                {(["we-test", "client-test"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      if (isSubmitted) return;
                      const updated = { ...gateRef.current, testing_mode: mode };
                      setGateLocal(updated);
                      saveGate(updated);
                    }}
                    disabled={isSubmitted}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors ${
                      gate.testing_mode === mode
                        ? "border-[#2563EB] bg-[#2563EB]/5 text-[#2563EB]"
                        : "border-[#E8E8E8] text-[#999] hover:border-[#CCC]"
                    } ${isSubmitted ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    {mode === "we-test" ? "We Test" : "Client Tests"}
                  </button>
                ))}
              </div>
            </div>

            {/* Staging URL */}
            <div>
              <label className="text-[11px] font-medium text-[#555] block mb-1.5">
                Staging URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={gate.staging_url || ""}
                onChange={(e) => {
                  if (isSubmitted) return;
                  setGateLocal({ ...gateRef.current, staging_url: e.target.value });
                }}
                onBlur={() => saveGate(gateRef.current)}
                disabled={isSubmitted}
                placeholder="https://store.myshopify.com/..."
                className={fieldClass}
              />
            </div>

            {/* Intelligems URL — only when we test */}
            {gate.testing_mode === "we-test" && (
              <div>
                <label className="text-[11px] font-medium text-[#555] block mb-1.5">
                  Intelligems Test Link <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={gate.intelligems_url || ""}
                  onChange={(e) => {
                    if (isSubmitted) return;
                    setGateLocal({ ...gateRef.current, intelligems_url: e.target.value });
                  }}
                  onBlur={() => saveGate(gateRef.current)}
                  disabled={isSubmitted}
                  placeholder="https://app.intelligems.io/..."
                  className={fieldClass}
                />
                <p className="text-[10px] text-[#BBB] mt-1">Link to the Intelligems test</p>
              </div>
            )}

            {/* Go-live date */}
            <div>
              <label className="text-[11px] font-medium text-[#555] block mb-1.5">Go-Live Date</label>
              <input
                type="date"
                value={gate.go_live_date || ""}
                onChange={(e) => {
                  if (isSubmitted) return;
                  const updated = { ...gateRef.current, go_live_date: e.target.value };
                  setGateLocal(updated);
                  saveGate(updated);
                }}
                disabled={isSubmitted}
                className={fieldClass}
              />
            </div>

            {/* Sign-offs */}
            <div className="border-t border-[#F0F0F0] pt-5">
              <p className="text-[11px] font-medium text-[#555] mb-3">Sign-offs</p>
              <div className="space-y-2">
                {/* Dev lead sign-off */}
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                    gate.dev_lead_signoff
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-[#E8E8E8] hover:border-[#CCC]"
                  } ${isSubmitted ? "pointer-events-none opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={gate.dev_lead_signoff || false}
                    disabled={isSubmitted}
                    onChange={() => {
                      const updated = { ...gateRef.current, dev_lead_signoff: !gate.dev_lead_signoff };
                      setGateLocal(updated);
                      saveGate(updated);
                    }}
                    className="size-5 rounded border-[#CCC] text-emerald-600 focus:ring-0"
                  />
                  <div>
                    <p className={`text-sm font-medium ${gate.dev_lead_signoff ? "text-emerald-700" : "text-[#1A1A1A]"}`}>
                      Head of Dev Sign-Off
                    </p>
                    <p className="text-[11px] text-[#999]">Build reviewed and approved by dev lead</p>
                  </div>
                </label>

                {/* Client approval */}
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                    gate.client_approval_confirmed
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-[#E8E8E8] hover:border-[#CCC]"
                  } ${isSubmitted ? "pointer-events-none opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={gate.client_approval_confirmed || false}
                    disabled={isSubmitted}
                    onChange={() => {
                      const updated = { ...gateRef.current, client_approval_confirmed: !gate.client_approval_confirmed };
                      setGateLocal(updated);
                      saveGate(updated);
                    }}
                    className="size-5 rounded border-[#CCC] text-emerald-600 focus:ring-0"
                  />
                  <div>
                    <p className={`text-sm font-medium ${gate.client_approval_confirmed ? "text-emerald-700" : "text-[#1A1A1A]"}`}>
                      Client Approval Confirmed
                    </p>
                    <p className="text-[11px] text-[#999]">Written confirmation from client (Slack/email)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Pre-launch checklist header */}
            <div className="border-t border-[#F0F0F0] pt-5">
              <p className="text-[11px] font-medium text-[#555] mb-3">Pre-Launch Checklist</p>
            </div>
          </div>

          {/* Checklist items */}
          <div className="space-y-2 mb-6">
            {gate.items.map((item, i) => (
              <label
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  item.checked ? "border-emerald-200 bg-emerald-50/30" : "border-[#E8E8E8] hover:border-[#CCC]"
                } ${isSubmitted ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={isSubmitted}
                  onChange={() => toggleItem(i)}
                  className="size-4 mt-0.5 rounded border-[#CCC] text-emerald-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className={`text-sm ${item.checked ? "text-[#1A1A1A]" : "text-[#777]"}`}>{item.label}</span>
              </label>
            ))}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-[11px] font-medium text-[#555] block mb-1.5">Notes</label>
            <textarea
              value={gate.notes}
              onChange={(e) => {
                if (isSubmitted) return;
                setGateLocal({ ...gateRef.current, notes: e.target.value });
              }}
              onBlur={() => saveGate(gateRef.current)}
              disabled={isSubmitted}
              placeholder="Anything the tester or PM needs to know..."
              className={`${fieldClass} min-h-[80px] resize-y`}
            />
          </div>

          {/* Submit */}
          {!isSubmitted && (
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#AAA]">
                {isReady
                  ? "All checks passed — ready to submit"
                  : !gate.testing_mode
                    ? "Select testing mode"
                    : !gate.staging_url?.trim()
                      ? "Staging URL required"
                      : gate.testing_mode === "we-test" && !gate.intelligems_url?.trim()
                        ? "Intelligems test link required"
                        : !gate.dev_lead_signoff
                          ? "Head of Dev sign-off required"
                          : !gate.client_approval_confirmed
                            ? "Client approval required"
                            : `${progress.total - progress.checked} checklist items remaining`
                }
              </p>
              <button
                onClick={handleSubmit}
                disabled={!isReady}
                className="px-5 py-2.5 text-sm font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          FLAT CHECKLIST (design-handoff confirm)
         ══════════════════════════════════════════ */}
      {(config.type === "checklist" || config.type === "design-handoff") && (
        <>
          <div className="space-y-2 mb-6">
            {gate.items.map((item, i) => (
              <label
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  item.checked ? "border-emerald-200 bg-emerald-50/30" : "border-[#E8E8E8] hover:border-[#CCC]"
                } ${isSubmitted ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={isSubmitted}
                  onChange={() => toggleItem(i)}
                  className="size-4 mt-0.5 rounded border-[#CCC] text-emerald-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className={`text-sm ${item.checked ? "text-[#1A1A1A]" : "text-[#777]"}`}>{item.label}</span>
              </label>
            ))}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-[11px] font-medium text-[#555] block mb-1.5">
              {config.type === "design-handoff" ? "Notes for the developer" : "Notes / Additional Context"}
            </label>
            <textarea
              value={gate.notes}
              onChange={(e) => {
                if (isSubmitted) return;
                setGateLocal({ ...gate, notes: e.target.value });
              }}
              onBlur={() => saveGate(gate)}
              disabled={isSubmitted}
              placeholder={config.type === "design-handoff" ? "Anything else the dev should know..." : "Add links, context, or notes..."}
              className={`${fieldClass} min-h-[80px] resize-y`}
            />
          </div>

          {/* Submit */}
          {!isSubmitted && (
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#AAA]">
                {isReady
                  ? "All items checked — ready to submit"
                  : config.type === "design-handoff" && !gate.figma_url?.trim()
                    ? "Figma link required"
                    : config.type === "design-handoff" && !gate.loom_url?.trim()
                      ? "Loom video required"
                      : config.type === "design-handoff" && !(gate.font_files_uploads?.length)
                        ? "Font files required"
                        : `${progress.total - progress.checked} items remaining`
                }
              </p>
              <button
                onClick={handleSubmit}
                disabled={!isReady}
                className="px-5 py-2.5 text-sm font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
