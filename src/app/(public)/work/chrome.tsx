import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const CALL_HREF = "https://cal.com/dylanevans";

export function WorkChrome({
  backHref,
  backLabel,
  extra,
}: {
  backHref?: string;
  backLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--work-faint)] bg-[var(--work-bg)]/90 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/work" className="text-[var(--work-ink)] shrink-0" aria-label="Ecomlanders Work">
            <Logo height={16} />
          </Link>
          <span className="hidden sm:block w-px h-3 bg-[var(--work-line)]" aria-hidden />
          <span
            className="hidden sm:inline text-[13px] font-medium tracking-tight text-[var(--work-ink)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Work
          </span>
          <span className="work-spark hidden md:inline-block ml-1" aria-hidden />
        </div>

        <nav className="flex items-center gap-5 text-[12px] shrink-0">
          {extra}
          {backHref && backLabel ? (
            <Link
              href={backHref}
              className="text-[var(--work-mute)] hover:text-[var(--work-ink)] transition-colors"
            >
              {backLabel}
            </Link>
          ) : (
            <Link
              href="/portfolio"
              className="text-[var(--work-mute)] hover:text-[var(--work-ink)] transition-colors"
            >
              Figma archive
            </Link>
          )}
          <a
            href={CALL_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--work-ink)] hover:text-white transition-colors"
          >
            Book a call
          </a>
        </nav>
      </div>
    </header>
  );
}
