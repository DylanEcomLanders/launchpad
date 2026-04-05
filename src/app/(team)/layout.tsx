"use client";

import { TeamSidebar } from "@/components/team-sidebar";
import { PageTransition } from "@/components/page-transition";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <TeamSidebar />
      <main className="flex-1 overflow-y-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
