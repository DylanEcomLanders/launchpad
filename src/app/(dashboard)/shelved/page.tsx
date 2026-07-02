"use client";

import { ArchiveBoxIcon } from "@heroicons/react/24/outline";
import { shelvedItems } from "@/components/sidebar";

export default function ShelvedPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <ArchiveBoxIcon className="size-5 text-subtle" />
        <h1 className="text-xl font-semibold text-foreground">Shelved</h1>
      </div>
      <p className="text-[13px] text-subtle mb-6 leading-relaxed">
        Tools we&apos;ve parked. Code still lives in git, just not surfaced in
        the sidebar. Promote back if it earns its way in.
      </p>

      <ul className="rounded-lg bg-surface shadow-[var(--shadow-soft)] divide-y divide-border">
        {shelvedItems.map((item) => (
          <li
            key={item.href}
            className="px-4 py-2.5 text-[13px] text-subtle"
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
