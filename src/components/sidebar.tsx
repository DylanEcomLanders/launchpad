"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  HomeIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  BanknotesIcon,
  UserGroupIcon,
  SparklesIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
  PuzzlePieceIcon,
  Squares2X2Icon,
  LightBulbIcon,
  LockClosedIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";
import { LogoMark } from "@/components/logo";
import { useRole } from "@/components/auth-gate";
import { CommandPalette, type CommandItem } from "@/components/command-palette";

interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

interface NavSection {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
  roles?: ("admin" | "cro")[];
  badge?: string;
  /* Visual grouping — sections within the same group render together,
   * separated by a hairline divider from the next group. Order matters
   * (top-down): lifecycle → ops. */
  group: "lifecycle" | "ops";
}

const teamZones = [
  { label: "UK", flag: "\u{1F1EC}\u{1F1E7}", tz: "Europe/London" },
  { label: "UA", flag: "\u{1F1FA}\u{1F1E6}", tz: "Europe/Kyiv" },
  { label: "IN", flag: "\u{1F1EE}\u{1F1F3}", tz: "Asia/Kolkata" },
  { label: "PH", flag: "\u{1F1F5}\u{1F1ED}", tz: "Asia/Manila" },
  { label: "NZ", flag: "\u{1F1F3}\u{1F1FF}", tz: "Pacific/Auckland" },
];

/* Sidebar follows the agency lifecycle (top-down): pin the daily drivers
 * (Mission Control, Offer, Pods), then dropdowns for each lifecycle phase,
 * ops/finance, reference material, and a default-collapsed Shelved drawer
 * for parked tools we're not actively using.
 *
 * Shelved housekeeping: review every 3 months — promote what's back in
 * use, or kill what's truly dead. Don't let it become a graveyard. */
const navSections: NavSection[] = [
  {
    title: "Acquisition",
    icon: <RocketLaunchIcon className="size-4" />,
    defaultOpen: true,
    group: "lifecycle",
    items: [
      { label: "Portfolio", href: "/sales-engine/portfolio" },
      { label: "Case Studies", href: "/sales-engine/case-studies" },
    ],
  },
  {
    title: "Delivery",
    icon: <PuzzlePieceIcon className="size-4" />,
    defaultOpen: false,
    group: "lifecycle",
    items: [
      { label: "Onboarding", href: "/tools/onboarding-inbox" },
    ],
  },
  {
    title: "Operations",
    icon: <BookOpenIcon className="size-4" />,
    defaultOpen: false,
    group: "lifecycle",
    items: [
      { label: "Feedback", href: "/tools/feedback" },
    ],
  },
  {
    title: "Finance",
    icon: <BanknotesIcon className="size-4" />,
    defaultOpen: false,
    roles: ["admin"],
    badge: "PRIVATE",
    group: "ops",
    items: [
      { label: "Money (founder)", href: "/finance" },
      { label: "Price List", href: "/internal/pricing" },
      { label: "Price Calculator", href: "/tools/price-calculator" },
      { label: "Revenue", href: "/sales-engine/revenue" },
      { label: "Turnaround Times", href: "/internal/turnarounds" },
      { label: "Payment Link", href: "/tools/payment-link" },
      { label: "Dev Hours Log", href: "/tools/dev-hours" },
    ],
  },
  {
    title: "Company",
    icon: <BuildingOffice2Icon className="size-4" />,
    defaultOpen: false,
    roles: ["admin"],
    group: "ops",
    items: [
      { label: "Overview", href: "/company" },
      { label: "People", href: "/company/people" },
      { label: "Org Structure", href: "/company/structure" },
      { label: "Hiring", href: "/company/hiring" },
      { label: "Contracts", href: "/company/contracts" },
    ],
  },
];

/* Shelved tools — listed on /shelved as a read-only catalogue. Code stays
 * in git so we can promote items back into the sidebar if needed; we just
 * don't link to them here. */
