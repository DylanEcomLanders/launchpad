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
          <h1 className="text-[28px] leading-tight font-bold text-foreground">
            Price List
          </h1>
          <p className="text-subtle">
            Shareable pricing page for clients.
          </p>
        </div>

        {/* Single share card */}
        <div className="bg-surface border border-border rounded-lg p-5 mb-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              /pricing
            </h2>
            <p className="text-sm text-subtle mt-0.5">
              Public pricing page — services, retainer-paired discounts, and live totals.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white text-background rounded-lg hover:bg-foreground transition-colors"
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-border rounded-lg text-foreground hover:bg-surface-raised transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="size-4" />
              Preview Page
            </a>
          </div>

          {/* Quick price overview */}
          <div className="border-t border-border pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">
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
                      <span className="text-xs text-subtle truncate">
                        {svc.name}
                      </span>
                      <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                        {formatGBP(tierPrice.amount)}
                        {isRecurring && (
                          <span className="font-normal text-subtle">
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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3">
            Add-on Services
            <span className="ml-2 text-[10px] font-bold bg-surface-raised text-subtle px-1.5 py-0.5 rounded">
              {services.filter((s) => s.isAddOn).length}
            </span>
          </h2>
          <div className="bg-background border border-border rounded-lg divide-y divide-border">
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
                      <span className="text-xs text-subtle truncate">
                        {svc.name}
                        {hasUnit && (
                          <span className="text-[10px] text-subtle ml-1">
                            (min {svc.minQuantity})
                          </span>
                        )}
                      </span>
                      <span className="text-xs tabular-nums text-subtle">
                        <span className="font-semibold text-foreground">{tierPrice.label}</span>
                      </span>
                    </div>
                    {hasVolume && (
                      <div className="flex items-center gap-3 mt-1 ml-0 flex-wrap">
                        {svc.volumeDiscounts!.map((vd) => (
                          <span key={vd.minQty} className="text-[10px] text-subtle">
                            {vd.minQty}+: <span className="font-semibold text-success">{vd.label}</span>
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
