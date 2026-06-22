"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import {
  HomeIcon,
  Cog6ToothIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  BanknotesIcon,
  SparklesIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  RocketLaunchIcon,
  PuzzlePieceIcon,
  Squares2X2Icon,
  LightBulbIcon,
  LockClosedIcon,
  CalendarDaysIcon,
  ViewColumnsIcon,
  PhotoIcon,
  TrophyIcon,
  DocumentTextIcon,
  InboxIcon,
  ChatBubbleOvalLeftIcon,
  TagIcon,
  CalculatorIcon,
  ArrowTrendingUpIcon,
  LinkIcon,
  CodeBracketIcon,
  UsersIcon,
  ShareIcon,
  UserPlusIcon,
  DocumentDuplicateIcon,
  BookmarkIcon,
  DocumentPlusIcon,
  CreditCardIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
// LogoMark moved to dashboard top bar — sidebar no longer renders the logo.
import { useRole } from "@/components/auth-gate";
import { CommandPalette, type CommandItem } from "@/components/command-palette";

interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  icon?: React.ReactNode;
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
 * (Mission Control, Tools, Workspace, Offer), then dropdowns for each lifecycle phase,
 * ops/finance, reference material, and a default-collapsed Shelved drawer
 * for parked tools we're not actively using.
 *
 * Shelved housekeeping: review every 3 months — promote what's back in
 * use, or kill what's truly dead. Don't let it become a graveyard. */
const navSections: NavSection[] = [
  // Delivery + Operations sections promoted to pinned items in the cluster
  // above (Onboarding, Feedback).
];

/* Shelved tools — listed on /shelved as a read-only catalogue. Code stays
 * in git so we can promote items back into the sidebar if needed; we just
 * don't link to them here. */
