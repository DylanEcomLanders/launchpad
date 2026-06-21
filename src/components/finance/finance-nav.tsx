"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* Tabs grouped by intent:
 *   - Bookkeeping: Dashboard / Invoices / Expenses / Monthly costs / VAT / Documents / Import / Settings
 *   - Founder-only tools (previously the sidebar "PRIVATE" section): Pricing /
 *     Calculator / Revenue / Turnarounds / Payment link / Dev hours
 * The founder tools currently live at their original external routes; matching
 * each tab to its url. Proper consolidation would move those routes under
 * /finance/[slug] — that's a bigger refactor for later. */
const tabs = [
  { href: "/finance", label: "Dashboard" },
  { href: "/finance/invoices", label: "Invoices" },
  { href: "/finance/expenses", label: "Expenses" },
  { href: "/finance/monthly-costs", label: "Monthly costs" },
  { href: "/finance/vat-return", label: "VAT return" },
  { href: "/finance/documents", label: "Documents" },
  { href: "/finance/import", label: "Import" },
  { href: "/finance/settings", label: "Settings" },
  // Founder tools — these jump out to their existing routes for now.
  { href: "/internal/pricing", label: "Pricing" },
  { href: "/tools/price-calculator", label: "Calculator" },
  { href: "/tools/revenue", label: "Revenue" },
  { href: "/internal/turnarounds", label: "Turnarounds" },
  { href: "/tools/payment-link", label: "Payment link" },
  { href: "/tools/dev-hours", label: "Dev hours" },
];

export function FinanceNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => {
        const active =
          tab.href === "/finance"
            ? pathname === "/finance"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
              active
                ? "bg-white text-[#0C0C0C]"
                : "text-[#71757D] hover:text-[#E5E5EA] hover:bg-[#222222]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
