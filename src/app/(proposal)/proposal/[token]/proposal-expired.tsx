"use client";

import { LogoMark } from "@/components/logo";

type ExpiredReason = "not-found" | "expired" | "converted";

const content: Record<
  ExpiredReason,
  { title: string; description: (name?: string) => string }
> = {
  "not-found": {
    title: "Proposal Not Found",
    description: () =>
      "This proposal link is invalid or has been removed. If you believe this is an error, please get in touch with your Ecomlanders contact.",
  },
  expired: {
    title: "Proposal Expired",
    description: (name) =>
      `Hi${name ? ` ${name}` : ""}, this proposal has expired. Please contact your Ecomlanders account manager for a fresh link.`,
  },
  converted: {
    title: "Already Completed",
    description: (name) =>
      `Hi${name ? ` ${name}` : ""}, this proposal has already been completed. We'll be in touch shortly with your next steps!`,
  },
};

export function ProposalExpired({
  reason,
  clientName,
}: {
  reason: ExpiredReason;
  clientName?: string;
}) {
  const { title, description } = content[reason];

  return (
    <div className="flex flex-col items-center justify-center py-24 md:py-32 px-6 text-center">
      <div className="mb-6 p-4 bg-[#F5F5F5] rounded-full">
        <LogoMark size={32} className="text-[#CCCCCC]" />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 text-[#0A0A0A]">
        {title}
      </h1>
      <p className="text-base text-[#6B6B6B] max-w-md leading-relaxed">
        {description(clientName)}
      </p>
      <a
        href="https://ecomlanders.com"
        className="mt-8 text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
      >
        Visit ecomlanders.com &rarr;
      </a>
    </div>
  );
}
