"use client";

// The Toolbox tool pages still live under /team/* but now render inside the
// SAME dashboard shell as everything else (the standalone Team Hub + its
// separate sidebar were retired). Mirrors the (dashboard) layout exactly so
// these pages look native rather than like a different app.

import { Sidebar } from "@/components/sidebar";
import { AuthGate } from "@/components/auth-gate";
import { PageTransition } from "@/components/page-transition";
import { FloatingNotes } from "@/components/floating-notes";
import { QuickLinks } from "@/components/quick-links";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin bg-surface rounded-l-xl shadow-[var(--shadow-card)] my-2 mr-2 pt-14 md:pt-0">
          <PageTransition>{children}</PageTransition>
        </main>
        <QuickLinks />
        <FloatingNotes />
      </div>
    </AuthGate>
  );
}
