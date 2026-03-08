"use client";

import { useState } from "react";
import {
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  services as allServices,
  serviceCategories,
  getPrice,
  formatGBP,
  type ClientTier,
} from "@/data/services";

const services = allServices.filter((s) => s.id !== "test-checkout");

const tiers: { tier: ClientTier; label: string; slug: string; description: string }[] = [
  {
    tier: 1,
    label: "Tier 1",
    slug: "tier-1",
    description: "Standard pricing for smaller brands and new clients",
  },
  {
    tier: 2,
    label: "Tier 2",
    slug: "tier-2",
    description: "Premium pricing for established brands and larger projects",
  },
];

export default function PriceListsPage() {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/pricing/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Price Lists
          </h1>
          <p className="text-[#6B6B6B]">
            Shareable pricing pages for clients. Each tier has its own link.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="space-y-4 mb-10">
          {tiers.map(({ tier, label, slug, description }) => {
            const isCopied = copiedSlug === slug;

            return (
              <div
                key={slug}
                className="bg-white border border-[#E5E5E5] rounded-lg p-5"
              >
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-[#0A0A0A]">
                    {label}
                  </h2>
                  <p className="text-sm text-[#6B6B6B] mt-0.5">
                    {description}
                  </p>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => copyLink(slug)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#0A0A0A] text-white rounded-lg hover:bg-[#2A2A2A] transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <CheckIcon className="size-4" />
                        Copied to clipboard!
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="size-4" />
                        Copy Share Link
                      </>
                    )}
                  </button>
                  <a
                    href={`/pricing/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-[#E5E5E5] rounded-lg text-[#0A0A0A] hover:bg-[#F5F5F5] transition-colors"
                  >
                    <ArrowTopRightOnSquareIcon className="size-4" />
                    Preview Page
                  </a>
                </div>

                {/* Quick price overview */}
                <div className="border-t border-[#F0F0F0] pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-2">
                    Price snapshot
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5">
                    {services
                      .filter((s) => !s.isAddOn)
                      .map((svc) => {
                        const mode = svc.modes[0];
                        const pricing = svc.pricing[mode];
                        if (!pricing) return null;
                        const tierPrice = getPrice(pricing, tier);
                        const isRecurring = !!pricing.interval;

                        return (
                          <div
                            key={svc.id}
                            className="flex items-baseline justify-between gap-2"
                          >
                            <span className="text-xs text-[#6B6B6B] truncate">
                              {svc.name}
                            </span>
                            <span className="text-xs font-semibold text-[#0A0A0A] tabular-nums shrink-0">
                              {formatGBP(tierPrice.amount)}
                              {isRecurring && (
                                <span className="font-normal text-[#AAAAAA]">
                                  /mo
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add-ons summary */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-3">
            Add-on Services
            <span className="ml-2 text-[10px] font-bold bg-[#F0F0F0] text-[#6B6B6B] px-1.5 py-0.5 rounded">
              {services.filter((s) => s.isAddOn).length}
            </span>
          </h2>
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg divide-y divide-[#E5E5E5]">
            {services
              .filter((s) => s.isAddOn)
              .map((svc) => {
                const mode = svc.modes[0];
                const pricing = svc.pricing[mode];
                if (!pricing) return null;
                const t1 = getPrice(pricing, 1);
                const t2 = getPrice(pricing, 2);

                return (
                  <div
                    key={svc.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-4"
                  >
                    <span className="text-xs text-[#6B6B6B] truncate">
                      {svc.name}
                    </span>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs tabular-nums text-[#AAAAAA]">
                        T1: <span className="font-semibold text-[#0A0A0A]">{formatGBP(t1.amount)}</span>
                      </span>
                      <span className="text-xs tabular-nums text-[#AAAAAA]">
                        T2: <span className="font-semibold text-[#0A0A0A]">{formatGBP(t2.amount)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
