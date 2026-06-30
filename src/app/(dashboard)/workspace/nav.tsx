"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole, useCurrentUser } from "@/components/auth-gate";

const TABS = [
  { href: "/workspace", label: "Overview", match: (p: string) => p === "/workspace" },
  { href: "/workspace/pods", label: "Pods", match: (p: string) => p.startsWith("/workspace/pods") },
  {
    href: "/workspace/clients",
    label: "Clients",
    match: (p: string) => p.startsWith("/workspace/clients"),
  },
];

export function WorkspaceNav() {
  const pathname = usePathname() || "/workspace";
  const role = useRole();
  const me = useCurrentUser();
  // Members are scoped to their own pod, so the all-pods tabs (Overview /
  // Pods / Clients) don't apply to them — they just see their pod board.
  const isMember = role === "team";
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] items-center gap-6 px-6">
        <Link href="/workspace" className="flex items-center gap-2 py-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-[11px] font-bold text-foreground">
            W
          </span>
          <span className="font-heading text-sm font-semibold text-foreground">
            {isMember ? "My pod" : "Workspace"}
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {!isMember && TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-slate-900" />
                )}
              </Link>
            );
          })}
          {role === "admin" && (
            <Link
              href="/workspace/team"
              className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname.startsWith("/workspace/team")
                  ? "text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Team access
              {pathname.startsWith("/workspace/team") && (
                <span className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-slate-900" />
              )}
            </Link>
          )}
        </nav>

        {/* Signed-in identity (magic-link sessions) */}
        {me && (
          <div className="ml-auto flex items-center gap-2 py-4 text-xs text-muted">
            <span className="hidden sm:inline">{me.name}</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-border text-[10px] font-semibold text-muted">
              {me.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
