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
          : "border-[#2A2A2A] bg-[#181818] text-[#71757D] hover:border-white hover:text-[#E5E5EA]"
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
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71757D]">
          {INTERNAL_CATEGORY_LABELS[category]}
        </h2>
        <span className="text-xs text-[#71757D]">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#181818] shadow-[var(--shadow-soft)]">
        {/* Column headers */}
        <div className="hidden grid-cols-[2fr_1.2fr_0.9fr_2.5fr_2.2fr_0.9fr_0.6fr] gap-3 border-b border-[#2A2A2A] bg-[#0C0C0C] px-4 py-2.5 lg:grid">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            Name
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            Price
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            Unit
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            Included
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            NOT included
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            Updated
          </span>
          <span className="sr-only">Copy</span>
        </div>

        <ul className="divide-y divide-[#2A2A2A]">
          {items.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-1 gap-x-3 gap-y-1.5 px-4 py-3.5 lg:grid-cols-[2fr_1.2fr_0.9fr_2.5fr_2.2fr_0.9fr_0.6fr] lg:items-start"
            >
              {/* Name */}
              <div className="flex items-baseline gap-2 lg:block">
                <p className="text-sm font-semibold text-[#E5E5EA]">
                  {item.name}
                </p>
              </div>

              {/* Price */}
              <div className="lg:pt-px">
                <span className="font-mono text-sm tabular-nums text-[#E5E5EA]">
                  {formatPrice(item)}
                </span>
              </div>

              {/* Unit */}
              <div className="lg:pt-px">
                <span className="inline-block rounded-md bg-[#222222] px-2 py-0.5 text-xs text-[#71757D]">
                  {item.unit}
                </span>
              </div>

              {/* Included */}
              <p className="text-sm leading-snug text-[#C7C9CD]">
                <span className="lg:hidden">
                  <strong className="text-[10px] uppercase tracking-wider text-[#71757D]">
                    Included
                  </strong>
                  <br />
                </span>
                {item.included}
              </p>

              {/* Excluded */}
              <p className="text-sm leading-snug text-[#71757D]">
                <span className="lg:hidden">
                  <strong className="text-[10px] uppercase tracking-wider text-[#71757D]">
                    NOT included
                  </strong>
                  <br />
                </span>
                {item.excluded}
              </p>

              {/* Last updated */}
              <span className="font-mono text-xs tabular-nums text-[#71757D] lg:pt-px">
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
            <span className="rounded-full border border-[#2A2A2A] bg-[#181818] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
              Internal only
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">
            Price List
          </h1>
          <p className="text-[#71757D]">
            Single source of truth for what we charge. Edits go in{" "}
            <code className="rounded bg-[#222222] px-1.5 py-0.5 font-mono text-xs text-[#E5E5EA]">
              src/lib/pricing.ts
            </code>{" "}
            and propagate to the{" "}
            <Link
              href="/tools/price-calculator"
              className="text-[#E5E5EA] underline decoration-[#C5C5C5] underline-offset-2 transition-colors hover:decoration-[#1B1B1B]"
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
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71757D]" />
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
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[#2A2A2A] bg-[#222222] p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f.id
                      ? "bg-[#E5E5EA] text-[#181818] shadow-[var(--shadow-soft)]"
                      : "text-[#71757D] hover:text-[#E5E5EA]"
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
          <p className="text-xs text-[#71757D]">
            Showing <span className="font-semibold text-[#E5E5EA]">{totalCount}</span>{" "}
            of {PRICE_ITEMS.length} items
          </p>
          {(query || filter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="text-xs font-medium text-[#71757D] underline decoration-[#C5C5C5] underline-offset-2 transition-colors hover:text-[#E5E5EA] hover:decoration-[#1B1B1B]"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Empty state */}
        {totalCount === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#181818] px-6 py-12 text-center">
            <p className="text-sm font-semibold text-[#E5E5EA]">
              No items match
            </p>
            <p className="mt-1 text-sm text-[#71757D]">
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
        <p className="mt-12 border-t border-[#2A2A2A] pt-6 text-xs text-[#71757D]">
          Internal reference only. Do not share this URL with clients.
        </p>
      </div>
    </div>
  );
}
