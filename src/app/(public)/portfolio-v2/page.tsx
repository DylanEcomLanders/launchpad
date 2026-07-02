import { Logo } from "@/components/logo";
import { getProjects } from "@/lib/portfolio-v2/data";
import PortfolioGrid from "./grid";
import Link from "next/link";

export const revalidate = 60;

export default async function PortfolioV2IndexPage() {
  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between">
          <Link href="/" className="text-foreground">
            <Logo height={22} />
          </Link>
          <Link
            href="https://cal.com/dylanevans"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs md:text-sm font-semibold px-4 py-2 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors"
          >
            Book a call
          </Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-6">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
          Our Work
        </h1>
        <p className="text-subtle text-base mt-4 max-w-2xl">
          Shopify CRO &amp; landing page designs by Ecomlanders
        </p>
      </section>

      <PortfolioGrid projects={projects} />
    </div>
  );
}
