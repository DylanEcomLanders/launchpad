"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FolderIcon,
  BookOpenIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/solid";
import { Logo } from "@/components/logo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    label: "Portals",
    href: "/team/portals",
    icon: <FolderIcon className="size-4" />,
  },
  {
    label: "Operations Wiki",
    href: "/team/ops-wiki",
    icon: <BookOpenIcon className="size-4" />,
    badge: "WIP",
  },
];

const toolItems: NavItem[] = [
  {
    label: "Dev QA Checklist",
    href: "/team/qa",
    icon: <ClipboardDocumentCheckIcon className="size-4" />,
  },
];

export function TeamSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white border border-[#E5E5EA] md:hidden"
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
          h-screen bg-white border-r border-[#E5E5EA]
          flex flex-col
          transition-all duration-200 ease-in-out
          w-52
        `}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#E5E5EA]">
          <Link
            href="/team"
            className="flex items-center"
            onClick={() => setMobileOpen(false)}
          >
            <Logo height={16} />
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded md:hidden"
            aria-label="Close menu"
          >
            <XMarkIcon className="size-[18px]" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Home link */}
          <div className="px-2 mb-4">
            <Link
              href="/team"
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm
                transition-colors duration-150
                ${
                  pathname === "/team"
                    ? "bg-accent-light text-accent font-medium border-l-2 border-accent"
                    : "hover:bg-[#F3F3F5] text-[#7A7A7A] border-l-2 border-transparent"
                }
              `}
            >
              <HomeIcon className="size-4" />
              <span>Team Tools</span>
            </Link>
          </div>

          {/* Section header */}
          <div className="px-4 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              Delivery
            </span>
          </div>

          {/* Nav items */}
          <div className="px-2 space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.comingSoon ? "#" : item.href}
                onClick={(e) => {
                  if (item.comingSoon) e.preventDefault();
                  else setMobileOpen(false);
                }}
                className={`
                  flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm
                  transition-colors duration-150
                  ${
                    item.comingSoon
                      ? "text-[#C5C5C5] cursor-default"
                      : pathname.startsWith(item.href)
                        ? "bg-[#EDEDEF] font-medium border-l-2 border-accent"
                        : "hover:bg-[#F3F3F5] text-[#7A7A7A] border-l-2 border-transparent"
                  }
                `}
              >
                {item.icon}
                <span className="flex items-center gap-1.5">
                  {item.label}
                  {item.comingSoon && (
                    <span className="px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#EDEDEF] text-[#A0A0A0] rounded">
                      Soon
                    </span>
                  )}
                  {item.badge && !item.comingSoon && (
                    <span className="px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 rounded">
                      {item.badge}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>

          {/* Tools section */}
          <div className="px-4 mb-1.5 mt-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              Tools
            </span>
          </div>
          <div className="px-2 space-y-0.5">
            {toolItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm
                  transition-colors duration-150
                  ${
                    pathname.startsWith(item.href)
                      ? "bg-[#EDEDEF] font-medium border-l-2 border-accent"
                      : "hover:bg-[#F3F3F5] text-[#7A7A7A] border-l-2 border-transparent"
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#E5E5EA] space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-[11px] font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
          >
            <ArrowLeftIcon className="size-3" />
            Back to Admin
          </Link>
          <span className="text-[11px] text-[#A0A0A0]">Team Tools v0.1</span>
        </div>
      </aside>
    </>
  );
}
