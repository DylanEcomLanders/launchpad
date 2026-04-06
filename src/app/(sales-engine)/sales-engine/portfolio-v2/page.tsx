"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ModalPortal } from "@/components/modal-portal";
import { inputClass, labelClass } from "@/lib/form-styles";
import { PORTFOLIO_CATEGORIES, type PortfolioProject } from "@/lib/portfolio-v2/types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PortfolioV2AdminPage() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    category: PORTFOLIO_CATEGORIES[0] as string,
    desktopFrameUrl: "",
    mobileFrameUrl: "",
  });

  const slugEdited = form.slug && form.slug !== slugify(form.name);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio-v2");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      slug: "",
      category: PORTFOLIO_CATEGORIES[0],
      desktopFrameUrl: "",
      mobileFrameUrl: "",
    });
    setError(null);
    setProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProgress("Fetching from Figma...");

    try {
      setProgress("Slicing images and uploading...");
      const res = await fetch("/api/portfolio-v2/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || slugify(form.name),
          category: form.category,
          desktopFrameUrl: form.desktopFrameUrl,
          mobileFrameUrl: form.mobileFrameUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setProgress("Done!");
      setModalOpen(false);
      resetForm();
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setProgress(null);
    }
  };

  const handleResync = async (project: PortfolioProject) => {
    if (!confirm(`Re-sync "${project.name}" from Figma?`)) return;
    setProgress(`Re-syncing ${project.name}...`);
    try {
      const base = `https://www.figma.com/design/${project.figma_file_key}/x`;
      const desktopFrameUrl = `${base}?node-id=${(project.figma_desktop_node_id ?? "").replace(/:/g, "-")}`;
      const mobileFrameUrl = project.figma_mobile_node_id
        ? `${base}?node-id=${project.figma_mobile_node_id.replace(/:/g, "-")}`
        : undefined;
      const res = await fetch("/api/portfolio-v2/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          slug: project.slug,
          category: project.category,
          desktopFrameUrl,
          mobileFrameUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resync failed");
      await loadProjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Resync failed");
    } finally {
      setProgress(null);
    }
  };

  const handleDelete = async (project: PortfolioProject) => {
    if (!confirm(`Delete "${project.name}"? This removes storage files too.`)) return;
    try {
      const res = await fetch(`/api/portfolio-v2?id=${encodeURIComponent(project.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await loadProjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1B1B1B]">Portfolio v2 (Beta)</h1>
          <p className="text-sm text-[#7A7A7A] mt-1">
            Pull design screenshots from Figma, auto-slice, and serve.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
        >
          Add Project
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[#7A7A7A]">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-sm text-[#7A7A7A] border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          No projects yet. Click &ldquo;Add Project&rdquo; to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-[#EDEDEF] rounded-xl p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-semibold text-[#1B1B1B]">{p.name}</h3>
                  {p.client && (
                    <p className="text-xs text-[#7A7A7A] mt-0.5">{p.client}</p>
                  )}
                </div>
                <Link
                  href={`/portfolio-v2/${p.slug}`}
                  target="_blank"
                  className="text-xs font-semibold text-[#1B1B1B] hover:underline"
                >
                  View →
                </Link>
              </div>
              {p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] uppercase tracking-wide px-2 py-0.5 bg-[#F5F5F7] text-[#7A7A7A] rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs text-[#7A7A7A] mb-3">
                {p.desktop_slices.length} desktop / {p.mobile_slices.length} mobile slices
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResync(p)}
                  className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-md hover:bg-[#F5F5F7]"
                >
                  Re-sync
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-md hover:bg-[#F5F5F7] text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-white border-b border-[#EDEDEF] px-6 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-[#1B1B1B]">New Portfolio Project</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-[#7A7A7A] hover:text-[#1B1B1B] text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className={labelClass}>Project Name</label>
                  <input
                    required
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({
                        ...f,
                        name,
                        slug: slugEdited ? f.slug : slugify(name),
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className={labelClass}>Slug</label>
                  <input
                    required
                    className={inputClass}
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    className={inputClass}
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {PORTFOLIO_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Desktop Frame URL</label>
                  <input
                    required
                    className={inputClass}
                    value={form.desktopFrameUrl}
                    onChange={(e) => setForm((f) => ({ ...f, desktopFrameUrl: e.target.value }))}
                    placeholder="https://www.figma.com/design/ABC123/Portfolio?node-id=4-567"
                  />
                  <p className="text-[11px] text-[#A0A0A0] mt-1">
                    Right-click frame in Figma → Copy link to selection
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Mobile Frame URL (optional)</label>
                  <input
                    className={inputClass}
                    value={form.mobileFrameUrl}
                    onChange={(e) => setForm((f) => ({ ...f, mobileFrameUrl: e.target.value }))}
                    placeholder="https://www.figma.com/design/ABC123/Portfolio?node-id=4-890"
                  />
                </div>

                {progress && (
                  <div className="text-sm text-[#1B1B1B] bg-[#F5F5F7] rounded-lg px-4 py-3">
                    {progress}
                  </div>
                )}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F7]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!!progress}
                    className="px-4 py-2 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] disabled:opacity-50"
                  >
                    {progress ? "Working..." : "Sync from Figma"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
