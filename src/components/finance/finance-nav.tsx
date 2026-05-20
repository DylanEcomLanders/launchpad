"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/finance", label: "Dashboard" },
  { href: "/finance/invoices", label: "Invoices" },
  { href: "/finance/expenses", label: "Expenses" },
  { href: "/finance/vat-return", label: "VAT return" },
  { href: "/finance/documents", label: "Documents" },
  { href: "/finance/import", label: "Import" },
  { href: "/finance/settings", label: "Settings" },
];

export function FinanceNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-0.5 -mb-px overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => {
        const active =
          tab.href === "/finance"
            ? pathname === "/finance"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
              active
                ? "border-[#1B1B1B] text-[#1B1B1B]"
                : "border-transparent text-[#7A7A7A] hover:text-[#1B1B1B] hover:border-[#EEEEF1]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
