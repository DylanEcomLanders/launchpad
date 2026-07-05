"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import {
  PixelApps, PixelBoard, PixelBolt, PixelBook, PixelBookmark, PixelBuilding,
  PixelBulb, PixelCap, PixelCard, PixelChart, PixelChecklist, PixelCoins,
  PixelFunnel, PixelGrid, PixelHeart, PixelHome, PixelPulse, PixelPuzzle,
  PixelReceipt, PixelSend, PixelTag, PixelType, PixelUserPlus, PixelUsers,
} from "@/components/pixel-icons";
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
// LogoMark moved to dashboard top bar — sidebar no longer renders the logo.
import { useRole, useCurrentUser, signOut } from "@/components/auth-gate";
import { CommandPalette, type CommandItem } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme";

interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  icon?: React.ReactNode;
  /** Per-item visibility. Omit = everyone (incl. team). A section can mix
   *  team-visible and admin-only items (e.g. Delivery vs Onboarding). */
  roles?: ("admin" | "cro" | "team")[];
}

interface NavSection {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
  /* When set, the section is a single top-level link (title navigates here,
   * no collapse, items ignored) for umbrellas whose sub-nav lives in tabs
   * on the destination, e.g. Offer → /hero-offer. */
  href?: string;
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

function zoneTime(now: Date, tz: string): string {
  return now.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
}

/* Full team-zone list, shared by the hover popovers in the sidebar clock. */
function TeamZoneRows({ now }: { now: Date }) {
  return (
    <div className="space-y-1">
      {teamZones.map((z) => (
        <div key={z.tz} className="flex items-center justify-between text-3xs">
          <span className="text-subtle">{z.flag} {z.label}</span>
          <span className="tabular-nums text-muted">{zoneTime(now, z.tz)}</span>
        </div>
      ))}
    </div>
  );
}

/* Sidebar follows the agency lifecycle (top-down): pin the daily drivers
 * (Mission Control, Tools, Workspace, Offer), then dropdowns for each lifecycle phase,
 * ops/finance, reference material, and a default-collapsed Shelved drawer
 * for parked tools we're not actively using.
 *
 * Shelved housekeeping: review every 3 months — promote what's back in
 * use, or kill what's truly dead. Don't let it become a graveyard. */
/* navSections is defined below, after the individual item consts it
   references (Delivery, Onboarding, etc.). */

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
  icon: <PixelBoard className="size-4" />,
};
/* Delivery KPIs — on-time / overdue / turnaround reporting off the ClickUp
 * board. Sits next to Project Delivery in the delivery cluster. */
const kpiItem = {
  label: "Delivery KPIs",
  href: "/kpi",
  icon: <PixelChart className="size-4" />,
};
const onboardingItem = {
  label: "Onboarding",
  href: "/tools/onboarding-inbox",
  icon: <PixelUserPlus className="size-4" />,
};
/* Retention dashboard — CSM home (client health, churn risk, renewals).
 * Repointed from the old /tools/feedback tool, which is still reachable by URL. */
const feedbackItem = {
  label: "Retention",
  href: "/retention",
  icon: <PixelPulse className="size-4" />,
};
/* Tools — quick-access launcher for client assets + internal tooling. Used
 * to be called Mission Control; renamed when the kanban claimed that name. */
const homeItem = {
  label: "Tools",
  href: "/",
  icon: <PixelApps className="size-4" />,
};
/* My Work — personal landing for everyone: the deliverables assigned to the
 * signed-in person. (Replaces the old founder-only "My Week" planner.) */
const myWorkItem = {
  label: "My Tasks",
  href: "/my-work",
  icon: <PixelChecklist className="size-4" />,
};
/* Old Delivery — the previous /workspace surface, kept around until
 * its in-flight projects are manually migrated to the Delivery kanban.
 * Renamed from "Workspace" so its legacy status is obvious. */
