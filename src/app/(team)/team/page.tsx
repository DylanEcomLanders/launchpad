import Link from "next/link";
import {
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  BookOpenIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";

const primary = [
  {
    title: "Task Board",
    description: "Live deliverables grouped by project — phases, deadlines, who's on what. Auto-refreshes every 30s.",
    href: "/tasks",
    icon: ClipboardDocumentListIcon,
  },
  {
    title: "Client Portals",
    description: "Team view of every active portal — gates, checklists, handover context.",
    href: "/team/portals",
    icon: FolderIcon,
  },
  {
    title: "Operations Wiki",
    description: "Our internal playbook — process, standards, and the way we deliver.",
    href: "/team/ops-wiki",
    icon: BookOpenIcon,
    badge: "WIP",
  },
];

const tools = [
  {
    title: "Swipe File",
    description: "Reference library of great pages — drop a URL, we cache mobile + desktop.",
    href: "/team/swipe-file",
    icon: PhotoIcon,
  },
  {
    title: "Dev QA Checklist",
    description: "Evergreen Dev QA checklist — run through before handing anything to a client.",
    href: "/team/qa",
    icon: ClipboardDocumentCheckIcon,
  },
];

export default function TeamToolsPage() {
  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-20">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
            Team Tools
          </h1>
          <p className="text-sm text-[#7A7A7A]">
            Everything the team needs to deliver — portals, the playbook, and our QA gates.
          </p>
        </div>

        {/* Primary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {primary.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="bg-white border border-[#E5E5EA] rounded-lg p-5 hover:border-[#1B1B1B] hover:shadow-sm cursor-pointer group transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <item.icon className="size-5 text-[#7A7A7A]" />
                <h2 className="text-sm font-semibold text-[#1B1B1B]">
                  {item.title}
                </h2>
                {"badge" in item && item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 rounded">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7A7A7A] leading-relaxed mb-3">
                {item.description}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1B1B1B] group-hover:gap-1.5 transition-all">
                Open
                <ChevronRightIcon className="size-3" />
              </span>
            </Link>
          ))}
        </div>

        {/* Tools Section */}
        <div className="mt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
            Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.title}
                href={tool.href}
                className="bg-white border border-[#E5E5EA] rounded-lg p-5 hover:border-[#1B1B1B] hover:shadow-sm cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <tool.icon className="size-5 text-[#7A7A7A]" />
                  <h2 className="text-sm font-semibold text-[#1B1B1B]">
                    {tool.title}
                  </h2>
                </div>
                <p className="text-xs text-[#7A7A7A] leading-relaxed mb-3">
                  {tool.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1B1B1B] group-hover:gap-1.5 transition-all">
                  Open
                  <ChevronRightIcon className="size-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
