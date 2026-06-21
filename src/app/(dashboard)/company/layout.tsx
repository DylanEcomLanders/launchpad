"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/components/auth-gate";
import { PasscodeGate } from "@/components/passcode-gate";
import {
  ChartBarIcon,
  UserGroupIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const TABS = [
  { href: "/company", label: "Overview", icon: ChartBarIcon, exact: true },
  { href: "/company/people", label: "People", icon: UserGroupIcon },
  { href: "/company/structure", label: "Structure", icon: Squares2X2Icon },
  { href: "/company/invoices", label: "Invoices", icon: DocumentTextIcon },
  { href: "/company/hiring", label: "Hiring", icon: BriefcaseIcon },
  { href: "/company/contracts", label: "Contracts", icon: ShieldCheckIcon },
  // Settings lives at /settings - links out of this layout for now. Move to
  // /company/settings later for full consolidation.
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon },
];

const COMPANY_PASSCODE = "Football2026";
const STORAGE_KEY = "launchpad-company-unlocked";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const role = useRole();

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

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
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
                const active = isActive(tab.href, tab.exact);
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 text-sm whitespace-nowrap rounded-full transition-colors ${
                      active
                        ? "bg-white text-[#0C0C0C] font-medium"
                        : "text-[#71757D] hover:text-[#E5E5EA] hover:bg-[#222222]"
                    }`}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6">{children}</div>
      </div>
    </PasscodeGate>
  );
}
