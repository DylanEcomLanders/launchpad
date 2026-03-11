import Link from "next/link";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  CodeBracketIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";

const modules = [
  {
    title: "Research & Intel",
    description:
      "AI-powered Voice of Customer analysis. Scrapes Amazon, Reddit, Trustpilot, G2, YouTube, and Quora to extract verbatim customer language for conversion copy.",
    href: "/team/research",
    icon: MagnifyingGlassIcon,
    live: true,
  },
  {
    title: "Copy Engine",
    description:
      "Generate headlines, email sequences, ad copy, and landing page frameworks using brand profiles and VOC data.",
    href: "/team/copy",
    icon: PencilSquareIcon,
    live: false,
  },
  {
    title: "Design & Dev",
    description:
      "Component library, reference gallery, and QA tools powered by brand guidelines and past builds.",
    href: "/team/design",
    icon: CodeBracketIcon,
    live: false,
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
          <p className="text-sm text-[#6B6B6B]">
            Research, create, and ship — powered by brand intelligence
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const Card = mod.live ? Link : "div";
            return (
              <Card
                key={mod.title}
                href={mod.live ? mod.href : "#"}
                className={`
                  bg-white border border-[#E5E5E5] rounded-lg p-5 transition-all
                  ${
                    mod.live
                      ? "hover:border-[#0A0A0A] hover:shadow-sm cursor-pointer group"
                      : "opacity-60 cursor-default"
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-3">
                  <mod.icon className="size-5 text-[#6B6B6B]" />
                  <h2 className="text-sm font-semibold text-[#0A0A0A]">
                    {mod.title}
                  </h2>
                  {!mod.live && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#F0F0F0] text-[#AAAAAA] rounded">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6B6B6B] leading-relaxed mb-3">
                  {mod.description}
                </p>
                {mod.live && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0A0A0A] group-hover:gap-1.5 transition-all">
                    Open
                    <ChevronRightIcon className="size-3" />
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
