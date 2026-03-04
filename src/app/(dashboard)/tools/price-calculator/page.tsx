"use client";

import { useState, useMemo } from "react";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";

/* ── shared classes ── */
const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2";

/* ── Types ── */
type Tier = 1 | 2;
type Role = "dev" | "designer" | "juniorDesigner";

const roleLabels: Record<Role, string> = {
  dev: "Developer",
  designer: "Designer",
  juniorDesigner: "Junior Designer",
};

const allRoles: Role[] = ["dev", "designer", "juniorDesigner"];

interface RoleCosts {
  dev: number;
  designer: number;
  juniorDesigner: number;
}

interface PricedDeliverable {
  name: string;
  category: "Page Builds" | "Secondary Pages" | "Tertiary Pages" | "CRO Retainer" | "Additional Services";
  roleCosts: RoleCosts;
  tier1Price: number;
  tier2Price: number;
  pageCount?: number; // how many "pages" this counts for discount calc
}

/* ──────────────────────────────────────────────────────────────────────────
   Deliverables — real per-role costs

   Main page rate: Dev £300, Design £300, Jr £250 = £850 per page
   Secondary rate: Dev £200, Design £200, Jr £150 = £550 per page
   Tertiary rate:  Dev £100, Design £100, Jr £75  = £275 per page
   Test rate: Dev £75, Design £75, Jr £50 = £200 per test
   Foundation = 4 tests/mo, Growth = 8, Scale = 16

   Volume discounts on page internal costs (all page types):
     3 pages total → 10% off
     4+ pages total → 15% off
   (applied dynamically based on total page count in project)
   ────────────────────────────────────────────────────────────────────── */

