"use client";

import { useState, useMemo, useEffect } from "react";
import { PORTFOLIO_CATEGORIES, type PortfolioProject, type PortfolioSlice } from "@/lib/portfolio-v2/types";
import { ModalPortal } from "@/components/modal-portal";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function PortfolioGrid({ projects }: { projects: PortfolioProject[] }) {
  const [active, setActive] = useState<string>("All");
  const [openProject, setOpenProject] = useState<PortfolioProject | null>(null);

  useEffect(() => {
    if (!openProject) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenProject(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openProject]);

  const categories = useMemo(() => {
    const present = new Set(projects.map((p) => p.category).filter(Boolean) as string[]);
    return ["All", ...PORTFOLIO_CATEGORIES.filter((c) => present.has(c))];
  }, [projects]);

  const filtered = active === "All" ? projects : projects.filter((p) => p.category === active);

  return (
    <>
      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 border-b border-[#EDEDEF] sticky top-0 bg-white z-10">
        <div className="flex gap-6 md:gap-8 overflow-x-auto -mb-px">
          {categories.map((c) => {
            const isActive = c === active;
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`shrink-0 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  isActive
                    ? "text-[#1B1B1B] border-[#1B1B1B]"
                    : "text-[#A0A0A0] border-transparent hover:text-[#1B1B1B]"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <p className="max-w-7xl mx-auto px-6 md:px-10 pt-6 text-[11px] uppercase tracking-wider text-[#A0A0A0]">
        Click any thumbnail to view the full design →
      </p>

      <section className="max-w-7xl mx-auto px-6 md:px-10 py-6 pb-24">
        {filtered.length === 0 ? (
          <div className="text-[#A0A0A0] text-sm border border-dashed border-[#EDEDEF] rounded-2xl p-16 text-center">
            No projects in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3">
            {filtered.map((p) => {
              const thumb = p.mobile_slices[0] ?? p.desktop_slices[0];
              return (
                <button
                  key={p.id}
                  onClick={() => setOpenProject(p)}
                  className="group relative block aspect-[9/19] overflow-hidden rounded-lg bg-[#F5F5F7] border border-[#EDEDEF] text-left"
                >
                  {thumb && (
                    <img
                      src={thumb.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] font-semibold px-2.5 py-1 bg-white text-[#1B1B1B] rounded-full">
                      View →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {openProject && (
        <ModalPortal>
          <ProjectModal project={openProject} onClose={() => setOpenProject(null)} />
        </ModalPortal>
      )}
    </>
  );
}

function ProjectModal({ project, onClose }: { project: PortfolioProject; onClose: () => void }) {
  const hasMobile = project.mobile_slices.length > 0;
  const hasDesktop = project.desktop_slices.length > 0;
  const [mode, setMode] = useState<"desktop" | "mobile">(hasDesktop ? "desktop" : "mobile");
  const slices = mode === "desktop" ? project.desktop_slices : project.mobile_slices;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div
        className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-white font-semibold text-sm md:text-base truncate">{project.name}</h2>
          {project.category && (
            <span className="text-[10px] uppercase tracking-wider text-white/50 hidden md:inline">
              {project.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasDesktop && hasMobile && (
            <div className="inline-flex items-center gap-1 p-1 bg-white/10 rounded-full">
              <button
                onClick={() => setMode("desktop")}
                className={`px-3 md:px-4 py-1 text-[11px] font-semibold rounded-full transition-colors ${
                  mode === "desktop" ? "bg-white text-[#0A0A0B]" : "text-white/70 hover:text-white"
                }`}
              >
                Desktop
              </button>
              <button
                onClick={() => setMode("mobile")}
                className={`px-3 md:px-4 py-1 text-[11px] font-semibold rounded-full transition-colors ${
                  mode === "mobile" ? "bg-white text-[#0A0A0B]" : "text-white/70 hover:text-white"
                }`}
              >
                Mobile
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`mx-auto py-6 ${mode === "mobile" ? "max-w-[420px] px-4" : "max-w-5xl px-4"}`}>
          {slices.map((slice, i) => (
            <ModalSlice key={`${mode}-${i}`} slice={slice} eager={i < 2} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModalSlice({ slice, eager }: { slice: PortfolioSlice; eager: boolean }) {
  return (
    <div
      className="relative w-full overflow-hidden bg-white/5"
      style={{
        aspectRatio: `${slice.width} / ${slice.height}`,
        backgroundImage: slice.blur ? `url(${slice.blur})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slice.url}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="block w-full h-full object-cover"
      />
    </div>
  );
}
