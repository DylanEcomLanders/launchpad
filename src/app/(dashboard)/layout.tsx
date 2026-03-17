"use client";

import { Sidebar } from "@/components/sidebar";
import { AuthGate } from "@/components/auth-gate";
import { ReportIssueButton } from "@/components/report-issue-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin bg-white rounded-l-xl shadow-[var(--shadow-card)] my-2 mr-2">{children}</main>
        <ReportIssueButton />
      </div>
    </AuthGate>
  );
}
