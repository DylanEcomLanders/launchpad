"use client";

/* ── Offer shell ──
 *
 * The Offer front page (/hero-offer) is now a left-nav TipTap workspace that owns
 * its own full-height layout, so the shell renders it bare. The deck sub-routes
 * (pitch deck, kickoff deck, roadmap, monthly report, etc.) keep a light shell
 * with a back link to the workspace.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function HeroOfferLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The workspace page owns its own full-height layout.
  if (pathname === "/hero-offer") return <>{children}</>;

  return (
    <div className="min-h-full bg-background">
      <div className="sticky top-0 z-10 bg-background/90 px-6 pt-6 backdrop-blur-md md:px-10">
        <Link
          href="/hero-offer"
          className="inline-flex items-center gap-1.5 text-2xs font-medium text-subtle transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" /> Offer
        </Link>
      </div>
      <div className="px-6 pb-20 pt-4 md:px-10">{children}</div>
    </div>
  );
}
