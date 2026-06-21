"use client";

/* ── /company TabShell ──
 *
 * Top tabs (Overview / People / Structure / Hiring / Contracts) are
 * NOT separate routes here. Clicking a tab is a local state change so
 * the panel swap is instant - no Next route nav, no remount, no
 * scroll reset. Each tab's content lives in src/app/(dashboard)/company/_panels/
 * and renders inline when its tab is active.
 *
 * Detail routes (/company/people/[id], /company/contracts/[id], etc.)
 * still navigate normally. When the user is on a detail URL we render
 * {children} instead of the panel and hide the top tab strip's
 * "active" highlight so the focus is on the detail content.
 *
 * Direct visits to /company/people or /company/hiring still resolve
 * (the stub page.tsx files return null; this layout picks the panel
 * from pathname on first paint, then local state takes over).
 *
 * Settings is the one exception - it lives at /settings, not under
 * /company, so its tab IS a real Link.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/components/auth-gate";
import { PasscodeGate } from "@/components/passcode-gate";
import {
  InboxIcon,
  UserGroupIcon,
  BriefcaseIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import InboxPanel from "./_panels/InboxPanel";
import PeoplePanel from "./_panels/PeoplePanel";
import HiringPanel from "./_panels/HiringPanel";

type Tab = "inbox" | "people" | "hiring";

const TABS: { id: Tab; label: string; icon: typeof InboxIcon; pathPrefix: string }[] = [
  { id: "inbox",   label: "Inbox",   icon: InboxIcon,      pathPrefix: "/company" },
  { id: "people",  label: "People",  icon: UserGroupIcon,  pathPrefix: "/company/people" },
  { id: "hiring",  label: "Hiring",  icon: BriefcaseIcon,  pathPrefix: "/company/hiring" },
];

const COMPANY_PASSCODE =
  process.env.NEXT_PUBLIC_COMPANY_PASSWORD || "Football2026";
const STORAGE_KEY = "launchpad-company-unlocked";

/* Pure derive: pathname → which top tab is "active" for highlight
 * + initial render. Anything not matching a top-tab prefix falls back
 * to overview. */
function tabFromPath(pathname: string): Tab {
  if (pathname.startsWith("/company/people")) return "people";
  if (pathname.startsWith("/company/hiring")) return "hiring";
  /* /company/contracts and /company/structure still resolve to Inbox
   * since they aren't top tabs anymore - the layout treats them as
   * detail routes and renders {children}. */
  return "inbox";
}

/* Detail routes own the body — layout yields to {children}. Anything
 * deeper than the top-tab roots qualifies. Invoices detail still lives
 * under /company/invoices even though the tab is gone. */
function isDetailRoute(pathname: string): boolean {
  const trimmed = pathname.replace(/\/+$/, "");
  const detailPatterns = [
    /^\/company\/people\/[^/]+/,
    /^\/company\/contracts(\/|$)/,  // whole contracts area now a detail route (no top tab)
    /^\/company\/hiring\/[^/]+/,
    /^\/company\/structure(\/|$)/,  // structure also delegated entirely
    /^\/company\/invoices/,
    /^\/company\/bonuses(\/|$)/,    // global bonuses log
  ];
  return detailPatterns.some((re) => re.test(trimmed));
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useRole();

  /* activeTab starts from the URL pathname (so a direct visit to
   * /company/people lands on People), then becomes local-state-driven
   * once the user clicks a tab. We DO update the URL on tab clicks so
   * refreshing keeps the user where they were. */
  const initialTab = useMemo(() => tabFromPath(pathname), [pathname]);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  /* Sync activeTab when pathname changes from outside (e.g. a Link
   * elsewhere in the app points at /company/hiring). */
  useEffect(() => {
    const t = tabFromPath(pathname);
    setActiveTab(t);
  }, [pathname]);

  if (role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-[#E5E5EA] mb-2">Admin only</h1>
        <p className="text-sm text-[#71757D]">
          The Admin module is restricted to admins.
        </p>
      </div>
    );
  }

  const onDetail = isDetailRoute(pathname);

  /* Tab click handler. Use router.replace so the URL syncs without
   * pushing onto history (back button still works between top tabs in
   * a sensible way). scroll: false stops the jump-to-top behavior
   * that was the worst part of the old experience. */
  function pickTab(t: Tab) {
    const target = TABS.find((x) => x.id === t)?.pathPrefix ?? "/company";
    setActiveTab(t);
    if (pathname !== target) {
      router.replace(target, { scroll: false });
    }
  }

  return (
    <PasscodeGate
      title="Admin"
      passcode={COMPANY_PASSCODE}
      storageKey={STORAGE_KEY}
    >
      <div className="min-h-full">
        <div className="bg-[#181818] sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 pt-6 pb-0">
            <h1 className="text-2xl font-semibold text-[#E5E5EA] mb-1">Admin</h1>
            <p className="text-sm text-[#71757D] mb-5">
              People, structure, hiring, contracts, settings - everything about running Ecom Landers itself.
            </p>
            <nav className="flex gap-1 overflow-x-auto pb-3">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => pickTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 text-sm whitespace-nowrap rounded-full transition-colors ${
                      active
                        ? "bg-white text-[#0C0C0C] font-medium"
                        : "text-[#71757D] hover:text-[#E5E5EA] hover:bg-[#222222]"
                    }`}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                );
              })}
              {/* Settings is outside /company so it stays a Link. */}
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3.5 py-1.5 text-sm whitespace-nowrap rounded-full text-[#71757D] hover:text-[#E5E5EA] hover:bg-[#222222]"
              >
                <Cog6ToothIcon className="size-4" />
                Settings
              </Link>
            </nav>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6">
          {onDetail ? (
            children
          ) : (
            <PanelFor tab={activeTab} />
          )}
        </div>
      </div>
    </PasscodeGate>
  );
}

/* Render the active panel. Each panel is its own client component so
 * its useEffect hooks run on mount, not on every tab switch - tab
 * switches just toggle which subtree is mounted. */
function PanelFor({ tab }: { tab: Tab }) {
  switch (tab) {
    case "people":
      return <PeoplePanel />;
    case "hiring":
      return <HiringPanel />;
    default:
      return <InboxPanel />;
  }
}
