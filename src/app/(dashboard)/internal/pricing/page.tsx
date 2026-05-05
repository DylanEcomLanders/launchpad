"use client";

import { useMemo, useState } from "react";
import {
  ClipboardDocumentIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, labelClass } from "@/lib/form-styles";
import {
  INTERNAL_CATEGORY_LABELS,
  INTERNAL_CATEGORY_ORDER,
  PRICE_ITEMS,
  formatPrice,
  quoteLineFor,
  type InternalCategory,
  type PriceItem,
} from "@/lib/pricing";

type Filter = "all" | InternalCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  ...INTERNAL_CATEGORY_ORDER.map((c) => ({
    id: c as Filter,
    label: INTERNAL_CATEGORY_LABELS[c],
  })),
];

function fmtDate(iso: string): string {
  // Expected YYYY-MM-DD; render as e.g. "29 Apr 2026"
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function CopyButton({ item }: { item: PriceItem }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(quoteLineFor(item));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-[#E5E5EA] bg-white text-[#7A7A7A] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
      }`}
      title="Copy as quote line"
    >
      {copied ? (
        <>
          <CheckIcon className="size-3.5" />
          Copied
        </>
      ) : (
        <>
          <ClipboardDocumentIcon className="size-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

function CategoryGroup({
  category,
  items,
}: {
  category: InternalCategory;
  items: PriceItem[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
          {INTERNAL_CATEGORY_LABELS[category]}
        </h2>
        <span className="text-xs text-[#A0A0A0]">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E5E5EA] bg-white shadow-[var(--shadow-soft)]">
        {/* Column headers */}
        <div className="hidden grid-cols-[2fr_1.2fr_0.9fr_2.5fr_2.2fr_0.9fr_0.6fr] gap-3 border-b border-[#E5E5EA] bg-[#FAFAFA] px-4 py-2.5 lg:grid">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
            Name
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
            Price
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
            Unit
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
            Included
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
            NOT included
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
            Updated
          </span>
          <span className="sr-only">Copy</span>
        </div>

        <ul className="divide-y divide-[#EFEFF1]">
          {items.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-1 gap-x-3 gap-y-1.5 px-4 py-3.5 lg:grid-cols-[2fr_1.2fr_0.9fr_2.5fr_2.2fr_0.9fr_0.6fr] lg:items-start"
            >
              {/* Name */}
              <div className="flex items-baseline gap-2 lg:block">
                <p className="text-sm font-semibold text-[#1B1B1B]">
                  {item.name}
                </p>
              </div>

              {/* Price */}
              <div className="lg:pt-px">
                <span className="font-mono text-sm tabular-nums text-[#1B1B1B]">
                  {formatPrice(item)}
                </span>
              </div>

              {/* Unit */}
              <div className="lg:pt-px">
                <span className="inline-block rounded-md bg-[#F3F3F5] px-2 py-0.5 text-xs text-[#7A7A7A]">
                  {item.unit}
                </span>
              </div>

              {/* Included */}
              <p className="text-sm leading-snug text-[#444]">
                <span className="lg:hidden">
                  <strong className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                    Included
                  </strong>
                  <br />
                </span>
                {item.included}
              </p>

              {/* Excluded */}
              <p className="text-sm leading-snug text-[#7A7A7A]">
                <span className="lg:hidden">
                  <strong className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                    NOT included
                  </strong>
                  <br />
                </span>
                {item.excluded}
              </p>

              {/* Last updated */}
              <span className="font-mono text-xs tabular-nums text-[#A0A0A0] lg:pt-px">
                {fmtDate(item.lastUpdated)}
              </span>

              {/* Copy as quote line */}
              <div className="flex justify-start lg:justify-end lg:pt-px">
                <CopyButton item={item} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function InternalPricingPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRICE_ITEMS.filter((item) => {
      if (filter !== "all" && item.internalCategory !== filter) return false;
      if (!q) return true;
      const haystack = [
        item.name,
        item.included,
        item.excluded,
        item.unit,
        formatPrice(item),
        INTERNAL_CATEGORY_LABELS[item.internalCategory],
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, filter]);

  const grouped = useMemo(() => {
    const out: Record<InternalCategory, PriceItem[]> = {
      retainer: [],
      "funnel-build": [],
      "one-off": [],
      "add-on": [],
    };
    for (const item of filtered) out[item.internalCategory].push(item);
    return out;
  }, [filtered]);

  const totalCount = filtered.length;

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-24">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full border border-[#E5E5EA] bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              Internal only
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">
            Price List
          </h1>
          <p className="text-[#7A7A7A]">
            Single source of truth for what we charge. Edits go in{" "}
            <code className="rounded bg-[#F3F3F5] px-1.5 py-0.5 font-mono text-xs text-[#1B1B1B]">
              src/lib/pricing.ts
            </code>{" "}
            and propagate to the{" "}
            <Link
              href="/tools/price-calculator"
              className="text-[#1B1B1B] underline decoration-[#C5C5C5] underline-offset-2 transition-colors hover:decoration-[#1B1B1B]"
            >
              price calculator
              <ArrowTopRightOnSquareIcon className="ml-0.5 inline size-3" />
            </Link>
            .
          </p>
        </div>

        {/* Search + filter */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className={labelClass} htmlFor="pricing-search">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A0A0A0]" />
              <input
                id="pricing-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, scope, exclusion…"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[#E5E5EA] bg-[#F3F3F5] p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f.id
                      ? "bg-[#1B1B1B] text-white shadow-[var(--shadow-soft)]"
                      : "text-[#7A7A7A] hover:text-[#1B1B1B]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-[#A0A0A0]">
            Showing <span className="font-semibold text-[#1B1B1B]">{totalCount}</span>{" "}
            of {PRICE_ITEMS.length} items
          </p>
          {(query || filter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="text-xs font-medium text-[#7A7A7A] underline decoration-[#C5C5C5] underline-offset-2 transition-colors hover:text-[#1B1B1B] hover:decoration-[#1B1B1B]"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Empty state */}
        {totalCount === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E5EA] bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-[#1B1B1B]">
              No items match
            </p>
            <p className="mt-1 text-sm text-[#7A7A7A]">
              Try a different search or clear the filters.
            </p>
          </div>
        ) : (
          <>
            {INTERNAL_CATEGORY_ORDER.map((cat) => (
              <CategoryGroup
                key={cat}
                category={cat}
                items={grouped[cat]}
              />
            ))}
          </>
        )}

        {/* Footer note */}
        <p className="mt-12 border-t border-[#EFEFF1] pt-6 text-xs text-[#A0A0A0]">
          Internal reference only. Do not share this URL with clients.
        </p>
      </div>
    </div>
  );
}
