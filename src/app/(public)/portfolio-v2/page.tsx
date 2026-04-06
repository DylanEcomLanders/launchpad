import Link from "next/link";
import { Logo } from "@/components/logo";
import { getProjects } from "@/lib/portfolio-v2/data";

export const revalidate = 60;

export default async function PortfolioV2IndexPage() {
  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between">
          <Link href="/" className="text-white">
            <Logo height={22} />
          </Link>
          <Link
            href="/audit"
            className="text-xs md:text-sm font-semibold px-4 py-2 bg-white text-[#0A0A0B] rounded-full hover:bg-white/90 transition-colors"
          >
            Get a free audit
          </Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-12">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Work that moves the needle.
        </h1>
        <p className="text-white/60 text-base md:text-lg mt-5 max-w-2xl">
          Handpicked Shopify builds, landing pages, and CRO projects from Ecom Landers.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        {projects.length === 0 ? (
          <div className="text-white/40 text-sm border border-dashed border-white/10 rounded-2xl p-16 text-center">
            No projects published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => {
              const thumb = p.desktop_slices[0] ?? p.mobile_slices[0];
              return (
                <Link
                  key={p.id}
                  href={`/portfolio-v2/${p.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/5 border border-white/10">
                    {thumb && (
                      <img
                        src={thumb.url}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    {p.client && (
                      <p className="text-sm text-white/50">{p.client}</p>
                    )}
                    {p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] uppercase tracking-wide px-2 py-0.5 bg-white/5 text-white/60 rounded-full border border-white/10"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
