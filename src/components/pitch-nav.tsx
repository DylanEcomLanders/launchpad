"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* PitchNav — the tab strip for the Pitch umbrella. Mounted at the top of each
 * pitch-material page. Tabs jump to the existing routes for now; if Dylan
 * likes the pattern, the next step is to move these routes under a shared
 * /pitch/[slug] layout so the strip survives navigation without each page
 * having to mount it. */
/* Portfolio, Case Studies, and Price List moved to the Shortcuts umbrella
 * since they're the most-reached client-facing surfaces. Pitch keeps the
 * unique pitch-only tabs: Offer (positioning), Quotes (proposal builder),
 * Sales Deck (the iframe preview of /conversion-pack), Cheat Sheet. */
const tabs = [
  { href: "/offer", label: "Offer" },
  { href: "/tools/quotes", label: "Quotes" },
  { href: "/tools/sales-deck", label: "Sales Deck" },
  { href: "/internal/cheatsheet/conversion-engine", label: "Cheat Sheet" },
];

export function PitchNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
              active
                ? "bg-accent text-accent-foreground"
                : "text-subtle hover:text-foreground hover:bg-surface-raised"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
