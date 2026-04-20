"use client";

import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";

export default function ProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Custom bespoke proposals manage their own header/footer
  const isBespoke = /^\/proposal\/[^/]+$/.test(pathname || "") && !pathname?.includes("/[token]") && pathname !== "/proposal";
  // Check against known bespoke slugs
  const bespokeSlugs = ["yorkshire-dental-suite"];
  const slug = pathname?.split("/").pop();
  const useBespokeLayout = bespokeSlugs.includes(slug || "");

  if (useBespokeLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal branded header */}
      <header className="border-b border-[#EDEDEF] px-6 md:px-12 py-5">
        <Logo height={16} className="text-[#1B1B1B]" />
      </header>

      {/* Main content */}
      <main className="flex-1 animate-fadeInUp">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#EDEDEF] px-6 md:px-12 py-8 text-center">
        <p className="text-xs text-[#A0A0A0]">
          Ecomlanders &mdash; Shopify CRO &amp; Landing Page Agency
        </p>
      </footer>
    </div>
  );
}
