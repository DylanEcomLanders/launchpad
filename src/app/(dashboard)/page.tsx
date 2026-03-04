import Link from "next/link";
import {
  DocumentTextIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  ReceiptPercentIcon,
  ClockIcon,
  WalletIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";

interface ToolCard {
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  section: string;
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
        <h3 className="text-sm font-semibold mb-1">{tool.name}</h3>
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
