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
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/components/auth-gate";
import { PasscodeGate } from "@/components/passcode-gate";
import {
  UserGroupIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import PeoplePanel from "./_panels/PeoplePanel";
import ContractsPanel from "./_panels/ContractsPanel";
import SettingsPanel from "./_panels/SettingsPanel";

type Tab = "people" | "contracts" | "settings";

const TABS: { id: Tab; label: string; icon: typeof UserGroupIcon; pathPrefix: string }[] = [
  { id: "people",    label: "People",    icon: UserGroupIcon,     pathPrefix: "/company/people" },
  { id: "contracts", label: "Contracts", icon: DocumentTextIcon,  pathPrefix: "/company/contracts" },
  { id: "settings",  label: "Settings",  icon: Cog6ToothIcon,     pathPrefix: "/company/settings" },
];

const COMPANY_PASSCODE =
  process.env.NEXT_PUBLIC_COMPANY_PASSWORD || "Football2026";
const STORAGE_KEY = "launchpad-company-unlocked";

/* Pure derive: pathname → which top tab is "active" for highlight
 * + initial render. Anything not matching a top-tab prefix falls back
 * to overview. */
function tabFromPath(pathname: string): Tab {
  if (pathname.startsWith("/company/contracts")) return "contracts";
  if (pathname.startsWith("/company/settings")) return "settings";
  /* Everything else (incl. bare /company) lands on People, the default. */
  return "people";
}

/* Detail routes own the body — layout yields to {children}. Anything
 * deeper than the top-tab roots qualifies. Invoices detail still lives
 * under /company/invoices even though the tab is gone. */
function isDetailRoute(pathname: string): boolean {
  const trimmed = pathname.replace(/\/+$/, "");
  const detailPatterns = [
    /^\/company\/people\/[^/]+/,
    /^\/company\/contracts\/[^/]+/,  // a specific contract or templates editor
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
        <h1 className="text-xl font-semibold text-foreground mb-2">Admin only</h1>
        <p className="text-sm text-subtle">
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
      {/* min-h calc fills the visible main area (viewport - 3.5rem
       * top header) so the dark page bg extends to the bottom even
       * when content is short. Hero Offer is the ONE surface that
       * wears the gradient + shimmer chrome - /admin stays clean +
       * soft so Hero Offer keeps its visual throne. */}
      <div className="min-h-[calc(100dvh-3.5rem)] bg-background relative">
        {/* Header sits flush with the page bg. Plain white title,
         * subtle active-tab tint, no gradient theatrics. */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
          <div className="px-6 md:px-10 pt-6 pb-0">
            <h1 className="text-2xl font-semibold text-foreground mb-1">Company</h1>
            <p className="text-sm text-subtle mb-5">
              Your team, their contracts, and how Ecom Landers is structured.
            </p>
            <nav className="flex gap-0.5 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => pickTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap rounded transition-colors ${
                      active
                        ? "bg-surface-raised text-foreground font-medium"
                        : "text-muted hover:text-foreground hover:bg-surface-raised"
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
        <div className="px-6 md:px-10 py-6 relative">
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
  if (tab === "contracts") return <ContractsPanel />;
  if (tab === "settings") return <SettingsPanel />;
  return <PeoplePanel />;
}
