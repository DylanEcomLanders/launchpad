"use client";

import { useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface CalcInputs {
  traffic: number;
  cvr: number;
  aov: number;
  target: number;
}

const DEFAULT_CALC: CalcInputs = {
  traffic: 150000,
  cvr: 1.8,
  aov: 55,
  target: 2.8,
};

function formatGBP(n: number): string {
  if (!Number.isFinite(n)) return "£0";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));
}

function monthlyRecovered(c: CalcInputs): number {
  const gapPp = Math.max(0, c.target - c.cvr);
  return c.traffic * (gapPp / 100) * c.aov;
}

export function RevenueProjectorWidget({ retainer = 8000 }: { retainer?: number }) {
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_CALC);

  const monthly = monthlyRecovered(inputs);
  const annual = monthly * 12;
  const ratio = monthly > 0 ? monthly / retainer : 0;
  const retainerLabel = `£${(retainer / 1000).toFixed(retainer % 1000 === 0 ? 0 : 1)}K`;

  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#181818] p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            Live widget · Revenue Projector
          </p>
          <h3 className="text-sm font-semibold text-[#E5E5EA] mt-1 leading-tight">
            What they&rsquo;re leaving on the table
          </h3>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
            Drag to model the prospect&rsquo;s numbers — quote it live on the call.
          </p>
        </div>
        <button
          onClick={() => setInputs(DEFAULT_CALC)}
          className="text-[10px] text-[#71757D] hover:text-[#E5E5EA] flex items-center gap-1 shrink-0"
          aria-label="Reset"
        >
          <ArrowPathIcon className="size-3" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
        {/* Sliders */}
        <div className="md:col-span-3 space-y-3">
          <SliderRow
            label="Monthly traffic"
            value={inputs.traffic}
            min={10000}
            max={1000000}
            step={5000}
            format={(v) => `${(v / 1000).toFixed(0)}K sessions`}
            onChange={(v) => setInputs({ ...inputs, traffic: v })}
          />
          <SliderRow
            label="Current CVR"
            value={inputs.cvr}
            min={0.5}
            max={5}
            step={0.1}
            format={(v) => `${v.toFixed(1)}%`}
            onChange={(v) => setInputs({ ...inputs, cvr: v })}
          />
          <SliderRow
            label="Average order value"
            value={inputs.aov}
            min={20}
            max={300}
            step={5}
            format={(v) => `£${v}`}
            onChange={(v) => setInputs({ ...inputs, aov: v })}
          />
          <SliderRow
            label="Target CVR"
            value={inputs.target}
            min={0.5}
            max={6}
            step={0.1}
            format={(v) => `${v.toFixed(1)}%`}
            onChange={(v) => setInputs({ ...inputs, target: v })}
          />
        </div>

        {/* Output */}
        <div className="md:col-span-2 flex flex-col gap-2">
          <div className="rounded-md border border-[#2A2A2A] bg-[#0C0C0C] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
              Monthly recovered
            </p>
            <p className="text-lg font-semibold text-[#E5E5EA] tabular-nums mt-1 leading-none">
              {formatGBP(monthly)}
            </p>
          </div>
          <div className="rounded-md border border-white bg-white text-[#0C0C0C] p-3 flex-1 flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Annual opportunity
            </p>
            <p className="text-2xl font-semibold tabular-nums mt-1 leading-none">
              {formatGBP(annual)}
            </p>
          </div>
          <div className="rounded-md border border-[#2A2A2A] bg-[#181818] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
              ROI vs {retainerLabel} retainer
            </p>
            <p className="text-lg font-semibold text-[#E5E5EA] tabular-nums mt-1 leading-none">
              {ratio > 0 ? `${ratio.toFixed(1)}×` : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] font-medium text-[#9CA3AF]">{label}</span>
        <span className="text-[12px] font-semibold text-[#E5E5EA] tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="projector-slider w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #1B1B1B 0%, #1B1B1B ${pct}%, #E5E5EA ${pct}%, #E5E5EA 100%)`,
        }}
      />
      <style jsx>{`
        .projector-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #1b1b1b;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
        .projector-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #1b1b1b;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
