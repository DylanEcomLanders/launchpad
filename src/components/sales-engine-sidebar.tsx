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
  MagnifyingGlassIcon,
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
    title: "Pipeline",
    icon: <FunnelIcon className="size-4" />,
    defaultOpen: true,
    items: [
      { label: "Deals", href: "/tools/pipeline" },
      { label: "Revenue", href: "/tools/revenue" },
      { label: "Portfolio", href: "/tools/portfolio" },
      { label: "Price Lists", href: "/tools/price-lists" },
    ],
  },
  {
    title: "Content",
    icon: <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h9.621a1.5 1.5 0 011.06.44l2.379 2.379A1.5 1.5 0 0117 5.879V16.5a1.5 1.5 0 01-1.5 1.5h-12A1.5 1.5 0 012 16.5v-13zm4.75 7a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" /></svg>,
    defaultOpen: true,
    items: [
      { label: "Content Engine", href: "/tools/content-db" },
      { label: "Calendar", href: "/sales-engine/calendar" },
    ],
  },
  {
    title: "Research",
    icon: <MagnifyingGlassIcon className="size-4" />,
    defaultOpen: true,
    items: [
      { label: "Store Audit", href: "/tools/store-intel" },
      { label: "Ecom Prospecting", href: "/tools/prospect-scraper" },
      { label: "Social Intel", href: "/sales-engine/social" },
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
            href="/tools/proposals"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#1B1B1B] text-white text-[12px] font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
          >
            Send Proposal
          </Link>
        </div>
      )}

      {/* Command Centre */}
      <div className="px-3 mb-2">
        <Link
          href="/sales-engine"
          onClick={() => setMobileOpen(false)}
          className={`
            flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-150
            ${pathname === "/sales-engine"
              ? "bg-white shadow-[var(--shadow-soft)] text-[#1B1B1B]"
              : "text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
            }
          `}
        >
          <HomeIcon className="size-4" />
          {!collapsed && <span className="text-[12.5px] font-semibold">Dashboard</span>}
        </Link>
        <Link
          href="/sales-engine/leads"
          onClick={() => setMobileOpen(false)}
          className={`
            flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-150 mt-1
            ${pathname === "/sales-engine/leads"
              ? "bg-white shadow-[var(--shadow-soft)] text-[#1B1B1B]"
              : "text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
            }
          `}
        >
          <FunnelIcon className="size-4" />
          {!collapsed && <span className="text-[12.5px] font-semibold">Leads</span>}
        </Link>
        <Link
          href="/sales-engine/audits"
          onClick={() => setMobileOpen(false)}
          className={`
            flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-150 mt-1
            ${pathname?.startsWith("/sales-engine/audits")
              ? "bg-white shadow-[var(--shadow-soft)] text-[#1B1B1B]"
              : "text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
            }
          `}
        >
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" /></svg>
          {!collapsed && <span className="text-[12.5px] font-semibold">Audits</span>}
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
