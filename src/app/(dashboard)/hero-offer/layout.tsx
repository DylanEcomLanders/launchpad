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
import {
  TagIcon,
  BanknotesIcon,
  RectangleStackIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

type Tab = "offer" | "price" | "resources" | "info";

const TABS: { id: Tab; label: string; icon: typeof TagIcon; href: string }[] = [
  { id: "offer",     label: "Hero Offer", icon: TagIcon,               href: "/hero-offer" },
  { id: "price",     label: "Price list", icon: BanknotesIcon,         href: "/hero-offer/price-list" },
  { id: "resources", label: "Resources",  icon: RectangleStackIcon,    href: "/hero-offer/resources" },
  { id: "info",      label: "Info",       icon: InformationCircleIcon, href: "/hero-offer/info" },
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
      {/* Sticky tab strip — the only chrome the shell owns. Underline tabs,
       * DESIGN.md craft (no pills, no tint). */}
      <div className="sticky top-0 z-10 border-b border-border-faint bg-background/90 backdrop-blur-md">
        <div className="px-6 md:px-10">
          <p className="pt-6 text-3xs font-semibold uppercase tracking-[0.14em] text-subtle">Offer</p>
          <nav className="-mb-px mt-4 flex gap-6 overflow-x-auto">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => pickTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 text-sm transition-colors ${
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-subtle hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
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
