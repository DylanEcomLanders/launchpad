"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FileText,
  CalendarDays,
  Calculator,
  Home,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
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
    title: "Ecomlanders",
    items: [
      {
        label: "Project Doc Creation",
        href: "/tools/scope-generator",
        icon: <FileText size={16} />,
      },
      {
        label: "Project Roadmap",
        href: "/tools/project-roadmap",
        icon: <CalendarDays size={16} />,
      },
      {
        label: "Price Calculator",
        href: "/tools/price-calculator",
        icon: <Calculator size={16} />,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

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
        <Menu size={20} />
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
            <X size={18} />
          </button>

          {/* Collapse toggle on desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-[#F0F0F0] hidden md:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
                  ? "bg-[#F0F0F0] font-medium"
                  : "hover:bg-[#F5F5F5] text-[#6B6B6B]"
                }
              `}
            >
              <Home size={16} />
              {!collapsed && <span>Home</span>}
            </Link>
          </div>

          {/* Sections */}
          {navSections.map((section) => (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <div className="px-4 mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                    {section.title}
                  </span>
                </div>
              )}
              {collapsed && (
                <div className="mx-auto w-6 border-t border-[#E5E5E5] mb-2" />
              )}
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
                        ? "bg-[#F0F0F0] font-medium"
                        : "hover:bg-[#F5F5F5] text-[#6B6B6B]"
                      }
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                ))}
                {section.items.length === 0 && !collapsed && (
                  <span className="block px-2.5 py-2 text-xs text-[#AAAAAA]">
                    No tools yet
                  </span>
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* Team Timezones */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-[#E5E5E5]">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={11} className="text-[#AAAAAA]" />
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
            <Clock size={14} className="text-[#AAAAAA]" />
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
