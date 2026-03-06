import Link from "next/link";
import {
  DocumentTextIcon,
  DocumentDuplicateIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  ReceiptPercentIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  WalletIcon,
  SignalIcon,
  BeakerIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";

interface ToolCard {
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  section: string;
  wip?: boolean;
}

const tools: ToolCard[] = [
  {
    name: "Project Doc Creation",
    description: "Generate branded scope documents and service agreements for client projects",
    href: "/tools/scope-generator",
    icon: <DocumentTextIcon className="size-5" />,
    section: "Project Management",
  },
  {
    name: "Project Roadmap",
    description: "Generate branded project timeline PDFs with milestones and client touchpoints",
    href: "/tools/project-roadmap",
    icon: <CalendarDaysIcon className="size-5" />,
    section: "Project Management",
  },
  {
    name: "Price Calculator",
    description: "Calculate internal costs, client pricing, and margins for project deliverables",
    href: "/tools/price-calculator",
    icon: <CalculatorIcon className="size-5" />,
    section: "Project Management",
  },
  {
    name: "QA Checklist",
    description: "Interactive quality assurance checklist for client projects",
    href: "/tools/qa-checklist",
    icon: <ClipboardDocumentCheckIcon className="size-5" />,
    section: "Project Management",
  },
  {
    name: "Invoice Generator",
    description: "Generate branded PDF invoices for client projects",
    href: "/tools/invoice-generator",
    icon: <ReceiptPercentIcon className="size-5" />,
    section: "Finance",
  },
  {
    name: "Dev Hours",
    description: "Log out-of-scope dev hours and track invoicing against clients",
    href: "/tools/dev-hours",
    icon: <ClockIcon className="size-5" />,
    section: "Finance",
  },
  {
    name: "Expenses",
    description: "Track business expenses and flag what's needed",
    href: "/tools/expenses",
    icon: <WalletIcon className="size-5" />,
    section: "Finance",
  },
  {
    name: "Store Intelligence",
    description: "Analyse any Shopify store — products, tech stack, funnel leaks, and quick wins",
    href: "/tools/store-intel",
    icon: <MagnifyingGlassIcon className="size-5" />,
    section: "Coming Soon",
    wip: true,
  },
  {
    name: "Upsell Scanner",
    description: "Scan Slack for upsell signals from the last 24 hours",
    href: "/tools/upsell-scanner",
    icon: <SignalIcon className="size-5" />,
    section: "Coming Soon",
    wip: true,
  },
  {
    name: "Proposals",
    description: "Generate unique proposal links for clients — track views and conversions",
    href: "/tools/proposals",
    icon: <DocumentDuplicateIcon className="size-5" />,
    section: "Coming Soon",
    wip: true,
  },
  {
    name: "Outreach Generator",
    description: "Generate personalised cold emails, follow-ups, Loom scripts, and LinkedIn DMs for prospects",
    href: "/tools/outreach",
    icon: <PaperAirplaneIcon className="size-5" />,
    section: "Coming Soon",
    wip: true,
  },
  {
    name: "Prospect Scraper",
    description: "Discover Shopify stores by niche, enrich with contacts and store data, export CSV for outreach",
    href: "/tools/prospect-scraper",
    icon: <UserGroupIcon className="size-5" />,
    section: "Coming Soon",
    wip: true,
  },
  {
    name: "CRO Test Monitor",
    description: "Track live A/B tests across clients — CVR, RPV, AOV, stat sig, and weekly review checklists",
    href: "/tools/cro-monitor",
    icon: <ChartBarIcon className="size-5" />,
    section: "Coming Soon",
    wip: true,
  },
  {
    name: "CRO Audit",
    description: "Upload designs for an AI-powered conversion rate analysis",
    href: "/tools/cro-audit",
    icon: <BeakerIcon className="size-5" />,
    section: "Coming Soon",
    wip: true,
  },
  {
    name: "Playbooks",
    description: "Interactive step-by-step training with knowledge checks — learn the Ecomlanders way",
    href: "/tools/playbooks",
    icon: <BookOpenIcon className="size-5" />,
    section: "Coming Soon",
    wip: true,
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Launchpad
          </h1>
          <p className="text-[#6B6B6B] text-lg">
            Internal tools for the Ecomlanders team
          </p>
        </div>

        {/* Tool cards grouped by section */}
        {Array.from(new Set(tools.map((t) => t.section))).map((section) => (
          <div key={section} className="mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-4">
              {section}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools
                .filter((t) => t.section === section)
                .map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className="group relative bg-[#F0F0F0] border border-[#E5E5E5] rounded-lg p-6 transition-all duration-200 hover:border-[#CCCCCC] hover:bg-[#EBEBEB] cursor-pointer"
                  >
                    <CardContent tool={tool} />
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardContent({ tool }: { tool: ToolCard }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2.5 bg-white rounded-md border border-[#E5E5E5]">
        {tool.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
          {tool.name}
          {tool.wip && (
            <span className="px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-600 rounded">
              WIP
            </span>
          )}
        </h3>
        <p className="text-xs text-[#6B6B6B] leading-relaxed">
          {tool.description}
        </p>
        <span className="mt-2 inline-block text-[10px] font-medium uppercase tracking-wider text-[#AAAAAA]">
          {tool.section}
        </span>
      </div>
    </div>
  );
}
