"use client";

import { Sidebar } from "@/components/sidebar";
import { AuthGate } from "@/components/auth-gate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </AuthGate>
  );
}
