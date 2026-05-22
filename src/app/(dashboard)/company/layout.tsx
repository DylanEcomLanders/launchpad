"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useRole } from "@/components/auth-gate";
import {
  ChartBarIcon,
  UserGroupIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const TABS = [
  { href: "/company", label: "Overview", icon: ChartBarIcon, exact: true },
  { href: "/company/people", label: "People", icon: UserGroupIcon },
  { href: "/company/structure", label: "Structure", icon: Squares2X2Icon },
  { href: "/company/invoices", label: "Invoices", icon: DocumentTextIcon },
  { href: "/company/hiring", label: "Hiring", icon: BriefcaseIcon },
  { href: "/company/contracts", label: "Contracts", icon: ShieldCheckIcon },
];

const COMPANY_PASSWORD = "Football2026";
const UNLOCK_KEY = "launchpad-company-unlocked";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const role = useRole();

  if (role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-[#1B1B1B] mb-2">Admin only</h1>
        <p className="text-sm text-[#7A7A7A]">
          The Company module is restricted to admins.
        </p>
      </div>
    );
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <CompanyGate>
      <div className="min-h-full">
        <div className="border-b border-[#E5E5EA] bg-white sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 pt-6 pb-0">
            <h1 className="text-2xl font-semibold text-[#1B1B1B] mb-1">Company</h1>
            <p className="text-sm text-[#7A7A7A] mb-5">
              People, structure, money out, and hiring — everything about Ecom Landers itself.
            </p>
            <nav className="flex gap-1 overflow-x-auto -mb-px">
              {TABS.map((tab) => {
                const active = isActive(tab.href, tab.exact);
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                      active
                        ? "border-[#1B1B1B] text-[#1B1B1B] font-medium"
                        : "border-transparent text-[#7A7A7A] hover:text-[#1B1B1B]"
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
    </CompanyGate>
  );
}

function CompanyGate({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (
      typeof window !== "undefined" &&
      sessionStorage.getItem(UNLOCK_KEY) === "true"
    ) {
      setUnlocked(true);
    }
  }, []);

  if (!hydrated) return null;

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-6">
        <div className="bg-white rounded-2xl border border-[#EDEDEF] shadow-[var(--shadow-card)] p-8 max-w-sm w-full">
          <p className="text-[12px] font-semibold uppercase tracking-wider mb-2 text-[#16A34A]">
            Ecomlanders
          </p>
          <h2 className="text-lg font-semibold text-[#1B1B1B]">Company</h2>
          <p className="mt-1 text-[13px] text-[#666]">
            Enter the password to view.
          </p>
          <input
            type="password"
            value={input}
            autoFocus
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (input === COMPANY_PASSWORD) {
                  sessionStorage.setItem(UNLOCK_KEY, "true");
                  setUnlocked(true);
                } else {
                  setError(true);
                }
              }
            }}
            placeholder="Password"
            className="mt-5 w-full px-4 py-3 text-[14px] border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B] transition-colors"
          />
          {error && (
            <p className="mt-2 text-[12px] text-red-600">Incorrect password.</p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
