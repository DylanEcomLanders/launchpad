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
  ClipboardDocumentListIcon,
  PhotoIcon,
  Squares2X2Icon,
  BanknotesIcon,
  DocumentTextIcon,
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
    label: "Task Board",
    href: "/tasks",
    icon: <ClipboardDocumentListIcon className="size-4" />,
  },
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
  {
    label: "Payments",
    href: "/team/payments",
    icon: <BanknotesIcon className="size-4" />,
  },
  {
    /* Native invoice submission — replaces the old ClickUp form linked
     * from /team/payments. Submissions create finance_expenses rows
     * (contractor, due) via /api/team-invoice/submit. */
    label: "Submit invoice",
    href: "/team/invoice",
    icon: <DocumentTextIcon className="size-4" />,
  },
];

const toolItems: NavItem[] = [
  {
    label: "Swipe File",
    href: "/team/swipe-file",
    icon: <PhotoIcon className="size-4" />,
  },
  {
    label: "Font Library",
    href: "/team/fonts",
    icon: <Squares2X2Icon className="size-4" />,
  },
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
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-[#181818] border border-[#2A2A2A] md:hidden"
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
          h-screen bg-[#181818] border-r border-[#2A2A2A]
          flex flex-col
          transition-all duration-200 ease-in-out
          w-52
        `}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#2A2A2A]">
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
                    : "hover:bg-[#222222] text-[#71757D] border-l-2 border-transparent"
                }
              `}
            >
              <HomeIcon className="size-4" />
              <span>Team Tools</span>
            </Link>
          </div>

          {/* Section header */}
          <div className="px-4 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
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
                        ? "bg-[#222222] font-medium border-l-2 border-accent"
                        : "hover:bg-[#222222] text-[#71757D] border-l-2 border-transparent"
                  }
                `}
              >
                {item.icon}
                <span className="flex items-center gap-1.5">
                  {item.label}
                  {item.comingSoon && (
                    <span className="px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#222222] text-[#71757D] rounded">
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
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
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
                      ? "bg-[#222222] font-medium border-l-2 border-accent"
                      : "hover:bg-[#222222] text-[#71757D] border-l-2 border-transparent"
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
        <div className="px-4 py-3 border-t border-[#2A2A2A] space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-[11px] font-medium text-[#71757D] hover:text-[#E5E5EA] transition-colors"
          >
            <ArrowLeftIcon className="size-3" />
            Back to Admin
          </Link>
          <span className="text-[11px] text-[#71757D]">Team Tools v0.1</span>
        </div>
      </aside>
    </>
  );
}
