/* ── Case studies index ──
 * Public showcase listing for every PUBLISHED case study. Single
 * shareable URL (ecomlanders.app/case-studies) instead of N per-study
 * links. Each card click → /case-studies/[slug].
 *
 * Server-rendered; pulls only published studies via getPublishedCaseStudies.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { getPublishedCaseStudies } from "@/lib/case-studies/data";
import type { CaseStudy } from "@/lib/case-studies/types";
import { PROJECT_TYPE_LABELS } from "@/lib/case-studies/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Case studies — Ecomlanders",
  description:
    "Conversion case studies — bigger AOV, higher CVR, compounded MRR. Selected work from the Ecomlanders Conversion Engine.",
};

export default async function CaseStudiesIndexPage() {
  const studies = await getPublishedCaseStudies();
  // Newest first by updated_at (falls back to created_at).
  const sorted = [...studies].sort((a, b) => {
    const ta = new Date(a.updated_at || a.created_at).getTime();
    const tb = new Date(b.updated_at || b.created_at).getTime();
    return tb - ta;
  });

  return (
    <div className="min-h-screen bg-white text-[#1B1B1B]">
      {/* Header — matches portfolio-v2 */}
      <header className="border-b border-[#EDEDEF]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between">
          <Link href="/" className="text-[#1B1B1B]" aria-label="Ecom Landers">
            <Logo height={22} />
          </Link>
          <Link
            href="/audit"
            className="text-xs md:text-sm font-semibold px-4 py-2 bg-[#1B1B1B] text-white rounded-full hover:bg-[#2D2D2D] transition-colors"
          >
            Free audit
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] mb-5">
          Case studies
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-[56px] font-semibold tracking-tight leading-[1.05] max-w-3xl">
          Conversion engine in action.
        </h1>
        <p className="text-[#5A5A5A] text-base md:text-lg mt-5 max-w-2xl leading-relaxed">
          Real brands, real numbers. Each study walks through the funnel we inherited, the
          system we shipped, and the compounded outcome — MRR, AOV, conversion rate, the
          lot.
        </p>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-20">
        {sorted.length === 0 ? (
          <div className="border border-dashed border-[#EDEDEF] rounded-xl py-20 text-center">
            <p className="text-sm text-[#7A7A7A]">No published case studies yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {sorted.map((study) => (
              <CaseStudyCard key={study.id} study={study} />
            ))}
          </div>
        )}
      </section>

      {/* Closing CTA */}
      <section className="border-t border-[#EDEDEF]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
          <div className="bg-[#1B1B1B] text-white rounded-2xl p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10">
            <div className="md:flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60 mb-3">
                Ready to start?
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-[1.15]">
                Want to see the same play run on your funnel?
              </h2>
              <p className="text-white/70 text-sm md:text-base mt-3 max-w-xl leading-relaxed">
                Get a free 15-min audit — we&apos;ll mark the leaks on a Loom and tell you
                whether we can help.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:flex-shrink-0 md:min-w-[260px]">
              <Link
                href="/audit"
                className="flex items-center justify-center px-5 py-3 bg-white text-[#1B1B1B] text-sm font-semibold rounded-lg hover:bg-[#F3F3F5] transition-colors whitespace-nowrap"
              >
                Get a free audit
                <span className="ml-2">↗</span>
              </Link>
              <Link
                href="https://cal.com/dylanevans"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-5 py-3 border border-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/5 transition-colors whitespace-nowrap"
              >
                Book a call
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Per-study card ──
 * Visual: thumbnail (uses results.screenshots[0] if any, else hero.image,
 * else hero.collageImages[0], else a coloured fallback). Below thumb:
 * brand name, optional industry pill, hero headline, top headline stat
 * if available, "View case study →" CTA. Whole card is clickable. */
function CaseStudyCard({ study }: { study: CaseStudy }) {
  const thumb =
    study.results.screenshots[0] ||
    study.hero.image ||
    study.hero.collageImages?.[0] ||
    null;
  const topStat = study.headlineStats[0];
  const accent = study.settings.brandColor || "#1B1B1B";

  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className="group block bg-white border border-[#EDEDEF] rounded-2xl overflow-hidden hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)] hover:border-[#D5D5D8] transition-all"
    >
      {/* Thumbnail */}
      <div
        className="relative w-full aspect-[16/10] bg-[#F7F8FA] border-b border-[#EDEDEF] overflow-hidden"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb.url}
            alt={thumb.alt || study.meta.brandName}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `${accent}10` }}
          >
            <span
              className="text-3xl md:text-4xl font-semibold tracking-tight"
              style={{ color: accent }}
            >
              {study.meta.brandName || "Untitled"}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 md:p-7">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-sm font-semibold text-[#1B1B1B]">
            {study.meta.brandName || "Untitled brand"}
          </span>
          {study.meta.industry && (
            <>
              <span className="text-[#D5D5D8]">·</span>
              <span className="text-xs text-[#7A7A7A]">{study.meta.industry}</span>
            </>
          )}
          <span className="text-[#D5D5D8]">·</span>
          <span className="text-xs text-[#7A7A7A]">
            {PROJECT_TYPE_LABELS[study.meta.projectType]}
          </span>
        </div>

        <h2 className="text-xl md:text-2xl font-semibold tracking-tight leading-[1.2] text-[#1B1B1B]">
          {study.hero.headline || "Untitled case study"}
        </h2>

        {topStat && (
          <div className="mt-5 inline-flex items-baseline gap-2 px-3 py-1.5 bg-[#F0F9F2] rounded-full">
            <span className="text-base font-semibold" style={{ color: "#1F7A3D" }}>
              {topStat.value}
            </span>
            <span className="text-xs text-[#5A5A5A]">{topStat.label}</span>
          </div>
        )}

        <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-[#1B1B1B]">
          View case study
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </Link>
  );
}
