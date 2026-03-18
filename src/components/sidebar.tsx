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
  FolderIcon,
  BanknotesIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  BeakerIcon,
} from "@heroicons/react/24/solid";
import { Logo, LogoMark } from "@/components/logo";

interface NavItem {
  label: string;
  href: string;
}

interface NavSection {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
}

const teamZones = [
  { label: "UK", flag: "🇬🇧", tz: "Europe/London" },
  { label: "UA", flag: "🇺🇦", tz: "Europe/Kyiv" },
  { label: "IN", flag: "🇮🇳", tz: "Asia/Kolkata" },
  { label: "PH", flag: "🇵🇭", tz: "Asia/Manila" },
  { label: "NZ", flag: "🇳🇿", tz: "Pacific/Auckland" },
];

const navSections: NavSection[] = [
  {
    title: "Projects",
    icon: <FolderIcon className="size-4" />,
    defaultOpen: true,
    items: [
      { label: "Proposals", href: "/tools/proposals" },
      { label: "Project Kickoff", href: "/tools/project-kickoff" },
      { label: "Client Portals", href: "/tools/client-portal" },
    ],
  },
  {
    title: "Finance",
    icon: <BanknotesIcon className="size-4" />,
    defaultOpen: true,
    items: [
      { label: "Price Calculator", href: "/tools/price-calculator" },
      { label: "Dev Hours Log", href: "/tools/dev-hours" },
      { label: "Invoice Generator", href: "/tools/invoice-generator" },
      { label: "Payment Link", href: "/tools/payment-link" },
      { label: "Expenses", href: "/tools/expenses" },
    ],
  },
  {
    title: "Sales",
    icon: <RocketLaunchIcon className="size-4" />,
    defaultOpen: true,
    items: [
      { label: "Revenue", href: "/tools/revenue" },
      { label: "Lead Scraper", href: "/tools/prospect-scraper" },
      { label: "Audit Engine", href: "/tools/store-intel" },
      { label: "Portfolio", href: "/tools/portfolio" },
      { label: "Price Lists", href: "/tools/price-lists" },
      { label: "Content Engine", href: "/tools/content-db" },
    ],
  },
  {
    title: "Team",
    icon: <UserGroupIcon className="size-4" />,
    defaultOpen: true,
    items: [
      { label: "Team Hub", href: "/team" },
      { label: "QA Checklist", href: "/tools/qa-checklist" },
      { label: "Dev Self-Check", href: "/tools/dev-selfcheck" },
      { label: "Feedback", href: "/tools/feedback" },
      { label: "Playbooks", href: "/tools/playbooks" },
    ],
  },
  {
    title: "CRO",
    icon: <BeakerIcon className="size-4" />,
    defaultOpen: false,
    items: [
      { label: "CRO Monitor", href: "/tools/cro-monitor" },
      { label: "CRO Audit", href: "/tools/cro-audit" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(navSections.map((s) => [s.title, s.defaultOpen !== false]))
  );
  const [now, setNow] = useState(() => new Date());

  function toggleSection(title: string) {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

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
            <Link href="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
              <Logo height={16} />
            </Link>
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
          {/* Mission Control */}
          <div className="px-3 mb-4">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-200
                ${pathname === "/"
                  ? "bg-white text-[#1B1B1B] font-medium shadow-[var(--shadow-nav-active)]"
                  : "text-[#7A7A7A] hover:bg-white/60 hover:text-[#1B1B1B]"
                }
              `}
            >
              <HomeIcon className="size-4" />
              {!collapsed && <span>Mission Control</span>}
            </Link>
          </div>

          {/* Sections */}
          {navSections.map((section) => (
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
                  </div>
                  <ChevronDownIcon
                    className={`size-3 text-[#C5C5C5] transition-transform duration-200 ${
                      openSections[section.title] ? "" : "-rotate-90"
                    }`}
                  />
                </button>
              ) : (
                <div className="flex justify-center py-2">
                  <span className="text-[#7A7A7A]" title={section.title}>{section.icon}</span>
                </div>
              )}

              {!collapsed && openSections[section.title] && (
                <div className="ml-7 pl-3 mt-0.5 mb-3 border-l border-[#E5E5EA]">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          block px-3 py-[6px] text-[13px] rounded-md transition-all duration-150
                          ${isActive
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
          ))}

          {/* Standalone links */}
          {!collapsed && (
            <div className="px-5 mt-2">
              <Link
                href="/tools/issues"
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-wider rounded-md transition-all duration-150
                  ${pathname === "/tools/issues"
                    ? "text-[#1B1B1B] bg-white shadow-[var(--shadow-soft)]"
                    : "text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
                  }
                `}
              >
                Issues
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-wider rounded-md transition-all duration-150 mt-1
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
              Launchpad v0.7
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
