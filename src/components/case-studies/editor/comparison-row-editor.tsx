"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import type { ResultComparison } from "@/lib/case-studies/types";

interface Props {
  row: ResultComparison;
  index: number;
  onChange: (next: ResultComparison) => void;
  onDelete: () => void;
}

export function ComparisonRowEditor({ row, index, onChange, onDelete }: Props) {
  return (
    <div className="bg-background border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
          Metric {index + 1}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-subtle hover:text-red-600 transition-colors p-1"
          title="Remove metric"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      <div>
        <label className={labelClass}>Metric label</label>
        <input
          className={inputClass}
          value={row.label}
          onChange={(e) => onChange({ ...row, label: e.target.value })}
          placeholder="Monthly recurring revenue"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Before</label>
          <input
            className={inputClass}
            value={row.before}
            onChange={(e) => onChange({ ...row, before: e.target.value })}
            placeholder="£650K"
          />
        </div>
        <div>
          <label className={labelClass}>After</label>
          <input
            className={inputClass}
            value={row.after}
            onChange={(e) => onChange({ ...row, after: e.target.value })}
            placeholder="£1.23M"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Delta %</label>
          <input
            type="number"
            className={inputClass}
            value={row.deltaPercent ?? ""}
            onChange={(e) =>
              onChange({
                ...row,
                deltaPercent: e.target.value === "" ? undefined : parseFloat(e.target.value),
              })
            }
            placeholder="125"
          />
        </div>
        <div>
          <label className={labelClass}>Direction</label>
          <select
            className={selectClass}
            value={row.deltaDirection || "up"}
            onChange={(e) =>
              onChange({ ...row, deltaDirection: e.target.value as "up" | "down" })
            }
          >
            <option value="up">▲ Up (positive)</option>
            <option value="down">▼ Down (positive)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
