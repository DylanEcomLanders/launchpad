"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { CheckIcon, SparklesIcon } from "@heroicons/react/24/solid";
import { Logo } from "@/components/logo";
import {
  services as allServices,
  serviceCategories,
  retainerBuildDiscount,
  getPrice,
  formatGBP,
  type ServiceOption,
  type ClientTier,
} from "@/data/services";

/* ── Resolve tier from URL param ─────────────────────────────── */

function parseTier(param: string): ClientTier | null {
  if (param === "tier-1") return 1;
  if (param === "tier-2") return 2;
  return null;
}

/* ── Filtered services (exclude test items) ──────────────────── */

const services = allServices.filter((s) => s.id !== "test-checkout");
const mainServices = services.filter((s) => !s.isAddOn);
const addOnServices = services.filter((s) => s.isAddOn);

const categoryOrder = ["builds", "cro", "additional"] as const;

/* ── Component ───────────────────────────────────────────────── */

export default function PricingPage() {
  const params = useParams();
  const tier = parseTier(params.tier as string);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!tier) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#AAAAAA]">Invalid pricing tier</p>
      </div>
    );
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Retainer discount ─────────────────────────────────────── */

  const activeRetainerDiscount = useMemo(() => {
    let best = 0;
    for (const id of selected) {
      const d = retainerBuildDiscount[id];
      if (d && d > best) best = d;
    }
    return best;
  }, [selected]);

  const activeRetainerName = useMemo(() => {
    if (activeRetainerDiscount === 0) return null;
    for (const id of selected) {
      if (retainerBuildDiscount[id] === activeRetainerDiscount) {
        return services.find((s) => s.id === id)?.name ?? null;
      }
    }
    return null;
  }, [selected, activeRetainerDiscount]);

  /* ── Totals ────────────────────────────────────────────────── */

  const { oneOffTotal, recurringTotal, totalDiscount, selectedItems } =
    useMemo(() => {
      let oneOff = 0;
      let recurring = 0;
      let discount = 0;
      const items: { service: ServiceOption; price: number; isRecurring: boolean; originalPrice?: number }[] = [];

      for (const id of selected) {
        const svc = services.find((s) => s.id === id);
        if (!svc) continue;

        const mode = svc.modes[0];
        const pricing = svc.pricing[mode];
        if (!pricing) continue;

        const tierPrice = getPrice(pricing, tier);
        let amount = tierPrice.amount;
        let originalAmount: number | undefined;
        const isRecurring = !!pricing.interval;

        // Apply retainer discount to builds
        if (svc.category === "builds" && activeRetainerDiscount > 0) {
          originalAmount = amount;
          amount = Math.round(amount * (1 - activeRetainerDiscount));
          discount += originalAmount - amount;
        }

        if (isRecurring) {
          recurring += amount;
        } else {
          oneOff += amount;
        }

        items.push({ service: svc, price: amount, isRecurring, originalPrice: originalAmount });
      }

      return { oneOffTotal: oneOff, recurringTotal: recurring, totalDiscount: discount, selectedItems: items };
    }, [selected, tier, activeRetainerDiscount]);

  const hasSelection = selected.size > 0;

  /* ── Grouped services ──────────────────────────────────────── */

  const grouped = useMemo(() => {
    const cats: Record<string, ServiceOption[]> = {};
    for (const s of mainServices) {
      if (!cats[s.category]) cats[s.category] = [];
      cats[s.category].push(s);
    }
    return cats;
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 md:px-12 py-5">
        <Logo height={16} className="text-[#0A0A0A]" />
      </header>

      <div className="px-6 md:px-12 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
          Pricing &amp; Packages
        </h1>
        <p className="text-sm text-[#6B6B6B]">
          Shopify CRO &amp; landing page services by Ecomlanders
        </p>
      </div>

      {/* Retainer discount banner */}
      {activeRetainerDiscount > 0 && (
        <div className="mx-6 md:mx-12 mb-6 px-4 py-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
          <p className="text-sm text-[#15803D]">
            <strong>{Math.round(activeRetainerDiscount * 100)}% discount</strong>{" "}
            applied to page builds with {activeRetainerName}
            {totalDiscount > 0 && (
              <span className="ml-1">— saving {formatGBP(totalDiscount)}</span>
            )}
          </p>
        </div>
      )}

      {/* Service Categories */}
      <div className="px-6 md:px-12 space-y-10 pb-8">
        {categoryOrder
          .filter((cat) => cat !== "additional")
          .map((cat) => {
            const items = grouped[cat];
            if (!items?.length) return null;
            return (
              <section key={cat}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-4">
                  {serviceCategories[cat]}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((svc) => {
                    const mode = svc.modes[0];
                    const pricing = svc.pricing[mode];
                    if (!pricing) return null;
                    const tierPrice = getPrice(pricing, tier);
                    const isSelected = selected.has(svc.id);
                    const isRecurring = !!pricing.interval;

                    // Discounted price for builds
                    let displayPrice = tierPrice.amount;
                    let originalPrice: number | undefined;
                    if (svc.category === "builds" && activeRetainerDiscount > 0) {
                      originalPrice = displayPrice;
                      displayPrice = Math.round(displayPrice * (1 - activeRetainerDiscount));
                    }

                    return (
                      <button
                        key={svc.id}
                        onClick={() => toggle(svc.id)}
                        className={`text-left p-5 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-[#0A0A0A] bg-[#FAFAFA]"
                            : "border-[#E5E5E5] bg-white hover:border-[#CCCCCC]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-[#0A0A0A]">
                              {svc.name}
                            </h3>
                            {svc.recommended && (
                              <span className="flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide bg-[#0A0A0A] text-white px-1.5 py-0.5 rounded">
                                <SparklesIcon className="size-2.5" />
                                Popular
                              </span>
                            )}
                          </div>
                          <div
                            className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[#0A0A0A] border-[#0A0A0A]"
                                : "border-[#E5E5E5]"
                            }`}
                          >
                            {isSelected && (
                              <CheckIcon className="size-3 text-white" />
                            )}
                          </div>
                        </div>

                        <div className="mb-3">
                          {originalPrice ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold text-[#0A0A0A] tabular-nums">
                                {formatGBP(displayPrice)}
                                {isRecurring && <span className="text-sm font-normal text-[#6B6B6B]">/mo</span>}
                              </span>
                              <span className="text-sm line-through text-[#AAAAAA] tabular-nums">
                                {formatGBP(originalPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-[#0A0A0A] tabular-nums">
                              {formatGBP(displayPrice)}
                              {isRecurring && <span className="text-sm font-normal text-[#6B6B6B]">/mo</span>}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#6B6B6B] mb-3">
                          {svc.description}
                        </p>

                        {svc.features.length > 0 && (
                          <ul className="space-y-1.5">
                            {svc.features.map((f, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-xs text-[#6B6B6B]"
                              >
                                <CheckIcon className="size-3 text-[#0A0A0A] mt-0.5 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

        {/* Add-on Services */}
        {addOnServices.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-4">
              {serviceCategories["additional"]}
            </h2>
            <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg divide-y divide-[#E5E5E5]">
              {addOnServices.map((svc) => {
                const mode = svc.modes[0];
                const pricing = svc.pricing[mode];
                if (!pricing) return null;
                const tierPrice = getPrice(pricing, tier);
                const isSelected = selected.has(svc.id);

                return (
                  <button
                    key={svc.id}
                    onClick={() => toggle(svc.id)}
                    className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-4 transition-colors ${
                      isSelected ? "bg-white" : "hover:bg-white/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`size-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#0A0A0A] border-[#0A0A0A]"
                            : "border-[#CCCCCC]"
                        }`}
                      >
                        {isSelected && (
                          <CheckIcon className="size-2.5 text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-[#0A0A0A] block truncate">
                          {svc.name}
                        </span>
                        {svc.description && (
                          <span className="text-xs text-[#AAAAAA] block truncate">
                            {svc.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#0A0A0A] tabular-nums shrink-0">
                      {formatGBP(tierPrice.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Summary Bar */}
      {hasSelection && (
        <div className="sticky bottom-0 bg-white border-t border-[#E5E5E5] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="px-6 md:px-12 py-4">
            {/* Expandable line items */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="text-xs font-medium text-[#6B6B6B]">
                  {selected.size} {selected.size === 1 ? "service" : "services"} selected
                </span>
                <div className="flex items-baseline gap-4">
                  {oneOffTotal > 0 && (
                    <span className="text-lg font-bold text-[#0A0A0A] tabular-nums">
                      {formatGBP(oneOffTotal)}
                    </span>
                  )}
                  {recurringTotal > 0 && (
                    <span className="text-lg font-bold text-[#0A0A0A] tabular-nums">
                      {formatGBP(recurringTotal)}
                      <span className="text-sm font-normal text-[#6B6B6B]">/mo</span>
                    </span>
                  )}
                </div>
              </summary>

              <div className="mt-3 pt-3 border-t border-[#E5E5E5] space-y-2">
                {selectedItems.map(({ service, price, isRecurring, originalPrice }) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <span className="text-xs text-[#6B6B6B]">{service.name}</span>
                    <div className="flex items-baseline gap-2">
                      {originalPrice && (
                        <span className="text-xs line-through text-[#AAAAAA] tabular-nums">
                          {formatGBP(originalPrice)}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-[#0A0A0A] tabular-nums">
                        {formatGBP(price)}
                        {isRecurring && "/mo"}
                      </span>
                    </div>
                  </div>
                ))}
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-xs text-[#15803D]">
                    <span>Retainer discount</span>
                    <span className="font-semibold">-{formatGBP(totalDiscount)}</span>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#F0F0F0] px-6 md:px-12 py-6 text-center mt-auto">
        <p className="text-xs text-[#AAAAAA]">
          Built by{" "}
          <a
            href="https://ecomlanders.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
          >
            Ecomlanders
          </a>
        </p>
      </footer>
    </div>
  );
}