const deliverables: PricedDeliverable[] = [
  /* ── Page Builds (per page: Dev £300 / Design £300 / Jr £250) ── */
  { name: "1 Page Build", category: "Page Builds", roleCosts: { dev: 300, designer: 300, juniorDesigner: 250 }, tier1Price: 2999, tier2Price: 3999, pageCount: 1 },
  { name: "2 Page Build", category: "Page Builds", roleCosts: { dev: 600, designer: 600, juniorDesigner: 500 }, tier1Price: 5499, tier2Price: 6999, pageCount: 2 },
  { name: "3 Page Build", category: "Page Builds", roleCosts: { dev: 900, designer: 900, juniorDesigner: 750 }, tier1Price: 7999, tier2Price: 10499, pageCount: 3 },
  { name: "4 Page Build", category: "Page Builds", roleCosts: { dev: 1200, designer: 1200, juniorDesigner: 1000 }, tier1Price: 9999, tier2Price: 12499, pageCount: 4 },
  { name: "Single Advertorial / Listicle", category: "Page Builds", roleCosts: { dev: 300, designer: 300, juniorDesigner: 250 }, tier1Price: 2000, tier2Price: 2699, pageCount: 1 },
  { name: "Advertorial / Listicle Bundle ×2", category: "Page Builds", roleCosts: { dev: 600, designer: 600, juniorDesigner: 500 }, tier1Price: 3500, tier2Price: 4699, pageCount: 2 },

  /* ── Secondary Pages (per page: Dev £200 / Design £200 / Jr £150) ── */
  { name: "Collection Page", category: "Secondary Pages", roleCosts: { dev: 200, designer: 200, juniorDesigner: 150 }, tier1Price: 750, tier2Price: 1000, pageCount: 1 },
  { name: "Account Page", category: "Secondary Pages", roleCosts: { dev: 200, designer: 200, juniorDesigner: 150 }, tier1Price: 750, tier2Price: 1000, pageCount: 1 },
  { name: "About Us Page", category: "Secondary Pages", roleCosts: { dev: 200, designer: 200, juniorDesigner: 150 }, tier1Price: 750, tier2Price: 1000, pageCount: 1 },

  /* ── Tertiary Pages (per page: Dev £100 / Design £100 / Jr £75) ── */
  { name: "FAQ Page", category: "Tertiary Pages", roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 }, tier1Price: 500, tier2Price: 750, pageCount: 1 },
  { name: "Contact Page", category: "Tertiary Pages", roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 }, tier1Price: 500, tier2Price: 750, pageCount: 1 },
  { name: "Cart Page", category: "Tertiary Pages", roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 }, tier1Price: 500, tier2Price: 750, pageCount: 1 },
  { name: "Navigation", category: "Tertiary Pages", roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 }, tier1Price: 500, tier2Price: 750, pageCount: 1 },
  { name: "Policy Pages (All)", category: "Tertiary Pages", roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 }, tier1Price: 500, tier2Price: 750, pageCount: 1 },

  /* ── CRO Retainer (per test: Dev £75 / Design £75 / Jr £50) ── */
  /* Foundation = 1 test/wk = 4 tests/mo */
  { name: "Foundation — 1 Test / Week", category: "CRO Retainer", roleCosts: { dev: 300, designer: 300, juniorDesigner: 200 }, tier1Price: 1499, tier2Price: 2999 },
  /* Growth = 2 tests/wk = 8 tests/mo */
  { name: "Growth — 2 Tests / Week", category: "CRO Retainer", roleCosts: { dev: 600, designer: 600, juniorDesigner: 400 }, tier1Price: 2499, tier2Price: 3999 },
  /* Scale = 4 tests/wk = 16 tests/mo */
  { name: "Scale — 4 Tests / Week", category: "CRO Retainer", roleCosts: { dev: 1200, designer: 1200, juniorDesigner: 800 }, tier1Price: 3499, tier2Price: 4999 },

  /* ── Additional Services ── */
  /* Static ads: Designer £25 / Jr £20 each */
  { name: "5 Static Ads", category: "Additional Services", roleCosts: { dev: 0, designer: 125, juniorDesigner: 100 }, tier1Price: 500, tier2Price: 625 },
  { name: "10 Static Ads", category: "Additional Services", roleCosts: { dev: 0, designer: 250, juniorDesigner: 200 }, tier1Price: 850, tier2Price: 1050 },
  /* Emails: Designer £40 / Jr £35 each */
  { name: "10 Email Designs", category: "Additional Services", roleCosts: { dev: 0, designer: 400, juniorDesigner: 350 }, tier1Price: 750, tier2Price: 999 },
  { name: "20 Email Designs", category: "Additional Services", roleCosts: { dev: 0, designer: 800, juniorDesigner: 700 }, tier1Price: 1500, tier2Price: 1799 },
  /* Support */
  { name: "Extended 30 Day Support", category: "Additional Services", roleCosts: { dev: 250, designer: 0, juniorDesigner: 0 }, tier1Price: 1000, tier2Price: 1250 },
  { name: "Extended 14 Day Support", category: "Additional Services", roleCosts: { dev: 150, designer: 0, juniorDesigner: 0 }, tier1Price: 500, tier2Price: 625 },
  /* Design services */
  { name: "Full Email Flow Design", category: "Additional Services", roleCosts: { dev: 0, designer: 750, juniorDesigner: 0 }, tier1Price: 2500, tier2Price: 2999 },
  { name: "Brand Refresh", category: "Additional Services", roleCosts: { dev: 0, designer: 200, juniorDesigner: 0 }, tier1Price: 500, tier2Price: 625 },
  /* Turnarounds */
  { name: "24hr Turnaround", category: "Additional Services", roleCosts: { dev: 0, designer: 400, juniorDesigner: 0 }, tier1Price: 2000, tier2Price: 2500 },
  { name: "48hr Turnaround", category: "Additional Services", roleCosts: { dev: 0, designer: 200, juniorDesigner: 0 }, tier1Price: 1000, tier2Price: 1250 },
  /* Testing & variants */
  { name: "A/B Test Setup + Monitor", category: "Additional Services", roleCosts: { dev: 100, designer: 0, juniorDesigner: 0 }, tier1Price: 500, tier2Price: 625 },
  { name: "Page Variant / Reskin", category: "Additional Services", roleCosts: { dev: 200, designer: 200, juniorDesigner: 0 }, tier1Price: 1000, tier2Price: 1000 },
  { name: "Cart / Post Purchase", category: "Additional Services", roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 }, tier1Price: 500, tier2Price: 625 },
  { name: "Full Brand Refresh", category: "Additional Services", roleCosts: { dev: 0, designer: 1000, juniorDesigner: 750 }, tier1Price: 2500, tier2Price: 2999 },
];

const categories = ["Page Builds", "Secondary Pages", "Tertiary Pages", "CRO Retainer", "Additional Services"] as const;

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

function getClientPrice(d: PricedDeliverable, tier: Tier): number {
  return tier === 1 ? d.tier1Price : d.tier2Price;
}

