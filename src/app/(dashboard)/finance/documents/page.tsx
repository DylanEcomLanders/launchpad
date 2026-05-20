"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  DocumentArrowUpIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  XMarkIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import {
  documentsStore,
  fmtDateUK,
  nowISO,
  uid,
  todayISO,
} from "@/lib/finance/data";
import {
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
  type FinanceDocument,
} from "@/lib/finance/types";
import { inputClass, selectClass, labelClass } from "@/lib/form-styles";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<FinanceDocument[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | DocumentCategory>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    url: string;
    path: string;
    name: string;
    size?: number;
  } | null>(null);
  const [pendingCategory, setPendingCategory] = useState<DocumentCategory>("bank_statement");
  const [pendingTags, setPendingTags] = useState("");
  const [pendingDate, setPendingDate] = useState(todayISO());
  const [pendingNotes, setPendingNotes] = useState("");
  const [error, setError] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    documentsStore.getAll().then((rows) => {
      setDocs(rows);
      setHydrated(true);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (categoryFilter !== "all" && d.category !== categoryFilter) return false;
      if (!q) return true;
      const hay = `${d.name} ${d.tags.join(" ")} ${d.notes || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [docs, categoryFilter, query]);

  async function uploadFile(f: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("folder", "documents");
      const res = await fetch("/api/finance/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setPendingFile({ url: json.url, path: json.path, name: f.name, size: json.size });
      setShowAdd(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  }

  async function saveDocument() {
    if (!pendingFile) return;
    const tags = pendingTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const now = nowISO();
    const doc: FinanceDocument = {
      id: uid(),
      name: pendingFile.name,
      category: pendingCategory,
      tags,
      document_date: pendingDate || undefined,
      file_url: pendingFile.url,
      file_path: pendingFile.path,
      file_name: pendingFile.name,
      file_size: pendingFile.size,
      notes: pendingNotes.trim() || undefined,
      created_at: now,
      updated_at: now,
    };
    await documentsStore.create(doc);
    setDocs((rows) => [doc, ...rows]);
    resetAdd();
  }

  function resetAdd() {
    setPendingFile(null);
    setPendingCategory("bank_statement");
    setPendingTags("");
    setPendingDate(todayISO());
    setPendingNotes("");
    setShowAdd(false);
  }

  async function handleDelete(doc: FinanceDocument) {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await documentsStore.remove(doc.id);
    setDocs((rows) => rows.filter((d) => d.id !== doc.id));
  }

  async function openDoc(doc: FinanceDocument) {
    const res = await fetch("/api/finance/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: doc.file_path }),
    });
    const json = await res.json();
    if (json.url) window.open(json.url, "_blank", "noopener");
  }

  return (
    <div>
      <div
        ref={dropRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="bg-white border-2 border-dashed border-[#E5E5EA] rounded-xl p-8 text-center mb-6 hover:border-[#1B1B1B] transition-colors"
      >
        <DocumentArrowUpIcon className="size-8 text-[#A0A0A0] mx-auto mb-2" />
        <p className="text-sm text-[#1B1B1B] font-medium mb-1">
          Drop a file here, or
        </p>
        <label className="inline-block cursor-pointer">
          <input
            type="file"
            accept="application/pdf,image/*,.csv,.xls,.xlsx"
            onChange={onFileInput}
            className="hidden"
          />
          <span className="text-sm text-[#1B1B1B] underline">choose a file</span>
        </label>
        <p className="text-[11px] text-[#A0A0A0] mt-2">
          PDF, image, CSV or Excel · 25MB max · stored privately
        </p>
        {uploading && (
          <p className="text-xs text-[#7A7A7A] mt-2">Uploading...</p>
        )}
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#7A7A7A] z-10" />
            <input
              placeholder="Search name, tag, or note..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${inputClass} pl-8`}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "all" | DocumentCategory)}
            className={`${selectClass} w-48`}
          >
            <option value="all">All categories</option>
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-[#7A7A7A]">
          {filtered.length} of {docs.length} document{docs.length === 1 ? "" : "s"}
        </p>
      </div>

      {!hydrated ? (
        <div className="h-48 bg-[#F7F8FA] rounded-xl animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <p className="text-sm text-[#7A7A7A]">
            {docs.length === 0
              ? "No documents yet — drop a file above to get started."
              : "No documents match these filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E5EA] rounded-xl divide-y divide-[#E5E5EA] shadow-[var(--shadow-soft)]">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="px-4 py-3 hover:bg-[#F7F8FA] transition-colors flex items-center gap-3"
            >
              <DocumentIcon className="size-5 text-[#7A7A7A] shrink-0" />
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => openDoc(doc)}
                  className="text-sm font-medium text-[#1B1B1B] hover:underline truncate text-left block max-w-full"
                >
                  {doc.name}
                </button>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#7A7A7A] mt-0.5">
                  <span>{DOCUMENT_CATEGORY_LABELS[doc.category]}</span>
                  {doc.document_date && (
                    <>
                      <span>·</span>
                      <span>{fmtDateUK(doc.document_date)}</span>
                    </>
                  )}
                  {doc.tags.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <TagIcon className="size-3" />
                        {doc.tags.join(", ")}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc)}
                className="p-1.5 text-[#A0A0A0] hover:text-red-500 transition-colors"
              >
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && pendingFile && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1B1B1B]">
                Tag this document
              </h3>
              <button
                onClick={resetAdd}
                className="p-1 text-[#7A7A7A] hover:text-[#1B1B1B]"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>
            <p className="text-sm text-[#7A7A7A] mb-4 truncate">{pendingFile.name}</p>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={pendingCategory}
                  onChange={(e) => setPendingCategory(e.target.value as DocumentCategory)}
                  className={selectClass}
                >
                  {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Document date</label>
                <input
                  type="date"
                  value={pendingDate}
                  onChange={(e) => setPendingDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Tags (comma separated)</label>
                <input
                  type="text"
                  value={pendingTags}
                  onChange={(e) => setPendingTags(e.target.value)}
                  placeholder="e.g. barclays, 2026-q1"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Notes (optional)</label>
                <input
                  type="text"
                  value={pendingNotes}
                  onChange={(e) => setPendingNotes(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={resetAdd}
                className="px-3 py-2 text-sm text-[#7A7A7A] hover:text-[#1B1B1B]"
              >
                Cancel
              </button>
              <button
                onClick={saveDocument}
                className="px-4 py-2 bg-[#1B1B1B] text-white text-sm font-medium rounded-lg hover:opacity-90"
              >
                Save document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
