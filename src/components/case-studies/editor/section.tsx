"use client";

import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

interface SectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;       // e.g. "3 tests" — shown next to title
}

export function EditorSection({ title, description, defaultOpen = true, children, badge }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-surface border border-border rounded-xl shadow-[var(--shadow-soft)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-background transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {badge && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-surface-raised text-subtle rounded-full">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-subtle mt-0.5">{description}</p>
          )}
        </div>
        <ChevronDownIcon
          className={`size-4 text-subtle shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-border">{children}</div>
      )}
    </section>
  );
}
