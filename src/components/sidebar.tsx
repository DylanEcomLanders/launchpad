"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  DocumentDuplicateIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  ReceiptPercentIcon,
  ClipboardDocumentCheckIcon,
  HomeIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  WalletIcon,
  SignalIcon,
  BeakerIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  RocketLaunchIcon,
  GlobeAltIcon,
  FunnelIcon,
  ArrowsRightLeftIcon,
  SparklesIcon,
  BanknotesIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/react/24/solid";
import { Logo, LogoMark } from "@/components/logo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  wip?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
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
    title: "Project Management",
    items: [
      {
        label: "Project Setup",
        href: "/tools/project-kickoff",
        icon: <RocketLaunchIcon className="size-4" />,
      },
      {
        label: "Price Calculator",
        href: "/tools/price-calculator",
        icon: <CalculatorIcon className="size-4" />,
      },
      {
        label: "QA Checklist",
        href: "/tools/qa-checklist",
        icon: <ClipboardDocumentCheckIcon className="size-4" />,
      },
      {
        label: "Portfolio",
        href: "/tools/portfolio",
        icon: <GlobeAltIcon className="size-4" />,
      },
      {
        label: "Price Lists",
        href: "/tools/price-lists",
        icon: <BanknotesIcon className="size-4" />,
      },
      {
        label: "Feedback",
        href: "/tools/feedback",
        icon: <ChatBubbleLeftEllipsisIcon className="size-4" />,
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Invoice Generator",
        href: "/tools/invoice-generator",
        icon: <ReceiptPercentIcon className="size-4" />,
      },
      {
        label: "Dev Hours",
        href: "/tools/dev-hours",
        icon: <ClockIcon className="size-4" />,
      },
      {
        label: "Expenses",
        href: "/tools/expenses",
        icon: <WalletIcon className="size-4" />,
      },
    ],
  },
  {
    title: "Work in Progress",
    items: [
      {
        label: "Funnel Planner",
        href: "/tools/funnel-planner",
        icon: <FunnelIcon className="size-4" />,
        wip: true,
      },
      {
        label: "Content Repurposer",
        href: "/tools/content-repurposer",
        icon: <ArrowsRightLeftIcon className="size-4" />,
        wip: true,
      },
      {
        label: "Hook Generator",
        href: "/tools/hook-generator",
        icon: <SparklesIcon className="size-4" />,
        wip: true,
      },
      {
        label: "Client Portal",
        href: "/tools/client-portal",
        icon: <GlobeAltIcon className="size-4" />,
        wip: true,
      },
      {
        label: "Store Intelligence",
        href: "/tools/store-intel",
        icon: <MagnifyingGlassIcon className="size-4" />,
        wip: true,
      },
      {
        label: "Upsell Scanner",
        href: "/tools/upsell-scanner",
        icon: <SignalIcon className="size-4" />,
        wip: true,
      },
      {
        label: "Proposals",
        href: "/tools/proposals",
        icon: <DocumentDuplicateIcon className="size-4" />,
        wip: true,
      },
      {
        label: "Outreach Generator",
        href: "/tools/outreach",
        icon: <PaperAirplaneIcon className="size-4" />,
        wip: true,
      },
      {
        label: "Prospect Scraper",
        href: "/tools/prospect-scraper",
        icon: <UserGroupIcon className="size-4" />,
        wip: true,
      },
      {
        label: "CRO Test Monitor",
        href: "/tools/cro-monitor",
        icon: <ChartBarIcon className="size-4" />,
        wip: true,
      },
      {
        label: "CRO Audit",
        href: "/tools/cro-audit",
        icon: <BeakerIcon className="size-4" />,
        wip: true,
      },
      {
        label: "Playbooks",
        href: "/tools/playbooks",
        icon: <BookOpenIcon className="size-4" />,
        wip: true,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(navSections.map((s) => [s.title, s.title !== "Work in Progress"]))
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
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white border border-[#E5E5E5] md:hidden"
        aria-label="Open menu"
      >
        <Bars3Icon className="size-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          fixed md:relative z-50 md:z-0
          h-screen bg-white border-r border-[#E5E5E5]
          flex flex-col
          transition-all duration-200 ease-in-out
          ${collapsed ? "md:w-16" : "md:w-60"}
          w-60
        `}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#E5E5E5]">
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

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded md:hidden"
            aria-label="Close menu"
          >
            <XMarkIcon className="size-[18px]" />
          </button>

          {/* Collapse toggle on desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-[#F0F0F0] hidden md:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRightIcon className="size-3.5" /> : <ChevronLeftIcon className="size-3.5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Home link */}
          <div className="px-2 mb-4">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm
                transition-colors duration-150
                ${pathname === "/"
                  ? "bg-accent-light text-accent font-medium border-l-2 border-accent"
                  : "hover:bg-[#F7F7F8] text-[#6B6B6B] border-l-2 border-transparent"
                }
              `}
            >
              <HomeIcon className="size-4" />
              {!collapsed && <span>Mission Control</span>}
            </Link>
          </div>

          {/* Sections */}
          {navSections.map((section) => (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-4 mb-1.5 group"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                    {section.title}
                  </span>
                  <ChevronDownIcon
                    className={`size-3 text-[#AAAAAA] transition-transform duration-200 ${
                      openSections[section.title] ? "" : "-rotate-90"
                    }`}
                  />
                </button>
              )}
              {collapsed && (
                <div className="mx-auto w-6 border-t border-[#E5E5E5] mb-2" />
              )}
              {(collapsed || openSections[section.title]) && (
                <div className="px-2 space-y-0.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm
                        transition-colors duration-150
                        ${pathname === item.href
                          ? "bg-[#F0F0F0] font-medium border-l-2 border-accent"
                          : "hover:bg-[#F5F5F5] text-[#6B6B6B] border-l-2 border-transparent"
                        }
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      {item.icon}
                      {!collapsed && (
                        <span className="flex items-center gap-1.5">
                          {item.label}
                          {item.wip && (
                            <span className="px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-600 rounded">
                              WIP
                            </span>
                          )}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Team Timezones */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-[#E5E5E5]">
            <div className="flex items-center gap-1.5 mb-2">
              <ClockIcon className="size-3 text-[#AAAAAA]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                Team
              </span>
            </div>
            <div className="space-y-1">
              {teamZones.map((z) => (
                <div
                  key={z.tz}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="text-[#6B6B6B]">
                    {z.flag} {z.label}
                  </span>
                  <span className="tabular-nums text-[#AAAAAA]">
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
          <div className="py-3 border-t border-[#E5E5E5] flex justify-center">
            <ClockIcon className="size-3.5 text-[#AAAAAA]" />
          </div>
        )}

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-[#E5E5E5]">
            <span className="text-[11px] text-[#AAAAAA]">Launchpad v0.1</span>
          </div>
        )}
      </aside>
    </>
  );
}
