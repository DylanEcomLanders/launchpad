"use client";

/* ── Offer TabShell ──
 *
 * One umbrella, four tabs: Hero Offer / Price list / Resources / Info.
 * Acquisition, Execution + Retention are sections inside Resources, so the
 * stage sub-routes light the Resources tab. Tab clicks use router.replace with
 * scroll: false so the shared chrome stays mounted and content swaps quickly.
 *
 * The shell owns the page padding + width; every tab page renders bare
 * (space-y only) so the rhythm stays identical across tabs.
 */

import { usePathname, useRouter } from "next/navigation";

type Tab = "offer" | "price" | "resources" | "info";

const TABS: { id: Tab; label: string; href: string }[] = [
  { id: "offer",     label: "Hero Offer", href: "/hero-offer" },
  { id: "price",     label: "Price list", href: "/hero-offer/price-list" },
  { id: "resources", label: "Resources",  href: "/hero-offer/resources" },
  { id: "info",      label: "Info",       href: "/hero-offer/info" },
];

function tabFromPath(pathname: string): Tab {
  if (pathname.startsWith("/hero-offer/price-list")) return "price";
  if (pathname.startsWith("/hero-offer/info")) return "info";
  if (
    pathname.startsWith("/hero-offer/resources") ||
    pathname.startsWith("/hero-offer/acquisition") ||
    pathname.startsWith("/hero-offer/execution") ||
    pathname.startsWith("/hero-offer/retention")
  ) {
    return "resources";
  }
  return "offer";
}

export default function HeroOfferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = tabFromPath(pathname);

  function pickTab(t: Tab) {
    const target = TABS.find((x) => x.id === t)?.href ?? "/hero-offer";
    if (pathname === target) return;
    router.replace(target, { scroll: false });
  }

  return (
    <div className="min-h-full bg-background">
      {/* Sticky tab strip — the only chrome the shell owns. Ghost pill tabs
       * (kanban Results-Library style): active tab is a raised rounded pill,
       * the rest muted text. */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md">
        <div className="px-6 md:px-10">
          <p className="pt-6 text-3xs font-semibold uppercase tracking-[0.14em] text-subtle">Offer</p>
          <nav className="mt-4 flex gap-1 overflow-x-auto pb-3">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => pickTab(tab.id)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-surface-raised text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:px-10">{children}</div>
    </div>
  );
}
