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
import { getShowcaseSettings } from "@/lib/case-studies/showcase-settings";
import type { CaseStudy } from "@/lib/case-studies/types";
import { PROJECT_TYPE_LABELS } from "@/lib/case-studies/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Case studies — Ecomlanders",
  description:
    "Conversion case studies — bigger AOV, higher CVR, compounded MRR. Selected work from the Ecomlanders Conversion Engine.",
};

export default async function CaseStudiesIndexPage() {
  const [studies, settings] = await Promise.all([
    getPublishedCaseStudies(),
    getShowcaseSettings(),
  ]);
  // Newest first by updated_at (falls back to created_at).
  const sorted = [...studies].sort((a, b) => {
    const ta = new Date(a.updated_at || a.created_at).getTime();
    const tb = new Date(b.updated_at || b.created_at).getTime();
    return tb - ta;
  });

  return (
    <div className="min-h-screen bg-surface text-foreground">
      {/* Header — matches portfolio-v2 */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between">
          <Link href="/" className="text-foreground" aria-label="Ecom Landers">
            <Logo height={22} />
          </Link>
          <Link
            href={settings.headerCtaHref}
            className="text-xs md:text-sm font-semibold px-4 py-2 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors"
          >
            {settings.headerCtaLabel}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-5">
          {settings.eyebrow}
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-[56px] font-semibold tracking-tight leading-[1.05] max-w-3xl">
          {settings.headline}
        </h1>
        <p className="text-subtle text-base md:text-lg mt-5 max-w-2xl leading-relaxed whitespace-pre-line">
          {settings.subhead}
        </p>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-20">
        {sorted.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-20 text-center">
            <p className="text-sm text-subtle">No published case studies yet.</p>
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
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
          <div className="bg-foreground text-background rounded-2xl p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10">
            <div className="md:flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-background/60 mb-3">
                Ready to start?
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-[1.15]">
                {settings.closingHeadline}
              </h2>
              {settings.closingSubhead && (
                <p className="text-background/70 text-sm md:text-base mt-3 max-w-xl leading-relaxed whitespace-pre-line">
                  {settings.closingSubhead}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 md:flex-shrink-0 md:min-w-[260px]">
              <Link
                href={settings.primaryCtaHref}
                className="flex items-center justify-center px-5 py-3 bg-background text-foreground text-sm font-semibold rounded-lg hover:bg-surface-raised transition-colors whitespace-nowrap"
              >
                {settings.primaryCtaLabel}
                <span className="ml-2">↗</span>
              </Link>
              {settings.secondaryCtaLabel && settings.secondaryCtaHref && (
                <Link
                  href={settings.secondaryCtaHref}
                  target={settings.secondaryCtaHref.startsWith("http") ? "_blank" : undefined}
                  rel={settings.secondaryCtaHref.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex items-center justify-center px-5 py-3 border border-background/20 text-background text-sm font-semibold rounded-lg hover:bg-background/5 transition-colors whitespace-nowrap"
                >
                  {settings.secondaryCtaLabel}
                </Link>
              )}
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
      className="group block bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)] hover:border-muted transition-all"
    >
      {/* Thumbnail */}
      <div
        className="relative w-full aspect-[16/10] bg-surface-raised border-b border-border overflow-hidden"
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
          <span className="text-sm font-semibold text-foreground">
            {study.meta.brandName || "Untitled brand"}
          </span>
          {study.meta.industry && (
            <>
              <span className="text-muted">·</span>
              <span className="text-xs text-subtle">{study.meta.industry}</span>
            </>
          )}
          <span className="text-muted">·</span>
          <span className="text-xs text-subtle">
            {PROJECT_TYPE_LABELS[study.meta.projectType]}
          </span>
        </div>

        <h2 className="text-xl md:text-2xl font-semibold tracking-tight leading-[1.2] text-foreground">
          {study.hero.headline || "Untitled case study"}
        </h2>

        {topStat && (
          <div className="mt-5 inline-flex items-baseline gap-2 px-3 py-1.5 bg-[#F0F9F2] rounded-full">
            <span className="text-base font-semibold" style={{ color: "#1F7A3D" }}>
              {topStat.value}
            </span>
            <span className="text-xs text-subtle">{topStat.label}</span>
          </div>
        )}

        <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          View case study
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </Link>
  );
}