function getInternalCost(d: PricedDeliverable, activeRoles: Set<Role>): number {
  let cost = 0;
  if (activeRoles.has("dev")) cost += d.roleCosts.dev;
  if (activeRoles.has("designer")) cost += d.roleCosts.designer;
  if (activeRoles.has("juniorDesigner")) cost += d.roleCosts.juniorDesigner;
  return cost;
}

export default function PriceCalculatorPage() {
  const [tier, setTier] = useState<Tier>(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [activeRoles, setActiveRoles] = useState<Set<Role>>(
    new Set(["dev", "designer", "juniorDesigner"])
  );

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
        const price = getClientPrice(d, tier);
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
  }, [quantities, tier, activeRoles]);

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
          <p className="text-[#6B6B6B]">
            Select deliverables and quantities to calculate project costs and
            margins
          </p>
        </div>

        <div className="space-y-8">
          {/* Tier Toggle + Team Roles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Pricing Tier</label>
              <div className="inline-flex rounded-md border border-[#E5E5E5] bg-[#F5F5F5] p-0.5">
                <button
                  onClick={() => setTier(1)}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                    tier === 1
                      ? "bg-[#0A0A0A] text-white"
                      : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                  }`}
                >
                  Tier 1
                </button>
                <button
                  onClick={() => setTier(2)}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                    tier === 2
                      ? "bg-[#0A0A0A] text-white"
                      : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                  }`}
                >
                  Tier 2
                </button>
              </div>
            </div>

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
                          ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                          : "bg-white text-[#AAAAAA] border-[#E5E5E5] hover:text-[#6B6B6B] hover:border-[#CCCCCC]"
                      }`}
                    >
                      {roleLabels[role]}
                    </button>
                  );
                })}
              </div>
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
                <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg overflow-hidden">
                  {/* Column headers */}
                  <div className="hidden md:grid md:grid-cols-[1fr_80px_80px_72px] gap-3 px-5 py-2.5 border-b border-[#E5E5E5] bg-[#F0F0F0]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                      Deliverable
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] text-right">
                      Internal
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] text-right">
                      Client
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] text-center">
                      Qty
                    </span>
                  </div>

                  <div className="divide-y divide-[#E5E5E5]">
                    {items.map((d) => {
                      const qty = getQty(d.name);
                      const isActive = qty > 0;
                      const price = getClientPrice(d, tier);
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
                              className={`text-sm font-medium ${isActive ? "text-[#0A0A0A]" : "text-[#6B6B6B]"}`}
                            >
                              {d.name}
                            </span>
                            <div className="text-right">
                              {hasDiscount && activeRoleCount > 0 ? (
                                <>
                                  <span className="text-[10px] line-through text-[#CCCCCC] block leading-tight">
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
                                  className={`text-sm tabular-nums ${isActive ? "text-[#0A0A0A]" : "text-[#AAAAAA]"}`}
                                >
                                  {activeRoleCount > 0 ? fmt.format(cost) : "—"}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-sm tabular-nums text-right ${isActive ? "text-[#0A0A0A]" : "text-[#AAAAAA]"}`}
                            >
                              {fmt.format(price)}
                            </span>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setQty(d.name, qty - 1)}
                                disabled={qty === 0}
                                className="p-1 rounded hover:bg-[#E5E5E5] text-[#AAAAAA] hover:text-[#6B6B6B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label={`Decrease ${d.name} quantity`}
                              >
                                <MinusIcon className="size-3" />
                              </button>
                              <span
                                className={`text-sm font-semibold tabular-nums w-5 text-center ${isActive ? "text-[#0A0A0A]" : "text-[#AAAAAA]"}`}
                              >
                                {qty}
                              </span>
                              <button
                                onClick={() => setQty(d.name, qty + 1)}
                                className="p-1 rounded hover:bg-[#E5E5E5] text-[#AAAAAA] hover:text-[#6B6B6B] transition-colors"
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
                                className={`text-sm font-medium block ${isActive ? "text-[#0A0A0A]" : "text-[#6B6B6B]"}`}
                              >
                                {d.name}
                              </span>
                              <span
                                className={`text-xs tabular-nums ${isActive ? "text-[#6B6B6B]" : "text-[#AAAAAA]"}`}
                              >
                                {activeRoleCount > 0 ? fmt.format(cost) : "—"}
                                {hasDiscount && activeRoleCount > 0 && (
                                  <span className="line-through text-[#CCCCCC] ml-1">
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
                                className="p-1 rounded hover:bg-[#E5E5E5] text-[#AAAAAA] hover:text-[#6B6B6B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label={`Decrease ${d.name} quantity`}
                              >
                                <MinusIcon className="size-3.5" />
                              </button>
                              <span
                                className={`text-sm font-semibold tabular-nums w-5 text-center ${isActive ? "text-[#0A0A0A]" : "text-[#AAAAAA]"}`}
                              >
                                {qty}
                              </span>
                              <button
                                onClick={() => setQty(d.name, qty + 1)}
                                className="p-1 rounded hover:bg-[#E5E5E5] text-[#AAAAAA] hover:text-[#6B6B6B] transition-colors"
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
              <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg overflow-hidden">
                <div className="hidden md:grid md:grid-cols-[1fr_80px_80px_90px] gap-3 px-5 py-2.5 border-b border-[#E5E5E5] bg-[#F0F0F0]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                    Deliverable
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] text-right">
                    Internal
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] text-right">
                    Client
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] text-right">
                    Margin
                  </span>
                </div>

                <div className="divide-y divide-[#E5E5E5]">
                  {activeItems.map((item) => (
                    <div key={item.name} className="px-5 py-3">
                      {/* Desktop */}
                      <div className="hidden md:grid md:grid-cols-[1fr_80px_80px_90px] gap-3 items-center">
                        <div>
                          <span className="text-sm text-[#0A0A0A]">
                            {item.name}
                            {item.qty > 1 && (
                              <span className="text-[#AAAAAA] ml-1">
                                ×{item.qty}
                              </span>
                            )}
                          </span>
                          {/* Role cost breakdown */}
                          <div className="flex gap-3 mt-1">
                            {activeRoles.has("dev") && item.lineDevCost > 0 && (
                              <span className="text-[10px] text-[#AAAAAA]">
                                Dev {fmt.format(item.lineDevCost)}
                              </span>
                            )}
                            {activeRoles.has("designer") && item.lineDesignerCost > 0 && (
                              <span className="text-[10px] text-[#AAAAAA]">
                                Design {fmt.format(item.lineDesignerCost)}
                              </span>
                            )}
                            {activeRoles.has("juniorDesigner") && item.lineJuniorCost > 0 && (
                              <span className="text-[10px] text-[#AAAAAA]">
                                Jr {fmt.format(item.lineJuniorCost)}
                              </span>
                            )}
                            {item.discountRate > 0 && (
                              <span className="text-[10px] text-[#15803D] font-medium">
                                -{Math.round(item.discountRate * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm tabular-nums text-right text-[#6B6B6B]">
                          {fmt.format(item.lineCost)}
                        </span>
                        <span className="text-sm tabular-nums text-right text-[#0A0A0A]">
                          {fmt.format(item.linePrice)}
                        </span>
                        <div className="text-right">
                          <span
                            className={`text-sm tabular-nums font-medium ${
                              item.lineMargin < 0
                                ? "text-red-600"
                                : "text-[#0A0A0A]"
                            }`}
                          >
                            {fmt.format(item.lineMargin)}
                          </span>
                          <span className="text-[10px] text-[#AAAAAA] ml-1">
                            {item.lineMarginPercent.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="md:hidden">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[#0A0A0A]">
                            {item.name}
                            {item.qty > 1 && (
                              <span className="text-[#AAAAAA] ml-1">
                                ×{item.qty}
                              </span>
                            )}
                          </span>
                          <span
                            className={`text-sm font-medium tabular-nums ${
                              item.lineMargin < 0
                                ? "text-red-600"
                                : "text-[#0A0A0A]"
                            }`}
                          >
                            {fmt.format(item.lineMargin)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs tabular-nums text-[#AAAAAA]">
                            {fmt.format(item.lineCost)} internal ·{" "}
                            {fmt.format(item.linePrice)} client
                            {item.discountRate > 0 && (
                              <span className="text-[#15803D] ml-1">
                                (-{Math.round(item.discountRate * 100)}%)
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-[#AAAAAA]">
                            {item.lineMarginPercent.toFixed(0)}%
                          </span>
                        </div>
                        {/* Role breakdown on mobile */}
                        <div className="flex gap-3 mt-1">
                          {activeRoles.has("dev") && item.lineDevCost > 0 && (
                            <span className="text-[10px] text-[#AAAAAA]">
                              Dev {fmt.format(item.lineDevCost)}
                            </span>
                          )}
                          {activeRoles.has("designer") && item.lineDesignerCost > 0 && (
                            <span className="text-[10px] text-[#AAAAAA]">
                              Design {fmt.format(item.lineDesignerCost)}
                            </span>
                          )}
                          {activeRoles.has("juniorDesigner") && item.lineJuniorCost > 0 && (
                            <span className="text-[10px] text-[#AAAAAA]">
                              Jr {fmt.format(item.lineJuniorCost)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals row */}
                <div className="px-5 py-4 border-t-2 border-[#E5E5E5] bg-white">
                  <div className="hidden md:grid md:grid-cols-[1fr_80px_80px_90px] gap-3 items-center">
                    <div>
                      <span className="text-sm font-semibold text-[#0A0A0A]">
                        Total
                      </span>
                      {/* Role total breakdown */}
                      <div className="flex gap-3 mt-1">
                        {activeRoles.has("dev") && roleTotals.dev > 0 && (
                          <span className="text-[10px] font-medium text-[#AAAAAA]">
                            Dev {fmt.format(roleTotals.dev)}
                          </span>
                        )}
                        {activeRoles.has("designer") && roleTotals.designer > 0 && (
                          <span className="text-[10px] font-medium text-[#AAAAAA]">
                            Design {fmt.format(roleTotals.designer)}
                          </span>
                        )}
                        {activeRoles.has("juniorDesigner") && roleTotals.juniorDesigner > 0 && (
                          <span className="text-[10px] font-medium text-[#AAAAAA]">
                            Jr {fmt.format(roleTotals.juniorDesigner)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-right text-[#6B6B6B]">
                      {fmtDetailed.format(totalCost)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-right text-[#0A0A0A]">
                      {fmtDetailed.format(totalPrice)}
                    </span>
                    <div className="text-right">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          totalMargin < 0 ? "text-red-600" : "text-[#0A0A0A]"
                        }`}
                      >
                        {fmtDetailed.format(totalMargin)}
                      </span>
                      <span className="text-[10px] font-medium text-[#AAAAAA] ml-1">
                        {marginPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="md:hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[#0A0A0A]">
                        Total
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          totalMargin < 0 ? "text-red-600" : "text-[#0A0A0A]"
                        }`}
                      >
                        {fmtDetailed.format(totalMargin)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs tabular-nums text-[#AAAAAA]">
                        {fmtDetailed.format(totalCost)} internal ·{" "}
                        {fmtDetailed.format(totalPrice)} client
                      </span>
                      <span className="text-xs font-medium text-[#AAAAAA]">
                        {marginPercent.toFixed(1)}%
                      </span>
                    </div>
                    {/* Role totals on mobile */}
                    <div className="flex gap-3 mt-1">
                      {activeRoles.has("dev") && roleTotals.dev > 0 && (
                        <span className="text-[10px] font-medium text-[#AAAAAA]">
                          Dev {fmt.format(roleTotals.dev)}
                        </span>
                      )}
                      {activeRoles.has("designer") && roleTotals.designer > 0 && (
                        <span className="text-[10px] font-medium text-[#AAAAAA]">
                          Design {fmt.format(roleTotals.designer)}
                        </span>
                      )}
                      {activeRoles.has("juniorDesigner") && roleTotals.juniorDesigner > 0 && (
                        <span className="text-[10px] font-medium text-[#AAAAAA]">
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
              <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                      Internal Cost
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
                      {fmtDetailed.format(totalCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                      Client Price
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
                      {fmtDetailed.format(totalPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                      Total Margin
                    </p>
                    <p
                      className={`text-lg font-semibold tabular-nums ${
                        totalMargin < 0 ? "text-red-600" : "text-[#0A0A0A]"
                      }`}
                    >
                      {fmtDetailed.format(totalMargin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                      Margin %
                    </p>
                    <p
                      className={`text-lg font-semibold tabular-nums ${
                        totalMargin < 0 ? "text-red-600" : "text-[#0A0A0A]"
                      }`}
                    >
                      {marginPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Role cost breakdown in summary */}
                {activeRoleCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-2">
                      Cost by Role
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      {activeRoles.has("dev") && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6B6B6B]">
                            Developer
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-[#0A0A0A]">
                            {fmtDetailed.format(roleTotals.dev)}
                          </span>
                        </div>
                      )}
                      {activeRoles.has("designer") && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6B6B6B]">
                            Designer
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-[#0A0A0A]">
                            {fmtDetailed.format(roleTotals.designer)}
                          </span>
                        </div>
                      )}
                      {activeRoles.has("juniorDesigner") && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6B6B6B]">
                            Junior Designer
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-[#0A0A0A]">
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
