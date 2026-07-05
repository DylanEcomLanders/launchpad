import Link from "next/link";
import {
  ArrowUpRightIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  SwatchIcon,
  PhotoIcon,
  LanguageIcon,
  LightBulbIcon,
  BookOpenIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

/* ── Team Tools ──
 * The team's day-to-day hub, grouped by what you came to do: run the work
 * (Delivery), make the work (Production), or learn how we work (Playbook).
 * DESIGN.md craft: dark tokens, 4px rounding, border-border-faint cards on the
 * surface-raised step, no shadows / gradients / decorative blocks.
 */

type Tool = {
  title: string;
  description: string;
  href: string;
  icon: typeof UserGroupIcon;
  external?: boolean;
};

type Group = { label: string; blurb: string; tools: Tool[] };

const GROUPS: Group[] = [
  {
    label: "Delivery",
    blurb: "Run the work.",
    tools: [
      { title: "Pods", description: "Your pod's work in flight: deliverables, tickets, blockers. Mark done, raise tickets, escalate.", href: "/team/pods", icon: UserGroupIcon },
      { title: "Task Board", description: "Live deliverables grouped by project: phases, deadlines, who's on what. Auto-refreshes every 30s.", href: "/tasks", icon: ClipboardDocumentListIcon },
      { title: "Client Portals", description: "Team view of every active portal: gates, checklists, handover context.", href: "/team/portals", icon: FolderIcon },
      { title: "Dev QA Checklist", description: "Run the evergreen QA gates before anything is handed to a client.", href: "/team/qa", icon: ClipboardDocumentCheckIcon },
    ],
  },
  {
    label: "Production",
    blurb: "Make the work.",
    tools: [
      { title: "Copy Engine", description: "Brief in, conversion copy out. Brand-aware, section by section.", href: "/team/copy", icon: PencilSquareIcon },
      { title: "Research & Intel", description: "Deep strategic research from a client brief: market, audience, angles.", href: "/team/research", icon: MagnifyingGlassIcon },
      { title: "Design & Dev", description: "Section gallery plus the per-page build checklists, filterable.", href: "/team/design", icon: Squares2X2Icon },
      { title: "Design Library", description: "The Figma master file: components, tokens, patterns. Pull from here, don't reinvent.", href: "https://www.figma.com/design/QDGh9XLKyvvumKwftUylvi/Ecomlanders-Design-Library?node-id=382-177", icon: SwatchIcon, external: true },
      { title: "Swipe File", description: "Reference library of great pages. Drop a URL, we cache mobile plus desktop.", href: "/team/swipe-file", icon: PhotoIcon },
      { title: "Font Library", description: "Approved fonts only. Browse, preview, download, filter by niche.", href: "/team/fonts", icon: LanguageIcon },
    ],
  },
  {
    label: "Playbook",
    blurb: "How we work.",
    tools: [
      { title: "Why Pods", description: "The pod operating system: the week, buckets, the Monday Protocol. Read once, reopen anytime.", href: "/team/why-pods", icon: LightBulbIcon },
      { title: "Operations Wiki", description: "Process, standards, and the way we deliver, team-facing.", href: "/team/ops-wiki", icon: BookOpenIcon },
      { title: "Payments", description: "How you get paid: per-page rates by tier, volume rebate, rush fee, retainers, invoicing.", href: "/team/payments", icon: BanknotesIcon },
    ],
  },
];

export default function TeamToolsPage() {
  return (
    <div className="px-6 pb-20 pt-8 md:px-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team Tools</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Everything the team needs to deliver: the boards you work from, the tools you build with, and the playbook behind how we operate.
        </p>
      </header>

      <div className="space-y-8">
        {GROUPS.map((group) => (
          <section key={group.label}>
            <div className="mb-3 flex items-baseline gap-2.5">
              <h2 className="text-3xs font-semibold uppercase tracking-wider text-subtle">{group.label}</h2>
              <span className="text-3xs text-subtle">{group.blurb}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {group.tools.map((tool) => {
                const linkProps = tool.external
                  ? { target: "_blank", rel: "noopener noreferrer" as const }
                  : {};
                return (
                  <Link
                    key={tool.title}
                    href={tool.href}
                    {...linkProps}
                    className="group rounded border border-border-faint bg-surface-raised p-5 transition-colors hover:border-border"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex size-9 items-center justify-center rounded border border-border-faint bg-surface text-muted transition-colors group-hover:text-foreground">
                        <tool.icon className="size-4" />
                      </span>
                      <ArrowUpRightIcon className="size-4 text-subtle transition-colors group-hover:text-foreground" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{tool.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{tool.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
