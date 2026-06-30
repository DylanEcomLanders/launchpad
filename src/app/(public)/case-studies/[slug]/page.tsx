/* ── Public case study render ──
 * Light, editorial, matches the design reference.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { getCaseStudy, getCaseStudies } from "@/lib/case-studies/data";
import { makeExampleCaseStudy } from "@/lib/case-studies/seed";
import { type CaseStudy, type HeadlineStat, type ResultComparison, slotsForLayout } from "@/lib/case-studies/types";
import { AnimatedCounter } from "@/components/case-studies/public/animated-counter";
import { MotionSection, MotionItem } from "@/components/case-studies/public/motion-section";
import { PageViewer } from "@/components/case-studies/public/page-viewer";
import { ScreenshotGrid } from "@/components/case-studies/screenshot-grid";
import { ExtraBlocks } from "@/components/case-studies/extra-blocks-render";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = await getCaseStudy(slug);
  if (!study) return { title: "Case study not found" };

  const title = `${study.meta.brandName || "Case study"} — ${study.hero.headline || "Conversion case study"}`;
  const description =
    study.hero.subhead ||
    study.challenge.prose.slice(0, 160) ||
    "How Ecom Landers shipped a measurable conversion lift.";

  return {
    title: `${title} | Ecom Landers`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: study.hero.collageImages?.[0]?.url
        ? [study.hero.collageImages[0].url]
        : study.hero.image?.url
          ? [study.hero.image.url]
          : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CaseStudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const isExample = sp?.example === "1";
  const study = isExample ? makeExampleCaseStudy() : await getCaseStudy(slug);
  if (!study) notFound();

  const isDraft = sp?.draft === "1" || isExample;
  if (!study.settings.published && !isDraft) notFound();

  const allStudies = isExample ? [] : await getCaseStudies();
  const related = study.relatedCaseStudyIds
    .map((id) => allStudies.find((s) => s.id === id))
    .filter((s): s is CaseStudy => !!s && s.settings.published)
    .slice(0, 3);

  return <CaseStudyRender study={study} related={related} isDraft={isDraft} />;
}

function CaseStudyRender({
  study,
  related,
  isDraft,
}: {
  study: CaseStudy;
  related: CaseStudy[];
  isDraft: boolean;
}) {
  const brandRed = study.settings.brandColor || "#E04A2F";  // Problem section eyebrow + brand accent
  const sectionGrey = "#7A7A7A";                            // default eyebrow tone
  const sectionGreen = "#16a34a";                           // Solution eyebrow + delta arrows

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${study.meta.brandName} — ${study.hero.headline}`,
    description: study.hero.subhead || study.challenge.prose.slice(0, 200),
    image: study.hero.collageImages?.[0]?.url || study.hero.image?.url,
    datePublished: study.settings.publishedAt || study.created_at,
    dateModified: study.updated_at,
    author: { "@type": "Organization", name: "Ecom Landers" },
  };

  return (
    <div className="bg-surface-raised text-foreground min-h-screen">
      {/* The (public) layout's animate-fadeInUp leaves a residual transform on
       * <main> that creates a containing block and breaks layout/screenshot
       * for long scrolling content. Strip it for case study pages. */}
      <style>{`main { animation: none !important; transform: none !important; }`}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {isDraft && !study.settings.published && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-6 py-2 text-center text-xs text-yellow-900">
          Draft preview — not published yet
        </div>
      )}

      {/* ── Top bar ──────────────────────────── */}
      <header className="px-6 md:px-10 py-6 flex items-center justify-center">
        <Link href="/" className="text-foreground" aria-label="Ecom Landers">
          <Logo height={20} />
        </Link>
      </header>

      {/* ── Hero ─────────────────────────────── */}
      <section className="px-6 md:px-10 pt-6 pb-14">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <Eyebrow color={sectionGrey}>Case Study</Eyebrow>
            <h1 className="mt-4 text-3xl md:text-[44px] font-semibold tracking-tight leading-[1.1]">
              {study.hero.headline || "Untitled case study"}
            </h1>
            {study.hero.subhead && (
              <p className="mt-5 text-sm md:text-base text-[#5C5C5C] leading-relaxed max-w-prose">
                {study.hero.subhead}
              </p>
            )}
          </div>
          <HeroCollage images={study.hero.collageImages || []} />
        </div>
      </section>

      <ExtraBlocks anchor="hero" blocks={study.extraBlocks} />

      {/* ── 4-stat row ───────────────────────── */}
      {study.headlineStats.length > 0 && (
        <section className="px-6 md:px-10 pb-10">
          <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
            {study.headlineStats.map((stat, i) => (
              <MotionItem key={stat.id} delay={i * 0.08}>
                <StatCard stat={stat} delayMs={i * 140} />
              </MotionItem>
            ))}
          </div>
        </section>
      )}

      <ExtraBlocks anchor="stats" blocks={study.extraBlocks} />

      {/* ── Meta row ─────────────────────────── */}
      <MotionSection className="px-6 md:px-10 pb-14">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-border pt-8">
          <MetaItem label="Brand" value={study.meta.brandName} />
          {study.meta.industry && <MetaItem label="Niche" value={study.meta.industry} />}
          {study.meta.timeframe && <MetaItem label="Engagement" value={study.meta.timeframe} />}
          {study.meta.services && <MetaItem label="Services" value={study.meta.services} />}
        </div>
      </MotionSection>

      {/* ── Screenshot collage row ── */}
      {/* For single/two/three layouts the slot adapts to the image's natural
       * aspect-ratio (so wide screenshots aren't crushed into a 4:3 box).
       * Wide-stack and stack-wide are rigid grid compositions — those slots
       * still use h-full + object-cover so the wide cell can span 2 rows
       * without breaking the layout. */}
      {(() => {
        const layout = study.results.screenshotLayout || "three";
        const isRigidLayout = layout === "wide-stack" || layout === "stack-wide";
        return (
          <MotionSection className="px-6 md:px-10 pb-20">
            <div className="max-w-[1200px] mx-auto">
              <ScreenshotGrid
                layout={layout}
                children={Array.from({
                  length: slotsForLayout(layout),
                }).map((_, i) => {
                  const img = study.results.screenshots[i];
                  if (img) {
                    const useNaturalAspect = !isRigidLayout && img.width && img.height;
                    return (
                      <div
                        key={img.filename || i}
                        className={`w-full ${isRigidLayout ? "h-full" : ""} rounded-lg overflow-hidden border border-border bg-white`}
                        style={
                          useNaturalAspect
                            ? { aspectRatio: `${img.width} / ${img.height}` }
                            : !isRigidLayout
                              ? { aspectRatio: "4 / 3" }
                              : undefined
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.alt || ""}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`placeholder-${i}`}
                      className={`w-full ${isRigidLayout ? "h-full" : ""} rounded-lg border border-border bg-border/40`}
                      style={!isRigidLayout ? { aspectRatio: "4 / 3" } : undefined}
                    />
                  );
                })}
              />
            </div>
          </MotionSection>
        );
      })()}

      <ExtraBlocks anchor="screenshots" blocks={study.extraBlocks} />

      {/* ── The Problem ──────────────────────── */}
      {(study.challenge.headline || study.challenge.prose) && (
        <MotionSection className="px-6 md:px-10 py-16 border-t border-border">
          <div className="max-w-[1200px] mx-auto">
            <Eyebrow color={brandRed}>The Problem</Eyebrow>
            {study.challenge.headline && (
              <h2 className="mt-4 text-2xl md:text-[32px] font-semibold tracking-tight leading-[1.15] max-w-3xl">
                {study.challenge.headline}
              </h2>
            )}
            {study.challenge.prose && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm md:text-[15px] text-[#5C5C5C] leading-relaxed">
                {splitProseTwoCols(study.challenge.prose).map((col, i) => (
                  <div key={i} className="whitespace-pre-line">
                    {col}
                  </div>
                ))}
              </div>
            )}
            {study.challenge.pullQuotes.length > 0 && (
              <div className="mt-12 space-y-8">
                {study.challenge.pullQuotes.map((q) => (
                  <blockquote key={q.id} className="max-w-3xl">
                    <p className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-snug">
                      &ldquo;{q.text}&rdquo;
                    </p>
                    {q.attribution && (
                      <cite className="block text-sm text-subtle not-italic mt-3">
                        — {q.attribution}
                      </cite>
                    )}
                  </blockquote>
                ))}
              </div>
            )}
          </div>
        </MotionSection>
      )}

      <ExtraBlocks anchor="problem" blocks={study.extraBlocks} />

      {/* ── The Solution ─────────────────────── */}
      {(study.approach.headline || study.approach.cards.length > 0) && (
        <MotionSection className="px-6 md:px-10 py-16 border-t border-border">
          <div className="max-w-[1200px] mx-auto">
            <Eyebrow color={sectionGreen}>The Solution</Eyebrow>
            {study.approach.headline && (
              <h2 className="mt-4 text-2xl md:text-[32px] font-semibold tracking-tight leading-[1.15] max-w-3xl">
                {study.approach.headline}
              </h2>
            )}
            {study.approach.intro && (
              <p className="mt-6 text-sm md:text-[15px] text-[#5C5C5C] leading-relaxed max-w-prose">
                {study.approach.intro}
              </p>
            )}
            {study.approach.cards.length > 0 && (
              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                {study.approach.cards.map((card, i) => (
                  <MotionItem
                    key={card.id}
                    delay={i * 0.08}
                    className="bg-white border border-border rounded-xl p-6 shadow-[var(--shadow-soft)]"
                  >
                    <div
                      className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: sectionGreen }}
                    >
                      {String(i + 1).padStart(2, "0")} ·
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-foreground tracking-tight">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm text-[#5C5C5C] leading-relaxed">
                      {card.description}
                    </p>
                  </MotionItem>
                ))}
              </div>
            )}
          </div>
        </MotionSection>
      )}

      <ExtraBlocks anchor="solution" blocks={study.extraBlocks} />

      {/* ── The Design ───────────────────────── */}
      {(study.designs.headline ||
        study.designs.desktopSlices.length > 0 ||
        study.designs.mobileSlices.length > 0) && (
        <MotionSection className="px-6 md:px-10 py-16 border-t border-border">
          <div className="max-w-[1200px] mx-auto">
            <Eyebrow color={sectionGrey}>The Design</Eyebrow>
            {study.designs.headline && (
              <h2 className="mt-4 text-2xl md:text-[32px] font-semibold tracking-tight leading-[1.15] max-w-3xl">
                {study.designs.headline}
              </h2>
            )}
            {(study.designs.desktopSlices.length > 0 || study.designs.mobileSlices.length > 0) && (
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {study.designs.desktopSlices.length > 0 && (
                  <PageViewer
                    slices={study.designs.desktopSlices}
                    device="desktop"
                    brandName={study.meta.brandName}
                  />
                )}
                {study.designs.mobileSlices.length > 0 && (
                  <PageViewer
                    slices={study.designs.mobileSlices}
                    device="mobile"
                    brandName={study.meta.brandName}
                  />
                )}
              </div>
            )}
          </div>
        </MotionSection>
      )}

      <ExtraBlocks anchor="design" blocks={study.extraBlocks} />

      {/* ── The Full Results ─────────────────── */}
      {study.compoundedResults.length > 0 && (
        <MotionSection className="px-6 md:px-10 py-16 border-t border-border">
          <div className="max-w-[1200px] mx-auto">
            <Eyebrow color={sectionGrey}>The Full Results</Eyebrow>
            <h2 className="mt-4 text-2xl md:text-[32px] font-semibold tracking-tight leading-[1.15] max-w-3xl">
              Compounded wins, funnel-wide.
            </h2>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
              {study.compoundedResults.map((row, i) => (
                <MotionItem key={row.id} delay={i * 0.08}>
                  <ComparisonCard row={row} />
                </MotionItem>
              ))}
            </div>
          </div>
        </MotionSection>
      )}

      <ExtraBlocks anchor="results" blocks={study.extraBlocks} />

      {/* ── Testimonial + CTA ────────────────── */}
      {/* Two layouts: testimonial present → 2-up cards (testimonial left,
       * vertical CTA card right). Testimonial missing → CTA spans full
       * width as a horizontal bar (headline left, buttons right) instead
       * of leaving the right half empty. */}
      <MotionSection className="px-6 md:px-10 py-16 border-t border-border">
        {(() => {
          const hasTestimonial = !!study.testimonial?.quote;
          return (
            <div
              className={`max-w-[1200px] mx-auto ${
                hasTestimonial ? "grid grid-cols-1 md:grid-cols-2 gap-6" : ""
              }`}
            >
              {hasTestimonial && study.testimonial && (
                <div className="bg-white border border-border rounded-xl p-8 shadow-[var(--shadow-soft)]">
                  <Eyebrow color={sectionGrey}>The Client&apos;s Thoughts</Eyebrow>
                  <blockquote className="mt-5 text-lg md:text-xl font-semibold tracking-tight leading-snug text-foreground">
                    &ldquo;{study.testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-3 mt-6">
                    {study.testimonial.headshot?.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={study.testimonial.headshot.url}
                        alt={study.testimonial.name}
                        className="size-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="text-sm font-semibold text-foreground">{study.testimonial.name}</div>
                      <div className="text-xs text-subtle">{study.testimonial.role}</div>
                    </div>
                  </div>
                </div>
              )}

              <div
                className={`bg-surface text-white rounded-xl p-8 ${
                  hasTestimonial
                    ? "flex flex-col justify-between min-h-[260px]"
                    : "flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10"
                }`}
              >
                <div className={hasTestimonial ? "" : "md:flex-1"}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                    Ready to start?
                  </div>
                  <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight leading-[1.15]">
                    {study.cta.headline}
                  </h3>
                </div>
                <div
                  className={`flex flex-col gap-2 ${
                    hasTestimonial ? "mt-6" : "md:flex-row md:flex-shrink-0 md:min-w-[280px]"
                  }`}
                >
                  <Link
                    href={study.cta.buttonHref || "/audit"}
                    className="flex items-center justify-center px-4 py-3 bg-white text-foreground text-sm font-semibold rounded-lg hover:bg-surface-raised transition-colors whitespace-nowrap"
                  >
                    {study.cta.buttonLabel || "Book a call"}
                    <span className="ml-2">↗</span>
                  </Link>
                  {study.cta.secondaryLabel && study.cta.secondaryHref && (
                    <Link
                      href={study.cta.secondaryHref}
                      className="flex items-center justify-center px-4 py-3 bg-[#3FB95F] hover:bg-[#34a04f] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      {study.cta.secondaryLabel}
                      <svg className="ml-2 size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </MotionSection>

      {/* ── Tech stack (if any) ──────────────── */}
      {study.techStack.length > 0 && (
        <MotionSection className="px-6 md:px-10 py-12 border-t border-border">
          <div className="max-w-[1200px] mx-auto flex items-center gap-4 flex-wrap">
            <Eyebrow color={sectionGrey}>Built with</Eyebrow>
            <div className="flex flex-wrap gap-1.5">
              {study.techStack.map((t) => (
                <span
                  key={t}
                  className="text-xs font-semibold px-3 py-1 bg-white text-foreground rounded-full border border-border"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </MotionSection>
      )}

      {/* ── Related ───────────────────────────── */}
      {related.length > 0 && (
        <section className="px-6 md:px-10 py-16 border-t border-border">
          <div className="max-w-[1200px] mx-auto">
            <Eyebrow color={sectionGrey}>More work</Eyebrow>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/case-studies/${r.slug}`}
                  className="group block bg-white border border-border rounded-xl p-6 hover:shadow-[var(--shadow-card)] transition-shadow"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    {r.meta.brandName}
                  </div>
                  <div className="text-base font-semibold text-foreground mt-2 leading-snug">
                    {r.hero.headline}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────── */}
      <footer className="px-6 md:px-10 py-10 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-subtle">
        <Link href="/" className="text-foreground hover:text-foreground">
          <Logo height={16} />
        </Link>
        <div>© {new Date().getFullYear()} Ecom Landers. All rights reserved.</div>
      </footer>
    </div>
  );
}

/* ── Helpers ─────────────────────────────── */

function Eyebrow({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-[0.18em]"
      style={{ color }}
    >
      {children}
    </span>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div className="mt-1.5 text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}

function StatCard({ stat, delayMs = 0 }: { stat: HeadlineStat; delayMs?: number }) {
  const parsed = parseStatValue(stat.value);
  return (
    <div className="relative bg-white border border-border rounded-xl px-5 py-6 shadow-[var(--shadow-soft)] h-full">
      {/* Win chip — every headline stat is an improvement */}
      <span
        className="absolute top-4 right-4 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#E8F5EE] text-success text-[10px] font-semibold leading-none"
        aria-label="Improvement"
      >
        <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" />
        </svg>
      </span>
      <div className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums text-foreground leading-none">
        {parsed ? (
          <AnimatedCounter
            value={parsed.value}
            decimals={parsed.decimals}
            prefix={parsed.prefix}
            suffix={parsed.suffix}
            delay={delayMs}
          />
        ) : (
          stat.value
        )}
      </div>
      <div className="mt-3 text-[11px] text-subtle leading-snug">{stat.label}</div>
    </div>
  );
}

function ComparisonCard({ row }: { row: ResultComparison }) {
  const isUp = row.deltaDirection !== "down";
  return (
    <div className="bg-white border border-border rounded-xl px-5 py-6 shadow-[var(--shadow-soft)]">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle truncate">
        {row.label}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-sm text-muted line-through tabular-nums">{row.before}</span>
        <span className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground tabular-nums leading-none">
          {row.after}
        </span>
      </div>
      {row.deltaPercent !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: "#16a34a" }}>
          <span>{isUp ? "↑" : "↓"}</span>
          <span className="tabular-nums">{Math.abs(row.deltaPercent)}%</span>
        </div>
      )}
    </div>
  );
}

function HeroCollage({ images }: { images: { url: string; alt?: string; filename?: string }[] }) {
  const img = images[0];
  if (!img) {
    return (
      <div className="aspect-[4/3] rounded-xl border border-dashed border-foreground bg-white" />
    );
  }
  return (
    <div className="rounded-xl overflow-hidden bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.url} alt={img.alt || ""} className="w-full h-auto block" />
    </div>
  );
}

/* Split prose into 2 roughly equal columns by paragraph boundaries. */
function splitProseTwoCols(prose: string): [string, string] {
  const paragraphs = prose.split(/\n\n+/).filter(Boolean);
  if (paragraphs.length <= 1) return [prose, ""];
  const mid = Math.ceil(paragraphs.length / 2);
  return [paragraphs.slice(0, mid).join("\n\n"), paragraphs.slice(mid).join("\n\n")];
}

/* Parse "+146%", "-62%", "$145,654" into numeric counter input. Returns null
 * if not parseable (then we render the string verbatim). */
function parseStatValue(
  raw: string,
): { value: number; decimals: number; prefix: string; suffix: string } | null {
  const m = raw.match(/^([^\d.\-+]*)([+-]?[\d.,]+)([^\d]*)$/);
  if (!m) return null;
  const leadingPrefix = m[1] || "";          // e.g. "$"
  let numericText = m[2];
  let signPrefix = "";
  if (numericText.startsWith("+") || numericText.startsWith("-")) {
    signPrefix = numericText[0];
    numericText = numericText.slice(1);
  }
  numericText = numericText.replace(/,/g, "");
  const value = parseFloat(numericText);
  if (!Number.isFinite(value)) return null;
  const suffix = m[3] || "";
  const decimals = numericText.includes(".")
    ? Math.min(2, numericText.split(".")[1]?.length || 0)
    : 0;
  return { value, decimals, prefix: leadingPrefix + signPrefix, suffix };
}
