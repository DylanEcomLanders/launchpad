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
  getPrice,
  formatGBP,
} from "@/data/services";

const services = allServices.filter((s) => s.id !== "test-checkout");

export default function PriceListsPage() {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    const url = `${window.location.origin}/pricing`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-[28px] leading-tight font-bold text-[#E5E5EA]">
            Price List
          </h1>
          <p className="text-[#71757D]">
            Shareable pricing page for clients.
          </p>
        </div>

        {/* Single share card */}
        <div className="bg-[#181818] border border-[#2A2A2A] rounded-lg p-5 mb-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#E5E5EA]">
              /pricing
            </h2>
            <p className="text-sm text-[#71757D] mt-0.5">
              Public pricing page — services, retainer-paired discounts, and live totals.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white text-[#0C0C0C] rounded-lg hover:bg-[#F3F4F6] transition-colors"
            >
              {copied ? (
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
              href="/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-[#2A2A2A] rounded-lg text-[#E5E5EA] hover:bg-[#222222] transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="size-4" />
              Preview Page
            </a>
          </div>

          {/* Quick price overview */}
          <div className="border-t border-[#2A2A2A] pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-2">
              Price snapshot
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5">
              {services
                .filter((s) => !s.isAddOn)
                .map((svc) => {
                  const mode = svc.modes[0];
                  const pricing = svc.pricing[mode];
                  if (!pricing) return null;
                  const tierPrice = getPrice(pricing);
                  const isRecurring = !!pricing.interval;

                  return (
                    <div
                      key={svc.id}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <span className="text-xs text-[#71757D] truncate">
                        {svc.name}
                      </span>
                      <span className="text-xs font-semibold text-[#E5E5EA] tabular-nums shrink-0">
                        {formatGBP(tierPrice.amount)}
                        {isRecurring && (
                          <span className="font-normal text-[#71757D]">
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

        {/* Add-ons summary */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71757D] mb-3">
            Add-on Services
            <span className="ml-2 text-[10px] font-bold bg-[#222222] text-[#71757D] px-1.5 py-0.5 rounded">
              {services.filter((s) => s.isAddOn).length}
            </span>
          </h2>
          <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg divide-y divide-[#2A2A2A]">
            {services
              .filter((s) => s.isAddOn)
              .map((svc) => {
                const mode = svc.modes[0];
                const pricing = svc.pricing[mode];
                if (!pricing) return null;
                const tierPrice = getPrice(pricing);
                const hasUnit = svc.unitLabel && svc.minQuantity;
                const hasVolume = svc.volumeDiscounts && svc.volumeDiscounts.length > 0;

                return (
                  <div key={svc.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-[#71757D] truncate">
                        {svc.name}
                        {hasUnit && (
                          <span className="text-[10px] text-[#71757D] ml-1">
                            (min {svc.minQuantity})
                          </span>
                        )}
                      </span>
                      <span className="text-xs tabular-nums text-[#71757D]">
                        <span className="font-semibold text-[#E5E5EA]">{tierPrice.label}</span>
                      </span>
                    </div>
                    {hasVolume && (
                      <div className="flex items-center gap-3 mt-1 ml-0 flex-wrap">
                        {svc.volumeDiscounts!.map((vd) => (
                          <span key={vd.minQty} className="text-[10px] text-[#71757D]">
                            {vd.minQty}+: <span className="font-semibold text-[#15803D]">{vd.label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
