"use client";

import { useState, useMemo } from "react";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid";
import { ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { labelClass } from "@/lib/form-styles";
import {
  CALC_CATEGORY_ORDER,
  calculatorItems,
  type CalcCategory,
  type PriceItem,
  type Role,
} from "@/lib/pricing";

/* ── Calculator-local types/aliases ──
 * Pricing data lives in src/lib/pricing.ts (single source of truth).
 * The calculator only surfaces items that have roleCosts + a price —
 * see calculatorItems() in that file.
 */

const roleLabels: Record<Role, string> = {
  dev: "Developer",
  designer: "Designer",
  juniorDesigner: "Junior Designer",
};

const allRoles: Role[] = ["dev", "designer", "juniorDesigner"];

// Calculator-shaped item — narrowed view of PriceItem with required calc fields.
type PricedDeliverable = PriceItem & {
  category: CalcCategory;
  price: number;
  roleCosts: { dev: number; designer: number; juniorDesigner: number };
};

const deliverables: PricedDeliverable[] = calculatorItems().map((it) => ({
  ...it,
  // Calculator's local category alias
  category: it.calcCategory!,
  roleCosts: it.roleCosts!,
}));

const categories = CALC_CATEGORY_ORDER;

/* ── Currency formatters ── */
const fmt = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const fmtDetailed = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

function getInternalCost(d: PricedDeliverable, activeRoles: Set<Role>): number {
  let cost = 0;
  if (activeRoles.has("dev")) cost += d.roleCosts.dev;
  if (activeRoles.has("designer")) cost += d.roleCosts.designer;
  if (activeRoles.has("juniorDesigner")) cost += d.roleCosts.juniorDesigner;
  return cost;
}

export default function PriceCalculatorPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [activeRoles, setActiveRoles] = useState<Set<Role>>(
    new Set(["dev", "designer", "juniorDesigner"])
  );

  // Payment processing fees
  const [fees, setFees] = useState<Record<string, boolean>>({
    whop: false,
    shopify: false,
    wise: false,
  });

  const feeRates: Record<string, { label: string; rate: number; fixed: number; description: string }> = {
    whop: { label: "Whop", rate: 0.045, fixed: 0.27, description: "~4.5% + 27p (processing + currency + orchestration)" },
    shopify: { label: "Shopify Payments", rate: 0.019, fixed: 0.20, description: "1.9% + 20p" },
    wise: { label: "Wise", rate: 0.0035, fixed: 0.30, description: "0.35% + 30p" },
  };

  /* ── Helpers ── */
  const getQty = (name: string) => quantities[name] || 0;

  const setQty = (name: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [name]: Math.max(0, qty) }));
  };

  const toggleRole = (role: Role) => {
    setActiveRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  /* ── Computed totals ── */
  const {
    activeItems,
    totalCost,
    totalPrice,
    totalMargin,
    marginPercent,
    roleTotals,
    totalPages,
    pageDiscount,
    totalSaved,
  } = useMemo(() => {
    // Count total pages across all page-type deliverables
    const totalPages = deliverables
      .filter((d) => d.pageCount && getQty(d.name) > 0)
      .reduce((sum, d) => sum + d.pageCount! * getQty(d.name), 0);

    // Determine volume discount for page builds
    const pageDiscount =
      totalPages >= 4 ? 0.15 : totalPages >= 3 ? 0.1 : 0;

    const active = deliverables
      .filter((d) => getQty(d.name) > 0)
      .map((d) => {
        const qty = getQty(d.name);
        const price = d.price;
        const unitCostFull = getInternalCost(d, activeRoles);

        // Apply discount only to page-type deliverables
        const discountRate = d.pageCount ? pageDiscount : 0;
        const unitCost = Math.round(unitCostFull * (1 - discountRate));
        const unitCostBeforeDiscount = unitCostFull;

        const lineCost = unitCost * qty;
        const lineCostBeforeDiscount = unitCostBeforeDiscount * qty;
        const linePrice = price * qty;
        const lineMargin = linePrice - lineCost;
        const lineMarginPercent =
          linePrice > 0 ? (lineMargin / linePrice) * 100 : 0;
        const lineSaved = lineCostBeforeDiscount - lineCost;

        // Per-role line costs (after discount)
        const discountMult = 1 - discountRate;
        const lineDevCost = activeRoles.has("dev")
          ? Math.round(d.roleCosts.dev * discountMult) * qty
          : 0;
        const lineDesignerCost = activeRoles.has("designer")
          ? Math.round(d.roleCosts.designer * discountMult) * qty
          : 0;
        const lineJuniorCost = activeRoles.has("juniorDesigner")
          ? Math.round(d.roleCosts.juniorDesigner * discountMult) * qty
          : 0;

        return {
          ...d,
          qty,
          unitCost,
          lineCost,
          linePrice,
          lineMargin,
          lineMarginPercent,
          lineDevCost,
          lineDesignerCost,
          lineJuniorCost,
          lineSaved,
          discountRate,
        };
      });

    const totalCost = active.reduce((sum, a) => sum + a.lineCost, 0);
    const totalPrice = active.reduce((sum, a) => sum + a.linePrice, 0);
    const totalMargin = totalPrice - totalCost;
    const marginPercent =
      totalPrice > 0 ? (totalMargin / totalPrice) * 100 : 0;
    const totalSaved = active.reduce((sum, a) => sum + a.lineSaved, 0);

    const roleTotals = {
      dev: active.reduce((sum, a) => sum + a.lineDevCost, 0),
      designer: active.reduce((sum, a) => sum + a.lineDesignerCost, 0),
      juniorDesigner: active.reduce((sum, a) => sum + a.lineJuniorCost, 0),
    };

    return {
      activeItems: active,
      totalCost,
      totalPrice,
      totalMargin,
      marginPercent,
      roleTotals,
      totalPages,
      pageDiscount,
      totalSaved,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantities, activeRoles]);

  const hasActiveItems = activeItems.length > 0;
  const activeRoleCount = activeRoles.size;

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Price Calculator
          </h1>
          <p className="text-[#7A7A7A]">
            Select deliverables and quantities to calculate project costs and
            margins
          </p>
          {/* Share Price List Links */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="text-xs font-medium text-[#A0A0A0]">Share price list:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/pricing`;
                  navigator.clipboard.writeText(url);
                  setCopiedShareLink(true);
                  setTimeout(() => setCopiedShareLink(false), 2000);
                }}
                className="flex items-center gap-1 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
              >
                <ClipboardDocumentIcon className="size-3.5" />
                {copiedShareLink ? "Copied!" : "/pricing"}
              </button>
              <a
                href="/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="size-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Team Roles */}
          <div>
            <label className={labelClass}>Team</label>
            <div className="flex flex-wrap gap-2">
              {allRoles.map((role) => {
                const isOn = activeRoles.has(role);
                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                      isOn
                        ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                        : "bg-white text-[#A0A0A0] border-[#E5E5EA] hover:text-[#7A7A7A] hover:border-[#C5C5C5]"
                    }`}
                  >
                    {roleLabels[role]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume discount banner */}
          {pageDiscount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
              <span className="text-sm text-[#15803D]">
                <strong>{Math.round(pageDiscount * 100)}% volume discount</strong>{" "}
                applied to page build costs ({totalPages} pages)
                {totalSaved > 0 && (
                  <span className="ml-1">
                    — saving {fmt.format(totalSaved)}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Deliverables by category */}
          {categories.map((cat) => {
            const items = deliverables.filter((d) => d.category === cat);
            return (
              <div key={cat}>
                <label className={labelClass}>{cat}</label>
                <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg overflow-hidden">
                  {/* Column headers */}
                  <div className="hidden md:grid md:grid-cols-[1fr_80px_80px_72px] gap-3 px-5 py-2.5 border-b border-[#E5E5EA] bg-[#EDEDEF]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">
                      Deliverable
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] text-right">
                      Internal
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] text-right">
                      Client
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] text-center">
                      Qty
                    </span>
                  </div>

                  <div className="divide-y divide-[#E5E5EA]">
                    {items.map((d) => {
                      const qty = getQty(d.name);
                      const isActive = qty > 0;
                      const price = d.price;
                      const costFull = getInternalCost(d, activeRoles);
                      const discountRate = d.pageCount ? pageDiscount : 0;
                      const cost = Math.round(costFull * (1 - discountRate));
                      const hasDiscount = discountRate > 0;

                      return (
                        <div
                          key={d.name}
                          className={`px-5 py-3 transition-colors ${isActive ? "bg-white" : ""}`}
                        >
                          {/* Desktop row */}
                          <div className="hidden md:grid md:grid-cols-[1fr_80px_80px_72px] gap-3 items-center">
                            <span
                              className={`text-sm font-medium ${isActive ? "text-[#1B1B1B]" : "text-[#7A7A7A]"}`}
                            >
                              {d.name}
                            </span>
                            <div className="text-right">
                              {hasDiscount && activeRoleCount > 0 ? (
                                <>
                                  <span className="text-xs line-through text-[#C5C5C5] block leading-tight">
                                    {fmt.format(costFull)}
                                  </span>
                                  <span
                                    className={`text-sm tabular-nums ${isActive ? "text-[#15803D]" : "text-[#6B9F6B]"}`}
                                  >
                                    {fmt.format(cost)}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className={`text-sm tabular-nums ${isActive ? "text-[#1B1B1B]" : "text-[#A0A0A0]"}`}
                                >
                                  {activeRoleCount > 0 ? fmt.format(cost) : "—"}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-sm tabular-nums text-right ${isActive ? "text-[#1B1B1B]" : "text-[#A0A0A0]"}`}
                            >
                              {fmt.format(price)}
                            </span>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setQty(d.name, qty - 1)}
                                disabled={qty === 0}
                                className="p-1 rounded hover:bg-[#E5E5EA] text-[#A0A0A0] hover:text-[#7A7A7A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label={`Decrease ${d.name} quantity`}
                              >
                                <MinusIcon className="size-3" />
                              </button>
                              <span
                                className={`text-sm font-semibold tabular-nums w-5 text-center ${isActive ? "text-[#1B1B1B]" : "text-[#A0A0A0]"}`}
                              >
                                {qty}
                              </span>
                              <button
                                onClick={() => setQty(d.name, qty + 1)}
                                className="p-1 rounded hover:bg-[#E5E5EA] text-[#A0A0A0] hover:text-[#7A7A7A] transition-colors"
                                aria-label={`Increase ${d.name} quantity`}
                              >
                                <PlusIcon className="size-3" />
                              </button>
                            </div>
                          </div>

                          {/* Mobile row */}
                          <div className="md:hidden flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-sm font-medium block ${isActive ? "text-[#1B1B1B]" : "text-[#7A7A7A]"}`}
                              >
                                {d.name}
                              </span>
                              <span
                                className={`text-xs tabular-nums ${isActive ? "text-[#7A7A7A]" : "text-[#A0A0A0]"}`}
                              >
                                {activeRoleCount > 0 ? fmt.format(cost) : "—"}
                                {hasDiscount && activeRoleCount > 0 && (
                                  <span className="line-through text-[#C5C5C5] ml-1">
                                    {fmt.format(costFull)}
                                  </span>
                                )}
                                {" / "}
                                {fmt.format(price)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setQty(d.name, qty - 1)}
                                disabled={qty === 0}
                                className="p-1 rounded hover:bg-[#E5E5EA] text-[#A0A0A0] hover:text-[#7A7A7A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label={`Decrease ${d.name} quantity`}
                              >
                                <MinusIcon className="size-3.5" />
                              </button>
                              <span
                                className={`text-sm font-semibold tabular-nums w-5 text-center ${isActive ? "text-[#1B1B1B]" : "text-[#A0A0A0]"}`}
                              >
                                {qty}
                              </span>
                              <button
                                onClick={() => setQty(d.name, qty + 1)}
                                className="p-1 rounded hover:bg-[#E5E5EA] text-[#A0A0A0] hover:text-[#7A7A7A] transition-colors"
                                aria-label={`Increase ${d.name} quantity`}
                              >
                                <PlusIcon className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Breakdown */}
          {hasActiveItems && (
            <div>
              <label className={labelClass}>Breakdown</label>
              <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg overflow-hidden">
                <div className="hidden md:grid md:grid-cols-[1fr_80px_80px_90px] gap-3 px-5 py-2.5 border-b border-[#E5E5EA] bg-[#EDEDEF]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">
                    Deliverable
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] text-right">
                    Internal
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] text-right">
                    Client
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] text-right">
                    Margin
                  </span>
                </div>

                <div className="divide-y divide-[#E5E5EA]">
                  {activeItems.map((item) => (
                    <div key={item.name} className="px-5 py-3">
                      {/* Desktop */}
                      <div className="hidden md:grid md:grid-cols-[1fr_80px_80px_90px] gap-3 items-center">
                        <div>
                          <span className="text-sm text-[#1B1B1B]">
                            {item.name}
                            {item.qty > 1 && (
                              <span className="text-[#A0A0A0] ml-1">
                                ×{item.qty}
                              </span>
                            )}
                          </span>
                          {/* Role cost breakdown */}
                          <div className="flex gap-3 mt-1">
                            {activeRoles.has("dev") && item.lineDevCost > 0 && (
                              <span className="text-xs text-[#A0A0A0]">
                                Dev {fmt.format(item.lineDevCost)}
                              </span>
                            )}
                            {activeRoles.has("designer") && item.lineDesignerCost > 0 && (
                              <span className="text-xs text-[#A0A0A0]">
                                Design {fmt.format(item.lineDesignerCost)}
                              </span>
                            )}
                            {activeRoles.has("juniorDesigner") && item.lineJuniorCost > 0 && (
                              <span className="text-xs text-[#A0A0A0]">
                                Jr {fmt.format(item.lineJuniorCost)}
                              </span>
                            )}
                            {item.discountRate > 0 && (
                              <span className="text-xs text-[#15803D] font-medium">
                                -{Math.round(item.discountRate * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm tabular-nums text-right text-[#7A7A7A]">
                          {fmt.format(item.lineCost)}
                        </span>
                        <span className="text-sm tabular-nums text-right text-[#1B1B1B]">
                          {fmt.format(item.linePrice)}
                        </span>
                        <div className="text-right">
                          <span
                            className={`text-sm tabular-nums font-medium ${
                              item.lineMargin < 0
                                ? "text-red-600"
                                : "text-[#1B1B1B]"
                            }`}
                          >
                            {fmt.format(item.lineMargin)}
                          </span>
                          <span className="text-xs text-[#A0A0A0] ml-1">
                            {item.lineMarginPercent.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="md:hidden">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[#1B1B1B]">
                            {item.name}
                            {item.qty > 1 && (
                              <span className="text-[#A0A0A0] ml-1">
                                ×{item.qty}
                              </span>
                            )}
                          </span>
                          <span
                            className={`text-sm font-medium tabular-nums ${
                              item.lineMargin < 0
                                ? "text-red-600"
                                : "text-[#1B1B1B]"
                            }`}
                          >
                            {fmt.format(item.lineMargin)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs tabular-nums text-[#A0A0A0]">
                            {fmt.format(item.lineCost)} internal ·{" "}
                            {fmt.format(item.linePrice)} client
                            {item.discountRate > 0 && (
                              <span className="text-[#15803D] ml-1">
                                (-{Math.round(item.discountRate * 100)}%)
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-[#A0A0A0]">
                            {item.lineMarginPercent.toFixed(0)}%
                          </span>
                        </div>
                        {/* Role breakdown on mobile */}
                        <div className="flex gap-3 mt-1">
                          {activeRoles.has("dev") && item.lineDevCost > 0 && (
                            <span className="text-xs text-[#A0A0A0]">
                              Dev {fmt.format(item.lineDevCost)}
                            </span>
                          )}
                          {activeRoles.has("designer") && item.lineDesignerCost > 0 && (
                            <span className="text-xs text-[#A0A0A0]">
                              Design {fmt.format(item.lineDesignerCost)}
                            </span>
                          )}
                          {activeRoles.has("juniorDesigner") && item.lineJuniorCost > 0 && (
                            <span className="text-xs text-[#A0A0A0]">
                              Jr {fmt.format(item.lineJuniorCost)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals row */}
                <div className="px-5 py-4 border-t-2 border-[#E5E5EA] bg-white">
                  <div className="hidden md:grid md:grid-cols-[1fr_80px_80px_90px] gap-3 items-center">
                    <div>
                      <span className="text-sm font-semibold text-[#1B1B1B]">
                        Total
                      </span>
                      {/* Role total breakdown */}
                      <div className="flex gap-3 mt-1">
                        {activeRoles.has("dev") && roleTotals.dev > 0 && (
                          <span className="text-xs font-medium text-[#A0A0A0]">
                            Dev {fmt.format(roleTotals.dev)}
                          </span>
                        )}
                        {activeRoles.has("designer") && roleTotals.designer > 0 && (
                          <span className="text-xs font-medium text-[#A0A0A0]">
                            Design {fmt.format(roleTotals.designer)}
                          </span>
                        )}
                        {activeRoles.has("juniorDesigner") && roleTotals.juniorDesigner > 0 && (
                          <span className="text-xs font-medium text-[#A0A0A0]">
                            Jr {fmt.format(roleTotals.juniorDesigner)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-right text-[#7A7A7A]">
                      {fmtDetailed.format(totalCost)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-right text-[#1B1B1B]">
                      {fmtDetailed.format(totalPrice)}
                    </span>
                    <div className="text-right">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          totalMargin < 0 ? "text-red-600" : "text-[#1B1B1B]"
                        }`}
                      >
                        {fmtDetailed.format(totalMargin)}
                      </span>
                      <span className="text-xs font-medium text-[#A0A0A0] ml-1">
                        {marginPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="md:hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[#1B1B1B]">
                        Total
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          totalMargin < 0 ? "text-red-600" : "text-[#1B1B1B]"
                        }`}
                      >
                        {fmtDetailed.format(totalMargin)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs tabular-nums text-[#A0A0A0]">
                        {fmtDetailed.format(totalCost)} internal ·{" "}
                        {fmtDetailed.format(totalPrice)} client
                      </span>
                      <span className="text-xs font-medium text-[#A0A0A0]">
                        {marginPercent.toFixed(1)}%
                      </span>
                    </div>
                    {/* Role totals on mobile */}
                    <div className="flex gap-3 mt-1">
                      {activeRoles.has("dev") && roleTotals.dev > 0 && (
                        <span className="text-xs font-medium text-[#A0A0A0]">
                          Dev {fmt.format(roleTotals.dev)}
                        </span>
                      )}
                      {activeRoles.has("designer") && roleTotals.designer > 0 && (
                        <span className="text-xs font-medium text-[#A0A0A0]">
                          Design {fmt.format(roleTotals.designer)}
                        </span>
                      )}
                      {activeRoles.has("juniorDesigner") && roleTotals.juniorDesigner > 0 && (
                        <span className="text-xs font-medium text-[#A0A0A0]">
                          Jr {fmt.format(roleTotals.juniorDesigner)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Summary Cards */}
          {hasActiveItems && (
            <div>
              <label className={labelClass}>Project Summary</label>
              <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                      Internal Cost
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-[#1B1B1B]">
                      {fmtDetailed.format(totalCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                      Client Price
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-[#1B1B1B]">
                      {fmtDetailed.format(totalPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                      Total Margin
                    </p>
                    <p
                      className={`text-lg font-semibold tabular-nums ${
                        totalMargin < 0 ? "text-red-600" : "text-[#1B1B1B]"
                      }`}
                    >
                      {fmtDetailed.format(totalMargin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                      Margin %
                    </p>
                    <p
                      className={`text-lg font-semibold tabular-nums ${
                        totalMargin < 0 ? "text-red-600" : "text-[#1B1B1B]"
                      }`}
                    >
                      {marginPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Role cost breakdown in summary */}
                {activeRoleCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#E5E5EA]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-2">
                      Cost by Role
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      {activeRoles.has("dev") && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#7A7A7A]">
                            Developer
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-[#1B1B1B]">
                            {fmtDetailed.format(roleTotals.dev)}
                          </span>
                        </div>
                      )}
                      {activeRoles.has("designer") && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#7A7A7A]">
                            Designer
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-[#1B1B1B]">
                            {fmtDetailed.format(roleTotals.designer)}
                          </span>
                        </div>
                      )}
                      {activeRoles.has("juniorDesigner") && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#7A7A7A]">
                            Junior Designer
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-[#1B1B1B]">
                            {fmtDetailed.format(roleTotals.juniorDesigner)}
                          </span>
                        </div>
                      )}
                    </div>
                    {totalSaved > 0 && (
                      <p className="text-xs text-[#15803D] mt-2">
                        Volume discount saving: {fmtDetailed.format(totalSaved)}
                      </p>
                    )}
                  </div>
                )}

                {/* Payment Processing Fees */}
                <div className="mt-4 pt-4 border-t border-[#E5E5EA]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-3">
                    Payment Processing Fees
                  </p>
                  <div className="space-y-2">
                    {Object.entries(feeRates).map(([key, fee]) => {
                      const isOn = fees[key];
                      const feeAmount = isOn ? totalPrice * fee.rate + fee.fixed : 0;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <button
                            onClick={() => setFees((f) => ({ ...f, [key]: !f[key] }))}
                            className="flex items-center gap-2"
                          >
                            <div className={`size-4 rounded border transition-colors flex items-center justify-center ${
                              isOn ? "bg-[#1B1B1B] border-[#1B1B1B]" : "border-[#CCC] bg-white"
                            }`}>
                              {isOn && <svg className="size-2.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                            </div>
                            <span className="text-xs text-[#555]">{fee.label}</span>
                            <span className="text-xs text-[#AAA]">{fee.description}</span>
                          </button>
                          {isOn && (
                            <span className="text-xs font-semibold tabular-nums text-red-500">
                              -{fmtDetailed.format(feeAmount)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Net amount after fees */}
                  {Object.values(fees).some(Boolean) && (() => {
                    const totalFees = Object.entries(feeRates).reduce((sum, [key, fee]) => {
                      if (!fees[key]) return sum;
                      return sum + totalPrice * fee.rate + fee.fixed;
                    }, 0);
                    const netRevenue = totalPrice - totalFees;
                    const netMargin = netRevenue - totalCost;
                    const netMarginPct = netRevenue > 0 ? (netMargin / netRevenue) * 100 : 0;
                    return (
                      <div className="mt-3 pt-3 border-t border-[#E5E5EA]">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-0.5">Total Fees</p>
                            <p className="text-sm font-semibold tabular-nums text-red-500">-{fmtDetailed.format(totalFees)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-0.5">Net Revenue</p>
                            <p className="text-sm font-semibold tabular-nums text-[#1B1B1B]">{fmtDetailed.format(netRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-0.5">Net Margin</p>
                            <p className={`text-sm font-semibold tabular-nums ${netMargin < 0 ? "text-red-600" : "text-[#1B1B1B]"}`}>
                              {fmtDetailed.format(netMargin)} <span className="text-xs text-[#AAA]">{netMarginPct.toFixed(1)}%</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
