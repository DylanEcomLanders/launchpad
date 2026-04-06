import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { getProject, getProjects } from "@/lib/portfolio-v2/data";
import { PortfolioViewer } from "./viewer";

export const revalidate = 60;

export default async function PortfolioV2DetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  // Prev / next
  const all = await getProjects();
  const idx = all.findIndex((p) => p.slug === slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between">
          <Link href="/portfolio-v2" className="text-white">
            <Logo height={22} />
          </Link>
          <Link
            href="/portfolio-v2"
            className="text-xs md:text-sm text-white/60 hover:text-white"
          >
            ← All work
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-12">
        {project.client && (
          <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">
            {project.client}
          </div>
        )}
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          {project.name}
        </h1>
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {project.tags.map((t) => (
              <span
                key={t}
                className="text-[11px] uppercase tracking-wide px-3 py-1 bg-white/5 text-white/70 rounded-full border border-white/10"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {project.results && (
          <div className="mt-10 max-w-2xl">
            <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
              Results
            </div>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed whitespace-pre-line">
              {project.results}
            </p>
          </div>
        )}
      </section>

      {/* Viewer */}
      <section className="px-4 md:px-6 pb-20">
        <PortfolioViewer
          desktopSlices={project.desktop_slices}
          mobileSlices={project.mobile_slices}
        />
      </section>

      {/* Notes */}
      {project.notes && (
        <section className="max-w-3xl mx-auto px-6 md:px-10 py-16 border-t border-white/10">
          <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">
            Notes
          </div>
          <p className="text-white/80 text-lg leading-relaxed whitespace-pre-line">
            {project.notes}
          </p>
        </section>
      )}

      {/* Prev / Next */}
      {(prev || next) && (
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-10 border-t border-white/10 flex items-center justify-between gap-4">
          {prev ? (
            <Link
              href={`/portfolio-v2/${prev.slug}`}
              className="group flex-1"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">
                Previous
              </div>
              <div className="text-lg font-semibold group-hover:text-white text-white/80">
                ← {prev.name}
              </div>
            </Link>
          ) : <div className="flex-1" />}
          {next ? (
            <Link
              href={`/portfolio-v2/${next.slug}`}
              className="group flex-1 text-right"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">
                Next
              </div>
              <div className="text-lg font-semibold group-hover:text-white text-white/80">
                {next.name} →
              </div>
            </Link>
          ) : <div className="flex-1" />}
        </section>
      )}

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-24 text-center border-t border-white/10">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Want results like this?
        </h2>
        <p className="text-white/60 mt-4 max-w-xl mx-auto">
          Get a free, no-bullshit audit of your store. We&rsquo;ll show you exactly
          what&rsquo;s leaking money.
        </p>
        <Link
          href="/audit"
          className="inline-block mt-8 px-8 py-4 bg-[#00E27A] text-[#0A0A0B] font-semibold rounded-full hover:bg-[#00E27A]/90 transition-colors"
        >
          Get a FREE audit →
        </Link>
      </section>
    </div>
  );
}
