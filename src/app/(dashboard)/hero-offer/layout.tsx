"use client";

/* ── Hero Offer TabShell ──
 *
 * One umbrella, four tabs: Start here / Acquisition / Execution /
 * Retention. Tab clicks use router.replace with scroll: false so the
 * shared chrome stays mounted and the page content swaps quickly with
 * no scroll jump.
 *
 * Access: admin + cro can edit, team can read. The page panels gate
 * editing UI behind useRole() === "admin" so team members just see
 * the rendered content.
 */

import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  MegaphoneIcon,
  WrenchScrewdriverIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

type Tab = "start" | "acquisition" | "execution" | "retention";

const TABS: { id: Tab; label: string; icon: typeof HomeIcon; href: string }[] = [
  { id: "start",       label: "The Offer",   icon: HomeIcon,                href: "/hero-offer" },
  { id: "acquisition", label: "Acquisition", icon: MegaphoneIcon,           href: "/hero-offer/acquisition" },
  { id: "execution",   label: "Execution",   icon: WrenchScrewdriverIcon,   href: "/hero-offer/execution" },
  { id: "retention",   label: "Retention",   icon: HeartIcon,               href: "/hero-offer/retention" },
];

function tabFromPath(pathname: string): Tab {
  if (pathname.startsWith("/hero-offer/acquisition")) return "acquisition";
  if (pathname.startsWith("/hero-offer/execution")) return "execution";
  if (pathname.startsWith("/hero-offer/retention")) return "retention";
  return "start";
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
    <div className="min-h-full bg-[#080808] relative">
      {/* Soft accent blob - gives the page a quiet identity tint without
       * dominating. Sits behind everything, fixed to scroll with the
       * page chrome only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px] opacity-40"
        style={{
          background:
            "radial-gradient(60% 100% at 20% 0%, rgba(16,185,129,0.18), transparent 60%), radial-gradient(50% 100% at 80% 0%, rgba(14,165,233,0.14), transparent 60%)",
        }}
      />

      {/* Header sits flush with the page bg, no border line. Tab strip
       * carries the separation. */}
      <div className="sticky top-0 z-10 bg-[#080808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-0">
          <h1 className="text-2xl font-semibold mb-1">
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
              Hero Offer
            </span>
          </h1>
          <p className="text-sm text-[#71757D] mb-5">
            The conversion engine playbook: how to win the deal, how to wow on delivery, how to make it last.
          </p>
          <nav className="flex gap-1 overflow-x-auto pb-3">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => pickTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-sm whitespace-nowrap rounded-full transition-all ${
                    active
                      ? "bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 text-white font-medium shadow-[0_4px_24px_rgba(14,165,233,0.35)]"
                      : "text-[#71757D] hover:text-[#E5E5EA] hover:bg-white/[0.04]"
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
      <div className="max-w-7xl mx-auto px-6 py-6 relative">{children}</div>
    </div>
  );
}
