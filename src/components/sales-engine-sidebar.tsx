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
} from "@heroicons/react/24/solid";
import {
  FunnelIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { Logo, LogoMark } from "@/components/logo";
import { AppSwitcher } from "@/components/app-switcher";

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

const navSections: NavSection[] = [
  {
    title: "Funnels",
    icon: <FunnelIcon className="size-4" />,
    defaultOpen: true,
    items: [
      { label: "Calendar", href: "/sales-engine/calendar" },
      { label: "Funnel Planner", href: "/sales-engine/growth-engine" },
      { label: "Lead Magnets", href: "/sales-engine/lead-magnets" },
    ],
  },
  {
    title: "Content",
    icon: <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h9.621a1.5 1.5 0 011.06.44l2.379 2.379A1.5 1.5 0 0117 5.879V16.5a1.5 1.5 0 01-1.5 1.5h-12A1.5 1.5 0 012 16.5v-13zm4.75 7a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" /></svg>,
    defaultOpen: true,
    items: [
      { label: "Articles", href: "/sales-engine/articles" },
      { label: "Portfolio", href: "/sales-engine/portfolio" },
      { label: "Portfolio v2", href: "/sales-engine/portfolio-v2" },
    ],
  },
  {
    title: "Pipeline",
    icon: <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" /></svg>,
    defaultOpen: true,
    items: [
      { label: "Pipeline", href: "/sales-engine/pipeline" },
      { label: "Leads", href: "/sales-engine/leads" },
      { label: "Scout", href: "/sales-engine/scout" },
      { label: "Deck Builder", href: "/sales-engine/deck-builder" },
      { label: "Audits", href: "/sales-engine/audits" },
    ],
  },
  {
    title: "Revenue",
    icon: <BanknotesIcon className="size-4" />,
    defaultOpen: true,
    items: [
      { label: "Revenue", href: "/sales-engine/revenue" },
      { label: "Price Lists", href: "/sales-engine/price-lists" },
    ],
  },
  {
    title: "Resources",
    icon: <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13 4.5a2.5 2.5 0 11.702 2.98L10.168 11H14a.5.5 0 010 1H5a.5.5 0 010-1h3.832l-3.534-3.52A2.5 2.5 0 1110 5.5a.5.5 0 01-.16.133L13.268 9H10l3-4.5z" /></svg>,
    defaultOpen: true,
    items: [
      { label: "Referrals", href: "/sales-engine/resources" },
    ],
  },
];

export function SalesEngineSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    navSections.forEach((s) => { map[s.title] = s.defaultOpen ?? true; });
    return map;
  });

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const navContent = (
    <>
      {/* Logo + App Switcher */}
      <div className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-5"} py-5`}>
        {collapsed ? (
          <Link href="/sales-engine"><LogoMark size={24} /></Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/sales-engine"><LogoMark size={20} /></Link>
            <AppSwitcher collapsed={collapsed} />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1 rounded text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors ${collapsed ? "hidden md:block" : "hidden md:block"}`}
        >
          {collapsed ? <ChevronRightIcon className="size-3.5" /> : <ChevronLeftIcon className="size-3.5" />}
        </button>
      </div>

      {/* Hero CTA */}
      {!collapsed && (
        <div className="px-3 mb-2">
          <Link
            href="/sales-engine/proposals"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#1B1B1B] text-white text-[12px] font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
          >
            Send Proposal
          </Link>
        </div>
      )}

      {/* Main Nav */}
      <div className="px-3 mb-2">
        <Link
          href="/sales-engine/social"
          onClick={() => setMobileOpen(false)}
          className={`
            flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-150
            ${pathname?.startsWith("/sales-engine/social")
              ? "bg-white shadow-[var(--shadow-soft)] text-[#1B1B1B]"
              : "text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
            }
          `}
        >
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z" /></svg>
          {!collapsed && <span className="text-[12.5px] font-semibold">Social Analytics</span>}
        </Link>
      </div>

      {/* Nav Sections */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className={`
                flex items-center w-full px-2.5 py-2 rounded-lg text-left transition-all duration-150
                text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50
                ${collapsed ? "justify-center" : "justify-between"}
              `}
            >
              <div className="flex items-center gap-2">
                {section.icon}
                {!collapsed && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider">{section.title}</span>
                )}
              </div>
              {!collapsed && (
                <ChevronDownIcon
                  className={`size-3 transition-transform ${openSections[section.title] ? "" : "-rotate-90"}`}
                />
              )}
            </button>

            {!collapsed && openSections[section.title] && (
              <div className="ml-4 pl-2.5 border-l border-[#EDEDEF] space-y-0.5 mt-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      block px-2.5 py-1.5 text-[12.5px] rounded-md transition-all duration-150
                      ${pathname === item.href
                        ? "text-[#1B1B1B] font-semibold bg-white shadow-[var(--shadow-soft)]"
                        : "text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-5 py-3 border-t border-[#EDEDEF]">
          <Link
            href="/changelog"
            onClick={() => setMobileOpen(false)}
            className="text-[11px] text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
          >
            Sales Engine v1.0
          </Link>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
      >
        <Bars3Icon className="size-5 text-[#1B1B1B]" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 h-full bg-[#F7F8FA] flex flex-col z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded text-[#A0A0A0] hover:text-[#1B1B1B]"
            >
              <XMarkIcon className="size-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`
          hidden md:flex flex-col h-screen bg-[#F7F8FA] transition-all duration-200 shrink-0
          ${collapsed ? "w-14" : "w-56"}
        `}
      >
        {navContent}
      </aside>
    </>
  );
}
