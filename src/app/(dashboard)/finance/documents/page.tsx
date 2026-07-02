"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Table, THead, TBody, TR, TH, TD, Num, Badge } from "@/components/ui";
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
import { inputClass, selectClass } from "@/lib/form-styles";

const fieldLabelClass = "block text-2xs uppercase tracking-wider text-subtle font-medium mb-2";

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
    <div className="space-y-6">
      <div
        ref={dropRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="bg-surface border border-dashed border-border rounded-md p-8 text-center hover:bg-surface-raised transition-colors"
      >
        <DocumentArrowUpIcon className="size-8 text-subtle mx-auto mb-2" />
        <p className="text-sm text-foreground font-medium mb-1">
          Drop a file here, or
        </p>
        <label className="inline-block cursor-pointer">
          <input
            type="file"
            accept="application/pdf,image/*,.csv,.xls,.xlsx"
            onChange={onFileInput}
            className="hidden"
          />
          <span className="text-sm text-foreground underline">choose a file</span>
        </label>
        <p className="text-2xs text-subtle mt-2">
          PDF, image, CSV or Excel · 25MB max · stored privately
        </p>
        {uploading && (
          <p className="text-xs text-subtle mt-2">Uploading...</p>
        )}
        {error && <p className="text-xs text-status-late mt-2">{error}</p>}
      </div>

      {/* Toolbar: count + filter left, search right. One quiet row. */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subtle tabular-nums mr-1">
            {filtered.length} of {docs.length}
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "all" | DocumentCategory)}
            className="h-8 px-2.5 rounded-md border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground max-w-[180px]"
          >
            <option value="all">All categories</option>
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative w-full md:w-64">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-subtle z-10" />
          <input
            placeholder="Search name, tag, or note"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full pl-8 pr-3 rounded-md border border-border bg-surface text-xs text-muted placeholder:text-subtle focus:outline-none focus:border-foreground"
          />
        </div>
      </div>

      {!hydrated ? (
        <div className="h-48 bg-surface rounded-md border border-border-faint animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border-faint rounded-md py-16 text-center">
          <p className="text-sm text-subtle">
            {docs.length === 0
              ? "No documents yet - drop a file above to get started."
              : "No documents match these filters."}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border-faint rounded-md overflow-x-auto">
          <Table>
            <THead>
              <TR hover={false}>
                <TH>Name</TH>
                <TH>Category</TH>
                <TH>Date</TH>
                <TH>Tags</TH>
                <TH align="right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((doc) => (
                <TR key={doc.id}>
                  <TD className="max-w-[280px]">
                    <button
                      onClick={() => openDoc(doc)}
                      className="text-foreground hover:underline truncate text-left block max-w-full"
                    >
                      {doc.name}
                    </button>
                  </TD>
                  <TD>
                    <Badge tone="neutral">{DOCUMENT_CATEGORY_LABELS[doc.category]}</Badge>
                  </TD>
                  <TD className="text-muted">
                    {doc.document_date ? <Num>{fmtDateUK(doc.document_date)}</Num> : ""}
                  </TD>
                  <TD className="text-muted truncate max-w-[200px]">
                    {doc.tags.length > 0 ? doc.tags.join(", ") : ""}
                  </TD>
                  <TD align="right">
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-1.5 text-subtle hover:text-status-late transition-colors"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {showAdd && pendingFile && (
        <div className="fixed inset-0 bg-background/70 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-faint rounded-md w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">
                Tag this document
              </h3>
              <button
                onClick={resetAdd}
                className="p-1 text-subtle hover:text-foreground"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>
            <p className="text-sm text-subtle mb-4 truncate">{pendingFile.name}</p>

            <div className="space-y-4">
              <div>
                <label className={fieldLabelClass}>Category</label>
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
                <label className={fieldLabelClass}>Document date</label>
                <input
                  type="date"
                  value={pendingDate}
                  onChange={(e) => setPendingDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={fieldLabelClass}>Tags (comma separated)</label>
                <input
                  type="text"
                  value={pendingTags}
                  onChange={(e) => setPendingTags(e.target.value)}
                  placeholder="e.g. barclays, 2026-q1"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={fieldLabelClass}>Notes (optional)</label>
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
                className="px-3 py-2 text-xs text-subtle hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveDocument}
                className="px-4 py-2 bg-foreground text-background text-xs font-medium rounded-md hover:opacity-90"
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
