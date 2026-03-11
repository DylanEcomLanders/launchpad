"use client";

import { TeamSidebar } from "@/components/team-sidebar";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <TeamSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
