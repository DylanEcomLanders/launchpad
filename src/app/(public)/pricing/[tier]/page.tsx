"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { CheckIcon, SparklesIcon, PlusIcon, MinusIcon } from "@heroicons/react/24/solid";
import { Logo } from "@/components/logo";
import {
  services as allServices,
  serviceCategories,
  retainerBuildDiscount,
  getPrice,
  getUnitPriceForQuantity,
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

// Track which services are selected + their quantity (for per-unit services)
type SelectionMap = Record<string, number>; // id → quantity

export default function PricingPage() {
  const params = useParams();
  const tier = parseTier(params.tier as string);
  const [selections, setSelections] = useState<SelectionMap>({});

  if (!tier) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#A0A0A0]">Invalid pricing tier</p>
      </div>
    );
  }

  // Backwards-compatible set for simple checks
  const selected = new Set(Object.keys(selections));

  const toggle = (id: string) => {
    setSelections((prev) => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const svc = services.find((s) => s.id === id);
      return { ...prev, [id]: svc?.minQuantity ?? 1 };
    });
  };

  const setQuantity = (id: string, qty: number) => {
    setSelections((prev) => ({ ...prev, [id]: qty }));
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
      const items: { service: ServiceOption; price: number; quantity: number; isRecurring: boolean; originalPrice?: number; volumeSaving?: number }[] = [];

      for (const [id, qty] of Object.entries(selections)) {
        const svc = services.find((s) => s.id === id);
        if (!svc) continue;

        const mode = svc.modes[0];
        const pricing = svc.pricing[mode];
        if (!pricing) continue;

        const tierPrice = getPrice(pricing, tier);
        let baseUnitAmount = tierPrice.amount;
        let unitAmount = baseUnitAmount;
        let originalUnit: number | undefined;
        const isRecurring = !!pricing.interval;

        // Apply volume discounts for per-unit services
        const volumeResult = getUnitPriceForQuantity(svc, baseUnitAmount, qty);
        if (volumeResult.discounted) {
          unitAmount = volumeResult.amount;
        }

        // Track volume saving (base vs discounted, before retainer)
        const volumeSaving = volumeResult.discounted ? (baseUnitAmount - unitAmount) * qty : 0;

        // Apply retainer discount to builds
        if (svc.category === "builds" && activeRetainerDiscount > 0) {
          originalUnit = unitAmount;
          unitAmount = Math.round(unitAmount * (1 - activeRetainerDiscount));
          discount += (originalUnit - unitAmount) * qty;
        }

        const lineTotal = unitAmount * qty;

        if (isRecurring) {
          recurring += lineTotal;
        } else {
          oneOff += lineTotal;
        }

        items.push({
          service: svc,
          price: lineTotal,
          quantity: qty,
          isRecurring,
          originalPrice: originalUnit ? originalUnit * qty : undefined,
          volumeSaving,
        });
      }

      return { oneOffTotal: oneOff, recurringTotal: recurring, totalDiscount: discount, selectedItems: items };
    }, [selections, tier, activeRetainerDiscount]);

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
        <Logo height={16} className="text-[#1B1B1B]" />
      </header>

      <div className="px-6 md:px-12 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
          Pricing &amp; Packages
        </h1>
        <p className="text-sm text-[#7A7A7A]">
          Choose your services, get your price.
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
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
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
                            ? "border-[#1B1B1B] bg-[#F7F8FA]"
                            : "border-[#E5E5EA] bg-white hover:border-[#C5C5C5]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-[#1B1B1B]">
                              {svc.name}
                            </h3>
                            {svc.recommended && (
                              <span className="flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide bg-[#1B1B1B] text-white px-1.5 py-0.5 rounded">
                                <SparklesIcon className="size-2.5" />
                                Popular
                              </span>
                            )}
                          </div>
                          <div
                            className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[#1B1B1B] border-[#1B1B1B]"
                                : "border-[#E5E5EA]"
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
                              <span className="text-lg font-bold text-[#1B1B1B] tabular-nums">
                                {formatGBP(displayPrice)}
                                {isRecurring && <span className="text-sm font-normal text-[#7A7A7A]">/mo</span>}
                              </span>
                              <span className="text-sm line-through text-[#A0A0A0] tabular-nums">
                                {formatGBP(originalPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-[#1B1B1B] tabular-nums">
                              {formatGBP(displayPrice)}
                              {isRecurring && <span className="text-sm font-normal text-[#7A7A7A]">/mo</span>}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#7A7A7A] mb-3">
                          {svc.description}
                        </p>

                        {svc.features.length > 0 && (
                          <ul className="space-y-1.5">
                            {svc.features.map((f, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-xs text-[#7A7A7A]"
                              >
                                <CheckIcon className="size-3 text-[#1B1B1B] mt-0.5 shrink-0" />
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
              {serviceCategories["additional"]}
            </h2>
            <div className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg divide-y divide-[#E5E5EA]">
              {addOnServices.map((svc) => {
                const mode = svc.modes[0];
                const pricing = svc.pricing[mode];
                if (!pricing) return null;
                const tierPrice = getPrice(pricing, tier);
                const isSelected = selected.has(svc.id);
                const hasQuantity = svc.maxQuantity && svc.maxQuantity > 1;
                const minQty = svc.minQuantity ?? 1;
                const qty = selections[svc.id] ?? minQty;

                return (
                  <div
                    key={svc.id}
                    className={`transition-colors ${isSelected ? "bg-white" : "hover:bg-white/60"}`}
                  >
                    <button
                      onClick={() => toggle(svc.id)}
                      className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`size-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[#1B1B1B] border-[#1B1B1B]"
                              : "border-[#C5C5C5]"
                          }`}
                        >
                          {isSelected && (
                            <CheckIcon className="size-2.5 text-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-[#1B1B1B] block truncate">
                            {svc.name}
                          </span>
                          {svc.description && (
                            <span className="text-xs text-[#A0A0A0] block truncate">
                              {svc.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-[#1B1B1B] tabular-nums shrink-0">
                        {tierPrice.label}
                      </span>
                    </button>

                    {/* Volume discount tiers preview */}
                    {!isSelected && svc.volumeDiscounts && svc.volumeDiscounts.length > 0 && (
                      <div className="px-5 pb-2 ml-7 flex items-center gap-3 flex-wrap">
                        {svc.volumeDiscounts.map((vd) => (
                          <span key={vd.minQty} className="text-[10px] text-[#A0A0A0]">
                            {vd.minQty}+: <span className="font-semibold text-[#15803D]">{vd.label}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quantity stepper for per-unit services */}
                    {isSelected && hasQuantity && (() => {
                      const volResult = getUnitPriceForQuantity(svc, tierPrice.amount, qty);
                      const effectiveUnit = volResult.discounted ? volResult.amount : tierPrice.amount;
                      const effectiveLabel = volResult.discounted ? volResult.label : tierPrice.label;
                      const lineTotal = effectiveUnit * qty;
                      const baseLine = tierPrice.amount * qty;
                      const saving = baseLine - lineTotal;

                      return (
                        <div className="px-5 pb-3.5 ml-7 space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium text-[#7A7A7A]">Qty:</span>
                              <div className="inline-flex items-center rounded-md border border-[#E5E5EA] bg-white">
                                <button
                                  onClick={() => setQuantity(svc.id, Math.max(minQty, qty - 1))}
                                  disabled={qty <= minQty}
                                  className="px-2 py-1 text-[#7A7A7A] hover:text-[#1B1B1B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <MinusIcon className="size-3" />
                                </button>
                                <span className="px-3 py-1 text-sm font-semibold tabular-nums border-x border-[#E5E5EA]">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => setQuantity(svc.id, Math.min(svc.maxQuantity!, qty + 1))}
                                  disabled={qty >= svc.maxQuantity!}
                                  className="px-2 py-1 text-[#7A7A7A] hover:text-[#1B1B1B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <PlusIcon className="size-3" />
                                </button>
                              </div>
                              {minQty > 1 && (
                                <span className="text-[10px] text-[#A0A0A0]">min {minQty}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-[#1B1B1B] tabular-nums">
                                {qty} &times; {effectiveLabel || tierPrice.label} = {formatGBP(lineTotal)}
                              </span>
                              {saving > 0 && (
                                <span className="block text-[10px] font-medium text-[#15803D]">
                                  Saving {formatGBP(saving)}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Next discount tier nudge */}
                          {volResult.nextTier && (
                            <p className="text-[10px] text-[#A0A0A0] ml-10">
                              Order {volResult.nextTier.minQty}+ for {volResult.nextTier.label}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Persistent Sticky Summary Bar — always visible */}
      <div className="sticky bottom-0 bg-white border-t border-[#E5E5EA] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="px-6 md:px-12 py-4">
          {hasSelection ? (
            <>
              {/* Line items */}
              <div className="max-h-[30vh] overflow-y-auto space-y-1.5 mb-3">
                {selectedItems.map(({ service, price, quantity, isRecurring, originalPrice, volumeSaving }) => (
                  <div key={service.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#7A7A7A]">
                        {service.name}
                        {quantity > 1 && <span className="text-[#A0A0A0]"> &times;{quantity}</span>}
                      </span>
                      <div className="flex items-baseline gap-2">
                        {originalPrice && (
                          <span className="text-xs line-through text-[#A0A0A0] tabular-nums">
                            {formatGBP(originalPrice)}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-[#1B1B1B] tabular-nums">
                          {formatGBP(price)}
                          {isRecurring && "/mo"}
                        </span>
                      </div>
                    </div>
                    {(volumeSaving ?? 0) > 0 && (
                      <p className="text-[10px] font-medium text-[#15803D] text-right">
                        Volume discount: -{formatGBP(volumeSaving!)}
                      </p>
                    )}
                  </div>
                ))}
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-xs text-[#15803D]">
                    <span>Retainer discount</span>
                    <span className="font-semibold">-{formatGBP(totalDiscount)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="border-t border-[#E5E5EA] pt-3 flex items-center justify-between">
                <span className="text-xs font-medium text-[#7A7A7A]">
                  {selected.size} {selected.size === 1 ? "service" : "services"} selected
                </span>
                <div className="flex items-baseline gap-4">
                  {oneOffTotal > 0 && (
                    <span className="text-lg font-bold text-[#1B1B1B] tabular-nums">
                      {formatGBP(oneOffTotal)}
                    </span>
                  )}
                  {recurringTotal > 0 && (
                    <span className="text-lg font-bold text-[#1B1B1B] tabular-nums">
                      {formatGBP(recurringTotal)}
                      <span className="text-sm font-normal text-[#7A7A7A]">/mo</span>
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A0A0A0]">
                Select services above to build your package
              </span>
              <span className="text-lg font-bold text-[#A0A0A0] tabular-nums">
                {formatGBP(0)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#EDEDEF] px-6 md:px-12 py-6 text-center mt-auto">
        <p className="text-xs text-[#A0A0A0]">
          Built by{" "}
          <a
            href="https://ecomlanders.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            Ecomlanders
          </a>
        </p>
      </footer>
    </div>
  );
}
