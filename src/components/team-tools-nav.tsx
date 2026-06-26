"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* TeamToolsNav — tab strip for the Team Tools umbrella. The day-to-day team
 * utilities (reference assets + pay tools) rendered as a horizontal pill strip,
 * mounted at the top of the team tool routes by TeamToolsShell in the dashboard
 * layout so tabbing between them feels in-page. Mirrors ShortcutsNav / PitchNav. */
export interface TeamToolTab {
  href: string;
  label: string;
}

export const TEAM_TOOL_TABS: TeamToolTab[] = [
  { href: "/team/swipe-file", label: "Swipe File" },
  { href: "/team/fonts", label: "Font Library" },
  { href: "/me/invoices", label: "Submit Invoice" },
  { href: "/team/payments", label: "Payments" },
];

export function TeamToolsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
      {TEAM_TOOL_TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
              active
                ? "bg-white text-[#0C0C0C]"
                : "text-[#71757D] hover:text-[#E5E5EA] hover:bg-[#222222]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
