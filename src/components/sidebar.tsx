"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  HomeIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  BanknotesIcon,
  UserGroupIcon,
  SparklesIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  RocketLaunchIcon,
  ArchiveBoxIcon,
  WrenchScrewdriverIcon,
  PuzzlePieceIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/solid";
import { LogoMark } from "@/components/logo";
import { AppSwitcher } from "@/components/app-switcher";
import { useRole } from "@/components/auth-gate";

interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

interface NavSection {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
  roles?: ("admin" | "cro")[];
  badge?: string;
  /* Visual grouping — sections within the same group render together,
   * separated by a hairline divider from the next group. Order matters
   * (top-down): lifecycle → ops → shelved. */
  group: "lifecycle" | "ops" | "shelved";
}

const teamZones = [
  { label: "UK", flag: "\u{1F1EC}\u{1F1E7}", tz: "Europe/London" },
  { label: "UA", flag: "\u{1F1FA}\u{1F1E6}", tz: "Europe/Kyiv" },
  { label: "IN", flag: "\u{1F1EE}\u{1F1F3}", tz: "Asia/Kolkata" },
  { label: "PH", flag: "\u{1F1F5}\u{1F1ED}", tz: "Asia/Manila" },
  { label: "NZ", flag: "\u{1F1F3}\u{1F1FF}", tz: "Pacific/Auckland" },
];

/* Sidebar follows the agency lifecycle (top-down): pin the daily drivers
 * (Mission Control, Offer, Pods), then dropdowns for each lifecycle phase,
 * ops/finance, reference material, and a default-collapsed Shelved drawer
 * for parked tools we're not actively using.
 *
 * Shelved housekeeping: review every 3 months — promote what's back in
 * use, or kill what's truly dead. Don't let it become a graveyard. */
const navSections: NavSection[] = [
  {
    title: "Acquisition",
    icon: <RocketLaunchIcon className="size-4" />,
    defaultOpen: true,
    group: "lifecycle",
    items: [
      { label: "Audits", href: "/sales-engine/audits" },
      { label: "Social", href: "/sales-engine/social" },
      { label: "Portfolio", href: "/sales-engine/portfolio" },
      { label: "Case Studies", href: "/sales-engine/case-studies" },
      { label: "Proposals", href: "/sales-engine/proposals" },
    ],
  },
  {
    title: "Delivery",
    icon: <PuzzlePieceIcon className="size-4" />,
    defaultOpen: false,
    group: "lifecycle",
    items: [
      { label: "Onboarding", href: "/tools/onboarding-inbox" },
      { label: "Portals", href: "/tools/client-portal" },
      { label: "Task Board", href: "/tools/task-board" },
    ],
  },
  {
    title: "Operations",
    icon: <BookOpenIcon className="size-4" />,
    defaultOpen: false,
    group: "lifecycle",
    items: [
      { label: "Operations Wiki", href: "/tools/ops-wiki" },
      { label: "Tickets", href: "/tools/issues" },
      { label: "Feedback", href: "/tools/feedback" },
    ],
  },
  {
    title: "Finance",
    icon: <BanknotesIcon className="size-4" />,
    defaultOpen: false,
    roles: ["admin"],
    badge: "PRIVATE",
    group: "ops",
    items: [
      { label: "Money (founder)", href: "/finance" },
      { label: "Price List", href: "/internal/pricing" },
      { label: "Price Calculator", href: "/tools/price-calculator" },
      { label: "Revenue", href: "/sales-engine/revenue" },
      { label: "Turnaround Times", href: "/internal/turnarounds" },
      { label: "Payment Link", href: "/tools/payment-link" },
      { label: "Dev Hours Log", href: "/tools/dev-hours" },
    ],
  },
  {
    title: "Company",
    icon: <BuildingOffice2Icon className="size-4" />,
    defaultOpen: false,
    roles: ["admin"],
    group: "ops",
    items: [
      { label: "Overview", href: "/company" },
      { label: "People", href: "/company/people" },
      { label: "Org Structure", href: "/company/structure" },
      { label: "Hiring", href: "/company/hiring" },
    ],
  },
  {
    title: "Shelved",
    icon: <ArchiveBoxIcon className="size-4" />,
    defaultOpen: false,
    roles: ["admin"],
    badge: "PARKED",
    group: "shelved",
    items: [
      { label: "Ecomlanders Cheat Sheet", href: "/internal/cheatsheet" },
      { label: "Conversion Engine Sheet", href: "/internal/cheatsheet/conversion-engine" },
      { label: "Articles", href: "/sales-engine/articles" },
      { label: "Calendar", href: "/sales-engine/calendar" },
      { label: "Content Calendar", href: "/content-calendar" },
      { label: "Lead Magnets", href: "/sales-engine/lead-magnets" },
      { label: "Leads (Outreach)", href: "/sales-engine/leads" },
      { label: "Quiz Leads", href: "/sales-engine/quiz-leads" },
      { label: "Scout", href: "/sales-engine/scout" },
      { label: "Resources (Referrals)", href: "/sales-engine/resources" },
      { label: "Pipeline", href: "/sales-engine/pipeline" },
      { label: "Funnel Playbook", href: "/tools/funnel-knowledge" },
      { label: "Funnels", href: "/tools/funnel-builder" },
      { label: "Deck Builder", href: "/sales-engine/deck-builder" },
      { label: "Referral Programme", href: "/referral-programme" },
    ],
  },
];