const workspaceItem = {
  label: "Old Delivery",
  href: "/workspace",
  icon: <PixelGrid className="size-4" />,
};
/* Agents — shelved from the nav for now (route still exists at /agents).
 * Restore by re-adding to the admin pinned cluster + command palette.
const agentsItem = {
  label: "Agents",
  href: "/agents",
  icon: <PixelWrench className="size-4" />,
};
*/
const wikiItem = {
  label: "Wiki",
  href: "/wiki-v2",
  icon: <PixelBook className="size-4" />,
};
/* R&D Tracker — internal accountability + team idea inbox. Admin cluster. */
const rdItem = {
  label: "R&D",
  href: "/rd",
  icon: <PixelBulb className="size-4" />,
};
/* Finance — single pinned item replacing the old "PRIVATE" section. Lock icon
 * signals the password gate; /finance is already wrapped in FinanceGate. All
 * the previous section sub-items (Pricing / Calculator / Revenue / Turnarounds
 * / Payment link / Dev hours) live as tabs inside FinanceNav. */
const financeItem = {
  label: "Finance",
  href: "/finance",
  icon: <PixelCoins className="size-4" />,
};
/* Admin — replaces the old "Company" section. Single pinned item; the
 * previous tabs (Overview / People / Structure / Hiring / Contracts / Settings)
 * live as tabs inside /company's layout. CompanyGate handles the password. */
const adminItem = {
  label: "Company",
  href: "/company",
  icon: <PixelBuilding className="size-4" />,
};
/* Sales — Ajay's one-stop surface for the sales motion. /sales is
 * the canonical dashboard (KPIs + funnel + pipeline kanban +
 * inbox), wired to the live leads + proposals tables via the
 * real-source adapter. /pipeline (the lead-detail tool) is still
 * reachable, just sub-route inside this surface. */
const salesItem = {
  label: "Sales",
  href: "/sales",
  icon: <PixelFunnel className="size-4" />,
};
/* Training — knowledge / learning hub. Will land on canonical /training
 * once the surface consolidates wiki, SOPs, funnel knowledge, playbooks
 * + brain library. Points at /wiki-v2 today as the closest existing
 * surface so the link doesn't 404. */
const trainingItem = {
  label: "Training",
  href: "/wiki-v2",
  icon: <PixelCap className="size-4" />,
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
    <span className="size-5 rounded-md bg-surface-raised border border-border flex items-center justify-center shrink-0">
      <StarIcon className="size-3 text-foreground" />
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
  { label: "Swipe File", href: "/team/swipe-file", icon: <PixelBookmark className="size-4" /> },
  { label: "Font Library", href: "/team/fonts", icon: <PixelType className="size-4" /> },
  { label: "Submit Invoice", href: "/me/invoices", icon: <PixelReceipt className="size-4" /> },
  { label: "Payments", href: "/team/payments", icon: <PixelCard className="size-4" /> },
];

/* Shortcuts — single pinned nav item between My Tasks and Project Delivery.
 * Lands at /shortcuts, which mounts a ShortcutsNav tab strip that the
 * dashboard layout keeps mounted across every underlying tool route, so
 * tabbing between Payment Links / Case Studies / etc feels in-page. */
const shortcutsItem = {
  label: "Shortcuts",
  href: "/shortcuts",
  icon: <PixelBolt className="size-4" />,
};

/* Team Tools — lands on the /team hub page, which is a card-grid
 * of every team-facing surface (Pods, Task Board, Client Portals,
 * Ops Wiki, Payments, Design Library, Swipe File, Fonts, Submit
 * Invoice, etc). Single entry, rich internal nav. The TeamToolsNav
 * pill strip still rides above /team/* routes for tab navigation. */
const teamToolsItem = {
  label: "Team Tools",
  href: "/team",
  icon: <PixelPuzzle className="size-4" />,
};

/* Overview — the admin home at /. A briefing surface: delivery health,
 * what needs attention, and the daily quick tools. Pinned to the top of
 * the nav (admin/CRO) so it's always one click back, same as the logo. */
const overviewItem = {
  label: "Overview",
  href: "/",
  icon: <PixelHome className="size-4" />,
};

