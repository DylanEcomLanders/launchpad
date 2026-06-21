"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { AuthGate } from "@/components/auth-gate";
import { PageTransition } from "@/components/page-transition";
import { FloatingNotes } from "@/components/floating-notes";
import { QuickLinks } from "@/components/quick-links";
import { Logo } from "@/components/logo";
import { PitchNav } from "@/components/pitch-nav";
import { ShortcutsNav, SHORTCUT_TABS } from "@/components/shortcuts-nav";

/* Pitch umbrella - routes the PitchNav strip rides above. Lives here (not
 * inside PitchNav) so the layout can decide whether to mount the strip
 * without the strip itself unmounting on navigation. */
const PITCH_PATHS = [
  "/offer",
  "/tools/quotes",
  "/tools/sales-deck",
  "/internal/cheatsheet/conversion-engine",
];

function PitchShell() {
  const pathname = usePathname();
  const isPitch = PITCH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isPitch) return null;
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 pt-6 pb-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-[#71757D] mb-2">
        Pitch
      </h2>
      <PitchNav />
    </div>
  );
}

/* Shortcuts umbrella - /shortcuts + every underlying tool route. Listed
 * here so the strip persists when tabbing between tools. Sourced from
 * SHORTCUT_TABS in shortcuts-nav.tsx so the two stay in lockstep. */
const SHORTCUTS_PATHS = ["/shortcuts", ...SHORTCUT_TABS.map((t) => t.href)];

function ShortcutsShell() {
  const pathname = usePathname();
  const isShortcut = SHORTCUTS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isShortcut) return null;
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 pt-6 pb-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-[#71757D] mb-2">
        Shortcuts
      </h2>
      <ShortcutsNav />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex flex-col h-screen overflow-hidden bg-[#0C0C0C]">
        {/* Top bar - logo on the left, full width, single hairline divider below.
            Mirrors the Well /Reporting brand bar pattern. */}
        <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-[#2A2A2A] bg-[#0C0C0C]">
          <Logo className="text-[#E5E5EA]" height={18} />
          {/* Search - opens the command palette (state lives in the sidebar; we
              dispatch a window event so the trigger can live anywhere). */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#181818] border border-[#2A2A2A] hover:border-[#383838] text-[13px] text-[#71757D] hover:text-[#E5E5EA] transition-colors min-w-[240px]"
            aria-label="Search"
          >
            <svg className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 3 3" strokeLinecap="round" />
            </svg>
            <span className="flex-1 text-left">Search</span>
            <kbd className="text-[10px] font-mono text-[#71757D]">⌘K</kbd>
          </button>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin bg-[#0C0C0C]">
            {/* Umbrella strips sit outside PageTransition so they persist
                while only the page below them re-keys on navigation. Only
                one strip ever renders for a given route — the path lists
                are kept disjoint upstream. */}
            <ShortcutsShell />
            <PitchShell />
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <QuickLinks />
        <FloatingNotes />
      </div>
    </AuthGate>
  );
}