const homeItem = {
  label: "Mission Control",
  href: "/",
  icon: <HomeIcon className="size-4" />,
};
const offerItem = {
  label: "Offer",
  href: "/offer",
  icon: <SparklesIcon className="size-4" />,
};
const podsItem = {
  label: "Pods",
  href: "/pods-v2",
  icon: <UserGroupIcon className="size-4" />,
};
const engagementsItem = {
  label: "Clients",
  href: "/engagements",
  icon: <Squares2X2Icon className="size-4" />,
};
const agentsItem = {
  label: "Agents",
  href: "/agents",
  icon: <WrenchScrewdriverIcon className="size-4" />,
};

export function Sidebar() {
  const pathname = usePathname();
  const role = useRole();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  /* Accordion behaviour — at most one nav section open at a time. Initial
   * open is the first section flagged defaultOpen so the user lands on a
   * useful default; everything else stays collapsed until explicitly opened. */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      const firstDefaultOpen = navSections.find((s) => s.defaultOpen !== false);
      return Object.fromEntries(
        navSections.map((s) => [s.title, s.title === firstDefaultOpen?.title]),
      );
    }
  );

  const visibleSections = navSections.filter((s) => !s.roles || (role !== "team" && s.roles.includes(role)));
  const [now, setNow] = useState(() => new Date());
  const [onboardingCount, setOnboardingCount] = useState(0);

  /* Accordion: opening a section closes every other one. Clicking the
   * currently-open section closes it (so user can still get to a fully
   * collapsed state if they want pure focus). */
  function toggleSection(title: string) {
    setOpenSections((prev) => {
      if (prev[title]) {
        return { ...prev, [title]: false };
      }
      const next: Record<string, boolean> = {};
      for (const s of navSections) {
        next[s.title] = s.title === title;
      }
      return next;
    });
  }

  // Poll onboarding submissions every 5 minutes
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const { onboardingStore } = await import("@/lib/onboarding");
        const all = await onboardingStore.getAll();
        const pending = all.filter(s => !s.deleted_at && (s.status === "pending" || s.status === "in-progress"));
        setOnboardingCount(pending.length);
      } catch {}
    };
    checkOnboarding();
    const id = setInterval(checkOnboarding, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  /* Top-level link (Mission Control, Offer, Pods, Agents). Pinned, not collapsible. */
  function renderTopLink(item: { label: string; href: string; icon: React.ReactNode }) {
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`
          relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 mb-0.5
          ${
            isActive(item.href)
              ? "bg-white text-[#1B1B1B] font-medium shadow-[var(--shadow-nav-active)]"
              : "text-[#7A7A7A] hover:bg-white/60 hover:text-[#1B1B1B]"
          }
        `}
      >
        {item.icon}
        {!collapsed && <span className="flex-1">{item.label}</span>}
      </Link>
    );
  }

  /* Collapsible section with header + accordion items. */
  function renderSection(section: NavSection) {
    return (
      <div key={section.title} className="mb-1">
        {!collapsed ? (
          <button
            onClick={() => toggleSection(section.title)}
            className="flex items-center justify-between w-full px-5 py-1.5 group"
          >
            <div className="flex items-center gap-2">
              <span className="text-[#7A7A7A]">{section.icon}</span>
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
                {section.title}
              </span>
              {section.badge && (
                <span
                  className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    section.badge === "ADMIN"
                      ? "bg-[#FFEFE0] text-[#D97746]"
                      : section.badge === "PARKED"
                      ? "bg-[#F0F0F0] text-[#999]"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {section.badge}
                </span>
              )}
            </div>
            <ChevronDownIcon
              className={`size-3 text-[#C5C5C5] transition-transform duration-200 ${
                openSections[section.title] ? "" : "-rotate-90"
              }`}
            />
          </button>
        ) : (
          <div className="flex justify-center py-2">
            <span className="text-[#7A7A7A]" title={section.title}>
              {section.icon}
            </span>
          </div>
        )}

        {!collapsed && openSections[section.title] && (
          <div className="ml-7 pl-3 mt-0.5 mb-3 border-l border-[#E5E5EA]">
            {section.items.map((item) => {
              const active = !item.external && isActive(item.href);
              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-1.5 px-3 py-[6px] text-[13px] rounded-md transition-all duration-150 text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
                  >
                    {item.label}
                    <svg
                      className="size-3 opacity-40 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.25-.75a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V6.31l-5.47 5.47a.75.75 0 01-1.06-1.06l5.47-5.47H12.25a.75.75 0 01-.75-.75z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </a>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    block px-3 py-[6px] text-[13px] rounded-md transition-all duration-150
                    ${
                      active
                        ? "text-[#1B1B1B] font-medium bg-white shadow-[var(--shadow-soft)]"
                        : "text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderDivider() {
    if (collapsed) return <div className="mx-3 my-2 border-t border-[#EDEDEF]" />;
    return <div className="mx-5 my-3 border-t border-[#EDEDEF]" />;
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-[var(--shadow-card)] md:hidden"
        aria-label="Open menu"
      >
        <Bars3Icon className="size-5 text-[#1B1B1B]" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#1B1B1B]/10 backdrop-blur-[2px] z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          fixed md:relative z-50 md:z-0
          h-screen bg-[#F7F8FA]
          flex flex-col
          transition-all duration-200 ease-in-out
          ${collapsed ? "md:w-16" : "md:w-56"}
          w-56
        `}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 h-14">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
                <LogoMark size={18} />
              </Link>
              <AppSwitcher collapsed={collapsed} />
            </div>
          )}
          {collapsed && (
            <Link href="/" className="mx-auto" onClick={() => setMobileOpen(false)}>
              <LogoMark size={18} />
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg md:hidden"
            aria-label="Close menu"
          >
            <XMarkIcon className="size-[18px]" />
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-white hover:shadow-[var(--shadow-soft)] hidden md:block transition-all duration-200"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRightIcon className="size-3.5 text-[#7A7A7A]" /> : <ChevronLeftIcon className="size-3.5 text-[#7A7A7A]" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {/* Pinned daily drivers — Mission Control, Offer, Pods */}
          <div className="px-3 mb-1 mt-2 space-y-0.5">
            {renderTopLink(homeItem)}
            {renderTopLink(offerItem)}
            {renderTopLink(engagementsItem)}
            {renderTopLink(podsItem)}
          </div>

          {renderDivider()}

          {/* Lifecycle: Acquire, Deliver, Operate */}
          {visibleSections.filter((s) => s.group === "lifecycle").map((section) => renderSection(section))}

          {renderDivider()}

          {/* Ops: Money, Company */}
          {visibleSections.filter((s) => s.group === "ops").map((section) => renderSection(section))}

          {renderDivider()}

          {/* Shelved — parked tools, default-collapsed */}
          {visibleSections.filter((s) => s.group === "shelved").map((section) => renderSection(section))}

          {renderDivider()}

          {/* Standalone bottom links — Agents, Settings */}
          <div className="px-3 mb-1">{renderTopLink(agentsItem)}</div>
          {!collapsed && role === "admin" && (
            <div className="px-5 mt-2 space-y-1">
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-wider rounded-md transition-all duration-150
                  ${pathname === "/settings"
                    ? "text-[#1B1B1B] bg-white shadow-[var(--shadow-soft)]"
                    : "text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
                  }
                `}
              >
                Settings
              </Link>
            </div>
          )}
        </nav>

        {/* Team Hub CTA — sits just above the timezone card */}
        {!collapsed && (
          <div className="mx-3 mb-2">
            <Link
              href="/team"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 border ${
                pathname === "/team"
                  ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                  : "bg-transparent text-[#1B1B1B] border-[#1B1B1B]/20 hover:border-[#1B1B1B] hover:bg-white"
              }`}
            >
              <UserGroupIcon className="size-3.5" />
              Team Hub
            </Link>
          </div>
        )}

        {/* Team Timezones */}
        {!collapsed && (
          <div className="mx-3 mb-2 px-3 py-3 rounded-lg bg-white shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-1.5 mb-2">
              <ClockIcon className="size-3 text-[#A0A0A0]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                Team
              </span>
            </div>
            <div className="space-y-1">
              {teamZones.map((z) => (
                <div
                  key={z.tz}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="text-[#7A7A7A]">
                    {z.flag} {z.label}
                  </span>
                  <span className="tabular-nums text-[#A0A0A0]">
                    {now.toLocaleTimeString("en-GB", {
                      timeZone: z.tz,
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {collapsed && (
          <div className="py-3 flex justify-center">
            <ClockIcon className="size-3.5 text-[#A0A0A0]" />
          </div>
        )}

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-3">
            <Link
              href="/changelog"
              onClick={() => setMobileOpen(false)}
              className="text-[11px] text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
            >
              Launchpad v0.45.2
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