export const shelvedItems: NavItem[] = [
  { label: "R&D Tracker", href: "/rd" },
  { label: "Tools (Toolkit)", href: "/" },
  { label: "Wiki (legacy)", href: "/tools/ops-wiki" },
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

/* Delivery — the kanban-style command surface over every client's
 * in-flight delivery work. Master view is the landing; drill into a single
 * client via the dropdown in the page header. Renamed from "Project
 * Delivery" to just "Delivery" since /workspace is now "Old Delivery"
 * (legacy, still in use until manual data migration completes). */
const missionControlItem = {
  label: "Delivery",
  href: "/kanban",
  icon: <ViewColumnsIcon className="size-4" />,
};
/* Delivery KPIs — on-time / overdue / turnaround reporting off the ClickUp
 * board. Sits next to Project Delivery in the delivery cluster. */
const kpiItem = {
  label: "Delivery KPIs",
  href: "/kpi",
  icon: <ArrowTrendingUpIcon className="size-4" />,
};
const onboardingItem = {
  label: "Onboarding",
  href: "/tools/onboarding-inbox",
  icon: <InboxIcon className="size-4" />,
};
/* Retention dashboard — CSM home (client health, churn risk, renewals).
 * Repointed from the old /tools/feedback tool, which is still reachable by URL. */
const feedbackItem = {
  label: "Retention",
  href: "/retention",
  icon: <ChatBubbleOvalLeftIcon className="size-4" />,
};
/* Tools — quick-access launcher for client assets + internal tooling. Used
 * to be called Mission Control; renamed when the kanban claimed that name. */
const homeItem = {
  label: "Tools",
  href: "/",
  icon: <HomeIcon className="size-4" />,
};
/* My Work — personal landing for everyone: the deliverables assigned to the
 * signed-in person. (Replaces the old founder-only "My Week" planner.) */
const myWorkItem = {
  label: "My Tasks",
  href: "/my-work",
  icon: <CalendarDaysIcon className="size-4" />,
};
const offerItem = {
  label: "Offer",
  href: "/offer",
  icon: <SparklesIcon className="size-4" />,
};
/* Old Delivery — the previous /workspace surface, kept around until
 * its in-flight projects are manually migrated to the Delivery kanban.
 * Renamed from "Workspace" so its legacy status is obvious. */
const workspaceItem = {
  label: "Old Delivery",
  href: "/workspace",
  icon: <Squares2X2Icon className="size-4" />,
};
/* Agents — shelved from the nav for now (route still exists at /agents).
 * Restore by re-adding to the admin pinned cluster + command palette.
const agentsItem = {
  label: "Agents",
  href: "/agents",
  icon: <WrenchScrewdriverIcon className="size-4" />,
};
*/
const wikiItem = {
  label: "Wiki",
  href: "/wiki-v2",
  icon: <BookOpenIcon className="size-4" />,
};
/* R&D Tracker — internal accountability + team idea inbox. Admin cluster. */
const rdItem = {
  label: "R&D",
  href: "/rd",
  icon: <LightBulbIcon className="size-4" />,
};
/* Finance — single pinned item replacing the old "PRIVATE" section. Lock icon
 * signals the password gate; /finance is already wrapped in FinanceGate. All
 * the previous section sub-items (Pricing / Calculator / Revenue / Turnarounds
 * / Payment link / Dev hours) live as tabs inside FinanceNav. */
const financeItem = {
  label: "Finance",
  href: "/finance",
  icon: <LockClosedIcon className="size-4" />,
};
/* Admin — replaces the old "Company" section. Single pinned item; the
 * previous tabs (Overview / People / Structure / Hiring / Contracts / Settings)
 * live as tabs inside /company's layout. CompanyGate handles the password. */
const adminItem = {
  label: "Admin",
  href: "/company",
  icon: <BuildingOffice2Icon className="size-4" />,
};
/* Sales — Ajay's one-stop surface for the sales motion. /sales is
 * the canonical dashboard (KPIs + funnel + pipeline kanban +
 * inbox), wired to the live leads + proposals tables via the
 * real-source adapter. /pipeline (the lead-detail tool) is still
 * reachable, just sub-route inside this surface. */
const salesItem = {
  label: "Sales",
  href: "/sales",
  icon: <RocketLaunchIcon className="size-4" />,
};
/* Training — knowledge / learning hub. Will land on canonical /training
 * once the surface consolidates wiki, SOPs, funnel knowledge, playbooks
 * + brain library. Points at /wiki-v2 today as the closest existing
 * surface so the link doesn't 404. */
const trainingItem = {
  label: "Training",
  href: "/wiki-v2",
  icon: <AcademicCapIcon className="size-4" />,
};
/* Hero Offer - the conversion engine playbook house. One umbrella with
 * Start here / Acquisition / Execution / Retention tabs inside. Sits
 * in the Offer + Knowledge group. Visible to every role - the playbook
 * is for everyone, edits are admin-only inside.
 *
 * Icon: gradient tile (emerald → cyan → sky, matching the Hero Offer
 * page chrome) with a solid star inside. The one sidebar item that
 * carries a hint of the colour identity of its destination - the
 * playbook is special, the icon hints at it. */
const heroOfferItem = {
  label: "Hero Offer",
  href: "/hero-offer",
  icon: (
    <span className="relative size-5 rounded-md bg-gradient-to-br from-emerald-400 via-cyan-400 to-sky-400 flex items-center justify-center shrink-0 overflow-hidden animate-hero-offer-glow">
      <StarIcon className="size-3 text-white relative z-10 drop-shadow-[0_0_2px_rgba(255,255,255,0.6)]" />
      {/* Diagonal light sweep across the tile every 2.8s */}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/55 to-transparent animate-hero-offer-shimmer pointer-events-none"
      />
    </span>
  ),
};

/* Toolbox — the day-to-day tools every team member needs, carried over from
 * the retired Team Hub so members work entirely inside the dashboard shell.
 * Visible to everyone (admins included). Ordered in a logical flow, paired by
 * purpose: daily work → playbook → reference assets → pay.
 * Renders as one collapsible "Toolbox" section. */
/* Team — all team-facing utilities: reference assets + pay tools. */
const teamItems: NavItem[] = [
  { label: "Swipe File", href: "/team/swipe-file", icon: <BookmarkIcon className="size-4" /> },
  { label: "Font Library", href: "/team/fonts", icon: <DocumentTextIcon className="size-4" /> },
  { label: "Submit Invoice", href: "/team/invoice", icon: <DocumentPlusIcon className="size-4" /> },
  { label: "Payments", href: "/team/payments", icon: <CreditCardIcon className="size-4" /> },
];

/* Shortcuts — single pinned nav item between My Tasks and Project Delivery.
 * Lands at /shortcuts, which mounts a ShortcutsNav tab strip that the
 * dashboard layout keeps mounted across every underlying tool route, so
 * tabbing between Payment Links / Case Studies / etc feels in-page. */
const shortcutsItem = {
  label: "Shortcuts",
  href: "/shortcuts",
  icon: <BoltIcon className="size-4" />,
};

/* Team Tools — single pinned item replacing the old flat list of team
 * utilities. Lands on the first tool; a TeamToolsNav pill strip (mounted by
 * TeamToolsShell in the dashboard layout) rides above every /team/* route, so
 * Swipe File / Font Library / Submit Invoice / Payments tab in-page. */
const teamToolsItem = {
  label: "Team Tools",
  href: teamItems[0].href,
  icon: <PuzzlePieceIcon className="size-4" />,
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
  // Pod identity tiles were dropped from the sidebar — Mission Control + Workspace
  // cover pod access. Per-pod URLs (/pods-v2/[podId]) still resolve.

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

  /* Build the searchable index: the 10 top-level surfaces + team tools +
   * footer links. Mirrors the sidebar order top-down. */
  const paletteItems: CommandItem[] = [
    { label: myWorkItem.label, href: myWorkItem.href, group: "Pinned", icon: myWorkItem.icon, keywords: ["my tasks", "assigned"] },
    { label: heroOfferItem.label, href: heroOfferItem.href, group: "Pinned", icon: heroOfferItem.icon, keywords: ["conversion engine", "playbook", "offer"] },
    { label: trainingItem.label, href: trainingItem.href, group: "Pinned", icon: trainingItem.icon, keywords: ["wiki", "sop", "knowledge", "playbook", "learning"] },
    // Admin/CRO surfaces.
    ...(role !== "team"
      ? [
          { label: missionControlItem.label, href: missionControlItem.href, group: "Pinned", icon: missionControlItem.icon, keywords: ["kanban", "delivery", "board", "project"] },
          { label: workspaceItem.label, href: workspaceItem.href, group: "Pinned", icon: workspaceItem.icon, keywords: ["pods", "clients", "delivery", "legacy"] },
          { label: kpiItem.label, href: kpiItem.href, group: "Pinned", icon: kpiItem.icon, keywords: ["metrics", "throughput", "on-time"] },
          { label: salesItem.label, href: salesItem.href, group: "Pinned", icon: salesItem.icon, keywords: ["pipeline", "leads", "deals", "outreach"] },
          { label: feedbackItem.label, href: feedbackItem.href, group: "Pinned", icon: feedbackItem.icon, keywords: ["retention", "csm", "client health"] },
          { label: financeItem.label, href: financeItem.href, group: "Pinned", icon: financeItem.icon, keywords: ["invoices", "expenses", "vat"] },
        ]
      : []),
    ...(role === "admin"
      ? [{ label: adminItem.label, href: adminItem.href, group: "Pinned", icon: adminItem.icon, keywords: ["company", "people", "hiring"] }]
      : []),
    // Team utilities — searchable for everyone.
    ...teamItems.map((i: NavItem) => ({ label: i.label, href: i.href, group: "Team" })),
    // Footer / system.
    { label: shortcutsItem.label, href: shortcutsItem.href, group: "System", icon: shortcutsItem.icon, keywords: ["quick", "tools", "favorites"] },
    { label: "Changelog", href: "/changelog", group: "System" },
    ...(role === "admin" ? [{ label: "Settings", href: "/settings", group: "System" }] : []),
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

  /* Search trigger moved to the dashboard top bar — it dispatches this event
   * when clicked so the CommandPalette state (which lives here) can open. */
  useEffect(() => {
    const handler = () => setPaletteOpen(true);
    window.addEventListener("open-command-palette", handler);
    return () => window.removeEventListener("open-command-palette", handler);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  /* Top-level link (Mission Control, Offer, Pods, Agents). Pinned, not collapsible.
   * Uses the same exact class set as section items so the indents, gap, padding,
   * icon size + colour all line up across the sidebar. */
  function renderTopLink(item: { label: string; href: string; icon: React.ReactNode }) {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-2.5 py-2 rounded-md text-[14px] transition-colors ${
          active
            ? "bg-[#E5E5EA] text-[#0C0C0C] font-medium"
            : "text-[#C7C9CD] hover:bg-[#222222] hover:text-white"
        }`}
      >
        <span className={active ? "text-[#0C0C0C]" : "text-[#9CA3AF]"}>{item.icon}</span>
        {!collapsed && <span className="flex-1">{item.label}</span>}
      </Link>
    );
  }

  /* Section — Well-style with NO text label. Whitespace separates groups.
   * Items render with icon + label.
   * Collapsed sidebar shows a dot indicator for the group. */
  function renderSection(section: NavSection) {
    const sectionHasActive = section.items.some((i) => !i.external && isActive(i.href));
    if (collapsed) {
      return (
        <div key={section.title} className="mb-6" title={section.title}>
            <div className="flex justify-center py-1.5">
            <span className={`size-1.5 rounded-full ${sectionHasActive ? "bg-blue-600" : "bg-[#383838]"}`} />
          </div>
        </div>
      );
    }
    return (
      <div key={section.title} className="mb-6">
        {section.badge && (
          <div className="px-3 pb-1.5 flex items-center gap-1.5">
            <LockClosedIcon className="size-2.5 text-[#71757D]" />
            <span className="text-[10px] uppercase tracking-wider text-[#71757D]">{section.badge}</span>
          </div>
        )}
        <div className="px-3 space-y-0.5">
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
                  className="flex items-center justify-between gap-3 px-2.5 py-2 text-[14px] rounded-md text-[#C7C9CD] hover:text-white hover:bg-[#222222] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-[#9CA3AF]">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  <svg className="size-3 text-[#71757D] shrink-0" viewBox="0 0 20 20" fill="currentColor">
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
                className={`flex items-center gap-3 px-2.5 py-2 text-[14px] rounded-md transition-colors ${
                  active
                    ? "bg-[#E5E5EA] text-[#0C0C0C] font-medium"
                    : "text-[#C7C9CD] hover:text-white hover:bg-[#222222]"
                }`}
              >
                <span className={active ? "text-[#0C0C0C]" : "text-[#9CA3AF]"}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
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
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#181818] shadow-[var(--shadow-card)] md:hidden"
        aria-label="Open menu"
      >
        <Bars3Icon className="size-5 text-[#E5E5EA]" />
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
          h-full bg-[#0C0C0C] text-[#E5E5EA] border-r border-[#2A2A2A] font-heading
          flex flex-col
          transition-all duration-200 ease-in-out
          ${collapsed ? "md:w-16" : "md:w-56"}
          w-56
        `}
      >
        {/* Floating collapse handle — sits at the top-right of the sidebar without
            taking a full strip. Mobile uses the close icon variant. */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1 rounded-lg md:hidden text-[#E5E5EA] z-10"
          aria-label="Close menu"
        >
          <XMarkIcon className="size-[18px]" />
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-[#222222] hidden md:block transition-colors z-10"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRightIcon className="size-3.5 text-[#71757D]" /> : <ChevronLeftIcon className="size-3.5 text-[#71757D]" />}
        </button>

        {/* Navigation. Search trigger lives in the top bar — open via window
            event dispatched there (or ⌘K from anywhere). */}
        <nav className="flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* GROUP 1 — My Work: top for everyone. Personal surface. */}
          <div className="px-3 space-y-0.5">
            {renderTopLink(myWorkItem)}
          </div>

          {/* GROUP 2 — Delivery cluster: kanban (canonical) + Old Delivery
              (legacy /workspace, until manual migration done) + KPIs (reads
              kanban metrics). */}
          {role !== "team" && (
            <div className="px-3 space-y-0.5 mt-6">
              {renderTopLink(missionControlItem)}
              {renderTopLink(workspaceItem)}
              {renderTopLink(kpiItem)}
            </div>
          )}

          {/* GROUP 3 — Revenue surfaces: Sales (Ajay's home) + Retention
              (CSM's home). Admin/CRO only - team doesn't run these. */}
          {role !== "team" && (
            <div className="px-3 space-y-0.5 mt-6">
              {renderTopLink(salesItem)}
              {renderTopLink(feedbackItem)}
            </div>
          )}

          {/* GROUP 4 — Offer + Knowledge: Hero Offer (Conversion Engine
              house, everyone) + Training (wiki/SOP/playbook home, everyone).
              The two reference surfaces, tight scopes each. */}
          <div className="px-3 space-y-0.5 mt-6">
            {renderTopLink(heroOfferItem)}
            {renderTopLink(trainingItem)}
          </div>

          {/* GROUP 5 — Team Tools: single collapsible-style item. The
              TeamToolsNav pill strip rides above /team/* (see
              TeamToolsShell) so Swipe File / Fonts / Submit Invoice /
              Payments tab in-page. Visible to everyone. */}
          <div className="px-3 space-y-0.5 mt-6">
            {renderTopLink(teamToolsItem)}
          </div>

          {/* GROUP 6 — Admin cluster: Finance (locked) above Admin
              (locked, admin-only). Both wear lock icons. */}
          {role !== "team" && (
            <div className="px-3 space-y-0.5 mt-6">
              {renderTopLink(financeItem)}
              {role === "admin" && renderTopLink(adminItem)}
            </div>
          )}
        </nav>

        {/* Team Timezones — moved up off the footer. */}
        {!collapsed && (
          <div className="mx-3 mt-3 mb-3 px-3 py-2 rounded-md bg-[#0C0C0C] border border-[#2A2A2A] shrink-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ClockIcon className="size-3 text-[#71757D]" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#71757D]">
                Team
              </span>
            </div>
            <div className="space-y-1">
              {teamZones.map((z) => (
                <div
                  key={z.tz}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="text-[#71757D]">
                    {z.flag} {z.label}
                  </span>
                  <span className="tabular-nums text-[#71757D]">
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
          <div className="py-2 flex justify-center shrink-0">
            <ClockIcon className="size-3.5 text-[#71757D]" />
          </div>
        )}

        {/* Footer — version, Shortcuts, Shelved as small text links.
            Shortcuts demoted here from a top-level pin to keep the main
            nav at 10 surfaces flat. */}
        {!collapsed && (
          <div className="px-4 pb-4 pt-1 flex items-center gap-2 shrink-0 flex-wrap">
            <Link
              href="/changelog"
              onClick={() => setMobileOpen(false)}
              className="text-[11px] text-[#71757D] hover:text-white transition-colors"
            >
              Launchpad v1.0.0
            </Link>
            <span className="text-[10px] text-[#3F3F46]">·</span>
            <Link
              href="/shortcuts"
              onClick={() => setMobileOpen(false)}
              className="text-[11px] text-[#71757D] hover:text-white transition-colors"
            >
              Shortcuts
            </Link>
            <span className="text-[10px] text-[#3F3F46]">·</span>
            <Link
              href="/shelved"
              onClick={() => setMobileOpen(false)}
              className="text-[11px] text-[#71757D] hover:text-white transition-colors"
            >
              Shelved
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
