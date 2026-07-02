"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* ShortcutsNav — tab strip for the Shortcuts umbrella. Two visual clusters
 * (Payment + Client facing) rendered as a single horizontal pill strip with
 * a thin divider between them. Mounted at the top of /shortcuts and kept
 * mounted across every underlying tool route by ShortcutsShell in the
 * dashboard layout, so tabbing between tools feels in-page. */
export interface ShortcutTab {
  href: string;
  label: string;
}

export const SHORTCUT_TABS: ShortcutTab[] = [
  // Payment cluster
  { href: "/tools/payment-link", label: "Payment Links" },
  { href: "/internal/pricing", label: "Price List" },
  { href: "/tools/invoice-generator", label: "Invoice Generator" },
  // Client facing cluster
  { href: "/tools/case-studies", label: "Case Studies" },
  { href: "/tools/about-deck", label: "About Deck" },
  { href: "/tools/portfolio", label: "Portfolio" },
];

// Index of the first item in the "Client facing" cluster — used to drop a
// thin divider between the two clusters in the strip.
const CLIENT_FACING_START = 3;

export function ShortcutsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
      {SHORTCUT_TABS.map((tab, i) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <span key={tab.href} className="flex items-center gap-1">
            {i === CLIENT_FACING_START && (
              <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            )}
            <Link
              href={tab.href}
              className={`whitespace-nowrap px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
                active
                  ? "bg-white text-background"
                  : "text-subtle hover:text-foreground hover:bg-surface-raised"
              }`}
            >
              {tab.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
