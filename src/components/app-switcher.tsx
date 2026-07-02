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
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-subtle hover:text-foreground rounded-md hover:bg-surface-raised transition-colors w-full"
      >
        <span className="truncate">{current.name}</span>
        <ChevronUpDownIcon className="size-3 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {apps.map((app) => (
            <Link
              key={app.name}
              href={app.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                current.name === app.name
                  ? "bg-background text-foreground font-semibold"
                  : "text-subtle hover:bg-background hover:text-foreground"
              }`}
            >
              <div className={`size-1.5 rounded-full ${current.name === app.name ? "bg-success" : "bg-transparent"}`} />
              {app.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
