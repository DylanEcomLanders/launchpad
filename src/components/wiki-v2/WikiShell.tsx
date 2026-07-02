"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { WikiSection } from "@/lib/wiki-v2/data";

interface Props {
  sections: WikiSection[];
  children: React.ReactNode;
}

/* Secondary left rail for the wiki — sits inside the main content card.
 * Holds the full page tree + a search input that filters by title in place.
 * Active page is derived from the URL via usePathname so the rail tracks
 * navigation without needing to thread state through pages. */
export function WikiShell({ sections, children }: Props) {
  const pathname = usePathname();
  const activeSlug = pathname.startsWith("/wiki-v2/")
    ? pathname.replace("/wiki-v2/", "")
    : null;

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return sections;
    const q = query.toLowerCase();
    return sections
      .map((section) => {
        const directPages = section.pages.filter((p) =>
          p.title.toLowerCase().includes(q),
        );
        const subsections = section.subsections
          .map((sub) => ({
            ...sub,
            pages: sub.pages.filter((p) => p.title.toLowerCase().includes(q)),
          }))
          .filter((sub) => sub.pages.length > 0);
        return { ...section, pages: directPages, subsections };
      })
      .filter((s) => s.pages.length > 0 || s.subsections.length > 0);
  }, [sections, query]);

  return (
    <div className="flex overflow-hidden h-[calc(100dvh-4.5rem)] md:h-[calc(100dvh-1rem)]">
      {/* Wiki nav rail */}
      <aside className="w-64 shrink-0 bg-background border-r border-border flex flex-col overflow-hidden">
        {/* Search */}
        <div className="px-4 py-4 border-b border-border">
          <div className="relative">
            <MagnifyingGlassIcon className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search wiki..."
              className="w-full pl-8 pr-3 py-2 text-[12px] bg-surface border border-border rounded-md focus:outline-none focus:border-white placeholder:text-subtle"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href="/wiki-v2"
            className={`relative block px-2.5 py-1.5 mb-5 text-[12px] rounded-md transition-colors ${
              !activeSlug
                ? "text-foreground font-semibold bg-surface shadow-[var(--shadow-soft)]"
                : "text-[#5F6066] hover:text-foreground hover:bg-surface"
            }`}
          >
            {!activeSlug && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r bg-surface"
              />
            )}
            Overview
          </Link>

          {filtered.map((section, sectionIdx) => {
            /* Subsection rendering kicks in only when a section is dense
             * enough to need it: at least one subsection has 2+ pages.
             * Otherwise the section flattens to a simple numbered list. */
            const useSubsections =
              section.subsections.length > 0 &&
              section.subsections.some((s) => s.pages.length >= 2);

            const flatPages = [
              ...section.pages,
              ...section.subsections.flatMap((s) => s.pages),
            ].sort((a, b) => a.order - b.order);

            return (
              <div
                key={section.name}
                className={`mb-5 ${sectionIdx > 0 ? "pt-5 border-t border-border" : ""}`}
              >
                <div className="px-2.5 mb-2 text-[13px] font-semibold text-foreground">
                  {section.name}
                </div>

                {useSubsections ? (
                  <>
                    {/* Direct pages (no subsection) first */}
                    {section.pages.length > 0 && (
                      <div className="space-y-0.5 mb-3">
                        {section.pages.map((page, idx) => (
                          <PageLink
                            key={page.slug}
                            slug={page.slug}
                            title={page.title}
                            active={activeSlug === page.slug}
                            number={String(idx + 1).padStart(2, "0")}
                          />
                        ))}
                      </div>
                    )}
                    {/* Subsection groups */}
                    {section.subsections.map((sub) => (
                      <div key={sub.name} className="mb-3">
                        <div className="px-2.5 mb-1 text-[12px] text-subtle">
                          {sub.name}
                        </div>
                        <div className="space-y-0.5">
                          {sub.pages.map((page, idx) => (
                            <PageLink
                              key={page.slug}
                              slug={page.slug}
                              title={page.title}
                              active={activeSlug === page.slug}
                              number={String(idx + 1).padStart(2, "0")}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="space-y-0.5">
                    {flatPages.map((page, pageIdx) => (
                      <PageLink
                        key={page.slug}
                        slug={page.slug}
                        title={page.title}
                        active={activeSlug === page.slug}
                        number={String(pageIdx + 1).padStart(2, "0")}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-[12px] text-subtle px-2.5 py-4 text-center">
              No matches for &ldquo;{query}&rdquo;
            </p>
          )}
        </nav>
      </aside>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto bg-surface">{children}</div>
    </div>
  );
}

function PageLink({
  slug,
  title,
  active,
  number,
}: {
  slug: string;
  title: string;
  active: boolean;
  number?: string;
}) {
  return (
    <Link
      href={`/wiki-v2/${slug}`}
      className={`relative flex items-baseline gap-2 py-1.5 px-2.5 text-[12px] rounded-md transition-colors ${
        active
          ? "text-foreground font-semibold bg-surface shadow-[var(--shadow-soft)]"
          : "text-[#5F6066] hover:text-foreground hover:bg-surface"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r bg-surface"
        />
      )}
      {number && (
        <span
          aria-hidden
          className={`font-mono text-[10px] tabular-nums tracking-wider shrink-0 ${
            active ? "text-[#9A9A9F]" : "text-muted"
          }`}
        >
          {number}
        </span>
      )}
      <span className="truncate">{title}</span>
    </Link>
  );
}
