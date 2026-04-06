"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PORTFOLIO_CATEGORIES, type PortfolioProject } from "@/lib/portfolio-v2/types";

export default function PortfolioGrid({ projects }: { projects: PortfolioProject[] }) {
  const [active, setActive] = useState<string>("All");

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
                <Link
                  key={p.id}
                  href={`/portfolio-v2/${p.slug}`}
                  className="group relative block aspect-[9/19] overflow-hidden rounded-lg bg-[#F5F5F7] border border-[#EDEDEF]"
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
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
