"use client";

import type { VatMode } from "@/lib/finance/vat";

interface Props {
  mode: VatMode;
  onChange: (next: VatMode) => void;
  clientCountry: string;
}

/* Three-button segmented picker for the VAT mode on an invoice.
 * Mirrors the "for now, prices include VAT, later add 20% on top"
 * transition strategy the founder is using. */
export function VatModePicker({ mode, onChange, clientCountry }: Props) {
  const isUK = clientCountry === "GB" || clientCountry === "UK";

  const options: Array<{ value: VatMode; label: string; sub: string }> = [
    {
      value: "off",
      label: "No VAT",
      sub: isUK
        ? "Nothing about VAT on the invoice"
        : "Reverse-charge note auto-prints (non-UK)",
    },
    {
      value: "inclusive",
      label: "Inclusive",
      sub: "Prices include 20% VAT (current pricing)",
    },
    {
      value: "exclusive",
      label: "+ 20%",
      sub: "Add 20% on top of prices",
    },
  ];

  return (
    <div>
      <div className="inline-flex w-full rounded-lg border border-border overflow-hidden bg-surface">
        {options.map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-background"
                  : "bg-surface text-foreground hover:bg-background"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-subtle mt-2">
        {options.find((o) => o.value === mode)?.sub}
      </p>
    </div>
  );
}
