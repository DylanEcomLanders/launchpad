"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModalPortal } from "@/components/modal-portal";
import { inputClass, labelClass } from "@/lib/form-styles";
import {
  PencilSquareIcon,
  EyeIcon,
  TrashIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import type { CaseStudy } from "@/lib/case-studies/types";
import { getCaseStudies, saveCaseStudy } from "@/lib/case-studies/data";
import { makeEmptyCaseStudy, slugify, duplicateCaseStudy } from "@/lib/case-studies/template";

export default function CaseStudiesIndex() {
  const router = useRouter();
  const [studies, setStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/case-studies");
      const data = await res.json();
      setStudies(data.studies ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const finalSlug = slugify(newSlug || newName);
    if (!finalSlug) {
      setError("Slug required");
      return;
    }
    if (studies.some((s) => s.slug === finalSlug)) {
      setError("Slug already taken");
      return;
    }
    setCreating(true);
    try {
      const fresh = makeEmptyCaseStudy(finalSlug);
      fresh.meta.brandName = newName;
      await saveCaseStudy(fresh);
      router.push(`/case-studies/${finalSlug}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setCreating(false);
    }
  };

  const handleDuplicate = async (study: CaseStudy) => {
    const newSlug = slugify(`${study.slug}-copy`);
    try {
      const copy = duplicateCaseStudy(study, newSlug);
      await saveCaseStudy(copy);
      router.push(`/case-studies/${newSlug}/edit`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Duplicate failed");
    }
  };

  const handleDelete = async (study: CaseStudy) => {
    if (!confirm(`Delete "${study.meta.brandName || study.slug}"? Removes storage files too.`)) return;
    try {
      const res = await fetch(`/api/case-studies?id=${encodeURIComponent(study.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1B1B1B]">Case Studies</h1>
          <p className="text-sm text-[#7A7A7A] mt-1">
            Editorial sales pages with structured proof artifacts.
          </p>
        </div>
        <button
          onClick={() => {
            setNewSlug("");
            setNewName("");
            setError(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
        >
          New case study
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[#7A7A7A]">Loading…</div>
      ) : studies.length === 0 ? (
        <div className="text-sm text-[#7A7A7A] border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          No case studies yet. Click <span className="font-semibold">New case study</span> to start.
        </div>
      ) : (
        <div className="bg-white border border-[#EDEDEF] rounded-xl shadow-[var(--shadow-soft)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFB] border-b border-[#EDEDEF]">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
                <th className="px-5 py-3">Brand</th>
                <th className="px-5 py-3">Headline</th>
                <th className="px-5 py-3">Tests</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {studies.map((s) => (
                <tr key={s.id} className="border-b border-[#F3F3F5] last:border-0 hover:bg-[#FAFAFB]">
                  <td className="px-5 py-3">
                    <Link
                      href={`/case-studies/${s.slug}/edit`}
                      className="font-semibold text-[#1B1B1B] hover:underline"
                    >
                      {s.meta.brandName || s.slug}
                    </Link>
                    <div className="text-[10px] text-[#A0A0A0] font-mono mt-0.5">/{s.slug}</div>
                  </td>
                  <td className="px-5 py-3 text-[#7A7A7A] max-w-xs truncate">
                    {s.hero.headline || "—"}
                  </td>
                  <td className="px-5 py-3 text-[#7A7A7A] tabular-nums">
                    {s.results.tests.length}
                  </td>
                  <td className="px-5 py-3">
                    {s.settings.published ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        Published
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 bg-[#F3F3F5] text-[#7A7A7A] rounded-full">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[11px] text-[#A0A0A0]">
                    {new Date(s.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/case-studies/${s.slug}/edit`}
                        className="p-1.5 text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-[#F3F3F5] rounded transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="size-4" />
                      </Link>
                      <Link
                        href={`/case-studies/${s.slug}${s.settings.published ? "" : "?draft=1"}`}
                        target="_blank"
                        className="p-1.5 text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-[#F3F3F5] rounded transition-colors"
                        title="View"
                      >
                        <EyeIcon className="size-4" />
                      </Link>
                      <button
                        onClick={() => handleDuplicate(s)}
                        className="p-1.5 text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-[#F3F3F5] rounded transition-colors"
                        title="Duplicate"
                      >
                        <DocumentDuplicateIcon className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-1.5 text-[#7A7A7A] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="border-b border-[#EDEDEF] px-6 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-[#1B1B1B]">New case study</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-[#7A7A7A] hover:text-[#1B1B1B] text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className={labelClass}>Brand name</label>
                  <input
                    required
                    autoFocus
                    className={inputClass}
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (!newSlug) {
                        // Live-derive slug until user manually edits it
                        setNewSlug(slugify(e.target.value));
                      }
                    }}
                    placeholder="Acme Skincare"
                  />
                </div>
                <div>
                  <label className={labelClass}>Slug</label>
                  <input
                    required
                    className={inputClass}
                    value={newSlug}
                    onChange={(e) => setNewSlug(slugify(e.target.value))}
                    placeholder="acme-skincare"
                  />
                  <p className="text-[10px] text-[#A0A0A0] mt-1">
                    Public URL: ecomlanders.com/work/{newSlug || "your-slug"}
                  </p>
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>
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
                    disabled={creating}
                    className="px-4 py-2 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] disabled:opacity-50"
                  >
                    {creating ? "Creating…" : "Create & edit"}
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
