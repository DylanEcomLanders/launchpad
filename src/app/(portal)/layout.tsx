"use client";

import { PageTransition } from "@/components/page-transition";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
