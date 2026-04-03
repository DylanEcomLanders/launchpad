"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PlusIcon, ArrowLeftIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass } from "@/lib/form-styles";
import { useRole } from "@/components/auth-gate";
import { getSOPs, createSOP, updateSOP, deleteSOP } from "@/lib/sop/data";
import { SOP_CATEGORIES, type SOP, type SOPCategory } from "@/lib/sop/types";
import { isLoomUrl, toLoomEmbed } from "@/lib/portal/loom";

/* ── Simple markdown → HTML ── */
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3 class='text-sm font-bold text-[#1A1A1A] mt-4 mb-1'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='text-base font-bold text-[#1A1A1A] mt-5 mb-2'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='text-lg font-bold text-[#1A1A1A] mt-6 mb-2'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class='px-1 py-0.5 bg-[#F3F3F5] rounded text-[12px] font-mono'>$1</code>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc text-[13px] text-[#555] leading-relaxed'>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class='ml-4 list-decimal text-[13px] text-[#555] leading-relaxed'>$2</li>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

function readTime(content: string): number {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

function categoryConfig(cat: SOPCategory) {
  return SOP_CATEGORIES.find((c) => c.key === cat) || SOP_CATEGORIES[0];
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
  const [formLoom, setFormLoom] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formDraft, setFormDraft] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getSOPs();
    setSOPs(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtered SOPs — hide drafts for non-admins
  const filtered = useMemo(() => {
    let result = sops;
    if (!isAdmin) {
      result = result.filter((s) => !s.draft);
    }
    if (categoryFilter !== "all") {
      result = result.filter((s) => s.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sops, categoryFilter, search, isAdmin]);

  const selected = selectedId ? sops.find((s) => s.id === selectedId) : null;

  // Reset form
  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormCategory("operations");
    setFormTags("");
    setFormLoom("");
    setFormContent("");
    setFormDraft(true);
    setEditingId(null);
  };

  // Open create form
  const openCreate = () => {
    resetForm();
    setShowForm(true);
    setSelectedId(null);
  };

  // Open edit form
  const openEdit = (sop: SOP) => {
    setFormTitle(sop.title);
    setFormDesc(sop.description);
    setFormCategory(sop.category);
    setFormTags(sop.tags.join(", "));
    setFormLoom(sop.loomUrl || "");
    setFormContent(sop.content);
    setFormDraft(sop.draft ?? false);
    setEditingId(sop.id);
    setShowForm(true);
    setSelectedId(null);
  };

  // Save
  const handleSave = async () => {
    if (!formTitle.trim()) return;
    const now = new Date().toISOString();
    const tags = formTags.split(",").map((t) => t.trim()).filter(Boolean);

    if (editingId) {
      await updateSOP(editingId, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCategory,
        tags,
        loomUrl: formLoom.trim() || undefined,
        content: formContent,
        draft: formDraft,
        updated_at: now,
      });
    } else {
      const sop: SOP = {
        id: crypto.randomUUID(),
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCategory,
        tags,
        loomUrl: formLoom.trim() || undefined,
        content: formContent,
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

  // Delete
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

  // Detail view
  if (selected) {
    const cat = categoryConfig(selected.category);
    const loomEmbed = selected.loomUrl ? toLoomEmbed(selected.loomUrl) : null;

    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#7A7A7A] hover:text-[#1A1A1A] transition-colors mb-6"
        >
          <ArrowLeftIcon className="size-3" />
          All SOPs
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{selected.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: cat.color + "18", color: cat.color }}>
              {cat.label}
            </span>
            <span className="text-xs text-[#AAA]">{readTime(selected.content)} min read</span>
            <span className="text-xs text-[#AAA]">Updated {new Date(selected.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            {selected.loomUrl && <span className="text-xs text-[#AAA]">Loom attached</span>}
          </div>
          {selected.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selected.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 text-[10px] font-medium text-[#777] bg-[#F3F3F5] rounded-full">{t}</span>
              ))}
            </div>
          )}
          {selected.description && (
            <p className="text-sm text-[#555] mt-3 leading-relaxed">{selected.description}</p>
          )}
        </div>

        {/* Loom embed */}
        {loomEmbed && (
          <div className="mb-6 rounded-xl overflow-hidden border border-[#E5E5EA]">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe src={loomEmbed} className="absolute inset-0 w-full h-full border-0" allowFullScreen />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white border border-[#E5E5EA] rounded-xl p-6">
          <div
            className="text-[13px] text-[#333] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.content) }}
          />
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={async () => {
                await updateSOP(selected.id, { draft: !selected.draft, updated_at: new Date().toISOString() });
                load();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg ${
                selected.draft ? "bg-emerald-500 text-white hover:bg-emerald-600" : "text-amber-600 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              {selected.draft ? "Publish" : "Unpublish"}
            </button>
            <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#777] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5]">
              <PencilIcon className="size-3" /> Edit
            </button>
            <button
              onClick={() => handleDelete(selected.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg ${
                confirmDelete === selected.id ? "bg-red-500 text-white" : "text-red-400 border border-red-100 hover:bg-red-50"
              }`}
            >
              <TrashIcon className="size-3" /> {confirmDelete === selected.id ? "Confirm Delete" : "Delete"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Create/Edit form
  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <button onClick={() => { setShowForm(false); resetForm(); }} className="flex items-center gap-1.5 text-xs font-medium text-[#7A7A7A] hover:text-[#1A1A1A] transition-colors mb-6">
          <ArrowLeftIcon className="size-3" /> Cancel
        </button>

        <h1 className="text-xl font-bold tracking-tight mb-6">{editingId ? "Edit SOP" : "New SOP"}</h1>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Title *</label>
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className={inputClass} placeholder="How to..." />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className={inputClass} placeholder="Brief summary of what this SOP covers" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as SOPCategory)} className={inputClass}>
                {SOP_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tags (comma-separated)</label>
              <input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)} className={inputClass} placeholder="portal, setup, client" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Loom URL (optional)</label>
            <input type="url" value={formLoom} onChange={(e) => setFormLoom(e.target.value)} className={inputClass} placeholder="https://www.loom.com/share/..." />
            {formLoom && isLoomUrl(formLoom) && (
              <div className="mt-2 rounded-lg overflow-hidden border border-[#E5E5EA]">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe src={toLoomEmbed(formLoom) || ""} className="absolute inset-0 w-full h-full border-0" allowFullScreen />
                </div>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Content (Markdown supported)</label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className={inputClass + " min-h-[300px] font-mono text-[13px]"}
              placeholder={"## Steps\n\n1. First step\n2. Second step\n3. Third step\n\n**Important:** Don't forget to...\n\n- Tip: You can use markdown\n- Tip: Use headers to organise sections"}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!formTitle.trim()}
              className="px-5 py-2.5 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
            >
              {formDraft ? (editingId ? "Save Draft" : "Create as Draft") : (editingId ? "Save & Publish" : "Create & Publish")}
            </button>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!formDraft}
                onChange={(e) => setFormDraft(!e.target.checked)}
                className="size-3.5 rounded border-[#CCC] text-[#1B1B1B] focus:ring-0"
              />
              <span className="text-xs text-[#777]">Publish immediately</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SOP Library</h1>
          <p className="text-xs text-[#7A7A7A] mt-1">{sops.length} process{sops.length !== 1 ? "es" : ""} documented</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D]">
            <PlusIcon className="size-3.5" /> New SOP
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#CCC]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SOPs..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#CCC]"
        />
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
            categoryFilter === "all" ? "bg-[#1A1A1A] text-white" : "bg-[#F3F3F5] text-[#777] hover:bg-[#E5E5EA]"
          }`}
        >
          All
        </button>
        {SOP_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategoryFilter(c.key)}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
              categoryFilter === c.key ? "text-white" : "text-[#777] hover:bg-[#E5E5EA]"
            }`}
            style={categoryFilter === c.key ? { background: c.color } : { background: "#F3F3F5" }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin size-5 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="border-2 border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <p className="text-sm text-[#AAA]">{search ? "No SOPs match your search" : "No SOPs yet"}</p>
          {isAdmin && !search && <p className="text-xs text-[#CCC] mt-1">Create your first SOP to get started</p>}
        </div>
      )}

      {/* SOP list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((sop) => {
            const cat = categoryConfig(sop.category);
            return (
              <button
                key={sop.id}
                onClick={() => setSelectedId(sop.id)}
                className="w-full text-left p-4 border border-[#E5E5EA] rounded-xl bg-white hover:border-[#999] transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1A1A1A] group-hover:underline truncate">{sop.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: cat.color + "18", color: cat.color }}>
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-[#AAA]">{readTime(sop.content)} min read</span>
                      {sop.loomUrl && <span className="text-[10px] text-[#AAA]">Loom</span>}
                      {sop.draft && <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">Draft</span>}
                    </div>
                    {sop.description && <p className="text-xs text-[#777] mt-1.5 line-clamp-1">{sop.description}</p>}
                  </div>
                  <svg className="size-4 text-[#DDD] group-hover:text-[#1A1A1A] transition-colors shrink-0 mt-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
