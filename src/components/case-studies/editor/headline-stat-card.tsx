"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass } from "@/lib/form-styles";
import type { HeadlineStat } from "@/lib/case-studies/types";

interface Props {
  stat: HeadlineStat;
  index: number;
  onChange: (next: HeadlineStat) => void;
  onDelete: () => void;
}

export function HeadlineStatCard({ stat, index, onChange, onDelete }: Props) {
  return (
    <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
          Stat {index + 1}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-[#71757D] hover:text-red-600 transition-colors p-1"
          title="Remove stat"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      <div>
        <label className={labelClass}>Value</label>
        <input
          className={inputClass}
          value={stat.value}
          onChange={(e) => onChange({ ...stat, value: e.target.value })}
          placeholder="+146% or $145,654"
        />
      </div>
      <div>
        <label className={labelClass}>Label</label>
        <input
          className={inputClass}
          value={stat.label}
          onChange={(e) => onChange({ ...stat, label: e.target.value })}
          placeholder="Increase in monthly recurring revenue"
        />
      </div>
    </div>
  );
}
