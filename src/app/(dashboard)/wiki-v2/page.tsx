import Link from "next/link";
import { getSections, type WikiSection } from "@/lib/wiki-v2/data";

export const dynamic = "force-dynamic";

const sectionDescriptions: Record<string, string> = {
  "Start Here": "Get oriented if you're new",
  Culture: "What we believe and how we behave",
  "People & Pods": "Roles, the pod model, hiring",
  Communication: "Slack, standups, client comms",
  Sales: "Pitch, audits, the offer",
  Delivery: "Design, dev, strategy, QA",
  Tools: "The stack and how we use each piece",
  Operations: "Finance, time, holidays, admin",
};

function firstPageHref(section: WikiSection): string {
  if (section.pages.length > 0) return `/wiki-v2/${section.pages[0].slug}`;
  if (section.subsections[0]?.pages[0]) {
    return `/wiki-v2/${section.subsections[0].pages[0].slug}`;
  }
  return "/wiki-v2";
}

function pageCount(section: WikiSection): number {
  return (
    section.pages.length +
    section.subsections.reduce((a, s) => a + s.pages.length, 0)
  );
}

export default function WikiIndexPage() {
  const sections = getSections();

  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      <header className="mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] mb-2">
          Ecomlanders Wiki
        </p>
        <h1 className="text-3xl font-semibold text-[#E5E5EA] mb-5">
          The ops manual
        </h1>
        <div className="text-[14px] text-[#E5E5EA] leading-relaxed space-y-3 max-w-2xl">
          <p>
            We&apos;re plug-in conversion layer specialists for ecommerce brands looking to push their growth beyond the KPIs they&apos;re stuck on. We build bulletproof, scalable funnels that compound.
          </p>
          <p>
            Holistic funnel work, end to end: design, development, strategy, testing. We handle every layer.
          </p>
          <p>
            This wiki is how we keep that operation running. How we sell, how we deliver, how we communicate, and what we expect of each other. Every page is owned, kept current, and open to questions from the team.
          </p>
        </div>
      </header>

      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] mb-4">
        Jump in
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map((section) => {
          const count = pageCount(section);
          return (
            <Link
              key={section.name}
              href={firstPageHref(section)}
              className="group rounded-xl border border-[#2A2A2A] bg-[#181818] px-5 py-4 hover:border-white/25 hover:shadow-[var(--shadow-soft)] transition-all"
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className="text-[14px] font-semibold text-[#E5E5EA]">
                  {section.name}
                </h3>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#71757D] tabular-nums shrink-0 mt-0.5">
                  {count} {count === 1 ? "page" : "pages"}
                </span>
              </div>
              <p className="text-[13px] text-[#9CA3AF] leading-relaxed">
                {sectionDescriptions[section.name] ?? ""}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