/* Submit Invoice — top-level shortcut so contractors don't have to
 * dig through Team Tools to find the form. Lands on /me/invoices
 * (real PDF upload + tied to their Person + past submissions). */
const submitInvoiceItem = {
  label: "Submit Invoice",
  href: "/me/invoices",
  icon: <PixelReceipt className="size-4" />,
};

/* Outbound — the sales outbound tool (being built; empty placeholder for
   now). Lives in the Sales section. */
const outboundItem = {
  label: "Outbound",
  href: "/outbound",
  icon: <PixelSend className="size-4" />,
};

/* Grouped, collapsible navigation. Each section is a dropdown; items carry
   their own role gating so a section can mix team-visible and admin-only
   entries (Delivery is everyone; Onboarding / KPIs / etc. are admin+cro). */
const ADMIN_CRO: ("admin" | "cro")[] = ["admin", "cro"];
const navSections: NavSection[] = [
  {
    title: "Client Health",
    icon: <PixelHeart className="size-4" />,
    group: "lifecycle",
    items: [
      { ...onboardingItem, roles: ADMIN_CRO },
      missionControlItem,
      { ...kpiItem, roles: ADMIN_CRO },
      { ...workspaceItem, roles: ADMIN_CRO },
      { ...feedbackItem, roles: ADMIN_CRO },
    ],
  },
  {
    title: "Sales",
    icon: <PixelFunnel className="size-4" />,
    group: "lifecycle",
    roles: ADMIN_CRO,
    items: [outboundItem],
  },
  {
    title: "Offer",
    icon: <PixelTag className="size-4" />,
    group: "lifecycle",
    href: "/hero-offer",
    items: [],
  },
  {
    title: "Team",
    icon: <PixelUsers className="size-4" />,
    group: "ops",
    items: [
      trainingItem,
      teamToolsItem,
      submitInvoiceItem,
    ],
  },
  {
    title: "Company",
    icon: <PixelBuilding className="size-4" />,
    group: "ops",
    roles: ADMIN_CRO,
    items: [financeItem, { ...adminItem, roles: ["admin"] }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const role = useRole();
  const currentUser = useCurrentUser();
  const collapsed = false;
  const [mobileOpen, setMobileOpen] = useState(false);
  /* Per-item role gating: a section can mix team-visible and admin-only items
   * (Delivery is everyone; Onboarding/KPIs are admin/cro), so filter items by
   * role and drop any section left empty for this role. */
  const visibleSections = navSections
    .filter((s) => !s.roles || (role !== "team" && s.roles.includes(role)))
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.roles || i.roles.includes(role)),
    }))
    .filter((s) => s.items.length > 0 || s.href);

  /* Sections render open with no collapse toggle: the whole nav is visible at
   * a glance, no arrows to click. */
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
    { label: submitInvoiceItem.label, href: submitInvoiceItem.href, group: "Pinned", icon: submitInvoiceItem.icon, keywords: ["invoice", "expenses", "submit", "pay"] },
    // Delivery (kanban board) — visible to everyone including members.
    { label: missionControlItem.label, href: missionControlItem.href, group: "Pinned", icon: missionControlItem.icon, keywords: ["kanban", "delivery", "board", "project"] },
    // Admin/CRO surfaces.
    ...(role !== "team"
      ? [
          { label: onboardingItem.label, href: onboardingItem.href, group: "Pinned", icon: onboardingItem.icon, keywords: ["onboarding", "inbox", "new clients", "intake"] },
          { label: workspaceItem.label, href: workspaceItem.href, group: "Pinned", icon: workspaceItem.icon, keywords: ["pods", "clients", "delivery", "legacy"] },
          { label: kpiItem.label, href: kpiItem.href, group: "Pinned", icon: kpiItem.icon, keywords: ["metrics", "throughput", "on-time"] },
          { label: salesItem.label, href: salesItem.href, group: "Pinned", icon: salesItem.icon, keywords: ["pipeline", "leads", "deals", "outreach"] },
          { label: feedbackItem.label, href: feedbackItem.href, group: "Pinned", icon: feedbackItem.icon, keywords: ["retention", "csm", "client health"] },
          { label: financeItem.label, href: financeItem.href, group: "Pinned", icon: financeItem.icon, keywords: ["invoices", "expenses", "vat"] },
        ]
      : []),
    ...(role === "admin"
      ? [
          { label: adminItem.label, href: adminItem.href, group: "Pinned", icon: adminItem.icon, keywords: ["company", "people", "hiring"] },
          { label: "Team access", href: "/workspace/team", group: "Pinned", icon: adminItem.icon, keywords: ["roles", "permissions", "member", "admin", "access", "promote", "demote", "login"] },
        ]
      : []),
    ...(role !== "team"
      ? [{ label: overviewItem.label, href: overviewItem.href, group: "Pinned", icon: overviewItem.icon, keywords: ["home", "overview", "dashboard", "delivery", "tools", "payment", "invoice"] }]
      : []),
    // Team utilities — searchable for everyone.
    ...teamItems.map((i: NavItem) => ({ label: i.label, href: i.href, group: "Team" })),
    // Footer / system.
    { label: shortcutsItem.label, href: shortcutsItem.href, group: "System", icon: shortcutsItem.icon, keywords: ["quick", "tools", "favorites"] },
    { label: "Changelog", href: "/changelog", group: "System" },
    ...(role === "admin" ? [{ label: "Settings", href: "/company/settings", group: "System" }] : []),
  ];


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
        className={`flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm transition-colors ${
          active
            ? "bg-surface-raised text-foreground font-medium"
            : "text-muted hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        <span className={active ? "text-foreground" : "text-muted"}>{item.icon}</span>
        {!collapsed && <span className="flex-1">{item.label}</span>}
      </Link>
    );
  }

  /* Section — Well-style with NO text label. Whitespace separates groups.
   * Items render with icon + label.
   * Collapsed sidebar shows a dot indicator for the group. */
  function renderSection(section: NavSection) {
    /* Link-style section: the title itself is the destination (sub-nav lives
     * in tabs there). Renders exactly like a top link so it lines up. */
    if (section.href) {
      return renderTopLink({ label: section.title, href: section.href, icon: section.icon });
    }
    const sectionHasActive = section.items.some((i) => !i.external && isActive(i.href));
    if (collapsed) {
      return (
        <div key={section.title} className="mb-6" title={section.title}>
            <div className="flex justify-center py-1.5">
            <span className={`size-1.5 rounded-full ${sectionHasActive ? "bg-foreground" : "bg-border"}`} />
          </div>
        </div>
      );
    }
    return (
      <div key={section.title}>
        <div className="flex items-center gap-3 px-2.5 py-2.5 text-muted">
          <span className="text-subtle">{section.icon}</span>
          <span className="flex-1 text-sm font-medium">{section.title}</span>
        </div>
        <div className="pl-3 mt-1 mb-1 space-y-1">
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
                  className="flex items-center justify-between gap-3 px-2.5 py-2 text-xs rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-muted">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  <svg className="size-3 text-subtle shrink-0" viewBox="0 0 20 20" fill="currentColor">
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
                className={`flex items-center gap-3 px-2.5 py-2 text-xs rounded-md transition-colors ${
                  active
                    ? "bg-surface-raised text-foreground font-medium"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <span className={active ? "text-foreground" : "text-muted"}>{item.icon}</span>
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
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface shadow-[var(--shadow-card)] md:hidden"
        aria-label="Open menu"
      >
        <Bars3Icon className="size-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-surface/10 backdrop-blur-[2px] z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          fixed md:relative z-50 md:z-0
          h-full bg-background text-foreground border-r border-border font-heading
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
          className="absolute top-3 right-3 p-1 rounded-lg md:hidden text-foreground z-10"
          aria-label="Close menu"
        >
          <XMarkIcon className="size-[18px]" />
        </button>

        {/* Navigation. Search trigger lives in the top bar — open via window
            event dispatched there (or ⌘K from anywhere). */}
        <nav className="flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Overview (admin/CRO home) + My Tasks — pinned above the grouped
              sections so home is always one click away. */}
          <div className="px-3 space-y-1">
            {role !== "team" && renderTopLink(overviewItem)}
            {renderTopLink(myWorkItem)}
          </div>

          {/* Grouped, collapsible navigation. Sections + per-item role
              gating are defined in navSections; visibleSections filters to
              what this role can see. */}
          <div className="mt-5 px-3 space-y-1.5">
            {visibleSections.map(renderSection)}
          </div>
        </nav>

        {/* Team clock: one compact row; the full zone list reveals on hover. */}
        {!collapsed && (
          <div className="group relative mx-3 mt-3 mb-3 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-background border border-border">
              <ClockIcon className="size-3 shrink-0 text-subtle" />
              <span className="text-4xs font-medium uppercase tracking-wider text-subtle">Team</span>
              <span className="ml-auto flex items-center gap-1.5 text-3xs tabular-nums text-subtle">
                {teamZones[0].flag} {zoneTime(now, teamZones[0].tz)}
              </span>
              <ChevronDownIcon className="size-3 rotate-180 text-subtle transition-colors group-hover:text-muted" />
            </div>
            {/* Hover popover with every zone */}
            <div className="pointer-events-none absolute bottom-full left-0 right-0 mb-2 translate-y-1 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <TeamZoneRows now={now} />
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="group relative flex justify-center py-2 shrink-0">
            <ClockIcon className="size-3.5 text-subtle" />
            <div className="pointer-events-none absolute bottom-1 left-full z-50 ml-2 -translate-x-1 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
              <div className="w-40 rounded-md border border-border bg-surface-raised p-3">
                <TeamZoneRows now={now} />
              </div>
            </div>
          </div>
        )}

        {/* Signed-in user + sign-out. Shown above the version/shortcuts
            footer. Name + role chip on the left, sign-out button on the
            right. Falls back to the role label when no auth identity
            (legacy shared-password sessions). Collapsed view gets the
            icon-only button at the bottom. */}
        {!collapsed && (
          <div className="px-4 pt-3 pb-2 mt-auto border-t border-surface flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0 flex-1">
              <div className="text-2xs font-medium text-foreground truncate">
                {currentUser?.name ?? "Shared session"}
              </div>
              <div className="text-4xs uppercase tracking-wider text-subtle truncate">
                {currentUser?.email ?? `${role} role`}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="shrink-0 p-1.5 rounded-md text-subtle hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="size-4" />
            </button>
          </div>
        )}
        {collapsed && (
          <div className="py-2 flex justify-center shrink-0 mt-auto">
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="p-1.5 rounded-md text-subtle hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="size-4" />
            </button>
          </div>
        )}

        {/* Footer — version, Shortcuts, Shelved as small text links.
            Shortcuts demoted here from a top-level pin to keep the main
            nav at 10 surfaces flat. */}
        {!collapsed && (
          <div className="px-4 pb-4 pt-1 flex items-center gap-2 shrink-0 flex-wrap">
            <ThemeToggle />
            <span className="text-4xs text-subtle">·</span>
            <Link
              href="/changelog"
              onClick={() => setMobileOpen(false)}
              className="text-3xs text-subtle hover:text-foreground transition-colors"
            >
              Launchpad v1.0.0
            </Link>
            <span className="text-4xs text-subtle">·</span>
            <Link
              href="/shortcuts"
              onClick={() => setMobileOpen(false)}
              className="text-3xs text-subtle hover:text-foreground transition-colors"
            >
              Shortcuts
            </Link>
            <span className="text-4xs text-subtle">·</span>
            <Link
              href="/shelved"
              onClick={() => setMobileOpen(false)}
              className="text-3xs text-subtle hover:text-foreground transition-colors"
            >
              Shelved
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
