"use client";

import { Sidebar } from "@/components/sidebar";
import { AuthGate } from "@/components/auth-gate";
import { ReportIssueButton } from "@/components/report-issue-button";
import { PageTransition } from "@/components/page-transition";
import { FloatingNotes } from "@/components/floating-notes";
import { QuickLinks } from "@/components/quick-links";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin bg-white rounded-l-xl shadow-[var(--shadow-card)] my-2 mr-2 pt-14 md:pt-0">
          <PageTransition>{children}</PageTransition>
        </main>
        <ReportIssueButton />
        <QuickLinks />
        <FloatingNotes />
      </div>
    </AuthGate>
  );
}
