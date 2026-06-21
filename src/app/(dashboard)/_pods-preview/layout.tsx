"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { href: string; label: string }[] = [
  { href: "/pods-preview", label: "Overview" },
  { href: "/pods-preview/board", label: "Pods" },
  { href: "/pods-preview/strategist", label: "Strategist" },
  { href: "/pods-preview/delivery", label: "Delivery" },
  { href: "/pods-preview/tests", label: "Tests" },
  { href: "/pods-preview/timeline", label: "Timeline & KPIs" },
  { href: "/pods-preview/health", label: "Client Health" },
  { href: "/pods-preview/growth", label: "Growth Pipeline" },
];

export default function PodsPreviewLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-20 border-b border-[#2A2A2A] bg-[#181818]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-6 py-2.5 md:px-10">
          <span className="mr-3 inline-flex items-center gap-1.5 rounded-full border border-white bg-[#1B1B1B] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Pods V2 · Preview
          </span>
          {NAV.map((item) => {
            const active =
              item.href === "/pods-preview"
                ? pathname === "/pods-preview"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white text-[#0C0C0C]"
                    : "text-[#71757D] hover:bg-[#222222] hover:text-[#E5E5EA]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