export const shelvedItems: NavItem[] = [
  { label: "Audits", href: "/sales-engine/audits" },
  { label: "Social", href: "/sales-engine/social" },
  { label: "Proposals", href: "/sales-engine/proposals" },
  { label: "Portals", href: "/tools/client-portal" },
  { label: "Task Board", href: "/tools/task-board" },
  { label: "Tickets", href: "/tools/issues" },
  { label: "Ecomlanders Cheat Sheet", href: "/internal/cheatsheet" },
  { label: "Conversion Engine Sheet", href: "/internal/cheatsheet/conversion-engine" },
  { label: "Articles", href: "/sales-engine/articles" },
  { label: "Calendar", href: "/sales-engine/calendar" },
  { label: "Content Calendar", href: "/content-calendar" },
  { label: "Lead Magnets", href: "/sales-engine/lead-magnets" },
  { label: "Leads (Outreach)", href: "/sales-engine/leads" },
  { label: "Quiz Leads", href: "/sales-engine/quiz-leads" },
  { label: "Scout", href: "/sales-engine/scout" },
  { label: "Resources (Referrals)", href: "/sales-engine/resources" },
  { label: "Pipeline", href: "/sales-engine/pipeline" },
  { label: "Funnel Playbook", href: "/tools/funnel-knowledge" },
  { label: "Funnels", href: "/tools/funnel-builder" },
  { label: "Deck Builder", href: "/sales-engine/deck-builder" },
  { label: "Referral Programme", href: "/referral-programme" },
];

const homeItem = {
  label: "Mission Control",
  href: "/",
  icon: <HomeIcon className="size-4" />,
};
const offerItem = {
  label: "Offer",
  href: "/offer",
  icon: <SparklesIcon className="size-4" />,
};
const podsItem = {
  label: "Pods",
  href: "/pods-v2",
  icon: <UserGroupIcon className="size-4" />,
};
const engagementsItem = {
  label: "Clients",
  href: "/engagements",
  icon: <Squares2X2Icon className="size-4" />,
};
const agentsItem = {
  label: "Agents",
  href: "/agents",
  icon: <WrenchScrewdriverIcon className="size-4" />,
};
const wikiItem = {
  label: "Wiki",
  href: "/tools/ops-wiki",
  icon: <BookOpenIcon className="size-4" />,
};
/* R&D Tracker — internal accountability + team idea inbox. Sits with
 * the pinned top-level cluster (rather than inside a collapsible
 * section) because the team needs one-click access to drop ideas. */
const rdItem = {
  label: "R&D",
  href: "/rd",
  icon: <LightBulbIcon className="size-4" />,
};

