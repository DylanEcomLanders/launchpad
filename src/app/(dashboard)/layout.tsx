"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { AuthGate } from "@/components/auth-gate";
import { PageTransition } from "@/components/page-transition";
import { Logo } from "@/components/logo";
import { PitchNav } from "@/components/pitch-nav";
import { ShortcutsNav, SHORTCUT_TABS } from "@/components/shortcuts-nav";
import { TeamToolsNav, TEAM_TOOL_TABS } from "@/components/team-tools-nav";

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
      <h2 className="text-xs font-medium uppercase tracking-wider text-subtle mb-2">
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
      <h2 className="text-xs font-medium uppercase tracking-wider text-subtle mb-2">
        Shortcuts
      </h2>
      <ShortcutsNav />
    </div>
  );
}

/* Team Tools umbrella — the day-to-day team utilities. The strip rides above
 * every /team/* tool route. Sourced from TEAM_TOOL_TABS so the two stay in
 * lockstep. */
const TEAM_TOOLS_PATHS = TEAM_TOOL_TABS.map((t) => t.href);

function TeamToolsShell() {
  const pathname = usePathname();
  const isTeamTool = TEAM_TOOLS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!isTeamTool) return null;
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 pt-6 pb-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-subtle mb-2">
        Team Tools
      </h2>
      <TeamToolsNav />
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
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Top bar - logo on the left, full width, single hairline divider below.
            Mirrors the Well /Reporting brand bar pattern. */}
        <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-border bg-background">
          <Link href="/" aria-label="Overview" className="transition-opacity hover:opacity-80">
            <Logo className="text-foreground" height={18} />
          </Link>
          {/* Search - opens the command palette (state lives in the sidebar; we
              dispatch a window event so the trigger can live anywhere). */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface border border-border hover:border-border text-[13px] text-subtle hover:text-foreground transition-colors min-w-[240px]"
            aria-label="Search"
          >
            <svg className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 3 3" strokeLinecap="round" />
            </svg>
            <span className="flex-1 text-left">Search</span>
            <kbd className="text-[10px] font-mono text-subtle">⌘K</kbd>
          </button>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin bg-background">
            {/* Umbrella strips sit outside PageTransition so they persist
                while only the page below them re-keys on navigation. Only
                one strip ever renders for a given route — the path lists
                are kept disjoint upstream. */}
            <ShortcutsShell />
            <PitchShell />
            <TeamToolsShell />
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
