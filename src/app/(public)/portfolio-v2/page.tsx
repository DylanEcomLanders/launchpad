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
            href="https://cal.com/dylanevans"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs md:text-sm font-semibold px-4 py-2 bg-white text-[#0A0A0B] rounded-full hover:bg-white/90 transition-colors"
          >
            Book a call
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((p) => {
              const desktop = p.desktop_slices[0];
              const mobile = p.mobile_slices[0];
              return (
                <Link
                  key={p.id}
                  href={`/portfolio-v2/${p.slug}`}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-white/5 border border-white/10"
                >
                  {desktop && (
                    <img
                      src={desktop.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  )}

                  {/* Mobile preview floating bottom-right */}
                  {mobile && (
                    <div className="absolute bottom-5 right-5 w-[22%] aspect-[9/19] rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black">
                      <img
                        src={mobile.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}

                  {/* Hover CTA */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-sm font-semibold px-5 py-2.5 bg-white text-[#0A0A0B] rounded-full">
                      View full case →
                    </span>
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