export function Sidebar() {
  const pathname = usePathname();
  const role = useRole();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  /* Accordion behaviour — at most one nav section open at a time. Initial
   * open is the first section flagged defaultOpen so the user lands on a
   * useful default; everything else stays collapsed until explicitly opened. */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      const firstDefaultOpen = navSections.find((s) => s.defaultOpen !== false);
      return Object.fromEntries(
        navSections.map((s) => [s.title, s.title === firstDefaultOpen?.title]),
      );
    }
  );

  const visibleSections = navSections.filter((s) => !s.roles || (role !== "team" && s.roles.includes(role)));
  const [now, setNow] = useState(() => new Date());
  const [onboardingCount, setOnboardingCount] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pods, setPods] = useState<{ id: string; tagline: string; label: string; tile: string; bg: string; fg: string }[]>([]);

  /* Pull pods client-side so we can render identity tiles in the sidebar.
   * Each pod gets a fixed brand colour by index (P1/P2/P3) so the tiles
   * stay stable across reloads instead of jittering with hash-derived
   * hues. Number lives in the tile, the lead's name is the label. */
  useEffect(() => {
    const palette = [
      { bg: "#FEE4D8", fg: "#C2410C" }, // warm peach
      { bg: "#DBEAFE", fg: "#1D4ED8" }, // soft blue
      { bg: "#DCFCE7", fg: "#15803D" }, // mint
    ];
    (async () => {
      try {
        const mod = await import("@/lib/pods-v2/data");
        const all = mod.getPods();
        setPods(
          all.slice(0, 3).map((p, i) => {
            const num = p.name.replace(/[^0-9]/g, "") || String(i + 1);
            return {
              id: p.id,
              tagline: p.tagline,
              label: `Pod ${num}`,
              tile: num,
              bg: palette[i % palette.length].bg,
              fg: palette[i % palette.length].fg,
            };
          }),
        );
      } catch {}
    })();
  }, []);

  /* Global ⌘K / Ctrl+K to open the palette anywhere in the app. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Build the searchable index: pinned items + every visible lane child
   * + shelved items (marked so they render with the Shelved badge). */
  const paletteItems: CommandItem[] = [
    { label: homeItem.label, href: homeItem.href, group: "Pinned", icon: homeItem.icon },
    { label: offerItem.label, href: offerItem.href, group: "Pinned", icon: offerItem.icon },
    { label: engagementsItem.label, href: engagementsItem.href, group: "Pinned", icon: engagementsItem.icon, keywords: ["engagements"] },
    { label: podsItem.label, href: podsItem.href, group: "Pinned", icon: podsItem.icon },
    { label: wikiItem.label, href: wikiItem.href, group: "Pinned", icon: wikiItem.icon, keywords: ["ops wiki", "operations"] },
    { label: rdItem.label, href: rdItem.href, group: "Pinned", icon: rdItem.icon, keywords: ["research", "ideas"] },
    { label: agentsItem.label, href: agentsItem.href, group: "Pinned", icon: agentsItem.icon },
    ...visibleSections.flatMap((s) =>
      s.items.map((i) => ({ label: i.label, href: i.href, group: s.title }))
    ),
    { label: "Team Hub", href: "/team", group: "Pinned" },
    { label: "Changelog", href: "/changelog", group: "Pinned" },
    ...(role === "admin" ? [{ label: "Settings", href: "/settings", group: "Pinned" }] : []),
  ];

  /* Accordion: opening a section closes every other one. Clicking the
   * currently-open section closes it (so user can still get to a fully
   * collapsed state if they want pure focus). */
  function toggleSection(title: string) {
    setOpenSections((prev) => {
      if (prev[title]) {
        return { ...prev, [title]: false };
      }
      const next: Record<string, boolean> = {};
      for (const s of navSections) {
        next[s.title] = s.title === title;
      }
      return next;
    });
  }

  // Poll onboarding submissions every 5 minutes
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const { onboardingStore } = await import("@/lib/onboarding");
        const all = await onboardingStore.getAll();
        const pending = all.filter(s => !s.deleted_at && (s.status === "pending" || s.status === "in-progress"));
        setOnboardingCount(pending.length);
      } catch {}
    };
    checkOnboarding();
    const id = setInterval(checkOnboarding, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  /* Top-level link (Mission Control, Offer, Pods, Agents). Pinned, not collapsible. */
  function renderTopLink(item: { label: string; href: string; icon: React.ReactNode }) {
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`
          relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-150 mb-0.5
          ${
            isActive(item.href)
              ? "bg-white text-[#0E0F11] font-medium"
              : "text-[#A1A1AA] hover:bg-white/[0.06] hover:text-white"
          }
        `}
      >
        {item.icon}
        {!collapsed && <span className="flex-1">{item.label}</span>}
      </Link>
    );
  }

  /* Collapsible section with header + accordion items. */
  function renderSection(section: NavSection) {
    const sectionHasActive = section.items.some((i) => !i.external && isActive(i.href));
    return (
      <div key={section.title} className="mb-0.5">
        {!collapsed ? (
          <button
            onClick={() => toggleSection(section.title)}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#A1A1AA] group-hover:text-white transition-colors">
                {section.title}
              </span>
              {sectionHasActive && !openSections[section.title] && (
                <span className="size-1.5 rounded-full bg-white" />
              )}
              {section.badge && (
                <span
                  title={section.badge}
                  className="flex items-center justify-center size-3.5 rounded-[3px] bg-white/[0.06] text-[#71717A]"
                >
                  <LockClosedIcon className="size-2.5" />
                </span>
              )}
            </div>
            <ChevronDownIcon
              className={`size-3 text-white/30 group-hover:text-white/60 transition-all duration-200 ${
                openSections[section.title] ? "" : "-rotate-90"
              }`}
            />
          </button>
        ) : (
          <div className="flex justify-center py-1.5" title={section.title}>
            <span className={`size-1.5 rounded-full ${sectionHasActive ? "bg-white" : "bg-white/20"}`} />
          </div>
        )}

        {!collapsed && openSections[section.title] && (
          <div className="mt-0.5 mb-2 space-y-0.5">
            {section.items.map((item) => {
              const active = !item.external && isActive(item.href);
              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-1.5 pl-9 pr-2.5 py-1.5 text-[13px] rounded-md transition-all duration-150 text-[#A1A1AA] hover:text-white hover:bg-white/[0.06]"
                  >
                    {item.label}
                    <svg
                      className="size-3 opacity-40 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.25-.75a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V6.31l-5.47 5.47a.75.75 0 01-1.06-1.06l5.47-5.47H12.25a.75.75 0 01-.75-.75z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </a>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    block pl-9 pr-2.5 py-1.5 text-[13px] rounded-md transition-all duration-150
                    ${
                      active
                        ? "text-[#0E0F11] font-medium bg-white"
                        : "text-[#A1A1AA] hover:text-white hover:bg-white/[0.06]"
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderDivider() {
    return <div className={collapsed ? "my-2" : "my-3"} />;
  }

  return (
    <>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={paletteItems}
      />

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-[var(--shadow-card)] md:hidden"
        aria-label="Open menu"
      >
        <Bars3Icon className="size-5 text-[#1B1B1B]" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#1B1B1B]/10 backdrop-blur-[2px] z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          fixed md:relative z-50 md:z-0
          h-screen bg-[#0E0F11] text-white
          flex flex-col
          transition-all duration-200 ease-in-out
          ${collapsed ? "md:w-16" : "md:w-56"}
          w-56
        `}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 h-14">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <LogoMark size={18} />
              <span className="text-[12px] font-medium text-white tracking-tight">Launchpad</span>
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" title="Live" />
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="mx-auto text-white" onClick={() => setMobileOpen(false)}>
              <LogoMark size={18} />
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg md:hidden text-white"
            aria-label="Close menu"
          >
            <XMarkIcon className="size-[18px]" />
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-white/[0.08] hidden md:block transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRightIcon className="size-3.5 text-[#A1A1AA]" /> : <ChevronLeftIcon className="size-3.5 text-[#A1A1AA]" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Search trigger — opens command palette on click or ⌘K */}
          {!collapsed && (
            <div className="px-3 mb-1 mt-1">
              <button
                onClick={() => setPaletteOpen(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[13px] text-[#A1A1AA] hover:text-white transition-colors"
              >
                <svg className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="9" cy="9" r="6" />
                  <path d="m14 14 3 3" strokeLinecap="round" />
                </svg>
                <span className="flex-1 text-left">Search</span>
                <kbd className="text-[10px] font-mono text-[#71717A] tracking-tight">⌘K</kbd>
              </button>
            </div>
          )}
          {collapsed && (
            <div className="px-3 mb-1 mt-1 flex justify-center">
              <button
                onClick={() => setPaletteOpen(true)}
                className="p-2 rounded-lg hover:bg-white/[0.08] transition-colors"
                title="Search (⌘K)"
              >
                <svg className="size-3.5 text-[#A1A1AA]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="9" r="6" />
                  <path d="m14 14 3 3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}

          {/* Pinned daily drivers — Mission Control, Offer, Pods */}
          <div className="px-3 mb-1 mt-2 space-y-0.5">
            {renderTopLink(homeItem)}
            {renderTopLink(offerItem)}
            {renderTopLink(engagementsItem)}
            {renderTopLink(podsItem)}
            {renderTopLink(wikiItem)}
            {renderTopLink(rdItem)}
          </div>

          {/* Pod identity tiles — quick jump into each pod with its
            * brand colour. Sits between the pinned cluster and the
            * lifecycle lanes so it reads as "the pods I work in" rather
            * than another lane. */}
          {pods.length > 0 && !collapsed && (
            <div className="px-3 mt-4">
              <div className="px-2.5 mb-0.5 text-[13px] text-[#A1A1AA]">
                Pods
              </div>
              <div className="space-y-0.5">
                {pods.map((p) => {
                  const href = `/pods-v2/${p.id}`;
                  const active = isActive(href);
                  return (
                    <Link
                      key={p.id}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all ${
                        active
                          ? "bg-white text-[#0E0F11] font-medium"
                          : "text-[#A1A1AA] hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <span
                        className="size-4 rounded-[5px] flex items-center justify-center text-[10px] font-semibold shrink-0"
                        style={{ backgroundColor: p.bg, color: p.fg }}
                      >
                        {p.tile}
                      </span>
                      <span className="truncate">{p.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {pods.length > 0 && collapsed && (
            <div className="mt-3 mb-1 flex flex-col items-center gap-1.5">
              {pods.map((p) => {
                const href = `/pods-v2/${p.id}`;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    title={p.tagline}
                    className="size-5 rounded-md flex items-center justify-center text-[11px] font-semibold transition-transform hover:scale-110"
                    style={{ backgroundColor: p.bg, color: p.fg }}
                  >
                    {p.tile}
                  </Link>
                );
              })}
            </div>
          )}

          {renderDivider()}

          {/* Lifecycle: Acquire, Deliver, Operate */}
          <div className="px-3">
            {visibleSections.filter((s) => s.group === "lifecycle").map((section) => renderSection(section))}
          </div>

          {renderDivider()}

          {/* Ops: Money, Company */}
          <div className="px-3">
            {visibleSections.filter((s) => s.group === "ops").map((section) => renderSection(section))}
          </div>

          {renderDivider()}

          {/* Standalone bottom links — Agents, Settings */}
          <div className="px-3 mb-1">{renderTopLink(agentsItem)}</div>
          {!collapsed && role === "admin" && (
            <div className="px-3 mt-1">
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-md transition-all duration-150
                  ${pathname === "/settings"
                    ? "text-[#0E0F11] font-medium bg-white"
                    : "text-[#A1A1AA] hover:text-white hover:bg-white/[0.06]"
                  }
                `}
              >
                Settings
              </Link>
            </div>
          )}
        </nav>

        {/* Team Hub CTA — sits just above the timezone card */}
        {!collapsed && (
          <div className="mx-3 mb-2">
            <Link
              href="/team"
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                pathname === "/team"
                  ? "bg-white text-[#0E0F11] font-medium"
                  : "bg-gradient-to-r from-white/[0.04] to-white/[0.01] hover:from-white/[0.08] hover:to-white/[0.03] text-white border border-white/[0.06] hover:border-white/[0.12]"
              }`}
            >
              <UserGroupIcon className="size-4" />
              <span className="flex-1">Team Hub</span>
              <ArrowRightIcon className={`size-3 transition-all duration-200 ${
                pathname === "/team" ? "opacity-100" : "opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5"
              }`} />
            </Link>
          </div>
        )}

        {/* Team Timezones */}
        {!collapsed && (
          <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ClockIcon className="size-3 text-[#71717A]" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#71717A]">
                Team
              </span>
            </div>
            <div className="space-y-1">
              {teamZones.map((z) => (
                <div
                  key={z.tz}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="text-[#A1A1AA]">
                    {z.flag} {z.label}
                  </span>
                  <span className="tabular-nums text-[#71717A]">
                    {now.toLocaleTimeString("en-GB", {
                      timeZone: z.tz,
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {collapsed && (
          <div className="py-3 flex justify-center">
            <ClockIcon className="size-3.5 text-[#71717A]" />
          </div>
        )}

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-3 flex items-center gap-2">
            <Link
              href="/changelog"
              onClick={() => setMobileOpen(false)}
              className="text-[11px] text-[#71717A] hover:text-white transition-colors"
            >
              Launchpad v0.49.0
            </Link>
            <span className="text-[10px] text-[#3F3F46]">·</span>
            <Link
              href="/shelved"
              onClick={() => setMobileOpen(false)}
              className="text-[11px] text-[#71717A] hover:text-white transition-colors"
            >
              Shelved
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
