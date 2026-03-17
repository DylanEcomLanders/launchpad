"use client";

import { useState, useMemo } from "react";
import {
  CheckCircleIcon,
  SparklesIcon,
  ShoppingCartIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  ChevronRightIcon,
  TagIcon,
} from "@heroicons/react/24/solid";
import {
  type ServiceOption,
  type ServiceMode,
  type ClientTier,
  serviceCategories,
  retainerBuildDiscount,
  getPrice,
  getUnitPriceForQuantity,
  formatGBP,
} from "@/data/services";
import type { Proposal } from "@/lib/proposal-types";

// ── Types ───────────────────────────────────────────────────────

interface Selection {
  mode: ServiceMode;
  quantity: number;
}

type Selections = Record<string, Selection>;

interface SelectedItem {
  service: ServiceOption;
  sel: Selection;
  lineTotal: number;
  baseLineTotal: number; // before discount
  discount: number; // 0–1
}

// ── Component ───────────────────────────────────────────────────

export function ProposalBuilder({
  proposal,
  services,
}: {
  proposal: Proposal;
  services: ServiceOption[];
}) {
  const [selections, setSelections] = useState<Selections>({});
  const [clientEmail, setClientEmail] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Resolve tier — default to 1 for legacy proposals without tier
  const tier: ClientTier = (proposal.tier ?? 1) as ClientTier;

  // Split services into main and add-ons
  const mainServices = services.filter((s) => !s.isAddOn);
  const addOnServices = services.filter((s) => s.isAddOn);

  // Group main services by category
  const grouped = useMemo(() => {
    const cats: Record<string, ServiceOption[]> = {};
    for (const s of mainServices) {
      if (!cats[s.category]) cats[s.category] = [];
      cats[s.category].push(s);
    }
    return cats;
  }, [mainServices]);

  // ── Retainer discount on builds ───────────────────────────
  const activeRetainerDiscount = useMemo(() => {
    let best = 0;
    for (const id of Object.keys(selections)) {
      const d = retainerBuildDiscount[id];
      if (d && d > best) best = d;
    }
    return best;
  }, [selections]);

  const activeRetainerName = useMemo(() => {
    if (activeRetainerDiscount === 0) return null;
    for (const id of Object.keys(selections)) {
      if (retainerBuildDiscount[id] === activeRetainerDiscount) {
        return services.find((s) => s.id === id)?.name ?? null;
      }
    }
    return null;
  }, [selections, services, activeRetainerDiscount]);

  // Calculate totals
  const selectedItems: SelectedItem[] = useMemo(() => {
    return Object.entries(selections).map(([id, sel]) => {
      const service = services.find((s) => s.id === id)!;
      const pricing = service.pricing[sel.mode];
      const tierPrice = pricing ? getPrice(pricing, tier) : null;
      let baseAmount = tierPrice?.amount ?? 0;

      // Apply volume discounts for per-unit services
      const volumeResult = getUnitPriceForQuantity(service, baseAmount, sel.quantity);
      if (volumeResult.discounted) {
        baseAmount = volumeResult.amount;
      }

      // Apply retainer discount to build services
      const discount =
        service.category === "builds" && activeRetainerDiscount > 0
          ? activeRetainerDiscount
          : 0;
      const amount =
        discount > 0 ? Math.round(baseAmount * (1 - discount)) : baseAmount;

      const lineTotal = amount * sel.quantity;
      const baseLineTotal = (tierPrice?.amount ?? 0) * sel.quantity; // always use original base for savings display
      return { service, sel, lineTotal, baseLineTotal, discount };
    });
  }, [selections, services, tier, activeRetainerDiscount]);

  const totalPence = selectedItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const hasRetainer = selectedItems.some((i) => i.sel.mode === "retainer");
  const itemCount = selectedItems.length;

  // ── Handlers ────────────────────────────────────────────────

  function toggleService(service: ServiceOption) {
    setSelections((prev) => {
      if (prev[service.id]) {
        const next = { ...prev };
        delete next[service.id];
        return next;
      }
      return {
        ...prev,
        [service.id]: {
          mode: service.modes[0],
          quantity: service.minQuantity ?? 1,
        },
      };
    });
  }

  function setMode(serviceId: string, mode: ServiceMode) {
    setSelections((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], mode },
    }));
  }

  function setQuantity(serviceId: string, qty: number) {
    setSelections((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], quantity: qty },
    }));
  }

  async function handleProceed() {
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const payload = {
        selections: Object.entries(selections).map(([serviceId, sel]) => ({
          serviceId,
          mode: sel.mode,
          quantity: sel.quantity,
        })),
        proposalToken: proposal.token,
        clientName: proposal.client_name,
        clientEmail: clientEmail.trim() || undefined,
        tier,
      };

      const res = await fetch("/api/proposals/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.invoiceUrl) {
        throw new Error(data.error || "Something went wrong");
      }

      // Redirect to checkout
      window.location.href = data.invoiceUrl;
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Failed to create checkout"
      );
      setCheckoutLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-16">
      {/* Greeting */}
      <div className="mb-12 md:mb-16">
        <p className="text-sm font-medium text-[#2563EB] mb-2 uppercase tracking-wider">
          Build Your Package
        </p>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#1B1B1B] mb-3">
          Hey {proposal.client_name}
        </h1>
        <p className="text-base md:text-lg text-[#7A7A7A] max-w-2xl">
          Choose your services, get your price.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
          <span className="text-sm font-medium text-[#1E40AF]">
            Pair a retainer with any build and save 10–15% on build costs
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Left: Service cards */}
        <div className="flex-1 min-w-0">
          {/* Main services by category */}
          {Object.entries(grouped).map(([cat, svcs]) => (
            <div key={cat} className="mb-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-4">
                {serviceCategories[cat] || cat}
              </h2>

              {/* Retainer discount banner — show above builds when retainer is active */}
              {cat === "builds" && activeRetainerDiscount > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
                  <TagIcon className="size-4 text-[#15803D] shrink-0" />
                  <span className="text-sm text-[#15803D]">
                    <strong>
                      {Math.round(activeRetainerDiscount * 100)}% retainer
                      discount
                    </strong>{" "}
                    applied to all page builds
                    {activeRetainerName && (
                      <span className="text-[#6B9F6B]">
                        {" "}
                        — with {activeRetainerName}
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {svcs.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    tier={tier}
                    buildDiscount={
                      service.category === "builds"
                        ? activeRetainerDiscount
                        : 0
                    }
                    selection={selections[service.id]}
                    onToggle={() => toggleService(service)}
                    onSetMode={(m) => setMode(service.id, m)}
                    onSetQuantity={(q) => setQuantity(service.id, q)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Add-ons */}
          {addOnServices.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Additional Services
              </h2>
              <p className="text-xs text-[#C5C5C5] mb-4">
                Bolt onto any project or retainer to extend output without
                adding overhead.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addOnServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    tier={tier}
                    buildDiscount={0}
                    selection={selections[service.id]}
                    onToggle={() => toggleService(service)}
                    onSetMode={(m) => setMode(service.id, m)}
                    onSetQuantity={(q) => setQuantity(service.id, q)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Order summary (sticky on desktop) */}
        <div className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-8">
            <OrderSummary
              items={selectedItems}
              totalPence={totalPence}
              hasRetainer={hasRetainer}
              retainerDiscount={activeRetainerDiscount}
              loading={checkoutLoading}
              error={checkoutError}
              clientEmail={clientEmail}
              onEmailChange={setClientEmail}
              onRemove={(id) =>
                toggleService(services.find((s) => s.id === id)!)
              }
              onProceed={handleProceed}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Persistent summary bar */}
      {itemCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5EA] z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          {/* Scrollable item list */}
          <div className="max-h-[30vh] overflow-y-auto px-4 pt-3 pb-2 space-y-1.5">
            {selectedItems.map(({ service, sel, lineTotal, baseLineTotal, discount }) => (
              <div
                key={service.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-[#1B1B1B] truncate mr-3">
                  {service.name}
                  {sel.quantity > 1 && (
                    <span className="text-[#A0A0A0]"> &times;{sel.quantity}</span>
                  )}
                </span>
                {discount > 0 ? (
                  <span className="text-[#15803D] font-semibold tabular-nums shrink-0">
                    {formatGBP(lineTotal)}
                  </span>
                ) : (
                  <span className="font-semibold tabular-nums shrink-0">
                    {formatGBP(lineTotal)}
                  </span>
                )}
              </div>
            ))}
            {/* Savings */}
            {(() => {
              const totalSaved = selectedItems.reduce(
                (sum, i) => sum + (i.baseLineTotal - i.lineTotal),
                0
              );
              return totalSaved > 0 ? (
                <div className="flex items-center gap-1.5 text-[10px] text-[#15803D] font-medium pt-1">
                  <TagIcon className="size-3 shrink-0" />
                  Saving {formatGBP(totalSaved)}
                </div>
              ) : null;
            })()}
          </div>

          {/* Total + CTA */}
          <div className="px-4 pb-4 pt-2 border-t border-[#EDEDEF]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold text-[#1B1B1B]">Total</span>
              <span className="text-lg font-bold text-[#1B1B1B]">{formatGBP(totalPence)}</span>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#2563EB] text-white rounded-lg font-medium text-sm hover:bg-[#1D4ED8] transition-colors"
            >
              <ShoppingCartIcon className="size-4" />
              Proceed to Checkout
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto animate-slideUp">
            <div className="flex items-center justify-between p-4 border-b border-[#EDEDEF]">
              <h3 className="text-sm font-semibold">Order Summary</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 hover:bg-[#F3F3F5] rounded-md"
              >
                <XMarkIcon className="size-4" />
              </button>
            </div>
            <div className="p-4">
              <OrderSummary
                items={selectedItems}
                totalPence={totalPence}
                hasRetainer={hasRetainer}
                retainerDiscount={activeRetainerDiscount}
                loading={checkoutLoading}
                error={checkoutError}
                clientEmail={clientEmail}
                onEmailChange={setClientEmail}
                onRemove={(id) =>
                  toggleService(services.find((s) => s.id === id)!)
                }
                onProceed={() => {
                  setDrawerOpen(false);
                  handleProceed();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacer for mobile persistent summary bar */}
      {itemCount > 0 && <div className="lg:hidden h-48" />}
    </div>
  );
}

// ── Service Card ────────────────────────────────────────────────

function ServiceCard({
  service,
  tier,
  buildDiscount,
  selection,
  onToggle,
  onSetMode,
  onSetQuantity,
}: {
  service: ServiceOption;
  tier: ClientTier;
  buildDiscount: number;
  selection?: Selection;
  onToggle: () => void;
  onSetMode: (mode: ServiceMode) => void;
  onSetQuantity: (qty: number) => void;
}) {
  const isSelected = !!selection;
  const activeMode = selection?.mode ?? service.modes[0];
  const pricing = service.pricing[activeMode];
  const tierPrice = pricing ? getPrice(pricing, tier) : null;
  const hasBothModes = service.modes.length > 1;

  // Discount
  const hasDiscount = buildDiscount > 0 && tierPrice;
  const discountedAmount = hasDiscount
    ? Math.round(tierPrice!.amount * (1 - buildDiscount))
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onToggle();
      }}
      className={`relative rounded-lg border-2 p-5 transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-[#2563EB] bg-[#EFF6FF] shadow-sm"
          : "border-[#E5E5EA] bg-white hover:border-[#C5C5C5] hover:shadow-sm"
      }`}
    >
      {/* Recommended badge */}
      {service.recommended && (
        <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#2563EB] text-white text-[10px] font-semibold uppercase tracking-wider rounded-full">
          <SparklesIcon className="size-3" />
          Recommended
        </span>
      )}

      {/* Selection indicator */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1B1B1B] pr-8">
          {service.name}
        </h3>
        <div
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-[#2563EB] border-[#2563EB]"
              : "border-[#C5C5C5]"
          }`}
        >
          {isSelected && <CheckCircleIcon className="size-4 text-white" />}
        </div>
      </div>

      <p className="text-xs text-[#7A7A7A] leading-relaxed mb-3">
        {service.description}
      </p>

      {/* Features */}
      {service.features.length > 0 && (
        <ul className="space-y-1 mb-4">
          {service.features.map((f) => (
            <li
              key={f}
              className="text-xs text-[#7A7A7A] flex items-start gap-2"
            >
              <span className="text-[#2563EB] mt-0.5 shrink-0">&#x2022;</span>
              {f}
            </li>
          ))}
        </ul>
      )}

      {/* Price */}
      <div className="flex items-end justify-between">
        {hasDiscount ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-[#A0A0A0] line-through">
              {tierPrice?.label}
            </span>
            <span className="text-lg font-bold text-[#15803D]">
              {formatGBP(discountedAmount!)}
            </span>
            <span className="text-[10px] font-semibold text-[#15803D] uppercase tracking-wider">
              {Math.round(buildDiscount * 100)}% off
            </span>
          </div>
        ) : (
          <div>
            <span className="text-lg font-bold text-[#1B1B1B]">
              {tierPrice?.label ?? "—"}
            </span>
            {service.minQuantity && service.minQuantity > 1 && (
              <span className="block text-[10px] text-[#A0A0A0]">
                min {service.minQuantity} {service.unitLabel ? `${service.unitLabel}s` : ""}
              </span>
            )}
          </div>
        )}

        {/* Mode toggle (only if both modes) */}
        {hasBothModes && isSelected && (
          <div
            className="inline-flex rounded-md border border-[#E5E5EA] bg-white p-0.5 text-[10px] font-semibold uppercase tracking-wider"
            onClick={(e) => e.stopPropagation()}
          >
            {service.modes.map((m) => (
              <button
                key={m}
                onClick={() => onSetMode(m)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeMode === m
                    ? "bg-[#2563EB] text-white"
                    : "text-[#7A7A7A] hover:text-[#1B1B1B]"
                }`}
              >
                {m === "one-off" ? "One-off" : "Retainer"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity stepper (for services with maxQuantity) */}
      {isSelected && service.maxQuantity && service.maxQuantity > 1 && (() => {
        const minQty = service.minQuantity ?? 1;
        const qty = selection?.quantity ?? minQty;
        const baseUnitPrice = tierPrice?.amount ?? 0;
        const volResult = getUnitPriceForQuantity(service, baseUnitPrice, qty);
        const effectiveUnit = volResult.discounted ? volResult.amount : baseUnitPrice;
        const effectiveLabel = volResult.discounted ? volResult.label : tierPrice?.label ?? "";
        const lineTotal = effectiveUnit * qty;
        const baseLine = baseUnitPrice * qty;
        const saving = baseLine - lineTotal;

        return (
          <div
            className="mt-3 pt-3 border-t border-[#E5E5EA] space-y-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[#7A7A7A]">
                  Qty:
                </span>
                <div className="inline-flex items-center gap-0 rounded-md border border-[#E5E5EA] bg-white">
                  <button
                    onClick={() => onSetQuantity(Math.max(minQty, qty - 1))}
                    disabled={qty <= minQty}
                    className="px-2.5 py-1.5 text-[#7A7A7A] hover:text-[#1B1B1B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <MinusIcon className="size-3" />
                  </button>
                  <span className="px-3 py-1.5 text-sm font-semibold tabular-nums border-x border-[#E5E5EA]">
                    {qty}
                  </span>
                  <button
                    onClick={() =>
                      onSetQuantity(Math.min(service.maxQuantity!, qty + 1))
                    }
                    disabled={qty >= service.maxQuantity!}
                    className="px-2.5 py-1.5 text-[#7A7A7A] hover:text-[#1B1B1B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <PlusIcon className="size-3" />
                  </button>
                </div>
                {minQty > 1 && (
                  <span className="text-[10px] text-[#A0A0A0]">
                    min {minQty}
                  </span>
                )}
              </div>
              <div className="text-right">
                {service.unitLabel && (
                  <span className="text-xs font-semibold text-[#1B1B1B] tabular-nums">
                    {qty} &times; {effectiveLabel} = {formatGBP(lineTotal)}
                  </span>
                )}
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
}

// ── Order Summary ───────────────────────────────────────────────

function OrderSummary({
  items,
  totalPence,
  hasRetainer,
  retainerDiscount,
  loading,
  error,
  clientEmail,
  onEmailChange,
  onRemove,
  onProceed,
}: {
  items: SelectedItem[];
  totalPence: number;
  hasRetainer: boolean;
  retainerDiscount: number;
  loading?: boolean;
  error?: string | null;
  clientEmail: string;
  onEmailChange: (email: string) => void;
  onRemove: (id: string) => void;
  onProceed: () => void;
}) {
  const isEmpty = items.length === 0;
  const totalSaved = items.reduce(
    (sum, i) => sum + (i.baseLineTotal - i.lineTotal),
    0
  );

  return (
    <div className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg p-5">
      <h3 className="text-sm font-semibold text-[#1B1B1B] mb-4">
        Order Summary
      </h3>

      {isEmpty ? (
        <p className="text-xs text-[#A0A0A0] py-6 text-center">
          Select services to build your package
        </p>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {items.map(({ service, sel, lineTotal, baseLineTotal, discount }) => (
              <div
                key={service.id}
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1B1B1B] truncate">
                    {service.name}
                    {sel.quantity > 1 && (
                      <span className="text-[#7A7A7A]">
                        {" "}
                        &times;{sel.quantity}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                    {sel.mode === "retainer" ? "Monthly retainer" : "One-off"}
                    {discount > 0 && (
                      <span className="text-[#15803D] ml-1">
                        · {Math.round(discount * 100)}% retainer discount
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    {discount > 0 ? (
                      <>
                        <span className="text-[10px] text-[#C5C5C5] line-through block leading-tight">
                          {formatGBP(baseLineTotal)}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-[#15803D]">
                          {formatGBP(lineTotal)}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold tabular-nums">
                        {formatGBP(lineTotal)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(service.id)}
                    className="p-1 text-[#C5C5C5] hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Savings banner */}
          {totalSaved > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
              <TagIcon className="size-3.5 text-[#15803D] shrink-0" />
              <span className="text-xs text-[#15803D] font-medium">
                Saving {formatGBP(totalSaved)} with retainer discount
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[#E5E5EA] pt-4 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1B1B1B]">
                Total
              </span>
              <div className="text-right">
                <span className="text-lg font-bold text-[#1B1B1B]">
                  {formatGBP(totalPence)}
                </span>
                {hasRetainer && (
                  <p className="text-[10px] text-[#A0A0A0]">
                    includes recurring monthly fees
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Email input */}
      {!isEmpty && (
        <div className="mb-4">
          <label
            htmlFor="client-email"
            className="block text-xs font-medium text-[#7A7A7A] mb-1.5"
          >
            Your email{" "}
            <span className="text-[#A0A0A0] font-normal">(for Slack channel invite)</span>
          </label>
          <input
            id="client-email"
            type="email"
            placeholder="you@company.com"
            value={clientEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-[#E5E5EA] rounded-lg bg-white text-[#1B1B1B] placeholder:text-[#C5C5C5] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {/* CTA */}
      <button
        onClick={onProceed}
        disabled={isEmpty || loading}
        className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
          isEmpty || loading
            ? "bg-[#E5E5EA] text-[#A0A0A0] cursor-not-allowed"
            : "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm hover:shadow-md"
        }`}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin size-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Creating invoice…
          </>
        ) : (
          <>
            Proceed to Payment
            {!isEmpty && <ChevronRightIcon className="size-4" />}
          </>
        )}
      </button>

      {!isEmpty && !loading && (
        <p className="text-[10px] text-[#A0A0A0] text-center mt-3">
          You&apos;ll be redirected to our secure checkout
        </p>
      )}
    </div>
  );
}
