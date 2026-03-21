"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";

const apps = [
  { name: "Launchpad", href: "/", prefix: "/tools" },
  { name: "Sales Engine", href: "/sales-engine", prefix: "/sales-engine" },
];

export function AppSwitcher({ collapsed }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = apps.find((a) => pathname.startsWith(a.prefix)) || apps[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (collapsed) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-[#7A7A7A] hover:text-[#1A1A1A] rounded-md hover:bg-[#F0F0F0] transition-colors w-full"
      >
        <span className="truncate">{current.name}</span>
        <ChevronUpDownIcon className="size-3 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-[#E5E5EA] rounded-lg shadow-lg overflow-hidden z-50">
          {apps.map((app) => (
            <Link
              key={app.name}
              href={app.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                current.name === app.name
                  ? "bg-[#F7F8FA] text-[#1A1A1A] font-semibold"
                  : "text-[#7A7A7A] hover:bg-[#F7F8FA] hover:text-[#1A1A1A]"
              }`}
            >
              <div className={`size-1.5 rounded-full ${current.name === app.name ? "bg-emerald-500" : "bg-transparent"}`} />
              {app.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
