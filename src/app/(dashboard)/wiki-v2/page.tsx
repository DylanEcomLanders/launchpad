import Link from "next/link";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
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
    <div className="mx-auto max-w-3xl px-8 pb-20 pt-12">
      <header className="mb-10">
        <p className="text-3xs font-semibold uppercase tracking-[0.14em] text-subtle">Ecom Landers Wiki</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">The ops manual</h1>
        <div className="mt-4 max-w-2xl space-y-3 text-sm leading-relaxed text-muted">
          <p>
            We&apos;re a plug-in conversion layer for ecommerce brands looking to push growth beyond the KPIs they&apos;re stuck on. We build bulletproof, scalable funnels that compound.
          </p>
          <p>
            Holistic funnel work, end to end: design, development, strategy, testing. We handle every layer.
          </p>
          <p>
            This wiki is how we keep that operation running: how we sell, how we deliver, how we communicate, and what we expect of each other. Every page is owned, kept current, and open to questions.
          </p>
        </div>
      </header>

      <p className="mb-3 text-3xs font-semibold uppercase tracking-wider text-subtle">Jump in</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map((section) => {
          const count = pageCount(section);
          return (
            <Link
              key={section.name}
              href={firstPageHref(section)}
              className="group rounded border border-border-faint bg-surface-raised p-5 transition-colors hover:border-border"
            >
              <div className="mb-1.5 flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">{section.name}</h2>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-2xs font-medium uppercase tracking-wider tabular-nums text-subtle">
                    {count} {count === 1 ? "page" : "pages"}
                  </span>
                  <ArrowUpRightIcon className="size-3.5 text-subtle transition-colors group-hover:text-foreground" />
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                {sectionDescriptions[section.name] ?? ""}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
