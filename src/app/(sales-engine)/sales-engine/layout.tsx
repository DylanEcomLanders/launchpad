"use client";

import { SalesEngineSidebar } from "@/components/sales-engine-sidebar";
import { AuthGate } from "@/components/auth-gate";
import { ReportIssueButton } from "@/components/report-issue-button";

export default function SalesEngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
        <SalesEngineSidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin bg-white rounded-l-xl shadow-[var(--shadow-card)] my-2 mr-2 pt-14 md:pt-0">{children}</main>
        <ReportIssueButton />
      </div>
    </AuthGate>
  );
}
