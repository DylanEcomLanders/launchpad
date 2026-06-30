"use client";

import Link from "next/link";
import {
  LinkIcon,
  TagIcon,
  DocumentPlusIcon,
  TrophyIcon,
  DocumentDuplicateIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

/* Shortcuts landing page. The tab strip lives in the dashboard layout (via
 * ShortcutsShell) and persists across the underlying tool routes, so this
 * page only needs to render the index - six big tiles, grouped into Payment
 * + Client facing, for first-touch discovery. */
const PAYMENT = [
  { href: "/tools/payment-link", label: "Payment Links", desc: "Generate a Stripe payment link in seconds.", icon: LinkIcon },
  { href: "/internal/pricing", label: "Price List", desc: "Single source of truth for what we charge.", icon: TagIcon },
  { href: "/tools/invoice-generator", label: "Invoice Generator", desc: "Spin a one-off invoice ready to send.", icon: DocumentPlusIcon },
];

const CLIENT_FACING = [
  { href: "/tools/case-studies", label: "Case Studies", desc: "The shareable conversion case studies index.", icon: TrophyIcon },
  { href: "/tools/about-deck", label: "About Deck", desc: "Single deck that answers every prospect question. WIP.", icon: DocumentDuplicateIcon },
  { href: "/tools/portfolio", label: "Portfolio", desc: "Manage the tabs on your shareable portfolio page.", icon: PhotoIcon },
];

function Tile({ href, label, desc, icon: Icon }: { href: string; label: string; desc: string; icon: typeof LinkIcon }) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-4 transition-colors hover:border-border hover:bg-border"
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-7 items-center justify-center rounded-md bg-surface-raised text-muted transition-colors group-hover:text-white">
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <p className="text-xs text-subtle leading-snug">{desc}</p>
    </Link>
  );
}

export default function ShortcutsPage() {
  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto max-w-6xl px-6 md:px-12 py-10">
        <div className="mb-8">
          <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
            Shortcuts
          </p>
          <h1 className="mt-2 text-[28px] leading-tight">
            <span className="font-bold">Quick access</span>{" "}
            <span className="font-normal text-subtle">
              to the tools you reach for most
            </span>
          </h1>
        </div>

        <section className="mb-10">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-subtle">
            Payment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PAYMENT.map((t) => (
              <Tile key={t.href} {...t} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-subtle">
            Client facing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CLIENT_FACING.map((t) => (
              <Tile key={t.href} {...t} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
