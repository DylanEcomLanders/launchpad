"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";
import { ImageUpload } from "./image-upload";
import type { IntelligemsTest } from "@/lib/case-studies/types";

interface Props {
  test: IntelligemsTest;
  slug: string;
  index: number;
  onChange: (next: IntelligemsTest) => void;
  onDelete: () => void;
}

export function IntelligemsTestCard({ test, slug, index, onChange, onDelete }: Props) {
  const update = <K extends keyof IntelligemsTest>(key: K, val: IntelligemsTest[K]) =>
    onChange({ ...test, [key]: val });

  return (
    <div className="bg-background border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
          Test {index + 1}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-subtle hover:text-red-600 transition-colors p-1"
          title="Remove test"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>

      <div>
        <label className={labelClass}>Test name</label>
        <input
          className={inputClass}
          value={test.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. PDP hero variant"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Variant A label</label>
          <input
            className={inputClass}
            value={test.variantALabel}
            onChange={(e) => update("variantALabel", e.target.value)}
            placeholder="Control"
          />
        </div>
        <div>
          <label className={labelClass}>Variant B label</label>
          <input
            className={inputClass}
            value={test.variantBLabel}
            onChange={(e) => update("variantBLabel", e.target.value)}
            placeholder="Variant"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Primary metric</label>
        <input
          className={inputClass}
          value={test.primaryMetric}
          onChange={(e) => update("primaryMetric", e.target.value)}
          placeholder="Conversion rate"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Lift %</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={Number.isFinite(test.liftPercent) ? test.liftPercent : 0}
            onChange={(e) => update("liftPercent", parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className={labelClass}>Confidence %</label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            className={inputClass}
            value={Number.isFinite(test.confidencePercent) ? test.confidencePercent : 0}
            onChange={(e) => update("confidencePercent", parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className={labelClass}>Duration (days)</label>
          <input
            type="number"
            min={0}
            step="1"
            className={inputClass}
            value={test.testDurationDays}
            onChange={(e) => update("testDurationDays", parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className={labelClass}>Sample size</label>
          <input
            type="number"
            min={0}
            step="1"
            className={inputClass}
            value={test.sampleSize}
            onChange={(e) => update("sampleSize", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Traffic split</label>
        <input
          className={inputClass}
          value={test.trafficSplit}
          onChange={(e) => update("trafficSplit", e.target.value)}
          placeholder="50/50"
        />
      </div>

      <div>
        <ImageUpload
          label="Intelligems dashboard screenshot"
          helper="Drop the raw dashboard PNG"
          slug={slug}
          aspect="video"
          value={test.screenshot}
          onChange={(img) => update("screenshot", img)}
        />
      </div>

      <div>
        <label className={labelClass}>Notes (optional)</label>
        <textarea
          rows={2}
          className={textareaClass}
          value={test.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Anything worth flagging about this test"
        />
      </div>
    </div>
  );
}
